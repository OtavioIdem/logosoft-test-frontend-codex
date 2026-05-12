# Implementação logosoft frontend v9

## v1-front — Fundação
- Next.js, TypeScript e PrimeReact.
- Template Sakai/PrimeReact preservado.
- Layout, providers, tema claro/escuro, variáveis de ambiente e estrutura modular.

## v2-front — Auth e Segurança
- Login, logout, sessão local controlada, refresh token via client HTTP.
- Menu e ações por permissões.
- Páginas de usuários e grupos de acesso.

## v3-front — Administração
- Empresas, filiais, setores, cargos e centros de custo.
- CNPJ alfanumérico nos cadastros de empresa/filial.
- Inativação com motivo e auditoria visual.

## v4-front — Pessoas, Clientes e Fornecedores
- Pessoas, clientes e fornecedores.
- Documento CPF/CNPJ com suporte a CNPJ alfanumérico.
- Limite de crédito, bloqueio/desbloqueio com motivo e LGPD visual.

## v5-front — Produtos
- Produtos, categorias, unidades de medida e marcas.
- Dados comerciais, fiscais, compra, venda e estoque.
- Permissão específica para dados fiscais.

## v6-front — Estoque
- Locais, saldos, movimentos, entradas, saídas, ajustes, reservas e inventários.
- Saldos tratados como consulta; movimentos e operações usam rotinas próprias.
- Baixa/cancelamento de reserva e fechamento/cancelamento de inventário com motivo quando aplicável.

## v7-front — Vendas
- Pedidos de venda com rascunho, envio para aprovação, aprovação, cancelamento e faturamento.
- Histórico de status e aviso de impacto em estoque/financeiro/fiscal.

## v8-front — Financeiro
- Formas, condições, contas a receber e contas a pagar.
- Recebimento/pagamento parcial e total, estorno e cancelamento.

## v9-front — Compras
- Pedidos de compra com aprovação, recebimento parcial/total, geração de conta a pagar parametrizada e flag de recebimento acima do pedido.

## Padrões aplicados
- Toast global para feedback.
- Nenhum uso de logging direto no código da aplicação.
- API clients por módulo.
- Hooks, schemas, types e tests por área.
- Mocks isolados para desenvolvimento e testes.
- Operações críticas protegidas por permissão e motivo obrigatório quando necessário.
