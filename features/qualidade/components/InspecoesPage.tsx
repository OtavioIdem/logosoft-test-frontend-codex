'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
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
import { useInspecao, useInspecoes, useInspecaoMutations } from '@/features/qualidade/hooks/useQualidadeResources';
import { CriterioFormValues, CriterioInspecaoResponse, InspecaoFormValues, InspecaoResumoResponse, InspecoesListQuery, ResultadoCriterioFormValues } from '@/features/qualidade/types/qualidade.types';
import { CriterioDialog, InspecaoFormDialog, ResultadoDialog } from '@/features/qualidade/components/QualidadeDialogs';
import {
    inspecaoPodeAprovarReprovar,
    inspecaoPodeCriterios,
    inspecaoPodeEncerrar,
    inspecaoPodeResultados,
    origemInspecaoFilterOptions,
    origemInspecaoLabel,
    resultadoCriterioLabel,
    resultadoCriterioSeverity,
    statusInspecaoFilterOptions,
    statusInspecaoLabel,
    statusInspecaoSeverity
} from '@/features/qualidade/components/qualidadeLabels';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const InspecoesPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<InspecoesListQuery>({});
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialog, setDialog] = useState<'criar' | 'criterio' | 'reprovar' | 'encerrar' | null>(null);
    const [resultadoAlvo, setResultadoAlvo] = useState<CriterioInspecaoResponse | null>(null);

    const inspecoesQuery = useInspecoes(filters, hasPermission('QUALIDADE_CONSULTAR'));
    const detalheQuery = useInspecao(selectedId);
    const detalhe = detalheQuery.data ?? null;
    const { criarMutation, criterioMutation, resultadoMutation, aprovarMutation, reprovarMutation, encerrarMutation } = useInspecaoMutations();

    const produtosQuery = useProdutos({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null });
    const produtoLabel = useMemo(() => {
        const map = new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} - ${produto.descricao}`]));
        return (id: string) => map.get(id) ?? id;
    }, [produtosQuery.data]);

    const records = useMemo(() => inspecoesQuery.data ?? [], [inspecoesQuery.data]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('QUALIDADE_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Qualidade exige a permissão QUALIDADE_CONSULTAR." />;
    }

    const updateFilter = (name: keyof InspecoesListQuery, value: string | number | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };
    const close = () => setDialog(null);

    const criar = async (values: InspecaoFormValues) => {
        await runWithToast(async () => { const criada = await criarMutation.mutateAsync(values); close(); setSelectedId(criada.id); }, { success: { summary: 'Inspeção criada' }, error: { summary: 'Erro ao criar inspeção' }, rethrow: true });
    };
    const adicionarCriterio = async (values: CriterioFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await criterioMutation.mutateAsync({ id: selectedId, values }); close(); }, { success: { summary: 'Critério adicionado' }, error: { summary: 'Erro ao adicionar critério' }, rethrow: true });
    };
    const registrarResultado = async (values: ResultadoCriterioFormValues) => {
        if (!selectedId) return;
        await runWithToast(async () => { await resultadoMutation.mutateAsync({ id: selectedId, values }); setResultadoAlvo(null); }, { success: { summary: 'Resultado registrado' }, error: { summary: 'Erro ao registrar resultado' }, rethrow: true });
    };
    const aprovar = () => selectedId && runWithToast(() => aprovarMutation.mutateAsync(selectedId), { success: { summary: 'Inspeção aprovada' }, error: { summary: 'Erro ao aprovar inspeção' } });
    const reprovar = async (descricao: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await reprovarMutation.mutateAsync({ id: selectedId, descricao }); close(); }, { success: { summary: 'Inspeção reprovada', detail: 'Reprovação crítica bloqueia estoque e gera não-conformidade.' }, error: { summary: 'Erro ao reprovar inspeção' }, rethrow: true });
    };
    const encerrar = async (evidencia: string) => {
        if (!selectedId) return;
        await runWithToast(async () => { await encerrarMutation.mutateAsync({ id: selectedId, evidencia }); close(); }, { success: { summary: 'Inspeção encerrada' }, error: { summary: 'Erro ao encerrar inspeção' }, rethrow: true });
    };

    const status = detalhe ? Number(detalhe.status) : 0;

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <Dropdown value={filters.origem ?? null} options={origemInspecaoFilterOptions} onChange={(event) => updateFilter('origem', event.value)} aria-label="Filtrar por origem" />
            <Dropdown value={filters.status ?? null} options={statusInspecaoFilterOptions} onChange={(event) => updateFilter('status', event.value)} aria-label="Filtrar por status" />
            <PermissionGuard permission="QUALIDADE_INSPECIONAR" mode="disable">{({ disabled }) => <Button label="Nova inspeção" icon="pi pi-plus" disabled={disabled} onClick={() => setDialog('criar')} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Inspeções" description="Inspeção de qualidade com critérios e reprovação (crítica bloqueia estoque)." actions={headerActions} />
            <Card>
                {inspecoesQuery.error ? <ApiErrorPanel error={mapApiError(inspecoesQuery.error)} /> : null}
                <DataTableServer<InspecaoResumoResponse> value={visibleRecords} totalRecords={records.length} loading={inspecoesQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhuma inspeção encontrada.">
                    <Column header="Produto" body={(row: InspecaoResumoResponse) => produtoLabel(row.produtoId)} />
                    <Column header="Origem" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: InspecaoResumoResponse) => origemInspecaoLabel(Number(row.origem))} />
                    <Column header="Qtd" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: InspecaoResumoResponse) => row.quantidade.toLocaleString('pt-BR')} />
                    <Column header="Data" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: InspecaoResumoResponse) => formatDate(row.dataInspecao)} />
                    <Column header="Status" body={(row: InspecaoResumoResponse) => <Tag value={statusInspecaoLabel(Number(row.status))} severity={statusInspecaoSeverity(Number(row.status)) ?? undefined} />} />
                    <Column header="Ações" alignHeader="right" body={(row: InspecaoResumoResponse) => <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-eye', permission: 'QUALIDADE_CONSULTAR', onClick: () => setSelectedId(row.id) }]} />} />
                </DataTableServer>
                {!inspecoesQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhuma inspeção" description="Crie uma inspeção ou ajuste os filtros." /> : null}
            </Card>

            {detalhe ? (
                <Card title={`Inspeção — ${produtoLabel(detalhe.produtoId)}`} className="mt-3">
                    <div className="flex gap-2 flex-wrap mb-3 align-items-center">
                        <Tag value={statusInspecaoLabel(status)} severity={statusInspecaoSeverity(status) ?? undefined} />
                        <span className="text-color-secondary">{origemInspecaoLabel(Number(detalhe.origem))} · {formatDate(detalhe.dataInspecao)}</span>
                        <div className="flex-1" />
                        {inspecaoPodeCriterios(status) ? <PermissionGuard permission="QUALIDADE_INSPECIONAR" mode="disable">{({ disabled }) => <Button label="Adicionar critério" icon="pi pi-plus" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('criterio')} />}</PermissionGuard> : null}
                        {inspecaoPodeAprovarReprovar(status) ? <PermissionGuard permission="QUALIDADE_INSPECIONAR" mode="disable">{({ disabled }) => <Button label="Aprovar" icon="pi pi-check" size="small" severity="success" disabled={disabled} loading={aprovarMutation.isPending} onClick={aprovar} />}</PermissionGuard> : null}
                        {inspecaoPodeAprovarReprovar(status) ? <PermissionGuard permission="QUALIDADE_INSPECIONAR" mode="disable">{({ disabled }) => <Button label="Reprovar" icon="pi pi-times" size="small" severity="danger" disabled={disabled} onClick={() => setDialog('reprovar')} />}</PermissionGuard> : null}
                        {inspecaoPodeEncerrar(status) ? <PermissionGuard permission="QUALIDADE_INSPECIONAR" mode="disable">{({ disabled }) => <Button label="Encerrar" icon="pi pi-flag" size="small" disabled={disabled} onClick={() => setDialog('encerrar')} />}</PermissionGuard> : null}
                    </div>

                    {detalhe.naoConformidadeId ? <Message className="w-full mb-3" severity="warn" text="Inspeção reprovada gerou não-conformidade. Acompanhe em Não-conformidades." /> : null}

                    <DataTable value={detalhe.criterios} dataKey="id" emptyMessage="Nenhum critério." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Critério" body={(item: CriterioInspecaoResponse) => (<span>{item.descricao}{item.critico ? <Tag className="ml-2" value="Crítico" severity="danger" /> : null}</span>)} />
                        <Column header="Esperado" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: CriterioInspecaoResponse) => item.valorEsperado || '—'} />
                        <Column header="Medido" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: CriterioInspecaoResponse) => item.valorMedido || '—'} />
                        <Column header="Resultado" body={(item: CriterioInspecaoResponse) => <Tag value={resultadoCriterioLabel(Number(item.resultado))} severity={resultadoCriterioSeverity(Number(item.resultado)) ?? undefined} />} />
                        <Column header="Ações" alignHeader="right" body={(item: CriterioInspecaoResponse) => (
                            inspecaoPodeResultados(status) ? <PermissionGuard permission="QUALIDADE_INSPECIONAR" mode="disable">{({ disabled }) => <Button label="Resultado" icon="pi pi-pencil" size="small" text disabled={disabled} onClick={() => setResultadoAlvo(item)} />}</PermissionGuard> : <span className="text-color-secondary">—</span>
                        )} />
                    </DataTable>
                </Card>
            ) : null}

            <InspecaoFormDialog visible={dialog === 'criar'} loading={criarMutation.isPending} onHide={close} onSubmit={criar} />
            <CriterioDialog visible={dialog === 'criterio'} loading={criterioMutation.isPending} onHide={close} onSubmit={adicionarCriterio} />
            <ResultadoDialog visible={Boolean(resultadoAlvo)} loading={resultadoMutation.isPending} criterioId={resultadoAlvo?.id ?? ''} criterioDescricao={resultadoAlvo?.descricao ?? ''} onHide={() => setResultadoAlvo(null)} onSubmit={registrarResultado} />
            <ReasonDialog visible={dialog === 'reprovar'} title="Reprovar inspeção" confirmLabel="Reprovar" loading={reprovarMutation.isPending} onHide={close} onConfirm={reprovar} />
            <ReasonDialog visible={dialog === 'encerrar'} title="Encerrar inspeção" confirmLabel="Encerrar" loading={encerrarMutation.isPending} onHide={close} onConfirm={encerrar} />
        </>
    );
};
