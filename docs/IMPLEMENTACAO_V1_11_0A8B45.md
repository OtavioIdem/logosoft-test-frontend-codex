# Implementação v1.11.0a8b45 — Auditoria avançada

## Objetivo

A v1.11.0a8b45 evolui o módulo frontend de Auditoria, cobrindo os endpoints operacionais inventariados no backend até a35.

## Escopo implementado

- Consulta operacional paginada por `/api/auditoria/operacional`.
- Eventos recentes por `/api/auditoria/eventos-recentes`.
- Preservação do client legado `/api/auditoria/eventos`.
- Nova rota `/auditoria/operacional`.
- Evolução da rota `/auditoria/eventos` para tela avançada.
- Filtros por empresa, filial, usuário, módulo, entidade, ação, período e termo.
- Cards de resumo operacional.
- Lista visual de eventos recentes.
- Mascaramento de GUID bruto em descrições, referências e textos exibidos.
- Atualização do mapa frontend/backend para `IMPLEMENTADO_B45`.
- Testes estruturais e de payload.

## Endpoints integrados

```http
GET /api/auditoria/eventos
GET /api/auditoria/eventos-recentes
GET /api/auditoria/operacional
```

## Query operacional

```ts
{
  empresaId?: string;
  filialId?: string;
  usuarioId?: string;
  modulo?: string;
  entidade?: string;
  acao?: string;
  termo?: string;
  dataInicial?: string;
  dataFinal?: string;
  page?: number;
  pageSize?: number;
}
```

## Trade-offs

- O frontend não interpreta juridicamente/fiscalmente o evento; apenas exibe a auditoria consolidada pelo backend.
- `entidadeId`, `empresaId`, `filialId` e `usuarioId` não são exibidos como GUID bruto.
- O filtro de usuário usa dropdown operacional quando a listagem de usuários está disponível.
- Sem Swagger real informado, a validação permanece estrutural/documental.

## Arquivos criados

```text
app/(main)/auditoria/operacional/page.tsx
docs/IMPLEMENTACAO_V1_11_0A8B45.md
tests/unit/auditoriaB45Structure.test.ts
tests/unit/auditoriaPayload.test.ts
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
layout/AppMenu.tsx
features/auditoria/api/auditoriaApi.ts
features/auditoria/components/AuditoriaEventosPage.tsx
features/auditoria/hooks/useAuditoriaResources.ts
features/auditoria/schemas/auditoriaSchemas.ts
features/auditoria/types/auditoria.types.ts
features/auditoria/utils/auditoriaDisplay.ts
scripts/backend-contract-map.allowlist.json
docs/CONTRATO_FRONTEND_BACKEND_B38.md
tests/unit/auditoriaDisplay.test.ts
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
Revisão consolidada pós-B45 e validação com Swagger real do backend.
```
