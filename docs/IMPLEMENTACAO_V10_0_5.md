# Implementação v10.0.5 — hardening de build e regressões

Esta versão consolida as correções de compilação encontradas durante os builds Docker e adiciona uma barreira estática para evitar que elas voltem.

## Correções preventivas

- O segmento autenticado `app/(main)` foi marcado como dinâmico para evitar prerender estático de telas protegidas por sessão.
- O script `scripts/validate-source.mjs` verifica padrões que já causaram falhas:
  - `console.*` em arquivos TS/TSX de aplicação;
  - resíduos do configurador visual do template (`pi-cog`, `layout-config-button`, `AppConfig` ativo);
  - substituição indevida de identificadores técnicos por texto de interface;
  - `messages?.[0]` em mapeamento de Zod;
  - export default direto de client page que causou erro de prerender.

## Regra de UX mantida

O usuário não deve digitar nem visualizar identificadores técnicos. Campos que enviam GUID no payload devem ser apresentados como Empresa, Filial, Cliente, Produto, Pedido, Forma de pagamento, Condição de pagamento, Local de estoque, etc.

## Validação recomendada

```bash
npm run validate:source
npm run typecheck
npm run test
npm run build
```
