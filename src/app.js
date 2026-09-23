import express from 'express';
import { docsRouter } from './routes/docs.js';
import { ordersRouter } from './routes/orders.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// A raiz leva direto para a documentacao interativa.
app.get('/', (_req, res) => {
  res.redirect('/docs');
});

app.use(docsRouter);
app.use('/orders', ordersRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

app.use((error, _req, res, _next) => {
  console.error('[api] erro:', error);

  res.status(500).json({
    error: 'Erro interno do servidor.'
  });
});
