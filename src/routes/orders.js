import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getFinancialSummary,
  getOrderByUuid,
  listOrders
} from '../services/orderRepository.js';

export const ordersRouter = Router();

ordersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listOrders(req.query);
    res.json(result);
  })
);

ordersRouter.get(
  '/financial-summary',
  asyncHandler(async (req, res) => {
    const result = await getFinancialSummary(req.query);
    res.json(result);
  })
);

ordersRouter.get(
  '/:uuid/items',
  asyncHandler(async (req, res) => {
    const order = await getOrderByUuid(req.params.uuid);

    if (!order) {
      return res.status(404).json({ error: 'Pedido nao encontrado.' });
    }

    return res.json({ items: order.items });
  })
);

ordersRouter.get(
  '/:uuid',
  asyncHandler(async (req, res) => {
    const order = await getOrderByUuid(req.params.uuid);

    if (!order) {
      return res.status(404).json({ error: 'Pedido nao encontrado.' });
    }

    return res.json(order);
  })
);
