import base64
import json
import logging
import os
import signal
from datetime import datetime, timezone

from stats_store import load_stats, save_stats, update_stats_with_task_completed

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

TOPIC_EVENTS = os.getenv('KAFKA_TOPIC', 'smart-todo.events')
TOPIC_DLQ = os.getenv('KAFKA_DLQ_TOPIC', 'smart-todo.events.dlq')
CONSUMER_GROUP_ID = 'smart-todo.ml-statistics'

_running = True


def _handle_shutdown(signum, frame):
    global _running
    logger.info('Shutdown requested; finishing the current message.')
    _running = False


def _kafka_enabled():
    value = os.getenv('KAFKA_ENABLED', os.getenv('KAFKA_EVENTS_ENABLED', 'true'))
    return value.lower() != 'false'


def _publish_dlq(producer, message, error):
    payload = {
        'service': 'ml-statistics',
        'failed_at': datetime.now(timezone.utc).isoformat(),
        'error': str(error),
        'source_topic': message.topic,
        'source_partition': message.partition,
        'source_offset': message.offset,
        'original_message_base64': base64.b64encode(message.value).decode('ascii'),
    }
    producer.send(
        TOPIC_DLQ,
        key=message.key,
        value=json.dumps(payload).encode('utf-8'),
    ).get(timeout=10)


def main():
    if not _kafka_enabled():
        logger.warning('KAFKA_ENABLED=false: statistics consumer is disabled.')
        return

    from kafka import KafkaConsumer, KafkaProducer

    bootstrap_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092').split(',')
    consumer = KafkaConsumer(
        TOPIC_EVENTS,
        bootstrap_servers=bootstrap_servers,
        group_id=CONSUMER_GROUP_ID,
        enable_auto_commit=False,
        auto_offset_reset='earliest',
        key_deserializer=lambda key: key.decode('utf-8') if key else None,
    )
    producer = KafkaProducer(
        bootstrap_servers=bootstrap_servers,
        acks='all',
        retries=10,
    )

    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    logger.info(
        'Statistics consumer started (topic=%s, group=%s)',
        TOPIC_EVENTS,
        CONSUMER_GROUP_ID,
    )

    processed = 0
    try:
        for message in consumer:
            if not _running:
                break

            try:
                event = json.loads(message.value.decode('utf-8'))
                if event.get('type') != 'task.completed':
                    consumer.commit()
                    continue

                stats = load_stats()
                save_stats(update_stats_with_task_completed(stats, event))
            except Exception as error:
                logger.exception(
                    'Statistics processing failed at offset %s; preserving the message in the DLQ.',
                    message.offset,
                )
                try:
                    _publish_dlq(producer, message, error)
                except Exception:
                    logger.exception('DLQ publication failed; source offset will not be committed.')
                    continue

            consumer.commit()
            processed += 1
    finally:
        consumer.close()
        producer.close()
        logger.info('Statistics consumer stopped (%d relevant message(s) handled).', processed)


if __name__ == '__main__':
    main()
