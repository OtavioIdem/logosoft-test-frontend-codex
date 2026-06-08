# Implementação v1.11.0a8b31 — Contratos reais/controlados por módulo prioritário

## Base utilizada

```text
v1.11.0a8b30 — Validação real/controlada frontend/backend
```

A B30 foi aprovada, commitada e enviada ao GitHub. A B31 avança para uma versão funcional normal.

## Objetivo

Criar uma camada de contratos operacionais read-only para validar o frontend contra backend real/controlado nos módulos prioritários do fluxo integrado:

```text
Vendas → Estoque → Financeiro → Auditoria
```

A versão não implementa tela nova e não executa mutações reais. Ela prepara validação controlada de endpoints e DTOs sem reintroduzir mocks produtivos.

## Arquivos adicionados

```text
playwright.operational-contract.config.ts
scripts/validate-operational-contracts.mjs
tests/contract/operational-backend.contract.spec.ts
tests/unit/operationalBackendContract.test.ts
docs/BACKEND_OPERATIONAL_CONTRACTS.md
docs/IMPLEMENTACAO_V1_11_0A8B31.md
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
docs/BACKEND_CONTROLLED_VALIDATION.md
docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md
skills/desenvolvimento/02_workflow_implementacao.md
skills/desenvolvimento/07_testes_gates_qualidade.md
skills/review/02_validacoes_obrigatorias.md
skills/review/06_criterios_commit_bloqueio.md
README.md
CHANGELOG.md
```

## O que foi implementado

### 1. Contrato operacional read-only

Criada a suíte:

```bash
npm run test:contract:operational
```

Ela valida, com opt-in, endpoints read-only de:

```text
GET /api/vendas/pedidos
GET /api/vendas/pedidos/{id}
GET /api/estoque/saldos
GET /api/estoque/movimentos
GET /api/estoque/reservas
GET /api/financeiro/contas-receber
GET /api/financeiro/contas-receber/{id}
GET /api/financeiro/contas-pagar
GET /api/financeiro/contas-pagar/{id}
GET /api/auditoria/eventos
```

### 2. Gate estrutural

Criado:

```bash
npm run validate:operational-contracts
```

O gate bloqueia regressões como:

- ausência da suíte operacional;
- ausência da config Playwright dedicada;
- ausência das variáveis no template controlado;
- ausência do contrato operacional no `ci:gates`;
- ausência do contrato operacional no workflow;
- presença de mutações no contrato operacional;
- token operacional declarado no workflow padrão.

### 3. Integração ao pipeline local e CI

O novo gate foi integrado a:

```text
validate:source
ci:gates
GitHub Actions
```

A suíte opt-in foi integrada ao `ci:gates` após o contrato fiscal e antes do E2E backend mutável.

### 4. Ambiente controlado

Adicionadas variáveis ao `.env.backend-controlled.example`:

```text
LOGOSOFT_OPERATIONAL_CONTRACT_API_URL
LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN
LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID
LOGOSOFT_OPERATIONAL_CONTRACT_FILIAL_ID
LOGOSOFT_OPERATIONAL_CONTRACT_PEDIDO_VENDA_ID
LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_RECEBER_ID
LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_PAGAR_ID
LOGOSOFT_OPERATIONAL_CONTRACT_ORIGEM_ID
```

O arquivo permanece sem tokens, senhas, certificados ou segredos reais.

## O que não foi alterado

```text
Nenhuma tela produtiva.
Nenhum client real de API.
Nenhum mock/store.
Nenhum payload fiscal.
Nenhum fluxo de autenticação.
Nenhuma regra fiscal.
Nenhuma permissão.
Nenhum fluxo mutável de venda, estoque ou financeiro.
```

## Riscos controlados

1. A suíte operacional fica skipped sem variáveis, por segurança.
2. A execução real depende de backend controlado com dados mínimos.
3. O contrato valida DTOs e endpoints, mas não substitui E2E integrado mutável.
4. Se o backend retornar contrato diferente do frontend, a falha deve ser corrigida no contrato ou no frontend conforme fonte da verdade.

## Validações executadas neste pacote

```bash
node scripts/validate-operational-contracts.mjs
node scripts/validate-backend-controlled.mjs
node scripts/validate-ci-gates.mjs
node scripts/validate-skills.mjs
node scripts/validate-mocks-isolation.mjs
node scripts/validate-guid-references.mjs
node scripts/validate-fiscal-production.mjs
node scripts/validate-source.mjs
npm run validate:operational-contracts
npm run validate:backend-controlled
npm run validate:source
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
```

## Próxima etapa recomendada

```text
v1.11.0a8b32 — E2E integrado controlado de venda → estoque → fiscal → financeiro → auditoria
```

Essa próxima etapa deve continuar opt-in e exigir base descartável/homologação, pois envolverá ações mutáveis reais.
