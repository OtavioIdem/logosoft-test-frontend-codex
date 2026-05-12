# Revisão build v9.5

Correção aplicada no login real contra o backend ASP.NET Core.

## Problema

O formulário usava o campo visual `senha` e o payload podia incluir `empresaId` e `filialId` inválidos, como `0` e `99`. Como o backend espera `Guid?`, esses valores quebravam a conversão antes da lógica especial do manager.

## Correção

- `LoginForm` continua exibindo o campo **Senha**, mas envia `password` para a camada de autenticação.
- `authApi.buildLoginPayload` monta o payload final antes de chamar `/api/auth/login`.
- Para `manager@erp.local`, o payload é exatamente `{ email, password }`.
- Para outros usuários, `empresaId` e `filialId` só são enviados quando forem valores preenchidos e diferentes dos sentinelas inválidos `0` e `99`.
- O endpoint real continua sendo chamado via Axios.

## Testes adicionados

- `tests/unit/authLoginPayload.test.ts` valida o payload do manager.
- O teste também valida remoção de IDs inválidos e preservação de referência técnicas válidos.
