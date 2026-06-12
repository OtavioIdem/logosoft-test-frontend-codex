# Isolamento definitivo de mocks do frontend

## Objetivo

Garantir que mocks usados para testes não fiquem em diretórios produtivos nem possam ser importados por telas, providers, clients reais ou código de runtime.

## Regra aplicada na v1.11.0a8b29

Mocks foram isolados em `tests/mocks/` e fixtures E2E permanecem em `tests/e2e/fixtures/`.

Caminhos permitidos:

```text
tests/mocks/auth/mockAuthClient.ts
tests/mocks/resources/mockErpStore.ts
tests/mocks/resources/resourceMockClient.ts
tests/e2e/fixtures/logosoft.ts
```

Caminhos proibidos após a B29:

```text
features/auth/api/mockAuthClient.ts
features/shared/api/mockErpStore.ts
features/shared/api/resourceMockClient.ts
```

## Comportamento esperado

O runtime produtivo deve consumir somente API real por `httpClient`, `authApi` e `createResourceClient`.

Mocks podem existir somente para:

- testes unitários;
- testes de componente;
- E2E mockado isolado por Playwright;
- simulação controlada de cenário dentro de `tests/`.

Mocks não podem:

- substituir API real em produção;
- servir como fallback quando a API falha;
- alterar fluxo real de autenticação;
- ficar em `features/`, `app/`, `components/`, `providers/`, `lib/` ou `hooks/`;
- depender de `NEXT_PUBLIC_USE_MOCK_AUTH` ou `NEXT_PUBLIC_USE_MOCK_API` em runtime.

## Gate obrigatório

```bash
npm run validate:mocks-isolation
```

Esse gate também é executado por:

```bash
npm run validate:source
npm run ci:gates
```

## Critérios de bloqueio

A versão deve ser bloqueada se:

- arquivo com nome `mock`, `fixture` ou `fake` aparecer em diretório produtivo;
- código produtivo importar caminho contendo `mock`, `fixture` ou `fake`;
- código produtivo referenciar `mockAuthClient`, `mockErpStore`, `createMockResourceClient` ou `resourceMockClient`;
- variável `NEXT_PUBLIC_USE_MOCK_*` aparecer em código produtivo ou workflow CI;
- testes/documentação voltarem a importar mocks antigos de `features/**/api`.
