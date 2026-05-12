# logosoft frontend v10.0.7 — Referências amigáveis globais

## Objetivo

Revisar campos que enviam GUID no payload para que a interface mostre nome, código, número ou descrição, mantendo o envio técnico apenas no payload.

## Alterações

- Pedido de venda passa a montar opções de cliente com código + pessoa, inclusive na criação.
- Vínculo de fornecedor no produto passa a exibir código + pessoa, sem `pessoaId` cru.
- Reserva de estoque não exibe mais `OrigemId`; quando a origem é Vendas, seleciona o pedido pelo número.
- Textos de ajuda foram ajustados para dizer que o vínculo correto será enviado automaticamente, sem falar em GUID ou referência técnica para o usuário.
- `validate:source` passou a bloquear rótulos visíveis com identificadores técnicos como `OrigemId`, `GUID` e `ID técnico`.

## Regra mantida

O backend continua recebendo GUID nos campos exigidos pelo contrato. A diferença é que o usuário seleciona ou visualiza entidades por nomes amigáveis.
