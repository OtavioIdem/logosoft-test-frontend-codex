# Implementacao v1.11.0a2 - Login full-screen e payload sem filial

Versao anterior aplicada: `v1.11.0a1`.

## Causa

A tela `/login` estava visualmente limitada a um card centralizado, deixando margens grandes em desktop. Alem disso, o metodo real de login deixou de receber `filialId`, entao o campo `Filial` precisava sair tanto da interface quanto do payload enviado para `/api/auth/login`.

## Telas alteradas

- `/login`

## Alteracoes aplicadas

- `styles/layout/_auth.scss` ajustado para o login ocupar toda a viewport.
- `LoginForm` deixou de renderizar o campo `Filial`.
- `loginSchema` passou a validar somente e-mail, senha e empresa.
- `LoginRequest` e `LoginPayload` nao possuem mais `filialId`.
- `useLogin` nao envia mais filial para o provider de autenticacao.
- `buildLoginPayload` ignora `filialId` legado mesmo se recebido por engano.
- `mockAuthClient` nao deriva mais filial do payload de login.
- Mensagens de erro foram ajustadas para empresa/credenciais.
- Testes de componente e payload de login foram atualizados.

## Regras preservadas

- Login continua consumindo a API real por padrao.
- Nenhum endpoint foi inventado.
- Nenhum token, senha ou dado sensivel e logado.
- Nao ha uso de `console.*`.
- Empresa continua como campo textual temporario enquanto nao houver seletor oficial por usuario.
- GUID cru nao e exibido para filial, pois a filial nao faz mais parte do login.

## Validacao recomendada

```bash
npm run validate:source
npm run test:component -- LoginForm
npm run test:unit -- authLoginPayload
npm run build
```
