import { NaturezaConta, StatusLancamentoContabil, StatusPeriodoContabil, TipoContaContabil, TipoEventoContabilizacao, TipoPartida } from '@/features/contabil/types/contabil.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const tipoContaMap: Record<number, string> = {
    [TipoContaContabil.Ativo]: 'Ativo',
    [TipoContaContabil.Passivo]: 'Passivo',
    [TipoContaContabil.PatrimonioLiquido]: 'Patrimônio líquido',
    [TipoContaContabil.Receita]: 'Receita',
    [TipoContaContabil.Despesa]: 'Despesa'
};

const naturezaMap: Record<number, string> = {
    [NaturezaConta.Devedora]: 'Devedora',
    [NaturezaConta.Credora]: 'Credora'
};

const tipoPartidaMap: Record<number, string> = {
    [TipoPartida.Debito]: 'Débito',
    [TipoPartida.Credito]: 'Crédito'
};

const statusPeriodoMap: Record<number, string> = {
    [StatusPeriodoContabil.Aberto]: 'Aberto',
    [StatusPeriodoContabil.Fechado]: 'Fechado'
};

const statusLancamentoMap: Record<number, string> = {
    [StatusLancamentoContabil.Normal]: 'Normal',
    [StatusLancamentoContabil.Estornado]: 'Estornado',
    [StatusLancamentoContabil.Estorno]: 'Estorno'
};

const tipoEventoMap: Record<number, string> = {
    [TipoEventoContabilizacao.BaixaContaReceber]: 'Baixa de conta a receber',
    [TipoEventoContabilizacao.BaixaContaPagar]: 'Baixa de conta a pagar',
    [TipoEventoContabilizacao.Outro]: 'Outro'
};

export const tipoContaLabel = (value: number) => labelFromMap(tipoContaMap, value);
export const naturezaLabel = (value: number) => labelFromMap(naturezaMap, value);
export const tipoPartidaLabel = (value: number) => labelFromMap(tipoPartidaMap, value);
export const statusPeriodoLabel = (value: number) => labelFromMap(statusPeriodoMap, value);
export const statusLancamentoLabel = (value: number) => labelFromMap(statusLancamentoMap, value);
export const tipoEventoLabel = (value: number) => labelFromMap(tipoEventoMap, value);

export const tipoContaOptions = optionsFromMap(tipoContaMap);
export const naturezaOptions = optionsFromMap(naturezaMap);
export const tipoPartidaOptions = optionsFromMap(tipoPartidaMap);
export const tipoEventoOptions = optionsFromMap(tipoEventoMap);

export const tipoContaFilterOptions = [{ label: 'Todos os tipos', value: null }, ...optionsFromMap(tipoContaMap)];
export const statusPeriodoFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusPeriodoMap)];
export const statusLancamentoFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusLancamentoMap)];

const mesNomes = ['—', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const competenciaLabel = (ano: number, mes: number) => `${mesNomes[mes] ?? mes}/${ano}`;

export const statusPeriodoSeverity = (value: number): Severity => (n(value) === StatusPeriodoContabil.Aberto ? 'success' : 'info');

export const statusLancamentoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusLancamentoContabil.Estornado:
            return 'danger';
        case StatusLancamentoContabil.Estorno:
            return 'warning';
        default:
            return 'success';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const periodoPodeFechar = (status: number) => n(status) === StatusPeriodoContabil.Aberto;
export const periodoPodeReabrir = (status: number) => n(status) === StatusPeriodoContabil.Fechado;
export const lancamentoPodeEstornar = (status: number) => n(status) === StatusLancamentoContabil.Normal;
