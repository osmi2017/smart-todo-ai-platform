#!/bin/bash
# ==============================================================================
# Démarre Docker (si nécessaire) puis TOUS les services de la plateforme en
# une seule commande :
#   postgres, redis, kafka (+ kafka-init), backend, celery-worker, celery-beat,
#   audit-consumer, ml-service, ml-stats-consumer, meeting-service, frontend.
#
# Usage :
#   ./start.sh            # build + démarre tous les services (logs affichés)
#   ./start.sh -d          # idem, en arrière-plan (detached)
#   ./start.sh --no-build   # démarre sans reconstruire les images
# ==============================================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# ------------------------------------------------------------------------
# 1. Vérifie que Docker est installé et démarré
# ------------------------------------------------------------------------
if ! command -v docker &> /dev/null; then
  echo "❌ Docker n'est pas installé. Installe Docker Desktop (Mac/Windows) ou Docker Engine (Linux) :"
  echo "   https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "⏳ Docker n'est pas démarré, tentative de démarrage..."
  case "$(uname -s)" in
    Darwin)
      open -a Docker 2>/dev/null || true
      ;;
    Linux)
      # Nécessite les droits sudo sur les distributions utilisant systemd
      sudo systemctl start docker 2>/dev/null || true
      ;;
    *)
      echo "⚠️  Démarre Docker Desktop manuellement puis relance ce script."
      ;;
  esac

  echo -n "   En attente du démarrage du daemon Docker"
  for _ in $(seq 1 30); do
    if docker info &> /dev/null; then
      echo " ✅"
      break
    fi
    echo -n "."
    sleep 2
  done

  if ! docker info &> /dev/null; then
    echo ""
    echo "❌ Docker ne répond toujours pas. Démarre-le manuellement (Docker Desktop, ou 'sudo systemctl start docker') puis relance ce script."
    exit 1
  fi
fi
echo "✅ Docker est démarré."

# ------------------------------------------------------------------------
# 2. Détermine la commande Compose disponible (plugin "docker compose" ou
#    binaire historique "docker-compose")
# ------------------------------------------------------------------------
if docker compose version &> /dev/null; then
  COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
  COMPOSE="docker-compose"
else
  echo "❌ Ni 'docker compose' ni 'docker-compose' ne sont disponibles. Installe Docker Compose :"
  echo "   https://docs.docker.com/compose/install/"
  exit 1
fi
echo "✅ Utilisation de : $COMPOSE"

# ------------------------------------------------------------------------
# 3. Vérifie/crée le fichier .env (toutes les URLs et secrets utilisés par
#    les services viennent de ce fichier unique, voir .env.example)
# ------------------------------------------------------------------------
if [ ! -f .env ]; then
  echo "🔧 Aucun fichier .env trouvé, copie de .env.example..."
  cp .env.example .env
  echo "⚠️  Pense à définir DJANGO_SECRET_KEY, JWT_SECRET_KEY et DB_PASSWORD dans .env avant d'aller en production."
fi

# ------------------------------------------------------------------------
# 4. Démarre tous les services en une seule commande
# ------------------------------------------------------------------------
BUILD_FLAG="--build"
DETACHED_FLAG=""

for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD_FLAG="" ;;
    -d|--detach) DETACHED_FLAG="-d" ;;
  esac
done

echo "🚀 Démarrage de tous les services (postgres, redis, kafka, backend, celery-worker, celery-beat, audit-consumer, ml-service, ml-stats-consumer, meeting-service, frontend)..."
$COMPOSE up $BUILD_FLAG $DETACHED_FLAG

if [ -n "$DETACHED_FLAG" ]; then
  echo ""
  echo "✅ Tous les services tournent en arrière-plan."
  echo "   Frontend      : http://localhost:3000"
  echo "   API Backend   : http://localhost:8000/api"
  echo "   Service ML    : http://localhost:5001"
  echo "   Meetings/WS   : http://localhost:4000"
  echo "   Kafka (debug) : localhost:9094"
  echo ""
  echo "   Logs : $COMPOSE logs -f [service]"
  echo "   Arrêt : $COMPOSE down"
fi
