import { StatusFaturamento, TipoDocumentoFiscal, TipoOcorrenciaFaturamento } from '@/features/faturamento/types/faturamento.types';

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
