# Projeto PUB/SUB — Mensageria de Pedidos

Projeto desenvolvido para a disciplina de **Computação em Nuvem 2** do curso de **Desenvolvimento de Software Multiplataforma — FATEC**.

O sistema simula o processamento assíncrono de pedidos de um marketplace. Os pedidos são publicados em um tópico do **Google Cloud Pub/Sub**, consumidos por uma aplicação em **Node.js/JavaScript**, persistidos em um banco relacional **PostgreSQL** e disponibilizados para consulta por meio de uma **API REST**.

## Integrantes do grupo

- Hudson Ribeiro Barbara Junior

- Maria Clara Cardoso Costa

## Objetivo

O projeto implementa o seguinte fluxo:

```text

Sistema de vendas / Publisher

            |

            v

   Google Cloud Pub/Sub

            |

            v

         Consumer

            |

            v

        PostgreSQL

            |

            v

         API REST

            |

            v

       Cliente da API

```

O consumer recebe mensagens de pedidos, valida a estrutura mínima do payload e persiste os dados no banco. A API permite consultar pedidos com paginação, ordenação e filtros, além de calcular dinamicamente o valor total de cada item, o valor total do pedido e um resumo financeiro.

---

## Tecnologias utilizadas

- **JavaScript**

- **Node.js**

- **Express**

- **PostgreSQL**

- **Google Cloud Pub/Sub**

- **Docker / Docker Compose** (opcional)

- **pg**

- **dotenv**

---

## Funcionalidades

- Consumo assíncrono de pedidos pelo Google Cloud Pub/Sub.

- Persistência dos pedidos em PostgreSQL.

- Registro da data/hora em que a mensagem foi indexada no banco.

- Processamento idempotente em caso de reentrega da mesma mensagem.

- API REST para consulta de pedidos.

- Paginação.

- Ordenação por data de criação.

- Filtro por cliente.

- Filtro por produto.

- Filtro por status do pedido.

- Filtro por seller.

- Consulta de pedido por UUID.

- Consulta somente dos itens de um pedido.

- Cálculo dinâmico do total de cada item.

- Cálculo dinâmico do total do pedido.

- Resumo financeiro dos pedidos.

- Filtro do resumo financeiro por seller.

- Filtro do resumo financeiro por intervalo de datas.

- Agrupamento do resumo financeiro por status e método de pagamento.

---

## Estrutura do projeto

```text

Projeto_PUBSUBGrupo/

├── db/

│   └── schema.sql

├── docs/

│   └── DER.md

├── scripts/

│   ├── initDb.js

│   ├── publishSample.js

│   └── sample-order.json

├── src/

│   ├── routes/

│   │   └── orders.js

│   ├── services/

│   │   ├── orderPersistence.js

│   │   └── orderRepository.js

│   ├── utils/

│   │   ├── asyncHandler.js

│   │   └── http.js

│   ├── app.js

│   ├── config.js

│   ├── consumer.js

│   ├── db.js

│   └── server.js

├── .env.example

├── .gitignore

├── docker-compose.yml

├── package.json

├── package-lock.json

└── README.md

```

---

## Modelo do banco de dados

O projeto utiliza as tabelas:

- `cliente`

- `seller`

- `produto`

- `pedido`

- `item_pedido`

O campo `pedido.indexed_at` registra quando a mensagem foi persistida/indexada no banco.

Os valores totais **não são armazenados** no banco:

```text

total do item   = unit_price × quantity

total do pedido = soma dos totais dos itens

```

Esses valores são calculados dinamicamente durante as consultas da API.

O DER completo está disponível em:

[docs/DER.md](docs/DER.md)

---

# Como executar o projeto

## 1. Pré-requisitos

Antes de iniciar, é necessário ter instalado/configurado:

- Node.js

- npm

- PostgreSQL

- Credencial da Service Account do grupo com acesso ao Pub/Sub

- Acesso ao projeto `serjava-demo` e à subscription `grupo-h`

O uso de Docker e Docker Compose é opcional. O projeto foi configurado e testado com PostgreSQL instalado localmente no Windows.

---

## 2. Instalar as dependências

```bash

npm install

```

---

## 3. Configurar o Google Cloud Pub/Sub

Os recursos do grupo já foram criados no Google Cloud:

```text

Projeto: serjava-demo

Tópico: aula-pub

Subscription: grupo-h

Service Account: sa-grupo-h@serjava-demo.iam.gserviceaccount.com

```

A credencial fornecida ao grupo possui permissão de subscriber na subscription `grupo-h`.

Salve o arquivo `sa-grupo-h-key.json` em local seguro e não faça commit dele no Git.

---

## 4. Configurar as variáveis de ambiente

O projeto possui um arquivo `.env.example` com as variáveis necessárias.

Copie `.env.example` para um novo arquivo chamado `.env` e preencha os valores correspondentes ao seu ambiente.

```env

PORT=3000

DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/marketplace

DB_SSL=false

GCP_PROJECT_ID=SEU_PROJECT_ID

PUBSUB_TOPIC=SEU_TOPICO

PUBSUB_SUBSCRIPTION=SUA_SUBSCRIPTION

GOOGLE_APPLICATION_CREDENTIALS=C:/caminho/para/service-account-key.json

```

### Variáveis disponíveis

| Variável | Descrição | Valor padrão |

|---|---|---|

| `PORT` | Porta utilizada pela API | `3000` |

| `DATABASE_URL` | URL de conexão com PostgreSQL | `postgresql://postgres@localhost:5432/marketplace` |

| `DB_SSL` | Ativa SSL na conexão PostgreSQL | `false` |

| `GCP_PROJECT_ID` | ID do projeto no Google Cloud | `serjava-demo` |

| `PUBSUB_TOPIC` | Nome do tópico usado pelo publisher | `aula-pub` |

| `PUBSUB_SUBSCRIPTION` | Nome da subscription usada pelo consumer | `grupo-h` |

| `GOOGLE_APPLICATION_CREDENTIALS` | Caminho para a chave da Service Account | obrigatório para autenticação local |

> Não faça commit de credenciais ou arquivos `.env` contendo informações sensíveis. O `.gitignore` do projeto já ignora o `.env` e o arquivo `sa-grupo-h-key.json`.

---

## 5. Iniciar o PostgreSQL

O projeto foi configurado e testado com PostgreSQL instalado localmente no Windows.

A configuração utilizada é:

```text

Banco: marketplace

Usuário: postgres

Porta: 5432

Senha: definida na instalação do PostgreSQL

```

Se o banco `marketplace` ainda não existir, crie-o no pgAdmin ou execute:

```sql

CREATE DATABASE marketplace;

```

O projeto também possui um `docker-compose.yml`, que pode ser usado opcionalmente caso seja necessário executar o PostgreSQL com Docker.

---

## 6. Criar as tabelas

Com o PostgreSQL em execução:

```bash

npm run db:init

```

Quando a inicialização for concluída, deverá aparecer uma mensagem semelhante a:

```text

[db] schema criado/atualizado com sucesso.

```

---

# Executando a aplicação

A demonstração completa utiliza **dois processos separados**:

1. API REST

2. Consumer do Pub/Sub

É recomendado abrir dois terminais.

## Terminal 1 — API REST

```bash

npm start

```

A API ficará disponível por padrão em:

```text

http://localhost:3000

```

Durante o desenvolvimento também é possível usar:

```bash

npm run dev

```

---

## Terminal 2 — Consumer

```bash

npm run consumer

```

Se a configuração estiver correta, o consumer ficará aguardando mensagens na subscription configurada:

```text

[consumer] aguardando mensagens em "grupo-h"...

```

O ACK da mensagem é realizado somente depois que a persistência no PostgreSQL é concluída com sucesso.

Em caso de falha no processamento, a mensagem recebe NACK e pode ser entregue novamente pelo Pub/Sub.

O consumer está configurado com `maxMessages: 1` para processar uma mensagem por vez e reduzir conflitos de concorrência no PostgreSQL.

---

# Publicando um pedido de teste

O projeto já possui um payload de exemplo em:

```text

scripts/sample-order.json

```

Para publicá-lo no tópico configurado em `PUBSUB_TOPIC`, o projeto possui:

```bash

npm run publish:sample

```

A Service Account fornecida ao grupo possui permissão de subscriber. Portanto, esse comando somente funcionará se for utilizada uma credencial que também possua permissão de publisher no tópico.

Quando uma mensagem for publicada por uma credencial autorizada, o consumer deverá recebê-la e persistir o pedido:

```text

[consumer] pedido ORD-2026-0001 persistido. messageId=123456789

```

Depois disso, o pedido poderá ser consultado pela API.

---

# API REST

Base URL local:

```text

http://localhost:3000

```

## Health check

### `GET /health`

Verifica se a API está em execução.

Exemplo:

```bash

curl http://localhost:3000/health

```

Resposta:

```json

{

  "status": "ok"

}

```

---

# Pedidos

## Listar pedidos

### `GET /orders`

Retorna os pedidos cadastrados.

Exemplo:

```bash

curl "http://localhost:3000/orders"

```

Estrutura da resposta:

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

      "customer": {

        "id": 7788,

        "name": "Maria Oliveira",

        "email": "maria@email.com",

        "document": "987.654.321-00"

      },

      "seller": {

        "id": 55,

        "name": "Tech Store",

        "city": "Sao Paulo",

        "state": "SP"

      },

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

      ],

      "shipment": {

        "carrier": "Correios",

        "service": "SEDEX",

        "status": "shipped",

        "tracking_code": "BR123456789"

      },

      "payment": {

        "method": "pix",

        "status": "approved",

        "transaction_id": "pay_987654321"

      },

      "metadata": {

        "source": "app",

        "user_agent": "Mozilla/5.0...",

        "ip_address": "10.0.0.1"

      }

    }

  ]

}

```

---

## Paginação

Parâmetros:

| Parâmetro | Descrição | Padrão |

|---|---|---|

| `page` | Página desejada | `1` |

| `limit` | Quantidade de registros por página | `20` |

O limite máximo aceito pela aplicação é `100`.

Exemplo:

```text

GET /orders?page=1&limit=10

```

```bash

curl "http://localhost:3000/orders?page=1&limit=10"

```

---

## Ordenação por data

Os pedidos são ordenados pelo campo `created_at`.

Parâmetro:

```text

sort=asc

```

ou:

```text

sort=desc

```

A ordenação padrão é decrescente (`desc`).

Exemplos:

```text

GET /orders?sort=asc

```

```text

GET /orders?sort=desc

```

A aplicação também aceita `order` como alternativa ao parâmetro `sort`.

---

# Filtros de `/orders`

Os filtros podem ser utilizados individualmente ou combinados.

## Filtrar por cliente

```text

GET /orders?customer.id=7788

```

## Filtrar por produto

```text

GET /orders?product.id=abc-1344

```

## Filtrar por status

```text

GET /orders?status=shipped

```

Os status previstos pelo contrato da atividade são:

```text

created

paid

shipped

delivered

canceled

```

## Filtrar por seller

```text

GET /orders?seller.id=55

```

## Combinar filtros

Exemplo:

```text

GET /orders?seller.id=55&status=shipped&page=1&limit=10&sort=desc

```

---

# Consultar um pedido por UUID

### `GET /orders/{uuid}`

Exemplo:

```bash

curl "http://localhost:3000/orders/ORD-2026-0001"

```

Caso o pedido não exista:

```json

{

  "error": "Pedido nao encontrado."

}

```

com status HTTP `404`.

---

# Consultar itens de um pedido

### `GET /orders/{uuid}/items`

Retorna somente a estrutura de itens do pedido.

Exemplo:

```bash

curl "http://localhost:3000/orders/ORD-2026-0001/items"

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

---

# Resumo financeiro

### `GET /orders/financial-summary`

Retorna informações financeiras calculadas dinamicamente a partir dos pedidos filtrados.

Exemplo:

```bash

curl "http://localhost:3000/orders/financial-summary"

```

Estrutura da resposta:

```json

{

  "total_orders": 1,

  "total_revenue": 5000,

  "average_order_value": 5000,

  "by_status": {

    "shipped": 1

  },

  "by_payment_method": {

    "pix": {

      "count": 1,

      "total": 5000

    }

  }

}

```

## Filtrar resumo por seller

```text

GET /orders/financial-summary?seller.id=55

```

## Filtrar por data inicial

O filtro utiliza o campo `created_at` do pedido.

```text

GET /orders/financial-summary?start_date=2026-09-01

```

## Filtrar por data final

```text

GET /orders/financial-summary?end_date=2026-09-30

```

## Filtrar por intervalo de datas

```text

GET /orders/financial-summary?start_date=2026-09-01&end_date=2026-09-30T23:59:59Z

```

## Combinar intervalo e seller

```text

GET /orders/financial-summary?seller.id=55&start_date=2026-09-01&end_date=2026-09-30

```

---

# Exemplo de payload de pedido

O publisher envia pedidos no seguinte formato:

```json

{

  "uuid": "ORD-2026-0001",

  "created_at": "2026-09-13T18:00:00Z",

  "channel": "mobile_app",

  "status": "shipped",

  "customer": {

    "id": 7788,

    "name": "Maria Oliveira",

    "email": "maria@email.com",

    "document": "987.654.321-00"

  },

  "seller": {

    "id": 55,

    "name": "Tech Store",

    "city": "Sao Paulo",

    "state": "SP"

  },

  "items": [

    {

      "id": 1,

      "product": {

        "id": "abc-1344",

        "title": "Televisao bonita"

      },

      "unit_price": 2500.00,

      "quantity": 2,

      "category": {

        "id": "ELEC",

        "name": "Eletronicos",

        "sub_category": {

          "id": "TV",

          "name": "Televisores"

        }

      }

    }

  ],

  "shipment": {

    "carrier": "Correios",

    "service": "SEDEX",

    "status": "shipped",

    "tracking_code": "BR123456789"

  },

  "payment": {

    "method": "pix",

    "status": "approved",

    "transaction_id": "pay_987654321"

  },

  "metadata": {

    "source": "app",

    "user_agent": "Mozilla/5.0...",

    "ip_address": "10.0.0.1"

  }

}

```

O campo `total` não precisa ser enviado no payload, pois é calculado pela API.

---

# Persistência e processamento das mensagens

Ao receber uma mensagem, o consumer:

```text

1. recebe a mensagem do Pub/Sub

2. converte o conteúdo para JSON

3. valida os campos obrigatórios e o status do pedido

4. inicia uma transação no PostgreSQL

5. insere ou atualiza cliente

6. insere ou atualiza seller

7. insere ou atualiza produtos

8. insere ou atualiza o pedido

9. registra indexed_at na primeira persistência do pedido

10. recria os itens do pedido

11. executa COMMIT

12. envia ACK para o Pub/Sub

```

Se ocorrer uma falha durante a persistência:

```text

ROLLBACK

|

v

NACK da mensagem

|

v

possível reentrega pelo Pub/Sub

```

A persistência utiliza o UUID do pedido para permitir o reprocessamento da mesma mensagem sem criar um novo pedido duplicado.

Em caso de reentrega do mesmo UUID, o valor original de `indexed_at` é preservado.

Os status permitidos são `created`, `paid`, `shipped`, `delivered` e `canceled`, validados pela aplicação e também por uma constraint `CHECK` no PostgreSQL.

---

# Scripts disponíveis

| Comando | Descrição |

|---|---|

| `npm start` | Inicia a API REST |

| `npm run dev` | Inicia a API com `node --watch` |

| `npm run consumer` | Inicia o consumidor do Pub/Sub |

| `npm run db:init` | Cria/atualiza o schema do PostgreSQL |

| `npm run publish:sample` | Publica o pedido de exemplo no Pub/Sub |

---

# Roteiro rápido para demonstração

Para demonstrar o projeto funcionando:

### 1. Confirmar que o PostgreSQL está em execução

O projeto foi testado com PostgreSQL local no Windows e banco `marketplace`.

### 2. Inicializar o banco

```bash

npm run db:init

```

### 3. Iniciar a API

```bash

npm start

```

### 4. Em outro terminal, iniciar o consumer

```bash

npm run consumer

```

### 5. Se houver credencial com permissão de publisher, publicar o pedido de exemplo

```bash

npm run publish:sample

```

Com a credencial subscriber fornecida ao grupo, o consumer pode aguardar e processar mensagens publicadas na subscription `grupo-h`.

### 6. Consultar os pedidos

```bash

curl "http://localhost:3000/orders"

```

### 7. Consultar o pedido específico

```bash

curl "http://localhost:3000/orders/ORD-2026-0001"

```

### 8. Consultar os itens

```bash

curl "http://localhost:3000/orders/ORD-2026-0001/items"

```

### 9. Demonstrar os filtros

```bash

curl "http://localhost:3000/orders?customer.id=7788"

```

```bash

curl "http://localhost:3000/orders?product.id=abc-1344"

```

```bash

curl "http://localhost:3000/orders?status=shipped"

```

```bash

curl "http://localhost:3000/orders?seller.id=55"

```

### 10. Demonstrar o resumo financeiro

```bash

curl "http://localhost:3000/orders/financial-summary"

```

```bash

curl "http://localhost:3000/orders/financial-summary?seller.id=55&start_date=2026-09-01&end_date=2026-09-30"

```

---

# Principais requisitos atendidos

- Consumidor de mensagens de pedidos.

- Persistência em banco relacional.

- Tabelas mínimas de pedido, cliente, produto e item do pedido.

- Registro da hora de indexação da mensagem.

- API REST para consulta.

- Paginação.

- Ordenação por data.

- Filtros por cliente, produto, status e seller.

- Consulta por UUID.

- Endpoint exclusivo para itens.

- Cálculo dinâmico dos valores.

- Endpoint de resumo financeiro.

- Filtros financeiros por seller e intervalo de datas.

- DER do banco de dados.