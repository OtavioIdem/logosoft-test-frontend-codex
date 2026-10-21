'use client';

import Link from 'next/link';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { formatAuditoriaDateTime, getAuditoriaActionLabel, getAuditoriaActionSeverity } from '@/features/auditoria/utils/auditoriaDisplay';
import { useMemo, useState } from 'react';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { DateInput } from '@/components/forms/DateInput';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { DashboardAuditItem, DashboardMetric } from '@/features/dashboard/types/dashboard.types';
import { useRelatorioDashboardConsolidado } from '@/features/relatorios/hooks/useRelatoriosResources';
import { RelatorioPeriodoQuery, RelatorioResponse } from '@/features/relatorios/types/relatorios.types';
import { metricEntries } from '@/features/relatorios/components/relatoriosMetricUtils';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { mapApiError } from '@/lib/http/apiError';
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
        <div className="dashboard-metric-cell">
            <Link href={metric.href} className="no-underline text-color">
                <Card className={classNames('dashboard-metric-card', { 'opacity-70': metric.unavailable })}>
                    <div className="dashboard-metric-card__body">
                        <div className="dashboard-metric-card__content">
                            <span className="dashboard-metric-card__title">{metric.title}</span>
                            <div className="dashboard-metric-card__value">{metric.unavailable ? '-' : metric.value}</div>
                            <span className="dashboard-metric-card__detail">{metric.unavailable ? 'Consulta indisponível para este usuário ou endpoint.' : metric.detail}</span>
                        </div>
                        <div className={`dashboard-metric-card__icon ${severityClass(metric.severity)}`}>
                            <i className={`pi ${metric.icon} text-xl`} aria-hidden="true" />
                        </div>
                    </div>
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
    <Card title="Atalhos operacionais" className="dashboard-action-panel">
        <div className="dashboard-actions-grid">
            {quickActions.map((action) => (
                <PermissionGuard key={action.href} permission={action.permission} mode="hide">
                    <div className="dashboard-action-cell">
                        <Link href={action.href} className="no-underline text-color">
                            <div className="dashboard-action-card">
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

const startOfCurrentMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfCurrentMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

const DashboardGerencialSection = ({ title, data }: { title: string; data?: RelatorioResponse | null }) => {
    const entries = metricEntries(data);
    return <Card title={title} className="h-full">
        {entries.length === 0 ? <span className="text-color-secondary">Nenhum indicador disponível para o período.</span> : <div className="grid">{entries.map((entry) => <div className="col-6" key={`${title}-${entry.label}`}><span className="block text-color-secondary text-sm">{entry.label}</span><strong>{entry.value}</strong></div>)}</div>}
    </Card>;
};

export const DashboardPage = () => {
    const { hasPermission } = usePermissions();
    const organizationalContext = useOrganizationalContext();
    const dashboardQuery = useDashboard();
    const data = dashboardQuery.data;
    const [empresaId, setEmpresaId] = useState<string | null>(organizationalContext.empresaId);
    const [filialId, setFilialId] = useState<string | null>(organizationalContext.filialId);
    const [dataInicial, setDataInicial] = useState<Date | null>(() => startOfCurrentMonth());
    const [dataFinal, setDataFinal] = useState<Date | null>(() => endOfCurrentMonth());
    const query = useMemo<RelatorioPeriodoQuery | null>(() => empresaId ? { empresaId, filialId, dataInicial: dataInicial ?? startOfCurrentMonth(), dataFinal: dataFinal ?? endOfCurrentMonth() } : null, [dataFinal, dataInicial, empresaId, filialId]);
    const podeVerDashboardGerencial = hasPermission('RELATORIOS_DASHBOARD_CONSULTAR');
    const dashboardGerencial = useRelatorioDashboardConsolidado(query, podeVerDashboardGerencial);

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
                <LoadingState variant="metrics" cards={6} className="mb-3" />
            ) : (
                <div className="dashboard-metrics-grid">{data?.metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</div>
            )}
            <PermissionGuard permission="RELATORIOS_DASHBOARD_CONSULTAR" mode="hide">
                <Card title="Indicadores gerenciais consolidados" className="mb-3">
                    <div className="flex flex-column lg:flex-row gap-3 lg:align-items-end mb-3">
                        <EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={setEmpresaId} onFilialChange={setFilialId} />
                        <div className="field mb-0"><label htmlFor="dashboardDataInicial" className="font-medium block">Data inicial</label><DateInput id="dashboardDataInicial" value={dataInicial} onChange={setDataInicial} /></div>
                        <div className="field mb-0"><label htmlFor="dashboardDataFinal" className="font-medium block">Data final</label><DateInput id="dashboardDataFinal" value={dataFinal} onChange={setDataFinal} /></div>
                        <Button label="Atualizar indicadores" icon="pi pi-refresh" outlined loading={dashboardGerencial.isFetching} onClick={() => dashboardGerencial.refetch()} disabled={!query} />
                    </div>
                    {!query ? <Message severity="info" text="Selecione uma empresa para consultar os indicadores gerenciais." /> : null}
                    {dashboardGerencial.error ? <ApiErrorPanel error={mapApiError(dashboardGerencial.error)} /> : null}
                    {dashboardGerencial.isLoading ? <LoadingState variant="metrics" cards={6} /> : null}
                    {!dashboardGerencial.isLoading && !dashboardGerencial.error && dashboardGerencial.data ? <div className="grid">
                        <div className="col-12 lg:col-6"><DashboardGerencialSection title="Vendas" data={dashboardGerencial.data.vendas} /></div>
                        <div className="col-12 lg:col-6"><DashboardGerencialSection title="Compras" data={dashboardGerencial.data.compras} /></div>
                        <div className="col-12 lg:col-6"><DashboardGerencialSection title="Financeiro" data={dashboardGerencial.data.financeiro} /></div>
                        <div className="col-12 lg:col-6"><DashboardGerencialSection title="Estoque" data={dashboardGerencial.data.estoque} /></div>
                        <div className="col-12 lg:col-6"><DashboardGerencialSection title="Fiscal" data={dashboardGerencial.data.fiscal} /></div>
                        <div className="col-12 lg:col-6"><DashboardGerencialSection title="Produção" data={dashboardGerencial.data.producao} /></div>
                    </div> : null}
                </Card>
            </PermissionGuard>
            <div className="grid">
                <div className="col-12 lg:col-7">
                    <Card title="Fluxos críticos" className="dashboard-flow-panel">
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
                    <Card title="Auditoria recente" className="dashboard-audit-panel">
                        {dashboardQuery.isLoading ? <LoadingState variant="panel" /> : <AuditList items={data?.auditItems ?? []} />}
                    </Card>
                </div>
            </div>
            <QuickActions />
        </>
    );
};
