import { StatusCotacaoCompra, StatusSolicitacaoCompra, TipoDivergenciaRecebimento } from '@/features/compras-avancado/types/comprasAvancado.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

export const statusSolicitacaoLabel = (value: number) => {
    const map: Record<number, string> = {
        [StatusSolicitacaoCompra.Aberta]: 'Aberta',
        [StatusSolicitacaoCompra.Aprovada]: 'Aprovada',
        [StatusSolicitacaoCompra.Atendida]: 'Atendida',
        [StatusSolicitacaoCompra.Cancelada]: 'Cancelada'
    };
    return map[n(value)] ?? String(value);
};
export const statusSolicitacaoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusSolicitacaoCompra.Aprovada:
        case StatusSolicitacaoCompra.Atendida:
            return 'success';
        case StatusSolicitacaoCompra.Cancelada:
            return 'danger';
        default:
            return 'info';
    }
};

export const statusCotacaoLabel = (value: number) => {
    const map: Record<number, string> = {
        [StatusCotacaoCompra.Aberta]: 'Aberta',
        [StatusCotacaoCompra.Aprovada]: 'Aprovada',
        [StatusCotacaoCompra.Recusada]: 'Recusada',
        [StatusCotacaoCompra.Cancelada]: 'Cancelada'
    };
    return map[n(value)] ?? String(value);
};
export const statusCotacaoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusCotacaoCompra.Aprovada:
            return 'success';
        case StatusCotacaoCompra.Recusada:
        case StatusCotacaoCompra.Cancelada:
            return 'danger';
        default:
            return 'info';
    }
};

export const tipoDivergenciaLabel = (value: number) => {
    const map: Record<number, string> = {
        [TipoDivergenciaRecebimento.QuantidadeAcimaDoPedido]: 'Quantidade acima do pedido',
        [TipoDivergenciaRecebimento.ValorUnitarioDivergente]: 'Valor unitário divergente',
        [TipoDivergenciaRecebimento.ValorFiscalDivergente]: 'Valor fiscal divergente'
    };
    return map[n(value)] ?? String(value);
};

export const statusSolicitacaoOptions = [
    { label: 'Todos os status', value: null },
    { label: 'Aberta', value: StatusSolicitacaoCompra.Aberta },
    { label: 'Aprovada', value: StatusSolicitacaoCompra.Aprovada },
    { label: 'Atendida', value: StatusSolicitacaoCompra.Atendida },
    { label: 'Cancelada', value: StatusSolicitacaoCompra.Cancelada }
];
export const statusCotacaoOptions = [
    { label: 'Todos os status', value: null },
    { label: 'Aberta', value: StatusCotacaoCompra.Aberta },
    { label: 'Aprovada', value: StatusCotacaoCompra.Aprovada },
    { label: 'Recusada', value: StatusCotacaoCompra.Recusada },
    { label: 'Cancelada', value: StatusCotacaoCompra.Cancelada }
];

const s = (v: unknown) => n(v);
export const solicitacaoPodeGerenciar = (status: number) => s(status) === StatusSolicitacaoCompra.Aberta;
export const cotacaoPodeGerenciar = (status: number) => s(status) === StatusCotacaoCompra.Aberta;
