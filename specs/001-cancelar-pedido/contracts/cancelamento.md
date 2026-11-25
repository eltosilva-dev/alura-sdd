# Contrato: Cancelamento de Pedido

## Endpoint

`POST /pedidos/{id}/cancelamento`

Cancela um pedido que ainda não foi enviado. A operação é definitiva nesta
feature.

### Requisição

- Cabeçalho `Content-Type: application/json` quando houver corpo.
- Corpo opcional:

```json
{
  "motivo": "Cliente desistiu da compra"
}
```

| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `motivo` | `string` | Não | Até 200 caracteres após `trim()`. Vazio ou apenas espaços vale como ausência. |

### Resposta de sucesso — `200 OK`

`Content-Type: application/json`

```json
{
  "id": "PED-1002",
  "cliente": "Bruno Lima",
  "status": "cancelado",
  "valor_total": 97.4,
  "criadoEm": "2026-09-29T08:40:00Z",
  "forma_pagamento": {
    "tipo": "cartao",
    "bandeira": "visa",
    "parcelas": 2,
    "final_cartao": "4242"
  },
  "itens": [
    { "sku": "CX-MED", "quantidade": 1, "preco_unitario": 59.9 },
    { "sku": "FITA-50", "quantidade": 3, "preco_unitario": 12.5 }
  ],
  "canceladoEm": "2026-11-24T20:15:00.000Z",
  "motivoCancelamento": "Cliente desistiu da compra"
}
```

Sem motivo, a resposta é a mesma, exceto pela ausência de
`motivoCancelamento`. Campos legados não são renomeados.

### Semântica por status

| Status atual | Resultado |
|--------------|-----------|
| `criado` | Cancela, grava `canceladoEm` e o motivo quando houver. |
| `pago` | Cancela, grava `canceladoEm` e o motivo quando houver; não faz reembolso. |
| `cancelado` | Devolve o pedido como está, sem alterar `canceladoEm` nem `motivoCancelamento`, mesmo que outro motivo seja enviado. |
| `enviado` | `409`, pedido inalterado. O `detail` informa que o pedido já foi enviado. |
| `entregue` | `409`, pedido inalterado. O `detail` informa que o pedido já foi entregue. |
| Não existe | `404`. |

## Erros

Todos os erros deste endpoint usam Problem Details (RFC 9457), com
`Content-Type: application/problem+json` e os membros `type`, `title`, `status`,
`detail` e `instance`.

### `400 Bad Request` — motivo inválido

```json
{
  "type": "about:blank",
  "title": "Motivo inválido",
  "status": 400,
  "detail": "O motivo deve ter no máximo 200 caracteres.",
  "instance": "/pedidos/PED-1001/cancelamento"
}
```

Também é usado quando `motivo` tem tipo diferente de string.

### `404 Not Found` — pedido inexistente

```json
{
  "type": "about:blank",
  "title": "Pedido não encontrado",
  "status": 404,
  "detail": "Não existe pedido com o identificador informado.",
  "instance": "/pedidos/PED-9999/cancelamento"
}
```

### `409 Conflict` — status impede o cancelamento

```json
{
  "type": "about:blank",
  "title": "Cancelamento não permitido",
  "status": 409,
  "detail": "O pedido está com status \"enviado\" e não pode ser cancelado.",
  "instance": "/pedidos/PED-1003/cancelamento"
}
```

Para `entregue`, o `detail` correspondente é
`O pedido está com status "entregue" e não pode ser cancelado.`.

## Efeitos em outros endpoints

- `GET /pedidos/{id}` e `GET /pedidos` passam a devolver `canceladoEm` e, quando
  houver, `motivoCancelamento` nos pedidos cancelados.
- `GET /pedidos?status=cancelado` passa a retornar pedidos cancelados, usando o
  filtro por status já existente.
- Os demais campos e endpoints não mudam.
