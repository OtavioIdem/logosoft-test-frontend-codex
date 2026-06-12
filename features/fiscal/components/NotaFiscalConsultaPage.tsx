'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { StatusTag } from '@/components/data/StatusTag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { CriarNotaFiscalDialog, GerarNotaFiscalPedidoVendaDialog } from '@/features/fiscal/components/FiscalActionDialogs';
import { formatFiscalApiError } from '@/features/fiscal/api/fiscalApi';
import { useFiscalMutations, useNotasFiscais } from '@/features/fiscal/hooks/useFiscalResources';
import { NotaFiscalListQuery, NotaFiscalListagemItemResponse } from '@/features/fiscal/types/fiscal.types';
import {
    formatFiscalDate,
    formatFiscalMoney,
    origemNotaFiscalLabel,
    origemNotaFiscalOptions,
    resetFiltrosFiscaisPorEmpresa,
    resetFiltrosFiscaisPorFilial,
    statusNotaFiscalOptions,
    statusNotaFiscalTagValue,
    tipoDocumentoFiscalLabel,
    tipoDocumentoFiscalOptions,
    tipoOperacaoFiscalLabel,
    tipoOperacaoFiscalOptions
} from '@/features/fiscal/components/fiscalUiUtils';
import { useAppToast } from '@/hooks/useAppToast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { mapApiError } from '@/lib/http/apiError';

const pendenciaOptions = [
    { label: 'Pendência XML autorizado', value: 'somenteComPendenciaXmlAutorizado' },
    { label: 'Pendência DANFE', value: 'somenteComPendenciaDanfe' },
    { label: 'Pendência estoque', value: 'somenteComPendenciaEstoque' },
    { label: 'Pendência financeira', value: 'somenteComPendenciaFinanceira' }
] as const;

type PendenciaKey = (typeof pendenciaOptions)[number]['value'];

const clampExportLimit = (value: number | null | undefined) => Math.min(5000, Math.max(1, Number(value ?? 1000)));

const pessoaOptions = (pessoas: PessoaResponse[]) =>
    pessoas.map((pessoa) => ({
        label: [pessoa.nomeRazaoSocial, pessoa.nomeFantasia, pessoa.documento].filter(Boolean).join(' • '),
        value: pessoa.id
    }));

const ExportarCsvDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: { motivo: string; limite: number }) => void }) => {
    const [motivo, setMotivo] = useState('Conferência operacional fiscal');
    const [limite, setLimite] = useState(1000);
    const motivoNormalizado = motivo.trim();

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
            <Button label="Exportar CSV" icon="pi pi-download" type="submit" form="exportar-csv-fiscal-form" loading={loading} disabled={!motivoNormalizado} />
        </div>
    );

    return (
        <Dialog header="Exportar CSV fiscal auditado" visible={visible} modal style={{ width: '42rem' }} onHide={onHide} footer={footer}>
            <Message severity="info" className="w-full mb-3" text="A exportação usa os filtros atuais da listagem, ignora paginação visual e exige motivo para auditoria no backend." />
            <form
                id="exportar-csv-fiscal-form"
                className="grid formgrid p-fluid"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (!motivoNormalizado) return;
                    onSubmit({ motivo: motivoNormalizado, limite: clampExportLimit(limite) });
                }}
            >
                <div className="field col-12">
                    <label htmlFor="motivo-exportacao-fiscal" className="font-medium block mb-2">
                        Motivo obrigatório
                    </label>
                    <InputText id="motivo-exportacao-fiscal" value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={500} className={!motivoNormalizado ? 'p-invalid' : undefined} />
                    <small className="text-color-secondary block mt-1">O backend registra auditoria da exportação com filtros, limite efetivo e hash do arquivo.</small>
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="limite-exportacao-fiscal" className="font-medium block mb-2">
                        Limite
                    </label>
                    <InputNumber inputId="limite-exportacao-fiscal" value={limite} min={1} max={5000} onValueChange={(event) => setLimite(clampExportLimit(event.value))} />
                    <small className="text-color-secondary block mt-1">Permitido pelo contrato: 1 até 5000 registros.</small>
                </div>
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const NotaFiscalConsultaPage = () => {
    const router = useRouter();
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const mutations = useFiscalMutations();
    const [filters, setFilters] = useState<NotaFiscalListQuery>({ page: 1, pageSize: 20 });
    const [criarVisible, setCriarVisible] = useState(false);
    const [pedidoVisible, setPedidoVisible] = useState(false);
    const [exportVisible, setExportVisible] = useState(false);
    const [pessoaSearch, setPessoaSearch] = useState('');
    const pessoaSearchTerm = useDebouncedValue(pessoaSearch.trim());
    const pessoasQuery = usePessoas({ empresaId: filters.empresaId ?? null, filialId: filters.filialId ?? null, termo: pessoaSearchTerm || null }, { enabled: Boolean(filters.empresaId) });
    const pessoasOptions = useMemo(() => pessoaOptions(pessoasQuery.data ?? []), [pessoasQuery.data]);
    const notasQuery = useNotasFiscais(filters);
    const data = notasQuery.data;
    const items = data?.items ?? [];

    const resumo = useMemo(
        () => ({
            totalNotas: data?.totalItems ?? 0,
            totalPagina: items.reduce((total, nota) => total + Number(nota.valorTotal ?? 0), 0),
            pendenciasXml: items.filter((nota) => !nota.possuiXmlAutorizado).length,
            pendenciasOperacionais: items.filter((nota) => nota.estoquePendente || nota.financeiroPendente || !nota.possuiDanfe).length
        }),
        [data?.totalItems, items]
    );

    if (!hasPermission('FISCAL_CONSULTAR')) return <UnauthorizedState description="Notas fiscais exigem FISCAL_CONSULTAR." />;

    const updateFilter = (name: keyof NotaFiscalListQuery, value: string | number | boolean | null) => {
        setFilters((current) => ({ ...current, page: 1, [name]: value === '' ? null : value }));
    };

    const handleEmpresaChange = (value: string | null) => {
        setPessoaSearch('');
        setFilters((current) => resetFiltrosFiscaisPorEmpresa(current, value));
    };

    const handleFilialChange = (value: string | null) => {
        setPessoaSearch('');
        setFilters((current) => resetFiltrosFiscaisPorFilial(current, value));
    };

    const togglePendencia = (key: PendenciaKey, checked: boolean) => {
        setFilters((current) => ({ ...current, page: 1, [key]: checked || null }));
    };

    const limparFiltrosOperacionais = () => {
        setPessoaSearch('');
        setFilters((current) => ({ empresaId: current.empresaId ?? null, filialId: current.filialId ?? null, page: 1, pageSize: current.pageSize ?? 20 }));
    };

    const criarNota = async (values: unknown) => {
        try {
            const nota = await mutations.criarNotaMutation.mutateAsync(values);
            toast.success('Nota criada', 'Nota fiscal manual criada em rascunho.');
            setCriarVisible(false);
            router.push(`/fiscal/notas/${nota.id}`);
        } catch (error) {
            toast.error('Erro ao criar nota', formatFiscalApiError(error, 'Não foi possível criar a nota fiscal.'));
            throw error;
        }
    };

    const gerarDePedido = async (values: unknown) => {
        try {
            const result = await mutations.gerarNotaPedidoMutation.mutateAsync(values);
            toast.success('Nota gerada', 'Nota fiscal gerada em rascunho a partir do pedido de venda.');
            setPedidoVisible(false);
            router.push(`/fiscal/notas/${result.notaFiscal.id}`);
        } catch (error) {
            toast.error('Erro ao gerar nota', formatFiscalApiError(error, 'Não foi possível gerar a nota fiscal.'));
            throw error;
        }
    };

    const exportarCsv = async (values: { motivo: string; limite: number }) => {
        try {
            const arquivo = await mutations.exportarCsvMutation.mutateAsync({ ...filters, motivo: values.motivo, limite: values.limite, formato: 1 });
            const url = URL.createObjectURL(arquivo.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = arquivo.filename ?? 'notas-fiscais.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setExportVisible(false);
            toast.success('Exportação fiscal', 'CSV fiscal auditado gerado pelo backend.');
        } catch (error) {
            toast.error('Erro na exportação', formatFiscalApiError(error, 'Não foi possível exportar o CSV fiscal.'));
            throw error;
        }
    };

    const actions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <PermissionGuard permission="FISCAL_GERENCIAR" mode="disable">
                {({ disabled }) => <Button label="Nova manual" icon="pi pi-plus" disabled={disabled} onClick={() => setCriarVisible(true)} />}
            </PermissionGuard>
            <PermissionGuard permission="FISCAL_EMITIR" mode="disable">
                {({ disabled }) => <Button label="Gerar de pedido" icon="pi pi-shopping-cart" severity="success" disabled={disabled} onClick={() => setPedidoVisible(true)} />}
            </PermissionGuard>
            <PermissionGuard permission="FISCAL_EXPORTAR" mode="disable">
                {({ disabled }) => <Button label="Exportar CSV" icon="pi pi-download" severity="secondary" outlined disabled={disabled || !filters.empresaId} onClick={() => setExportVisible(true)} />}
            </PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Notas fiscais" description="Listagem fiscal operacional, filtros avançados, ação principal e exportação auditada conforme contrato v1.10.0a18." actions={actions} />
            <Message severity="info" className="w-full mb-3" text="A tela usa a listagem leve do backend. Regras críticas de emissão, cancelamento, baixa, financeiro e DANFE são dirigidas por resumo/workflow do backend no detalhe." />
            <Card className="mb-3">
                <div className="grid formgrid p-fluid">
                    <div className="field col-12 lg:col-5">
                        <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={handleEmpresaChange} onFilialChange={handleFilialChange} />
                    </div>
                    <div className="field col-12 md:col-3 lg:col-2">
                        <label className="font-medium block mb-2">Status</label>
                        <Dropdown value={filters.statusFiscal ?? null} options={statusNotaFiscalOptions} showClear placeholder="Status" onChange={(event) => updateFilter('statusFiscal', event.value ?? null)} />
                    </div>
                    <div className="field col-12 md:col-3 lg:col-2">
                        <label className="font-medium block mb-2">Tipo</label>
                        <Dropdown value={filters.tipoDocumento ?? null} options={tipoDocumentoFiscalOptions} showClear placeholder="Tipo" onChange={(event) => updateFilter('tipoDocumento', event.value ?? null)} />
                    </div>
                    <div className="field col-12 md:col-3 lg:col-3">
                        <label className="font-medium block mb-2">Operação</label>
                        <Dropdown value={filters.tipoOperacao ?? null} options={tipoOperacaoFiscalOptions} showClear placeholder="Operação" onChange={(event) => updateFilter('tipoOperacao', event.value ?? null)} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-medium block mb-2">Origem</label>
                        <Dropdown value={filters.origem ?? null} options={origemNotaFiscalOptions} showClear placeholder="Origem" onChange={(event) => updateFilter('origem', event.value ?? null)} />
                    </div>
                    <div className="field col-12 md:col-5">
                        <label className="font-medium block mb-2">Pessoa/cliente</label>
                        <EntitySelect
                            entityName="pessoa"
                            value={filters.pessoaId ?? null}
                            options={pessoasOptions}
                            disabled={!filters.empresaId || pessoasQuery.isLoading}
                            loading={pessoasQuery.isFetching}
                            emptyMessage={filters.empresaId ? 'Nenhuma pessoa encontrada para a empresa/filial selecionada.' : 'Selecione a empresa antes de buscar pessoa.'}
                            onSearch={setPessoaSearch}
                            onChange={(value) => updateFilter('pessoaId', value)}
                        />
                        <small className="text-color-secondary block mt-1 line-height-3">Filtro carregado pela API de Pessoas. Não informe GUID manualmente.</small>
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-medium block mb-2">Série</label>
                        <InputText value={filters.serie ?? ''} onChange={(event) => updateFilter('serie', event.target.value || null)} />
                    </div>
                    <div className="field col-12 md:col-3">
                        <label className="font-medium block mb-2">Número</label>
                        <InputText value={filters.numero ?? ''} onChange={(event) => updateFilter('numero', event.target.value || null)} />
                    </div>
                    <div className="field col-12 md:col-6">
                        <label className="font-medium block mb-2">Chave de acesso</label>
                        <InputText value={filters.chaveAcesso ?? ''} onChange={(event) => updateFilter('chaveAcesso', event.target.value || null)} />
                    </div>
                    <div className="field col-12 md:col-6">
                        <label className="font-medium block mb-2">Protocolo de autorização</label>
                        <InputText value={filters.protocoloAutorizacao ?? ''} onChange={(event) => updateFilter('protocoloAutorizacao', event.target.value || null)} />
                    </div>
                    <div className="field col-12">
                        <div className="flex flex-wrap gap-3">
                            {pendenciaOptions.map((option) => (
                                <div key={option.value} className="flex align-items-center gap-2">
                                    <Checkbox inputId={option.value} checked={Boolean(filters[option.value])} onChange={(event) => togglePendencia(option.value, Boolean(event.checked))} />
                                    <label htmlFor={option.value}>{option.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="field col-12 flex justify-content-end">
                        <Button type="button" label="Limpar filtros operacionais" icon="pi pi-filter-slash" text onClick={limparFiltrosOperacionais} />
                    </div>
                </div>
            </Card>
            <div className="grid mb-3">
                <div className="col-12 md:col-3">
                    <Card>
                        <span className="block text-color-secondary mb-1">Notas encontradas</span>
                        <strong className="text-xl">{resumo.totalNotas}</strong>
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card>
                        <span className="block text-color-secondary mb-1">Valor da página</span>
                        <strong className="text-xl">{formatFiscalMoney(resumo.totalPagina)}</strong>
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card>
                        <span className="block text-color-secondary mb-1">Sem XML autorizado</span>
                        <strong className="text-xl">{resumo.pendenciasXml}</strong>
                    </Card>
                </div>
                <div className="col-12 md:col-3">
                    <Card>
                        <span className="block text-color-secondary mb-1">Pendências operacionais</span>
                        <strong className="text-xl">{resumo.pendenciasOperacionais}</strong>
                    </Card>
                </div>
            </div>
            <Card>
                {notasQuery.error ? <ApiErrorPanel error={mapApiError(notasQuery.error)} /> : null}
                {!filters.empresaId ? <EmptyState title="Selecione a empresa" description="O backend fiscal exige empresaId para listar notas fiscais." /> : null}
                {filters.empresaId ? (
                    <DataTableServer<NotaFiscalListagemItemResponse>
                        value={items}
                        totalRecords={data?.totalItems ?? 0}
                        loading={notasQuery.isFetching}
                        first={((data?.page ?? filters.page ?? 1) - 1) * (data?.pageSize ?? filters.pageSize ?? 20)}
                        rows={data?.pageSize ?? filters.pageSize ?? 20}
                        onPage={(event) => setFilters((current) => ({ ...current, page: Math.floor(event.first / event.rows) + 1, pageSize: event.rows }))}
                        emptyMessage="Nenhuma nota fiscal encontrada."
                    >
                        <Column field="numero" header="Número" body={(row: NotaFiscalListagemItemResponse) => `${row.serie}/${row.numero}`} />
                        <Column header="Tipo" body={(row: NotaFiscalListagemItemResponse) => tipoDocumentoFiscalLabel(row.tipoDocumento)} />
                        <Column header="Operação" body={(row: NotaFiscalListagemItemResponse) => tipoOperacaoFiscalLabel(row.tipoOperacao)} />
                        <Column header="Origem" body={(row: NotaFiscalListagemItemResponse) => origemNotaFiscalLabel(row.origem)} />
                        <Column header="Status" body={(row: NotaFiscalListagemItemResponse) => <StatusTag status={statusNotaFiscalTagValue(row.statusFiscal)} />} />
                        <Column header="Emissão" body={(row: NotaFiscalListagemItemResponse) => formatFiscalDate(row.dataEmissao)} />
                        <Column header="Total" body={(row: NotaFiscalListagemItemResponse) => formatFiscalMoney(row.valorTotal)} />
                        <Column
                            header="Pendências"
                            body={(row: NotaFiscalListagemItemResponse) =>
                                [!row.possuiXmlAutorizado ? 'XML' : null, !row.possuiDanfe ? 'DANFE' : null, row.estoquePendente ? 'Estoque' : null, row.financeiroPendente ? 'Financeiro' : null].filter(Boolean).join(' • ') || '-'
                            }
                        />
                        <Column header="Ação principal" body={(row: NotaFiscalListagemItemResponse) => row.acaoPrincipalNome ?? row.acaoPrincipalCodigo ?? 'Consultar'} />
                        <Column
                            header="Ações"
                            alignHeader="right"
                            body={(row: NotaFiscalListagemItemResponse) => (
                                <DataTableActions actions={[{ key: 'abrir', label: 'Abrir', icon: 'pi pi-folder-open', permission: 'FISCAL_CONSULTAR', onClick: () => router.push(`/fiscal/notas/${row.id}`) }]} />
                            )}
                        />
                    </DataTableServer>
                ) : null}
            </Card>
            <CriarNotaFiscalDialog visible={criarVisible} loading={mutations.criarNotaMutation.isPending} onHide={() => setCriarVisible(false)} onSubmit={criarNota} />
            <GerarNotaFiscalPedidoVendaDialog visible={pedidoVisible} loading={mutations.gerarNotaPedidoMutation.isPending} onHide={() => setPedidoVisible(false)} onSubmit={gerarDePedido} />
            <ExportarCsvDialog visible={exportVisible} loading={mutations.exportarCsvMutation.isPending} onHide={() => setExportVisible(false)} onSubmit={exportarCsv} />
        </>
    );
};
