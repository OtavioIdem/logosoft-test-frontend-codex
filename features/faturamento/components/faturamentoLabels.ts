import {
    AcaoRetomadaReversaoLeg,
    EstadoLegIntegracaoFaturamento,
    FaturamentoLegResponse,
    FaturamentoResponse,
    LegIntegracaoFaturamento,
    StatusFaturamento,
    TipoDocumentoFiscal,
    TipoOcorrenciaFaturamento
} from '@/features/faturamento/types/faturamento.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

export const statusFaturamentoLabel = (value: number) => {
    const map: Record<number, string> = {
        [StatusFaturamento.Rascunho]: 'Rascunho',
        [StatusFaturamento.PendenteFiscal]: 'Pendente fiscal',
        [StatusFaturamento.FiscalAutorizado]: 'Fiscal autorizado',
        [StatusFaturamento.EstoqueProcessado]: 'Estoque processado',
        [StatusFaturamento.Faturado]: 'Faturado',
        [StatusFaturamento.Cancelado]: 'Cancelado',
        [StatusFaturamento.Erro]: 'Erro'
    };
    return map[n(value)] ?? String(value);
};

export const statusFaturamentoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusFaturamento.Faturado:
            return 'success';
        case StatusFaturamento.Cancelado:
        case StatusFaturamento.Erro:
            return 'danger';
        case StatusFaturamento.Rascunho:
            return 'info';
        default:
            return 'warning';
    }
};

export const statusFaturamentoOptions = [
    { label: 'Todas as etapas', value: null },
    { label: 'Rascunho', value: StatusFaturamento.Rascunho },
    { label: 'Pendente fiscal', value: StatusFaturamento.PendenteFiscal },
    { label: 'Fiscal autorizado', value: StatusFaturamento.FiscalAutorizado },
    { label: 'Estoque processado', value: StatusFaturamento.EstoqueProcessado },
    { label: 'Faturado', value: StatusFaturamento.Faturado },
    { label: 'Cancelado', value: StatusFaturamento.Cancelado },
    { label: 'Erro', value: StatusFaturamento.Erro }
];

export const tipoDocumentoOptions = [
    { label: 'NF-e', value: TipoDocumentoFiscal.NFe },
    { label: 'NFC-e', value: TipoDocumentoFiscal.NFCe },
    { label: 'NFS-e', value: TipoDocumentoFiscal.NFSe },
    { label: 'CT-e', value: TipoDocumentoFiscal.CTe },
    { label: 'MDF-e', value: TipoDocumentoFiscal.MDFe },
    { label: 'Outro', value: TipoDocumentoFiscal.Outro }
];

export const tipoOcorrenciaLabel = (value: number) => {
    const map: Record<number, string> = {
        [TipoOcorrenciaFaturamento.Informativa]: 'Informativa',
        [TipoOcorrenciaFaturamento.Alerta]: 'Alerta',
        [TipoOcorrenciaFaturamento.Erro]: 'Erro'
    };
    return map[n(value)] ?? String(value);
};

export const tipoOcorrenciaSeverity = (value: number): Severity => {
    switch (n(value)) {
        case TipoOcorrenciaFaturamento.Erro:
            return 'danger';
        case TipoOcorrenciaFaturamento.Alerta:
            return 'warning';
        default:
            return 'info';
    }
};

// Transições de UI (backend é autoridade final).
export const podeConfirmar = (etapa: number) => ![StatusFaturamento.Faturado, StatusFaturamento.Cancelado].includes(n(etapa));
export const podeCancelar = (etapa: number) => n(etapa) !== StatusFaturamento.Cancelado;

// legFaturamentoLabel (D25): catálogo fixo dos 6 legs, na ordem de LegIntegracaoFaturamento.
export const legFaturamentoLabel = (value: number) => {
    const map: Record<number, string> = {
        [LegIntegracaoFaturamento.GerarNotaFiscal]: 'Gerar nota fiscal',
        [LegIntegracaoFaturamento.GerarXmlEnvio]: 'Gerar XML de envio',
        [LegIntegracaoFaturamento.AssinarXml]: 'Assinar XML',
        [LegIntegracaoFaturamento.TransmitirAutorizarSefaz]: 'Transmitir e autorizar na SEFAZ',
        [LegIntegracaoFaturamento.BaixarEstoque]: 'Baixar estoque',
        [LegIntegracaoFaturamento.GerarContaReceber]: 'Gerar conta a receber'
    };
    return map[n(value)] ?? `Leg desconhecido (${value})`;
};

// estadoLegLabel/estadoLegSeverity (D1/AC-3): estado desconhecido nunca vira "Revertido".
export const estadoLegLabel = (value: number) => {
    const map: Record<number, string> = {
        [EstadoLegIntegracaoFaturamento.Integrado]: 'Integrado',
        [EstadoLegIntegracaoFaturamento.Falhou]: 'Falhou',
        [EstadoLegIntegracaoFaturamento.Revertido]: 'Revertido',
        [EstadoLegIntegracaoFaturamento.EmReversao]: 'Em reversão'
    };
    return map[n(value)] ?? `Estado desconhecido (${value})`;
};

export const estadoLegSeverity = (value: number): Severity => {
    switch (n(value)) {
        case EstadoLegIntegracaoFaturamento.Integrado:
            return 'success';
        case EstadoLegIntegracaoFaturamento.Falhou:
            return 'danger';
        case EstadoLegIntegracaoFaturamento.Revertido:
            return 'info';
        case EstadoLegIntegracaoFaturamento.EmReversao:
            return 'warning';
        default:
            return null;
    }
};

export const acaoRetomadaOptions = [
    { label: 'Reaplicar a inversa', value: AcaoRetomadaReversaoLeg.ReaplicarInversa },
    { label: 'Declarar efeito desfeito', value: AcaoRetomadaReversaoLeg.DeclararEfeitoDesfeito }
];

const LEGS_CATALOGO: LegIntegracaoFaturamento[] = [
    LegIntegracaoFaturamento.GerarNotaFiscal,
    LegIntegracaoFaturamento.GerarXmlEnvio,
    LegIntegracaoFaturamento.AssinarXml,
    LegIntegracaoFaturamento.TransmitirAutorizarSefaz,
    LegIntegracaoFaturamento.BaixarEstoque,
    LegIntegracaoFaturamento.GerarContaReceber
];

export type LinhaLegFaturamento = {
    key: string;
    leg: number;
    legLabel: string;
    registro: FaturamentoLegResponse | null;
};

// montarLinhasDeLegs (D25): sempre 6 linhas, na ordem 1 a 6; "Sem registro" quando o leg não veio;
// legs fora do catálogo (valor desconhecido) viram linha extra, no fim.
export const montarLinhasDeLegs = (legs?: FaturamentoLegResponse[] | null): LinhaLegFaturamento[] => {
    const registros = legs ?? [];
    const porLeg = new Map<number, FaturamentoLegResponse>();
    registros.forEach((registro) => porLeg.set(n(registro.leg), registro));

    const fixas: LinhaLegFaturamento[] = LEGS_CATALOGO.map((leg) => ({
        key: `leg-${leg}`,
        leg,
        legLabel: legFaturamentoLabel(leg),
        registro: porLeg.get(leg) ?? null
    }));

    const extras: LinhaLegFaturamento[] = registros
        .filter((registro) => !LEGS_CATALOGO.includes(n(registro.leg)))
        .map((registro) => ({
            key: `leg-extra-${registro.id}`,
            leg: n(registro.leg),
            legLabel: legFaturamentoLabel(registro.leg),
            registro
        }));

    return [...fixas, ...extras];
};

// confirmacaoBloqueadaPorReversao (D23): o backend já recusa confirmar com leg EmReversao.
export const confirmacaoBloqueadaPorReversao = (faturamento: FaturamentoResponse) => Boolean(faturamento.possuiLegEmReversao);
