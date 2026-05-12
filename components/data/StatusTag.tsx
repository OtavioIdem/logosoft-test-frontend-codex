import { Tag } from 'primereact/tag';
import { EntityStatus } from '@/types/erp';
import { getStatusSeverity } from '@/features/shared/utils/statusRules';

const normalizeStatus = (status?: string | number | null) => {
    if (typeof status === 'number') {
        if (status === EntityStatus.Ativo) return 'ATIVO';
        if (status === EntityStatus.Inativo) return 'INATIVO';
        if (status === EntityStatus.Cancelado) return 'CANCELADO';
        if (status === EntityStatus.Bloqueado) return 'BLOQUEADO';
        if (status === EntityStatus.Pendente) return 'PENDENTE';
    }

    return status ? String(status).toUpperCase() : '-';
};

const labelStatus = (status: string) => {
    if (status === 'ATIVO') return 'Ativo';
    if (status === 'INATIVO') return 'Inativo';
    if (status === 'CANCELADO') return 'Cancelado';
    if (status === 'BLOQUEADO') return 'Bloqueado';
    if (status === 'PENDENTE') return 'Pendente';
    return status;
};

export const StatusTag = ({ status }: { status?: string | number | null }) => {
    const normalized = normalizeStatus(status);
    return <Tag value={labelStatus(normalized)} severity={getStatusSeverity(normalized)} />;
};
