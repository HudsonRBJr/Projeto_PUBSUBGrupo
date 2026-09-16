import { pool } from '../db.js';
import { normalizeSortDirection, positiveInt } from '../utils/http.js';

const ORDER_SELECT = `
  SELECT
    p.uuid,
    p.created_at,
    p.channel,
    p.status,

    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'email', c.email,
      'document', c.document
    ) AS customer,

    CASE
      WHEN s.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'city', s.city,
        'state', s.state
      )
    END AS seller,

    COALESCE(items_agg.items, '[]'::jsonb) AS items,
    COALESCE(items_agg.total, 0)::NUMERIC(14,2) AS total,

    jsonb_strip_nulls(
      jsonb_build_object(
        'carrier', p.shipment_carrier,
        'service', p.shipment_service,
        'status', p.shipment_status,
        'tracking_code', p.tracking_code
      )
    ) AS shipment,

    jsonb_strip_nulls(
      jsonb_build_object(
        'method', p.payment_method,
        'status', p.payment_status,
        'transaction_id', p.transaction_id
      )
    ) AS payment,

    p.metadata,
    p.indexed_at
  FROM pedido p
  JOIN cliente c ON c.id = p.customer_id
  LEFT JOIN seller s ON s.id = p.seller_id
  LEFT JOIN LATERAL (
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'id', ip.id,
          'product', jsonb_build_object(
            'id', pr.id,
            'title', pr.title
          ),
          'unit_price', ip.unit_price,
          'quantity', ip.quantity,
          'category',
            CASE
              WHEN pr.category_id IS NULL AND pr.category_name IS NULL THEN NULL
              ELSE jsonb_build_object(
                'id', pr.category_id,
                'name', pr.category_name,
                'sub_category',
                  CASE
                    WHEN pr.sub_category_id IS NULL AND pr.sub_category_name IS NULL THEN NULL
                    ELSE jsonb_build_object(
                      'id', pr.sub_category_id,
                      'name', pr.sub_category_name
                    )
                  END
              )
            END,
          'total', ip.unit_price * ip.quantity
        )
        ORDER BY ip.id
      ) AS items,
      SUM(ip.unit_price * ip.quantity) AS total
    FROM item_pedido ip
    JOIN produto pr ON pr.id = ip.product_id
    WHERE ip.order_uuid = p.uuid
  ) AS items_agg ON TRUE
`;

function addParam(params, value) {
  params.push(value);
  return `$${params.length}`;
}

function buildOrderFilters(query, params) {
  const where = [];

  if (query['customer.id']) {
    where.push(`p.customer_id = ${addParam(params, query['customer.id'])}`);
  }

  if (query['product.id']) {
    const param = addParam(params, String(query['product.id']));
    where.push(`
      EXISTS (
        SELECT 1
        FROM item_pedido ip_filter
        WHERE ip_filter.order_uuid = p.uuid
          AND ip_filter.product_id = ${param}
      )
    `);
  }

  if (query.status) {
    where.push(`p.status = ${addParam(params, query.status)}`);
  }

  if (query['seller.id']) {
    where.push(`p.seller_id = ${addParam(params, query['seller.id'])}`);
  }

  return where;
}

function mapOrder(row) {
  return {
    uuid: row.uuid,
    created_at: row.created_at,
    channel: row.channel,
    total: Number(row.total),
    status: row.status,
    customer: row.customer,
    seller: row.seller,
    items: row.items,
    shipment: row.shipment,
    payment: row.payment,
    metadata: row.metadata
  };
}

export async function listOrders(query) {
  const page = positiveInt(query.page, 1);
  const limit = positiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const direction = normalizeSortDirection(query.sort ?? query.order);

  const params = [];
  const where = buildOrderFilters(query, params);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countSql = `
    SELECT COUNT(*)::BIGINT AS total
    FROM pedido p
    ${whereSql}
  `;

  const countResult = await pool.query(countSql, params);
  const total = Number(countResult.rows[0].total);

  const dataParams = [...params];
  const limitParam = addParam(dataParams, limit);
  const offsetParam = addParam(dataParams, offset);

  const dataSql = `
    ${ORDER_SELECT}
    ${whereSql}
    ORDER BY p.created_at ${direction}, p.uuid ASC
    LIMIT ${limitParam}
    OFFSET ${offsetParam}
  `;

  const dataResult = await pool.query(dataSql, dataParams);

  return {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
    data: dataResult.rows.map(mapOrder)
  };
}

export async function getOrderByUuid(uuid) {
  const result = await pool.query(
    `
    ${ORDER_SELECT}
    WHERE p.uuid = $1
    `,
    [uuid]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return mapOrder(result.rows[0]);
}

function buildFinancialFilters(query, params) {
  const where = [];

  if (query['seller.id']) {
    where.push(`p.seller_id = ${addParam(params, query['seller.id'])}`);
  }

  if (query.start_date) {
    const param = addParam(params, query.start_date);
    where.push(`p.created_at >= ${param}::date`);
  }

  if (query.end_date) {
    const param = addParam(params, query.end_date);
    where.push(
      `p.created_at < (${param}::date + INTERVAL '1 day')`
    );
  }

  return where;
}
function financialCte(whereSql) {
  return `
    WITH filtered_orders AS (
      SELECT
        p.uuid,
        p.status,
        p.payment_method,
        COALESCE(SUM(ip.unit_price * ip.quantity), 0)::NUMERIC(14,2) AS order_total
      FROM pedido p
      LEFT JOIN item_pedido ip ON ip.order_uuid = p.uuid
      ${whereSql}
      GROUP BY p.uuid, p.status, p.payment_method
    )
  `;
}

export async function getFinancialSummary(query) {
  const params = [];
  const where = buildFinancialFilters(query, params);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const cte = financialCte(whereSql);

  const summaryResult = await pool.query(
    `
    ${cte}
    SELECT
      COUNT(*)::BIGINT AS total_orders,
      COALESCE(SUM(order_total), 0)::NUMERIC(14,2) AS total_revenue,
      COALESCE(AVG(order_total), 0)::NUMERIC(14,2) AS average_order_value
    FROM filtered_orders
    `,
    params
  );

  const statusResult = await pool.query(
    `
    ${cte}
    SELECT status, COUNT(*)::BIGINT AS count
    FROM filtered_orders
    GROUP BY status
    ORDER BY status
    `,
    params
  );

  const paymentResult = await pool.query(
    `
    ${cte}
    SELECT
      COALESCE(payment_method, 'unknown') AS payment_method,
      COUNT(*)::BIGINT AS count,
      COALESCE(SUM(order_total), 0)::NUMERIC(14,2) AS total
    FROM filtered_orders
    GROUP BY COALESCE(payment_method, 'unknown')
    ORDER BY payment_method
    `,
    params
  );

  const row = summaryResult.rows[0];

  const byStatus = Object.fromEntries(
    statusResult.rows.map((item) => [item.status, Number(item.count)])
  );

  const byPaymentMethod = Object.fromEntries(
    paymentResult.rows.map((item) => [
      item.payment_method,
      {
        count: Number(item.count),
        total: Number(item.total)
      }
    ])
  );

  return {
    total_orders: Number(row.total_orders),
    total_revenue: Number(row.total_revenue),
    average_order_value: Number(row.average_order_value),
    by_status: byStatus,
    by_payment_method: byPaymentMethod
  };
}
