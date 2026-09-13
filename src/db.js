import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.dbSsl ? { rejectUnauthorized: false } : false
});

pool.on('error', (error) => {
  console.error('[postgres] erro inesperado no pool:', error);
});

export async function closePool() {
  await pool.end();
}
