# Implementação v1.11.0a8b29 — Isolamento definitivo de mocks produtivos

## Status

Versão funcional gerada para revisão.

## Objetivo

Isolar definitivamente mocks de autenticação e recursos fora dos diretórios produtivos do frontend, mantendo os testes que dependem desses dados simulados e impedindo regressões por gate automatizado.

## Escopo implementado

- Movidos mocks de `features/**/api` para `tests/mocks/**`.
- Mantido E2E mockado apenas em fixture Playwright.
- Atualizado teste unitário do store mockado para importar de `tests/mocks`.
- Criado gate `validate:mocks-isolation`.
- Integrado o gate ao `validate:source`, ao `ci:gates` e ao workflow GitHub Actions.
- Atualizado gate de CI para exigir a nova validação.
- Criada documentação operacional do isolamento de mocks.
- Atualizado versionamento para `1.11.0a8b29`.

## Arquivos movidos

```text
features/auth/api/mockAuthClient.ts
→ tests/mocks/auth/mockAuthClient.ts

features/shared/api/mockErpStore.ts
→ tests/mocks/resources/mockErpStore.ts

features/shared/api/resourceMockClient.ts
→ tests/mocks/resources/resourceMockClient.ts
```

## Arquivos adicionados

```text
scripts/validate-mocks-isolation.mjs
docs/MOCKS_ISOLATION_FRONTEND.md
docs/IMPLEMENTACAO_V1_11_0A8B29.md
tests/unit/mocksIsolation.test.ts
```

## Arquivos alterados

```text
package.json
config/app.ts
.env.example
.env.test
.github/workflows/frontend-ci.yml
scripts/validate-source.mjs
scripts/validate-ci-gates.mjs
tests/unit/mockErpStore.test.ts
skills/desenvolvimento/06_integracao_api_sem_mocks.md
skills/review/05_review_mocks_guid_fiscal.md
docs/CI_GATES_FRONTEND.md
```

## O que não foi alterado

- Nenhuma tela produtiva.
- Nenhum contrato de API real.
- Nenhuma regra fiscal.
- Nenhum fluxo de autenticação real.
- Nenhum provider de sessão.
- Nenhuma permissão.
- Nenhuma regra de negócio.

## Validações executadas neste ambiente

```bash
node scripts/validate-mocks-isolation.mjs
node scripts/validate-ci-gates.mjs
node scripts/validate-skills.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-source.mjs
npm run validate:mocks-isolation
npm run validate:ci
npm run validate:skills
npm run validate:guid-references
npm run validate:fiscal:production
npm run validate:source
```

## Validações recomendadas no repositório principal

```bash
npm install
npm run validate:source
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

## Critério de aceite

A versão só deve ser aprovada se:

- nenhum mock permanecer em diretório produtivo;
- telas e clients reais continuarem usando API real;
- testes mockados continuarem funcionando a partir de `tests/mocks` ou `tests/e2e/fixtures`;
- `validate:mocks-isolation` bloquear retorno de mock para `features/**`;
- documentação e ZIP estiverem coerentes.
