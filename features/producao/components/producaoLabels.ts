import { StatusFichaTecnica, StatusOrdemProducao, TipoApontamentoProducao } from '@/features/producao/types/producao.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const statusFichaMap: Record<number, string> = {
    [StatusFichaTecnica.Rascunho]: 'Rascunho',
    [StatusFichaTecnica.Ativa]: 'Ativa',
    [StatusFichaTecnica.Inativa]: 'Inativa'
};

const statusOrdemMap: Record<number, string> = {
    [StatusOrdemProducao.Rascunho]: 'Rascunho',
    [StatusOrdemProducao.Liberada]: 'Liberada',
    [StatusOrdemProducao.EmProducao]: 'Em produção',
    [StatusOrdemProducao.Encerrada]: 'Encerrada',
    [StatusOrdemProducao.Cancelada]: 'Cancelada'
};

const tipoApontamentoMap: Record<number, string> = {
    [TipoApontamentoProducao.Consumo]: 'Consumo',
    [TipoApontamentoProducao.Horas]: 'Horas',
    [TipoApontamentoProducao.Perda]: 'Perda',
    [TipoApontamentoProducao.Produzido]: 'Produzido'
};

export const statusFichaLabel = (value: number) => labelFromMap(statusFichaMap, value);
export const statusOrdemProducaoLabel = (value: number) => labelFromMap(statusOrdemMap, value);
export const tipoApontamentoLabel = (value: number) => labelFromMap(tipoApontamentoMap, value);

export const tipoApontamentoOptions = optionsFromMap(tipoApontamentoMap);
export const statusFichaFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusFichaMap)];
export const statusOrdemFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusOrdemMap)];

export const statusFichaSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusFichaTecnica.Ativa:
            return 'success';
        case StatusFichaTecnica.Inativa:
            return 'danger';
        default:
            return 'warning';
    }
};

export const statusOrdemProducaoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusOrdemProducao.Encerrada:
            return 'success';
        case StatusOrdemProducao.Liberada:
        case StatusOrdemProducao.EmProducao:
            return 'info';
        case StatusOrdemProducao.Cancelada:
            return 'danger';
        default:
            return 'warning';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const fichaPodeComponentes = (status: number) => n(status) === StatusFichaTecnica.Rascunho;
export const fichaPodeAtivar = (status: number) => n(status) === StatusFichaTecnica.Rascunho;
export const fichaPodeInativar = (status: number) => n(status) === StatusFichaTecnica.Ativa;
export const ordemPodeLiberar = (status: number) => n(status) === StatusOrdemProducao.Rascunho;
export const ordemPodeApontar = (status: number) => [StatusOrdemProducao.Liberada, StatusOrdemProducao.EmProducao].includes(n(status));
export const ordemPodeEncerrar = (status: number) => [StatusOrdemProducao.Liberada, StatusOrdemProducao.EmProducao].includes(n(status));
export const ordemPodeCancelar = (status: number) => ![StatusOrdemProducao.Encerrada, StatusOrdemProducao.Cancelada].includes(n(status));
export const ordemMostraNecessidade = (status: number) => [StatusOrdemProducao.Rascunho, StatusOrdemProducao.Liberada, StatusOrdemProducao.EmProducao].includes(n(status));
