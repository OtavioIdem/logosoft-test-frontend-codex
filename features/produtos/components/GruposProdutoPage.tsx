'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { FieldError } from '@/components/forms/FieldError';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { fieldErrorMap, textValue } from '@/features/produtos/components/produtoFormUtils';
import { criarGrupoProdutoSchema, atualizarGrupoProdutoSchema } from '@/features/produtos/schemas/produtosSchemas';
import { GrupoProdutoFormValues, GrupoProdutoResponse } from '@/features/produtos/types/produtos.types';
import { useGrupoProdutoMutations, useGruposProduto } from '@/features/produtos/hooks/useProdutosResources';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { EntityStatus, SelectOption } from '@/types/erp';

export type GrupoProdutoTreeRow = GrupoProdutoResponse & { depth: number };

/** Ordena os nós por pai e código; filhos órfãos ficam visíveis na raiz em vez de sumirem da operação. */
export const buildGrupoProdutoTreeRows = (records: GrupoProdutoResponse[]): GrupoProdutoTreeRow[] => {
    const byParent = new Map<string | null, GrupoProdutoResponse[]>();
    const ids = new Set(records.map((record) => record.id));
    records.forEach((record) => {
        const parent = record.grupoPaiId && ids.has(record.grupoPaiId) ? record.grupoPaiId : null;
        byParent.set(parent, [...(byParent.get(parent) ?? []), record]);
    });
    const output: GrupoProdutoTreeRow[] = [];
    const visit = (parentId: string | null, depth: number, visited: Set<string>) => {
        (byParent.get(parentId) ?? []).sort((a, b) => a.codigo.localeCompare(b.codigo)).forEach((record) => {
            if (visited.has(record.id)) return;
            visited.add(record.id); output.push({ ...record, depth }); visit(record.id, depth + 1, visited);
        });
    };
    visit(null, 0, new Set());
    return output;
};

const active = (record: GrupoProdutoResponse) => Number(record.status) === EntityStatus.Ativo;
const initialValues = (record?: GrupoProdutoResponse | null, empresaId?: string | null): GrupoProdutoFormValues => record ? {
    id: record.id, descricao: record.descricao, exigeNcm: record.exigeNcm, margemLucroPercentual: record.margemLucroPercentual, margemLucroNivel1: record.margemLucroNivel1, margemLucroNivel2: record.margemLucroNivel2, margemLucroNivel3: record.margemLucroNivel3, percentualComissao: record.percentualComissao, descontoMaximoPercentual: record.descontoMaximoPercentual, controlaEstoque: record.controlaEstoque, controlaEstoqueContabil: record.controlaEstoqueContabil
} : { empresaId: empresaId ?? '', codigo: '', grupoPaiId: null, descricao: '', exigeNcm: true, margemLucroPercentual: null, margemLucroNivel1: null, margemLucroNivel2: null, margemLucroNivel3: null, percentualComissao: null, descontoMaximoPercentual: 0, controlaEstoque: false, controlaEstoqueContabil: true };

const GrupoProdutoDialog = ({ visible, record, empresaId, parentOptions, loading, onHide, onSubmit }: { visible: boolean; record: GrupoProdutoResponse | null; empresaId: string | null; parentOptions: SelectOption<string>[]; loading: boolean; onHide: () => void; onSubmit: (values: GrupoProdutoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<GrupoProdutoFormValues>(() => initialValues(record, empresaId));
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const reset = () => { setValues(initialValues(record, empresaId)); setErrors({}); };
    const update = (field: keyof GrupoProdutoFormValues, value: unknown) => { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); };
    const submit = async () => {
        const parsed = (record ? atualizarGrupoProdutoSchema : criarGrupoProdutoSchema).safeParse({ ...values, empresaId: record ? undefined : empresaId });
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit({ ...parsed.data, id: record?.id });
    };
    const numeric = (field: keyof GrupoProdutoFormValues, label: string, max?: number) => <div className="field col-12 md:col-3"><label htmlFor={String(field)} className="font-medium">{label}</label><InputNumber id={String(field)} value={typeof values[field] === 'number' ? values[field] as number : null} min={0} max={max} minFractionDigits={0} maxFractionDigits={2} locale="pt-BR" className={classNames({ 'p-invalid': errors[field] })} onValueChange={(event) => update(field, event.value ?? null)} /><FieldError message={errors[field]} /></div>;
    return <Dialog header={record ? 'Editar grupo de produto' : 'Novo grupo de produto'} visible={visible} modal style={{ width: 'min(70rem, 96vw)' }} onShow={reset} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" severity="secondary" outlined onClick={onHide} disabled={loading} /><Button label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
        <Message severity="info" className="w-full mb-3" text="Os padrões do grupo são guardados e ainda não preenchem o produto; terão efeito em uma fatia posterior de preço." />
        <div className="grid formgrid p-fluid">
            {!record ? <><div className="field col-12 md:col-3"><label htmlFor="grupo-codigo" className="font-medium">Código *</label><InputText id="grupo-codigo" value={textValue(values.codigo)} maxLength={15} className={classNames({ 'p-invalid': errors.codigo })} onChange={(event) => update('codigo', event.target.value.toUpperCase())} /><FieldError message={errors.codigo} /></div><div className="field col-12 md:col-4"><label htmlFor="grupo-pai" className="font-medium">Grupo pai</label><Dropdown id="grupo-pai" value={values.grupoPaiId ?? null} options={parentOptions} showClear placeholder="Raiz" onChange={(event) => update('grupoPaiId', event.value ?? null)} /></div></> : <div className="field col-12 md:col-3"><label className="font-medium">Código</label><InputText value={record.codigo} disabled /></div>}
            <div className="field col-12 md:col-5"><label htmlFor="grupo-descricao" className="font-medium">Descrição *</label><InputText id="grupo-descricao" value={textValue(values.descricao)} maxLength={60} className={classNames({ 'p-invalid': errors.descricao })} onChange={(event) => update('descricao', event.target.value)} /><FieldError message={errors.descricao} /></div>
            {numeric('margemLucroPercentual', 'Margem geral (%)')}{numeric('margemLucroNivel1', 'Margem nível 1 (%)')}{numeric('margemLucroNivel2', 'Margem nível 2 (%)')}{numeric('margemLucroNivel3', 'Margem nível 3 (%)')}{numeric('percentualComissao', 'Comissão (%)', 100)}{numeric('descontoMaximoPercentual', 'Desconto máximo (%)', 100)}
            <div className="field col-12 flex gap-4 flex-wrap align-items-center"><div><Checkbox inputId="exigeNcm" checked={Boolean(values.exigeNcm)} onChange={(event) => update('exigeNcm', Boolean(event.checked))} /><label htmlFor="exigeNcm" className="ml-2">Exige NCM</label></div><div><Checkbox inputId="controlaEstoque" checked={Boolean(values.controlaEstoque)} onChange={(event) => update('controlaEstoque', Boolean(event.checked))} /><label htmlFor="controlaEstoque" className="ml-2">Controla estoque</label></div><div><Checkbox inputId="controlaEstoqueContabil" checked={Boolean(values.controlaEstoqueContabil)} onChange={(event) => update('controlaEstoqueContabil', Boolean(event.checked))} /><label htmlFor="controlaEstoqueContabil" className="ml-2">Controla estoque contábil</label></div></div>
        </div>
    </Dialog>;
};

export const GruposProdutoPage = () => {
    const runWithToast = useMutationWithToast(); const { hasPermission } = usePermissions();
    const [empresaId, setEmpresaId] = useState<string | null>(null); const [incluirInativos, setIncluirInativos] = useState(false);
    const [selected, setSelected] = useState<GrupoProdutoResponse | null>(null); const [dialogVisible, setDialogVisible] = useState(false); const [first, setFirst] = useState(0); const [pageRows, setPageRows] = useState(20);
    const [reasonTarget, setReasonTarget] = useState<{ record: GrupoProdutoResponse; action: 'inativar' | 'reativar' } | null>(null); const [moveTarget, setMoveTarget] = useState<GrupoProdutoResponse | null>(null); const [newParentId, setNewParentId] = useState<string | null>(null);
    const query = useGruposProduto({ empresaId, incluirInativos, pagina: 1, tamanho: 500 }); const mutations = useGrupoProdutoMutations();
    const rows = useMemo(() => buildGrupoProdutoTreeRows(query.data?.items ?? []), [query.data?.items]);
    const parentOptions = useMemo(() => rows.filter((item) => active(item)).map((item) => ({ value: item.id, label: `${'— '.repeat(item.depth)}${item.codigo} · ${item.descricao}` })), [rows]);
    if (!hasPermission('PRODUTOS_CONSULTAR')) return <UnauthorizedState description="A rotina exige a permissão PRODUTOS_CONSULTAR." />;
    const reloadAfterConflict = async (operation: () => Promise<unknown>) => runWithToast(operation, { success: { summary: 'Grupo atualizado', detail: 'A árvore de grupos foi atualizada.' }, error: { summary: 'Não foi possível atualizar o grupo', detail: 'Revise as regras do grupo e tente novamente.' }, rethrow: true });
    const save = async (values: GrupoProdutoFormValues) => { await reloadAfterConflict(async () => { await mutations.saveMutation.mutateAsync({ id: values.id, values }); setDialogVisible(false); setSelected(null); }); };
    const confirmReason = async (motivo: string) => { if (!reasonTarget) return; await reloadAfterConflict(async () => { const request = { id: reasonTarget.record.id, motivo }; if (reasonTarget.action === 'inativar') await mutations.inativarMutation.mutateAsync(request); else await mutations.reativarMutation.mutateAsync(request); setReasonTarget(null); }); };
    const move = async () => { if (!moveTarget) return; await reloadAfterConflict(async () => { await mutations.moverMutation.mutateAsync({ id: moveTarget.id, novoGrupoPaiId: newParentId }); setMoveTarget(null); }); };
    return <><PageHeader title="Grupos de produto" description="Organize o catálogo em uma árvore de grupos. Grupo ainda é opcional no produto." actions={<div className="flex gap-2 flex-wrap align-items-center"><EmpresaFilialFilter empresaId={empresaId} filialId={null} onEmpresaChange={setEmpresaId} onFilialChange={() => undefined} /><div className="flex align-items-center gap-2"><Checkbox inputId="inativos" checked={incluirInativos} onChange={(event) => setIncluirInativos(Boolean(event.checked))} /><label htmlFor="inativos">Incluir inativos</label></div><PermissionGuard permission="PRODUTOS_GRUPOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo grupo" icon="pi pi-plus" disabled={disabled || !empresaId} onClick={() => { setSelected(null); setDialogVisible(true); }} />}</PermissionGuard></div>} />
        <Card>{query.error ? <ApiErrorPanel error={mapApiError(query.error)} /> : null}<DataTableServer<GrupoProdutoTreeRow> value={rows.slice(first, first + pageRows)} totalRecords={rows.length} loading={query.isFetching} first={first} rows={pageRows} onPage={(event) => { setFirst(event.first); setPageRows(event.rows); }} emptyMessage="Nenhum grupo encontrado."><Column header="Grupo" body={(row: GrupoProdutoTreeRow) => <span style={{ paddingLeft: `${row.depth * 1.5}rem` }}><i className="pi pi-sitemap mr-2" />{row.codigo} · {row.descricao}</span>} /><Column header="Nível" body={(row: GrupoProdutoTreeRow) => row.nivel} /><Column header="Estoque" body={(row: GrupoProdutoTreeRow) => row.controlaEstoque ? 'Controlado' : 'Não controlado'} /><Column header="Status" body={(row: GrupoProdutoTreeRow) => <StatusTag status={row.status} />} /><Column header="Ações" alignHeader="right" body={(row: GrupoProdutoTreeRow) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'PRODUTOS_GRUPOS_GERENCIAR', disabled: !active(row), onClick: () => { setSelected(row); setDialogVisible(true); } }, { key: 'mover', label: 'Mover', icon: 'pi pi-directions-alt', permission: 'PRODUTOS_GRUPOS_GERENCIAR', disabled: !active(row), onClick: () => { setMoveTarget(row); setNewParentId(row.grupoPaiId ?? null); } }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'PRODUTOS_GRUPOS_GERENCIAR', disabled: !active(row), onClick: () => setReasonTarget({ record: row, action: 'inativar' }) }, { key: 'reativar', label: 'Reativar', icon: 'pi pi-refresh', permission: 'PRODUTOS_GRUPOS_GERENCIAR', disabled: active(row), onClick: () => setReasonTarget({ record: row, action: 'reativar' }) }]} />} /></DataTableServer>{!query.isLoading && empresaId && rows.length === 0 ? <EmptyState title="Nenhum grupo" description="Crie o primeiro grupo para começar a classificar produtos." /> : null}</Card>
        <GrupoProdutoDialog visible={dialogVisible} record={selected} empresaId={empresaId} parentOptions={parentOptions} loading={mutations.saveMutation.isPending} onHide={() => setDialogVisible(false)} onSubmit={save} />
        <Dialog header="Mover grupo" visible={Boolean(moveTarget)} modal onHide={() => setMoveTarget(null)} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" outlined severity="secondary" onClick={() => setMoveTarget(null)} /><Button label="Mover" loading={mutations.moverMutation.isPending} onClick={move} /></div>}><p className="mt-0">Selecione o novo pai ou limpe o campo para mover o grupo para a raiz.</p><Dropdown className="w-full" value={newParentId} options={parentOptions.filter((option) => option.value !== moveTarget?.id)} showClear placeholder="Raiz" onChange={(event) => setNewParentId(event.value ?? null)} /></Dialog>
        <ReasonDialog visible={Boolean(reasonTarget)} title={reasonTarget?.action === 'inativar' ? 'Motivo da inativação' : 'Motivo da reativação'} confirmLabel={reasonTarget?.action === 'inativar' ? 'Inativar' : 'Reativar'} loading={mutations.inativarMutation.isPending || mutations.reativarMutation.isPending} onHide={() => setReasonTarget(null)} onConfirm={confirmReason} />
    </>;
};
