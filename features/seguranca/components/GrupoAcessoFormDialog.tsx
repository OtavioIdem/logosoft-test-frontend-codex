'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { FieldError } from '@/components/forms/FieldError';
import { GrupoAcessoFormValues, GrupoAcessoResponse } from '@/features/seguranca/types/seguranca.types';
import { grupoAcessoSchema } from '@/features/seguranca/schemas/segurancaSchemas';

type FieldErrors = Record<string, string | undefined>;
const fieldErrorMap = (error: { issues: Array<{ path: Array<string | number>; message: string }> }) => Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message])) as FieldErrors;
const initialValues = (grupo?: GrupoAcessoResponse | null): GrupoAcessoFormValues => ({ nome: grupo?.nome ?? '', descricao: grupo?.descricao ?? '', permissoesTexto: (grupo?.permissoes ?? []).join('\n') });

export const GrupoAcessoFormDialog = ({ visible, loading, grupo, onHide, onSubmit }: { visible: boolean; loading?: boolean; grupo?: GrupoAcessoResponse | null; onHide: () => void; onSubmit: (values: GrupoAcessoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<GrupoAcessoFormValues>(initialValues(grupo));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => { if (visible) { setValues(initialValues(grupo)); setErrors({}); } }, [grupo, visible]);

    const update = (name: keyof GrupoAcessoFormValues, value: string) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); };
    const submit = async () => {
        const parsed = grupoAcessoSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header={grupo ? 'Editar grupo de acesso' : 'Novo grupo de acesso'} visible={visible} modal style={{ width: 'min(44rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label={grupo ? 'Salvar' : 'Criar grupo'} icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12 md:col-6"><label htmlFor="nomeGrupo" className="font-medium">Nome</label><InputText id="nomeGrupo" value={values.nome} className={classNames({ 'p-invalid': errors.nome })} onChange={(event) => update('nome', event.target.value)} /><FieldError message={errors.nome} /></div>
                <div className="field col-12"><label htmlFor="descricaoGrupo" className="font-medium">Descrição</label><InputTextarea id="descricaoGrupo" rows={3} autoResize value={values.descricao ?? ''} className={classNames({ 'p-invalid': errors.descricao })} onChange={(event) => update('descricao', event.target.value)} /><FieldError message={errors.descricao} /></div>
                <div className="field col-12"><label htmlFor="permissoesTexto" className="font-medium">Permissões</label><InputTextarea id="permissoesTexto" rows={8} autoResize value={values.permissoesTexto} className={classNames('font-mono text-sm', { 'p-invalid': errors.permissoesTexto })} onChange={(event) => update('permissoesTexto', event.target.value)} /><small className="text-color-secondary">Informe uma permissão por linha ou separe por vírgula. Exemplo: SEGURANCA_USUARIOS_CONSULTAR.</small><FieldError message={errors.permissoesTexto} /></div>
            </div>
        </Dialog>
    );
};
