import { formatMoney } from '@/lib/formatters/money';
import { RelatorioResponse } from '@/features/relatorios/types/relatorios.types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const titleCase = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).replace(/ Ids?$/i, '').trim();
export const isUuidString = (value: unknown) => typeof value === 'string' && UUID_REGEX.test(value.trim());
export const isTechnicalKey = (key: string) => ['contexto', 'periodo', 'empresaId', 'filialId', 'dataInicial', 'dataFinal'].includes(key) || /(^id$|id$|Id$|Ids$|IDs$)/.test(key);
export const isMoneyKey = (key: string) => /valor|saldo|receita|custo|totalFinanceiro|realizado|previsto|pagar|receber|entrada|saida/i.test(key);

export const metricValue = (key: string, value: unknown) => {
    if (typeof value === 'number') return isMoneyKey(key) ? formatMoney(value) : value.toLocaleString('pt-BR');
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'string' && !isUuidString(value)) return value;
    return null;
};

export const metricEntries = (data?: RelatorioResponse | null) =>
    Object.entries(data ?? {})
        .filter(([key, value]) => !isTechnicalKey(key) && !isUuidString(value) && ['number', 'string', 'boolean'].includes(typeof value))
        .slice(0, 8)
        .map(([key, value]) => ({ label: titleCase(key), value: metricValue(key, value) ?? '-' }));
