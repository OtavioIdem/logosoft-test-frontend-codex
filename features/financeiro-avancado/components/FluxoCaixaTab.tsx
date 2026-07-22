'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DateInput } from '@/components/forms/DateInput';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { mapApiError } from '@/lib/http/apiError';
import { useFluxoCaixaAvancado } from '@/features/financeiro-avancado/hooks/useFinanceiroAvancadoResources';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const toDateOnly = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

const startOfMonth = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); };
const endOfMonth = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth() + 1, 0); };

const Indicador = ({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'orange' | 'blue' }) => (
    <div className="col-6 md:col-3">
        <span className="block text-color-secondary text-sm">{label}</span>
        <strong className={tone ? `text-${tone}-600` : undefined}>{formatMoney(value)}</strong>
    </div>
);

export const FluxoCaixaTab = () => {
    const { hasPermission } = usePermissions();
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [dataInicial, setDataInicial] = useState<Date | null>(startOfMonth());
    const [dataFinal, setDataFinal] = useState<Date | null>(endOfMonth());
    const [enabled, setEnabled] = useState(false);

    const query = useMemo(() => ({ empresaId, filialId, dataInicial: toDateOnly(dataInicial), dataFinal: toDateOnly(dataFinal) }), [empresaId, filialId, dataInicial, dataFinal]);
    const fluxoQuery = useFluxoCaixaAvancado(query, hasPermission('FINANCEIRO_FLUXO_CAIXA_CONSULTAR') && enabled);
    const fluxo = fluxoQuery.data ?? null;

    if (!hasPermission('FINANCEIRO_FLUXO_CAIXA_CONSULTAR')) {
        return <UnauthorizedState description="O fluxo de caixa exige a permissão FINANCEIRO_FLUXO_CAIXA_CONSULTAR." />;
    }

    return (
        <>
            <Card className="mb-3">
                <div className="grid formgrid p-fluid align-items-end">
                    <div className="col-12 md:col-5"><EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={(value) => { setEmpresaId(value); setFilialId(null); }} onFilialChange={setFilialId} /></div>
                    <div className="field col-6 md:col-3"><label htmlFor="fcInicial" className="font-medium">Data inicial</label><DateInput id="fcInicial" value={dataInicial} onChange={setDataInicial} /></div>
                    <div className="field col-6 md:col-3"><label htmlFor="fcFinal" className="font-medium">Data final</label><DateInput id="fcFinal" value={dataFinal} onChange={setDataFinal} /></div>
                    <div className="field col-12 md:col-1"><Button className="w-full" label="Consultar" icon="pi pi-search" loading={fluxoQuery.isFetching} onClick={() => setEnabled(true)} /></div>
                </div>
            </Card>

            {fluxoQuery.error ? <ApiErrorPanel error={mapApiError(fluxoQuery.error)} /> : null}
            {!enabled ? <Message className="w-full" severity="info" text="Defina o período e consulte o fluxo de caixa." /> : null}

            {fluxo ? (
                <Card title="Fluxo de caixa">
                    <div className="grid">
                        <Indicador label="Entradas previstas" value={fluxo.entradasPrevistas} tone="blue" />
                        <Indicador label="Saídas previstas" value={fluxo.saidasPrevistas} tone="orange" />
                        <Indicador label="Entradas realizadas" value={fluxo.entradasRealizadas} tone="green" />
                        <Indicador label="Saídas realizadas" value={fluxo.saidasRealizadas} tone="orange" />
                        <Indicador label="Saldo previsto" value={fluxo.saldoPrevisto} />
                        <Indicador label="Saldo realizado" value={fluxo.saldoRealizado} tone="green" />
                        <Indicador label="Saldo projetado" value={fluxo.saldoProjetado} tone="blue" />
                    </div>
                </Card>
            ) : null}
        </>
    );
};
