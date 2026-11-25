# Quickstart: Cancelamento de Pedido

Guia de validação da feature. Os detalhes de contrato estão em
[`contracts/cancelamento.md`](./contracts/cancelamento.md) e as regras de dados
em [`data-model.md`](./data-model.md).

## Pré-requisitos

- Node.js 24.18 ou superior.
- Dependências instaladas:

```bash
npm install
```

- Estado inicial da base em memória (reiniciado a cada execução):

| Pedido | Status inicial |
|--------|----------------|
| `PED-1001` | `criado` |
| `PED-1002` | `pago` |
| `PED-1003` | `enviado` |
| `PED-1004` | `entregue` |
| `PED-1005` | `pago` |

## Validação automatizada

O plano prevê o script de teste abaixo no `package.json`:

```bash
npm test
```

Equivalente a:

```bash
tsx --test "tests/**/*.test.ts"
```

Resultado esperado: todos os testes de `tests/cancelamento.test.ts` passam,
cobrindo sucesso, motivo opcional, limite de 200 caracteres, idempotência,
conflitos, pedido inexistente, listagem e preservação dos campos legados.

## Validação manual

Em um terminal:

```bash
npm run dev
```

Em outro terminal, execute os cenários abaixo. Reinicie o servidor entre
cenários que dependam do estado inicial.

### 1. Cancelar pedido `criado` sem motivo

```bash
curl -i -X POST http://localhost:3000/pedidos/PED-1001/cancelamento
```

Esperado: `200 OK`, `status` igual a `cancelado`, `canceladoEm` preenchido e
ausência de `motivoCancelamento`.

### 2. Cancelar pedido `pago` com motivo

```bash
curl -i -X POST http://localhost:3000/pedidos/PED-1002/cancelamento \
  -H 'Content-Type: application/json' \
  -d '{"motivo":"Cliente desistiu da compra"}'
```

Esperado: `200 OK`, `status` igual a `cancelado`, `canceladoEm` preenchido e
`motivoCancelamento` igual ao texto enviado.

### 3. Cancelar novamente um pedido já cancelado

```bash
curl -i -X POST http://localhost:3000/pedidos/PED-1002/cancelamento \
  -H 'Content-Type: application/json' \
  -d '{"motivo":"Outro motivo"}'
```

Esperado: `200 OK` com o mesmo `canceladoEm` e o mesmo
`motivoCancelamento` da chamada anterior; nada é alterado.

### 4. Recusar pedido `enviado` e `entregue`

```bash
curl -i -X POST http://localhost:3000/pedidos/PED-1003/cancelamento
curl -i -X POST http://localhost:3000/pedidos/PED-1004/cancelamento
```

Esperado em ambos: `409 Conflict`,
`Content-Type: application/problem+json`, `title` igual a
`Cancelamento não permitido` e `detail` citando o status atual. Consultar
`GET /pedidos/PED-1003` e `GET /pedidos/PED-1004` deve mostrar que os pedidos
não mudaram.

### 5. Pedido inexistente

```bash
curl -i -X POST http://localhost:3000/pedidos/PED-9999/cancelamento
```

Esperado: `404 Not Found`, `Content-Type: application/problem+json` e
`title` igual a `Pedido não encontrado`.

### 6. Motivo com 201 caracteres

```bash
curl -i -X POST http://localhost:3000/pedidos/PED-1001/cancelamento \
  -H 'Content-Type: application/json' \
  -d "{\"motivo\":\"$(printf 'x%.0s' {1..201})\"}"
```

Esperado: `400 Bad Request`, `Content-Type: application/problem+json` e
`title` igual a `Motivo inválido`. Consultar o pedido deve mostrar que ele
continua com o status anterior.

### 7. Motivo vazio e motivo com espaços

```bash
curl -i -X POST http://localhost:3000/pedidos/PED-1001/cancelamento \
  -H 'Content-Type: application/json' \
  -d '{"motivo":"   "}'
```

Esperado: `200 OK`, sem `motivoCancelamento` na resposta.

### 8. Lista e filtro

Depois de cancelar algum pedido:

```bash
curl -s http://localhost:3000/pedidos
curl -s 'http://localhost:3000/pedidos?status=cancelado'
```

Esperado: o pedido cancelado continua na lista completa, com `status` igual a
`cancelado` e `canceladoEm`; o filtro por `cancelado` retorna esse pedido.
