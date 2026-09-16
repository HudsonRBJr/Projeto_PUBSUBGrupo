import { PubSub } from '@google-cloud/pubsub';
import { config } from './config.js';
import { closePool } from './db.js';
import { persistOrder } from './services/orderPersistence.js';

if (!config.gcpProjectId) {
  throw new Error('Defina GCP_PROJECT_ID no .env.');
}

if (!config.pubsubSubscription) {
  throw new Error('Defina PUBSUB_SUBSCRIPTION no .env.');
}

const pubsub = new PubSub({
  projectId: config.gcpProjectId
});

const subscription = pubsub.subscription(config.pubsubSubscription, {
  flowControl: {
    maxMessages: 1,
    allowExcessMessages: false
  }
});

console.log(
  `[consumer] aguardando mensagens em "${config.pubsubSubscription}"...`
);

subscription.on('message', async (message) => {
  try {
    const raw = message.data.toString('utf8');
    const order = JSON.parse(raw);

    const result = await persistOrder(order);

    console.log(
      `[consumer] pedido ${result.uuid} persistido. messageId=${message.id}`
    );

    // ACK somente depois do COMMIT no PostgreSQL.
    message.ack();
  } catch (error) {
    console.error(
      `[consumer] falha ao processar messageId=${message.id}:`,
      error
    );

    // Permite reentrega pelo Pub/Sub.
    message.nack();
  }
});

subscription.on('error', (error) => {
  console.error('[consumer] erro na subscription:', error);
});

async function shutdown(signal) {
  console.log(`\n[consumer] ${signal} recebido. Encerrando...`);

  await subscription.close().catch(() => { });
  await closePool();

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
