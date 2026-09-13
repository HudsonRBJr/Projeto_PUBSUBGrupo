import 'dotenv/config';

const parseBoolean = (value, fallback = false) => {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/marketplace',
  dbSsl: parseBoolean(process.env.DB_SSL, false),
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  pubsubSubscription: process.env.PUBSUB_SUBSCRIPTION || '',
  pubsubTopic: process.env.PUBSUB_TOPIC || ''
};
