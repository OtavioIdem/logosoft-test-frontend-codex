const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

const isAbsent = (value: number | null | undefined): value is null | undefined =>
    value === null || value === undefined || Number.isNaN(value);

/**
 * Valor que o contrato do backend declara obrigatório. Ausência é defeito de
 * contrato, não estado de tela: em desenvolvimento a célula denuncia o campo
 * ausente; em produção degrada para "—" em vez de mascarar com "R$ 0,00".
 */
export const formatMoney = (value: number | null | undefined): string => {
    if (isAbsent(value)) {
        return process.env.NODE_ENV === 'production' ? '—' : 'valor ausente (contrato)';
    }

    return currencyFormatter.format(value);
};

/**
 * Valor que o contrato declara opcional. Ausência é informação, não defeito —
 * por isso exige declaração explícita no ponto de chamada em vez de herdar o
 * comportamento de `formatMoney`.
 */
export const formatMoneyOptional = (value: number | null | undefined, fallback = '—'): string => {
    if (isAbsent(value)) {
        return fallback;
    }

    return currencyFormatter.format(value);
};
