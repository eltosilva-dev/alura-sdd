# Implementation Plan: Cancelamento de Pedido

**Branch**: `001-cancelar-pedido` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-cancelar-pedido/spec.md`

## Summary

Adicionar o cancelamento de pedidos à API TechLog como
`POST /pedidos/{id}/cancelamento`, reutilizando a estrutura existente em
`src/pedidos`: o Router Express de `rotas.ts`, a base em memória de `dados.ts` e
o serializador de `serializar.ts`. O endpoint aceita um motivo opcional, leva
pedidos com status `criado` ou `pago` para `cancelado` com `canceladoEm` e
`motivoCancelamento`, devolve o pedido já cancelado sem alterações e recusa
pedidos `enviado` ou `entregue` com Problem Details. Os testes são de integração,
usam o test runner nativo do Node (`node:test`) e rodam com `tsx`.

## Technical Context

**Language/Version**: TypeScript 5.9 em Node.js 24 (projeto exige `>=24.18`),
módulos ESM com `moduleResolution: NodeNext`.

**Primary Dependencies**: Express 5.1, `express.json()`, `tsx` e `node:test`.
Nenhuma dependência nova de runtime ou de teste.

**Storage**: Base em memória criada por `criarBase()` em
`src/pedidos/dados.ts`; os dados são reiniciados a cada processo.

**Testing**: Testes de integração com `node:test` e `node:assert/strict`,
executados por `tsx --test`, subindo o app em porta efêmera e chamando o endpoint
com o `fetch` nativo do Node.

**Target Platform**: Servidor Node.js em Linux, o mesmo ambiente atual da API.

**Project Type**: Serviço web de projeto único, com front-end estático já
existente em `cliente/`.

**Performance Goals**: Sem meta nova. A busca do pedido mantém a mesma
complexidade da rota `GET /pedidos/:id`; o custo adicional é a gravação de três
campos na base em memória.

**Constraints**: Preservar os nomes legados do contrato
(`valor_total`, `forma_pagamento`, `preco_unitario`, `final_cartao`,
`linha_digitavel`) e o comportamento dos endpoints atuais; usar camelCase apenas
nos campos novos (`canceladoEm`, `motivoCancelamento`); responder os erros do
endpoint novo em Problem Details (RFC 9457); manter a compatibilidade com o
cliente web; entregar implementação e testes no mesmo pull request.

**Scale/Scope**: O mesmo conjunto fictício de pedidos da base em memória; um
endpoint novo, um método novo na base, dois campos novos na representação e um
arquivo de testes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio / restrição | Situação | Evidência no plano |
|-----------------------|----------|--------------------|
| I. Classes em PascalCase | PASS | Nenhuma classe nova. Tipos e interfaces novos usam PascalCase (`CancelamentoEntrada`, se necessário); funções auxiliares continuam em camelCase. |
| II. Campos em camelCase | PASS | Campos novos da API: `motivo` na entrada, `canceladoEm` e `motivoCancelamento` na saída. Campos legados são preservados sem renomeação por exigência de compatibilidade. |
| III. Problem Details (RFC 9457) | PASS | Erros `400`, `404` e `409` do endpoint novo usam `application/problem+json` com `type`, `title`, `status`, `detail` e `instance`. Endpoints legados não são alterados. |
| IV. Testes automatizados | PASS | `tests/cancelamento.test.ts` cobre sucesso, motivo opcional, limite de 200 caracteres, idempotência, conflitos de status, pedido inexistente e listagem. |
| V. Mudança pequena em um PR | PASS | Um endpoint, um método de base, dois campos no serializador e um arquivo de testes. |
| Node.js 24+, TypeScript, Express 5, ESM | PASS | Mantém a configuração atual; nenhuma dependência nova. |
| Compatibilidade com o cliente web | PASS | A representação atual é preservada; os campos novos são adicionais. |

**Post-design re-check**: PASS. O desenho de `research.md`, `data-model.md` e
`contracts/cancelamento.md` não introduz violação. Não há complexidade adicional
a justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-cancelar-pedido/
├── plan.md              # Este arquivo
├── research.md          # Fase 0: decisões técnicas
├── data-model.md        # Fase 1: modelo e transições
├── quickstart.md        # Fase 1: validação manual e automatizada
├── contracts/
│   └── cancelamento.md  # Fase 1: contrato HTTP do endpoint
└── tasks.md             # Fase 2: criado por /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── app.ts                  # Inalterado
├── server.ts               # Inalterado
└── pedidos/
    ├── dados.ts            # Status "cancelado", campos opcionais e base.cancelar()
    ├── rotas.ts            # POST /pedidos/:id/cancelamento e helper de Problem Details
    └── serializar.ts       # Inclui canceladoEm e motivoCancelamento quando existirem

tests/
└── cancelamento.test.ts    # Integração HTTP com node:test

docs/
└── api-pedidos.md          # Lista de endpoints e campos atualizados

package.json                # Script "test" com tsx --test
```

**Structure Decision**: Projeto único. A implementação fica no módulo `pedidos`
já existente, sem novas camadas, controladores ou repositórios. A única pasta
nova é `tests/`, já prevista no `tsconfig.json`.

## Design Overview

1. **Modelo e base**: ampliar `Status` com `'cancelado'`, adicionar
   `canceladoEm?: string` e `motivoCancelamento?: string` a `Pedido` e incluir
   `cancelar(id, motivo?)` na base em memória. O método grava o status, a data
   UTC e o motivo; a rota continua responsável pelas regras de HTTP.
2. **Serializador**: manter todos os campos atuais e acrescentar
   `canceladoEm` apenas quando existir e `motivoCancelamento` apenas quando
   houver motivo. Pedidos não cancelados mantêm exatamente a representação
   atual.
3. **Rota**: registrar `POST /pedidos/:id/cancelamento` em `rotasPedidos`.
   A ordem das decisões é: validar o motivo, localizar o pedido, tratar conflito
   de status, tratar cancelamento repetido e, por fim, cancelar.
4. **Erros**: helper local em `rotas.ts` para responder Problem Details com
   `Content-Type: application/problem+json`.
5. **Testes**: um arquivo de integração que sobe um app novo por teste, usando
   `criarApp().listen(0)` e `fetch`, sem `supertest` nem dependências novas.

## Assumptions de Implementação

Decisões tomadas nesta etapa e não respondidas explicitamente na spec:

- O motivo é validado antes da busca e da análise de estado. Assim, motivo com
  mais de 200 caracteres ou com tipo inválido recebe `400` mesmo para pedido
  inexistente, enviado, entregue ou já cancelado.
- `motivo` ausente, `null` ou vazio após `trim()` equivale a ausência de motivo;
  qualquer outro tipo é `400`.
- O limite de 200 caracteres é medido depois do `trim()`, que é o texto que será
  armazenado.
- A base em memória ganha um método `cancelar(id, motivo?)`; a rota continua
  responsável por decidir quando chamá-lo.
- Os problemas usam `type: "about:blank"` e levam a explicação específica em
  `title`/`detail`, porque o projeto não possui um catálogo público de tipos de
  problema.

## Complexity Tracking

> Sem violações da constituição; nenhuma complexidade adicional a justificar.
