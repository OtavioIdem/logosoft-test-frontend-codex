# Implementação v1.11.0a8b44.c1 — Relatórios operacionais e gerenciais

## Objetivo

A v1.11.0a8b44.c1 implementa o módulo frontend de Relatórios, cobrindo os endpoints operacionais e gerenciais documentados no inventário backend até a35.

## Escopo implementado

- Nova rota `/relatorios`.
- Client real para `/api/relatorios/operacionais`.
- Clients reais para `/api/relatorios/gerenciais/vendas`, `/compras`, `/financeiro`, `/estoque` e `/fiscal`.
- Filtros por empresa, filial, data inicial e data final.
- Cards de KPIs com extração segura de indicadores retornados pelo backend.
- Remoção visual de IDs técnicos dos cards.
- Bloqueio de valores UUID brutos mesmo quando retornados em chave textual não técnica.
- Guards e menu com `RELATORIOS_CONSULTAR`.
- Atualização do mapa frontend/backend para `IMPLEMENTADO_B44`.
- Testes estruturais e de payload.

## Endpoints integrados

```http
GET /api/relatorios/operacionais
GET /api/relatorios/gerenciais/vendas
GET /api/relatorios/gerenciais/compras
GET /api/relatorios/gerenciais/financeiro
GET /api/relatorios/gerenciais/estoque
GET /api/relatorios/gerenciais/fiscal
```

## Payload de consulta

Os filtros são enviados como query string:

```http
?empresaId=...&filialId=...&dataInicial=2026-06-01T03:00:00.000Z&dataFinal=2026-06-30T02:59:59.999Z
```

## Trade-offs

- O frontend não recalcula KPI gerencial; apenas exibe os indicadores consolidados pelo backend.
- IDs técnicos e valores UUID são removidos da exibição de cards para não expor GUID bruto ao operador.
- Como o Swagger real ainda não foi informado, os responses são modelados de forma flexível para aceitar evolução dos indicadores por módulo.
- A permissão adotada é `RELATORIOS_CONSULTAR`; o backend deve confirmar o nome final no catálogo oficial de permissões.

## Arquivos criados

```text
app/(main)/relatorios/page.tsx
features/relatorios/api/relatoriosApi.ts
features/relatorios/components/RelatoriosPage.tsx
features/relatorios/hooks/useRelatoriosResources.ts
features/relatorios/components/relatoriosMetricUtils.ts
features/relatorios/schemas/relatoriosSchemas.ts
features/relatorios/types/relatorios.types.ts
docs/IMPLEMENTACAO_V1_11_0A8B44.md
tests/unit/relatoriosB44Structure.test.ts
tests/unit/relatoriosPayload.test.ts
```

## Arquivos atualizados

```text
package.json
config/app.ts
.env.example
.env.test
.env.backend-controlled.example
.github/workflows/frontend-ci.yml
README.md
CHANGELOG.md
types/erp.ts
layout/AppMenu.tsx
lib/security/routePermissions.ts
scripts/backend-contract-map.allowlist.json
docs/CONTRATO_FRONTEND_BACKEND_B38.md
scripts/validate-assisted-e2e.mjs
tests/unit/assistedIntegratedE2e.test.ts
tests/evidence/integrated-e2e.assisted-evidence.example.json
tests/e2e/fixtures/logosoft.ts
tests/mocks/auth/mockAuthClient.ts
tests/unit/routePermissions.test.ts
```

## Validações recomendadas

```bash
npm install
npm run validate:source
npm run validate:backend-contract-map
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:operational-contracts
npm run validate:assisted-e2e
npm run validate:skills
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run ci:gates
git diff --check
```

## Próxima etapa recomendada

```text
v1.11.0a8b45 — Auditoria avançada
```
