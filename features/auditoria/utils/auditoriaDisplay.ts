import { AuditoriaAcao } from '@/features/auditoria/types/auditoria.types';
import { IsoDateTime } from '@/types/erp';

export type AuditoriaActionSeverity = 'success' | 'info' | 'warning' | 'danger' | undefined;

const actionLabels: Record<string, string> = {
    '1': 'Criação',
    Criacao: 'Criação',
    Criação: 'Criação',
    '2': 'Atualização',
    Atualizacao: 'Atualização',
    Atualização: 'Atualização',
    '3': 'Inativação',
    Inativacao: 'Inativação',
    Inativação: 'Inativação',
    '4': 'Cancelamento',
    Cancelamento: 'Cancelamento',
    '5': 'Aprovação',
    Aprovacao: 'Aprovação',
    Aprovação: 'Aprovação',
    '6': 'Baixa',
    Baixa: 'Baixa',
    '7': 'Estorno',
    Estorno: 'Estorno',
    '8': 'Login',
    Login: 'Login',
    '9': 'Logout',
    Logout: 'Logout'
};

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const actionKey = (acao?: AuditoriaAcao | null) => String(acao ?? '').trim();

export const maskAuditoriaTechnicalIds = (value?: string | null) => (value ? value.replace(UUID_REGEX, 'vínculo técnico') : '-');
export const getAuditoriaActionLabel = (acao: AuditoriaAcao) => actionLabels[actionKey(acao)] ?? `Ação ${actionKey(acao) || 'não informada'}`;

export const getAuditoriaActionSeverity = (acao: AuditoriaAcao): AuditoriaActionSeverity => {
    const key = actionKey(acao);
    if (['1', 'Criacao', 'Criação', '5', 'Aprovacao', 'Aprovação', '8', 'Login'].includes(key)) return 'success';
    if (['2', 'Atualizacao', 'Atualização', '9', 'Logout'].includes(key)) return 'info';
    if (['6', 'Baixa', '7', 'Estorno'].includes(key)) return 'warning';
    if (['3', 'Inativacao', 'Inativação', '4', 'Cancelamento'].includes(key)) return 'danger';
    return undefined;
};

export const formatAuditoriaDateTime = (value?: IsoDateTime | string | null) => {
    if (!value) return 'Sem data';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleString('pt-BR');
};

export const buildAuditoriaReference = (entidade?: string | null, acao?: AuditoriaAcao | null) => {
    const entidadeLabel = maskAuditoriaTechnicalIds(entidade?.trim() || 'Entidade operacional');
    const acaoLabel = acao !== null && acao !== undefined ? getAuditoriaActionLabel(acao).toLowerCase() : 'evento';
    return `${entidadeLabel}: ${acaoLabel} registrada com rastreabilidade`;
};
