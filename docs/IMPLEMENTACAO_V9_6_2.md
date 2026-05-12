# logosoft frontend v9.6.2 — Auth e Segurança

Esta versão continua a partir da v9.6.1 e implementa o bloco de autenticação e segurança usando o contrato real do backend v9.8.

## Escopo entregue

- Refresh token real via `POST /api/auth/refresh`.
- Atualização de `accessToken`, `accessTokenExpiraEm`, `refreshToken`, `refreshTokenExpiraEm` e `permissoes` na sessão local.
- Logout real via `POST /api/auth/logout` com payload `{ refreshToken }` ou `{ refreshToken: null }`.
- Interceptor Axios continua tentando refresh uma única vez em `401` e redirecionando para `/sessao-expirada` quando o refresh falha.
- Tela real de usuários em `/seguranca/usuarios` usando:
  - `GET /api/seguranca/usuarios`;
  - `POST /api/seguranca/usuarios`.
- Formulário de criação de usuário com validação de referência técnica para `empresaId` e `filialId`.
- Tela de grupos de acesso mantida como placeholder controlado porque o contrato v9.8 ainda não expõe endpoints oficiais para grupos/permissões.
- Testes unitários para refresh de sessão e payload de criação de usuário.

## Endpoints usados

```http
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/seguranca/usuarios
POST /api/seguranca/usuarios
```

## Permissões aplicadas

```txt
SEGURANCA_USUARIOS_CONSULTAR
SEGURANCA_USUARIOS_GERENCIAR
SEGURANCA_PERMISSOES_GERENCIAR
```

## Decisões importantes

- Não foi inventado endpoint para grupos de acesso.
- Não foi criado bloqueio/desbloqueio de usuário porque o contrato v9.8 só documenta listagem e criação de usuários.
- O frontend não envia string vazia, `0` ou `99` em campos `Guid`.
- Feedback operacional continua via Toast, sem `console.*`.
