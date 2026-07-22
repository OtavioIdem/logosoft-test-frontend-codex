import {
    GravidadeOcorrencia,
    StatusOcorrenciaAcesso,
    StatusPreAutorizacao,
    StatusRegistroAcesso,
    TipoAcesso,
    TipoDocumentoAcesso,
    TipoOcorrenciaAcesso
} from '@/features/portaria/types/portaria.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const tipoDocumentoMap: Record<number, string> = {
    [TipoDocumentoAcesso.Rg]: 'RG',
    [TipoDocumentoAcesso.Cpf]: 'CPF',
    [TipoDocumentoAcesso.Cnh]: 'CNH',
    [TipoDocumentoAcesso.Passaporte]: 'Passaporte',
    [TipoDocumentoAcesso.Outro]: 'Outro'
};

const tipoAcessoMap: Record<number, string> = {
    [TipoAcesso.Visitante]: 'Visitante',
    [TipoAcesso.Prestador]: 'Prestador',
    [TipoAcesso.Fornecedor]: 'Fornecedor',
    [TipoAcesso.Funcionario]: 'Funcionário',
    [TipoAcesso.Veiculo]: 'Veículo',
    [TipoAcesso.Outro]: 'Outro'
};

const statusPreAutorizacaoMap: Record<number, string> = {
    [StatusPreAutorizacao.Ativa]: 'Ativa',
    [StatusPreAutorizacao.Utilizada]: 'Utilizada',
    [StatusPreAutorizacao.Expirada]: 'Expirada',
    [StatusPreAutorizacao.Cancelada]: 'Cancelada'
};

const statusRegistroMap: Record<number, string> = {
    [StatusRegistroAcesso.AguardandoValidacao]: 'Aguardando validação',
    [StatusRegistroAcesso.EmPermanencia]: 'Em permanência',
    [StatusRegistroAcesso.Negado]: 'Acesso negado',
    [StatusRegistroAcesso.Encerrado]: 'Encerrado',
    [StatusRegistroAcesso.Cancelado]: 'Cancelado'
};

const tipoOcorrenciaMap: Record<number, string> = {
    [TipoOcorrenciaAcesso.Seguranca]: 'Segurança',
    [TipoOcorrenciaAcesso.Comportamento]: 'Comportamento',
    [TipoOcorrenciaAcesso.Documentacao]: 'Documentação',
    [TipoOcorrenciaAcesso.Dano]: 'Dano',
    [TipoOcorrenciaAcesso.Outro]: 'Outro'
};

const gravidadeMap: Record<number, string> = {
    [GravidadeOcorrencia.Baixa]: 'Baixa',
    [GravidadeOcorrencia.Media]: 'Média',
    [GravidadeOcorrencia.Alta]: 'Alta',
    [GravidadeOcorrencia.Critica]: 'Crítica'
};

const statusOcorrenciaMap: Record<number, string> = {
    [StatusOcorrenciaAcesso.Aberta]: 'Aberta',
    [StatusOcorrenciaAcesso.Resolvida]: 'Resolvida'
};

export const tipoDocumentoLabel = (value: number) => labelFromMap(tipoDocumentoMap, value);
export const tipoAcessoLabel = (value: number) => labelFromMap(tipoAcessoMap, value);
export const statusPreAutorizacaoLabel = (value: number) => labelFromMap(statusPreAutorizacaoMap, value);
export const statusRegistroLabel = (value: number) => labelFromMap(statusRegistroMap, value);
export const tipoOcorrenciaLabel = (value: number) => labelFromMap(tipoOcorrenciaMap, value);
export const gravidadeLabel = (value: number) => labelFromMap(gravidadeMap, value);
export const statusOcorrenciaLabel = (value: number) => labelFromMap(statusOcorrenciaMap, value);

export const tipoDocumentoOptions = optionsFromMap(tipoDocumentoMap);
export const tipoAcessoOptions = optionsFromMap(tipoAcessoMap);
export const tipoOcorrenciaOptions = optionsFromMap(tipoOcorrenciaMap);
export const gravidadeOptions = optionsFromMap(gravidadeMap);

export const statusPreAutorizacaoFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusPreAutorizacaoMap)];
export const statusRegistroFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusRegistroMap)];
export const statusOcorrenciaFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusOcorrenciaMap)];
export const gravidadeFilterOptions = [{ label: 'Todas as gravidades', value: null }, ...optionsFromMap(gravidadeMap)];

export const statusPreAutorizacaoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusPreAutorizacao.Ativa:
            return 'success';
        case StatusPreAutorizacao.Utilizada:
            return 'info';
        case StatusPreAutorizacao.Cancelada:
            return 'danger';
        default:
            return 'warning';
    }
};

export const statusRegistroSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusRegistroAcesso.EmPermanencia:
            return 'success';
        case StatusRegistroAcesso.AguardandoValidacao:
            return 'warning';
        case StatusRegistroAcesso.Negado:
        case StatusRegistroAcesso.Cancelado:
            return 'danger';
        default:
            return 'info';
    }
};

export const gravidadeSeverity = (value: number): Severity => {
    switch (n(value)) {
        case GravidadeOcorrencia.Critica:
        case GravidadeOcorrencia.Alta:
            return 'danger';
        case GravidadeOcorrencia.Media:
            return 'warning';
        default:
            return 'info';
    }
};

export const statusOcorrenciaSeverity = (value: number): Severity => (n(value) === StatusOcorrenciaAcesso.Resolvida ? 'success' : 'warning');

// Regras de transição de estado (UI). O backend é a autoridade final.
export const preAutorizacaoPodeCancelar = (status: number) => n(status) === StatusPreAutorizacao.Ativa;
export const registroPodeValidar = (status: number) => n(status) === StatusRegistroAcesso.AguardandoValidacao;
export const registroPodeSaida = (status: number) => n(status) === StatusRegistroAcesso.EmPermanencia;
export const registroPodeCancelar = (status: number) => [StatusRegistroAcesso.AguardandoValidacao, StatusRegistroAcesso.EmPermanencia].includes(n(status));
export const ocorrenciaPodeResolver = (status: number) => n(status) === StatusOcorrenciaAcesso.Aberta;
