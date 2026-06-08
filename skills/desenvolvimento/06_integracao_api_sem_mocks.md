# Skill — Integração com API real e controle de mocks

## Objetivo

Impedir falsa sensação de funcionamento causada por mock acoplado à tela produtiva.

## Regra global de mocks

Mocks podem existir somente para:

- testes unitários;
- testes de componente;
- E2E mockado isolado;
- desenvolvimento isolado explicitamente habilitado;
- simulação controlada de integração externa.

Mocks não podem:

- substituir API real em produção;
- servir como fallback automático quando a API falha;
- estar acoplados ao caminho produtivo da tela;
- mascarar ausência de backend;
- alterar fluxo real de autenticação;
- simular permissões produtivas fora de ambiente controlado.

## Padrão esperado de API

1. Tela chama hook/use case de frontend.
2. Hook chama client real tipado.
3. Client usa `httpClient`/Axios configurado.
4. API responde payload real ou contrato formal.
5. Erros são exibidos sem cair em mock.

## Padrão esperado de E2E mockado

1. Teste intercepta rotas via Playwright.
2. Mock fica em fixture de teste.
3. O runtime da aplicação não conhece flags mockadas de produção.
4. O teste deixa claro que é simulado.

## Estrutura obrigatória após a B29

Mocks não podem permanecer em diretórios produtivos. A estrutura permitida é:

```text
tests/mocks/
tests/e2e/fixtures/
```

Caminhos proibidos:

```text
features/auth/api/mockAuthClient.ts
features/shared/api/mockErpStore.ts
features/shared/api/resourceMockClient.ts
```

## Ao encontrar mock em `features/`

Bloquear a entrega. Depois classificar:

```text
É importado por tela produtiva?
É usado apenas por teste?
Existe fallback automático?
Existe flag de ambiente?
Deve ser movido para tests/mocks ou tests/e2e/fixtures?
```

Se o mock for necessário para teste, mover para `tests/mocks/` ou fixture Playwright. Se for runtime/fallback, remover a dependência e exigir API real.

## Gate obrigatório

```bash
npm run validate:mocks-isolation
```
