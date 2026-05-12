import { PermissionCode } from '@/types/erp';

export type DashboardMetricKey = 'vendas' | 'receber' | 'pagar' | 'estoque' | 'compras' | 'auditoria';

export type DashboardMetric = {
    key: DashboardMetricKey;
    title: string;
    value: string;
    detail: string;
    icon: string;
    permission: PermissionCode;
    href: string;
    severity?: 'success' | 'info' | 'warning' | 'danger';
    unavailable?: boolean;
};

export type DashboardCriticalFlow = {
    name: string;
    status: string | number;
    href: string;
    permission: PermissionCode;
    detail: string;
};

export type DashboardAuditItem = {
    id: string;
    modulo: string;
    entidade: string;
    acao: number;
    descricao: string;
    criadoEm: string;
};

export type DashboardData = {
    metrics: DashboardMetric[];
    criticalFlows: DashboardCriticalFlow[];
    auditItems: DashboardAuditItem[];
    warnings: string[];
    generatedAt: string;
};
