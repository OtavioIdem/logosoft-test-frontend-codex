import { GravidadeRecall, LoteOrigem, StatusLote, StatusRecall, TipoMovimentacaoLote } from '@/features/alimentar/types/alimentar.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const loteOrigemMap: Record<number, string> = {
    [LoteOrigem.Producao]: 'Produção',
    [LoteOrigem.Compra]: 'Compra',
    [LoteOrigem.Transferencia]: 'Transferência',
    [LoteOrigem.Outro]: 'Outro'
};

const statusLoteMap: Record<number, string> = {
    [StatusLote.Ativo]: 'Ativo',
    [StatusLote.Bloqueado]: 'Bloqueado',
    [StatusLote.Esgotado]: 'Esgotado'
};

const tipoMovimentacaoMap: Record<number, string> = {
    [TipoMovimentacaoLote.Entrada]: 'Entrada',
    [TipoMovimentacaoLote.Saida]: 'Saída',
    [TipoMovimentacaoLote.Ajuste]: 'Ajuste',
    [TipoMovimentacaoLote.Descarte]: 'Descarte'
};

const gravidadeRecallMap: Record<number, string> = {
    [GravidadeRecall.Baixa]: 'Baixa',
    [GravidadeRecall.Media]: 'Média',
    [GravidadeRecall.Alta]: 'Alta',
    [GravidadeRecall.Critica]: 'Crítica'
};

const statusRecallMap: Record<number, string> = {
    [StatusRecall.Aberto]: 'Aberto',
    [StatusRecall.Encerrado]: 'Encerrado',
    [StatusRecall.Cancelado]: 'Cancelado'
};

export const loteOrigemLabel = (value: number) => labelFromMap(loteOrigemMap, value);
export const statusLoteLabel = (value: number) => labelFromMap(statusLoteMap, value);
export const tipoMovimentacaoLabel = (value: number) => labelFromMap(tipoMovimentacaoMap, value);
export const gravidadeRecallLabel = (value: number) => labelFromMap(gravidadeRecallMap, value);
export const statusRecallLabel = (value: number) => labelFromMap(statusRecallMap, value);

export const loteOrigemOptions = optionsFromMap(loteOrigemMap);
export const tipoMovimentacaoOptions = optionsFromMap(tipoMovimentacaoMap);
export const gravidadeRecallOptions = optionsFromMap(gravidadeRecallMap);

export const statusLoteFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusLoteMap)];
export const statusRecallFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusRecallMap)];
export const gravidadeRecallFilterOptions = [{ label: 'Todas as gravidades', value: null }, ...optionsFromMap(gravidadeRecallMap)];

export const statusLoteSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusLote.Ativo:
            return 'success';
        case StatusLote.Bloqueado:
            return 'danger';
        default:
            return 'info';
    }
};

export const gravidadeRecallSeverity = (value: number): Severity => {
    switch (n(value)) {
        case GravidadeRecall.Critica:
        case GravidadeRecall.Alta:
            return 'danger';
        case GravidadeRecall.Media:
            return 'warning';
        default:
            return 'info';
    }
};

export const statusRecallSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusRecall.Encerrado:
            return 'success';
        case StatusRecall.Cancelado:
            return 'danger';
        default:
            return 'warning';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const lotePodeBloquear = (status: number) => n(status) === StatusLote.Ativo;
export const lotePodeDesbloquear = (status: number) => n(status) === StatusLote.Bloqueado;
export const loteAtivoParaRecall = (status: number) => n(status) !== StatusLote.Esgotado;
export const recallAberto = (status: number) => n(status) === StatusRecall.Aberto;
