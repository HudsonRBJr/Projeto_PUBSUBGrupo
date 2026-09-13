import { app } from './app.js';
import { config } from './config.js';
import { closePool } from './db.js';

const server = app.listen(config.port, () => {
  console.log(`[api] http://localhost:${config.port}`);
});

async function shutdown(signal) {
  console.log(`\n[api] ${signal} recebido. Encerrando...`);

  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
