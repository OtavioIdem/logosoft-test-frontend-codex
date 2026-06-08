# Skill — Review de mocks, GUID e fiscal

## Mocks

Verificar:

```bash
grep -R "mockAuthClient\|mockErpStore\|resourceMockClient\|NEXT_PUBLIC_USE_MOCK" -n .
```

Bloquear se:

- mock for usado por tela produtiva;
- mock servir como fallback quando API falha;
- mock alterar fluxo de autenticação real;
- mock/store for reescrito fora de escopo;
- flags mockadas forem usadas em runtime produtivo.

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

Exceção conhecida:

```text
LoginForm.tsx::empresaId como código autorizado da empresa no contrato legado de login.
```

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
