# Revisão v9.4 — Axios e API real por padrão

Correções aplicadas após revisão do pacote v9.3:

1. Mock removido do caminho padrão da aplicação.
   - `NEXT_PUBLIC_USE_MOCK_AUTH=false` por padrão.
   - `NEXT_PUBLIC_USE_MOCK_API=false` por padrão.

2. Axios definido como cliente HTTP oficial.
   - `lib/http/httpClient.ts` exporta `httpClient` e `rawHttpClient` usando `axios.create`.
   - Interceptor injeta Bearer token.
   - Interceptor trata 401, tenta refresh token e redireciona para sessão expirada quando falha.

3. API clients das features continuam existindo por módulo.
   - Administração, Segurança, Pessoas, Clientes, Fornecedores, Produtos, Estoque, Vendas, Financeiro, Compras e Auditoria usam `createResourceClient`.
   - `createResourceClient` chama o backend via Axios quando mock não estiver explicitamente ativado.

4. Mock isolado.
   - `resourceMockClient` só é carregado por import dinâmico quando `NEXT_PUBLIC_USE_MOCK_API=true`.
   - `mockAuthClient` só é carregado por import dinâmico quando `NEXT_PUBLIC_USE_MOCK_AUTH=true`.

5. Dockerfile corrigido.
   - Usa `node:lts-alpine`.
   - Usa `npm install --no-audit --no-fund`.
   - Não usa comando de instalação limpa.

6. Tratamento de erro padronizado.
   - Sem `console.*`.
   - Erros de API são normalizados por `mapApiError`.
   - A UI mostra erros via Toast, Message ou painel visual.

Observação: contratos fiscais/operacionais específicos devem seguir os DTOs finais do backend. A camada atual já chama os endpoints reais e aceita tanto retorno direto quanto `ApiResult<T>`.
