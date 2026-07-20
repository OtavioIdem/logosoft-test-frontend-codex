import { OrigemInspecao, ResultadoCriterio, StatusAcaoCorretiva, StatusInspecao, StatusNaoConformidade } from '@/features/qualidade/types/qualidade.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const origemMap: Record<number, string> = {
    [OrigemInspecao.RecebimentoCompra]: 'Recebimento de compra',
    [OrigemInspecao.OrdemProducao]: 'Ordem de produção',
    [OrigemInspecao.Devolucao]: 'Devolução',
    [OrigemInspecao.Avulsa]: 'Avulsa'
};

const statusInspecaoMap: Record<number, string> = {
    [StatusInspecao.Aberta]: 'Aberta',
    [StatusInspecao.Aprovada]: 'Aprovada',
    [StatusInspecao.Reprovada]: 'Reprovada',
    [StatusInspecao.Encerrada]: 'Encerrada'
};

const resultadoMap: Record<number, string> = {
    [ResultadoCriterio.Pendente]: 'Pendente',
    [ResultadoCriterio.Conforme]: 'Conforme',
    [ResultadoCriterio.NaoConforme]: 'Não conforme'
};

const statusNaoConformidadeMap: Record<number, string> = {
    [StatusNaoConformidade.Aberta]: 'Aberta',
    [StatusNaoConformidade.EmTratamento]: 'Em tratamento',
    [StatusNaoConformidade.Encerrada]: 'Encerrada',
    [StatusNaoConformidade.Cancelada]: 'Cancelada'
};

const statusAcaoMap: Record<number, string> = {
    [StatusAcaoCorretiva.Pendente]: 'Pendente',
    [StatusAcaoCorretiva.EmAndamento]: 'Em andamento',
    [StatusAcaoCorretiva.Concluida]: 'Concluída',
    [StatusAcaoCorretiva.Cancelada]: 'Cancelada'
};

export const origemInspecaoLabel = (value: number) => labelFromMap(origemMap, value);
export const statusInspecaoLabel = (value: number) => labelFromMap(statusInspecaoMap, value);
export const resultadoCriterioLabel = (value: number) => labelFromMap(resultadoMap, value);
export const statusNaoConformidadeLabel = (value: number) => labelFromMap(statusNaoConformidadeMap, value);
export const statusAcaoLabel = (value: number) => labelFromMap(statusAcaoMap, value);

export const origemInspecaoOptions = optionsFromMap(origemMap);
export const origemInspecaoFilterOptions = [{ label: 'Todas as origens', value: null }, ...optionsFromMap(origemMap)];
export const statusInspecaoFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusInspecaoMap)];
export const statusNaoConformidadeFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusNaoConformidadeMap)];

export const statusInspecaoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusInspecao.Aprovada:
            return 'success';
        case StatusInspecao.Reprovada:
            return 'danger';
        case StatusInspecao.Encerrada:
            return 'info';
        default:
            return 'warning';
    }
};

export const resultadoCriterioSeverity = (value: number): Severity => {
    switch (n(value)) {
        case ResultadoCriterio.Conforme:
            return 'success';
        case ResultadoCriterio.NaoConforme:
            return 'danger';
        default:
            return 'warning';
    }
};

export const statusNaoConformidadeSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusNaoConformidade.Encerrada:
            return 'success';
        case StatusNaoConformidade.Cancelada:
            return 'info';
        case StatusNaoConformidade.EmTratamento:
            return 'warning';
        default:
            return 'danger';
    }
};

export const statusAcaoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusAcaoCorretiva.Concluida:
            return 'success';
        case StatusAcaoCorretiva.EmAndamento:
            return 'warning';
        case StatusAcaoCorretiva.Cancelada:
            return 'danger';
        default:
            return 'info';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const inspecaoPodeCriterios = (status: number) => n(status) === StatusInspecao.Aberta;
export const inspecaoPodeResultados = (status: number) => n(status) === StatusInspecao.Aberta;
export const inspecaoPodeAprovarReprovar = (status: number) => n(status) === StatusInspecao.Aberta;
export const inspecaoPodeEncerrar = (status: number) => [StatusInspecao.Aprovada, StatusInspecao.Reprovada].includes(n(status));
export const naoConformidadePodeAcoes = (status: number) => [StatusNaoConformidade.Aberta, StatusNaoConformidade.EmTratamento].includes(n(status));
export const naoConformidadePodeEncerrar = (status: number) => [StatusNaoConformidade.Aberta, StatusNaoConformidade.EmTratamento].includes(n(status));
export const acaoPodeIniciar = (status: number) => n(status) === StatusAcaoCorretiva.Pendente;
export const acaoPodeConcluir = (status: number) => n(status) === StatusAcaoCorretiva.EmAndamento;
export const acaoPodeCancelar = (status: number) => [StatusAcaoCorretiva.Pendente, StatusAcaoCorretiva.EmAndamento].includes(n(status));
