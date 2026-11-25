# Data Model: Cancelamento de Pedido

## Pedido (existente, estendido)

| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `id` | `string` | Sim | Identificador existente, como `PED-1001`. |
| `cliente` | `string` | Sim | Sem alteração nesta feature. |
| `status` | `Status` | Sim | Passa a aceitar `cancelado` além de `criado`, `pago`, `enviado` e `entregue`. |
| `itens` | `Item[]` | Sim | Sem alteração. |
| `valorTotal` | `number` | Sim | Sem alteração; continua serializado como `valor_total`. |
| `criadoEm` | `string` | Sim | Data ISO 8601 em UTC, sem alteração. |
| `formaPagamento` | `FormaPagamento` | Sim | Sem alteração; continua serializado como `forma_pagamento`. |
| `canceladoEm` | `string` | Não | Data ISO 8601 em UTC, gravada no cancelamento. Só existe em pedido com status `cancelado`. |
| `motivoCancelamento` | `string` | Não | Motivo aparado, com 1 a 200 caracteres. Só existe quando informado no cancelamento. |

```ts
export type Status = 'criado' | 'pago' | 'enviado' | 'entregue' | 'cancelado';

export interface Pedido {
  id: string;
  cliente: string;
  status: Status;
  itens: Item[];
  valorTotal: number;
  criadoEm: string;
  formaPagamento: FormaPagamento;
  canceladoEm?: string;
  motivoCancelamento?: string;
}
```

## Entrada do cancelamento

```ts
export interface CancelamentoEntrada {
  motivo?: string;
}
```

Regras de validação:

- Corpo ausente é equivalente a `{}`.
- Corpo presente deve ser um objeto JSON; array, string, número ou outro tipo
  primitivo é recusado com `400`.
- `motivo` ausente, `null` ou string vazia após `trim()` significa cancelamento
  sem motivo.
- `motivo` deve ser string quando presente e não nulo; outro tipo é recusado
  com `400`.
- O texto é aparado com `trim()` antes de validar o tamanho e antes de gravar.
- Até 200 caracteres após o `trim()`: aceito. A partir de 201: `400`, e o
  pedido permanece inalterado.

## Invariantes

- Todo pedido com status `cancelado` tem `canceladoEm` preenchido.
- `canceladoEm` não existe em pedidos que não foram cancelados.
- `motivoCancelamento`, quando existe, não é vazio nem composto apenas por
  espaços e tem no máximo 200 caracteres.
- Um pedido cancelado nunca volta para outro status nesta feature.
- Os demais campos do pedido não são alterados pelo cancelamento.
- Pedidos não cancelados continuam com os campos e nomes legados já
  serializados.

## Transições de estado

| Estado atual | Evento | Próximo estado | Campos alterados | HTTP |
|--------------|--------|----------------|------------------|------|
| `criado` | Cancelamento válido | `cancelado` | `status`, `canceladoEm` e `motivoCancelamento` quando houver | `200` |
| `pago` | Cancelamento válido | `cancelado` | `status`, `canceladoEm` e `motivoCancelamento` quando houver | `200` |
| `cancelado` | Nova solicitação válida | `cancelado` | Nenhum | `200` |
| `enviado` | Cancelamento | `enviado` | Nenhum | `409` |
| `entregue` | Cancelamento | `entregue` | Nenhum | `409` |
| Não existe | Cancelamento | — | — | `404` |

A validação do motivo acontece antes da busca e da análise de estado. Assim, um
motivo com mais de 200 caracteres recebe `400` mesmo que o pedido não exista ou
já esteja cancelado/enviado.

## Representação de saída

`serializarPedido` mantém os campos atuais:

- `id`, `cliente`, `status`, `valor_total`, `criadoEm`, `forma_pagamento`,
  `itens`.

E acrescenta, apenas quando aplicável:

- `canceladoEm` para pedidos cancelados;
- `motivoCancelamento` quando o cancelamento tiver motivo.

Campos novos usam camelCase, conforme a constituição. Os campos legados são
mantidos sem renomeação para não quebrar o cliente web.
