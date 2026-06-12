# Implementação v1.11.0a8b34 — Runbook de backend descartável para E2E integrado

## Objetivo

A B34 cria o runbook operacional para executar o E2E integrado real contra backend descartável/controlado, sem ativar execução mutável no CI padrão.

## Escopo

- Documentar preparação de backend descartável.
- Documentar pré-requisitos, variáveis, execução, evidências, cleanup e rollback.
- Criar gate estrutural `validate:integrated-runbook`.
- Reforçar o E2E integrado para exigir acknowledgement de leitura do runbook.
- Atualizar skills e CI para validar a estrutura, sem executar fluxo mutável integrado automaticamente.

## Arquivos criados

```text
docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md
docs/IMPLEMENTACAO_V1_11_0A8B34.md
docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B34.md
scripts/validate-integrated-runbook.mjs
tests/unit/integratedRunbook.test.ts
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
tests/unit/controlledSeeds.test.ts
skills/desenvolvimento/07_testes_gates_qualidade.md
skills/review/02_validacoes_obrigatorias.md
skills/review/06_criterios_commit_bloqueio.md
README.md
CHANGELOG.md
```

## Proteção adicionada

O E2E integrado real agora exige também:

```bash
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true
```

Essa variável não deve aparecer como `true` em arquivos versionados. O template versionado mantém:

```bash
LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false
```

## Scripts adicionados

```bash
npm run validate:integrated-runbook
```

## Integração aos gates

O novo gate foi integrado a:

```text
validate:source
ci:gates
GitHub Actions
skills de desenvolvimento/review
```

O `ci:gates` continua proibido de executar:

```bash
npm run test:e2e:integrated:backend
```

## O que não foi alterado

```text
Nenhuma tela produtiva.
Nenhum client real de API.
Nenhum mock/store.
Nenhum payload fiscal.
Nenhum fluxo real de autenticação.
Nenhuma regra fiscal.
Nenhuma permissão.
Nenhuma seed real no backend.
Nenhuma execução mutável automática em CI.
```

## Validações executadas neste pacote

```bash
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

## Validações pendentes no repositório principal

Executar com Node 24/npm 11:

```bash
npm install
npm run validate:source
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

## Execução real futura

Somente com backend descartável/controlado preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
# preencher variáveis locais, token não versionado, seed run id e ACKs
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:integrated:backend
```

## Próxima etapa recomendada

```text
v1.11.0a8b35 — Integração com procedimento real de seed/reset fornecido pelo backend
```
