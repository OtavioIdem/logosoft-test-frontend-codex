'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { MultiSelect } from 'primereact/multiselect';
import { Password } from 'primereact/password';
import { classNames } from 'primereact/utils';
import { FieldError } from '@/components/forms/FieldError';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { GrupoAcessoResponse, UsuarioFormValues } from '@/features/seguranca/types/seguranca.types';
import { criarUsuarioSegurancaSchema } from '@/features/seguranca/schemas/segurancaSchemas';

type UsuarioFormDialogProps = {
    visible: boolean;
    loading?: boolean;
    grupos?: GrupoAcessoResponse[];
    onHide: () => void;
    onSubmit: (values: UsuarioFormValues) => Promise<void>;
};

export const UsuarioFormDialog = ({ visible, loading, grupos = [], onHide, onSubmit }: UsuarioFormDialogProps) => {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<UsuarioFormValues>({
        resolver: zodResolver(criarUsuarioSegurancaSchema),
        defaultValues: {
            nome: '',
            email: '',
            login: '',
            senha: '',
            empresaId: '',
            filialId: '',
            gruposAcessoIds: []
        }
    });

    const empresaId = useWatch({ control, name: 'empresaId' });
    const grupoOptions = grupos.filter((grupo) => grupo.ativo).map((grupo) => ({ label: grupo.nome, value: grupo.id }));

    const submit = async (values: UsuarioFormValues) => {
        await onSubmit(values);
        reset();
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="submit" label="Criar usuário" icon="pi pi-check" form="usuario-form" loading={loading} />
        </div>
    );

    return (
        <Dialog header="Novo usuário" visible={visible} style={{ width: 'min(46rem, 96vw)' }} modal footer={footer} onHide={onHide}>
            <form id="usuario-form" onSubmit={handleSubmit(submit)} className="grid formgrid p-fluid" noValidate>
                <div className="field col-12 md:col-6">
                    <label htmlFor="nome" className="font-medium">Nome</label>
                    <Controller name="nome" control={control} render={({ field }) => <InputText {...field} id="nome" className={classNames({ 'p-invalid': errors.nome })} />} />
                    <FieldError message={errors.nome?.message} />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="email" className="font-medium">E-mail</label>
                    <Controller name="email" control={control} render={({ field }) => <InputText {...field} id="email" type="email" className={classNames({ 'p-invalid': errors.email })} />} />
                    <FieldError message={errors.email?.message} />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="login" className="font-medium">Login</label>
                    <Controller name="login" control={control} render={({ field }) => <InputText {...field} value={field.value ?? ''} id="login" className={classNames({ 'p-invalid': errors.login })} />} />
                    <small className="text-color-secondary">Opcional. Se vazio, o e-mail será usado como login.</small>
                    <FieldError message={errors.login?.message} />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="senha" className="font-medium">Senha inicial</label>
                    <Controller name="senha" control={control} render={({ field }) => <Password {...field} inputId="senha" id="senha-wrapper" inputClassName="w-full" className={classNames('w-full', { 'p-invalid': errors.senha })} feedback toggleMask />} />
                    <FieldError message={errors.senha?.message} />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="empresaId" className="font-medium">Empresa</label>
                    <Controller name="empresaId" control={control} render={({ field }) => <EmpresaSelect id="empresaId" value={field.value || null} required onChange={(value) => field.onChange(value ?? '')} />} />
                    <FieldError message={errors.empresaId?.message} />
                </div>

                <div className="field col-12 md:col-6">
                    <label htmlFor="filialId" className="font-medium">Filial</label>
                    <Controller name="filialId" control={control} render={({ field }) => <FilialSelect id="filialId" empresaId={empresaId || null} value={field.value || null} disabled={!empresaId} onChange={(value) => field.onChange(value ?? '')} />} />
                    <small className="text-color-secondary">Opcional. Pesquise pelo nome; o vínculo correto será enviado automaticamente.</small>
                    <FieldError message={errors.filialId?.message} />
                </div>

                <div className="field col-12">
                    <label htmlFor="gruposAcessoIds" className="font-medium">Grupos de acesso</label>
                    <Controller
                        name="gruposAcessoIds"
                        control={control}
                        render={({ field }) => (
                            <MultiSelect
                                inputId="gruposAcessoIds"
                                value={field.value ?? []}
                                options={grupoOptions}
                                optionLabel="label"
                                optionValue="value"
                                display="chip"
                                placeholder="Selecione os grupos"
                                className={classNames('w-full', { 'p-invalid': errors.gruposAcessoIds })}
                                onChange={(event) => field.onChange(event.value ?? [])}
                            />
                        )}
                    />
                    <small className="text-color-secondary">Opcional. O vínculo também pode ser feito depois pela ação Grupos.</small>
                    <FieldError message={errors.gruposAcessoIds?.message} />
                </div>
            </form>
        </Dialog>
    );
};
