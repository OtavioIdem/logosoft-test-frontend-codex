'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Password } from 'primereact/password';
import { classNames } from 'primereact/utils';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { GrupoAcessoResponse, ResetSenhaUsuarioFormValues, VincularGrupoUsuarioFormValues } from '@/features/seguranca/types/seguranca.types';
import { resetSenhaUsuarioSchema, vincularGrupoUsuarioSchema } from '@/features/seguranca/schemas/segurancaSchemas';

type FieldErrors = Record<string, string | undefined>;
const fieldErrorMap = (error: { issues: Array<{ path: Array<string | number>; message: string }> }) => Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message])) as FieldErrors;

export const ResetSenhaUsuarioDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ResetSenhaUsuarioFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ResetSenhaUsuarioFormValues>({ novaSenha: '', confirmarSenha: '', motivo: '' });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => { if (visible) { setValues({ novaSenha: '', confirmarSenha: '', motivo: '' }); setErrors({}); } }, [visible]);

    const update = (name: keyof ResetSenhaUsuarioFormValues, value: string) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); };
    const submit = async () => {
        const parsed = resetSenhaUsuarioSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Resetar senha" visible={visible} modal style={{ width: 'min(34rem, 94vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Resetar senha" icon="pi pi-key" loading={loading} onClick={submit} /></div>}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12 md:col-6"><label htmlFor="novaSenha" className="font-medium">Nova senha</label><Password inputId="novaSenha" inputClassName="w-full" className={classNames('w-full', { 'p-invalid': errors.novaSenha })} value={values.novaSenha} feedback toggleMask onChange={(event) => update('novaSenha', event.target.value)} /><FieldError message={errors.novaSenha} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="confirmarSenha" className="font-medium">Confirmar senha</label><Password inputId="confirmarSenha" inputClassName="w-full" className={classNames('w-full', { 'p-invalid': errors.confirmarSenha })} value={values.confirmarSenha} feedback={false} toggleMask onChange={(event) => update('confirmarSenha', event.target.value)} /><FieldError message={errors.confirmarSenha} /></div>
                <div className="field col-12"><label htmlFor="motivoResetSenha" className="font-medium">Motivo</label><InputTextarea id="motivoResetSenha" rows={4} autoResize value={values.motivo} className={classNames({ 'p-invalid': errors.motivo })} onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
            </div>
        </Dialog>
    );
};

export const VincularGrupoUsuarioDialog = ({ visible, loading, grupos, onHide, onSubmit }: { visible: boolean; loading?: boolean; grupos: GrupoAcessoResponse[]; onHide: () => void; onSubmit: (values: VincularGrupoUsuarioFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<VincularGrupoUsuarioFormValues>({ grupoAcessoId: '', motivo: '' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const grupoOptions = useMemo(() => grupos.filter((grupo) => grupo.ativo).map((grupo) => ({ label: grupo.nome, value: grupo.id })), [grupos]);

    useEffect(() => { if (visible) { setValues({ grupoAcessoId: '', motivo: '' }); setErrors({}); } }, [visible]);

    const update = (name: keyof VincularGrupoUsuarioFormValues, value: string | null) => { setValues((current) => ({ ...current, [name]: value ?? '' })); setErrors((current) => ({ ...current, [name]: undefined })); };
    const submit = async () => {
        const parsed = vincularGrupoUsuarioSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Vincular grupo ao usuário" visible={visible} modal style={{ width: 'min(38rem, 94vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Vincular" icon="pi pi-shield" loading={loading} onClick={submit} /></div>}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12"><label htmlFor="grupoAcessoId" className="font-medium">Grupo de acesso</label><EntitySelect id="grupoAcessoId" entityName="grupo de acesso" value={values.grupoAcessoId || null} options={grupoOptions} onChange={(value) => update('grupoAcessoId', value)} /><FieldError message={errors.grupoAcessoId} /></div>
                <div className="field col-12"><label htmlFor="motivoVinculoGrupo" className="font-medium">Motivo</label><InputTextarea id="motivoVinculoGrupo" rows={4} autoResize value={values.motivo} className={classNames({ 'p-invalid': errors.motivo })} onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
            </div>
        </Dialog>
    );
};
