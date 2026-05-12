# logosoft frontend v10.0.10

## Escopo

Refinamento UX de Compras, mantendo os endpoints e payloads oficiais do contrato do backend.

## Implementado

- Cards de resumo em `Compras > Pedidos de compra`.
- Fluxo visual de status no detalhe do pedido de compra.
- Painéis de próxima ação, bloqueios operacionais e impacto de estoque/financeiro.
- Totais do pedido com quantidade de itens, desconto percentual e total.
- Modal de recebimento com resumo dos itens selecionados, total previsto, total informado, geração financeira e alerta para recebimento acima do pedido.
- Botão Receber bloqueado até haver documento e ao menos um item selecionado.
- Referências técnicas continuam ocultas na interface; o usuário visualiza número, código, nome ou descrição.

## Validação local recomendada

```bash
nvm use
npm install
npm run validate
npm run build
```
