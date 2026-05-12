# Implementação v9.6.9 — Compras

## Escopo

Implementa o módulo de Compras com contratos reais do backend v9.8 para pedidos de compra.

## Endpoints usados

- `GET /api/compras/pedidos`
- `GET /api/compras/pedidos/{id}`
- `POST /api/compras/pedidos`
- `PUT /api/compras/pedidos/{id}`
- `POST /api/compras/pedidos/{id}/itens`
- `PUT /api/compras/pedidos/{id}/itens/{itemId}`
- `POST /api/compras/pedidos/{id}/itens/{itemId}/remover`
- `POST /api/compras/pedidos/{id}/enviar-para-aprovacao`
- `POST /api/compras/pedidos/{id}/aprovar`
- `POST /api/compras/pedidos/{id}/cancelar`
- `POST /api/compras/pedidos/{id}/receber`

## Regras de UI aplicadas

- Rascunho permite edição de cabeçalho e itens.
- Pedido sem item não habilita envio para aprovação.
- Aguardando aprovação permite aprovar.
- Aprovado ou parcialmente recebido permite receber.
- Cancelamento e remoção de item exigem motivo.
- Recebimento exibe produto e local por nome/código; o payload envia apenas referência técnica.
- Campos técnicos de relacionamento não são expostos como referência técnica para o usuário.

## Permissões

- `COMPRAS_CONSULTAR`
- `COMPRAS_GERENCIAR`
- `COMPRAS_APROVAR`
- `COMPRAS_CANCELAR`
- `COMPRAS_RECEBER`

## Testes

- `tests/unit/comprasPayload.test.ts` valida payloads de criação, item e recebimento.

## Observação

O backend permanece como fonte final para regras de negócio, estoque, financeiro, tolerância de recebimento e permissões.
