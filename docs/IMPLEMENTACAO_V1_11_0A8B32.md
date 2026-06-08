# Implementação v1.11.0a8b32 — E2E integrado controlado

## Status

Versão funcional criada após aprovação da `v1.11.0a8b31.c1`.

## Objetivo

Adicionar uma suíte E2E integrada e opt-in para validar o fluxo controlado:

```text
venda → fiscal → estoque → financeiro → auditoria
```

A suíte é mutável e, por isso, não roda automaticamente no CI comum nem reaproveita variáveis fiscais ou operacionais de contratos read-only.

## Arquivos criados

```text
playwright.integrated-e2e.config.ts
tests/e2e/integrated-backend.spec.ts
tests/unit/integratedBackendE2e.test.ts
scripts/validate-integrated-e2e.mjs
docs/BACKEND_INTEGRATED_E2E.md
docs/IMPLEMENTACAO_V1_11_0A8B32.md
docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B32.md
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
skills/desenvolvimento/02_workflow_implementacao.md
skills/desenvolvimento/07_testes_gates_qualidade.md
skills/review/02_validacoes_obrigatorias.md
skills/review/06_criterios_commit_bloqueio.md
README.md
CHANGELOG.md
```

## O que foi implementado

### 1. Suíte E2E integrada controlada

Criada a suíte:

```bash
npm run test:e2e:integrated:backend
```

Ela usa:

```text
playwright.integrated-e2e.config.ts
tests/e2e/integrated-backend.spec.ts
```

### 2. Opt-in próprio

A execução real exige:

```bash
LOGOSOFT_INTEGRATED_E2E_RUN=true
LOGOSOFT_INTEGRATED_E2E_API_URL=
LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN=
LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID=
LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID=
```

Sem essas variáveis, a suíte fica skipped.

### 3. Separação de contratos e E2E mutável

A B32 mantém separação entre:

```text
Contrato fiscal read-only: LOGOSOFT_CONTRACT_*
Contrato operacional read-only: LOGOSOFT_OPERATIONAL_CONTRACT_*
E2E integrado mutável: LOGOSOFT_INTEGRATED_E2E_*
```

O E2E integrado não usa fallback para variáveis fiscais ou operacionais.

### 4. Gate estrutural

Criado:

```bash
npm run validate:integrated-e2e
```

O gate valida arquivos, scripts, opt-in, config isolada, template de ambiente e ausência de execução mutável automática no CI comum.

### 5. Integração aos gates

`validate:integrated-e2e` foi integrado a:

```text
validate:source
ci:gates
GitHub Actions
skills de desenvolvimento/review
```

O `ci:gates` executa o gate estrutural, mas não executa `test:e2e:integrated:backend`.

## Fluxo validado pela suíte

```text
1. Consulta o pedido de venda controlado.
2. Gera nota fiscal a partir do pedido.
3. Abre a tela real do detalhe fiscal.
4. Valida a nota.
5. Gera XML.
6. Assina XML.
7. Transmite em ambiente controlado.
8. Confirma autorização na UI.
9. Gera DANFE.
10. Baixa estoque.
11. Gera financeiro.
12. Consulta movimentos de estoque.
13. Consulta contas a receber.
14. Consulta auditoria.
```

## O que não foi alterado

```text
Nenhuma tela produtiva.
Nenhum client real de API.
Nenhum mock/store.
Nenhum contrato fiscal de payload.
Nenhum contrato operacional read-only.
Nenhum fluxo real de autenticação.
Nenhuma regra fiscal.
Nenhuma permissão.
Nenhuma execução mutável automática no CI comum.
```

## Validações executadas

```bash
node scripts/validate-integrated-e2e.mjs
node scripts/validate-ci-gates.mjs
node scripts/validate-backend-controlled.mjs
node scripts/validate-operational-contracts.mjs
node scripts/validate-skills.mjs
node scripts/validate-mocks-isolation.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-source.mjs
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

Com backend controlado preparado:

```bash
cp .env.backend-controlled.example .env.backend-controlled.local
npx playwright install chromium
npm run test:contract:fiscal
npm run test:contract:operational
npm run test:e2e:fiscal:backend
npm run test:e2e:integrated:backend
```

## Riscos e observações

- A suíte integrada é mutável e exige ambiente descartável ou homologação.
- A execução skipped sem variáveis valida apenas o opt-in de segurança.
- A validação real depende de backend preparado com pedido de venda controlado, permissões e integrações fiscais simuladas/homologadas.
- Regras fiscais oficiais continuam dependendo de backend, documentação vigente e validação fiscal humana quando aplicável.

## Próxima etapa recomendada

```text
v1.11.0a8b33 — Preparação de seeds/dados controlados para E2E integrado
```
