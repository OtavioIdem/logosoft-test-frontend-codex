# logosoft frontend v10.0.11

## Escopo

Refinamento UX do módulo de Estoque.

## Entregas

- Cards de resumo em Locais de estoque, Saldos, Movimentos, Reservas e Inventários.
- Rótulos amigáveis para tipos de movimento, status de reserva e status de inventário.
- Coluna de impacto operacional na consulta de movimentos.
- Painéis explicativos em Entrada, Saída e Ajuste para reforçar que saldo é consequência de movimentos.
- Reserva e inventário com status visual sem expor identificadores técnicos.
- Testes unitários para regras visuais de estoque.

## Cuidados mantidos

- A interface mostra produto, local, pedido e origem por código/nome/descrição quando possível.
- O payload segue enviando apenas os vínculos exigidos pelo backend.
- Não há alteração direta de saldo no frontend.
- Docker permanece em Node 24.
