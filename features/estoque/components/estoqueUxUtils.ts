import { StatusInventario, StatusReservaEstoque, TipoMovimentoEstoque } from '@/types/erp';
import { EstoqueSaldoResponse, InventarioResponse, MovimentoEstoqueResponse, ReservaEstoqueResponse } from '@/features/estoque/types/estoque.types';

type TagSeverity = 'success' | 'info' | 'warning' | 'danger' | undefined;

const numberOrZero = (value: number | null | undefined): number => Number(value ?? 0);

export const movimentoEstoqueLabel = (tipo?: number | string | null): string => {
    const labels: Record<number, string> = {
        [TipoMovimentoEstoque.Entrada]: 'Entrada',
        [TipoMovimentoEstoque.Saida]: 'Saída',
        [TipoMovimentoEstoque.AjusteEntrada]: 'Ajuste de entrada',
        [TipoMovimentoEstoque.AjusteSaida]: 'Ajuste de saída',
        [TipoMovimentoEstoque.Reserva]: 'Reserva',
        [TipoMovimentoEstoque.BaixaReserva]: 'Baixa de reserva',
        [TipoMovimentoEstoque.CancelamentoReserva]: 'Cancelamento de reserva'
    };
    return labels[Number(tipo)] ?? String(tipo ?? '-');
};

export const movimentoEstoqueSeverity = (tipo?: number | string | null): TagSeverity => {
    const value = Number(tipo);
    if ([TipoMovimentoEstoque.Entrada, TipoMovimentoEstoque.AjusteEntrada, TipoMovimentoEstoque.CancelamentoReserva].includes(value)) return 'success';
    if ([TipoMovimentoEstoque.Saida, TipoMovimentoEstoque.AjusteSaida, TipoMovimentoEstoque.BaixaReserva].includes(value)) return 'danger';
    if (value === TipoMovimentoEstoque.Reserva) return 'warning';
    return 'info';
};

export const movimentoImpactoLabel = (tipo?: number | string | null): string => {
    const value = Number(tipo);
    if ([TipoMovimentoEstoque.Entrada, TipoMovimentoEstoque.AjusteEntrada].includes(value)) return 'Aumenta saldo físico';
    if ([TipoMovimentoEstoque.Saida, TipoMovimentoEstoque.AjusteSaida].includes(value)) return 'Reduz saldo físico';
    if (value === TipoMovimentoEstoque.Reserva) return 'Compromete saldo disponível';
    if (value === TipoMovimentoEstoque.BaixaReserva) return 'Baixa reserva e estoque';
    if (value === TipoMovimentoEstoque.CancelamentoReserva) return 'Libera saldo reservado';
    return 'Impacto controlado pelo backend';
};

export const reservaStatusLabel = (status?: number | string | null): string => {
    const labels: Record<number, string> = {
        [StatusReservaEstoque.Ativa]: 'Ativa',
        [StatusReservaEstoque.ParcialmenteBaixada]: 'Parcialmente baixada',
        [StatusReservaEstoque.Baixada]: 'Baixada',
        [StatusReservaEstoque.Cancelada]: 'Cancelada'
    };
    return labels[Number(status)] ?? String(status ?? '-');
};

export const reservaStatusSeverity = (status?: number | string | null): TagSeverity => {
    const value = Number(status);
    if (value === StatusReservaEstoque.Ativa) return 'warning';
    if (value === StatusReservaEstoque.ParcialmenteBaixada) return 'info';
    if (value === StatusReservaEstoque.Baixada) return 'success';
    if (value === StatusReservaEstoque.Cancelada) return 'danger';
    return 'info';
};

const inventarioStatusText = (status?: number | string | null) => String(status ?? '').trim().toLowerCase();
export const isInventarioEmContagem = (status?: number | string | null): boolean => inventarioStatusText(status).includes('contagem');

export const inventarioStatusLabel = (status?: number | string | null): string => {
    if (isInventarioEmContagem(status)) return 'Em contagem';
    const labels: Record<number, string> = {
        [StatusInventario.Aberto]: 'Aberto',
        [StatusInventario.Fechado]: 'Fechado',
        [StatusInventario.Cancelado]: 'Cancelado'
    };
    return labels[Number(status)] ?? String(status ?? '-');
};

export const inventarioStatusSeverity = (status?: number | string | null): TagSeverity => {
    if (isInventarioEmContagem(status)) return 'info';
    const value = Number(status);
    if (value === StatusInventario.Aberto) return 'warning';
    if (value === StatusInventario.Fechado) return 'success';
    if (value === StatusInventario.Cancelado) return 'danger';
    return 'info';
};

export const calcularResumoSaldos = (records: EstoqueSaldoResponse[]) => ({
    produtosComSaldo: new Set(records.map((record) => record.produtoId)).size,
    locaisComSaldo: new Set(records.map((record) => record.localEstoqueId)).size,
    quantidadeAtual: records.reduce((total, record) => total + numberOrZero(record.quantidadeAtual), 0),
    quantidadeReservada: records.reduce((total, record) => total + numberOrZero(record.quantidadeReservada), 0),
    quantidadeDisponivel: records.reduce((total, record) => total + numberOrZero(record.quantidadeDisponivel), 0),
    saldosIndisponiveis: records.filter((record) => numberOrZero(record.quantidadeDisponivel) <= 0).length
});

export const calcularResumoMovimentos = (records: MovimentoEstoqueResponse[]) => ({
    totalMovimentos: records.length,
    entradas: records.filter((record) => [TipoMovimentoEstoque.Entrada, TipoMovimentoEstoque.AjusteEntrada].includes(Number(record.tipoMovimento))).length,
    saidas: records.filter((record) => [TipoMovimentoEstoque.Saida, TipoMovimentoEstoque.AjusteSaida, TipoMovimentoEstoque.BaixaReserva].includes(Number(record.tipoMovimento))).length,
    reservas: records.filter((record) => [TipoMovimentoEstoque.Reserva, TipoMovimentoEstoque.CancelamentoReserva].includes(Number(record.tipoMovimento))).length,
    quantidadeMovimentada: records.reduce((total, record) => total + Math.abs(numberOrZero(record.quantidade)), 0)
});

export const calcularResumoReservas = (records: ReservaEstoqueResponse[]) => ({
    totalReservas: records.length,
    ativas: records.filter((record) => Number(record.statusReserva ?? record.status) === StatusReservaEstoque.Ativa).length,
    parcialmenteBaixadas: records.filter((record) => Number(record.statusReserva ?? record.status) === StatusReservaEstoque.ParcialmenteBaixada).length,
    baixadas: records.filter((record) => Number(record.statusReserva ?? record.status) === StatusReservaEstoque.Baixada).length,
    canceladas: records.filter((record) => Number(record.statusReserva ?? record.status) === StatusReservaEstoque.Cancelada).length,
    quantidadeReservada: records.reduce((total, record) => total + numberOrZero(record.quantidade), 0)
});

export const calcularResumoInventarios = (records: InventarioResponse[]) => ({
    totalInventarios: records.length,
    abertos: records.filter((record) => Number(record.statusInventario ?? record.status) === StatusInventario.Aberto).length,
    emContagem: records.filter((record) => isInventarioEmContagem(record.statusInventario ?? record.status)).length,
    fechados: records.filter((record) => Number(record.statusInventario ?? record.status) === StatusInventario.Fechado).length,
    cancelados: records.filter((record) => Number(record.statusInventario ?? record.status) === StatusInventario.Cancelado).length,
    itensContados: records.reduce((total, record) => total + (record.itens?.length ?? 0), 0)
});

export const estoqueOperacaoImpactos = (kind: 'entrada' | 'saida' | 'ajuste') => {
    const impactos = {
        entrada: [
            'Aumenta o saldo físico do produto no local selecionado.',
            'Registra movimento rastreável com documento e motivo.',
            'Pode criar saldo quando o produto/local ainda não existir no backend.'
        ],
        saida: [
            'Reduz o saldo disponível do produto no local selecionado.',
            'O backend deve bloquear saída quando não houver saldo suficiente.',
            'Registra motivo e documento para rastreabilidade operacional.'
        ],
        ajuste: [
            'Não altera saldo diretamente; envia quantidade contada para o backend.',
            'O backend calcula a diferença e registra movimento de ajuste.',
            'Não deve deixar saldo menor que a quantidade reservada.'
        ]
    };
    return impactos[kind];
};
