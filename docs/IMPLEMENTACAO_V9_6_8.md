# logosoft frontend v9.6.8 — Financeiro completo

## Escopo

Esta versão implementa o módulo Financeiro usando o contrato real do backend v9.8.

## Endpoints usados

- `GET /api/financeiro/formas-pagamento?empresaId={empresaId}`
- `POST /api/financeiro/formas-pagamento`
- `PUT /api/financeiro/formas-pagamento/{id}`
- `POST /api/financeiro/formas-pagamento/{id}/inativar`
- `GET /api/financeiro/condicoes-pagamento?empresaId={empresaId}`
- `POST /api/financeiro/condicoes-pagamento`
- `PUT /api/financeiro/condicoes-pagamento/{id}`
- `POST /api/financeiro/condicoes-pagamento/{id}/inativar`
- `GET /api/financeiro/contas-receber`
- `GET /api/financeiro/contas-receber/{id}`
- `POST /api/financeiro/contas-receber`
- `POST /api/financeiro/contas-receber/pedido-venda/{pedidoVendaId}`
- `POST /api/financeiro/contas-receber/{id}/receber`
- `POST /api/financeiro/contas-receber/{id}/estornar-recebimento`
- `POST /api/financeiro/contas-receber/{id}/cancelar`
- `GET /api/financeiro/contas-pagar`
- `GET /api/financeiro/contas-pagar/{id}`
- `POST /api/financeiro/contas-pagar`
- `POST /api/financeiro/contas-pagar/{id}/pagar`
- `POST /api/financeiro/contas-pagar/{id}/estornar-pagamento`
- `POST /api/financeiro/contas-pagar/{id}/cancelar`

## Implementado

- Formas de pagamento com criar, editar e inativar com motivo.
- Condições de pagamento com criar, editar e inativar com motivo.
- Contas a receber com criação manual, baixa/recebimento, estorno e cancelamento.
- Geração de conta a receber a partir de pedido de venda.
- Contas a pagar com criação manual, pagamento, estorno e cancelamento.
- Dropdown pesquisável de empresa/filial; payload envia apenas referência técnica.
- Formas de pagamento filtradas por recebimento ou pagamento conforme a operação.
- Enums enviados como números.
- Payloads sanitizados contra referência técnica inválido, string vazia, `0` e `99`.
- Rodapé ajustado para `© logosoft v9.6.8`.

## Permissões

- `FINANCEIRO_CONSULTAR`
- `FINANCEIRO_GERENCIAR`
- `FINANCEIRO_RECEBER`
- `FINANCEIRO_PAGAR`
- `FINANCEIRO_ESTORNAR`
- `FINANCEIRO_CANCELAR`
- `FORMAS_PAGAMENTO_GERENCIAR`
- `CONDICOES_PAGAMENTO_GERENCIAR`

## Testes adicionados

- `tests/unit/financeiroPayload.test.ts`

## Observações

A geração de conta a receber por pedido usa o referência técnica do pedido de venda informado pelo usuário porque o contrato não define endpoint de busca resumida de pedidos faturados para autocomplete financeiro.
