import { IsoDateTime } from '@/types/erp';

export type AuditoriaActionSeverity = 'success' | 'info' | 'warning' | 'danger' | undefined;

const actionLabels: Record<number, string> = {
    1: 'Criação',
    2: 'Atualização',
    3: 'Inativação',
    4: 'Cancelamento',
    5: 'Aprovação',
    6: 'Baixa',
    7: 'Estorno',
    8: 'Login',
    9: 'Logout'
};

export const getAuditoriaActionLabel = (acao: number) => actionLabels[acao] ?? `Ação ${acao}`;

export const getAuditoriaActionSeverity = (acao: number): AuditoriaActionSeverity => {
    if ([1, 5, 8].includes(acao)) return 'success';
    if ([2, 9].includes(acao)) return 'info';
    if ([6, 7].includes(acao)) return 'warning';
    if ([3, 4].includes(acao)) return 'danger';
    return undefined;
};

export const formatAuditoriaDateTime = (value?: IsoDateTime | string | null) => {
    if (!value) return 'Sem data';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleString('pt-BR');
};

export const buildAuditoriaReference = (entidade?: string | null, acao?: number | null) => {
    const entidadeLabel = entidade?.trim() || 'Entidade operacional';
    const acaoLabel = typeof acao === 'number' ? getAuditoriaActionLabel(acao).toLowerCase() : 'evento';
    return `${entidadeLabel}: ${acaoLabel} registrada com rastreabilidade`;
};
