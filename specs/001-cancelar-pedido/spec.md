# Feature Specification: Cancelamento de Pedido

**Feature Branch**: `001-cancelar-pedido`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "Permitir que um pedido seja cancelado antes de ser enviado. Quem opera a loja informa o pedido e, se quiser, um motivo. Pedidos já enviados ou entregues não podem ser cancelados, e quem tentou precisa entender por quê. Um pedido cancelado continua aparecendo na lista, com o status cancelado e a data do cancelamento."

## Clarifications

### Session 2026-11-24

- Q: O que acontece ao cancelar um pedido já cancelado? → A: Não é erro; devolve o pedido como está, sem mudar a data nem o motivo, mesmo que outro motivo seja informado.
- Q: Qual é o limite e o tratamento do motivo? → A: Opcional, até 200 caracteres; acima disso, recusa com erro de validação; motivo vazio vale como sem motivo.
- Q: Pedido pago pode ser cancelado? → A: Sim; o sistema só registra o cancelamento, e o reembolso fica fora desta feature.
- Q: Pedido enviado ou entregue pode ser cancelado? → A: Não; a resposta explica o motivo.
- Q: A tela do cliente web entra no escopo? → A: Não; a tela fica como está.
- Q: É possível desfazer um cancelamento? → A: Não; o cancelamento é definitivo nesta feature.
- Q: Quem pode cancelar e há autenticação? → A: Fora do escopo; a API ainda não tem autenticação.
- Q: Reembolso, estoque e notificação entram no escopo? → A: Não; ficam fora desta feature.
- Q: O que responder para um pedido inexistente? → A: Que o pedido não foi encontrado.
- Q: Quais são os nomes dos campos novos? → A: `canceladoEm` para a data e `motivoCancelamento` para o motivo.
- Q: Qual é o corpo da requisição? → A: Um objeto com o campo `motivo`, opcional.
- Q: Qual é o escopo para o que não foi especificado? → A: Só a API; escolher a opção de menor impacto e registrar como suposição.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cancelar um pedido ainda não enviado (Priority: P1)

Quem opera a loja informa um pedido que ainda não foi enviado e, opcionalmente,
um motivo. O pedido passa a constar como cancelado, com a data do cancelamento
e, quando informado, o motivo registrado.

**Why this priority**: É o núcleo da feature. Sem ela não há cancelamento; as
demais histórias protegem ou exibem esse comportamento.

**Independent Test**: É possível informar um pedido com status "criado" ou
"pago", opcionalmente com motivo, e verificar que a resposta e as consultas
posteriores mostram o pedido cancelado com data e motivo.

**Acceptance Scenarios**:

1. **Given** um pedido com status "criado", **When** o cancelamento é solicitado
   sem motivo, **Then** o pedido passa a "cancelado", recebe a data do
   cancelamento e não recebe motivo.
2. **Given** um pedido com status "criado", **When** o cancelamento é solicitado
   com um motivo de até 200 caracteres, **Then** o pedido passa a "cancelado"
   com a data e o motivo registrados.
3. **Given** um pedido com status "pago", **When** o cancelamento é solicitado,
   **Then** o pedido é cancelado normalmente, sem qualquer ação de reembolso.
4. **Given** um pedido cancelado, **When** seus dados são consultados, **Then**
   a resposta contém status "cancelado", a data do cancelamento e o motivo
   quando houver.

---

### User Story 2 - Impedir o cancelamento de pedido enviado ou entregue (Priority: P2)

Quem opera a loja tenta cancelar um pedido que já foi enviado ou entregue e
recebe uma recusa que explica por que o cancelamento não é possível.

**Why this priority**: Evita que a operação cancele pedidos que já saíram da
loja, sem alterar o fluxo principal de cancelamento.

**Independent Test**: É possível tentar cancelar pedidos com status "enviado"
e "entregue" e verificar que ambos permanecem inalterados e que a resposta
identifica o status que impede o cancelamento.

**Acceptance Scenarios**:

1. **Given** um pedido com status "enviado", **When** o cancelamento é
   solicitado, **Then** a operação é recusada com uma explicação de que o
   pedido já foi enviado e o pedido permanece inalterado.
2. **Given** um pedido com status "entregue", **When** o cancelamento é
   solicitado, **Then** a operação é recusada com uma explicação de que o
   pedido já foi entregue e o pedido permanece inalterado.
3. **Given** um pedido inexistente, **When** o cancelamento é solicitado,
   **Then** a resposta informa que o pedido não foi encontrado.

---

### User Story 3 - Manter pedidos cancelados visíveis na lista (Priority: P3)

Quem opera a loja consulta a lista de pedidos e continua vendo os pedidos
cancelados, identificados pelo status "cancelado" e pela data do cancelamento.

**Why this priority**: Garante que o cancelamento não remova histórico nem
esconda pedidos da operação.

**Independent Test**: É possível cancelar um pedido e, em seguida, consultar a
lista, verificando que o pedido continua presente com status e data corretos.

**Acceptance Scenarios**:

1. **Given** um pedido cancelado, **When** a lista de pedidos é consultada,
   **Then** o pedido aparece na lista com status "cancelado" e a data do
   cancelamento.
2. **Given** um pedido cancelado, **When** a lista é filtrada pelo status
   "cancelado", **Then** o pedido é retornado.

---

### Edge Cases

- Pedido já cancelado recebe nova solicitação de cancelamento: não é erro; o
  pedido é devolvido como está, sem alterar data nem motivo, mesmo que um novo
  motivo seja informado.
- Motivo com exatamente 200 caracteres: aceito.
- Motivo com 201 caracteres ou mais: recusado com erro de validação e o pedido
  permanece inalterado.
- Motivo vazio ou composto apenas por espaços: tratado como ausência de motivo.
- Corpo da requisição ausente ou sem o campo de motivo: cancelamento sem motivo.
- Pedido com status "criado" ou "pago": pode ser cancelado.
- Pedido com status "enviado" ou "entregue": não pode ser cancelado.
- Pedido inexistente: resposta informa que o pedido não foi encontrado.
- Cancelamento é definitivo: não existe operação de desfazer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir cancelar um pedido identificado pelo seu
  identificador, desde que ainda não tenha sido enviado.
- **FR-002**: O sistema DEVE aceitar um motivo opcional no cancelamento, com no
  máximo 200 caracteres.
- **FR-003**: O sistema DEVE tratar motivo vazio ou composto apenas por espaços
  como ausência de motivo.
- **FR-004**: O sistema DEVE recusar, com erro de validação, motivo com mais de
  200 caracteres, sem alterar o pedido.
- **FR-005**: O sistema DEVE permitir o cancelamento de pedidos com status
  "criado" e "pago".
- **FR-006**: O sistema NÃO DEVE permitir o cancelamento de pedidos com status
  "enviado" ou "entregue".
- **FR-007**: Ao recusar o cancelamento de pedido enviado ou entregue, a
  resposta DEVE explicar que o status atual impede o cancelamento.
- **FR-008**: O sistema DEVE responder que o pedido não foi encontrado quando o
  identificador informado não existir.
- **FR-009**: Ao cancelar, o sistema DEVE registrar o status "cancelado" e a
  data do cancelamento no pedido.
- **FR-010**: O sistema DEVE registrar o motivo do cancelamento apenas quando
  informado.
- **FR-011**: Uma nova solicitação de cancelamento para pedido já cancelado NÃO
  DEVE ser tratada como erro; o pedido DEVE ser devolvido como está, sem mudar
  a data nem o motivo, mesmo que outro motivo seja informado.
- **FR-012**: A resposta do cancelamento DEVE devolver o pedido atualizado com
  todos os campos que já fazem parte da representação do pedido.
- **FR-013**: Pedidos cancelados DEVEM continuar aparecendo na lista de pedidos
  com status "cancelado" e a data do cancelamento.
- **FR-014**: A data do cancelamento DEVE usar o campo `canceladoEm` e o motivo
  DEVE usar o campo `motivoCancelamento`, ambos em camelCase.
- **FR-015**: Erros desta feature DEVEM seguir o formato Problem Details
  (RFC 9457), conforme a constituição do projeto.
- **FR-016**: O cancelamento DEVE ser definitivo; não haverá operação de
  desfazer nesta feature.
- **FR-017**: Reembolso, movimentação de estoque, notificações, autenticação e
  alterações na tela do cliente web estão fora do escopo desta feature.

### Key Entities

- **Pedido**: pedido existente da loja. Passa a admitir o status "cancelado" e
  os atributos data de cancelamento (`canceladoEm`) e motivo do cancelamento
  (`motivoCancelamento`). A data só existe em pedidos cancelados; o motivo só
  existe quando informado no cancelamento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das solicitações válidas de cancelamento de pedidos com
  status "criado" ou "pago" resultam em pedido cancelado, com data registrada.
- **SC-002**: 100% das tentativas de cancelar pedidos "enviados" ou "entregues"
  são recusadas e a resposta identifica o status que impede o cancelamento.
- **SC-003**: 100% das novas solicitações de cancelamento sobre pedido já
  cancelado preservam a data e o motivo originais.
- **SC-004**: Motivos de até 200 caracteres são aceitos e motivos acima de 200
  caracteres são recusados em 100% dos casos, sem alterar o pedido.
- **SC-005**: 100% dos pedidos cancelados permanecem visíveis na lista com
  status "cancelado" e data do cancelamento.
- **SC-006**: Nenhum pedido não cancelado tem seus campos ou formato de resposta
  alterados por esta feature.

## Assumptions

- O cancelamento é exposto como um novo endpoint `POST /pedidos/{id}/cancelamento`,
  escolha de menor impacto que não altera endpoints existentes.
- Espaços nas extremidades do motivo são removidos; o motivo é armazenado sem
  esses espaços.
- Motivo com mais de 200 caracteres é recusado com erro de validação no formato
  Problem Details, usando o código de status 400 (validação de entrada), em vez
  de criar um novo código para o mesmo tipo de falha.
- Tentativa de cancelar pedido "enviado" ou "entregue" é recusada com código de
  status 409 (conflito com o estado atual), no formato Problem Details.
- Pedido inexistente responde com código de status 404, no formato Problem
  Details.
- O cancelamento bem-sucedido responde com código de status 200 e a
  representação completa do pedido.
- As datas são registradas em UTC no formato ISO 8601, coerente com as datas
  já existentes na API.
- A resposta inclui `canceladoEm` em pedidos cancelados e inclui
  `motivoCancelamento` apenas quando houver motivo; os campos legados da
  representação atual são preservados sem renomeação.
- O filtro por status já existente aceita o valor "cancelado"; nenhum filtro
  novo é criado.
- Cada solicitação de cancelamento é tratada como uma operação isolada, sem
  controle de concorrência adicional ao comportamento atual da API.
