import { ResourceAction } from '@/features/shared/types/resource.types';

const finalStatuses = ['INATIVO', 'CANCELADO', 'FATURADO', 'QUITADO', 'FECHADO', 'RECEBIDO_TOTAL'];

export type StatusTagSeverity = 'success' | 'info' | 'warning' | 'danger' | null | undefined;

export const canRunActionByStatus = (action: ResourceAction, status?: string) => {
    const currentStatus = status ?? 'ATIVO';

    if (action.key === 'editar' && finalStatuses.includes(currentStatus)) return false;
    if (action.disabledWhen?.includes(currentStatus)) return false;
    if (action.allowedStatuses?.length && !action.allowedStatuses.includes(currentStatus)) return false;

    return true;
};

export const getStatusSeverity = (status?: string): StatusTagSeverity => {
    switch (status) {
        case 'ATIVO':
        case 'APROVADO':
        case 'FATURADO':
        case 'QUITADO':
        case 'PROCESSADO':
        case 'FECHADO':
        case 'RECEBIDO_TOTAL':
        case 'CREDITO_LIBERADO':
        case 'BAIXADA':
            return 'success';
        case 'RASCUNHO':
        case 'ABERTO':
        case 'RESERVADA':
        case 'REGISTRADO':
            return 'info';
        case 'ENVIADO_APROVACAO':
        case 'PARCIAL':
        case 'RECEBIDO_PARCIAL':
        case 'ESTORNADO':
            return 'warning';
        case 'INATIVO':
        case 'CANCELADO':
        case 'BLOQUEADO':
        case 'CREDITO_BLOQUEADO':
            return 'danger';
        default:
            return undefined;
    }
};
