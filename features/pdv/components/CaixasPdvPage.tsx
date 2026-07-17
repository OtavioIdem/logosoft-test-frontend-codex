'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useCaixas, useCaixasMutations } from '@/features/pdv/hooks/usePdvResources';
import { AbrirCaixaFormValues, CaixaResponse, CaixasListQuery, FecharCaixaFormValues, MovimentoCaixaFormValues } from '@/features/pdv/types/pdv.types';
import { AbrirCaixaDialog, FecharCaixaDialog, MovimentoCaixaDialog } from '@/features/pdv/components/CaixaDialogs';
import { isCaixaAberto, statusCaixaLabel, statusCaixaSeverity } from '@/features/pdv/components/pdvLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');

type MovimentoState = { kind: 'suprimento' | 'sangria'; caixa: CaixaResponse } | null;

export const CaixasPdvPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<CaixasListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [abrirVisible, setAbrirVisible] = useState(false);
    const [movimento, setMovimento] = useState<MovimentoState>(null);
    const [fecharCaixa, setFecharCaixa] = useState<CaixaResponse | null>(null);

    const caixasQuery = useCaixas(filters, hasPermission('PDV_CONSULTAR'));
    const { abrirMutation, suprimentoMutation, sangriaMutation, fecharMutation } = useCaixasMutations();

    const records = useMemo(() => caixasQuery.data ?? [], [caixasQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('PDV_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de PDV exige a permissão PDV_CONSULTAR." />;
    }

    const updateFilter = (name: keyof CaixasListQuery, value: string | null) => { setFirst(0); setFilters((c) => ({ ...c, [name]: value || null })); };

    const abrir = async (values: AbrirCaixaFormValues) => {
        await runWithToast(
            async () => { await abrirMutation.mutateAsync(values); setAbrirVisible(false); },
            { success: { summary: 'Caixa aberto', detail: `Caixa ${values.codigo} aberto.` }, error: { summary: 'Erro ao abrir caixa', detail: 'Não foi possível abrir o caixa.' }, rethrow: true }
        );
    };

    const registrarMovimento = async (values: MovimentoCaixaFormValues) => {
        if (!movimento) return;
        const acao = movimento.kind === 'suprimento' ? suprimentoMutation : sangriaMutation;
        await runWithToast(
            async () => { await acao.mutateAsync({ id: movimento.caixa.id, values }); setMovimento(null); },
            { success: { summary: movimento.kind === 'suprimento' ? 'Suprimento registrado' : 'Sangria registrada' }, error: { summary: 'Erro no movimento' }, rethrow: true }
        );
    };

    const fechar = async (values: FecharCaixaFormValues) => {
        if (!fecharCaixa) return;
        await runWithToast(
            async () => { await fecharMutation.mutateAsync({ id: fecharCaixa.id, values }); setFecharCaixa(null); },
            { success: { summary: 'Caixa fechado', detail: 'Conferência registrada.' }, error: { summary: 'Erro ao fechar caixa' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <PermissionGuard permission="PDV_CAIXA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Abrir caixa" icon="pi pi-plus" disabled={disabled} onClick={() => setAbrirVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Caixas (PDV)" description="Abertura, suprimento, sangria e fechamento com conferência." actions={headerActions} />
            <Card>
                {caixasQuery.error ? <ApiErrorPanel error={mapApiError(caixasQuery.error)} /> : null}
                <DataTableServer<CaixaResponse> value={visibleRecords} totalRecords={records.length} loading={caixasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum caixa encontrado.">
                    <Column field="codigo" header="Código" />
                    <Column field="terminal" header="Terminal" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                    <Column header="Abertura" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: CaixaResponse) => formatDateTime(row.dataAbertura)} />
                    <Column header="Vendas" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: CaixaResponse) => formatMoney(row.totalVendas)} />
                    <Column header="Saldo dinheiro" body={(row: CaixaResponse) => formatMoney(row.saldoDinheiroEsperado)} />
                    <Column header="Status" body={(row: CaixaResponse) => <Tag value={statusCaixaLabel(Number(row.statusCaixa))} severity={statusCaixaSeverity(Number(row.statusCaixa)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: CaixaResponse) => <DataTableActions actions={[
                        { key: 'suprimento', label: 'Suprimento', icon: 'pi pi-arrow-down', permission: 'PDV_CAIXA_GERENCIAR', disabled: !isCaixaAberto(Number(row.statusCaixa)), onClick: () => setMovimento({ kind: 'suprimento', caixa: row }) },
                        { key: 'sangria', label: 'Sangria', icon: 'pi pi-arrow-up', permission: 'PDV_CAIXA_GERENCIAR', disabled: !isCaixaAberto(Number(row.statusCaixa)), onClick: () => setMovimento({ kind: 'sangria', caixa: row }) },
                        { key: 'fechar', label: 'Fechar', icon: 'pi pi-lock', severity: 'danger', permission: 'PDV_CAIXA_GERENCIAR', disabled: !isCaixaAberto(Number(row.statusCaixa)), onClick: () => setFecharCaixa(row) }
                    ]} />} />
                </DataTableServer>
                {!caixasQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum caixa" description="Abra um caixa para iniciar a operação." /> : null}
            </Card>

            <AbrirCaixaDialog visible={abrirVisible} loading={abrirMutation.isPending} onHide={() => setAbrirVisible(false)} onSubmit={abrir} />
            <MovimentoCaixaDialog visible={movimento?.kind === 'suprimento'} loading={suprimentoMutation.isPending} title="Suprimento de caixa" confirmLabel="Registrar suprimento" onHide={() => setMovimento(null)} onSubmit={registrarMovimento} />
            <MovimentoCaixaDialog visible={movimento?.kind === 'sangria'} loading={sangriaMutation.isPending} title="Sangria de caixa" confirmLabel="Registrar sangria" onHide={() => setMovimento(null)} onSubmit={registrarMovimento} />
            <FecharCaixaDialog visible={Boolean(fecharCaixa)} loading={fecharMutation.isPending} caixa={fecharCaixa} onHide={() => setFecharCaixa(null)} onSubmit={fechar} />
        </>
    );
};
