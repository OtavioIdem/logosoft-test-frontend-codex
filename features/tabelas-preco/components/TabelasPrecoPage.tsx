'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { DateInput } from '@/components/forms/DateInput';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { TabelaPrecoFormDialog } from '@/features/tabelas-preco/components/TabelaPrecoFormDialog';
import { TabelaPrecoItemDialog } from '@/features/tabelas-preco/components/TabelaPrecoItemDialog';
import { usePrecoVigente, useTabelaPrecoDetalhe, useTabelaPrecoMutations, useTabelasPreco } from '@/features/tabelas-preco/hooks/useTabelasPreco';
import { TabelaPrecoFormValues, TabelaPrecoItemFormValues, TabelaPrecoItemResponse, TabelaPrecoResponse } from '@/features/tabelas-preco/types/tabelasPreco.types';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';

const formatMoney = (value?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
const formatDate = (value?: string | null) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR') : '-');
const isTabelaAtiva = (tabela: TabelaPrecoResponse) => tabela.ativo === true || String(tabela.status ?? '').toLowerCase() === 'ativa' || Number(tabela.status) === 1;

export const TabelasPrecoPage = () => {
    const runWithToast = useMutationWithToast();
    const { hasAnyPermission } = usePermissions();
    const [search, setSearch] = useState('');
    const [formVisible, setFormVisible] = useState(false);
    const [itemVisible, setItemVisible] = useState(false);
    const [reasonAction, setReasonAction] = useState<'inativar-tabela' | 'inativar-item' | null>(null);
    const [selectedTabela, setSelectedTabela] = useState<TabelaPrecoResponse | null>(null);
    const [selectedItem, setSelectedItem] = useState<TabelaPrecoItemResponse | null>(null);
    const [precoProdutoId, setPrecoProdutoId] = useState<string>('');
    const [precoEmpresaId, setPrecoEmpresaId] = useState<string>('');
    const [precoFilialId, setPrecoFilialId] = useState<string>('');
    const [precoData, setPrecoData] = useState<Date | null>(new Date());
    const [precoEnabled, setPrecoEnabled] = useState(false);

    const tabelasQuery = useTabelasPreco();
    const detalheQuery = useTabelaPrecoDetalhe(selectedTabela?.id ?? null);
    const produtosQuery = useProdutos({});
    const precoVigenteQuery = usePrecoVigente({ produtoId: precoProdutoId, empresaId: precoEmpresaId, filialId: precoFilialId, dataReferencia: precoData }, Boolean(precoProdutoId && precoEnabled));
    const mutations = useTabelaPrecoMutations();
    const canManageTabelaPreco = hasAnyPermission(['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR']);

    const tabelas = tabelasQuery.data ?? [];
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const produtoLabelMap = useMemo(() => new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} - ${produto.descricao}`])), [produtosQuery.data]);
    const filteredTabelas = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return tabelas;
        return tabelas.filter((tabela) => `${tabela.nome} ${tabela.status ?? ''}`.toLowerCase().includes(term));
    }, [search, tabelas]);

    if (!hasAnyPermission(['TABELAS_PRECO_CONSULTAR', 'TABELAS_PRECO_GERENCIAR', 'VENDAS_CONSULTAR', 'VENDAS_GERENCIAR'])) {
        return <UnauthorizedState description="A rotina Tabelas de preço exige permissão comercial para consulta ou gestão." />;
    }

    const saveTabela = async (values: TabelaPrecoFormValues) => {
        await runWithToast(
            async () => {
                await mutations.saveMutation.mutateAsync({ id: selectedTabela?.id, values });
                setFormVisible(false);
                setSelectedTabela(null);
            },
            { success: { summary: selectedTabela ? 'Tabela atualizada' : 'Tabela criada', detail: 'A tabela de preço foi salva com sucesso.' }, error: { summary: 'Erro ao salvar tabela', detail: 'Não foi possível salvar a tabela.' }, rethrow: true }
        );
    };

    const saveItem = async (values: TabelaPrecoItemFormValues) => {
        if (!selectedTabela) return;
        await runWithToast(
            async () => {
                if (selectedItem) await mutations.atualizarItemMutation.mutateAsync({ id: selectedTabela.id, itemId: selectedItem.id, values });
                else await mutations.adicionarItemMutation.mutateAsync({ id: selectedTabela.id, values });
                setItemVisible(false);
                setSelectedItem(null);
            },
            { success: { summary: selectedItem ? 'Item atualizado' : 'Item adicionado', detail: 'O item da tabela foi salvo com sucesso.' }, error: { summary: 'Erro ao salvar item', detail: 'Não foi possível salvar o item.' }, rethrow: true }
        );
    };

    const confirmReason = async (motivo: string) => {
        if (!selectedTabela || !reasonAction) return;
        const success = reasonAction === 'inativar-tabela' ? { summary: 'Tabela inativada', detail: 'A tabela de preço foi inativada com auditoria.' } : { summary: 'Item inativado', detail: 'O item da tabela foi inativado com auditoria.' };
        await runWithToast(
            async () => {
                if (reasonAction === 'inativar-tabela') await mutations.inativarMutation.mutateAsync({ id: selectedTabela.id, motivo });
                if (reasonAction === 'inativar-item' && selectedItem) await mutations.inativarItemMutation.mutateAsync({ id: selectedTabela.id, itemId: selectedItem.id, motivo });
                setReasonAction(null);
                setSelectedItem(null);
            },
            { success, error: { summary: 'Erro na operação', detail: 'Não foi possível concluir a operação.' } }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText placeholder="Buscar tabela" value={search} onChange={(event) => setSearch(event.target.value)} /></span>
            <PermissionGuard anyOf={['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR']} mode="disable">
                {({ disabled }) => <Button label="Nova tabela" icon="pi pi-plus" disabled={disabled} onClick={() => { setSelectedTabela(null); setFormVisible(true); }} />}
            </PermissionGuard>
        </div>
    );

    const tabelaDetalhe = detalheQuery.data ?? selectedTabela;
    const itens = tabelaDetalhe?.itens ?? [];

    return (
        <>
            <PageHeader title="Tabelas de preço" description="Política comercial com vigência, preço mínimo, margem e consulta de preço vigente por produto." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Inativação de tabela e item exige motivo para auditoria. A consulta de preço vigente usa o endpoint específico do backend." />

            <div className="grid">
                <div className="col-12 lg:col-7">
                    <Card title="Tabelas cadastradas">
                        {tabelasQuery.error ? <ApiErrorPanel error={mapApiError(tabelasQuery.error)} /> : null}
                        <DataTableServer<TabelaPrecoResponse> value={filteredTabelas} totalRecords={filteredTabelas.length} loading={tabelasQuery.isFetching} first={0} rows={10} onPage={() => undefined} emptyMessage="Nenhuma tabela encontrada.">
                            <Column field="nome" header="Nome" />
                            <Column header="Vigência" body={(tabela: TabelaPrecoResponse) => `${formatDate(tabela.dataInicioVigencia)} até ${formatDate(tabela.dataFimVigencia)}`} />
                            <Column header="Padrão" body={(tabela: TabelaPrecoResponse) => <Tag value={tabela.padrao ? 'Sim' : 'Não'} severity={tabela.padrao ? 'info' : undefined} />} />
                            <Column header="Status" body={(tabela: TabelaPrecoResponse) => <Tag value={isTabelaAtiva(tabela) ? 'Ativa' : 'Inativa'} severity={isTabelaAtiva(tabela) ? 'success' : 'danger'} />} />
                            <Column header="Ações" align="right" body={(tabela: TabelaPrecoResponse) => <DataTableActions actions={[
                                { key: 'detalhe', label: 'Itens', icon: 'pi pi-list', onClick: () => setSelectedTabela(tabela) },
                                ...(canManageTabelaPreco ? [
                                    { key: 'editar', label: 'Editar', icon: 'pi pi-pencil', onClick: () => { setSelectedTabela(tabela); setFormVisible(true); } },
                                    { key: 'ativar', label: 'Ativar', icon: 'pi pi-check', severity: 'success' as const, disabled: isTabelaAtiva(tabela), onClick: async () => { await runWithToast(() => mutations.ativarMutation.mutateAsync(tabela.id), { success: { summary: 'Tabela ativada', detail: 'A tabela de preço foi ativada.' }, error: { summary: 'Erro ao ativar tabela', detail: 'Não foi possível ativar a tabela.' } }); } },
                                    { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger' as const, disabled: !isTabelaAtiva(tabela), onClick: () => { setSelectedTabela(tabela); setReasonAction('inativar-tabela'); } }
                                ] : [])
                            ]} />} />
                        </DataTableServer>
                        {!tabelasQuery.isLoading && filteredTabelas.length === 0 ? <EmptyState title="Nenhuma tabela" description="Crie uma tabela ou ajuste a busca." /> : null}
                    </Card>
                </div>

                <div className="col-12 lg:col-5">
                    <Card title={selectedTabela ? `Itens — ${selectedTabela.nome}` : 'Itens da tabela'}>
                        {selectedTabela ? (
                            <PermissionGuard anyOf={['TABELAS_PRECO_GERENCIAR', 'VENDAS_GERENCIAR']} mode="hide">
                                <Button className="mb-3" label="Adicionar item" icon="pi pi-plus" size="small" onClick={() => { setSelectedItem(null); setItemVisible(true); }} />
                            </PermissionGuard>
                        ) : <Message severity="info" text="Selecione uma tabela para visualizar e manter itens." />}
                        {selectedTabela ? (
                            <DataTableServer<TabelaPrecoItemResponse> value={itens} totalRecords={itens.length} loading={detalheQuery.isFetching} first={0} rows={5} onPage={() => undefined} emptyMessage="Nenhum item encontrado.">
                                <Column header="Produto" body={(item: TabelaPrecoItemResponse) => produtoLabelMap.get(item.produtoId) ?? item.produtoId} />
                                <Column header="Preço" body={(item: TabelaPrecoItemResponse) => formatMoney(item.precoVenda)} />
                                <Column header="Mínimo" body={(item: TabelaPrecoItemResponse) => formatMoney(item.precoMinimo)} />
                                <Column header="Margem" body={(item: TabelaPrecoItemResponse) => `${item.margemPercentual.toFixed(2)}%`} />
                                <Column header="Ações" body={(item: TabelaPrecoItemResponse) => <DataTableActions actions={canManageTabelaPreco ? [
                                    { key: 'editar-item', label: 'Editar', icon: 'pi pi-pencil', onClick: () => { setSelectedItem(item); setItemVisible(true); } },
                                    { key: 'inativar-item', label: 'Inativar', icon: 'pi pi-ban', severity: 'danger' as const, disabled: item.ativo === false, onClick: () => { setSelectedItem(item); setReasonAction('inativar-item'); } }
                                ] : []} />} />
                            </DataTableServer>
                        ) : null}
                    </Card>

                    <Card title="Preço vigente" className="mt-3">
                        <div className="grid formgrid p-fluid">
                            <div className="field col-12"><label className="font-medium" htmlFor="precoProdutoId">Produto</label><EntitySelect id="precoProdutoId" entityName="produto" value={precoProdutoId || null} options={produtoOptions} loading={produtosQuery.isFetching} onChange={(value) => { setPrecoProdutoId(value ?? ''); setPrecoEnabled(false); }} /></div>
                            <div className="field col-12 md:col-6"><label className="font-medium" htmlFor="precoEmpresaId">Empresa</label><EmpresaSelect id="precoEmpresaId" value={precoEmpresaId || null} onChange={(value) => { setPrecoEmpresaId(value ?? ''); setPrecoEnabled(false); }} /></div>
                            <div className="field col-12 md:col-6"><label className="font-medium" htmlFor="precoFilialId">Filial</label><FilialSelect id="precoFilialId" empresaId={precoEmpresaId || null} value={precoFilialId || null} disabled={!precoEmpresaId} onChange={(value) => { setPrecoFilialId(value ?? ''); setPrecoEnabled(false); }} /></div>
                            <div className="field col-12 md:col-6"><label className="font-medium" htmlFor="precoData">Data referência</label><DateInput id="precoData" value={precoData} onChange={(value) => { setPrecoData(value); setPrecoEnabled(false); }} /></div>
                            <div className="field col-12 md:col-6 flex align-items-end"><Button className="w-full" label="Consultar" icon="pi pi-search" disabled={!precoProdutoId} loading={precoVigenteQuery.isFetching} onClick={() => setPrecoEnabled(true)} /></div>
                        </div>
                        {precoVigenteQuery.error ? <ApiErrorPanel error={mapApiError(precoVigenteQuery.error)} /> : null}
                        {precoVigenteQuery.data ? <Message severity={precoVigenteQuery.data.vigente ? 'success' : 'warn'} text={`Preço vigente: ${formatMoney(precoVigenteQuery.data.precoVenda)} • mínimo ${formatMoney(precoVigenteQuery.data.precoMinimo)} • margem ${precoVigenteQuery.data.margemPercentual.toFixed(2)}%`} /> : null}
                    </Card>
                </div>
            </div>

            <TabelaPrecoFormDialog visible={formVisible} loading={mutations.saveMutation.isPending} tabela={selectedTabela} onHide={() => { setFormVisible(false); setSelectedTabela(null); }} onSubmit={saveTabela} />
            <TabelaPrecoItemDialog visible={itemVisible} loading={mutations.adicionarItemMutation.isPending || mutations.atualizarItemMutation.isPending} item={selectedItem} onHide={() => { setItemVisible(false); setSelectedItem(null); }} onSubmit={saveItem} />
            <ReasonDialog visible={Boolean(reasonAction)} title={reasonAction === 'inativar-item' ? 'Inativar item da tabela' : 'Inativar tabela de preço'} loading={mutations.inativarMutation.isPending || mutations.inativarItemMutation.isPending} onHide={() => setReasonAction(null)} onConfirm={confirmReason} />
        </>
    );
};
