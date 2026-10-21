'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { DataTableServer } from '@/components/data/DataTableServer';
import { DataTableActions } from '@/components/data/DataTableActions';
import { StatusTag } from '@/components/data/StatusTag';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { cadastrosAuxiliaresProdutoApi, CadastroAuxiliarProdutoKind } from '@/features/produtos/api/produtosApi';
import { CadastroAuxiliarProdutoResponse } from '@/features/produtos/types/produtos.types';
import { EntityStatus } from '@/types/erp';
import { mapApiError } from '@/lib/http/apiError';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';

const labels: Record<CadastroAuxiliarProdutoKind, string> = { linhas: 'Linhas de produto', classificacoes: 'Classificações de produto', 'classificacoes-compra': 'Classificações de compra', 'modos-aplicacao': 'Modos de aplicação', 'naturezas-fisicas': 'Naturezas físicas', fabricantes: 'Fabricantes' };
const active = (record: CadastroAuxiliarProdutoResponse) => Number(record.status) === EntityStatus.Ativo;

export const CadastroAuxiliarProdutoPage = ({ kind }: { kind: CadastroAuxiliarProdutoKind }) => {
    const { hasPermission } = usePermissions(); const runWithToast = useMutationWithToast(); const client = useQueryClient(); const api = cadastrosAuxiliaresProdutoApi[kind];
    const [empresaId, setEmpresaId] = useState<string | null>(null); const [incluirInativos, setIncluirInativos] = useState(false); const [editing, setEditing] = useState<CadastroAuxiliarProdutoResponse | null>(null); const [dialog, setDialog] = useState(false); const [codigo, setCodigo] = useState(''); const [nome, setNome] = useState(''); const [reason, setReason] = useState<{ record: CadastroAuxiliarProdutoResponse; action: 'inativar' | 'reativar' } | null>(null);
    const query = useQuery({ queryKey: ['produtos-auxiliar', kind, empresaId, incluirInativos], queryFn: () => api.listar(empresaId!, incluirInativos), enabled: Boolean(empresaId) });
    const invalidate = () => client.invalidateQueries({ queryKey: ['produtos-auxiliar', kind] });
    const saveMutation = useMutation({ mutationFn: () => editing ? api.atualizar(editing.id, { nome }) : api.criar({ empresaId, codigo, nome }), onSuccess: invalidate });
    const statusMutation = useMutation({ mutationFn: ({ record, action, motivo }: { record: CadastroAuxiliarProdutoResponse; action: 'inativar' | 'reativar'; motivo: string }) => action === 'inativar' ? api.inativar(record.id, motivo) : api.reativar(record.id, motivo), onSuccess: invalidate });
    if (!hasPermission('PRODUTOS_CONSULTAR')) return <UnauthorizedState description="A rotina exige a permissão PRODUTOS_CONSULTAR." />;
    const open = (record?: CadastroAuxiliarProdutoResponse) => { setEditing(record ?? null); setCodigo(record?.codigo ?? ''); setNome(record?.nome ?? ''); setDialog(true); };
    const save = async () => { await runWithToast(async () => { await saveMutation.mutateAsync(); setDialog(false); }, { success: { summary: 'Cadastro salvo', detail: 'Registro atualizado com sucesso.' }, error: { summary: 'Erro ao salvar', detail: 'Não foi possível salvar o cadastro.' } }); };
    const confirm = async (motivo: string) => { if (!reason) return; await runWithToast(async () => { await statusMutation.mutateAsync({ ...reason, motivo }); setReason(null); }, { success: { summary: reason.action === 'inativar' ? 'Cadastro inativado' : 'Cadastro reativado', detail: 'Motivo registrado com sucesso.' }, error: { summary: 'Erro na operação', detail: 'Não foi possível atualizar o status.' } }); };
    const records = query.data?.items ?? [];
    return <><PageHeader title={labels[kind]} description="Cadastro auxiliar por empresa. Códigos são únicos e não mudam após a criação." actions={<div className="flex gap-2"><EmpresaFilialFilter empresaId={empresaId} filialId={null} onEmpresaChange={setEmpresaId} onFilialChange={() => undefined} /><Button label="Novo" icon="pi pi-plus" disabled={!empresaId || !hasPermission('PRODUTOS_CADASTROS_AUXILIARES_GERENCIAR')} onClick={() => open()} /></div>} /><Card>{query.error ? <ApiErrorPanel error={mapApiError(query.error)} /> : null}<DataTableServer<CadastroAuxiliarProdutoResponse> value={records} totalRecords={records.length} loading={query.isFetching} first={0} rows={500} onPage={() => undefined}><Column field="codigo" header="Código" /><Column field="nome" header="Nome" /><Column header="Status" body={(row: CadastroAuxiliarProdutoResponse) => <StatusTag status={row.status} />} /><Column header="Ações" body={(row: CadastroAuxiliarProdutoResponse) => <DataTableActions actions={[{ key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'PRODUTOS_CADASTROS_AUXILIARES_GERENCIAR', disabled: !active(row), onClick: () => open(row) }, { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger', permission: 'PRODUTOS_CADASTROS_AUXILIARES_GERENCIAR', disabled: !active(row), onClick: () => setReason({ record: row, action: 'inativar' }) }, { key: 'reativar', label: 'Reativar', icon: 'pi pi-refresh', permission: 'PRODUTOS_CADASTROS_AUXILIARES_GERENCIAR', disabled: active(row), onClick: () => setReason({ record: row, action: 'reativar' }) }]} />} /></DataTableServer></Card><Dialog header={editing ? 'Editar cadastro' : 'Novo cadastro'} visible={dialog} modal onHide={() => setDialog(false)} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" outlined onClick={() => setDialog(false)} /><Button label="Salvar" loading={saveMutation.isPending} disabled={!nome.trim() || (!editing && !codigo.trim())} onClick={save} /></div>}><div className="grid formgrid p-fluid">{!editing ? <div className="field col-12"><label htmlFor="codigo">Código *</label><InputText id="codigo" value={codigo} maxLength={20} onChange={(event) => setCodigo(event.target.value.toUpperCase())} /></div> : null}<div className="field col-12"><label htmlFor="nome">Nome *</label><InputText id="nome" value={nome} maxLength={120} onChange={(event) => setNome(event.target.value)} /></div></div></Dialog><ReasonDialog visible={Boolean(reason)} title={reason?.action === 'inativar' ? 'Motivo da inativação' : 'Motivo da reativação'} confirmLabel={reason?.action === 'inativar' ? 'Inativar' : 'Reativar'} loading={statusMutation.isPending} onHide={() => setReason(null)} onConfirm={confirm} /></>;
};
