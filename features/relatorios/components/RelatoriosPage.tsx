'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { DateInput } from '@/components/forms/DateInput';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import {
    useExportarRelatorio,
    useRelatorioGerencialCompras,
    useRelatorioGerencialEstoque,
    useRelatorioGerencialFinanceiro,
    useRelatorioGerencialFiscal,
    useRelatorioGerencialProducao,
    useRelatorioGerencialVendas,
    useRelatorioOperacional
} from '@/features/relatorios/hooks/useRelatoriosResources';
import { RelatorioAreaExportavel, RelatorioFormatoExportacao, RelatorioPeriodoQuery, RelatorioResponse } from '@/features/relatorios/types/relatorios.types';
import { mapApiError } from '@/lib/http/apiError';
import { metricEntries } from '@/features/relatorios/components/relatoriosMetricUtils';

const areaExportacaoOptions: { label: string; value: RelatorioAreaExportavel }[] = [
    { label: 'Vendas', value: 'vendas' },
    { label: 'Compras', value: 'compras' },
    { label: 'Financeiro', value: 'financeiro' },
    { label: 'Estoque', value: 'estoque' },
    { label: 'Fiscal', value: 'fiscal' },
    { label: 'Produção', value: 'producao' }
];
const formatoExportacaoOptions: { label: string; value: RelatorioFormatoExportacao }[] = [
    { label: 'CSV', value: 'csv' },
    { label: 'XLSX', value: 'xlsx' },
    { label: 'PDF', value: 'pdf' }
];

const startOfCurrentMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfCurrentMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
    <div className="col-12 md:col-6 xl:col-3">
        <div className="surface-card border-1 surface-border border-round p-3 h-full">
            <span className="block text-color-secondary mb-2">{label}</span>
            <strong className="text-xl">{value}</strong>
        </div>
    </div>
);

const RelatorioSection = ({ title, moduleTag, data, loading, error }: { title: string; moduleTag: string; data?: RelatorioResponse | null; loading?: boolean; error?: unknown }) => {
    const entries = metricEntries(data);
    return (
        <Card className="mb-3" title={<div className="flex justify-content-between align-items-center gap-2"><span>{title}</span><Tag value={moduleTag} severity="info" /></div>}>
            {error ? <ApiErrorPanel error={mapApiError(error)} /> : null}
            {loading ? <Message severity="info" text="Carregando relatório..." /> : null}
            {!loading && !error && entries.length === 0 ? <Message severity="warn" text="Nenhum indicador foi retornado para o período selecionado." /> : null}
            <div className="grid">
                {entries.map((entry) => <MetricCard key={`${title}-${entry.label}`} label={entry.label} value={entry.value} />)}
            </div>
        </Card>
    );
};

export const RelatoriosPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [dataInicial, setDataInicial] = useState<Date | null>(() => startOfCurrentMonth());
    const [dataFinal, setDataFinal] = useState<Date | null>(() => endOfCurrentMonth());
    const [areaExportacao, setAreaExportacao] = useState<RelatorioAreaExportavel>('vendas');
    const [formatoExportacao, setFormatoExportacao] = useState<RelatorioFormatoExportacao>('xlsx');

    const query = useMemo<RelatorioPeriodoQuery | null>(() => empresaId ? ({ empresaId, filialId, dataInicial: dataInicial ?? startOfCurrentMonth(), dataFinal: dataFinal ?? endOfCurrentMonth() }) : null, [dataFinal, dataInicial, empresaId, filialId]);
    const permissoes = {
        operacional: hasPermission('RELATORIOS_OPERACIONAIS_CONSULTAR'),
        vendas: hasPermission('RELATORIOS_VENDAS_CONSULTAR'),
        compras: hasPermission('RELATORIOS_COMPRAS_CONSULTAR'),
        financeiro: hasPermission('RELATORIOS_FINANCEIRO_CONSULTAR'),
        estoque: hasPermission('RELATORIOS_ESTOQUE_CONSULTAR'),
        fiscal: hasPermission('RELATORIOS_FISCAL_CONSULTAR'),
        producao: hasPermission('RELATORIOS_PRODUCAO_CONSULTAR')
    };
    const podeConsultar = Object.values(permissoes).some(Boolean);
    const operacional = useRelatorioOperacional(query, permissoes.operacional);
    const vendas = useRelatorioGerencialVendas(query, permissoes.vendas);
    const compras = useRelatorioGerencialCompras(query, permissoes.compras);
    const financeiro = useRelatorioGerencialFinanceiro(query, permissoes.financeiro);
    const estoque = useRelatorioGerencialEstoque(query, permissoes.estoque);
    const fiscal = useRelatorioGerencialFiscal(query, permissoes.fiscal);
    const producao = useRelatorioGerencialProducao(query, permissoes.producao);
    const exportarMutation = useExportarRelatorio();

    if (!podeConsultar && !hasPermission('RELATORIOS_EXPORTAR')) {
        return <UnauthorizedState description="Seu usuário não possui permissão para consultar ou exportar relatórios." />;
    }

    const exportar = () => query ? runWithToast(() => exportarMutation.mutateAsync({ area: areaExportacao, formato: formatoExportacao, query }), { success: { summary: 'Exportação iniciada', detail: 'O download deve começar em instantes.' }, error: { summary: 'Erro ao exportar relatório' } }) : undefined;

    return (
        <>
            <PageHeader title="Relatórios" description="Indicadores operacionais e gerenciais por módulo, consumindo endpoints consolidados do backend. O frontend não recalcula indicadores e não expõe IDs técnicos." />

            <Card className="mb-3" title="Filtros">
                <div className="flex flex-column lg:flex-row gap-3 lg:align-items-end">
                    <div className="flex flex-column md:flex-row gap-2"><EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={setEmpresaId} onFilialChange={setFilialId} /></div>
                    <div className="field mb-0"><label htmlFor="relatorioDataInicial" className="font-medium block">Data inicial</label><DateInput id="relatorioDataInicial" value={dataInicial} onChange={setDataInicial} /></div>
                    <div className="field mb-0"><label htmlFor="relatorioDataFinal" className="font-medium block">Data final</label><DateInput id="relatorioDataFinal" value={dataFinal} onChange={setDataFinal} /></div>
                    <PermissionGuard permission="RELATORIOS_EXPORTAR" mode="hide">
                        <div className="flex flex-column md:flex-row gap-2 md:align-items-end lg:ml-auto">
                            <div className="field mb-0"><label htmlFor="relatorioArea" className="font-medium block">Área</label><Dropdown inputId="relatorioArea" value={areaExportacao} options={areaExportacaoOptions} onChange={(event) => setAreaExportacao(event.value)} /></div>
                            <div className="field mb-0"><label htmlFor="relatorioFormato" className="font-medium block">Formato</label><Dropdown inputId="relatorioFormato" value={formatoExportacao} options={formatoExportacaoOptions} onChange={(event) => setFormatoExportacao(event.value)} /></div>
                            <Button label="Exportar" icon="pi pi-download" loading={exportarMutation.isPending} onClick={exportar} />
                        </div>
                    </PermissionGuard>
                </div>
            </Card>

            {permissoes.operacional ? <RelatorioSection title="Operacional consolidado" moduleTag="Operacional" data={operacional.data} loading={operacional.isFetching} error={operacional.error} /> : null}
            {permissoes.vendas ? <RelatorioSection title="Gerencial de vendas" moduleTag="Vendas" data={vendas.data} loading={vendas.isFetching} error={vendas.error} /> : null}
            {permissoes.compras ? <RelatorioSection title="Gerencial de compras" moduleTag="Compras" data={compras.data} loading={compras.isFetching} error={compras.error} /> : null}
            {permissoes.financeiro ? <RelatorioSection title="Gerencial financeiro" moduleTag="Financeiro" data={financeiro.data} loading={financeiro.isFetching} error={financeiro.error} /> : null}
            {permissoes.estoque ? <RelatorioSection title="Gerencial de estoque" moduleTag="Estoque" data={estoque.data} loading={estoque.isFetching} error={estoque.error} /> : null}
            {permissoes.fiscal ? <RelatorioSection title="Gerencial fiscal" moduleTag="Fiscal" data={fiscal.data} loading={fiscal.isFetching} error={fiscal.error} /> : null}
            {permissoes.producao ? <RelatorioSection title="Gerencial de produção" moduleTag="Produção" data={producao.data} loading={producao.isFetching} error={producao.error} /> : null}
        </>
    );
};
