# Implementação v1.11.0a8b43.c2 — Atividades / workflow operacional

## Objetivo

A v1.11.0a8b43.c2 implementa o módulo frontend de Atividades, cobrindo o workflow operacional documentado no inventário backend até a35.

## Escopo implementado

- Nova rota `/atividades`.
- Client real para `/api/atividades`.
- Listagem com filtros de empresa, filial, status e prioridade.
- Criação de atividade.
- Edição de atividade.
- Consulta de detalhe com histórico e comentários.
- Atribuição de responsável.
- Alteração de status com comentário.
- Adição de comentários.
- Cancelamento com motivo.
- Guards e menu com permissões `ATIVIDADES_CONSULTAR` e `ATIVIDADES_GERENCIAR`.
- Atualização do mapa frontend/backend para `IMPLEMENTADO_B43`.
- Testes estruturais e de payload.

## Endpoints integrados

```http
GET /api/atividades
GET /api/atividades/{id}
POST /api/atividades
PUT /api/atividades/{id}
POST /api/atividades/{id}/atribuir
POST /api/atividades/{id}/status
POST /api/atividades/{id}/comentarios
POST /api/atividades/{id}/cancelar
```

## Payloads principais

### Criar atividade

```json
{
  "empresaId": "63acffdd-080b-45f2-a210-5d02c2074a48",
  "filialId": "57d9f915-0f3b-4fb3-90af-9cdebbce98ad",
  "titulo": "Conferir divergência de estoque",
  "descricao": "Verificar divergência encontrada no inventário.",
  "prioridade": "Alta",
  "responsavelUsuarioId": "044dbd93-8d6d-4c8c-8295-d8c97be62a82",
  "prazoEm": "2026-06-20T18:00:00.000Z",
  "entidadeOrigem": "InventarioEstoqueOperacional",
  "entidadeOrigemId": "eec2fd55-cf54-4f6e-89b1-98bca230a903"
}
```

### Atualizar atividade

```json
{
  "titulo": "Conferir divergência de estoque atualizada",
  "descricao": "Validar divergência e corrigir saldo se necessário.",
  "prioridade": "Critica",
  "prazoEm": "2026-06-18T18:00:00.000Z"
}
```

### Atribuir responsável

```json
{
  "responsavelUsuarioId": "044dbd93-8d6d-4c8c-8295-d8c97be62a82"
}
```

### Alterar status

```json
{
  "status": "EmAndamento",
  "comentario": "Atividade iniciada pelo responsável."
}
```

### Comentário

```json
{
  "mensagem": "Foi encontrada diferença entre físico e sistema."
}
```

### Cancelar

```json
{
  "motivo": "Atividade aberta indevidamente."
}
```

## Trade-offs

- A B43 usa permissões explícitas `ATIVIDADES_CONSULTAR` e `ATIVIDADES_GERENCIAR`; o backend deve confirmar o nome final das permissões no Swagger real ou catálogo oficial.
- O frontend não cria regra de workflow fora do contrato. Alteração de status, comentário e cancelamento são enviados ao backend para histórico/auditoria.
- A tela suporta vínculo textual de origem (`entidadeOrigem`) e GUID de origem (`entidadeOrigemId`) sem tentar consultar todos os módulos de origem nesta etapa.
- A listagem aceita array simples ou `PagedResult`, pois o inventário descreve paginação, mas o frontend ainda opera em modo estrutural/documental sem Swagger real.

## Arquivos criados

```text
app/(main)/atividades/page.tsx
features/atividades/api/atividadesApi.ts
features/atividades/components/AtividadeActionDialogs.tsx
features/atividades/components/AtividadeFormDialog.tsx
features/atividades/components/AtividadesPage.tsx
features/atividades/hooks/useAtividadesResources.ts
features/atividades/schemas/atividadesSchemas.ts
features/atividades/types/atividades.types.ts
docs/IMPLEMENTACAO_V1_11_0A8B43.md
tests/unit/atividadesB43Structure.test.ts
tests/unit/atividadesPayload.test.ts
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
```

## Validações recomendadas no repositório principal

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
v1.11.0a8b44 — Relatórios operacionais e gerenciais
```
