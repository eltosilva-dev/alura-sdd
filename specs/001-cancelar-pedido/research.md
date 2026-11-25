# Research: Cancelamento de Pedido

Fase 0 do plano. Cada decisão abaixo resolve um ponto técnico necessário para a
implementação sem deixar `NEEDS CLARIFICATION` no Technical Context.

## 1. Onde expor o endpoint

- **Decision**: Registrar `POST /pedidos/:id/cancelamento` dentro de
  `rotasPedidos`, no arquivo `src/pedidos/rotas.ts`, reaproveitando o mesmo
  `Router` e a mesma base passada para as rotas existentes.
- **Rationale**: É a menor mudança possível, mantém o padrão atual de rotas e
  evita um novo módulo/controlador para um único endpoint. O caminho não colide
  com `POST /pedidos`.
- **Alternatives considered**: Criar um router separado só para cancelamento
  (rejeitado: fragmentaria um módulo pequeno); criar um controlador/serviço
  dedicado (rejeitado: complexidade sem ganho nesta feature).

## 2. Modelo de status e persistência

- **Decision**: Ampliar `Status` com `'cancelado'`, adicionar
  `canceladoEm?: string` e `motivoCancelamento?: string` a `Pedido` e incluir um
  método `cancelar(id, motivo?)` no objeto devolvido por `criarBase()`.
- **Rationale**: A base em memória é a dona dos dados; concentrar a gravação ali
  segue o mesmo desenho de `inserir` e evita que a rota dependa do fato de
  `buscar` devolver uma referência mutável. A rota decide se o cancelamento é
  permitido; a base apenas aplica a mudança quando chamada.
- **Alternatives considered**: Mutar o objeto devolvido por `buscar` diretamente
  na rota (rejeitado: acopla a rota ao detalhe de armazenamento); criar um
  repositório novo (rejeitado: camada desnecessária para uma base em memória).

## 3. Normalização e validação do motivo

- **Decision**: Corpo da requisição é opcional. `motivo` é opcional, deve ser
  string quando presente e é aparado com `trim()`. Depois do `trim`, string
  vazia vale como ausência de motivo. O limite de 200 caracteres é aplicado
  depois do `trim`. Motivo com 200 caracteres é aceito; com 201 ou mais é
  recusado com `400`. `motivo` ausente ou `null` vale como ausência; qualquer
  outro tipo é recusado com `400`.
- **Rationale**: Coerente com o spec (motivo opcional, espaços nas extremidades
  removidos, vazio equivale a ausente). Aplicar o limite depois do `trim` mede
  o texto que será realmente armazenado.
- **Alternatives considered**: Limitar o texto antes do `trim` (rejeitado:
  recusaria motivos que, limpos, cabem no limite); converter valores não string
  para string (rejeitado: mascara erro do cliente).

## 4. Ordem das decisões da rota

- **Decision**: A rota segue esta ordem:

  1. validar o formato e o limite do motivo;
  2. buscar o pedido por `id`;
  3. tratar `enviado`/`entregue` como conflito;
  4. tratar pedido já `cancelado` como sucesso sem alteração;
  5. cancelar pedidos `criado`/`pago`.

- **Rationale**: Erros de entrada são de validação (`400`) independentemente do
  estado do recurso e do pedido existir; depois disso, a ausência do pedido
  (`404`) precede conflitos de estado (`409`). O cancelamento repetido só chega
  ao fim quando o motivo já é válido.
- **Alternatives considered**: Consultar o pedido antes de validar (rejeitado:
  faria um motivo inválido virar `404` para id inexistente e `400` para id
  existente, variando o tipo de erro pela existência do recurso); ignorar a
  validação quando o pedido já estivesse cancelado (rejeitado: contraria o
  requisito de recusar motivo acima de 200 caracteres sem alterar o pedido).

## 5. Regras de transição e respostas

- **Decision**:

  | Estado atual | Resultado | HTTP |
  |--------------|-----------|------|
  | `criado` | `cancelado`, grava `canceladoEm` e, se houver, `motivoCancelamento` | `200` |
  | `pago` | `cancelado`, sem ação de reembolso | `200` |
  | `cancelado` | Devolve o pedido como está, sem alterar data nem motivo | `200` |
  | `enviado` | Recusa; pedido permanece inalterado | `409` |
  | `entregue` | Recusa; pedido permanece inalterado | `409` |
  | Não existe | Informa que o pedido não foi encontrado | `404` |

- **Rationale**: É a leitura direta dos requisitos funcionais e das
  clarificações. O `200` no cancelamento repetido evita tratar a operação como
  erro e preserva o histórico.
- **Alternatives considered**: `204` no sucesso (rejeitado: o requisito pede o
  pedido atualizado na resposta); `409` para o cancelamento repetido (rejeitado:
  a clarificação diz que não é erro).

## 6. Formato dos erros

- **Decision**: Usar um helper local em `rotas.ts` que responde com
  `Content-Type: application/problem+json` e os membros `type`, `title`,
  `status`, `detail` e `instance`. `type` é `about:blank`; `instance` é
  `req.originalUrl`; `title` e `detail` são específicos de cada erro.
- **Rationale**: Cumpre a constituição sem inventar um catálogo público de
  tipos de problema. Os campos específicos ficam no `detail`, em português,
  como o restante da API.
- **Alternatives considered**: Criar URIs de tipo em um domínio fictício
  (rejeitado: inventaria um contrato externo sem necessidade); manter o formato
  legado `{ erro }` (rejeitado: proibido para endpoints novos).

## 7. Serialização

- **Decision**: Em `serializarPedido`, manter todos os campos atuais e incluir
  `canceladoEm` somente quando o campo existir no pedido e
  `motivoCancelamento` somente quando houver motivo. Não incluir chaves com
  `undefined`, `null` ou string vazia.
- **Rationale**: Garante que pedidos não cancelados tenham exatamente a
  representação atual (SC-006) e que os campos novos apareçam apenas quando
  fizerem sentido.
- **Alternatives considered**: Sempre incluir `motivoCancelamento: null`
  (rejeitado: mudaria a representação de todos os pedidos e contrariaria o
  requisito de incluir o motivo apenas quando informado).

## 8. Data do cancelamento

- **Decision**: Gravar `canceladoEm` com `new Date().toISOString()`, no mesmo
  padrão UTC/ISO 8601 de `criadoEm`.
- **Rationale**: Mantém consistência com as datas já existentes e não exige
  relógio injetável nesta base fictícia.
- **Alternatives considered**: Injetar um relógio na base (rejeitado: aumenta a
  superfície da mudança sem requisito de testabilidade temporal); usar timestamp
  numérico (rejeitado: divergiria do contrato atual).

## 9. Testes

- **Decision**: Criar `tests/cancelamento.test.ts` com `node:test`,
  `node:assert/strict` e `fetch`. Cada teste sobe uma instância nova de
  `criarApp()` em `listen(0)`, obtém a porta efêmera e fecha o servidor ao final.
  Adicionar ao `package.json` o script
  `"test": "tsx --test \"tests/**/*.test.ts\""`.
- **Rationale**: Usa o test runner nativo pedido, exercita o contrato HTTP real
  (incluindo `Content-Type` e códigos de status) e não adiciona `supertest` nem
  outra dependência. Uma instância por teste evita que a mutação da base em
  memória contamine os casos seguintes.
- **Alternatives considered**: `supertest` (rejeitado: dependência nova
  desnecessária); testar só funções internas (rejeitado: não validaria rota,
  serialização e Problem Details); compartilhar um único app entre testes
  (rejeitado: a base é mutável e os testes dependeriam de ordem).

## 10. Casos de teste previstos

- Cancelar pedido `criado` sem motivo: `200`, status `cancelado`, `canceladoEm`
  presente e ausência de `motivoCancelamento`.
- Cancelar pedido `pago` com motivo: `200`, motivo aparado e persistido.
- Motivo com exatamente 200 caracteres: aceito.
- Motivo com 201 caracteres: `400` em Problem Details e pedido inalterado.
- Motivo vazio ou só com espaços: cancelamento sem motivo.
- Pedido já cancelado: segunda chamada devolve `200` com data e motivo
  originais, mesmo com outro motivo no corpo.
- Pedido `enviado` e pedido `entregue`: `409` em Problem Details, com o status
  na explicação, e pedido inalterado.
- Pedido inexistente: `404` em Problem Details.
- Lista `GET /pedidos`: pedido cancelado continua presente; filtro
  `?status=cancelado` o retorna.
- Pedido não cancelado: representação legada permanece sem os campos novos.
