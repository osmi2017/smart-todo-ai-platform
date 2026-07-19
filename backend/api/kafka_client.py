import base64
import json
import threading
from typing import Optional

from confluent_kafka import Producer
from django.conf import settings
from django.utils import timezone

from .events import event_envelope
from .models import EventOutbox

_producer: Optional[Producer] = None
_producer_lock = threading.Lock()


class KafkaPublishError(RuntimeError):
    pass


def get_producer() -> Producer:
    global _producer

    if _producer is None:
        with _producer_lock:
            if _producer is None:
                config = {
                    'bootstrap.servers': settings.KAFKA_BOOTSTRAP_SERVERS,
                    'client.id': settings.KAFKA_CLIENT_ID,
                    'acks': 'all',
                    'enable.idempotence': True,
                    'compression.type': settings.KAFKA_COMPRESSION_TYPE,
                    'linger.ms': settings.KAFKA_LINGER_MS,
                    'delivery.timeout.ms': settings.KAFKA_DELIVERY_TIMEOUT_MS,
                    'socket.keepalive.enable': True,
                }
                if settings.KAFKA_SECURITY_PROTOCOL != 'PLAINTEXT':
                    config.update({
                        'security.protocol': settings.KAFKA_SECURITY_PROTOCOL,
                        'sasl.mechanism': settings.KAFKA_SASL_MECHANISM,
                        'sasl.username': settings.KAFKA_SASL_USERNAME,
                        'sasl.password': settings.KAFKA_SASL_PASSWORD,
                    })
                _producer = Producer(config)

    return _producer


def publish_outbox_event(event: EventOutbox) -> None:
    key = str(event.company_id_snapshot or f'{event.aggregate_type}:{event.aggregate_id}')
    _produce_and_flush(
        settings.KAFKA_EVENTS_TOPIC,
        key.encode('utf-8'),
        json.dumps(event_envelope(event), separators=(',', ':')).encode('utf-8'),
        {
            'event_type': event.event_type,
            'schema_version': str(event.schema_version),
        },
    )


def publish_dead_letter(service: str, original_message: bytes, error: str) -> None:
    payload = {
        'service': service,
        'failed_at': timezone.now().isoformat(),
        'error': error,
        'original_message_base64': base64.b64encode(original_message).decode('ascii'),
    }
    _produce_and_flush(
        settings.KAFKA_DEAD_LETTER_TOPIC,
        service.encode('utf-8'),
        json.dumps(payload, separators=(',', ':')).encode('utf-8'),
        {'failed_service': service},
    )


def _produce_and_flush(topic: str, key: bytes, value: bytes, headers: dict) -> None:
    producer = get_producer()
    delivery_errors = []

    def delivery_callback(error, _message):
        if error is not None:
            delivery_errors.append(str(error))

    producer.produce(
        topic=topic,
        key=key,
        value=value,
        headers=headers,
        on_delivery=delivery_callback,
    )
    remaining = producer.flush(settings.KAFKA_FLUSH_TIMEOUT_SECONDS)

    if remaining or delivery_errors:
        details = ', '.join(delivery_errors) if delivery_errors else f'{remaining} message(s) pending'
        raise KafkaPublishError(details)
