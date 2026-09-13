import express from 'express';
import { ordersRouter } from './routes/orders.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

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
