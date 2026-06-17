'use client';

import { useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { DateInput } from '@/components/forms/DateInput';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import {
    useRelatorioGerencialCompras,
    useRelatorioGerencialEstoque,
    useRelatorioGerencialFinanceiro,
    useRelatorioGerencialFiscal,
    useRelatorioGerencialVendas,
    useRelatorioOperacional
} from '@/features/relatorios/hooks/useRelatoriosResources';
import { RelatorioPeriodoQuery, RelatorioResponse } from '@/features/relatorios/types/relatorios.types';
import { mapApiError } from '@/lib/http/apiError';
import { metricEntries } from '@/features/relatorios/components/relatoriosMetricUtils';

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
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [dataInicial, setDataInicial] = useState<Date | null>(() => startOfCurrentMonth());
    const [dataFinal, setDataFinal] = useState<Date | null>(() => endOfCurrentMonth());

    const query = useMemo<RelatorioPeriodoQuery>(() => ({ empresaId, filialId, dataInicial: dataInicial ?? startOfCurrentMonth(), dataFinal: dataFinal ?? endOfCurrentMonth() }), [dataFinal, dataInicial, empresaId, filialId]);
    const operacional = useRelatorioOperacional(query);
    const vendas = useRelatorioGerencialVendas(query);
    const compras = useRelatorioGerencialCompras(query);
    const financeiro = useRelatorioGerencialFinanceiro(query);
    const estoque = useRelatorioGerencialEstoque(query);
    const fiscal = useRelatorioGerencialFiscal(query);

    if (!hasPermission('RELATORIOS_CONSULTAR')) {
        return <UnauthorizedState description="Relatórios exigem RELATORIOS_CONSULTAR." />;
    }

    return (
        <>
            <PageHeader title="Relatórios" description="Indicadores operacionais e gerenciais por módulo, consumindo endpoints consolidados do backend." />
            <Message className="w-full mb-3" severity="info" text="Os relatórios são consultivos. O frontend não recalcula indicadores e não expõe IDs técnicos; os KPIs vêm consolidados do backend." />

            <Card className="mb-3" title="Filtros">
                <div className="flex flex-column lg:flex-row gap-3 lg:align-items-end">
                    <div className="flex flex-column md:flex-row gap-2"><EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={setEmpresaId} onFilialChange={setFilialId} /></div>
                    <div className="field mb-0"><label htmlFor="relatorioDataInicial" className="font-medium block">Data inicial</label><DateInput id="relatorioDataInicial" value={dataInicial} onChange={setDataInicial} /></div>
                    <div className="field mb-0"><label htmlFor="relatorioDataFinal" className="font-medium block">Data final</label><DateInput id="relatorioDataFinal" value={dataFinal} onChange={setDataFinal} /></div>
                </div>
            </Card>

            <RelatorioSection title="Operacional consolidado" moduleTag="Operacional" data={operacional.data} loading={operacional.isFetching} error={operacional.error} />
            <RelatorioSection title="Gerencial de vendas" moduleTag="Vendas" data={vendas.data} loading={vendas.isFetching} error={vendas.error} />
            <RelatorioSection title="Gerencial de compras" moduleTag="Compras" data={compras.data} loading={compras.isFetching} error={compras.error} />
            <RelatorioSection title="Gerencial financeiro" moduleTag="Financeiro" data={financeiro.data} loading={financeiro.isFetching} error={financeiro.error} />
            <RelatorioSection title="Gerencial de estoque" moduleTag="Estoque" data={estoque.data} loading={estoque.isFetching} error={estoque.error} />
            <RelatorioSection title="Gerencial fiscal" moduleTag="Fiscal" data={fiscal.data} loading={fiscal.isFetching} error={fiscal.error} />
        </>
    );
};
