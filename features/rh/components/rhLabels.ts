import {
    OrigemEventoRh,
    OrigemPonto,
    RegimeTrabalho,
    StatusAfastamento,
    StatusColaborador,
    StatusColaboradorBeneficio,
    StatusFerias,
    TipoAfastamento,
    TipoBeneficio,
    TipoEventoRh,
    TipoMarcacaoPonto
} from '@/features/rh/types/rh.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const regimeMap: Record<number, string> = {
    [RegimeTrabalho.Clt]: 'CLT',
    [RegimeTrabalho.Pj]: 'PJ',
    [RegimeTrabalho.Estagio]: 'Estágio',
    [RegimeTrabalho.Temporario]: 'Temporário',
    [RegimeTrabalho.Autonomo]: 'Autônomo',
    [RegimeTrabalho.Aprendiz]: 'Aprendiz'
};

const statusColaboradorMap: Record<number, string> = {
    [StatusColaborador.Ativo]: 'Ativo',
    [StatusColaborador.Ferias]: 'Em férias',
    [StatusColaborador.Afastado]: 'Afastado',
    [StatusColaborador.Desligado]: 'Desligado'
};

const tipoPontoMap: Record<number, string> = {
    [TipoMarcacaoPonto.Entrada]: 'Entrada',
    [TipoMarcacaoPonto.SaidaIntervalo]: 'Saída intervalo',
    [TipoMarcacaoPonto.RetornoIntervalo]: 'Retorno intervalo',
    [TipoMarcacaoPonto.Saida]: 'Saída'
};

const origemPontoMap: Record<number, string> = {
    [OrigemPonto.Manual]: 'Manual',
    [OrigemPonto.Biometria]: 'Biometria',
    [OrigemPonto.Aplicativo]: 'Aplicativo',
    [OrigemPonto.Importacao]: 'Importação'
};

const statusFeriasMap: Record<number, string> = {
    [StatusFerias.Solicitada]: 'Solicitada',
    [StatusFerias.Aprovada]: 'Aprovada',
    [StatusFerias.Rejeitada]: 'Rejeitada',
    [StatusFerias.EmGozo]: 'Em gozo',
    [StatusFerias.Concluida]: 'Concluída',
    [StatusFerias.Cancelada]: 'Cancelada'
};

const tipoAfastamentoMap: Record<number, string> = {
    [TipoAfastamento.Doenca]: 'Doença',
    [TipoAfastamento.AcidenteTrabalho]: 'Acidente de trabalho',
    [TipoAfastamento.Maternidade]: 'Maternidade',
    [TipoAfastamento.Paternidade]: 'Paternidade',
    [TipoAfastamento.Licenca]: 'Licença',
    [TipoAfastamento.Outro]: 'Outro'
};

const statusAfastamentoMap: Record<number, string> = {
    [StatusAfastamento.Ativo]: 'Ativo',
    [StatusAfastamento.Encerrado]: 'Encerrado'
};

const tipoBeneficioMap: Record<number, string> = {
    [TipoBeneficio.ValeTransporte]: 'Vale-transporte',
    [TipoBeneficio.ValeRefeicao]: 'Vale-refeição',
    [TipoBeneficio.ValeAlimentacao]: 'Vale-alimentação',
    [TipoBeneficio.PlanoSaude]: 'Plano de saúde',
    [TipoBeneficio.PlanoOdontologico]: 'Plano odontológico',
    [TipoBeneficio.Outro]: 'Outro'
};

const statusConcessaoMap: Record<number, string> = {
    [StatusColaboradorBeneficio.Ativo]: 'Ativo',
    [StatusColaboradorBeneficio.Encerrado]: 'Encerrado'
};

const tipoEventoMap: Record<number, string> = {
    [TipoEventoRh.Provento]: 'Provento',
    [TipoEventoRh.Desconto]: 'Desconto',
    [TipoEventoRh.Informativo]: 'Informativo'
};

const origemEventoMap: Record<number, string> = {
    [OrigemEventoRh.Manual]: 'Manual',
    [OrigemEventoRh.Ponto]: 'Ponto',
    [OrigemEventoRh.Beneficio]: 'Benefício',
    [OrigemEventoRh.Ferias]: 'Férias',
    [OrigemEventoRh.Importacao]: 'Importação'
};

export const regimeLabel = (value: number) => labelFromMap(regimeMap, value);
export const statusColaboradorLabel = (value: number) => labelFromMap(statusColaboradorMap, value);
export const tipoPontoLabel = (value: number) => labelFromMap(tipoPontoMap, value);
export const origemPontoLabel = (value: number) => labelFromMap(origemPontoMap, value);
export const statusFeriasLabel = (value: number) => labelFromMap(statusFeriasMap, value);
export const tipoAfastamentoLabel = (value: number) => labelFromMap(tipoAfastamentoMap, value);
export const statusAfastamentoLabel = (value: number) => labelFromMap(statusAfastamentoMap, value);
export const tipoBeneficioLabel = (value: number) => labelFromMap(tipoBeneficioMap, value);
export const statusConcessaoLabel = (value: number) => labelFromMap(statusConcessaoMap, value);
export const tipoEventoLabel = (value: number) => labelFromMap(tipoEventoMap, value);
export const origemEventoLabel = (value: number) => labelFromMap(origemEventoMap, value);

export const regimeOptions = optionsFromMap(regimeMap);
export const tipoPontoOptions = optionsFromMap(tipoPontoMap);
export const origemPontoOptions = optionsFromMap(origemPontoMap);
export const tipoAfastamentoOptions = optionsFromMap(tipoAfastamentoMap);
export const tipoBeneficioOptions = optionsFromMap(tipoBeneficioMap);
export const tipoEventoOptions = optionsFromMap(tipoEventoMap);
export const origemEventoOptions = optionsFromMap(origemEventoMap);

export const statusColaboradorFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusColaboradorMap)];
export const statusFeriasFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusFeriasMap)];
export const statusAfastamentoFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusAfastamentoMap)];

export const statusColaboradorSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusColaborador.Ativo:
            return 'success';
        case StatusColaborador.Ferias:
            return 'info';
        case StatusColaborador.Afastado:
            return 'warning';
        default:
            return 'danger';
    }
};

export const statusFeriasSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusFerias.Aprovada:
        case StatusFerias.Concluida:
            return 'success';
        case StatusFerias.EmGozo:
            return 'info';
        case StatusFerias.Rejeitada:
        case StatusFerias.Cancelada:
            return 'danger';
        default:
            return 'warning';
    }
};

export const statusAfastamentoSeverity = (value: number): Severity => (n(value) === StatusAfastamento.Encerrado ? 'success' : 'warning');
export const statusConcessaoSeverity = (value: number): Severity => (n(value) === StatusColaboradorBeneficio.Encerrado ? 'info' : 'success');
export const tipoEventoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case TipoEventoRh.Provento:
            return 'success';
        case TipoEventoRh.Desconto:
            return 'danger';
        default:
            return 'info';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const colaboradorAtivo = (status: number) => n(status) !== StatusColaborador.Desligado;
export const feriasPodeAprovar = (status: number) => n(status) === StatusFerias.Solicitada;
export const feriasPodeRejeitar = (status: number) => n(status) === StatusFerias.Solicitada;
export const feriasPodeIniciar = (status: number) => n(status) === StatusFerias.Aprovada;
export const feriasPodeConcluir = (status: number) => n(status) === StatusFerias.EmGozo;
export const feriasPodeCancelar = (status: number) => [StatusFerias.Solicitada, StatusFerias.Aprovada].includes(n(status));
export const afastamentoPodeEncerrar = (status: number) => n(status) === StatusAfastamento.Ativo;
export const concessaoPodeEncerrar = (status: number) => n(status) === StatusColaboradorBeneficio.Ativo;
