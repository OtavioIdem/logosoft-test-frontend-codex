# Revisão de sessão v9.6

Correção aplicada para o contrato real do backend em `POST /api/auth/login`.

## Contrato esperado

```json
{
  "accessToken": "...",
  "accessTokenExpiraEm": "2026-05-05T20:30:00+00:00",
  "refreshToken": "...",
  "refreshTokenExpiraEm": "2026-05-12T20:15:00+00:00",
  "permissoes": []
}
```

## Ajustes

- `normalizeLoginSession` agora mapeia `accessTokenExpiraEm` e `refreshTokenExpiraEm` exatamente.
- A sessão salva no storage mantém os campos originais do backend.
- O alias legado `expiresAt` aponta para `accessTokenExpiraEm` para compatibilidade interna.
- A leitura do JWT considera `exp` em segundos Unix e compara com `decoded.exp * 1000 < Date.now()`.
- O interceptor Axios tenta refresh antes de enviar uma requisição quando o access token estiver vencido e o refresh token ainda estiver válido.
- O mock continua desligado por padrão.
