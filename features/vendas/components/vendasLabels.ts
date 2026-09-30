// Textos novos da tela de Vendas (b69, D79). Mantido separado do componente para não
// espalhar texto direto no JSX, no mesmo padrão de outras features com `*Labels.ts`.
export const vendasLabels = {
    aprovacao: {
        resumoCarregando: 'Carregando resumo do pedido…',
        resumoIndisponivel: 'Não foi possível carregar o resumo do pedido para conferência antes de aprovar.',
        reservarEstoqueAjuda:
            'Reserva o saldo no estoque básico (o mesmo que Compras e Vendas integram), para cada item que controla estoque e ainda não tem reserva.'
    },
    // b71 (D95/D96): o Faturar de Vendas é lógico -- `FaturarPedidoVendaUseCase.cs:39-79` baixa o estoque (se
    // pedido) e marca o pedido Faturado, sem NF nem título; com o pedido Faturado, o Preparar do módulo
    // Faturamento recusa (`PedidoVenda.cs:190-194`).
    faturamento: {
        resumoIndisponivel: 'Não foi possível carregar o resumo do pedido para conferência antes de faturar.',
        efeito:
            'Faturamento lógico: baixa o estoque (se marcado abaixo) e marca o pedido como Faturado. Não gera nota fiscal nem conta a receber. Depois disso, o pedido não pode mais ser faturado pelo módulo Faturamento.',
        documentoRotulo: 'Documento',
        documentoAjuda: 'Opcional, até 80 caracteres. Vai para o registro da baixa de estoque.',
        observacaoRotulo: 'Observação',
        toastSucesso: 'Pedido faturado (lógico)',
        toastComBaixa: 'Estoque baixado. Nota fiscal e conta a receber não foram geradas.',
        toastSemBaixa: 'Sem baixa de estoque. Nota fiscal e conta a receber não foram geradas.'
    }
};
