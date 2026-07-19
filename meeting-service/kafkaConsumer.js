/**
 * Consommateur Kafka du service audio/meeting.
 *
 * S'abonne uniquement au topic "meetings" (le seul qui le concerne) et
 * réagit à l'événement "meeting_started" en pré-provisionnant la salle
 * WebRTC correspondante, *avant même* que le premier participant ne se
 * connecte en Socket.IO.
 *
 * Ce découplage est le point important : le backend Django n'appelle jamais
 * directement ce service (pas de HTTP synchrone, pas de dépendance dure).
 * Il publie un événement sur Kafka et poursuit sa route ; ce service le
 * consomme à son propre rythme. Si ce service est arrêté ou redémarre,
 * Kafka conserve l'événement (grâce au groupe de consommateurs et aux
 * offsets commités) et la salle sera créée dès que le service repart —
 * aucune réunion "perdue", même en cas de panne ou de forte charge.
 */
const { Kafka, logLevel } = require('kafkajs');

const TOPIC_MEETINGS = 'smarttodo.meetings.events';
const CONSUMER_GROUP_ID = 'meeting-service-audio';

function createKafkaConsumer({ getOrCreateRoom }) {
  const brokers = (process.env.KAFKA_BOOTSTRAP_SERVERS || 'localhost:9092').split(',');
  const kafkaEnabled = (process.env.KAFKA_EVENTS_ENABLED || 'true').toLowerCase() !== 'false';

  if (!kafkaEnabled) {
    console.log('KAFKA_EVENTS_ENABLED=false : consommateur audio Kafka désactivé.');
    return { start: async () => {}, stop: async () => {} };
  }

  const kafka = new Kafka({
    clientId: 'meeting-service',
    brokers,
    logLevel: logLevel.WARN,
    retry: {
      // Backoff exponentiel automatique si le broker est temporairement
      // injoignable (redémarrage Kafka, forte charge, ...).
      initialRetryTime: 300,
      retries: 10,
    },
  });

  const consumer = kafka.consumer({ groupId: CONSUMER_GROUP_ID });

  async function handleMessage({ message }) {
    let event;
    try {
      event = JSON.parse(message.value.toString());
    } catch (err) {
      console.error('Message Kafka illisible (JSON invalide), ignoré:', err.message);
      return;
    }

    if (event.event_type !== 'meeting_started') {
      return; // ce service ne réagit qu'au démarrage d'une réunion
    }

    const meetingId = event.payload && event.payload.meeting_id;
    if (!meetingId) {
      console.warn('Événement meeting_started sans meeting_id, ignoré');
      return;
    }

    try {
      const room = getOrCreateRoom({
        meetingId,
        title: event.payload.title,
        createdBy: event.payload.organizer_id,
      });
      console.log(
        `[kafka] Salle audio pré-provisionnée pour la réunion ${meetingId} (room=${room.roomId})`
      );
    } catch (err) {
      // On ne relance pas d'exception ici : un échec de provisioning ne doit
      // jamais bloquer la boucle de consommation. La salle sera de toute
      // façon créée à la demande (POST /rooms) si besoin.
      console.error(`Échec du pré-provisioning de la réunion ${meetingId}:`, err);
    }
  }

  return {
    async start() {
      await consumer.connect();
      await consumer.subscribe({ topic: TOPIC_MEETINGS, fromBeginning: false });
      await consumer.run({ eachMessage: handleMessage });
      console.log(`Consommateur Kafka audio démarré (topic=${TOPIC_MEETINGS}, group=${CONSUMER_GROUP_ID})`);
    },
    async stop() {
      await consumer.disconnect();
    },
  };
}

module.exports = { createKafkaConsumer, TOPIC_MEETINGS, CONSUMER_GROUP_ID };
