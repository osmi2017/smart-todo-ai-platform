/**
 * Consommateur Kafka du service audio/meeting.
 *
 * S'abonne au bus d'événements centralisé (`smart-todo.events`) et réagit à
 * l'événement CloudEvents `meeting.started` en pré-provisionnant la salle
 * WebRTC correspondante, *avant même* que le premier participant ne se
 * connecte en Socket.IO.
 *
 * Le backend Django n'appelle jamais directement ce service : il publie un
 * événement sur Kafka et poursuit sa route. Si un pré-provisioning échoue, on
 * relance l'erreur pour que kafkajs ne committe pas l'offset : l'événement
 * sera rejoué plutôt que silencieusement perdu.
 */
const { Kafka, logLevel } = require('kafkajs');

const TOPIC_EVENTS = process.env.KAFKA_TOPIC || 'smart-todo.events';
const TOPIC_DLQ = process.env.KAFKA_DLQ_TOPIC || 'smart-todo.events.dlq';
const CONSUMER_GROUP_ID = 'smart-todo.meeting-audio';

function createKafkaConsumer({ getOrCreateRoom }) {
  const brokers = (process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092').split(',');
  const kafkaEnabled =
    (process.env.KAFKA_ENABLED || process.env.KAFKA_EVENTS_ENABLED || 'true').toLowerCase() !==
    'false';

  if (!kafkaEnabled) {
    console.log('KAFKA_ENABLED=false : consommateur audio Kafka désactivé.');
    return { start: async () => {}, stop: async () => {} };
  }

  const kafka = new Kafka({
    clientId: 'meeting-service',
    brokers,
    logLevel: logLevel.WARN,
    retry: {
      initialRetryTime: 300,
      retries: 10,
    },
  });

  const consumer = kafka.consumer({ groupId: CONSUMER_GROUP_ID });
  const producer = kafka.producer({ allowAutoTopicCreation: false });

  async function publishDlq(message, error) {
    await producer.send({
      topic: TOPIC_DLQ,
      messages: [
        {
          key: message.key,
          value: JSON.stringify({
            service: 'meeting-audio',
            failed_at: new Date().toISOString(),
            error,
            original_message_base64: message.value.toString('base64'),
          }),
        },
      ],
    });
  }

  async function handleMessage({ message }) {
    let event;
    try {
      event = JSON.parse(message.value.toString());
    } catch (err) {
      console.error('Message Kafka illisible; conservation dans la DLQ:', err.message);
      await publishDlq(message, err.message);
      return;
    }

    if (event.type !== 'meeting.started') {
      return; // ce service ne réagit qu'au démarrage d'une réunion
    }

    const data = event.data || {};
    const meetingId = data.meeting_id;
    if (!meetingId) {
      console.warn('Événement meeting.started sans meeting_id; conservation dans la DLQ');
      await publishDlq(message, 'meeting.started is missing data.meeting_id');
      return;
    }

    // Une exception ici remonte à kafkajs, qui ne committe pas l'offset :
    // l'événement sera rejoué au redémarrage plutôt que perdu.
    const room = getOrCreateRoom({
      meetingId,
      title: data.title,
      createdBy: data.organizer_id,
    });
    console.log(
      `[kafka] Salle audio pré-provisionnée pour la réunion ${meetingId} (room=${room.roomId})`
    );
  }

  return {
    async start() {
      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({ topic: TOPIC_EVENTS, fromBeginning: false });
      await consumer.run({ eachMessage: handleMessage });
      console.log(`Consommateur Kafka audio démarré (topic=${TOPIC_EVENTS}, group=${CONSUMER_GROUP_ID})`);
    },
    async stop() {
      await consumer.disconnect();
      await producer.disconnect();
    },
  };
}

module.exports = { createKafkaConsumer, TOPIC_EVENTS, TOPIC_DLQ, CONSUMER_GROUP_ID };
