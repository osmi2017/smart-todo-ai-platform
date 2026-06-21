import logging
import os
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import joblib
import tensorflow as tf
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
CORS(app, origins=os.getenv('CORS_ORIGINS', 'http://localhost:8000').split(','))

# Chargement des modèles
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')

# Modèles
time_model = None
delay_model = None
priority_model = None
risk_model = None

# Scalers
scalers = {}

def load_models():
    """Charge tous les modèles au démarrage"""
    global time_model, delay_model, priority_model, risk_model, scalers
    
    try:
        # Modèle de prédiction de temps
        if os.path.exists(os.path.join(MODELS_DIR, 'time_model.h5')):
            time_model = tf.keras.models.load_model(os.path.join(MODELS_DIR, 'time_model.h5'))
        
        # Modèle de prédiction de retard
        if os.path.exists(os.path.join(MODELS_DIR, 'delay_model.pkl')):
            delay_model = joblib.load(os.path.join(MODELS_DIR, 'delay_model.pkl'))
        
        # Modèle de priorisation
        if os.path.exists(os.path.join(MODELS_DIR, 'priority_model.pkl')):
            priority_model = joblib.load(os.path.join(MODELS_DIR, 'priority_model.pkl'))
        
        # Modèle de risque
        if os.path.exists(os.path.join(MODELS_DIR, 'risk_model.pkl')):
            risk_model = joblib.load(os.path.join(MODELS_DIR, 'risk_model.pkl'))
        
        # Scalers
        if os.path.exists(os.path.join(MODELS_DIR, 'scalers.pkl')):
            scalers = joblib.load(os.path.join(MODELS_DIR, 'scalers.pkl'))
        
        logger.info("Models loaded successfully")
    except Exception:
        logger.exception("Failed to load ML models")
        raise

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/predict/task', methods=['POST'])
def predict_task():
    """Prédit le temps, délai et priorité pour une tâche"""
    try:
        data = request.json
        
        # Extraction des features
        features = extract_task_features(data)
        
        predictions = {}
        
        # Prédiction temps
        if time_model is not None and 'time_scaler' in scalers:
            features_scaled = scalers['time_scaler'].transform([features['time_features']])
            predictions['predicted_time'] = float(time_model.predict(features_scaled)[0][0])
        
        # Prédiction délai
        if delay_model is not None and 'delay_scaler' in scalers:
            delay_features_scaled = scalers['delay_scaler'].transform([features['delay_features']])
            predictions['delay_probability'] = float(delay_model.predict_proba(delay_features_scaled)[0][1])
        
        # Suggestion priorité
        if priority_model is not None and 'priority_scaler' in scalers:
            priority_features_scaled = scalers['priority_scaler'].transform([features['priority_features']])
            predictions['predicted_priority'] = int(priority_model.predict(priority_features_scaled)[0])
        
        return jsonify(predictions)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict/risk', methods=['POST'])
def predict_risk():
    """Calcule le score de risque pour un milestone"""
    try:
        data = request.json
        
        # Extraction des features pour le risque
        features = extract_risk_features(data)
        
        if risk_model is not None and 'risk_scaler' in scalers:
            features_scaled = scalers['risk_scaler'].transform([features])
            risk_score = float(risk_model.predict(features_scaled)[0])
        else:
            # Calcul fallback
            risk_score = calculate_risk_fallback(data)
        
        return jsonify({'risk_score': risk_score})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/train', methods=['POST'])
def train_models():
    """Lance l'entraînement des modèles (requires shared secret)"""
    auth_header = request.headers.get('Authorization', '')
    expected_token = os.getenv('ML_TRAIN_SECRET', '')
    if not expected_token or auth_header != f'Bearer {expected_token}':
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        from training.train import train_all_models
        results = train_all_models()
        return jsonify({'status': 'success', 'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def extract_task_features(data):
    """Extrait les features pour les modèles de tâche"""
    
    # Features pour prédiction de temps
    time_features = [
        len(data.get('title', '')),  # longueur titre
        len(data.get('description', '')),  # longueur description
        data.get('priority', 2),  # priorité
        data.get('estimated_time', 0) or 0,  # temps estimé
        1 if data.get('milestone_id') else 0,  # a un milestone?
        data.get('assigned_to_id', 0) or 0,  # assigné?
    ]
    
    # Features pour prédiction de délai
    delay_features = [
        data.get('priority', 2),
        data.get('estimated_time', 0) or 0,
        1 if data.get('deadline') else 0,  # a une deadline?
        # Plus de features à ajouter avec données historiques
    ]
    
    # Features pour priorisation
    priority_features = [
        len(data.get('title', '')),
        data.get('estimated_time', 0) or 0,
        1 if data.get('deadline') else 0,
    ]
    
    return {
        'time_features': time_features,
        'delay_features': delay_features,
        'priority_features': priority_features
    }

def extract_risk_features(data):
    """Extrait les features pour le risque milestone"""
    return [
        data.get('tasks_count', 0),
        data.get('completed_tasks', 0),
        data.get('delayed_tasks', 0),
        data.get('current_progress', 0),
        # Calculer jours restants
        calculate_days_remaining(data.get('due_date')),
    ]

def calculate_days_remaining(due_date_str):
    """Calcule le nombre de jours restants jusqu'à la deadline"""
    if not due_date_str:
        return 30  # valeur par défaut
    try:
        due_date = datetime.fromisoformat(due_date_str).date()
        today = datetime.now().date()
        return (due_date - today).days
    except (ValueError, TypeError):
        logger.warning("Could not parse due_date: %s", due_date_str)
        return 30

def calculate_risk_fallback(data):
    """Calcul de risque fallback quand modèle non disponible"""
    tasks_count = data.get('tasks_count', 1)
    completed = data.get('completed_tasks', 0)
    delayed = data.get('delayed_tasks', 0)
    
    remaining_ratio = (tasks_count - completed) / tasks_count
    delayed_ratio = delayed / tasks_count if tasks_count > 0 else 0
    
    risk = (remaining_ratio * 0.6 + delayed_ratio * 0.4) * 100
    return min(risk, 100)

if __name__ == '__main__':
    load_models()
    app.run(host='0.0.0.0', port=5001, debug=False)
