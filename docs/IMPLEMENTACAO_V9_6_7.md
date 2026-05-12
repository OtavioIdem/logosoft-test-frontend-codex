# Implementação v9.6.7 — Vendas

Esta versão implementa o módulo de Pedidos de Venda conforme o contrato de API v9.8.

## Endpoints usados

- `GET /api/vendas/pedidos`
- `GET /api/vendas/pedidos/{id}`
- `POST /api/vendas/pedidos`
- `PUT /api/vendas/pedidos/{id}`
- `POST /api/vendas/pedidos/{id}/itens`
- `PUT /api/vendas/pedidos/{id}/itens/{itemId}`
- `POST /api/vendas/pedidos/{id}/itens/{itemId}/remover`
- `POST /api/vendas/pedidos/{id}/enviar-para-aprovacao`
- `POST /api/vendas/pedidos/{id}/aprovar`
- `POST /api/vendas/pedidos/{id}/cancelar`
- `POST /api/vendas/pedidos/{id}/faturar`

## Regras visuais implementadas

- Pedido em rascunho pode ser editado.
- Pedido sem item não habilita envio para aprovação.
- Pedido aguardando aprovação pode ser aprovado.
- Pedido aprovado pode ser faturado.
- Cancelamento exige motivo obrigatório.
- Remoção de item exige motivo obrigatório.
- Faturamento exige documento.

## Permissões aplicadas

- `VENDAS_CONSULTAR`
- `VENDAS_GERENCIAR`
- `VENDAS_APROVAR`
- `VENDAS_CANCELAR`
- `VENDAS_FATURAR`

## Melhoria transversal mantida

Os dropdowns de Empresa e Filial usam dados da API. Ao trocar a empresa, a filial é limpa e as opções são recarregadas para a empresa selecionada. O payload envia apenas registro válido ou `null`.

## Testes adicionados

- `tests/unit/vendasPayload.test.ts`
