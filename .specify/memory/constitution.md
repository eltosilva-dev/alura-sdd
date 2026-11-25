<!--
Sync Impact Report
==================
Version change: (template sem versão) → 1.0.0
Tipo de incremento: MAJOR — primeira ratificação; o documento deixa de ser
  um scaffold com placeholders e passa a definir princípios vinculantes.

Princípios definidos:
- I. Classes em PascalCase
- II. Campos em camelCase
- III. Problem Details para endpoints novos (RFC 9457)
- IV. Testes automatizados para toda regra de negócio nova
- V. Mudanças pequenas em um único pull request

Seções adicionadas:
- Restrições Adicionais
- Fluxo de Desenvolvimento
- Governança

Seções removidas: nenhuma.

TODOs adiados: nenhum.

Nota: este relatório é material temporário de revisão e deve ser removido
antes do commit da constituição emendada.
-->

# TechLog API Constitution

## Core Principles

### I. Classes em PascalCase

Todo nome de classe DEVE usar PascalCase: iniciar com letra maiúscula e
concatenar palavras com maiúsculas, sem underscores, hífens ou espaços.
Exemplos aceitos: `Pedido`, `FormaPagamento`, `ItemPedido`.

**Rationale**: PascalCase distingue tipos de valores e funções, mantendo a
leitura previsível em todo o código TypeScript do projeto.

### II. Campos em camelCase

Todo nome de campo DEVE usar camelCase: iniciar com letra minúscula e
concatenar palavras com maiúsculas, sem underscores ou hífens. A regra vale
para contratos de entrada e saída da API e para objetos no código.
Exemplos aceitos: `valorTotal`, `formaPagamento`, `dataCriacao`.

**Rationale**: um único padrão de nomenclatura elimina ambiguidade entre
contrato e implementação e evita divergências entre cliente e servidor.

### III. Problem Details para endpoints novos (RFC 9457)

Todo endpoint novo DEVE responder erros 4xx e 5xx no formato Problem Details
(RFC 9457), com `Content-Type: application/problem+json` e os membros
`type`, `title`, `status`, `detail` e `instance`. Membros de extensão DEVEM
usar camelCase. Endpoints legados mantêm o formato de erro atual até serem
formalmente depreciados; nenhum endpoint novo pode adotar formatos de erro
anteriores.

**Rationale**: um formato de erro padronizado permite que clientes tratem
falhas de forma uniforme e que ferramentas validem o contrato automaticamente.

### IV. Testes automatizados para toda regra de negócio nova

Toda regra de negócio nova DEVE ter teste automatizado incluído no mesmo pull
request da implementação. O teste DEVE falhar sem a regra e passar com ela,
cobrindo ao menos o caminho de sucesso e os casos de falha previstos.

**Rationale**: sem teste automatizado não há evidência de que a regra
funciona nem proteção contra regressões em uma API já em produção.

### V. Mudanças pequenas em um único pull request

Toda mudança DEVE caber em um único pull request coeso, com escopo claro e
revisável. Trabalho maior DEVE ser dividido em pull requests menores e
independentes antes da revisão.

**Rationale**: pull requests pequenos reduzem o risco de regressão, aceleram
a revisão e simplificam a reversão quando necessário.

## Restrições Adicionais

- A API DEVE usar Node.js 24 ou superior, TypeScript e Express 5 em módulos
  ESM, conforme a configuração vigente do projeto.
- Dependências de runtime novas DEVEM ser justificadas no pull request; a
  preferência é resolver a necessidade com a biblioteca padrão e as
  dependências já existentes.
- Mudanças DEVEM preservar a compatibilidade com o cliente web que consome a
  API, salvo quando a quebra for explicitamente aprovada e documentada.

## Fluxo de Desenvolvimento

- Todo pull request DEVE verificar o cumprimento dos cinco princípios antes da
  aprovação.
- Pull requests que introduzam regra de negócio sem teste automatizado DEVEM
  ser bloqueados.
- Pull requests que introduzam endpoint novo com erro fora do formato Problem
  Details DEVEM ser bloqueados.
- Divergências de nomenclatura DEVEM ser corrigidas antes do merge.

## Governança

Esta constituição substitui práticas anteriores em conflito. Emendas DEVEM ser
propostas por pull request, com a motivação, o impacto esperado e a atualização
da versão do documento. A aprovação exige revisão e concordância de ao menos
um mantenedor do projeto.

O versionamento segue SemVer:

- **MAJOR**: remoção ou redefinição incompatível de princípio ou seção.
- **MINOR**: novo princípio, nova seção ou expansão material de orientação.
- **PATCH**: esclarecimento, correção de redação ou refinamento sem mudança de
  sentido.

Toda revisão de pull request DEVE confirmar a conformidade com esta
constituição. Complexidade adicional DEVE ser justificada; violações devem ser
registradas e resolvidas antes do merge.

**Version**: 1.0.0 | **Ratified**: 2026-11-24 | **Last Amended**: 2026-11-24
