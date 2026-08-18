# Implementação v1.11.0a8b47.c2 — consulta segura de filiais

## Objetivo

Corrigir a consulta de filiais no sistema sem alterar o contrato do backend, mantendo o endpoint canônico `GET /api/administracao/filiais?empresaId=<GUID>` e evitando divergência entre filtro local e contexto organizacional.

## Alterações

- `lib/http/organizationalContextPolicy.ts`: removido o singleton de snapshot; metadata carrega snapshot imutável por request. Criado escopo `lookup`, que exige `empresaId` explícito compatível e rejeita `filialId`.
- `providers/OrganizationalContextProvider.tsx`: contexto não é mais publicado por bridge assíncrona.
- `features/administracao/api/administracaoApi.ts`: lookup de filiais recebe snapshot, usa somente `empresaId` e preserva `code`, `status`, `traceId` e erros de campo.
- `features/administracao/hooks/useEmpresaFilialOptions.ts`: master/admin consultam a API; usuário sem Administração usa sua filial única; ausência de acesso é bloqueada explicitamente.
- `features/administracao/hooks/useAdministracaoResources.ts`, `features/administracao/components/AdministracaoPage.tsx` e `components/forms/EmpresaFilialFilter.tsx`: wrappers alinham empresa/filial ao contexto e evitam divergência silenciosa.
- `components/forms/FilialSelect.tsx`: diferencia erro de lista vazia e oferece retry.
- `lib/permissions/permissions.ts`: master recebe bypass somente para permissões funcionais do catálogo.

## Validação

Executar no checkout principal:

```bash
npm run validate:source
npm run typecheck
npm run lint
npx vitest run tests/unit/organizationalContextPolicy.test.ts tests/unit/permissions.test.ts tests/components/OrganizationalContextProvider.test.tsx
git diff --check
```

Docker, commit e publicação ficam fora desta fatia.
