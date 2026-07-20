import { StatusBoleto, TipoCobranca } from '@/features/bancos/types/bancos.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const tipoCobrancaMap: Record<number, string> = {
    [TipoCobranca.SimplesComRegistro]: 'Simples com registro',
    [TipoCobranca.SimplesSemRegistro]: 'Simples sem registro',
    [TipoCobranca.Caucionada]: 'Caucionada',
    [TipoCobranca.Descontada]: 'Descontada',
    [TipoCobranca.Vinculada]: 'Vinculada'
};

const statusBoletoMap: Record<number, string> = {
    [StatusBoleto.EmAberto]: 'Em aberto',
    [StatusBoleto.Registrado]: 'Registrado',
    [StatusBoleto.Liquidado]: 'Liquidado',
    [StatusBoleto.Baixado]: 'Baixado',
    [StatusBoleto.Cancelado]: 'Cancelado'
};

export const tipoCobrancaLabel = (value: number) => labelFromMap(tipoCobrancaMap, value);
export const statusBoletoLabel = (value: number) => labelFromMap(statusBoletoMap, value);

export const tipoCobrancaOptions = optionsFromMap(tipoCobrancaMap);
export const statusBoletoFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusBoletoMap)];

export const statusBoletoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusBoleto.Liquidado:
            return 'success';
        case StatusBoleto.Registrado:
            return 'info';
        case StatusBoleto.Cancelado:
        case StatusBoleto.Baixado:
            return 'danger';
        default:
            return 'warning';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const boletoPodeCancelar = (status: number) => [StatusBoleto.EmAberto, StatusBoleto.Registrado].includes(n(status));
