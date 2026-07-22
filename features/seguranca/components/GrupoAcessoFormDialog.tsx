'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { MultiSelect } from 'primereact/multiselect';
import { classNames } from 'primereact/utils';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { PermissionCode } from '@/types/erp';
import { GrupoAcessoFormValues, GrupoAcessoResponse } from '@/features/seguranca/types/seguranca.types';
import { grupoAcessoSchema } from '@/features/seguranca/schemas/segurancaSchemas';
import { permissoesAgrupadas } from '@/features/seguranca/permissoesCatalogo';

type FieldErrors = Record<string, string | undefined>;
const fieldErrorMap = (error: { issues: Array<{ path: Array<string | number>; message: string }> }) => Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message])) as FieldErrors;
const initialValues = (grupo?: GrupoAcessoResponse | null): GrupoAcessoFormValues => ({ empresaId: grupo?.empresaId ?? '', filialId: grupo?.filialId ?? null, nome: grupo?.nome ?? '', descricao: grupo?.descricao ?? '', permissoes: grupo?.permissoes ?? [] });

export const GrupoAcessoFormDialog = ({ visible, loading, grupo, onHide, onSubmit }: { visible: boolean; loading?: boolean; grupo?: GrupoAcessoResponse | null; onHide: () => void; onSubmit: (values: GrupoAcessoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<GrupoAcessoFormValues>(initialValues(grupo));
    const [errors, setErrors] = useState<FieldErrors>({});
    const grupos = useMemo(() => permissoesAgrupadas(), []);

    useEffect(() => { if (visible) { setValues(initialValues(grupo)); setErrors({}); } }, [grupo, visible]);

    const update = <K extends keyof GrupoAcessoFormValues>(name: K, value: GrupoAcessoFormValues[K]) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); };
    const submit = async () => {
        const parsed = grupoAcessoSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(values);
    };

    return (
        <Dialog header={grupo ? 'Editar grupo de acesso' : 'Novo grupo de acesso'} visible={visible} modal style={{ width: 'min(52rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label={grupo ? 'Salvar' : 'Criar grupo'} icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <div className="grid formgrid p-fluid">
                <EmpresaFilialFields
                    empresaId={values.empresaId || null}
                    filialId={values.filialId || null}
                    empresaError={errors.empresaId}
                    filialError={errors.filialId}
                    empresaCol="col-12 md:col-6"
                    filialCol="col-12 md:col-6"
                    onEmpresaChange={(value) => update('empresaId', value ?? '')}
                    onFilialChange={(value) => update('filialId', value)}
                />
                <div className="field col-12 md:col-6"><label htmlFor="nomeGrupo" className="font-medium">Nome</label><InputText id="nomeGrupo" value={values.nome} className={classNames({ 'p-invalid': errors.nome })} onChange={(event) => update('nome', event.target.value)} /><FieldError message={errors.nome} /></div>
                <div className="field col-12"><label htmlFor="descricaoGrupo" className="font-medium">Descrição</label><InputTextarea id="descricaoGrupo" rows={2} autoResize value={values.descricao ?? ''} className={classNames({ 'p-invalid': errors.descricao })} onChange={(event) => update('descricao', event.target.value)} /><FieldError message={errors.descricao} /></div>
                <div className="field col-12">
                    <label htmlFor="permissoesGrupo" className="font-medium">Permissões</label>
                    <MultiSelect
                        inputId="permissoesGrupo"
                        value={values.permissoes}
                        options={grupos}
                        optionGroupLabel="label"
                        optionGroupChildren="items"
                        optionLabel="label"
                        optionValue="value"
                        display="chip"
                        filter
                        filterPlaceholder="Buscar permissão"
                        placeholder="Selecione as permissões"
                        maxSelectedLabels={6}
                        selectedItemsLabel="{0} permissões selecionadas"
                        className={classNames('w-full', { 'p-invalid': errors.permissoes })}
                        onChange={(event) => update('permissoes', (event.value as PermissionCode[]) ?? [])}
                    />
                    <small className="text-color-secondary">Selecione as permissões por módulo. Use a busca para filtrar. O backend continua validando o acesso.</small>
                    <FieldError message={errors.permissoes} />
                </div>
            </div>
        </Dialog>
    );
};
