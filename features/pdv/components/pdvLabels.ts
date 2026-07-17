import { MeioPagamento, StatusCaixa, StatusVendaPdv, TipoMovimentoCaixa } from '@/features/pdv/types/pdv.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

export const statusCaixaLabel = (value: number) => (n(value) === StatusCaixa.Aberto ? 'Aberto' : 'Fechado');
export const statusCaixaSeverity = (value: number): Severity => (n(value) === StatusCaixa.Aberto ? 'success' : null);

export const statusVendaLabel = (value: number) => {
    const map: Record<number, string> = {
        [StatusVendaPdv.EmDigitacao]: 'Em digitação',
        [StatusVendaPdv.Finalizada]: 'Finalizada',
        [StatusVendaPdv.Cancelada]: 'Cancelada'
    };
    return map[n(value)] ?? String(value);
};
export const statusVendaSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusVendaPdv.Finalizada:
            return 'success';
        case StatusVendaPdv.Cancelada:
            return 'danger';
        default:
            return 'warning';
    }
};

export const meioPagamentoLabel = (value: number) => {
    const map: Record<number, string> = {
        [MeioPagamento.Dinheiro]: 'Dinheiro',
        [MeioPagamento.Cartao]: 'Cartão',
        [MeioPagamento.Pix]: 'Pix',
        [MeioPagamento.Outro]: 'Outro'
    };
    return map[n(value)] ?? String(value);
};

export const meioPagamentoOptions = [
    { label: 'Dinheiro', value: MeioPagamento.Dinheiro },
    { label: 'Cartão', value: MeioPagamento.Cartao },
    { label: 'Pix', value: MeioPagamento.Pix },
    { label: 'Outro', value: MeioPagamento.Outro }
];

export const tipoMovimentoLabel = (value: number) => {
    const map: Record<number, string> = {
        [TipoMovimentoCaixa.Abertura]: 'Abertura',
        [TipoMovimentoCaixa.Suprimento]: 'Suprimento',
        [TipoMovimentoCaixa.Sangria]: 'Sangria',
        [TipoMovimentoCaixa.RecebimentoVenda]: 'Recebimento'
    };
    return map[n(value)] ?? String(value);
};

export const isCaixaAberto = (status: number) => n(status) === StatusCaixa.Aberto;
