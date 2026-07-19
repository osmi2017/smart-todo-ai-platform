"""
Consommateur Kafka du service d'audit.

Tourne en continu (processus dédié, cf. docker-compose service
"audit-consumer") et s'abonne à *tous* les topics d'événements majeurs pour
en conserver une trace persistée et interrogeable — totalement indépendant
des autres consommateurs (audio, notifications, statistiques) : si l'un
d'eux tombe ou ralentit, l'audit continue de tourner à son propre rythme, et
inversement.

Usage :
    python manage.py consume_audit_events
"""
import json
import logging
import signal
import sys
import uuid

from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from django.conf import settings

from api.events import ALL_TOPICS
from api.models import AuditEvent

logger = logging.getLogger(__name__)

CONSUMER_GROUP_ID = 'audit-service'


def process_message(topic, key, event):
    """Transforme un message Kafka brut en ligne AuditEvent persistée.

    Extraite dans sa propre fonction (indépendante de la boucle réseau
    KafkaConsumer) pour être testable unitairement sans broker réel.
    Idempotente : un même event_id ne crée jamais deux lignes, ce qui rend le
    rejeu (redémarrage du consumer, re-livraison at-least-once) sans danger.
    """
    event_id = event.get('event_id')
    if not event_id:
        logger.warning('Événement sans event_id ignoré (topic=%s)', topic)
        return None

    occurred_at = parse_datetime(event.get('occurred_at', '')) or None

    audit_event, created = AuditEvent.objects.get_or_create(
        event_id=uuid.UUID(event_id),
        defaults={
            'event_type': event.get('event_type', 'unknown'),
            'topic': topic,
            'source_service': event.get('source_service', ''),
            'payload': event.get('payload', {}),
            'occurred_at': occurred_at,
        },
    )
    return audit_event if created else None


class Command(BaseCommand):
    help = "Consomme les événements Kafka (meetings/tasks/users) et les persiste pour l'audit."

    def add_arguments(self, parser):
        parser.add_argument(
            '--max-messages', type=int, default=None,
            help='Nombre max de messages à consommer avant de sortir (utile pour les tests/CI).',
        )

    def handle(self, *args, **options):
        if not getattr(settings, 'KAFKA_EVENTS_ENABLED', True):
            self.stdout.write(self.style.WARNING(
                'KAFKA_EVENTS_ENABLED=False : le consommateur d\'audit ne démarre pas.'
            ))
            return

        from kafka import KafkaConsumer

        bootstrap_servers = settings.KAFKA_BOOTSTRAP_SERVERS.split(',')
        consumer = KafkaConsumer(
            *ALL_TOPICS,
            bootstrap_servers=bootstrap_servers,
            group_id=CONSUMER_GROUP_ID,
            # On commite manuellement APRÈS écriture en base : si le process
            # crashe entre la lecture Kafka et l'écriture DB, le message sera
            # re-livré au redémarrage (at-least-once, jamais de perte).
            enable_auto_commit=False,
            auto_offset_reset='earliest',
            key_deserializer=lambda k: k.decode('utf-8') if k else None,
            value_deserializer=lambda v: json.loads(v.decode('utf-8')),
        )

        self._running = True

        def _shutdown(signum, frame):
            self.stdout.write('Arrêt demandé, fin après le message en cours...')
            self._running = False

        signal.signal(signal.SIGTERM, _shutdown)
        signal.signal(signal.SIGINT, _shutdown)

        self.stdout.write(self.style.SUCCESS(
            f"Consommateur d'audit démarré (topics={list(ALL_TOPICS)}, group={CONSUMER_GROUP_ID})"
        ))

        processed = 0
        max_messages = options.get('max_messages')

        try:
            for message in consumer:
                if not self._running:
                    break
                try:
                    process_message(message.topic, message.key, message.value)
                except Exception:
                    logger.exception(
                        'Échec du traitement du message audit (topic=%s, offset=%s) — '
                        'pas de commit, le message sera re-livré.',
                        message.topic, message.offset,
                    )
                    # On ne commite pas cet offset : au prochain démarrage, le
                    # message sera relu plutôt que silencieusement perdu.
                    continue

                consumer.commit()
                processed += 1

                if max_messages is not None and processed >= max_messages:
                    break
        finally:
            consumer.close()
            self.stdout.write(f'Consommateur d\'audit arrêté ({processed} message(s) traité(s)).')
