import { EstagioOportunidade, MotivoPerdaOportunidade, OrigemLead, StatusLead, StatusOportunidade, StatusProposta } from '@/features/crm/types/crm.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const origemLeadMap: Record<number, string> = {
    [OrigemLead.Site]: 'Site',
    [OrigemLead.Indicacao]: 'Indicação',
    [OrigemLead.Evento]: 'Evento',
    [OrigemLead.RedeSocial]: 'Rede social',
    [OrigemLead.Telefone]: 'Telefone',
    [OrigemLead.Outro]: 'Outro'
};

const statusLeadMap: Record<number, string> = {
    [StatusLead.Novo]: 'Novo',
    [StatusLead.Qualificado]: 'Qualificado',
    [StatusLead.Descartado]: 'Descartado'
};

const estagioMap: Record<number, string> = {
    [EstagioOportunidade.Qualificacao]: 'Qualificação',
    [EstagioOportunidade.Proposta]: 'Proposta',
    [EstagioOportunidade.Negociacao]: 'Negociação'
};

const statusOportunidadeMap: Record<number, string> = {
    [StatusOportunidade.Aberta]: 'Aberta',
    [StatusOportunidade.Ganha]: 'Ganha',
    [StatusOportunidade.Perdida]: 'Perdida',
    [StatusOportunidade.Convertida]: 'Convertida'
};

const motivoPerdaMap: Record<number, string> = {
    [MotivoPerdaOportunidade.Preco]: 'Preço',
    [MotivoPerdaOportunidade.Concorrencia]: 'Concorrência',
    [MotivoPerdaOportunidade.SemOrcamento]: 'Sem orçamento',
    [MotivoPerdaOportunidade.SemInteresse]: 'Sem interesse',
    [MotivoPerdaOportunidade.Prazo]: 'Prazo',
    [MotivoPerdaOportunidade.Outro]: 'Outro'
};

const statusPropostaMap: Record<number, string> = {
    [StatusProposta.Enviada]: 'Enviada',
    [StatusProposta.Aceita]: 'Aceita',
    [StatusProposta.Recusada]: 'Recusada'
};

export const origemLeadLabel = (value: number) => labelFromMap(origemLeadMap, value);
export const statusLeadLabel = (value: number) => labelFromMap(statusLeadMap, value);
export const estagioLabel = (value: number) => labelFromMap(estagioMap, value);
export const statusOportunidadeLabel = (value: number) => labelFromMap(statusOportunidadeMap, value);
export const motivoPerdaLabel = (value: number) => labelFromMap(motivoPerdaMap, value);
export const statusPropostaLabel = (value: number) => labelFromMap(statusPropostaMap, value);

export const origemLeadOptions = optionsFromMap(origemLeadMap);
export const estagioOptions = optionsFromMap(estagioMap);
export const motivoPerdaOptions = optionsFromMap(motivoPerdaMap);

export const statusLeadFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusLeadMap)];
export const estagioFilterOptions = [{ label: 'Todos os estágios', value: null }, ...optionsFromMap(estagioMap)];
export const statusOportunidadeFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusOportunidadeMap)];
export const statusPropostaFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusPropostaMap)];

export const statusLeadSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusLead.Qualificado:
            return 'success';
        case StatusLead.Descartado:
            return 'danger';
        default:
            return 'info';
    }
};

export const estagioSeverity = (value: number): Severity => {
    switch (n(value)) {
        case EstagioOportunidade.Negociacao:
            return 'warning';
        case EstagioOportunidade.Proposta:
            return 'info';
        default:
            return null;
    }
};

export const statusOportunidadeSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusOportunidade.Ganha:
        case StatusOportunidade.Convertida:
            return 'success';
        case StatusOportunidade.Perdida:
            return 'danger';
        default:
            return 'info';
    }
};

export const statusPropostaSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusProposta.Aceita:
            return 'success';
        case StatusProposta.Recusada:
            return 'danger';
        default:
            return 'info';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const leadPodeQualificar = (status: number) => n(status) === StatusLead.Novo;
export const leadPodeDescartar = (status: number) => n(status) === StatusLead.Novo;
export const oportunidadeAberta = (status: number) => n(status) === StatusOportunidade.Aberta;
export const oportunidadePodeConverter = (status: number) => n(status) === StatusOportunidade.Ganha;
export const propostaPodeDecidir = (status: number) => n(status) === StatusProposta.Enviada;
