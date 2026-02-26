import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import joblib
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

def generate_synthetic_data(n_samples=1000):
    """Génère des données synthétiques pour l'entraînement"""
    np.random.seed(42)
    
    data = {
        'title_length': np.random.randint(5, 100, n_samples),
        'description_length': np.random.randint(0, 1000, n_samples),
        'priority': np.random.randint(1, 5, n_samples),
        'estimated_time': np.random.uniform(0.5, 40, n_samples),
        'has_milestone': np.random.randint(0, 2, n_samples),
        'has_deadline': np.random.randint(0, 2, n_samples),
        'days_until_deadline': np.random.randint(-10, 30, n_samples),
        'user_avg_completion': np.random.uniform(1, 10, n_samples),
        'user_delay_rate': np.random.uniform(0, 0.5, n_samples),
        'project_complexity': np.random.uniform(1, 5, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Générer les cibles
    # Temps réel (cible pour régression)
    df['actual_time'] = (
        df['estimated_time'] * (1 + np.random.normal(0, 0.2, n_samples)) +
        df['priority'] * 0.5 +
        np.random.normal(0, 1, n_samples)
    )
    df['actual_time'] = np.maximum(0.5, df['actual_time'])
    
    # Délai (cible pour classification)
    delay_prob = (
        (df['days_until_deadline'] < 0) * 0.7 +
        (df['estimated_time'] > df['user_avg_completion']) * 0.3 +
        np.random.uniform(0, 0.2, n_samples)
    )
    df['is_delayed'] = (delay_prob > 0.5).astype(int)
    
    # Priorité optimale (cible pour classification)
    optimal_priority = (
        df['priority'] * 0.5 +
        (df['days_until_deadline'] < 5) * 1.5 +
        np.random.normal(0, 0.5, n_samples)
    )
    df['optimal_priority'] = np.clip(np.round(optimal_priority), 1, 4).astype(int)
    
    return df

def train_time_model(df, models_dir):
    """Entraîne le modèle de prédiction de temps"""
    print("🔄 Entraînement du modèle de prédiction de temps...")
    
    features = ['title_length', 'description_length', 'priority', 
                'estimated_time', 'has_milestone', 'project_complexity']
    X = df[features]
    y = df['actual_time']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Modèle TensorFlow
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(len(features),)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(16, activation='relu'),
        tf.keras.layers.Dense(1)
    ])
    
    model.compile(optimizer='adam', loss='mse', metrics=['mae'])
    
    history = model.fit(
        X_train_scaled, y_train,
        epochs=50,
        batch_size=32,
        validation_split=0.2,
        verbose=0
    )
    
    # Évaluation
    test_loss, test_mae = model.evaluate(X_test_scaled, y_test, verbose=0)
    print(f"✅ MAE sur test: {test_mae:.2f} heures")
    
    # Sauvegarde
    model.save(os.path.join(models_dir, 'time_model.h5'))
    joblib.dump(scaler, os.path.join(models_dir, 'time_scaler.pkl'))
    
    return {'mae': float(test_mae)}

def train_delay_model(df, models_dir):
    """Entraîne le modèle de prédiction de retard"""
    print("🔄 Entraînement du modèle de prédiction de retard...")
    
    features = ['priority', 'estimated_time', 'days_until_deadline', 
                'user_avg_completion', 'user_delay_rate']
    X = df[features]
    y = df['is_delayed']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Modèle Random Forest
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Évaluation
    accuracy = model.score(X_test_scaled, y_test)
    print(f"✅ Accuracy sur test: {accuracy:.2f}")
    
    # Sauvegarde
    joblib.dump(model, os.path.join(models_dir, 'delay_model.pkl'))
    joblib.dump(scaler, os.path.join(models_dir, 'delay_scaler.pkl'))
    
    return {'accuracy': float(accuracy)}

def train_priority_model(df, models_dir):
    """Entraîne le modèle de priorisation"""
    print("🔄 Entraînement du modèle de priorisation...")
    
    features = ['title_length', 'estimated_time', 'days_until_deadline', 
                'priority', 'project_complexity']
    X = df[features]
    y = df['optimal_priority']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Modèle Random Forest pour classification multi-classes
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Évaluation
    accuracy = model.score(X_test_scaled, y_test)
    print(f"✅ Accuracy sur test: {accuracy:.2f}")
    
    # Sauvegarde
    joblib.dump(model, os.path.join(models_dir, 'priority_model.pkl'))
    joblib.dump(scaler, os.path.join(models_dir, 'priority_scaler.pkl'))
    
    return {'accuracy': float(accuracy)}

def train_risk_model(df, models_dir):
    """Entraîne le modèle de risque milestone"""
    print("🔄 Entraînement du modèle de risque...")
    
    # Agrégation par projet/milestone (simulé)
    risk_data = []
    for i in range(200):
        n_tasks = np.random.randint(5, 30)
        completed = np.random.randint(0, n_tasks)
        delayed = np.random.randint(0, max(1, n_tasks - completed))
        days_remaining = np.random.randint(-10, 30)
        progress = completed / n_tasks * 100
        
        risk_score = (
            ((n_tasks - completed) / n_tasks) * 40 +
            (delayed / n_tasks) * 40 +
            max(0, (5 - days_remaining) / 5 * 20 if days_remaining > 0 else 20)
        )
        risk_score = min(100, risk_score)
        
        risk_data.append({
            'n_tasks': n_tasks,
            'completed': completed,
            'delayed': delayed,
            'days_remaining': days_remaining,
            'progress': progress,
            'risk_score': risk_score
        })
    
    df_risk = pd.DataFrame(risk_data)
    
    features = ['n_tasks', 'completed', 'delayed', 'days_remaining', 'progress']
    X = df_risk[features]
    y = df_risk['risk_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Modèle Random Forest pour régression
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Évaluation
    score = model.score(X_test_scaled, y_test)
    print(f"✅ R² sur test: {score:.2f}")
    
    # Sauvegarde
    joblib.dump(model, os.path.join(models_dir, 'risk_model.pkl'))
    joblib.dump(scaler, os.path.join(models_dir, 'risk_scaler.pkl'))
    
    return {'r2': float(score)}

def train_all_models():
    """Entraîne tous les modèles"""
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    print("🚀 Génération des données synthétiques...")
    df = generate_synthetic_data(5000)
    
    results = {}
    
    # Entraînement des modèles
    results['time_model'] = train_time_model(df, models_dir)
    results['delay_model'] = train_delay_model(df, models_dir)
    results['priority_model'] = train_priority_model(df, models_dir)
    results['risk_model'] = train_risk_model(df, models_dir)
    
    # Sauvegarde de tous les scalers ensemble
    scalers = {
        'time_scaler': joblib.load(os.path.join(models_dir, 'time_scaler.pkl')),
        'delay_scaler': joblib.load(os.path.join(models_dir, 'delay_scaler.pkl')),
        'priority_scaler': joblib.load(os.path.join(models_dir, 'priority_scaler.pkl')),
        'risk_scaler': joblib.load(os.path.join(models_dir, 'risk_scaler.pkl')),
    }
    joblib.dump(scalers, os.path.join(models_dir, 'scalers.pkl'))
    
    print("\n✅ Entraînement terminé !")
    print(f"Résultats: {results}")
    
    return results

if __name__ == '__main__':
    train_all_models()
