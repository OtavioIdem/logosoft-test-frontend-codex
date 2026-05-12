# Implementação v10.0.13.2

Correção incremental dentro da linha v10.0.13.

## Objetivo

Fechar o desalinhamento entre as ações de navegação já existentes nas listagens de Vendas/Compras e as rotas reais disponíveis no App Router.

## Problema encontrado

As telas de listagem já apontavam para:

- `/vendas/pedidos/novo`
- `/vendas/pedidos/{id}`
- `/compras/pedidos/novo`
- `/compras/pedidos/{id}`

Porém o pacote continha apenas:

- `/vendas/pedidos`
- `/compras/pedidos`

Os componentes de detalhe já existiam em `features`, mas não estavam conectados às rotas do Next.js.

## Arquivos adicionados

- `app/(main)/vendas/pedidos/novo/page.tsx`
- `app/(main)/vendas/pedidos/[id]/page.tsx`
- `app/(main)/compras/pedidos/novo/page.tsx`
- `app/(main)/compras/pedidos/[id]/page.tsx`

## Estratégia

- Reutilizar `PedidoVendaDetalhePage` e `PedidoCompraDetalhePage`, sem duplicar regra visual ou chamada de API.
- Na rota `novo`, renderizar o detalhe sem `pedidoId`.
- Na rota `[id]`, repassar `params.id` como `pedidoId`.
- Manter permissões e regras de ação dentro dos componentes existentes.

## Validação executada

```bash
npm run validate:source
```

Resultado esperado: validação de fonte sem regressões conhecidas.

## Não executado neste ambiente

- `npm install`
- `npm run build`
- `docker build`

Essas validações devem ser executadas no ambiente Node 24/npm 11 com acesso ao registry npm.
