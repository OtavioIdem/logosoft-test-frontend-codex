import { StatusContaFinanceira } from '@/features/financeiro-avancado/types/financeiroAvancado.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

export const statusContaLabel = (value: number) => {
    const map: Record<number, string> = {
        [StatusContaFinanceira.Aberta]: 'Aberta',
        [StatusContaFinanceira.ParcialmenteBaixada]: 'Parcial',
        [StatusContaFinanceira.Quitada]: 'Quitada',
        [StatusContaFinanceira.Cancelada]: 'Cancelada',
        [StatusContaFinanceira.Estornada]: 'Estornada'
    };
    return map[n(value)] ?? String(value);
};

export const statusContaSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusContaFinanceira.Quitada:
            return 'success';
        case StatusContaFinanceira.Cancelada:
            return 'danger';
        case StatusContaFinanceira.Estornada:
            return 'warning';
        case StatusContaFinanceira.ParcialmenteBaixada:
            return 'info';
        default:
            return null;
    }
};

export const statusContaOptions = [
    { label: 'Todos os status', value: null },
    { label: 'Aberta', value: StatusContaFinanceira.Aberta },
    { label: 'Parcialmente baixada', value: StatusContaFinanceira.ParcialmenteBaixada },
    { label: 'Quitada', value: StatusContaFinanceira.Quitada },
    { label: 'Cancelada', value: StatusContaFinanceira.Cancelada },
    { label: 'Estornada', value: StatusContaFinanceira.Estornada }
];

export const contaPodeBaixar = (status: number) => [StatusContaFinanceira.Aberta, StatusContaFinanceira.ParcialmenteBaixada].includes(n(status));
export const contaPodeCancelar = (status: number) => ![StatusContaFinanceira.Cancelada, StatusContaFinanceira.Quitada].includes(n(status));
