# Implementacao v1.11.0a4 - Skeleton loading

Versao anterior aplicada: `v1.11.0a3`.

## Causa

Durante consultas reais da API, algumas telas ficavam visualmente paradas ou exibiam uma area vazia ate o retorno dos dados. A melhoria desta versao adiciona skeletons proporcionais ao conteudo esperado para reduzir a percepcao de travamento e manter a estrutura da tela estavel.

## Alteracoes realizadas

- `components/feedback/LoadingState.tsx`
  - Refatorado para suportar variantes `table`, `detail`, `metrics` e `panel`.
  - Adicionado `aria-busy` e label acessivel de carregamento.
  - Criados esqueletos responsivos para tabelas, fichas de detalhe, cards de metricas e paineis.

- `components/data/DataTableServer.tsx`
  - Passa a renderizar `LoadingState variant="table"` quando `loading` esta ativo e ainda nao ha registros.
  - Mantem o `DataTable` normal para recarregamentos com dados ja existentes.

- Telas de listagem
  - Removidos `LoadingState` locais que duplicavam o carregamento.
  - Listagens passam a depender do comportamento central do `DataTableServer`.
  - Impacta Administracao, Pessoas, Clientes, Fornecedores, Produtos, Estoque, Vendas, Compras, Financeiro, Seguranca e Auditoria.

- Detalhes de pedidos
  - `features/vendas/components/PedidoVendaDetalhePage.tsx` usa skeleton de detalhe.
  - `features/compras/components/PedidoCompraDetalhePage.tsx` usa skeleton de detalhe.

- Dashboard e Estoque
  - Dashboard usa skeleton de metricas no carregamento inicial e evita exibir estado vazio de auditoria enquanto ainda carrega.
  - Saldos de estoque usa skeleton nos cards de resumo antes de exibir valores reais.

## Regras preservadas

- Nenhum endpoint foi criado ou alterado.
- Nenhum payload foi alterado.
- Nenhum mock foi introduzido.
- Nenhum `console.*` foi adicionado.
- Permissoes, rotas e a integracao real via Axios permanecem inalteradas.

## Validacao

Executar:

```bash
npm run validate:source
npm run build
```

