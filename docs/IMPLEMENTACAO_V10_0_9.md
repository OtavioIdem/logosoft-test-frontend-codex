# logosoft frontend v10.0.9

## Foco

Refinamento UX de Vendas para aproximar o fluxo do uso operacional real do ERP.

## Entregas

- Painel de fluxo do pedido no detalhe de venda.
- Painel de ações disponíveis por status.
- Painel de bloqueios visuais para pedidos sem item, cancelados ou faturados.
- Totais do pedido com quantidade de itens e percentual de desconto.
- Cards de resumo na listagem de pedidos.
- Testes unitários das regras visuais de pedido de venda.

## Regras mantidas

- Sem exposição de identificadores técnicos quando houver nome/código/descrição disponível.
- Payload continua enviando GUID quando o backend exige.
- Sem `console.*`.
- Docker em Node 24.
