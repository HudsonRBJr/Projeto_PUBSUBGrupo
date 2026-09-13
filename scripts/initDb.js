import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool, closePool } from '../src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, '../db/schema.sql');
const sql = await readFile(schemaPath, 'utf8');

try {
  await pool.query(sql);
  console.log('[db] schema criado/atualizado com sucesso.');
} finally {
  await closePool();
}
