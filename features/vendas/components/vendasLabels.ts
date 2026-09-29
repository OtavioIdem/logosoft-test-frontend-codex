// Textos novos da tela de Vendas (b69, D79). Mantido separado do componente para não
// espalhar texto direto no JSX, no mesmo padrão de outras features com `*Labels.ts`.
export const vendasLabels = {
    aprovacao: {
        resumoCarregando: 'Carregando resumo do pedido…',
        resumoIndisponivel: 'Não foi possível carregar o resumo do pedido para conferência antes de aprovar.',
        reservarEstoqueAjuda:
            'Reserva o saldo no estoque básico (o mesmo que Compras e Vendas integram), para cada item que controla estoque e ainda não tem reserva.'
    }
};
