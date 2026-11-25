# Tasks: Cancelamento de Pedido

**Input**: Design documents from `/specs/001-cancelar-pedido/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/cancelamento.md`, `quickstart.md`

**Tests**: Incluídos por exigência da constituição e do pedido da feature. O
test runner é o nativo do Node (`node:test`), executado com `tsx`.

**Organization**: Tarefas agrupadas por história de usuário para permitir
implementação e teste independentes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências pendentes)
- **[Story]**: História de usuário a que a tarefa pertence (`US1`, `US2`, `US3`)
- Todos os caminhos de arquivo são relativos à raiz do repositório

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar o comando de teste usado por todas as histórias.

- [X] T001 Adicionar o script `"test": "tsx --test \"tests/**/*.test.ts\""` em `package.json`, mantendo os scripts existentes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modelo, base, serializador, helper de erro e infraestrutura de teste
que todas as histórias usam.

**⚠️ CRITICAL**: Nenhuma história pode começar antes desta fase.

- [X] T002 [P] Ampliar `Status` com `'cancelado'`, adicionar `canceladoEm` e `motivoCancelamento` como campos opcionais e incluir `cancelar(id, motivo?)` na base em `src/pedidos/dados.ts` (ver `data-model.md`, `Pedido.status`, `Pedido.canceladoEm` e `Pedido.motivoCancelamento`).
- [X] T003 Atualizar `serializarPedido` em `src/pedidos/serializar.ts` para incluir `canceladoEm` e `motivoCancelamento` apenas quando existirem, preservando todos os campos legados (depende de T002; ver `data-model.md`, `Pedido.canceladoEm` e `Pedido.motivoCancelamento`).
- [X] T004 [P] Criar o helper `responderProblema` em `src/pedidos/rotas.ts`, com `Content-Type: application/problem+json` e os membros `type`, `title`, `status`, `detail` e `instance`.
- [X] T005 [P] Criar a infraestrutura de teste em `tests/cancelamento.test.ts`: imports de `node:test`/`node:assert/strict`, helper que sobe `criarApp()` em `listen(0)` e helper que fecha o servidor ao final de cada teste.

**Checkpoint**: Fundação pronta. As histórias podem começar.

---

## Phase 3: User Story 1 - Cancelar um pedido ainda não enviado (Priority: P1) 🎯 MVP

**Goal**: Cancelar pedidos com status `criado` ou `pago`, com motivo opcional,
registrando `canceladoEm` e `motivoCancelamento`; pedido já cancelado é
devolvido sem alteração.

**Independent Test**: Subir o app e chamar `POST /pedidos/PED-1001/cancelamento`
sem motivo e `POST /pedidos/PED-1002/cancelamento` com motivo; conferir `200`,
status `cancelado`, data e motivo. Repetir a chamada em `PED-1002` e confirmar
que data e motivo não mudam.

### Tests for User Story 1

> **NOTE: Escrever os testes primeiro e confirmar que falham antes da implementação.**

- [X] T006 [US1] Adicionar em `tests/cancelamento.test.ts` os testes de sucesso e validação: cancelamento sem motivo, com motivo, motivo de 200 caracteres, motivo vazio/só espaços, pedido `pago`, preservação dos campos legados e idempotência em pedido já cancelado; incluir motivo de 201 caracteres e motivo com tipo inválido recusados com `400` em Problem Details, sem alterar o pedido. Cobrir o contrato de `contracts/cancelamento.md` para `200` e `400`.

### Implementation for User Story 1

- [X] T007 [US1] Implementar a leitura, o `trim()` e a validação do motivo opcional em `src/pedidos/rotas.ts`, retornando `400` em Problem Details para tipo inválido ou mais de 200 caracteres (ver `data-model.md`, `CancelamentoEntrada.motivo`).
- [X] T008 [US1] Implementar `POST /pedidos/:id/cancelamento` em `src/pedidos/rotas.ts`: buscar o pedido, responder `404` em Problem Details quando ausente, devolver pedido já cancelado sem alteração e cancelar pedidos `criado`/`pago` via `base.cancelar`, respondendo `200` com o pedido serializado (ver `data-model.md`, `Pedido.status`).

**Checkpoint**: US1 funcional e testável de forma independente; é o MVP.

---

## Phase 4: User Story 2 - Impedir o cancelamento de pedido enviado ou entregue (Priority: P2)

**Goal**: Recusar pedidos `enviado`/`entregue` com `409` e explicar o status que
impede o cancelamento; informar `404` para pedido inexistente.

**Independent Test**: Chamar o cancelamento para `PED-1003` (`enviado`),
`PED-1004` (`entregue`) e `PED-9999` (inexistente); conferir `409`/`404` em
Problem Details e que os pedidos existentes permanecem inalterados.

### Tests for User Story 2

> **NOTE: Escrever os testes primeiro e confirmar que falham antes da implementação.**

- [X] T009 [US2] Adicionar em `tests/cancelamento.test.ts` os testes de recusa: `409` para `enviado` e `entregue`, `404` para inexistente, `Content-Type` e membros de Problem Details, `detail` citando o status e estado do pedido inalterado. Cobrir `contracts/cancelamento.md` para `404` e `409`.

### Implementation for User Story 2

- [X] T010 [US2] Adicionar em `src/pedidos/rotas.ts` a recusa de pedidos `enviado`/`entregue` com `409` e `detail` específico, antes do ramo de pedido já cancelado, sem alterar o pedido (ver `data-model.md`, `Pedido.status`).

**Checkpoint**: US1 e US2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Manter pedidos cancelados visíveis na lista (Priority: P3)

**Goal**: Garantir que pedidos cancelados continuem em `GET /pedidos` com status
`cancelado` e data, e sejam retornados pelo filtro `?status=cancelado`.

**Independent Test**: Cancelar um pedido, consultar `GET /pedidos` e
`GET /pedidos?status=cancelado`; conferir presença, status e `canceladoEm`.

### Tests for User Story 3

> **NOTE: Escrever os testes primeiro e confirmar que falham antes da implementação.**

- [X] T011 [US3] Adicionar em `tests/cancelamento.test.ts` os testes de listagem: pedido cancelado presente na lista completa, retorno pelo filtro `?status=cancelado` e campos `canceladoEm`/`motivoCancelamento` corretos.

### Implementation for User Story 3

- [X] T012 [US3] Validar e, se necessário, ajustar a listagem em `src/pedidos/rotas.ts` e `src/pedidos/serializar.ts` para que `GET /pedidos` e o filtro `?status=cancelado` usem o serializador atualizado; nenhuma mudança de produção é esperada além do que já foi feito na US1.

**Checkpoint**: Todas as histórias funcionam de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentação e validação final.

- [X] T013 [P] Atualizar `docs/api-pedidos.md` com o endpoint `POST /pedidos/{id}/cancelamento`, os campos `canceladoEm`/`motivoCancelamento` e a indicação de Problem Details para os erros do endpoint novo.
- [X] T014 Executar `npm test` e `npx tsc --noEmit`; corrigir falhas em `src/pedidos/*.ts`, `tests/cancelamento.test.ts` e `package.json`.
- [X] T015 Executar os cenários de `specs/001-cancelar-pedido/quickstart.md` contra `npm run dev` e confirmar os resultados esperados.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências; começa imediatamente.
- **Foundational (Phase 2)**: depende da Setup e bloqueia todas as histórias.
- **User Stories (Phase 3+)**: dependem da Foundational.
- **Polish (Phase 6)**: depende das histórias desejadas e dos testes.

### User Story Dependencies

- **US1 (P1)**: começa após a Foundational; não depende de outras histórias.
- **US2 (P2)**: começa após a Foundational; conceitualmente independente, mas nesta base compartilha `src/pedidos/rotas.ts` e `tests/cancelamento.test.ts` com a US1, então a ordem recomendada é US1 → US2.
- **US3 (P3)**: começa após a US1 para poder cancelar um pedido no teste; não altera produção.

### Within Each User Story

- Testes primeiro; confirmar que falham antes da implementação.
- Modelo/base antes da rota.
- Rota antes do teste de integração passar.
- Cada história deve fechar seu checkpoint antes da próxima.

### Parallel Opportunities

- T002, T004 e T005 atuam em arquivos diferentes e podem rodar em paralelo.
- T003 depende de T002 e deve rodar depois dele.
- T013 (documentação) pode rodar em paralelo com T014 (testes/typecheck).
- Paralelismo entre histórias é limitado porque US1/US2 compartilham `rotas.ts` e `tests/cancelamento.test.ts`; US3 compartilha o arquivo de testes.

---

## Parallel Example: Foundational

```bash
# Arquivos diferentes, sem dependência entre si:
Task: "T002 Ampliar modelo e base em src/pedidos/dados.ts"
Task: "T004 Criar helper de Problem Details em src/pedidos/rotas.ts"
Task: "T005 Criar infraestrutura de teste em tests/cancelamento.test.ts"

# Depois de T002:
Task: "T003 Atualizar serialização em src/pedidos/serializar.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar T001 (Setup).
2. Completar T002–T005 (Foundational).
3. Completar T006–T008 (US1).
4. **PARAR e VALIDAR**: rodar os testes da US1 e exercitar o cancelamento de
   `PED-1001`/`PED-1002`.
5. Demonstrar o MVP.

### Incremental Delivery

1. Setup + Foundational → fundação pronta.
2. US1 → cancelamento básico e idempotente (MVP).
3. US2 → recusas de status e pedido inexistente.
4. US3 → confirmação da listagem e do filtro.
5. Polish → documentação, suíte completa e typecheck.

---

## Notes

- [P] tasks = arquivos diferentes, sem dependência pendente.
- [Story] labels mapeiam as tarefas para `spec.md`.
- Cada história tem critério de teste independente.
- Testes devem falhar antes da implementação correspondente.
- A base é em memória; reiniciar o processo restaura a semente.
- Não renomear campos legados (`valor_total`, `forma_pagamento`,
  `preco_unitario`, `final_cartao`, `linha_digitavel`) nem alterar endpoints
  existentes.

---

## Phase 7: Convergence

- [X] T016 CRITICAL: Adicionar um middleware de erro escopado a `POST /pedidos/:id/cancelamento` em `src/app.ts`, reaproveitando o helper de Problem Details de `src/pedidos/rotas.ts`, para converter erros do `express.json()` e erros inesperados em Problem Details com `application/problem+json` (JSON malformado → `400`, corpo acima do limite → `413`, erro inesperado → `500`), preservando o tratamento legado dos demais endpoints; adicionar testes de integração para JSON malformado e corpo acima do limite em `tests/cancelamento.test.ts` per Constitution III / FR-015 (contradicts).
