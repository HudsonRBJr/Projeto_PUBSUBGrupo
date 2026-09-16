
# Projeto Mensageria — Consumidor + API REST

Implementacao pronta para versionamento no Git, usando:

- **Node.js**
- **Express**
- **PostgreSQL**
- **Google Cloud Pub/Sub**

O projeto atende a parte de codigo da atividade: consumidor de pedidos, persistencia relacional, horario de indexacao, API REST, paginacao, ordenacao por data, filtros, totais dinamicos e resumo financeiro.

## Estrutura

```text
projeto-mensageria/
├─ db/
│  └─ schema.sql
├─ docs/
│  └─ DER.md
├─ scripts/
│  ├─ initDb.js
│  ├─ publishSample.js
│  └─ sample-order.json
├─ src/
│  ├─ routes/
│  │  └─ orders.js
│  ├─ services/
│  │  ├─ orderPersistence.js
│  │  └─ orderRepository.js
│  ├─ utils/
│  │  ├─ asyncHandler.js
│  │  └─ http.js
│  ├─ app.js
│  ├─ config.js
│  ├─ consumer.js
│  ├─ db.js
│  └─ server.js
├─ .env.example
├─ .gitignore
├─ docker-compose.yml
├─ package.json
└─ README.md
```

## 1. Instalar dependencias

```bash
npm install
```

## 2. Subir o PostgreSQL

Com Docker:

```bash
docker compose up -d
```

Depois crie as tabelas:

```bash
npm run db:init
```

## 3. Configurar variaveis de ambiente

Copie `.env.example` para `.env` e ajuste:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketplace
DB_SSL=false

GCP_PROJECT_ID=seu-project-id
PUBSUB_SUBSCRIPTION=orders-subscription
PUBSUB_TOPIC=orders-topic
GOOGLE_APPLICATION_CREDENTIALS=C:/Users/seu_usuario/caminho/service-account.json
```

### Windows CMD

Se preferir definir a credencial apenas no terminal atual:

```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\caminho\service-account.json
```

### Windows PowerShell

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\service-account.json"
```

Se a variavel estiver no `.env`, normalmente nao sera necessario digitar o comando novamente em cada terminal.

## 4. Iniciar o consumidor

```bash
npm run consumer
```

O consumidor:

1. le a mensagem do Pub/Sub;
2. valida o payload;
3. abre uma transacao no PostgreSQL;
4. faz upsert de cliente, seller e produto;
5. grava/atualiza o pedido;
6. grava os itens;
7. atualiza `indexed_at`;
8. executa `ACK` somente depois do `COMMIT`.

Em caso de erro, executa `NACK`, permitindo reentrega.

## 5. Publicar uma mensagem de teste

Com o topico configurado:

```bash
npm run publish:sample
```

O payload de exemplo esta em:

```text
scripts/sample-order.json
```

## 6. Iniciar a API

Em outro terminal:

```bash
npm start
```

Teste de saude:

```text
GET http://localhost:3000/health
```

## Endpoints

### Listar pedidos

```http
GET /orders
```

Paginacao:

```http
GET /orders?page=1&limit=20
```

Ordenacao por data:

```http
GET /orders?sort=desc
GET /orders?sort=asc
```

Filtros:

```http
GET /orders?customer.id=7788
GET /orders?product.id=abc-1344
GET /orders?status=shipped
GET /orders?seller.id=55
```

Filtros podem ser combinados:

```http
GET /orders?customer.id=7788&status=shipped&sort=desc&page=1&limit=20
```

Resposta de listagem:

```json
{
  "page": 1,
  "limit": 20,
  "total": 1,
  "total_pages": 1,
  "data": [
    {
      "uuid": "ORD-2026-0001",
      "created_at": "2026-09-13T18:00:00.000Z",
      "channel": "mobile_app",
      "total": 5000,
      "status": "shipped",
      "customer": {},
      "seller": {},
      "items": [],
      "shipment": {},
      "payment": {},
      "metadata": {}
    }
  ]
}
```

Cada pedido segue o contrato da atividade. O campo `total` do pedido e o `total` de cada item sao calculados dinamicamente.

### Consultar pedido por UUID

```http
GET /orders/ORD-2026-0001
```

### Consultar somente os itens

```http
GET /orders/ORD-2026-0001/items
```

Resposta:

```json
{
  "items": [
    {
      "id": 1,
      "product": {
        "id": "abc-1344",
        "title": "Televisao bonita"
      },
      "unit_price": 2500,
      "quantity": 2,
      "category": {
        "id": "ELEC",
        "name": "Eletronicos",
        "sub_category": {
          "id": "TV",
          "name": "Televisores"
        }
      },
      "total": 5000
    }
  ]
}
```

### Resumo financeiro

```http
GET /orders/financial-summary
```

Filtro por seller:

```http
GET /orders/financial-summary?seller.id=55
```

Filtro por periodo:

```http
GET /orders/financial-summary?start_date=2026-09-01T00:00:00Z&end_date=2026-09-30T23:59:59Z
```

Resposta:

```json
{
  "total_orders": 150,
  "total_revenue": 750000,
  "average_order_value": 5000,
  "by_status": {
    "created": 10,
    "paid": 120,
    "shipped": 15,
    "delivered": 5
  },
  "by_payment_method": {
    "pix": {
      "count": 80,
      "total": 400000
    },
    "credit_card": {
      "count": 50,
      "total": 250000
    },
    "boleto": {
      "count": 20,
      "total": 100000
    }
  }
}
```

## Observacao sobre status

A atividade lista os status:

- `created`
- `paid`
- `shipped`
- `delivered`
- `canceled`

O banco deixa `status` como texto para nao quebrar mensagens legadas ou o exemplo do enunciado, mas os testes do grupo devem preferir os status acima.

## DER

O arquivo `docs/DER.md` contem o DER em Mermaid, pronto para visualizar no GitHub ou exportar para imagem posteriormente.

## Checklist para demonstracao

1. PostgreSQL em execucao.
2. Schema criado com `npm run db:init`.
3. Subscription do Pub/Sub existente.
4. Consumidor rodando com `npm run consumer`.
5. Publicar uma mensagem com `npm run publish:sample`.
6. Mostrar o registro no banco, incluindo `indexed_at`.
7. Subir a API com `npm start`.
8. Demonstrar `/orders`, filtros, paginacao, `/items` e `/financial-summary`.
