# Implementação v1.11.0a8b39.c1 — Segurança completa

## Objetivo

Evoluir o módulo Segurança do frontend para cobrir as principais rotas operacionais disponíveis no backend: usuários, ações auditáveis, grupos de acesso e client de usuário autenticado.

## Escopo implementado

- Tela real de Grupos de acesso substituindo placeholder.
- Client `/api/seguranca/grupos-acesso` com listar, obter, criar, atualizar e inativar.
- Tela de Usuários com ações críticas: inativar, reativar, resetar senha, vincular grupo e remover grupo.
- Payloads auditáveis com `motivo` obrigatório para operações críticas.
- Client `GET /api/auth/me` com normalização de usuário autenticado.
- Testes unitários para payloads e estrutura da B39.
- Atualização de versionamento para `v1.11.0a8b39.c1`.

## Endpoints cobertos

```text
GET  /api/auth/me
GET  /api/seguranca/usuarios
GET  /api/seguranca/usuarios/{id}
POST /api/seguranca/usuarios
POST /api/seguranca/usuarios/{id}/inativar
POST /api/seguranca/usuarios/{id}/reativar
POST /api/seguranca/usuarios/{id}/reset-senha
POST /api/seguranca/usuarios/{id}/grupos-acesso
POST /api/seguranca/usuarios/{id}/grupos-acesso/{grupoAcessoId}/remover
GET  /api/seguranca/grupos-acesso
GET  /api/seguranca/grupos-acesso/{id}
POST /api/seguranca/grupos-acesso
PUT  /api/seguranca/grupos-acesso/{id}
POST /api/seguranca/grupos-acesso/{id}/inativar
```

## Payloads principais

### Criar usuário

```json
{
  "nome": "Ana Operadora",
  "email": "ana@empresa.com",
  "login": "ana@empresa.com",
  "senha": "Senha@123",
  "empresaId": "11111111-1111-1111-1111-111111111111",
  "filialId": null,
  "gruposAcessoIds": ["33333333-3333-3333-3333-333333333333"]
}
```

### Inativar/Reativar usuário

```json
{
  "motivo": "Usuário desligado da empresa."
}
```

### Resetar senha

```json
{
  "novaSenha": "NovaSenha@123",
  "motivo": "Solicitação formal."
}
```

### Vincular grupo ao usuário

```json
{
  "grupoAcessoId": "33333333-3333-3333-3333-333333333333",
  "motivo": "Conceder acesso operacional."
}
```

### Criar/Atualizar grupo

```json
{
  "nome": "Financeiro",
  "descricao": "Grupo financeiro",
  "permissoes": ["FINANCEIRO_CONSULTAR", "FINANCEIRO_GERENCIAR"]
}
```

## Arquivos criados

```text
features/seguranca/components/GruposAcessoPage.tsx
features/seguranca/components/GrupoAcessoFormDialog.tsx
features/seguranca/components/SegurancaActionDialogs.tsx
tests/unit/segurancaB39Structure.test.ts
docs/IMPLEMENTACAO_V1_11_0A8B39.md
```

## Arquivos atualizados

```text
app/(main)/seguranca/grupos-acesso/page.tsx
features/auth/api/authApi.ts
features/auth/api/authResponseMapper.ts
features/seguranca/api/segurancaApi.ts
features/seguranca/components/UsuarioFormDialog.tsx
features/seguranca/components/UsuariosPage.tsx
features/seguranca/hooks/useUsuariosSeguranca.ts
features/seguranca/schemas/segurancaSchemas.ts
features/seguranca/types/seguranca.types.ts
tests/unit/segurancaUsuarioPayload.test.ts
scripts/backend-contract-map.allowlist.json
docs/CONTRATO_FRONTEND_BACKEND_B38.md
README.md
CHANGELOG.md
```

## Trade-offs

- `authApi.me` foi implementado como client, mas não foi ligado automaticamente no `AuthProvider` para evitar alterar comportamento de sessão já aprovado sem Swagger real/ambiente confirmado.
- A manutenção de permissões do grupo usa texto normalizado por linha/vírgula para evitar inventar catálogo oficial de permissões antes do backend expor um endpoint dedicado.
- Remoção de grupo em usuário remove o primeiro grupo listado quando acionada pela tabela; gestão granular completa pode evoluir com tela de detalhe do usuário.

## Validações recomendadas

```bash
npm install
npm run validate:source
npm run validate:backend-contract-map
npm run validate:ci
npm run validate:mocks-isolation
npm run validate:guid-references
npm run validate:operational-contracts
npm run validate:assisted-e2e
npm run validate:skills
npm run test:unit -- tests/unit/segurancaUsuarioPayload.test.ts tests/unit/segurancaB39Structure.test.ts
npm run ci:gates
```

## Próxima etapa

```text
v1.11.0a8b40 — Tabelas de preço
```
