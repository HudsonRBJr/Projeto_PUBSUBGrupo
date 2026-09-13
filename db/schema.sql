CREATE TABLE IF NOT EXISTS cliente (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    document TEXT
);

CREATE TABLE IF NOT EXISTS seller (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT
);

CREATE TABLE IF NOT EXISTS produto (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category_id TEXT,
    category_name TEXT,
    sub_category_id TEXT,
    sub_category_name TEXT
);

CREATE TABLE IF NOT EXISTS pedido (
    uuid TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    channel TEXT,
    status TEXT NOT NULL,
    customer_id BIGINT NOT NULL REFERENCES cliente(id),
    seller_id BIGINT REFERENCES seller(id),

    shipment_carrier TEXT,
    shipment_service TEXT,
    shipment_status TEXT,
    tracking_code TEXT,

    payment_method TEXT,
    payment_status TEXT,
    transaction_id TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Data/hora em que a mensagem foi indexada/persistida.
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_pedido (
    order_uuid TEXT NOT NULL REFERENCES pedido(uuid) ON DELETE CASCADE,
    id BIGINT NOT NULL,
    product_id TEXT NOT NULL REFERENCES produto(id),
    unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_uuid, id)
);

CREATE INDEX IF NOT EXISTS idx_pedido_created_at
    ON pedido (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_customer
    ON pedido (customer_id);

CREATE INDEX IF NOT EXISTS idx_pedido_seller
    ON pedido (seller_id);

CREATE INDEX IF NOT EXISTS idx_pedido_status
    ON pedido (status);

CREATE INDEX IF NOT EXISTS idx_item_pedido_product
    ON item_pedido (product_id);

CREATE INDEX IF NOT EXISTS idx_pedido_payment_method
    ON pedido (payment_method);
