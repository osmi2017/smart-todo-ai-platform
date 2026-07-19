# 🧠 Smart Todo AI Platform

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![Django](https://img.shields.io/badge/Django-4.2-green.svg)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.13-orange.svg)](https://tensorflow.org)
[![Celery](https://img.shields.io/badge/Celery-5.3-37814A.svg)](https://docs.celeryq.dev)
[![Kafka](https://img.shields.io/badge/Kafka-3.6-231F20.svg)](https://kafka.apache.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Une plateforme intelligente de gestion de tâches, projets et réunions, avec prédictions ML, traitement en arrière-plan et un bus d'événements temps réel.

## ✨ Fonctionnalités

- ✅ Gestion de projets, tâches et jalons
- 🤖 Prédiction des délais et scoring de risque avec TensorFlow
- 📅 Réunions vidéo (WebRTC) avec transcription et résumé IA
- 📊 Dashboard analytique et notifications en temps réel (WebSocket)
- 🔄 Interface Kanban drag & drop
- ⚙️ Traitement asynchrone en arrière-plan (Celery + Redis) : rappels de
  réunions, transcription audio/vidéo, génération de rapports de projet
- 📨 Bus d'événements Kafka : réunion démarrée, tâche complétée, utilisateur
  connecté, ... consommés de façon découplée par les services audio, audit et
  statistiques

## 🏗️ Architecture

```
                       ┌─────────────┐
                       │  Frontend   │  React (port 3000)
                       └──────┬──────┘
                              │ REST + WebSocket
                       ┌──────▼──────┐        ┌───────────────┐
                       │   Backend   │───────▶│   ml-service   │  Flask + TensorFlow (5001)
                       │   Django    │        └───────┬───────┘
                       │  (8000)     │                │ consomme task.completed
                       └──┬───┬──┬───┘        ┌────────▼────────────┐
                          │   │  │            │ ml-stats-consumer    │
             Celery tasks │   │  └────────────┴──────────────────────┘
                          │   │  publie des événements
                 ┌────────▼┐  └─────────────┐
                 │  Redis  │        ┌────────▼────────┐
                 │ (6379)  │        │      Kafka       │  (9092 interne / 29092 externe)
                 └─────────┘        │  (event bus)      │
                                    └──┬────────┬───────┘
                    ┌───────────────┐  │        │  ┌─────────────────────┐
                    │ audit-consumer│◀─┘        └─▶│  meeting-service     │  Node/Socket.IO (4000)
                    │  (backend)    │               │  (kafkaConsumer.js)  │
                    └───────────────┘               └─────────────────────┘
```

- **backend** (Django/DRF) : API REST, WebSocket (Channels), authentification JWT.
- **celery-worker** / **celery-beat** : exécutent et planifient les tâches lourdes (rappels de réunions, traitement IA audio/vidéo, génération de rapports, publication Kafka) sans jamais bloquer l'API.
- **ml-service** (Flask + TensorFlow) : prédictions de délais/risques.
- **ml-stats-consumer** : consomme les événements `task.completed` du topic centralisé pour maintenir des statistiques cumulées, indépendamment du serveur de prédiction.
- **meeting-service** (Node/Socket.IO) : signaling WebRTC pour les réunions vidéo, et consomme `meeting.started` pour pré-provisionner les salles.
- **kafka-audit-consumer** / **kafka-statistics-consumer** / **kafka-notifications-consumer** / **kafka-audio-consumer** : groupes de consommateurs backend indépendants (audit persisté, métriques, notifications temps réel, dispatch audio via Celery).
- **Kafka** : bus d'événements centralisé (`smart-todo.events` + DLQ `smart-todo.events.dlq`, six partitions) capturant réunion démarrée, tâche complétée, utilisateur connecté, etc.
- **Redis** : broker et backend de résultats pour Celery.
- **PostgreSQL** : base de données principale.

## 🔧 Variables d'environnement

Toutes les URLs et secrets appelés par les services (base de données, Redis,
Kafka, service ML, clés API tierces, frontend, ...) sont centralisés dans un
seul fichier `.env` à la racine — copié depuis [`.env.example`](.env.example).
Aucune URL n'est codée en dur : chaque service la lit depuis son
environnement, avec une valeur par défaut raisonnable pour le développement local.

```bash
cp .env.example .env
# puis édite .env : DJANGO_SECRET_KEY, JWT_SECRET_KEY, DB_PASSWORD, etc.
```

| Variable | Description | Défaut (dev) |
|---|---|---|
| `DJANGO_SECRET_KEY` | Clé secrète Django | *(à définir)* |
| `DEBUG` | Mode debug Django | `False` |
| `ALLOWED_HOSTS` | Hôtes autorisés à servir l'API | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées à appeler l'API (CORS) | `http://localhost:3000,http://127.0.0.1:3000` |
| `JWT_SECRET_KEY` | Clé de signature des JWT | *(à définir)* |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` | Connexion PostgreSQL | `todo_ai` / `todo_user` / — / `localhost` / `5432` |
| `REDIS_URL` | Broker/backend Celery | `redis://localhost:6379/0` |
| `KAFKA_BOOTSTRAP_SERVERS` | Adresse du broker Kafka | `localhost:29092` |
| `KAFKA_ENABLED` | Coupe-circuit du bus d'événements | `True` |
| `KAFKA_EVENTS_TOPIC` / `KAFKA_TOPIC` | Topic centralisé des événements | `smart-todo.events` |
| `KAFKA_DEAD_LETTER_TOPIC` / `KAFKA_DLQ_TOPIC` | Topic de dead-letter | `smart-todo.events.dlq` |
| `ML_SERVICE_URL` | URL du service ML appelée par le backend | `http://localhost:5001` |
| `CORS_ORIGINS` | Origines autorisées à appeler l'API Flask du ml-service | `http://localhost:8000` |
| `ML_TRAIN_SECRET` | Jeton requis pour ré-entraîner via `POST /train` | *(à définir)* |
| `PORT` / `FRONTEND_URL` | Port et origine autorisée du meeting-service | `4000` / `http://localhost:3000` |
| `OPENAI_API_KEY` | Transcription/résumé IA des réunions (optionnel) | *(vide)* |
| `SLACK_BOT_TOKEN` | Notifications Slack (optionnel) | *(vide)* |
| `REACT_APP_API_URL` | URL de l'API appelée par le frontend | `http://localhost:8000/api` |
| `REACT_APP_ML_URL` | URL du service ML (référence côté frontend) | `http://localhost:5001` |
| `REACT_APP_MEETING_SERVICE_URL` | URL du meeting-service appelée par le frontend | `http://localhost:4000` |
| `REACT_APP_WS_URL` | URL WebSocket (par défaut dérivée de l'origine de la page) | `ws://localhost:8000` |

Chaque service dispose aussi de son propre `.env.example` local (`ml-service/.env.example`, `meeting-service/.env.example`, `frontend/.env.example`) pour un lancement hors Docker.

> ⚠️ Avec Docker, `docker-compose.yml` charge automatiquement `.env` (via `env_file`) pour tous les services. Seuls les noms d'hôtes internes au réseau Docker (`postgres`, `redis`, `kafka`, `ml-service`) sont surchargés directement dans `docker-compose.yml` — inutile de les dupliquer dans `.env`.

## 🚀 Démarrage Rapide

### Avec Docker (recommandé — un seul service Docker par composant)

Chaque service (backend, ml-service, meeting-service, frontend) possède son
propre `Dockerfile` et tourne dans son propre conteneur. Une seule commande
démarre Docker (si besoin) et l'ensemble de la stack :

```bash
./start.sh
```

Ce script :
1. Vérifie que Docker est installé, le démarre s'il ne tourne pas encore, et attend qu'il soit prêt.
2. Détecte la commande Compose disponible (`docker compose` ou `docker-compose`).
3. Crée `.env` depuis `.env.example` s'il n'existe pas encore.
4. Build puis démarre **tous** les services en une fois : `postgres`, `redis`, `kafka` (+ `kafka-init`), `backend`, `celery-worker`, `celery-beat`, `audit-consumer`, `ml-service`, `ml-stats-consumer`, `meeting-service`, `frontend`.

Options :
```bash
./start.sh -d          # en arrière-plan (detached)
./start.sh --no-build   # sans reconstruire les images
```

Équivalent manuel (une seule commande Docker Compose) :
```bash
docker compose up --build
```

Une fois démarré :

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API Backend | http://localhost:8000/api |
| Service ML | http://localhost:5001 |
| Meetings (WebRTC/Socket.IO) | http://localhost:4000 |
| Kafka (debug externe) | localhost:9094 |

### Sans Docker (développement service par service)

#### Prérequis
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Kafka 3.6+ (mode KRaft, sans Zookeeper)

```bash
git clone https://github.com/[ton-compte]/smart-todo-ai-platform.git
cd smart-todo-ai-platform
cp .env.example .env   # puis édite les valeurs

# Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python -m daphne -b 0.0.0.0 -p 8000 core.asgi:application

# Worker + scheduler Celery (autres terminaux)
cd backend && source venv/bin/activate
celery -A core worker -l info -Q default,heavy,events
celery -A core beat -l info

# Consommateur d'audit (autre terminal)
cd backend && source venv/bin/activate
python manage.py consume_audit_events

# Frontend (nouveau terminal)
cd frontend
npm install
npm start

# ML Service (nouveau terminal)
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python training/train.py
python app.py

# Consommateur de statistiques ML (autre terminal)
cd ml-service && source venv/bin/activate
python kafka_consumer.py

# Meeting service (nouveau terminal)
cd meeting-service
npm install
npm start
```

Ou lance `./scripts/setup.sh` pour automatiser l'installation des environnements virtuels, dépendances et migrations initiales.

## 📚 Documentation

- API Documentation (Swagger via `drf-yasg`, exposée par le backend)
- Guide Utilisateur
- Guide Développeur

## 🧪 Tests

```bash
# Backend (Django + Celery + Kafka event bus)
cd backend && pytest api/tests/

# Frontend
cd frontend && npm test

# ML Service (prédictions + statistiques Kafka)
cd ml-service && pytest tests/
```

## 📦 Déploiement

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

En production, augmente le facteur de réplication Kafka (`KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR` et consorts) à `>= 2` sur un cluster d'au moins 3 brokers, pour survivre à la panne d'un nœud sans perte d'événements.

## 🤝 Contribution

Voir `CONTRIBUTING.md`

## 📄 Licence

MIT © 2026
