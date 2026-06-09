# Implementação v1.11.0a8b36 — Validação real assistida do E2E integrado

## Objetivo

A v1.11.0a8b36 adiciona uma camada de execução assistida para o E2E integrado real contra backend descartável/controlado.

A entrega não altera telas produtivas, não altera clients reais, não cria mocks, não cria endpoint no backend e não executa fluxo mutável no CI padrão.

## Escopo implementado

- Gate estrutural `validate:assisted-e2e`.
- Script `report:e2e:integrated:assisted` para gerar relatório Markdown a partir de evidências locais.
- Template de evidências assistidas.
- Nova proteção `LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=true` para execução real.
- Documentação operacional da validação assistida.
- Teste unitário de regressão para manter as proteções.
- Integração do novo gate ao `validate:source`, `ci:gates`, GitHub Actions e skills.

## Arquivos criados

```text
scripts/validate-assisted-e2e.mjs
scripts/create-integrated-e2e-assisted-report.mjs
tests/evidence/integrated-e2e.assisted-evidence.example.json
tests/unit/assistedIntegratedE2e.test.ts
docs/ASSISTED_INTEGRATED_E2E_VALIDATION.md
docs/IMPLEMENTACAO_V1_11_0A8B36.md
docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B36.md
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
skills/review/06_criterios_commit_bloqueio.md
README.md
CHANGELOG.md
```

## Proteções mantidas

```text
E2E integrado mutável não roda no CI padrão.
Seed/reset backend não roda no CI padrão.
Relatório assistido não roda no CI padrão.
ACKs versionados ficam false.
Nenhum token/JWT/chave foi adicionado.
Nenhum mock produtivo foi criado.
Nenhuma regra fiscal foi alterada.
Nenhuma permissão foi alterada.
```

## Variáveis novas

```bash
LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=false
LOGOSOFT_INTEGRATED_E2E_EVIDENCE_FILE=tests/evidence/integrated-e2e.assisted-evidence.example.json
LOGOSOFT_INTEGRATED_E2E_ASSISTED_REPORT_OUTPUT=artifacts/integrated-e2e-assisted-report.md
```

## Validações executadas neste pacote

```bash
npm run validate:assisted-e2e
npm run validate:backend-seed-reset
npm run validate:integrated-runbook
npm run validate:controlled-seeds
npm run validate:integrated-e2e
npm run validate:source
npm run validate:ci
npm run validate:skills
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:fiscal:production
npm run prepare:e2e:integrated:seed
npm run report:e2e:integrated:assisted
```

`prepare:e2e:integrated:seed` permanece skipped sem opt-in. `report:e2e:integrated:assisted` gera relatório local a partir do template de evidências, sem chamada de rede.

## Validações recomendadas no repositório principal

```bash
npm install
npm run validate:source
npm run validate:assisted-e2e
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

## Próxima etapa recomendada

```text
v1.11.0a8b37 — Execução acompanhada contra backend descartável real quando o backend fornecer ambiente e credenciais temporárias
```
