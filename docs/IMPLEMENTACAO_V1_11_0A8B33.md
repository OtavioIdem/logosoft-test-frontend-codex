# Implementação v1.11.0a8b33 — Seeds controladas para E2E integrado

## Status

Versão funcional gerada para revisão.

## Objetivo

Preparar o frontend para executar o E2E integrado controlado somente com dados previsíveis, rastreáveis e descartáveis.

A versão não cria seeds no backend e não executa fluxo mutável por padrão. Ela cria documentação, template e gate estrutural para impedir execução real sem confirmação explícita de ambiente descartável.

## Arquivos criados

```text
scripts/validate-controlled-seeds.mjs
tests/unit/controlledSeeds.test.ts
tests/seeds/integrated-e2e.controlled-seed.example.json
docs/CONTROLLED_SEEDS_INTEGRATED_E2E.md
docs/IMPLEMENTACAO_V1_11_0A8B33.md
docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B33.md
```

## Arquivos atualizados

```text
package.json
config/app.ts
.env.example
.env.test
.env.backend-controlled.example
.github/workflows/frontend-ci.yml
scripts/validate-source.mjs
scripts/validate-ci-gates.mjs
scripts/validate-integrated-e2e.mjs
tests/e2e/integrated-backend.spec.ts
tests/unit/integratedBackendE2e.test.ts
skills/desenvolvimento/07_testes_gates_qualidade.md
skills/review/02_validacoes_obrigatorias.md
README.md
CHANGELOG.md
```

## Mudanças principais

- Criado gate `validate:controlled-seeds`.
- Integrado `validate:controlled-seeds` ao `validate:source`.
- Integrado `validate:controlled-seeds` ao `ci:gates`.
- Integrado `validate:controlled-seeds` ao GitHub Actions.
- Reforçado `validate-ci-gates` para exigir o novo gate.
- Reforçado `validate-integrated-e2e` para exigir seed run id e acknowledgement descartável.
- Criado template versionado de seed controlada sem segredos reais.
- O E2E integrado agora exige:
  - `LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID`;
  - `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true`.

## Segurança operacional

O fluxo integrado mutável continua fora do CI padrão.

O `ci:gates` valida somente a estrutura:

```bash
npm run validate:controlled-seeds
npm run validate:integrated-e2e
```

Ele não executa:

```bash
npm run test:e2e:integrated:backend
```

## O que não foi alterado

- Nenhuma tela produtiva.
- Nenhum client real de API.
- Nenhum mock/store.
- Nenhum contrato fiscal de payload.
- Nenhum fluxo de autenticação real.
- Nenhuma regra fiscal.
- Nenhuma permissão.
- Nenhuma seed real no backend.
- Nenhuma execução mutável automática em CI.

## Validações executadas

```bash
node scripts/validate-controlled-seeds.mjs
node scripts/validate-integrated-e2e.mjs
node scripts/validate-ci-gates.mjs
node scripts/validate-backend-controlled.mjs
node scripts/validate-operational-contracts.mjs
node scripts/validate-skills.mjs
node scripts/validate-mocks-isolation.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-source.mjs

npm run validate:controlled-seeds
npm run validate:integrated-e2e
npm run validate:source
npm run validate:ci
npm run validate:backend-controlled
npm run validate:operational-contracts
npm run validate:skills
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:fiscal:production
```

## Validações pendentes no repositório principal

Executar com Node 24/npm 11:

```bash
npm install
npm run validate:source
npm run validate:controlled-seeds
npm run validate:integrated-e2e
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
npm run ci:gates
git diff --check
git diff --cached --check
```

Com backend descartável preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
npx playwright install chromium
npm run test:e2e:integrated:backend
```

## Critério de aprovação

A versão só deve ser aprovada se:

- `validate:controlled-seeds` passar;
- `validate:source` continuar executando o novo gate;
- `ci:gates` não executar o E2E integrado mutável;
- o E2E integrado ficar skipped sem `LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true`;
- não houver token/JWT/segredo versionado;
- não houver alteração indevida em tela, client, mock, fiscal, autenticação ou permissão.
