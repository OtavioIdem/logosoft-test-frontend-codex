import { OrigemFinanceira, SelectOption, StatusContaFinanceira, StatusParcelaFinanceira } from '@/types/erp';

export const origemFinanceiraOptions: SelectOption<number>[] = [
    { label: 'Manual', value: OrigemFinanceira.Manual },
    { label: 'Pedido de venda', value: OrigemFinanceira.PedidoVenda },
    { label: 'Nota fiscal', value: OrigemFinanceira.NotaFiscal },
    { label: 'Compra', value: OrigemFinanceira.Compra },
    { label: 'Contrato', value: OrigemFinanceira.Contrato },
    { label: 'Ajuste autorizado', value: OrigemFinanceira.AjusteAutorizado }
];

export const statusContaOptions: SelectOption<number>[] = [
    { label: 'Aberta', value: StatusContaFinanceira.Aberta },
    { label: 'Parcialmente quitada', value: StatusContaFinanceira.ParcialmenteQuitada },
    { label: 'Quitada', value: StatusContaFinanceira.Quitada },
    { label: 'Cancelada', value: StatusContaFinanceira.Cancelada },
    { label: 'Estornada', value: StatusContaFinanceira.Estornada }
];

export const origemFinanceiraLabel = (value?: number | null) => origemFinanceiraOptions.find((option) => option.value === value)?.label ?? '-';
export const statusContaLabel = (value?: number | null) => statusContaOptions.find((option) => option.value === value)?.label ?? '-';

export const statusParcelaLabel = (value?: number | null) => {
    const map: Record<number, string> = {
        [StatusParcelaFinanceira.Aberta]: 'Aberta',
        [StatusParcelaFinanceira.ParcialmenteQuitada]: 'Parcial',
        [StatusParcelaFinanceira.Quitada]: 'Quitada',
        [StatusParcelaFinanceira.Cancelada]: 'Cancelada',
        [StatusParcelaFinanceira.Estornada]: 'Estornada'
    };
    return value ? map[value] ?? '-' : '-';
};

export const contaStatusTagValue = (value?: number | null) => {
    const map: Record<number, string> = {
        [StatusContaFinanceira.Aberta]: 'ABERTO',
        [StatusContaFinanceira.ParcialmenteQuitada]: 'PARCIAL',
        [StatusContaFinanceira.Quitada]: 'QUITADO',
        [StatusContaFinanceira.Cancelada]: 'CANCELADO',
        [StatusContaFinanceira.Estornada]: 'ESTORNADO'
    };
    return value ? map[value] ?? String(value) : '-';
};

export const isContaEncerrada = (value?: number | null) => value === StatusContaFinanceira.Quitada || value === StatusContaFinanceira.Cancelada || value === StatusContaFinanceira.Estornada;

export const formatMoney = (value?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
export const formatDate = (value?: string | Date | null) => {
    if (!value) return '-';
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR').format(date);
};

export const defaultParcela = () => ({ numero: 1, vencimento: new Date(), valor: 0 });


export const sumMoneyValues = (values: Array<number | null | undefined>): number => values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
export const countOpenFinancialRecords = <T extends { valorSaldo?: number | null }>(records: T[]): number => records.filter((record) => Number(record.valorSaldo ?? 0) > 0).length;
