#!/bin/bash

echo "🚀 Configuration du projet Smart Todo AI Platform"

# Créer environnement virtuel backend
echo "📦 Création environnement virtuel backend..."
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Créer environnement virtuel ML
echo "📦 Création environnement virtuel ML..."
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Installer dépendances frontend
echo "📦 Installation dépendances frontend..."
cd frontend
npm install
cd ..

# Créer fichiers .env
echo "🔧 Création fichiers .env..."
cp .env.example .env

# Initialiser base de données
echo "🗄️ Initialisation base de données..."
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py createsuperuser --noinput --username admin --email admin@example.com || true
cd ..

# Entraîner modèles ML
echo "🤖 Entraînement modèles ML..."
cd ml-service
source venv/bin/activate
python training/train.py
cd ..

echo "✅ Configuration terminée !"
echo "📝 Pour démarrer:"
echo "  Backend: cd backend && source venv/bin/activate && python manage.py runserver"
echo "  ML Service: cd ml-service && source venv/bin/activate && python app.py"
echo "  Frontend: cd frontend && npm start"
echo "  Ou avec Docker: docker-compose up"
