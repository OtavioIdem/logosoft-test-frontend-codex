'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { SearchInput } from '@/components/forms/SearchInput';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useMotoristaMutations, useMotoristas } from '@/features/frota/hooks/useFrotaResources';
import { criarMotoristaSchema } from '@/features/frota/schemas/frotaSchemas';
import { MotoristaFormValues, MotoristaResponse, MotoristasListQuery } from '@/features/frota/types/frota.types';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const initialValues = (): MotoristaFormValues => ({ empresaId: '', filialId: null, nome: '', cpf: '', cnhNumero: '', cnhCategoria: '', cnhValidade: null, telefone: '' });

const filterLocal = (records: MotoristaResponse[], term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return records;
    return records.filter((record) => `${record.nome} ${record.cpf} ${record.cnhNumero}`.toLowerCase().includes(normalized));
};

const MotoristaFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: MotoristaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<MotoristaFormValues>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialValues());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof MotoristaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarMotoristaSchema.safeParse(values);
        if (!parsed.success) {
            const map: Record<string, string> = {};
            for (const issue of parsed.error.issues) {
                const key = issue.path[0];
                if (typeof key === 'string' && !map[key]) map[key] = issue.message;
            }
            setErrors(map);
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Cadastrar motorista" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    return (
        <Dialog header="Novo motorista" visible={visible} modal style={{ width: 'min(52rem, 98vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-8">
                    <label htmlFor="motNome" className="font-medium">Nome *</label>
                    <InputText id="motNome" value={values.nome} className={invalid('nome')} onChange={(event) => update('nome', event.target.value)} />
                    <FieldError message={errors.nome} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="motCpf" className="font-medium">CPF *</label>
                    <InputText id="motCpf" value={values.cpf} className={invalid('cpf')} onChange={(event) => update('cpf', event.target.value)} />
                    <FieldError message={errors.cpf} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="motCnh" className="font-medium">CNH — número *</label>
                    <InputText id="motCnh" value={values.cnhNumero} className={invalid('cnhNumero')} onChange={(event) => update('cnhNumero', event.target.value)} />
                    <FieldError message={errors.cnhNumero} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="motCnhCat" className="font-medium">Categoria *</label>
                    <InputText id="motCnhCat" value={values.cnhCategoria} className={invalid('cnhCategoria')} onChange={(event) => update('cnhCategoria', event.target.value.toUpperCase())} />
                    <FieldError message={errors.cnhCategoria} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="motCnhValidade" className="font-medium">Validade CNH *</label>
                    <DateInput id="motCnhValidade" value={values.cnhValidade ?? null} onChange={(value) => update('cnhValidade', value)} />
                    <FieldError message={errors.cnhValidade} />
                </div>
                <div className="field col-12 md:col-2">
                    <label htmlFor="motTelefone" className="font-medium">Telefone</label>
                    <InputText id="motTelefone" value={values.telefone ?? ''} onChange={(event) => update('telefone', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const MotoristasPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [filters, setFilters] = useState<MotoristasListQuery>({});
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [formVisible, setFormVisible] = useState(false);

    const motoristasQuery = useMotoristas(filters, hasPermission('FROTA_CONSULTAR'));
    const { criarMutation } = useMotoristaMutations();

    const records = useMemo(() => filterLocal(motoristasQuery.data ?? [], localSearch), [motoristasQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);

    if (!hasPermission('FROTA_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Frota exige a permissão FROTA_CONSULTAR." />;
    }

    const updateFilter = (name: keyof MotoristasListQuery, value: string | null) => {
        setFirst(0);
        setFilters((current) => ({ ...current, [name]: value === '' ? null : value }));
    };

    const criar = async (values: MotoristaFormValues) => {
        await runWithToast(
            async () => {
                await criarMutation.mutateAsync(values);
                setFormVisible(false);
            },
            { success: { summary: 'Motorista cadastrado', detail: `${values.nome} adicionado.` }, error: { summary: 'Erro ao cadastrar motorista', detail: 'Não foi possível cadastrar o motorista.' }, rethrow: true }
        );
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => updateFilter('empresaId', value)} onFilialChange={(value) => updateFilter('filialId', value)} />
            <SearchInput ariaLabel="Buscar motorista" defaultValue={localSearch} onChange={(term) => { setFirst(0); setLocalSearch(term); }} />
            <PermissionGuard permission="FROTA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Novo motorista" icon="pi pi-plus" disabled={disabled} onClick={() => setFormVisible(true)} />}</PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Motoristas" description="Cadastro de motoristas com controle de validade de CNH." actions={headerActions} />
            <Card>
                {motoristasQuery.error ? <ApiErrorPanel error={mapApiError(motoristasQuery.error)} /> : null}
                <DataTableServer<MotoristaResponse> value={visibleRecords} totalRecords={records.length} loading={motoristasQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }} emptyMessage="Nenhum motorista encontrado.">
                    <Column field="nome" header="Nome" />
                    <Column field="cpf" header="CPF" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                    <Column header="CNH" body={(row: MotoristaResponse) => `${row.cnhNumero} (${row.cnhCategoria})`} />
                    <Column header="Validade CNH" body={(row: MotoristaResponse) => (row.cnhVencida ? <Tag value={`${formatDate(row.cnhValidade)} · vencida`} severity="danger" /> : formatDate(row.cnhValidade))} />
                    <Column field="telefone" header="Telefone" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(row: MotoristaResponse) => row.telefone || '—'} />
                </DataTableServer>
                {!motoristasQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum motorista" description="Cadastre um motorista ou ajuste os filtros." /> : null}
            </Card>
            <MotoristaFormDialog visible={formVisible} loading={criarMutation.isPending} onHide={() => setFormVisible(false)} onSubmit={criar} />
        </>
    );
};
