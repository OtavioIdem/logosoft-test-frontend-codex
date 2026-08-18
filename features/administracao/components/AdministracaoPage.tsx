'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { OperationalGovernancePanel } from '@/components/common/OperationalGovernancePanel';
import { AuditInfoPanel } from '@/components/common/AuditInfoPanel';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { AdministracaoFormDialog } from '@/features/administracao/components/AdministracaoFormDialog';
import { administracaoPageConfigs, AdministracaoColumnConfig } from '@/features/administracao/components/administracaoPageConfig';
import { AdministracaoResourceKey, useAdministracaoResource } from '@/features/administracao/hooks/useAdministracaoResources';
import { useEmpresasOptions, useTodasFiliaisOptions, useTodosSetoresOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { AdministracaoFormValues, AdministracaoListQuery } from '@/features/administracao/types/administracao.types';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { formatDocumento } from '@/lib/formatters/display';
import { EntityStatus } from '@/types/erp';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

const statusLabel = (status: unknown) => {
    const value = Number(status ?? EntityStatus.Ativo);
    if (value === EntityStatus.Inativo) return 'Inativo';
    if (value === EntityStatus.Cancelado) return 'Cancelado';
    if (value === EntityStatus.Bloqueado) return 'Bloqueado';
    if (value === EntityStatus.Pendente) return 'Pendente';
    return 'Ativo';
};

const statusSeverity = (status: unknown): 'success' | 'info' | 'warning' | 'danger' | undefined => {
    const value = Number(status ?? EntityStatus.Ativo);
    if (value === EntityStatus.Inativo || value === EntityStatus.Cancelado || value === EntityStatus.Bloqueado) return 'danger';
    if (value === EntityStatus.Pendente) return 'warning';
    return 'success';
};

const isActiveRecord = (record: Record<string, unknown>) => Number(record.status ?? EntityStatus.Ativo) === EntityStatus.Ativo;
const formatDateTime = (value: unknown) => (typeof value === 'string' && value ? new Date(value).toLocaleString('pt-BR') : '-');

type ReferenceLookups = {
    empresas: Map<string, string>;
    filiais: Map<string, string>;
    setores: Map<string, string>;
};

const resolveReferenceLabel = (field: string, value: unknown, lookups: ReferenceLookups) => {
    if (typeof value !== 'string' || !value) return '-';
    if (field === 'empresaId') return lookups.empresas.get(value) ?? 'Empresa vinculada';
    if (field === 'filialId') return lookups.filiais.get(value) ?? 'Filial vinculada';
    if (field === 'setorId') return lookups.setores.get(value) ?? 'Setor vinculado';
    return String(value);
};

const formatValue = (record: Record<string, unknown>, column: AdministracaoColumnConfig, lookups: ReferenceLookups) => {
    const value = record[column.field];
    if (column.type === 'status') return <Tag value={statusLabel(value)} severity={statusSeverity(value)} />;
    if (column.type === 'datetime') return formatDateTime(value);
    if (column.type === 'document') return formatDocumento(typeof value === 'string' ? value : value == null ? null : String(value));
    if (column.type === 'number') return Number(value ?? 0).toLocaleString('pt-BR');
    if (column.field.endsWith('Id')) return resolveReferenceLabel(column.field, value, lookups);
    return value === null || value === undefined || value === '' ? '-' : String(value);
};

const filterLocal = (records: Record<string, unknown>[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(normalized)));
};

export const AdministracaoPage = ({ resourceKey }: { resourceKey: AdministracaoResourceKey }) => {
    const config = administracaoPageConfigs[resourceKey];
    const runWithToast = useMutationWithToast();
    const { hasPermission } = usePermissions();
    const context = useOrganizationalContext();
    const [filters, setFilters] = useState<AdministracaoListQuery>(() => context.snapshot.empresaId ? { empresaId: context.snapshot.empresaId, filialId: context.snapshot.filialId } : {});
    const alignedFilters = config.showEmpresaFilter && context.snapshot.empresaId ? { ...filters, empresaId: context.snapshot.empresaId, filialId: context.snapshot.filialId } : filters;
    const empresasOptions = useEmpresasOptions();
    const filiaisOptions = useTodasFiliaisOptions(alignedFilters.empresaId);
    const setoresOptions = useTodosSetoresOptions();
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
    const [reasonRecord, setReasonRecord] = useState<Record<string, unknown> | null>(null);
    const { listQuery, saveMutation, inativarMutation, blocked, blockedMessage } = useAdministracaoResource(resourceKey, alignedFilters);

    useEffect(() => {
        if (!config.showEmpresaFilter || !context.snapshot.empresaId) return;
        setFilters((current) => ({ ...current, empresaId: context.snapshot.empresaId, filialId: context.snapshot.filialId }));
    }, [config.showEmpresaFilter, context.snapshot.empresaId, context.snapshot.filialId]);

    const records = useMemo(() => filterLocal(listQuery.data ?? [], localSearch), [listQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [first, records, rows]);
    const referenceLookups = useMemo<ReferenceLookups>(
        () => ({
            empresas: new Map(empresasOptions.options.map((option) => [option.value, option.label])),
            filiais: new Map(filiaisOptions.options.map((option) => [option.value, option.label])),
            setores: new Map(setoresOptions.options.map((option) => [option.value, option.label]))
        }),
        [empresasOptions.options, filiaisOptions.options, setoresOptions.options]
    );

    if (!hasPermission('ADMINISTRACAO_CONSULTAR')) {
        return <UnauthorizedState description="As rotinas de Administração exigem a permissão ADMINISTRACAO_CONSULTAR." />;
    }

    if (resourceKey === 'filiais' && blocked) {
        return (
            <>
                <PageHeader title={config.title} description={config.description} />
                <Message
                    className="w-full"
                    severity="warn"
                    text={`${blockedMessage ?? 'Selecione uma empresa no contexto organizacional.'} Use o botão "Selecionar contexto" no topo da tela para continuar.`}
                />
            </>
        );
    }

    const openCreate = () => {
        setSelectedRecord(null);
        setFormVisible(true);
    };

    const openUpdate = (record: Record<string, unknown>) => {
        setSelectedRecord(record);
        setFormVisible(true);
    };

    const save = async (values: AdministracaoFormValues) => {
        const isCreate = !values.id;
        const empresaCriada = typeof values.empresaId === 'string' ? values.empresaId : null;
        const filialCriada = typeof values.filialId === 'string' ? values.filialId : null;
        await runWithToast(
            async () => {
                await saveMutation.mutateAsync({ id: values.id, values });
                setFormVisible(false);
                setSelectedRecord(null);
                // Listas com filtro por empresa escondem o registro recém-criado quando nenhuma empresa está
                // selecionada; após criar, alinhamos o filtro à empresa/filial do novo registro.
                if (isCreate && config.showEmpresaFilter && empresaCriada) {
                    setFirst(0);
                    setLocalSearch('');
                    setFilters((current) => ({ ...current, empresaId: empresaCriada, filialId: config.showFilialFilter ? filialCriada : current.filialId ?? null }));
                }
            },
            { success: { summary: 'Registro salvo', detail: `${config.title}: dados gravados com sucesso.` }, error: { summary: 'Erro ao salvar', detail: 'Não foi possível salvar o registro.' }, rethrow: true }
        );
    };

    const inativar = async (motivo: string) => {
        if (!reasonRecord?.id) return;
        await runWithToast(
            async () => {
                await inativarMutation.mutateAsync({ id: String(reasonRecord.id), motivo });
                setReasonRecord(null);
            },
            { success: { summary: 'Registro inativado', detail: `${config.title}: inativação concluída.` }, error: { summary: 'Erro ao inativar', detail: 'Não foi possível inativar o registro.' } }
        );
    };

    const updateFilter = (name: keyof AdministracaoListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value || null }));
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            {config.showEmpresaFilter ? <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} showFilial={config.showFilialFilter} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} /> : null}
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText placeholder="Buscar na listagem" value={localSearch} onChange={(event) => { setFirst(0); setLocalSearch(event.target.value); }} />
            </span>
            <PermissionGuard permission="ADMINISTRACAO_GERENCIAR" mode="disable">
                {({ disabled }) => <Button label="Novo" icon="pi pi-plus" onClick={openCreate} disabled={disabled} />}
            </PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title={config.title} description={config.description} actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text={config.listDescription} />
            {blocked ? <Message className="w-full mb-3" severity="warn" text={blockedMessage} /> : null}
            <OperationalGovernancePanel title="Governança da estrutura organizacional" description="Resumo operacional dos registros carregados para apoiar revisão de status, vínculos por empresa/filial e rastreabilidade administrativa." records={records} complianceNote="Cadastros administrativos não são excluídos fisicamente; inativação exige motivo e permanece rastreável para módulos comerciais, financeiros, estoque e auditoria." />
            <Card>
                {listQuery.error ? <ApiErrorPanel error={mapApiError(listQuery.error)} /> : null}
                <DataTableServer<Record<string, unknown>>
                    value={visibleRecords}
                    totalRecords={records.length}
                    loading={listQuery.isFetching}
                    first={first}
                    rows={rows}
                    onPage={(event) => {
                        setFirst(event.first);
                        setRows(event.rows);
                    }}
                    emptyMessage="Nenhum registro encontrado."
                >
                    {config.columns.map((column) => <Column key={column.field} header={column.header} body={(row: Record<string, unknown>) => formatValue(row, column, referenceLookups)} />)}
                    <Column
                        header="Ações"
                        alignHeader="right"
                        body={(row: Record<string, unknown>) => (
                            <DataTableActions
                                actions={[
                                    { key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'ADMINISTRACAO_GERENCIAR', disabled: !isActiveRecord(row), onClick: () => openUpdate(row) },
                                    { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', permission: 'ADMINISTRACAO_GERENCIAR', severity: 'danger', disabled: !isActiveRecord(row), onClick: () => setReasonRecord(row) }
                                ]}
                            />
                        )}
                    />
                </DataTableServer>
                {!listQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum registro" description="Crie um novo registro ou ajuste os filtros." /> : null}
            </Card>
            <div className="mt-3">
                <AuditInfoPanel audit={{ motivo: 'Administração v9.6.3 exibe status, criação e bloqueia edição/inativação para registros não ativos quando o backend retorna status diferente de Ativo.' }} />
            </div>
            <AdministracaoFormDialog visible={formVisible} loading={saveMutation.isPending} title={selectedRecord ? config.updateTitle : config.createTitle} fields={config.fields} schema={selectedRecord ? config.updateSchema : config.createSchema} record={selectedRecord} onHide={() => setFormVisible(false)} onSubmit={save} />
            <ReasonDialog visible={Boolean(reasonRecord)} title="Motivo da inativação" confirmLabel="Inativar" loading={inativarMutation.isPending} onHide={() => setReasonRecord(null)} onConfirm={inativar} />
        </>
    );
};
