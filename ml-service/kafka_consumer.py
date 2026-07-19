"""
Consommateur Kafka du service de statistiques (ml-service).

S'abonne uniquement au topic "tasks" (le seul qui le concerne) et met à jour
des statistiques cumulées à chaque "task_completed" — totalement découplé du
backend Django : celui-ci n'a jamais besoin d'appeler ce service en HTTP pour
lui signaler qu'une tâche est terminée, il publie sur Kafka et poursuit sa
route.

Tourne comme process séparé (cf. docker-compose service "ml-stats-consumer"),
indépendant du serveur Flask de prédiction : une forte charge de statistiques
ne ralentit jamais les endpoints de prédiction, et inversement.
"""
import json
import logging
import os
import signal
import sys

from stats_store import load_stats, save_stats, update_stats_with_task_completed

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

TOPIC_TASKS = 'smarttodo.tasks.events'
CONSUMER_GROUP_ID = 'ml-stats-service'

_running = True


def _handle_shutdown(signum, frame):
    global _running
    logger.info('Arrêt demandé, fin après le message en cours...')
    _running = False


def main():
    kafka_enabled = os.getenv('KAFKA_EVENTS_ENABLED', 'true').lower() != 'false'
    if not kafka_enabled:
        logger.warning('KAFKA_EVENTS_ENABLED=false : le consommateur de statistiques ne démarre pas.')
        return

    from kafka import KafkaConsumer

    bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092').split(',')

    consumer = KafkaConsumer(
        TOPIC_TASKS,
        bootstrap_servers=bootstrap_servers,
        group_id=CONSUMER_GROUP_ID,
        # Commit manuel après écriture des stats sur disque : en cas de crash
        # entre la lecture et l'écriture, le message est re-livré au
        # redémarrage plutôt que silencieusement ignoré.
        enable_auto_commit=False,
        auto_offset_reset='earliest',
        key_deserializer=lambda k: k.decode('utf-8') if k else None,
        value_deserializer=lambda v: json.loads(v.decode('utf-8')),
    )

    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    logger.info('Consommateur de statistiques démarré (topic=%s, group=%s)', TOPIC_TASKS, CONSUMER_GROUP_ID)

    processed = 0
    try:
        for message in consumer:
            if not _running:
                break

            event = message.value
            if event.get('event_type') != 'task_completed':
                consumer.commit()
                continue

            try:
                stats = load_stats()
                updated = update_stats_with_task_completed(stats, event)
                save_stats(updated)
            except Exception:
                logger.exception(
                    'Échec de mise à jour des statistiques (offset=%s) — pas de commit, re-livraison au redémarrage.',
                    message.offset,
                )
                continue

            consumer.commit()
            processed += 1
    finally:
        consumer.close()
        logger.info('Consommateur de statistiques arrêté (%d événement(s) traité(s)).', processed)


if __name__ == '__main__':
    main()
