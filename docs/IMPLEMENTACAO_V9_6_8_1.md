# Implementação v9.6.8.1 — UX de referências por referência técnica

Esta versão corrige a experiência de uso de campos que enviam referência técnica no payload.

## Regra aplicada

O usuário não deve precisar ver ou digitar referência técnica técnico. Sempre que houver endpoint de consulta, o frontend deve exibir nome, código, número ou descrição e enviar apenas o referência técnica no payload.

## Correções realizadas

- Removido input técnico `Origem ID` da conta financeira.
- Para origem `Manual`, nenhuma referência de origem é exibida.
- Para origem `Pedido de venda`, a tela exibe dropdown pesquisável de pedidos.
- Para origem `Compra`, a tela exibe dropdown pesquisável de pedidos de compra.
- Outras origens sem endpoint de busca no frontend exibem orientação e não forçam digitação de referência técnica.
- O modal de gerar conta a receber por pedido passou a selecionar pedido por número/valor, não por referência técnica.
- Ajustado layout da área de parcelas.
- Ajustados botões superiores do financeiro.
- Removida a engrenagem de configuração visual do template.
- Rodapé exibe versão completa.
- Listagens revisadas para mostrar nomes/códigos no lugar de referência técnica quando os dados auxiliares estão disponíveis.

## Observação

O payload continua usando referência técnica conforme o contrato da API v9.8, mas a interface passa a esconder essa complexidade do usuário.
