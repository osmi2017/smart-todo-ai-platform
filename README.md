# 🧠 Smart Todo AI Platform

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-4.2-green.svg)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.13-orange.svg)](https://tensorflow.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Une plateforme intelligente de gestion de tâches et projets avec prédictions ML.

## ✨ Fonctionnalités

- ✅ Gestion de projets, tâches et milestones
- 🤖 Prédiction des délais avec TensorFlow
- 📊 Dashboard analytique en temps réel
- 🎯 Score de risque intelligent
- 🔄 Interface Kanban drag & drop
- 📈 Visualisations interactives

## 🚀 Démarrage Rapide

### Prérequis
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Docker (optionnel)

### Installation

```bash
# Cloner le projet
git clone https://github.com/[ton-compte]/smart-todo-ai-platform.git
cd smart-todo-ai-platform

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
*****python -m daphne -b 0.0.0.0 -p 8000 core.asgi:application

# Frontend (nouveau terminal)
cd frontend
npm install
npm start

# ML Service (nouveau terminal)
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python train_models.py
python app.py# smart-todo-ai-platform

Avec Docker
bash
docker-compose up --build
📚 Documentation
API Documentation

Guide Utilisateur

Guide Développeur

🧪 Tests
bash
# Backend
pytest backend/tests/

# Frontend
npm test frontend/

# ML
pytest ml-service/tests/
📦 Déploiement
Production
bash
docker-compose -f docker-compose.prod.yml up -d
🤝 Contribution
Voir CONTRIBUTING.md

📄 Licence
MIT © 2026
