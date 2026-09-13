import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PubSub } from '@google-cloud/pubsub';
import { config } from '../src/config.js';

if (!config.gcpProjectId) {
  throw new Error('Defina GCP_PROJECT_ID no .env.');
}

if (!config.pubsubTopic) {
  throw new Error('Defina PUBSUB_TOPIC no .env.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const samplePath = path.resolve(__dirname, 'sample-order.json');
const payload = await readFile(samplePath, 'utf8');

const pubsub = new PubSub({
  projectId: config.gcpProjectId
});

const messageId = await pubsub
  .topic(config.pubsubTopic)
  .publishMessage({ data: Buffer.from(payload) });

console.log(`[publisher] mensagem publicada. messageId=${messageId}`);
