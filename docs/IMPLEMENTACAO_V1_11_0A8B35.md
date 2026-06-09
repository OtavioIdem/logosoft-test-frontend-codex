# Implementação v1.11.0a8b35 — Integração com seed/reset real do backend

## Estado da versão

```text
Versão: v1.11.0a8b35
Tipo: funcional
Base: v1.11.0a8b34 aprovada, commitada e publicada
Escopo: integração estrutural com procedimento real de seed/reset fornecido pelo backend para E2E integrado
```

## Objetivo

Preparar o frontend para chamar um endpoint real/controlado de seed/reset do backend antes de rodar o E2E integrado mutável.

A implementação não executa seed/reset por padrão, não cria endpoint no backend e não ativa o fluxo integrado no CI comum.

## Arquivos criados

```text
scripts/prepare-integrated-e2e-seed.mjs
scripts/validate-backend-seed-reset.mjs
tests/unit/backendSeedResetIntegration.test.ts
docs/BACKEND_SEED_RESET_INTEGRATION.md
docs/IMPLEMENTACAO_V1_11_0A8B35.md
docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B35.md
```

## Arquivos alterados

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
scripts/validate-integrated-runbook.mjs
tests/e2e/integrated-backend.spec.ts
tests/unit/integratedBackendE2e.test.ts
tests/unit/controlledSeeds.test.ts
tests/unit/integratedRunbook.test.ts
README.md
CHANGELOG.md
```

## Scripts adicionados

```bash
npm run validate:backend-seed-reset
npm run prepare:e2e:integrated:seed
```

## Proteções adicionadas

O script de seed/reset só executa quando:

```bash
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN=true
LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK=true
```

O E2E integrado real agora também exige:

```bash
LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true
```

## Integração com gates

O gate `validate:backend-seed-reset` foi integrado a:

```text
validate:source
ci:gates
GitHub Actions
```

O CI padrão valida a estrutura, mas não executa:

```bash
npm run prepare:e2e:integrated:seed
npm run test:e2e:integrated:backend
```

## O que não foi alterado

```text
Nenhuma tela produtiva.
Nenhum client real de API.
Nenhum mock/store.
Nenhum contrato fiscal de payload.
Nenhum fluxo de autenticação real.
Nenhuma regra fiscal.
Nenhuma permissão.
Nenhum endpoint backend criado.
Nenhuma seed real criada no banco.
Nenhuma execução mutável automática em CI.
```

## Validações executadas neste pacote

```bash
node scripts/validate-backend-seed-reset.mjs
node scripts/validate-integrated-runbook.mjs
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

npm run validate:backend-seed-reset
npm run validate:integrated-runbook
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

## Validações recomendadas no repositório principal

```bash
npm install
npm run validate:source
npm run validate:backend-seed-reset
npm run validate:integrated-runbook
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

## Execução real somente com backend descartável

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
# preencher token e IDs apenas localmente
# habilitar ACKs somente depois de conferir ambiente descartável
npm run prepare:e2e:integrated:seed
# depois do sucesso do backend:
# LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true
npm run test:e2e:integrated:backend
```

## Próxima etapa recomendada

```text
v1.11.0a8b36 — Primeira execução real controlada do seed/reset + E2E integrado em backend descartável
```
