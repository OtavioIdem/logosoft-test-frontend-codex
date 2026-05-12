export const formatMoney = (value: number | null | undefined) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value ?? 0);
};
