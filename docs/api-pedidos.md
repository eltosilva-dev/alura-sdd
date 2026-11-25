# API de Pedidos

Documentação escrita à mão em 2024. Atualize quando mudar a API.

## Endpoints

- `GET /pedidos` lista os pedidos. Aceita `?status=`.
- `GET /pedidos/{id}` devolve um pedido.
- `POST /pedidos` cria um pedido.
- `POST /pedidos/{id}/cancelamento` cancela um pedido ainda não enviado.
  Aceita um corpo opcional `{ "motivo": "..." }`, com até 200 caracteres.

## Status do pedido

`criado`, `pago`, `enviado`, `entregue` e `cancelado`.

## Campos do pedido

```json
{
  "id": "PED-1001",
  "cliente": "Ana Souza",
  "status": "cancelado",
  "valor_total": 79.8,
  "criadoEm": "2026-09-28T10:15:00Z",
  "forma_pagamento": { "tipo": "pix", "chave": "ana.souza@exemplo.com" },
  "itens": [{ "sku": "CX-PEQ", "quantidade": 2, "preco_unitario": 39.9 }],
  "canceladoEm": "2026-11-24T20:15:00.000Z",
  "motivoCancelamento": "Cliente desistiu da compra"
}
```

`canceladoEm` só aparece em pedidos cancelados. `motivoCancelamento` só aparece
quando o cancelamento tiver motivo. Os demais nomes de campos são mantidos por
compatibilidade com os clientes existentes.

## Erros

O endpoint de cancelamento responde erros no formato Problem Details
(RFC 9457), com `Content-Type: application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Cancelamento não permitido",
  "status": 409,
  "detail": "O pedido está com status \"enviado\" e não pode ser cancelado.",
  "instance": "/pedidos/PED-1003/cancelamento"
}
```

Códigos do cancelamento: `400` para motivo ou corpo JSON inválido, `404` para
pedido inexistente, `409` para pedido enviado ou entregue e `413` para corpo
acima do limite.

Os endpoints legados mantêm os formatos de erro anteriores.
