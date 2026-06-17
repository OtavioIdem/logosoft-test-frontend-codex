'use client';

import { useState } from 'react';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { formatDate, formatMoney } from '@/features/financeiro/components/financeiroUiUtils';
import { useFluxoCaixa } from '@/features/financeiro/hooks/useFinanceiroResources';
import { FluxoCaixaQuery } from '@/features/financeiro/types/financeiro.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { mapApiError } from '@/lib/http/apiError';

const startOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
};

const endOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
};

const MetricCard = ({ label, value, helper }: { label: string; value: number; helper?: string }) => (
    <div className="col-12 md:col-4">
        <Card className="h-full">
            <span className="block text-color-secondary mb-2">{label}</span>
            <strong className="text-2xl">{formatMoney(value)}</strong>
            {helper ? <small className="block text-color-secondary mt-2">{helper}</small> : null}
        </Card>
    </div>
);

export const FluxoCaixaPage = () => {
    const { hasPermission } = usePermissions();
    const [query, setQuery] = useState<FluxoCaixaQuery>({ dataInicial: startOfMonth(), dataFinal: endOfMonth() });
    const fluxoQuery = useFluxoCaixa(query);
    const fluxo = fluxoQuery.data;

    if (!hasPermission('FINANCEIRO_CONSULTAR')) return <UnauthorizedState description="Fluxo de caixa exige FINANCEIRO_CONSULTAR." />;

    const update = (name: keyof FluxoCaixaQuery, value: string | Date | null) => setQuery((current) => ({ ...current, [name]: value || null }));

    return (
        <>
            <PageHeader
                title="Fluxo de caixa"
                description="Consulta visão prevista e realizada do financeiro por período, empresa e filial."
                actions={
                    <div className="flex flex-column lg:flex-row gap-2 lg:align-items-center">
                        <EmpresaFilialFilter empresaId={query.empresaId ?? null} filialId={query.filialId ?? null} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                        <div className="flex flex-column gap-1"><small className="text-color-secondary">Data inicial</small><DateTimeInput value={query.dataInicial instanceof Date ? query.dataInicial : new Date(query.dataInicial ?? startOfMonth())} onChange={(value) => update('dataInicial', value ?? startOfMonth())} /></div>
                        <div className="flex flex-column gap-1"><small className="text-color-secondary">Data final</small><DateTimeInput value={query.dataFinal instanceof Date ? query.dataFinal : new Date(query.dataFinal ?? endOfMonth())} onChange={(value) => update('dataFinal', value ?? endOfMonth())} /></div>
                    </div>
                }
            />
            <Message className="w-full mb-3" severity="info" text="O frontend apenas consulta o consolidado. Cálculo de previsto, realizado, baixa e estorno permanece no backend." />
            {fluxoQuery.error ? <ApiErrorPanel error={mapApiError(fluxoQuery.error)} /> : null}
            <div className="grid">
                <MetricCard label="Entradas previstas" value={fluxo?.entradasPrevistas ?? 0} helper={fluxo ? `${formatDate(fluxo.dataInicial)} até ${formatDate(fluxo.dataFinal)}` : 'Aguardando backend'} />
                <MetricCard label="Saídas previstas" value={fluxo?.saidasPrevistas ?? 0} />
                <MetricCard label="Saldo previsto" value={fluxo?.saldoPrevisto ?? 0} />
                <MetricCard label="Entradas realizadas" value={fluxo?.entradasRealizadas ?? 0} />
                <MetricCard label="Saídas realizadas" value={fluxo?.saidasRealizadas ?? 0} />
                <MetricCard label="Saldo realizado" value={fluxo?.saldoRealizado ?? 0} />
                <MetricCard label="Saldo total" value={fluxo?.saldoTotal ?? 0} helper="Previsto + realizado conforme contrato backend" />
            </div>
        </>
    );
};
