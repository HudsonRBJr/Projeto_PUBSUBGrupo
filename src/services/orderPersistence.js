import { pool } from '../db.js';

function assertOrderPayload(order) {
  const required = [
    ['uuid', order?.uuid],
    ['created_at', order?.created_at],
    ['status', order?.status],
    ['customer.id', order?.customer?.id],
    ['customer.name', order?.customer?.name]
  ];

  const missing = required
    .filter(([, value]) => value === undefined || value === null || value === '')
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`Payload invalido. Campos obrigatorios ausentes: ${missing.join(', ')}`);
  }

  if (!Array.isArray(order.items)) {
    throw new Error('Payload invalido. "items" deve ser um array.');
  }

  for (const [index, item] of order.items.entries()) {
    if (
      item?.id == null ||
      item?.product?.id == null ||
      !item?.product?.title ||
      item?.unit_price == null ||
      item?.quantity == null
    ) {
      throw new Error(`Payload invalido no item de indice ${index}.`);
    }
  }
}

export async function persistOrder(order) {
  assertOrderPayload(order);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
      INSERT INTO cliente (id, name, email, document)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        document = EXCLUDED.document
      `,
      [
        order.customer.id,
        order.customer.name,
        order.customer.email ?? null,
        order.customer.document ?? null
      ]
    );

    if (order.seller?.id != null) {
      await client.query(
        `
        INSERT INTO seller (id, name, city, state)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          city = EXCLUDED.city,
          state = EXCLUDED.state
        `,
        [
          order.seller.id,
          order.seller.name ?? `seller-${order.seller.id}`,
          order.seller.city ?? null,
          order.seller.state ?? null
        ]
      );
    }

    for (const item of order.items) {
      const category = item.category ?? {};
      const subCategory = category.sub_category ?? {};

      await client.query(
        `
        INSERT INTO produto (
          id,
          title,
          category_id,
          category_name,
          sub_category_id,
          sub_category_name
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          category_id = EXCLUDED.category_id,
          category_name = EXCLUDED.category_name,
          sub_category_id = EXCLUDED.sub_category_id,
          sub_category_name = EXCLUDED.sub_category_name
        `,
        [
          String(item.product.id),
          item.product.title,
          category.id ?? null,
          category.name ?? null,
          subCategory.id ?? null,
          subCategory.name ?? null
        ]
      );
    }

    await client.query(
      `
      INSERT INTO pedido (
        uuid,
        created_at,
        channel,
        status,
        customer_id,
        seller_id,
        shipment_carrier,
        shipment_service,
        shipment_status,
        tracking_code,
        payment_method,
        payment_status,
        transaction_id,
        metadata,
        indexed_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14::jsonb, NOW()
      )
      ON CONFLICT (uuid) DO UPDATE SET
        created_at = EXCLUDED.created_at,
        channel = EXCLUDED.channel,
        status = EXCLUDED.status,
        customer_id = EXCLUDED.customer_id,
        seller_id = EXCLUDED.seller_id,
        shipment_carrier = EXCLUDED.shipment_carrier,
        shipment_service = EXCLUDED.shipment_service,
        shipment_status = EXCLUDED.shipment_status,
        tracking_code = EXCLUDED.tracking_code,
        payment_method = EXCLUDED.payment_method,
        payment_status = EXCLUDED.payment_status,
        transaction_id = EXCLUDED.transaction_id,
        metadata = EXCLUDED.metadata,
        indexed_at = NOW()
      `,
      [
        order.uuid,
        order.created_at,
        order.channel ?? null,
        order.status,
        order.customer.id,
        order.seller?.id ?? null,
        order.shipment?.carrier ?? null,
        order.shipment?.service ?? null,
        order.shipment?.status ?? null,
        order.shipment?.tracking_code ?? null,
        order.payment?.method ?? null,
        order.payment?.status ?? null,
        order.payment?.transaction_id ?? null,
        JSON.stringify(order.metadata ?? {})
      ]
    );

    // Mantem o processamento idempotente caso a mesma mensagem seja reentregue.
    await client.query('DELETE FROM item_pedido WHERE order_uuid = $1', [order.uuid]);

    for (const item of order.items) {
      await client.query(
        `
        INSERT INTO item_pedido (
          order_uuid,
          id,
          product_id,
          unit_price,
          quantity
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          order.uuid,
          item.id,
          String(item.product.id),
          item.unit_price,
          item.quantity
        ]
      );
    }

    await client.query('COMMIT');

    return {
      uuid: order.uuid,
      indexed_at: new Date().toISOString()
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
