#!/bin/bash

echo "🚀 Déploiement Smart Todo AI Platform"

# Build et push des images Docker
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml push

# Déploiement sur serveur (exemple avec Docker Swarm)
docker stack deploy -c docker-compose.prod.yml todo_ai

echo "✅ Déploiement terminé !"
