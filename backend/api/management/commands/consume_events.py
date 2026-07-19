import json
import logging
import signal
import time

from confluent_kafka import Consumer, KafkaError
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.event_handlers import SUPPORTED_SERVICES, handle_event
from api.kafka_client import publish_dead_letter

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Consume centralized Kafka domain events for one independently scalable service.'

    def add_arguments(self, parser):
        parser.add_argument('service', choices=SUPPORTED_SERVICES)
        parser.add_argument('--max-messages', type=int, default=0)

    def handle(self, *args, **options):
        if not settings.KAFKA_ENABLED:
            raise CommandError('Kafka is disabled. Set KAFKA_ENABLED=True.')

        service = options['service']
        max_messages = options['max_messages']
        consumer = Consumer(self._consumer_config(service))
        running = True
        processed_messages = 0

        def stop(_signum, _frame):
            nonlocal running
            running = False

        signal.signal(signal.SIGINT, stop)
        signal.signal(signal.SIGTERM, stop)
        consumer.subscribe([settings.KAFKA_EVENTS_TOPIC])
        self.stdout.write(f'{service} consumer listening on {settings.KAFKA_EVENTS_TOPIC}')

        try:
            while running and (max_messages == 0 or processed_messages < max_messages):
                message = consumer.poll(1.0)
                if message is None:
                    continue
                if message.error():
                    error_code = message.error().code()
                    if error_code == KafkaError._PARTITION_EOF:
                        continue
                    if error_code == KafkaError.UNKNOWN_TOPIC_OR_PART:
                        logger.warning('Waiting for Kafka topic %s to become available', settings.KAFKA_EVENTS_TOPIC)
                        time.sleep(settings.KAFKA_CONSUMER_RETRY_SECONDS)
                        continue
                    raise CommandError(str(message.error()))

                raw_message = message.value()
                try:
                    event = json.loads(raw_message.decode('utf-8'))
                except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                    publish_dead_letter(service, raw_message, str(exc))
                    consumer.commit(message=message, asynchronous=False)
                    processed_messages += 1
                    continue

                attempts = 0
                while running:
                    try:
                        handle_event(service, event)
                        consumer.commit(message=message, asynchronous=False)
                        processed_messages += 1
                        break
                    except Exception as exc:
                        attempts += 1
                        logger.exception(
                            'Failed to process event %s for %s; offset will not be committed',
                            event.get('id'),
                            service,
                        )
                        if (
                            settings.KAFKA_CONSUMER_MAX_RETRIES > 0
                            and attempts >= settings.KAFKA_CONSUMER_MAX_RETRIES
                        ):
                            try:
                                publish_dead_letter(service, raw_message, str(exc))
                                consumer.commit(message=message, asynchronous=False)
                                processed_messages += 1
                                break
                            except Exception:
                                logger.exception('Unable to publish failed event to the dead-letter topic')
                        time.sleep(settings.KAFKA_CONSUMER_RETRY_SECONDS)
        finally:
            consumer.close()

    def _consumer_config(self, service: str) -> dict:
        config = {
            'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
            'group.id': f'{settings.KAFKA_CONSUMER_GROUP_PREFIX}.{service}',
            'client.id': f'{settings.KAFKA_CLIENT_ID}.{service}',
            'enable.auto.commit': False,
            'auto.offset.reset': 'earliest',
            'isolation.level': 'read_committed',
            'max.poll.interval.ms': settings.KAFKA_MAX_POLL_INTERVAL_MS,
        }
        if settings.KAFKA_SECURITY_PROTOCOL != 'PLAINTEXT':
            config.update({
                'security.protocol': settings.KAFKA_SECURITY_PROTOCOL,
                'sasl.mechanism': settings.KAFKA_SASL_MECHANISM,
                'sasl.username': settings.KAFKA_SASL_USERNAME,
                'sasl.password': settings.KAFKA_SASL_PASSWORD,
            })
        return config
