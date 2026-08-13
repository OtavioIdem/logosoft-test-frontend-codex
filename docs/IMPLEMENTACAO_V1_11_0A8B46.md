# Implementação v1.11.0a8b46 — bootstrap efetivo da sessão

## Objetivo

Conectar `GET /api/auth/me` ao ciclo de restauração e login para que o shell protegido só seja montado depois de a identidade, contexto organizacional e permissões serem confirmados pela API.

## Alterações

- `features/auth/schemas/authSchemas.ts`: contrato Zod estrito para `MeResponse`, incluindo `empresaId` vazio como contexto global e a lista recebida de permissões.
- `features/auth/api/authResponseMapper.ts`: validação do payload de `/me` antes de criar o usuário efetivo.
- `features/auth/api/authApi.ts`: erro estruturado (`status`, `code`, `traceId`) preservado em `AuthApiClientError`; payload inválido recebe `AUTH_PAYLOAD_INVALID`.
- `providers/AuthProvider.tsx`: restauração e login gravam tokens apenas como etapa intermediária e aguardam `/me`; 401/payload inválido limpam a sessão, enquanto falhas transitórias bloqueiam o shell com retry.
- `components/security/ProtectedRoute.tsx`: estado bloqueante com código/traceId e ação de nova tentativa; permissões do storage não são usadas durante bootstrap pendente ou falho.
- `features/auth/types/auth.types.ts` e `types/erp.ts`: estado de bootstrap, erro estruturado e `isMaster` na identidade.
- `config/app.ts` e `package.json`: versão `1.11.0a8b46`.

## Regra antes/depois

Antes, `AuthProvider` considerava a identidade persistida localmente suficiente para liberar o shell. Depois, uma sessão persistida só é autenticada após `GET /api/auth/me`; falhas 5xx/rede mantêm o shell bloqueado e permitem retry. `isMaster`, `MASTER_GOD` e `*` não são tratados como bypass no frontend.

## Validação

- `npm run typecheck` — passou.
- `npm run lint` — passou.
- `npm run validate:source` — havia passado na implementação original; a revalidação do corte integrado depende das dependências locais do projeto.

Testes, E2E e build ficaram fora da implementação original. O commit e a publicação foram concluídos pelo PR #8.
