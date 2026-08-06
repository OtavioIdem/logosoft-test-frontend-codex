# Implementação v1.10.15a1 — Login UX final

## Versão anterior

A versão aplicada antes desta manutenção era `v10.0.15`. A partir desta entrega, a linha passa a ser registrada como `v1.10.15`, com manutenções identificadas por sufixos `a1`, `a2` e sucessivos.

## Objetivo

Modernizar a tela `/login` com um layout corporativo em duas áreas, mantendo autenticação real, contrato atual da API, segurança frontend e as regras permanentes do projeto.

## Entregas

- `features/auth/components/LoginPage.tsx`
- `features/auth/components/LoginForm.tsx`
- `features/auth/components/LoginBrandPanel.tsx`
- `features/auth/components/LoginEnvironmentBadge.tsx`
- `features/auth/schemas/loginSchema.ts`
- `features/auth/hooks/useLogin.ts`
- `styles/layout/_auth.scss`
- `tests/components/LoginForm.test.tsx`
- `tests/unit/sessionPolicy.test.ts`

## Segurança e sessão

- O login limpa sessão local inválida antes de nova autenticação.
- Senha, token e refresh token não são registrados em interface, log ou estado persistido fora da sessão.
- O submit fica bloqueado durante loading.
- A sessão passa a registrar:
  - `sessionStartedAt`;
  - `lastActivityAt`.
- Política aplicada:
  - duração máxima de 5 horas;
  - inatividade máxima de 30 minutos.

## UX

- Formulário com logo, título, subtítulo, ambiente, campos e erro inline.
- Erro de autenticação exibido via Toast pelo provider e via `ApiErrorPanel` no formulário.
- Empresa e filial seguem como campos textuais temporários, sem expor GUID cru na interface.
  - **Superado:** o campo Empresa foi removido do formulário de login. O backend passou a resolver o vínculo do usuário e a validar a licença do cliente a partir das credenciais, e o corpo de `/api/auth/login` carrega apenas `email` e `password`. Com isso a exceção controlada `LoginForm.tsx::empresaId` do gate `validate:guid-references` foi encerrada.
- Painel visual abstrato com gradiente azul/roxo/magenta e variações futuras por campanha.
- Em mobile, o painel visual é ocultado para priorizar o formulário.

## Contrato de API

Nenhum endpoint novo foi criado. O login continua usando `/api/auth/login`, refresh usa `/api/auth/refresh` e logout usa `/api/auth/logout`.

## Validação

Comandos recomendados:

```bash
npm run validate:source
npm run test:unit
```
