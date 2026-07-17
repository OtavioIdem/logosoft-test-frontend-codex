'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { criarOrdemServicoSchema } from '@/features/servicos/schemas/servicosSchemas';
import { OrdemServicoFormValues, PrioridadeOrdemServico } from '@/features/servicos/types/servicos.types';
import { prioridadeOptions } from '@/features/servicos/components/servicosLabels';

const buildErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    }
    return map;
};

const initialValues = (): OrdemServicoFormValues => ({
    empresaId: '',
    filialId: null,
    numero: '',
    clienteId: '',
    descricao: '',
    prioridade: PrioridadeOrdemServico.Media,
    tecnicoResponsavelId: null,
    localEstoqueId: null,
    dataAbertura: null,
    dataPrevisao: null
});

export const OrdemServicoFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: OrdemServicoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<OrdemServicoFormValues>(initialValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialValues());
            setErrors({});
        }
    }, [visible]);

    const scope = { empresaId: values.empresaId || null, filialId: values.filialId || null };
    const clientesQuery = useClientes(scope);
    const locaisQuery = useLocaisEstoque(scope);
    const usuariosQuery = useUsuariosSeguranca({ empresaId: values.empresaId || undefined, filialId: values.filialId || undefined, ativo: true });

    const clienteOptions = useMemo(() => (clientesQuery.data ?? []).map((cliente) => ({ label: cliente.codigo, value: cliente.id })), [clientesQuery.data]);
    const localOptions = useMemo(() => (locaisQuery.data ?? []).map((local) => ({ label: `${local.codigo} - ${local.nome}`, value: local.id })), [locaisQuery.data]);
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);

    const update = (name: keyof OrdemServicoFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarOrdemServicoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Criar OS" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    return (
        <Dialog header="Nova ordem de serviço" visible={visible} modal style={{ width: 'min(56rem, 98vw)' }} footer={footer} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields
                    empresaId={values.empresaId || null}
                    filialId={values.filialId || null}
                    empresaError={errors.empresaId}
                    filialError={errors.filialId}
                    empresaCol="col-12 md:col-6"
                    filialCol="col-12 md:col-6"
                    onEmpresaChange={(value) => update('empresaId', value)}
                    onFilialChange={(value) => update('filialId', value)}
                />
                <div className="field col-12 md:col-4">
                    <label htmlFor="osNumero" className="font-medium">Número *</label>
                    <InputText id="osNumero" value={values.numero} className={invalid('numero')} onChange={(event) => update('numero', event.target.value)} />
                    <FieldError message={errors.numero} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="osCliente" className="font-medium">Cliente *</label>
                    <EntitySelect id="osCliente" entityName="cliente" value={values.clienteId || null} options={clienteOptions} loading={clientesQuery.isFetching} onChange={(value) => update('clienteId', value)} />
                    <FieldError message={errors.clienteId} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="osPrioridade" className="font-medium">Prioridade *</label>
                    <Dropdown inputId="osPrioridade" value={values.prioridade} options={prioridadeOptions} onChange={(event) => update('prioridade', event.value)} />
                    <FieldError message={errors.prioridade} />
                </div>
                <div className="field col-12">
                    <label htmlFor="osDescricao" className="font-medium">Descrição *</label>
                    <InputTextarea id="osDescricao" value={values.descricao} rows={2} autoResize className={invalid('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                    <FieldError message={errors.descricao} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="osTecnico" className="font-medium">Técnico responsável</label>
                    <EntitySelect id="osTecnico" entityName="técnico" value={values.tecnicoResponsavelId ?? null} options={usuarioOptions} loading={usuariosQuery.isFetching} onChange={(value) => update('tecnicoResponsavelId', value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="osLocal" className="font-medium">Local de estoque</label>
                    <EntitySelect id="osLocal" entityName="local" value={values.localEstoqueId ?? null} options={localOptions} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueId', value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="osAbertura" className="font-medium">Data de abertura</label>
                    <DateInput id="osAbertura" value={values.dataAbertura ?? null} onChange={(value) => update('dataAbertura', value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="osPrevisao" className="font-medium">Data de previsão</label>
                    <DateInput id="osPrevisao" value={values.dataPrevisao ?? null} onChange={(value) => update('dataPrevisao', value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
