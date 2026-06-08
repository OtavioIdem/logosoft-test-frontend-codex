# Implementação v1.11.0a8b31.c1 — Correção de isolamento entre contrato fiscal e operacional

## Status

Correção da `v1.11.0a8b31`, bloqueada por ambiguidade entre a suíte fiscal e a suíte operacional.

## Motivo do bloqueio

A B31 adicionou contratos operacionais read-only, mas `playwright.contract.config.ts` usava `testMatch: /.*\.contract\.spec\.ts/`. Com isso, `npm run test:contract:fiscal` também descobria `tests/contract/operational-backend.contract.spec.ts`.

Além disso, o contrato operacional aceitava fallback para variáveis fiscais `LOGOSOFT_CONTRACT_*`, o que contrariava a documentação da B31: a suíte operacional deveria ser opt-in somente por `LOGOSOFT_OPERATIONAL_CONTRACT_*`.

## Escopo da correção

A C1 corrige apenas a separação das suítes de contrato e os gates/documentação relacionados.

## Arquivos alterados

```text
playwright.contract.config.ts
tests/contract/operational-backend.contract.spec.ts
scripts/validate-operational-contracts.mjs
tests/unit/operationalBackendContract.test.ts
docs/BACKEND_OPERATIONAL_CONTRACTS.md
docs/IMPLEMENTACAO_V1_11_0A8B31_C1.md
package.json
config/app.ts
.github/workflows/frontend-ci.yml
.env.backend-controlled.example
README.md
CHANGELOG.md
```

## Correções aplicadas

### 1. Contrato fiscal isolado

`playwright.contract.config.ts` passou a executar somente:

```text
tests/contract/fiscal-backend.contract.spec.ts
```

Assim, `npm run test:contract:fiscal` não descobre mais o contrato operacional.

### 2. Contrato operacional com opt-in próprio

`tests/contract/operational-backend.contract.spec.ts` deixou de aceitar fallback para:

```text
LOGOSOFT_CONTRACT_API_URL
LOGOSOFT_CONTRACT_ACCESS_TOKEN
LOGOSOFT_CONTRACT_EMPRESA_ID
LOGOSOFT_CONTRACT_FILIAL_ID
```

Agora ele exige exclusivamente:

```text
LOGOSOFT_OPERATIONAL_CONTRACT_API_URL
LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN
LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID
LOGOSOFT_OPERATIONAL_CONTRACT_FILIAL_ID
```

`FILIAL_ID` continua opcional; URL, token e empresa seguem obrigatórios para executar a suíte.

### 3. Gate reforçado

`validate-operational-contracts` passa a bloquear:

- contrato operacional usando `LOGOSOFT_CONTRACT_*`;
- config fiscal usando `.*\.contract\.spec\.ts`;
- config fiscal capturando `operational-backend.contract.spec.ts`;
- config operacional capturando todos os specs de contrato.

### 4. Teste unitário de regressão

`tests/unit/operationalBackendContract.test.ts` foi reforçado para validar a separação entre configs fiscal e operacional.

## O que não foi alterado

```text
Nenhuma tela produtiva.
Nenhum client real de API.
Nenhum mock/store.
Nenhum payload fiscal.
Nenhum fluxo de autenticação.
Nenhuma regra fiscal.
Nenhuma permissão.
Nenhum endpoint mutável.
```

## Validações executadas

```bash
node scripts/validate-operational-contracts.mjs
node scripts/validate-ci-gates.mjs
node scripts/validate-backend-controlled.mjs
node scripts/validate-skills.mjs
node scripts/validate-mocks-isolation.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-source.mjs
npm run validate:operational-contracts
npm run validate:source
npm run validate:ci
npm run validate:backend-controlled
npm run validate:skills
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:fiscal:production
```

## Validações recomendadas no repositório principal

```bash
npm install
npm run validate:source
npm run validate:operational-contracts
npm run validate:backend-controlled
npm run validate:mocks-isolation
npm run validate:skills
npm run validate:ci
npm run validate:guid-references
npm run validate:fiscal:production
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:contract:fiscal
npm run test:contract:operational
npm run ci:gates
git diff --check
git diff --cached --check
```

## Critério esperado

Sem variáveis reais/controladas:

```text
test:contract:fiscal deve executar somente o spec fiscal e ficar skipped.
test:contract:operational deve executar somente o spec operacional e ficar skipped.
```

Com variáveis fiscais apenas:

```text
test:contract:fiscal pode executar o contrato fiscal.
test:contract:operational deve continuar skipped se LOGOSOFT_OPERATIONAL_CONTRACT_* não estiver definido.
```

Com variáveis operacionais apenas:

```text
test:contract:operational pode executar o contrato operacional.
test:contract:fiscal deve continuar skipped se LOGOSOFT_CONTRACT_* não estiver definido.
```

## Próxima etapa após aprovação

```text
v1.11.0a8b32 — E2E integrado controlado de venda → estoque → fiscal → financeiro → auditoria
```
