import { config } from '../config.js';

const sampleOrder = {
  uuid: 'ORD-2026-0001',
  created_at: '2026-09-13T18:00:00Z',
  channel: 'mobile_app',
  status: 'shipped',
  customer: {
    id: 7788,
    name: 'Maria Oliveira',
    email: 'maria@email.com',
    document: '987.654.321-00'
  },
  seller: {
    id: 55,
    name: 'Tech Store',
    city: 'Sao Paulo',
    state: 'SP'
  },
  items: [
    {
      id: 1,
      product: {
        id: 'abc-1344',
        title: 'Televisao bonita'
      },
      unit_price: 2500.0,
      quantity: 2,
      category: {
        id: 'ELEC',
        name: 'Eletronicos',
        sub_category: {
          id: 'TV',
          name: 'Televisores'
        }
      }
    }
  ],
  shipment: {
    carrier: 'Correios',
    service: 'SEDEX',
    status: 'shipped',
    tracking_code: 'BR123456789'
  },
  payment: {
    method: 'pix',
    status: 'approved',
    transaction_id: 'pay_987654321'
  },
  metadata: {
    source: 'app',
    user_agent: 'Mozilla/5.0...',
    ip_address: '10.0.0.1'
  }
};

// A resposta da API acrescenta os totais calculados na consulta.
const sampleOrderResponse = {
  ...sampleOrder,
  total: 5000.0,
  items: [{ ...sampleOrder.items[0], total: 5000.0 }]
};

const ORDER_STATUSES = ['created', 'paid', 'shipped', 'delivered', 'canceled'];

const customerSchema = {
  type: 'object',
  description: 'Cliente que realizou o pedido.',
  properties: {
    id: { type: 'integer', format: 'int64', example: 7788 },
    name: { type: 'string', example: 'Maria Oliveira' },
    email: { type: 'string', nullable: true, example: 'maria@email.com' },
    document: { type: 'string', nullable: true, example: '987.654.321-00' }
  },
  required: ['id', 'name']
};

const sellerSchema = {
  type: 'object',
  nullable: true,
  description: 'Vendedor do marketplace. É opcional no payload.',
  properties: {
    id: { type: 'integer', format: 'int64', example: 55 },
    name: { type: 'string', example: 'Tech Store' },
    city: { type: 'string', nullable: true, example: 'Sao Paulo' },
    state: { type: 'string', nullable: true, example: 'SP' }
  },
  required: ['id']
};

const categorySchema = {
  type: 'object',
  nullable: true,
  description: 'Categoria do produto, com subcategoria opcional.',
  properties: {
    id: { type: 'string', example: 'ELEC' },
    name: { type: 'string', example: 'Eletronicos' },
    sub_category: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', example: 'TV' },
        name: { type: 'string', example: 'Televisores' }
      }
    }
  }
};

const itemSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'integer',
      format: 'int64',
      description: 'Número do item dentro do pedido.',
      example: 1
    },
    product: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'abc-1344' },
        title: { type: 'string', example: 'Televisao bonita' }
      },
      required: ['id', 'title']
    },
    unit_price: { type: 'number', format: 'double', example: 2500.0 },
    quantity: { type: 'integer', minimum: 1, example: 2 },
    category: categorySchema,
    total: {
      type: 'number',
      format: 'double',
      readOnly: true,
      description:
        'Calculado na consulta (`unit_price × quantity`). Não é gravado no banco.',
      example: 5000.0
    }
  },
  required: ['id', 'product', 'unit_price', 'quantity']
};

const shipmentSchema = {
  type: 'object',
  nullable: true,
  description: 'Dados de entrega. Campos nulos são omitidos na resposta.',
  properties: {
    carrier: { type: 'string', example: 'Correios' },
    service: { type: 'string', example: 'SEDEX' },
    status: { type: 'string', example: 'shipped' },
    tracking_code: { type: 'string', example: 'BR123456789' }
  }
};

const paymentSchema = {
  type: 'object',
  nullable: true,
  description: 'Dados de pagamento. Campos nulos são omitidos na resposta.',
  properties: {
    method: {
      type: 'string',
      description: 'Meio de pagamento usado no agrupamento do resumo financeiro.',
      example: 'pix'
    },
    status: { type: 'string', example: 'approved' },
    transaction_id: { type: 'string', example: 'pay_987654321' }
  }
};

const orderSchema = {
  type: 'object',
  description: 'Pedido persistido, no mesmo formato da mensagem recebida.',
  properties: {
    uuid: {
      type: 'string',
      description: 'Identificador do pedido. É a chave usada para idempotência.',
      example: 'ORD-2026-0001'
    },
    created_at: {
      type: 'string',
      format: 'date-time',
      description: 'Momento em que o pedido foi criado na origem.',
      example: '2026-09-13T18:00:00Z'
    },
    channel: { type: 'string', nullable: true, example: 'mobile_app' },
    status: { type: 'string', enum: ORDER_STATUSES, example: 'shipped' },
    total: {
      type: 'number',
      format: 'double',
      readOnly: true,
      description:
        'Soma dos totais dos itens, calculada na consulta. Não é gravada no banco.',
      example: 5000.0
    },
    customer: customerSchema,
    seller: sellerSchema,
    items: { type: 'array', items: itemSchema },
    shipment: shipmentSchema,
    payment: paymentSchema,
    metadata: {
      type: 'object',
      additionalProperties: true,
      description: 'Campos livres enviados pela origem, guardados como JSONB.',
      example: sampleOrder.metadata
    }
  }
};

const orderMessageSchema = {
  ...orderSchema,
  description:
    'Mensagem publicada no tópico do Pub/Sub e lida pelo consumer. ' +
    'É o mesmo formato do pedido, sem os campos de total: se `total` vier na ' +
    'mensagem, ele é ignorado, porque a API recalcula o valor na consulta.',
  required: ['uuid', 'created_at', 'status', 'customer', 'items']
};

export const openapiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Mensageria de Pedidos — API',
    version: '1.0.0',
    summary: 'Consulta dos pedidos recebidos por mensageria (Google Cloud Pub/Sub).',
    description: [
      'API REST do projeto de **Computação em Nuvem 2** (DSM — FATEC).',
      '',
      'Os pedidos de um marketplace são publicados em um tópico do **Google Cloud Pub/Sub**,',
      'consumidos por uma aplicação Node.js, gravados no **PostgreSQL** e disponibilizados aqui.',
      '',
      '```text',
      'Publisher ──▶ Pub/Sub ──▶ Consumer ──▶ PostgreSQL ──▶ API REST',
      '```',
      '',
      '### Como testar',
      '',
      '1. Suba o banco e crie as tabelas: `npm run db:init`',
      '2. Inicie a API: `npm start`',
      '3. Inicie o consumer: `npm run consumer`',
      '4. Publique o pedido de exemplo: `npm run publish:sample`',
      '5. Use o botão **Test Request** em qualquer endpoint desta página.',
      '',
      '### O que é calculado na hora da consulta',
      '',
      'O total do item (`unit_price × quantity`) e o total do pedido (soma dos itens)',
      '**não são gravados** no banco: são calculados em cada consulta.',
      '',
      'A coluna `pedido.indexed_at` guarda quando a mensagem foi persistida e é preservada',
      'se a mesma mensagem for reentregue pelo Pub/Sub.'
    ].join('\n')
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Ambiente local'
    }
  ],
  tags: [
    {
      name: 'Pedidos',
      description: 'Consulta dos pedidos recebidos pela mensageria.'
    },
    {
      name: 'Financeiro',
      description: 'Números agregados dos pedidos, com filtros por seller e período.'
    },
    {
      name: 'Mensageria',
      description:
        'Formato da mensagem consumida do Pub/Sub. Não é um endpoint HTTP: ' +
        'está aqui para documentar o contrato que o publisher precisa seguir.'
    },
    {
      name: 'Status',
      description: 'Verificação de que a API está no ar.'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Status'],
        summary: 'Verifica se a API está no ar',
        operationId: 'getHealth',
        responses: {
          200: {
            description: 'API respondendo.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } }
                },
                example: { status: 'ok' }
              }
            }
          }
        }
      }
    },
    '/orders': {
      get: {
        tags: ['Pedidos'],
        summary: 'Lista os pedidos',
        description:
          'Retorna os pedidos com paginação, ordenação por data de criação e filtros ' +
          'combináveis por cliente, produto, status e seller.',
        operationId: 'listOrders',
        parameters: [
          {
            name: 'customer.id',
            in: 'query',
            description: 'Apenas os pedidos deste cliente.',
            schema: { type: 'integer', format: 'int64' },
            example: 7788
          },
          {
            name: 'product.id',
            in: 'query',
            description: 'Apenas os pedidos que contêm este produto.',
            schema: { type: 'string' },
            example: 'abc-1344'
          },
          {
            name: 'status',
            in: 'query',
            description: 'Apenas os pedidos neste status.',
            schema: { type: 'string', enum: ORDER_STATUSES },
            example: 'shipped'
          },
          {
            name: 'seller.id',
            in: 'query',
            description: 'Apenas os pedidos deste seller.',
            schema: { type: 'integer', format: 'int64' },
            example: 55
          },
          {
            name: 'page',
            in: 'query',
            description: 'Página desejada, começando em 1.',
            schema: { type: 'integer', minimum: 1, default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Quantidade de pedidos por página. O máximo é 100.',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
          },
          {
            name: 'sort',
            in: 'query',
            description:
              'Ordenação por `created_at`. Também aceita o nome `order`.',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
          }
        ],
        responses: {
          200: {
            description: 'Página de pedidos.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OrderPage' },
                example: {
                  page: 1,
                  limit: 20,
                  total: 1,
                  total_pages: 1,
                  data: [sampleOrderResponse]
                }
              }
            }
          }
        }
      }
    },
    '/orders/{uuid}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Consulta um pedido pelo UUID',
        operationId: 'getOrderByUuid',
        parameters: [
          {
            name: 'uuid',
            in: 'path',
            required: true,
            description: 'UUID do pedido.',
            schema: { type: 'string' },
            example: 'ORD-2026-0001'
          }
        ],
        responses: {
          200: {
            description: 'Pedido encontrado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Order' },
                example: sampleOrderResponse
              }
            }
          },
          404: {
            description: 'Não existe pedido com esse UUID.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Pedido nao encontrado.' }
              }
            }
          }
        }
      }
    },
    '/orders/{uuid}/items': {
      get: {
        tags: ['Pedidos'],
        summary: 'Consulta apenas os itens de um pedido',
        description: 'Retorna a estrutura de itens, com o total de cada um.',
        operationId: 'getOrderItems',
        parameters: [
          {
            name: 'uuid',
            in: 'path',
            required: true,
            description: 'UUID do pedido.',
            schema: { type: 'string' },
            example: 'ORD-2026-0001'
          }
        ],
        responses: {
          200: {
            description: 'Itens do pedido.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: itemSchema }
                  }
                },
                example: { items: sampleOrderResponse.items }
              }
            }
          },
          404: {
            description: 'Não existe pedido com esse UUID.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Pedido nao encontrado.' }
              }
            }
          }
        }
      }
    },
    '/orders/financial-summary': {
      get: {
        tags: ['Financeiro'],
        summary: 'Resumo financeiro dos pedidos',
        description:
          'Totaliza os pedidos do filtro e agrupa por status e por meio de pagamento. ' +
          'A receita considera todos os pedidos do filtro, inclusive os cancelados.',
        operationId: 'getFinancialSummary',
        parameters: [
          {
            name: 'seller.id',
            in: 'query',
            description: 'Apenas os pedidos deste seller.',
            schema: { type: 'integer', format: 'int64' },
            example: 55
          },
          {
            name: 'start_date',
            in: 'query',
            description: 'Data inicial, incluída no resultado (`AAAA-MM-DD`).',
            schema: { type: 'string', format: 'date' },
            example: '2026-09-01'
          },
          {
            name: 'end_date',
            in: 'query',
            description: 'Data final. O dia inteiro entra no resultado (`AAAA-MM-DD`).',
            schema: { type: 'string', format: 'date' },
            example: '2026-09-30'
          }
        ],
        responses: {
          200: {
            description: 'Resumo calculado.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FinancialSummary' },
                example: {
                  total_orders: 150,
                  total_revenue: 750000.0,
                  average_order_value: 5000.0,
                  by_status: {
                    created: 10,
                    paid: 120,
                    shipped: 15,
                    delivered: 5,
                    canceled: 0
                  },
                  by_payment_method: {
                    pix: { count: 80, total: 400000.0 },
                    credit_card: { count: 50, total: 250000.0 },
                    boleto: { count: 20, total: 100000.0 }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  webhooks: {
    'pedido-publicado': {
      post: {
        tags: ['Mensageria'],
        summary: 'Mensagem de pedido publicada no Pub/Sub',
        description:
          'O consumer (`npm run consumer`) lê esta mensagem da subscription, valida os ' +
          'campos obrigatórios e grava o pedido em uma transação. O `ACK` só acontece ' +
          'depois do `COMMIT`; se a gravação falhar, a mensagem recebe `NACK` e o ' +
          'Pub/Sub reentrega. Como a gravação é idempotente pelo `uuid`, reprocessar a ' +
          'mesma mensagem atualiza o pedido em vez de duplicá-lo.',
        operationId: 'orderPublishedMessage',
        requestBody: {
          description: 'Conteúdo da mensagem, em JSON.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OrderMessage' },
              example: sampleOrder
            }
          }
        },
        responses: {
          200: {
            description:
              'Não se aplica: a confirmação é o ACK enviado ao Pub/Sub, não uma resposta HTTP.'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Order: orderSchema,
      OrderItem: itemSchema,
      OrderMessage: orderMessageSchema,
      OrderPage: {
        type: 'object',
        description: 'Página de resultados da listagem.',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: {
            type: 'integer',
            description: 'Total de pedidos que atendem ao filtro.',
            example: 1
          },
          total_pages: { type: 'integer', example: 1 },
          data: { type: 'array', items: orderSchema }
        }
      },
      FinancialSummary: {
        type: 'object',
        properties: {
          total_orders: { type: 'integer', example: 150 },
          total_revenue: { type: 'number', format: 'double', example: 750000.0 },
          average_order_value: {
            type: 'number',
            format: 'double',
            example: 5000.0
          },
          by_status: {
            type: 'object',
            description: 'Quantidade de pedidos em cada status.',
            additionalProperties: { type: 'integer' }
          },
          by_payment_method: {
            type: 'object',
            description:
              'Quantidade e valor por meio de pagamento. Pedidos sem pagamento entram como `unknown`.',
            additionalProperties: {
              type: 'object',
              properties: {
                count: { type: 'integer' },
                total: { type: 'number', format: 'double' }
              }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Pedido nao encontrado.' }
        }
      }
    }
  }
};
