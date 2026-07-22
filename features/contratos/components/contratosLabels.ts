import { PeriodicidadeContrato, StatusContrato, TipoFaturamentoContrato } from '@/features/contratos/types/contratos.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const tipoFaturamentoMap: Record<number, string> = {
    [TipoFaturamentoContrato.Recorrente]: 'Recorrente (valor fixo)',
    [TipoFaturamentoContrato.Consumo]: 'Consumo (franquia + excedente)'
};

const periodicidadeMap: Record<number, string> = {
    [PeriodicidadeContrato.Mensal]: 'Mensal',
    [PeriodicidadeContrato.Bimestral]: 'Bimestral',
    [PeriodicidadeContrato.Trimestral]: 'Trimestral',
    [PeriodicidadeContrato.Semestral]: 'Semestral',
    [PeriodicidadeContrato.Anual]: 'Anual'
};

const statusContratoMap: Record<number, string> = {
    [StatusContrato.Rascunho]: 'Rascunho',
    [StatusContrato.Aprovado]: 'Aprovado',
    [StatusContrato.Encerrado]: 'Encerrado',
    [StatusContrato.Cancelado]: 'Cancelado'
};

export const tipoFaturamentoLabel = (value: number) => labelFromMap(tipoFaturamentoMap, value);
export const periodicidadeLabel = (value: number) => labelFromMap(periodicidadeMap, value);
export const statusContratoLabel = (value: number) => labelFromMap(statusContratoMap, value);

export const tipoFaturamentoOptions = optionsFromMap(tipoFaturamentoMap);
export const periodicidadeOptions = optionsFromMap(periodicidadeMap);
export const statusContratoFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusContratoMap)];

export const statusContratoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusContrato.Aprovado:
            return 'success';
        case StatusContrato.Encerrado:
            return 'info';
        case StatusContrato.Cancelado:
            return 'danger';
        default:
            return 'warning';
    }
};

export const isFaturamentoConsumo = (tipo: number) => n(tipo) === TipoFaturamentoContrato.Consumo;

// Regras de transição de estado (UI). O backend é a autoridade final.
export const contratoPodeEditar = (status: number) => n(status) === StatusContrato.Rascunho;
export const contratoPodeAprovar = (status: number) => n(status) === StatusContrato.Rascunho;
export const contratoPodeFaturar = (status: number) => n(status) === StatusContrato.Aprovado;
export const contratoPodeReajustar = (status: number) => n(status) === StatusContrato.Aprovado;
export const contratoPodeRenovar = (status: number) => n(status) === StatusContrato.Aprovado;
export const contratoPodeEncerrar = (status: number) => n(status) === StatusContrato.Aprovado;
export const contratoPodeCancelar = (status: number) => [StatusContrato.Rascunho, StatusContrato.Aprovado].includes(n(status));
