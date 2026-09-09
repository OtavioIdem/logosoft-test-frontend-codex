'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useNecessidadeOrdem, useOrdemProducao, useOrdensProducao, useOrdemProducaoMutations } from '@/features/producao/hooks/useProducaoResources';
import { ApontamentoProducaoFormValues, ApontamentoProducaoResponse, NecessidadeComponenteResponse, OrdemProducaoFormValues, OrdemProducaoResumoResponse, OrdensProducaoListQuery } from '@/features/producao/types/producao.types';
import { ApontamentoDialog, OrdemProducaoFormDialog } from '@/features/producao/components/ProducaoDialogs';
import {
    ordemMostraNecessidade,
    ordemPodeApontar,
    ordemPodeCancelar,
    ordemPodeEncerrar,
    ordemPodeLiberar,
    statusOrdemFilterOptions,
    statusOrdemProducaoLabel,
    statusOrdemProducaoSeverity,
    tipoApontamentoLabel
} from '@/features/producao/components/producaoLabels';
import { formatMoneyOptional } from '@/lib/formatters/money';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const filterLocal = (records: OrdemProducaoResumoResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => record.numero.toLowerCase().includes(normalized));
};

export const OrdensProducaoPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<OrdensProducaoListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [apontamentoVisible, setApontamentoVisible] = useState(false);
    const [encerrarVisible, setEncerrarVisible] = useState(false);
    const [cancelarVisible, setCancelarVisible] = useState(false);
    const [encerrarObs, setEncerrarObs] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const ordensQuery = useOrdensProducao(filters, hasPermission('PRODUCAO_CONSULTAR'));
    const detalheQuery = useOrdemProducao(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const status = detalhe ? Number(detalhe.status) : 0;
    const necessidadeQuery = useNecessidadeOrdem(selectedId, Boolean(detalhe) && ordemMostraNecessidade(status));
    const { criarMutation, liberarMutation, apontamentoMutation, encerrarMutation, cancelarMutation } = useOrdemProducaoMutations();

    const produtosQuery = useProdutos({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const produtoLabel = useMemo(() => {
        const map = new Map(produtoOptions.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [produtoOptions]);

    const records = useMemo(() => filterLocal(ordensQuery.data ?? [], localSearch), [ordensQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('PRODUCAO_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Produção exige a permissão PRODUCAO_CONSULTAR." />;
    }

    const updateFilter = (name: keyof OrdensProducaoListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: OrdemProducaoFormValues) => {
        await runWithToast(async () => { const criada = await criarMutation.mutateAsync(values); setFormVisible(false); setSelectedId(criada.id); }, { success: { summary: 'OP criada' }, error: { summary: 'Erro ao criar OP' }, rethrow: true });
    };
    const liberar = () => selectedId && runWithToast(() => liberarMutation.mutateAsync(selectedId), { success: { summary: 'OP liberada', detail: 'Componentes reservados.' }, error: { summary: 'Erro ao liberar OP (verifique saldo)' } });
    const apontar = async (values: ApontamentoProducaoFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await apontamentoMutation.mutateAsync({ id: selectedId, values }); setApontamentoVisible(false); }, { success: { summary: 'Apontamento registrado' }, error: { summary: 'Erro ao registrar apontamento' }, rethrow: true });
    };
    const encerrar = async () => {
        if (!selectedId) return;
        await runWithToast(async () => { await encerrarMutation.mutateAsync({ id: selectedId, observacao: encerrarObs.trim() || null }); setEncerrarVisible(false); setEncerrarObs(''); }, { success: { summary: 'OP encerrada', detail: 'Baixa de reservas e entrada do acabado.' }, error: { summary: 'Erro ao encerrar OP' }, rethrow: true });
    };
    const cancelar = async (motivo: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await cancelarMutation.mutateAsync({ id: selectedId, motivo }); setCancelarVisible(false); }, { success: { summary: 'OP cancelada' }, error: { summary: 'Erro ao cancelar OP' }, rethrow: true });
    };

    const necessidade = necessidadeQuery.data ?? [];
    const temFaltante = necessidade.some((item) => item.faltante > 0);

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.status ?? null} options={statusOrdemFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <SearchInput ariaLabel="Buscar OP" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="PRODUCAO_ORDENS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Nova OP" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Ordens de produção" description="Ciclo da OP: liberar (reserva), apontar e encerrar (baixa e entrada do acabado)." actions={headerActions} />
            <Card>
                {ordensQuery.error ? <ApiErrorPanel error={mapApiError(ordensQuery.error)} /> : null}
                <DataTableServer<OrdemProducaoResumoResponse> value={visibleRecords} totalRecords={records.length} loading={ordensQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma ordem de produção encontrada.">
                    <Column field="numero" header="Número" />
                    <Column header="Produto" body={(row: OrdemProducaoResumoResponse) => produtoLabel(row.produtoId)} />
                    <Column header="Planejado" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: OrdemProducaoResumoResponse) => row.quantidadePlanejada.toLocaleString('pt-BR')} />
                    <Column header="Data" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: OrdemProducaoResumoResponse) => formatDate(row.dataPlanejada)} />
                    <Column header="Status" body={(row: OrdemProducaoResumoResponse) => <Tag value={statusOrdemProducaoLabel(Number(row.status))} severity={statusOrdemProducaoSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: OrdemProducaoResumoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'PRODUCAO_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
                </DataTableServer>
                {!ordensQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma OP" description="Crie uma ordem de produção ou ajuste os filtros." /> : null}
            </Card>

            {detalhe ? (
                <Card title={`OP ${detalhe.numero} — ${produtoLabel(detalhe.produtoId)}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusOrdemProducaoLabel(status)} severity={statusOrdemProducaoSeverity(status) ?? undefined} />
                        <span className="text-color-secondary">Planejado {detalhe.quantidadePlanejada.toLocaleString('pt-BR')}{detalhe.quantidadeProduzida != null ? ` · produzido ${detalhe.quantidadeProduzida.toLocaleString('pt-BR')}` : ''} · {formatDate(detalhe.dataPlanejada)}</span>
                        {detalhe.custoConsolidado != null ? <Tag value={`Custo ${formatMoneyOptional(detalhe.custoConsolidado)}`} severity="info" /> : null}
                        <div className="flex-1" />
                        {ordemPodeLiberar(status) ? <PermissionGuard permission="PRODUCAO_ORDENS_LIBERAR" mode="disable">{({ disabled }) => <Button label="Liberar" icon="pi pi-play" size="small" disabled={disabled} loading={liberarMutation.isPending} onClick={liberar} />}</PermissionGuard> : null}
                        {ordemPodeApontar(status) ? <PermissionGuard permission="PRODUCAO_ORDENS_APONTAR" mode="disable">{({ disabled }) => <Button label="Apontar" icon="pi pi-pencil" size="small" severity="secondary" disabled={disabled} onClick={() => setApontamentoVisible(true)} />}</PermissionGuard> : null}
                        {ordemPodeEncerrar(status) ? <PermissionGuard permission="PRODUCAO_ORDENS_ENCERRAR" mode="disable">{({ disabled }) => <Button label="Encerrar" icon="pi pi-check" size="small" severity="success" disabled={disabled} onClick={() => setEncerrarVisible(true)} />}</PermissionGuard> : null}
                        {ordemPodeCancelar(status) ? <PermissionGuard permission="PRODUCAO_ORDENS_CANCELAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" size="small" severity="danger" outlined disabled={disabled} onClick={() => setCancelarVisible(true)} />}</PermissionGuard> : null}
                    </div>

                    {ordemMostraNecessidade(status) ? (
                        <>
                            {temFaltante ? <Message className="w-full mb-2" severity="warn" text="Há componentes faltantes — liberar sem saldo suficiente será rejeitado pelo backend." /> : null}
                            <DataTable value={necessidade} dataKey="produtoId" loading={necessidadeQuery.isFetching} emptyMessage="Sem necessidade calculada (ficha ativa exigida)." responsiveLayout="scroll" stripedRows size="small" className="mb-3">
                                <Column header="Componente" body={(item: NecessidadeComponenteResponse) => produtoLabel(item.produtoId)} />
                                <Column header="Necessário" body={(item: NecessidadeComponenteResponse) => item.quantidadeNecessaria.toLocaleString('pt-BR')} />
                                <Column header="Disponível" body={(item: NecessidadeComponenteResponse) => item.quantidadeDisponivel.toLocaleString('pt-BR')} />
                                <Column header="Faltante" body={(item: NecessidadeComponenteResponse) => <span className={item.faltante > 0 ? 'text-red-500 font-medium' : ''}>{item.faltante.toLocaleString('pt-BR')}</span>} />
                            </DataTable>
                        </>
                    ) : null}

                    <DataTable value={detalhe.apontamentos} dataKey="id" emptyMessage="Nenhum apontamento." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Data" body={(item: ApontamentoProducaoResponse) => formatDate(item.data)} />
                        <Column header="Tipo" body={(item: ApontamentoProducaoResponse) => tipoApontamentoLabel(Number(item.tipo))} />
                        <Column header="Produto" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ApontamentoProducaoResponse) => (item.produtoId ? produtoLabel(item.produtoId) : '—')} />
                        <Column header="Quantidade" body={(item: ApontamentoProducaoResponse) => item.quantidade.toLocaleString('pt-BR')} />
                    </DataTable>
                </Card>
            ) : null}

            <OrdemProducaoFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
            <ApontamentoDialog visible={apontamentoVisible} loading={apontamentoMutation.isPending} produtoOptions={produtoOptions} produtoLoading={produtosQuery.isFetching} onHide={() => setApontamentoVisible(false)} onSubmit={apontar} />
            <ReasonDialog visible={cancelarVisible} title="Cancelar ordem de produção" confirmLabel="Cancelar OP" loading={cancelarMutation.isPending} onHide={() => setCancelarVisible(false)} onConfirm={cancelar} />
            <Dialog header="Encerrar ordem de produção" visible={encerrarVisible} modal style={{ width: 'min(36rem, 96vw)' }} onHide={() => setEncerrarVisible(false)} footer={
                <div className="flex justify-content-end gap-2">
                    <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={() => setEncerrarVisible(false)} disabled={encerrarMutation.isPending} />
                    <Button type="button" label="Encerrar" icon="pi pi-check" loading={encerrarMutation.isPending} onClick={encerrar} />
                </div>
            }>
                <label htmlFor="opEncerrarObs" className="block font-medium mb-2">Observação</label>
                <InputTextarea id="opEncerrarObs" className="w-full" value={encerrarObs} rows={3} autoResize onChange={(event) => setEncerrarObs(event.target.value)} />
            </Dialog>
        </>
    );
};
