# Skill — Review de mocks, GUID e fiscal

## Mocks

Verificar:

```bash
npm run validate:mocks-isolation
grep -R "mockAuthClient\|mockErpStore\|resourceMockClient\|NEXT_PUBLIC_USE_MOCK" -n app components config features hooks layout lib providers types .github || true
```

Bloquear se:

- mock for usado por tela produtiva;
- mock servir como fallback quando API falha;
- mock alterar fluxo de autenticação real;
- mock/store for reescrito fora de escopo;
- mock permanecer em `features/**`, `app/**`, `components/**`, `providers/**`, `lib/**` ou `hooks/**`;
- flags mockadas forem usadas em runtime produtivo ou no workflow CI.

## Caminhos permitidos após a B29

```text
tests/mocks/auth/mockAuthClient.ts
tests/mocks/resources/mockErpStore.ts
tests/mocks/resources/resourceMockClient.ts
tests/e2e/fixtures/logosoft.ts
```

## GUID manual

Rodar:

```bash
npm run validate:guid-references
```

Bloquear se entidade relacionada puder ser digitada como GUID manual.

Exemplos de campos críticos:

```text
empresaId
filialId
clienteId
pessoaId
fornecedorId
produtoId
pedidoVendaId
pedidoCompraId
condicaoPagamentoId
formaPagamentoId
localEstoqueId
centroCustoId
grupoAcessoId
usuarioId
```

Exceções conhecidas:

```text
Nenhuma.
```

A única exceção controlada que existia — `LoginForm.tsx::empresaId` — foi encerrada quando o campo Empresa saiu
da tela de login. A empresa passou a ser resolvida pelo backend, junto da validação de licença do cliente, e o
`controlledExceptions` do gate ficou vazio de propósito: reintroduzir o campo deve falhar.

## Fiscal

Rodar:

```bash
npm run validate:fiscal:production
npm run test:e2e:fiscal
npm run test:contract:fiscal
npm run test:e2e:fiscal:backend
```

Bloquear se:

- XML completo aparecer em UI/log/teste;
- ação fiscal ignorar `resumo.acoes` ou `workflow.proximasAcoes`;
- cancelamento/inutilização não exigir motivo;
- regra fiscal for inventada no frontend;
- autorização mockada for tratada como produção real.
