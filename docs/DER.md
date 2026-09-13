# DER - Projeto Mensageria

O diagrama abaixo representa a estrutura relacional usada pelo projeto.

```mermaid
erDiagram
    CLIENTE ||--o{ PEDIDO : realiza
    SELLER ||--o{ PEDIDO : recebe
    PEDIDO ||--|{ ITEM_PEDIDO : contem
    PRODUTO ||--o{ ITEM_PEDIDO : referencia

    CLIENTE {
        BIGINT id PK
        TEXT name
        TEXT email
        TEXT document
    }

    SELLER {
        BIGINT id PK
        TEXT name
        TEXT city
        TEXT state
    }

    PRODUTO {
        TEXT id PK
        TEXT title
        TEXT category_id
        TEXT category_name
        TEXT sub_category_id
        TEXT sub_category_name
    }

    PEDIDO {
        TEXT uuid PK
        TIMESTAMPTZ created_at
        TEXT channel
        TEXT status
        BIGINT customer_id FK
        BIGINT seller_id FK
        TEXT shipment_carrier
        TEXT shipment_service
        TEXT shipment_status
        TEXT tracking_code
        TEXT payment_method
        TEXT payment_status
        TEXT transaction_id
        JSONB metadata
        TIMESTAMPTZ indexed_at
    }

    ITEM_PEDIDO {
        TEXT order_uuid PK,FK
        BIGINT id PK
        TEXT product_id FK
        NUMERIC unit_price
        INTEGER quantity
    }
```

> O valor total do item e o valor total do pedido **nao sao armazenados**:
> eles sao calculados dinamicamente pela API.
