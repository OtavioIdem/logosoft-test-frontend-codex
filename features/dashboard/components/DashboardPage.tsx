'use client';

import Link from 'next/link';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { formatAuditoriaDateTime, getAuditoriaActionLabel, getAuditoriaActionSeverity } from '@/features/auditoria/utils/auditoriaDisplay';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { DashboardAuditItem, DashboardMetric } from '@/features/dashboard/types/dashboard.types';
import { PermissionCode } from '@/types/erp';

const severityClass = (severity?: DashboardMetric['severity']) => {
    if (severity === 'success') return 'bg-green-100 text-green-700';
    if (severity === 'warning') return 'bg-yellow-100 text-yellow-700';
    if (severity === 'danger') return 'bg-red-100 text-red-700';
    return 'bg-primary-100 text-primary';
};

const statusLabel = (status: string | number) => String(status);

type QuickAction = {
    label: string;
    href: string;
    icon: string;
    permission: PermissionCode;
    helper: string;
};

const quickActions: QuickAction[] = [
    { label: 'Novo pedido de venda', href: '/vendas/pedidos/novo', icon: 'pi pi-plus-circle', permission: 'VENDAS_GERENCIAR', helper: 'Inicia rascunho comercial com cliente e itens.' },
    { label: 'Novo pedido de compra', href: '/compras/pedidos/novo', icon: 'pi pi-shopping-bag', permission: 'COMPRAS_GERENCIAR', helper: 'Abre fluxo de suprimentos com fornecedor.' },
    { label: 'Entrada de estoque', href: '/estoque/entradas', icon: 'pi pi-sign-in', permission: 'ESTOQUE_MOVIMENTAR', helper: 'Registra movimentação auditável de entrada.' },
    { label: 'Receber conta', href: '/financeiro/contas-receber', icon: 'pi pi-dollar', permission: 'FINANCEIRO_RECEBER', helper: 'Acessa baixas parciais ou totais.' }
];

const MetricCard = ({ metric }: { metric: DashboardMetric }) => (
    <PermissionGuard permission={metric.permission} mode="hide">
        <div className="col-12 md:col-6 xl:col-4">
            <Link href={metric.href} className="no-underline text-color">
                <Card className={metric.unavailable ? 'opacity-70' : undefined}>
                    <div className="flex align-items-center justify-content-between gap-3">
                        <div>
                            <span className="block text-color-secondary font-medium mb-2">{metric.title}</span>
                            <div className="text-900 font-semibold text-2xl">{metric.unavailable ? '-' : metric.value}</div>
                        </div>
                        <div className={`flex align-items-center justify-content-center border-round ${severityClass(metric.severity)}`} style={{ width: '2.75rem', height: '2.75rem' }}>
                            <i className={`pi ${metric.icon} text-xl`} aria-hidden="true" />
                        </div>
                    </div>
                    <span className="text-color-secondary block mt-3 line-height-3">{metric.unavailable ? 'Consulta indisponível para este usuário ou endpoint.' : metric.detail}</span>
                </Card>
            </Link>
        </div>
    </PermissionGuard>
);

const AuditList = ({ items }: { items: DashboardAuditItem[] }) => {
    if (items.length === 0) {
        return <EmptyState title="Sem eventos recentes" description="A API não retornou eventos de auditoria para o painel." />;
    }

    return (
        <div className="flex flex-column gap-3">
            {items.map((item) => (
                <div key={item.id} className="flex justify-content-between gap-3 border-bottom-1 surface-border pb-3">
                    <div>
                        <div className="font-medium">{item.descricao}</div>
                        <small className="text-color-secondary">{item.modulo} / {item.entidade} · {formatAuditoriaDateTime(item.criadoEm)}</small>
                    </div>
                    <Tag value={getAuditoriaActionLabel(item.acao)} severity={getAuditoriaActionSeverity(item.acao)} />
                </div>
            ))}
        </div>
    );
};

const QuickActions = () => (
    <Card title="Atalhos operacionais">
        <div className="grid">
            {quickActions.map((action) => (
                <PermissionGuard key={action.href} permission={action.permission} mode="hide">
                    <div className="col-12 md:col-6">
                        <Link href={action.href} className="no-underline text-color">
                            <div className="border-1 surface-border border-round p-3 h-full">
                                <div className="flex align-items-center gap-2 mb-2">
                                    <i className={action.icon} aria-hidden="true" />
                                    <span className="font-medium">{action.label}</span>
                                </div>
                                <small className="text-color-secondary line-height-3">{action.helper}</small>
                            </div>
                        </Link>
                    </div>
                </PermissionGuard>
            ))}
        </div>
    </Card>
);

export const DashboardPage = () => {
    const dashboardQuery = useDashboard();
    const data = dashboardQuery.data;

    return (
        <>
            <PageHeader
                title="Dashboard logosoft"
                description="Painel operacional com dados reais da API, permissões por módulo e atalhos para fluxos críticos."
                actions={<Button label="Atualizar" icon="pi pi-refresh" outlined loading={dashboardQuery.isFetching} onClick={() => dashboardQuery.refetch()} />}
            />
            {data?.warnings.length ? (
                <div className="mb-3 flex flex-column gap-2">
                    {data.warnings.slice(0, 5).map((warning) => <Message key={warning} severity="warn" text={warning} className="w-full" />)}
                </div>
            ) : null}
            {dashboardQuery.isLoading ? (
                <div className="grid">
                    {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="col-12 md:col-6 xl:col-4"><Card><Skeleton height="7rem" /></Card></div>)}
                </div>
            ) : (
                <div className="grid">{data?.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</div>
            )}
            <div className="grid">
                <div className="col-12 lg:col-7">
                    <Card title="Fluxos críticos">
                        <div className="flex flex-column gap-3">
                            {(data?.criticalFlows ?? []).map((flow) => (
                                <PermissionGuard key={flow.name} permission={flow.permission} mode="hide">
                                    <Link href={flow.href} className="no-underline text-color">
                                        <div className="flex align-items-center justify-content-between border-bottom-1 surface-border pb-3 gap-3">
                                            <div>
                                                <div className="font-medium">{flow.name}</div>
                                                <small className="text-color-secondary">{flow.detail}</small>
                                            </div>
                                            <Tag value={statusLabel(flow.status)} />
                                        </div>
                                    </Link>
                                </PermissionGuard>
                            ))}
                        </div>
                        {data?.generatedAt ? (
                            <>
                                <Divider />
                                <small className="text-color-secondary">Atualizado em {formatAuditoriaDateTime(data.generatedAt)}.</small>
                            </>
                        ) : null}
                    </Card>
                </div>
                <div className="col-12 lg:col-5">
                    <Card title="Auditoria recente">
                        <AuditList items={data?.auditItems ?? []} />
                    </Card>
                </div>
            </div>
            <QuickActions />
        </>
    );
};
