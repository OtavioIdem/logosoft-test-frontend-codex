'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Password } from 'primereact/password';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import { AcessoEfetivoUsuario, GrupoAcessoResponse, ResetSenhaUsuarioFormValues, UsuarioResponse, VincularGrupoUsuarioFormValues } from '@/features/seguranca/types/seguranca.types';
import { resetSenhaUsuarioSchema, vincularGrupoUsuarioSchema } from '@/features/seguranca/schemas/segurancaSchemas';

type FieldErrors = Record<string, string | undefined>;
const fieldErrorMap = (error: { issues: Array<{ path: Array<string | number>; message: string }> }) => Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message])) as FieldErrors;

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '-');

export type AcessoEfetivoEstado = {
    data?: AcessoEfetivoUsuario;
    isLoading: boolean;
    isError: boolean;
    permitido: boolean;
    onRetry: () => void;
};

/**
 * Motivo pelo qual "Remover grupo" não pode ser acionado, ou null quando pode.
 * Botão desabilitado sem motivo escrito foi exatamente o defeito reportado nesta tela.
 */
export const motivoRemocaoIndisponivel = (acesso: AcessoEfetivoEstado): string | null => {
    if (!acesso.permitido) return 'Requer a permissão SEGURANCA_PERMISSOES_CONSULTAR para identificar os grupos vinculados.';
    if (acesso.isLoading) return 'Carregando o acesso efetivo do usuário.';
    if (acesso.isError) return 'Não foi possível carregar o acesso efetivo do usuário.';
    if (acesso.data?.origemIndisponivel) return `O backend confirma ${acesso.data.totalPermissoes} permissão(ões) efetiva(s), mas não devolve a origem por grupo neste escopo.`;
    if (!acesso.data?.grupos.length) return 'Nenhum grupo de acesso vinculado neste escopo.';
    return null;
};

type GerenciarUsuarioAcoes = {
    onResetSenha: () => void;
    onVincularGrupo: () => void;
    onRemoverGrupo: () => void;
    onInativar: () => void;
    onReativar: () => void;
};

const InfoField = ({ label, children, className = 'col-12 md:col-6' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={className}>
        <span className="block text-color-secondary text-sm">{label}</span>
        <div className="font-medium">{children}</div>
    </div>
);

export const GerenciarUsuarioDialog = ({ visible, usuario, empresaLabel, acesso, onHide, acoes }: { visible: boolean; usuario: UsuarioResponse | null; empresaLabel: string; acesso: AcessoEfetivoEstado; onHide: () => void; acoes: GerenciarUsuarioAcoes }) => {
    if (!usuario) return null;

    const motivoSemRemocao = motivoRemocaoIndisponivel(acesso);

    return (
        <Dialog header="Gerenciar usuário" visible={visible} modal style={{ width: 'min(44rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end"><Button label="Fechar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} /></div>}>
            <div className="surface-100 border-round p-3 mb-3">
                <div className="flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                    <span className="text-xl font-semibold">{usuario.nome}</span>
                    <div className="flex gap-2">
                        <Tag value={usuario.ativo ? 'Ativo' : 'Inativo'} severity={usuario.ativo ? 'success' : 'danger'} />
                        <Tag value={usuario.bloqueado ? 'Bloqueado' : 'Liberado'} severity={usuario.bloqueado ? 'danger' : 'success'} />
                    </div>
                </div>
                <div className="grid">
                    <InfoField label="E-mail">{usuario.email}</InfoField>
                    <InfoField label="Login">{usuario.login ?? usuario.email}</InfoField>
                    <InfoField label="Empresa">{empresaLabel}</InfoField>
                    <InfoField label="Último login">{formatDateTime(usuario.ultimoLoginEm)}</InfoField>
                </div>
            </div>

            <div className="border-1 surface-border border-round p-3 mb-3">
                <span className="block text-color-secondary text-sm mb-2">Acesso efetivo</span>
                {!acesso.permitido ? (
                    <Message className="w-full" severity="warn" text="Você não tem permissão para consultar o acesso efetivo deste usuário." />
                ) : acesso.isLoading ? (
                    <Skeleton height="2rem" />
                ) : acesso.isError ? (
                    <div className="flex flex-column sm:flex-row gap-2 sm:align-items-center">
                        <Message className="flex-1" severity="error" text="Não foi possível carregar o acesso efetivo." />
                        <Button label="Tentar novamente" icon="pi pi-refresh" size="small" outlined onClick={acesso.onRetry} />
                    </div>
                ) : acesso.data?.grupos.length ? (
                    <>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {acesso.data.grupos.map((grupo) => <Tag key={grupo.id} value={grupo.nome} severity="info" />)}
                        </div>
                        <span className="text-color-secondary text-sm">{acesso.data.totalPermissoes} permissão(ões) efetiva(s) neste escopo.</span>
                    </>
                ) : acesso.data?.origemIndisponivel ? (
                    <Message className="w-full" severity="warn" text={`O contrato atual não devolve a origem por grupo; ${acesso.data.totalPermissoes} permissão(ões) efetiva(s) estão ativas neste escopo.`} />
                ) : (
                    <Message className="w-full" severity="info" text="Nenhuma permissão efetiva neste escopo." />
                )}
            </div>

            <span className="block text-color-secondary text-sm mb-2">Ações</span>
            <PermissionGuard permission="SEGURANCA_USUARIOS_GERENCIAR" mode="disable">
                {({ disabled }) => (
                    <div className="flex flex-column sm:flex-row flex-wrap gap-2">
                        <Button label="Resetar senha" icon="pi pi-key" severity="secondary" outlined disabled={disabled} onClick={acoes.onResetSenha} />
                        <Button label="Vincular grupo" icon="pi pi-shield" severity="secondary" outlined disabled={disabled} onClick={acoes.onVincularGrupo} />
                        <Button label="Remover grupo" icon="pi pi-minus-circle" severity="warning" outlined disabled={disabled || Boolean(motivoSemRemocao)} onClick={acoes.onRemoverGrupo} title={motivoSemRemocao ?? undefined} />
                        {usuario.ativo ? (
                            <Button label="Inativar" icon="pi pi-user-minus" severity="danger" outlined disabled={disabled} onClick={acoes.onInativar} />
                        ) : (
                            <Button label="Reativar" icon="pi pi-user-plus" severity="success" outlined disabled={disabled} onClick={acoes.onReativar} />
                        )}
                    </div>
                )}
            </PermissionGuard>
            {motivoSemRemocao ? <span className="block text-color-secondary text-sm mt-2">Remover grupo indisponível: {motivoSemRemocao}</span> : null}
        </Dialog>
    );
};

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

/**
 * Remoção de grupo passa a exigir escolha explícita entre os grupos realmente vinculados,
 * em vez de assumir "o primeiro" — heurística que mantinha o botão travado e silencioso.
 */
export const RemoverGrupoUsuarioDialog = ({ visible, loading, grupos, onHide, onSubmit }: { visible: boolean; loading?: boolean; grupos: Array<{ id: string; nome: string }>; onHide: () => void; onSubmit: (values: { grupoAcessoId: string; motivo: string }) => Promise<void> }) => {
    const [values, setValues] = useState({ grupoAcessoId: '', motivo: '' });
    const [errors, setErrors] = useState<FieldErrors>({});
    const grupoOptions = useMemo(() => grupos.map((grupo) => ({ label: grupo.nome, value: grupo.id })), [grupos]);

    useEffect(() => { if (visible) { setValues({ grupoAcessoId: grupos.length === 1 ? grupos[0].id : '', motivo: '' }); setErrors({}); } }, [grupos, visible]);

    const update = (name: 'grupoAcessoId' | 'motivo', value: string | null) => { setValues((current) => ({ ...current, [name]: value ?? '' })); setErrors((current) => ({ ...current, [name]: undefined })); };
    const submit = async () => {
        const parsed = vincularGrupoUsuarioSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit({ grupoAcessoId: parsed.data.grupoAcessoId, motivo: parsed.data.motivo });
    };

    return (
        <Dialog header="Remover grupo do usuário" visible={visible} modal style={{ width: 'min(38rem, 94vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label="Remover" icon="pi pi-minus-circle" severity="warning" loading={loading} onClick={submit} /></div>}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12"><label htmlFor="grupoRemocaoId" className="font-medium">Grupo de acesso</label><EntitySelect id="grupoRemocaoId" entityName="grupo de acesso" value={values.grupoAcessoId || null} options={grupoOptions} onChange={(value) => update('grupoAcessoId', value)} /><FieldError message={errors.grupoAcessoId} /></div>
                <div className="field col-12"><label htmlFor="motivoRemocaoGrupo" className="font-medium">Motivo</label><InputTextarea id="motivoRemocaoGrupo" rows={4} autoResize value={values.motivo} className={classNames({ 'p-invalid': errors.motivo })} onChange={(event) => update('motivo', event.target.value)} /><FieldError message={errors.motivo} /></div>
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
