'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { GerenciarUsuarioDialog, ResetSenhaUsuarioDialog, VincularGrupoUsuarioDialog } from '@/features/seguranca/components/SegurancaActionDialogs';
import { UsuarioFormDialog } from '@/features/seguranca/components/UsuarioFormDialog';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useEmpresasOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { mapApiError } from '@/lib/http/apiError';
import {
    useCriarUsuarioSeguranca,
    useGruposAcessoSeguranca,
    useInativarUsuarioSeguranca,
    useReativarUsuarioSeguranca,
    useRemoverGrupoUsuarioSeguranca,
    useResetSenhaUsuarioSeguranca,
    useUsuariosSeguranca,
    useVincularGrupoUsuarioSeguranca
} from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { GrupoAcessoResponse, ResetSenhaUsuarioFormValues, UsuarioFormValues, UsuarioResponse, VincularGrupoUsuarioFormValues } from '@/features/seguranca/types/seguranca.types';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '-');
const gruposLabel = (usuario: UsuarioResponse) => (usuario.gruposAcesso?.length ? usuario.gruposAcesso.map((grupo) => grupo.nome ?? grupo.grupoAcessoId ?? grupo.id).filter(Boolean).join(', ') : '-');

export const UsuariosPage = () => {
    const runWithToast = useMutationWithToast();
    const { hasPermission } = usePermissions();
    const usuariosQuery = useUsuariosSeguranca();
    const gruposQuery = useGruposAcessoSeguranca({ ativo: true });
    const empresasQuery = useEmpresasOptions();
    const criarUsuario = useCriarUsuarioSeguranca();
    const inativarUsuario = useInativarUsuarioSeguranca();
    const reativarUsuario = useReativarUsuarioSeguranca();
    const resetarSenha = useResetSenhaUsuarioSeguranca();
    const vincularGrupo = useVincularGrupoUsuarioSeguranca();
    const removerGrupo = useRemoverGrupoUsuarioSeguranca();
    const [formVisible, setFormVisible] = useState(false);
    const [gerenciarVisible, setGerenciarVisible] = useState(false);
    const [resetVisible, setResetVisible] = useState(false);
    const [vincularVisible, setVincularVisible] = useState(false);
    const [reasonAction, setReasonAction] = useState<'inativar' | 'reativar' | 'remover-grupo' | null>(null);
    const [selectedUsuario, setSelectedUsuario] = useState<UsuarioResponse | null>(null);
    const [selectedGrupo, setSelectedGrupo] = useState<GrupoAcessoResponse | null>(null);
    const [search, setSearch] = useState('');

    const usuarios = useMemo(() => usuariosQuery.data ?? [], [usuariosQuery.data]);
    const grupos = useMemo(() => gruposQuery.data ?? [], [gruposQuery.data]);
    const empresaLabelMap = useMemo(() => new Map(empresasQuery.options.map((option) => [option.value, option.label])), [empresasQuery.options]);
    const grupoById = useMemo(() => new Map(grupos.map((grupo) => [grupo.id, grupo])), [grupos]);
    const filteredUsuarios = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return usuarios;
        return usuarios.filter((usuario) => `${usuario.nome} ${usuario.email} ${usuario.login ?? ''} ${usuario.empresaId} ${usuario.filialId ?? ''} ${gruposLabel(usuario)}`.toLowerCase().includes(term));
    }, [search, usuarios]);

    if (!hasPermission('SEGURANCA_USUARIOS_CONSULTAR')) {
        return <UnauthorizedState description="A rotina Usuários exige a permissão SEGURANCA_USUARIOS_CONSULTAR." />;
    }

    const submitUsuario = async (values: UsuarioFormValues) => {
        await runWithToast(
            async () => {
                await criarUsuario.mutateAsync(values);
                setFormVisible(false);
            },
            { success: { summary: 'Usuário criado', detail: 'O usuário foi criado com sucesso.' }, error: { summary: 'Erro ao criar usuário', detail: 'Não foi possível criar o usuário.' }, rethrow: true }
        );
    };

    const submitResetSenha = async (values: ResetSenhaUsuarioFormValues) => {
        if (!selectedUsuario) return;
        await runWithToast(
            async () => {
                await resetarSenha.mutateAsync({ id: selectedUsuario.id, values });
                setResetVisible(false);
                setSelectedUsuario(null);
            },
            { success: { summary: 'Senha resetada', detail: 'A nova senha foi registrada com auditoria.' }, error: { summary: 'Erro ao resetar senha', detail: 'Não foi possível resetar a senha.' }, rethrow: true }
        );
    };

    const submitVincularGrupo = async (values: VincularGrupoUsuarioFormValues) => {
        if (!selectedUsuario) return;
        await runWithToast(
            async () => {
                await vincularGrupo.mutateAsync({ id: selectedUsuario.id, values });
                setVincularVisible(false);
                setSelectedUsuario(null);
            },
            { success: { summary: 'Grupo vinculado', detail: 'O grupo de acesso foi vinculado ao usuário.' }, error: { summary: 'Erro ao vincular grupo', detail: 'Não foi possível vincular o grupo.' }, rethrow: true }
        );
    };

    const confirmReasonAction = async (motivo: string) => {
        if (!selectedUsuario || !reasonAction) return;
        const success =
            reasonAction === 'inativar'
                ? { summary: 'Usuário inativado', detail: 'O usuário foi inativado com motivo auditável.' }
                : reasonAction === 'reativar'
                ? { summary: 'Usuário reativado', detail: 'O usuário foi reativado com motivo auditável.' }
                : { summary: 'Grupo removido', detail: 'O grupo foi removido do usuário.' };
        await runWithToast(
            async () => {
                if (reasonAction === 'inativar') await inativarUsuario.mutateAsync({ id: selectedUsuario.id, motivo });
                if (reasonAction === 'reativar') await reativarUsuario.mutateAsync({ id: selectedUsuario.id, motivo });
                if (reasonAction === 'remover-grupo' && selectedGrupo) await removerGrupo.mutateAsync({ id: selectedUsuario.id, grupoAcessoId: selectedGrupo.id, motivo });
                setReasonAction(null);
                setSelectedUsuario(null);
                setSelectedGrupo(null);
            },
            { success, error: { summary: 'Erro na operação', detail: 'Não foi possível concluir a operação.' } }
        );
    };

    const groupToRemoveFor = (usuario: UsuarioResponse | null): GrupoAcessoResponse | null => {
        const usuarioGrupos = usuario?.gruposAcesso ?? [];
        const firstGroupId = usuarioGrupos[0]?.grupoAcessoId ?? usuarioGrupos[0]?.id;
        if (!firstGroupId) return null;
        return grupoById.get(firstGroupId) ?? { id: firstGroupId, nome: usuarioGrupos[0]?.nome ?? 'Grupo vinculado', ativo: true };
    };

    const abrirGerenciar = (usuario: UsuarioResponse) => { setSelectedUsuario(usuario); setGerenciarVisible(true); };
    const gerenciarAcoes = {
        onResetSenha: () => { setGerenciarVisible(false); setResetVisible(true); },
        onVincularGrupo: () => { setGerenciarVisible(false); setVincularVisible(true); },
        onRemoverGrupo: () => { const grupo = groupToRemoveFor(selectedUsuario); if (grupo) { setSelectedGrupo(grupo); setGerenciarVisible(false); setReasonAction('remover-grupo'); } },
        onInativar: () => { setGerenciarVisible(false); setReasonAction('inativar'); },
        onReativar: () => { setGerenciarVisible(false); setReasonAction('reativar'); }
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText placeholder="Buscar usuário" value={search} onChange={(event) => setSearch(event.target.value)} /></span>
            <PermissionGuard permission="SEGURANCA_USUARIOS_GERENCIAR" mode="disable">
                {({ disabled }) => <Button label="Novo usuário" icon="pi pi-user-plus" onClick={() => setFormVisible(true)} disabled={disabled} />}
            </PermissionGuard>
        </div>
    );

    const reasonTitle = reasonAction === 'inativar' ? 'Inativar usuário' : reasonAction === 'reativar' ? 'Reativar usuário' : 'Remover grupo do usuário';

    return (
        <>
            <PageHeader title="Usuários" description="Gestão de usuários, status, senha e grupos de acesso usando os endpoints reais de Segurança." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Operações críticas exigem motivo e são enviadas ao backend para auditoria: inativação, reativação, reset de senha e vínculo/remoção de grupos." />

            <Card>
                {usuariosQuery.error ? <ApiErrorPanel error={mapApiError(usuariosQuery.error)} /> : null}
                {gruposQuery.error ? <ApiErrorPanel error={mapApiError(gruposQuery.error)} title="Não foi possível carregar grupos de acesso." /> : null}

                <DataTableServer<UsuarioResponse> value={filteredUsuarios} totalRecords={filteredUsuarios.length} loading={usuariosQuery.isFetching} first={0} rows={10} onPage={() => undefined} emptyMessage="Nenhum usuário encontrado.">
                    <Column field="nome" header="Nome" />
                    <Column field="email" header="E-mail" />
                    <Column header="Login" body={(usuario: UsuarioResponse) => usuario.login ?? usuario.email} />
                    <Column header="Empresa" body={(usuario: UsuarioResponse) => empresaLabelMap.get(usuario.empresaId) ?? 'Empresa não carregada'} />
                    <Column header="Grupos" body={(usuario: UsuarioResponse) => gruposLabel(usuario)} />
                    <Column header="Ativo" body={(usuario: UsuarioResponse) => <Tag value={usuario.ativo ? 'Ativo' : 'Inativo'} severity={usuario.ativo ? 'success' : 'danger'} />} />
                    <Column header="Bloqueado" body={(usuario: UsuarioResponse) => <Tag value={usuario.bloqueado ? 'Bloqueado' : 'Liberado'} severity={usuario.bloqueado ? 'danger' : 'success'} />} />
                    <Column header="Último login" body={(usuario: UsuarioResponse) => formatDateTime(usuario.ultimoLoginEm)} />
                    <Column
                        header="Ações"
                        align="right"
                        body={(usuario: UsuarioResponse) => (
                            <div className="flex justify-content-end">
                                <Button label="Gerenciar" icon="pi pi-user-edit" size="small" outlined onClick={() => abrirGerenciar(usuario)} aria-label={`Gerenciar ${usuario.nome}`} />
                            </div>
                        )}
                    />
                </DataTableServer>

                {!usuariosQuery.isLoading && filteredUsuarios.length === 0 ? <EmptyState title="Nenhum usuário" description="Crie um usuário ou ajuste a busca." /> : null}
            </Card>

            <GerenciarUsuarioDialog
                visible={gerenciarVisible}
                usuario={selectedUsuario}
                empresaLabel={selectedUsuario ? empresaLabelMap.get(selectedUsuario.empresaId) ?? 'Empresa não carregada' : '-'}
                gruposLabel={selectedUsuario ? gruposLabel(selectedUsuario) : '-'}
                temGrupo={Boolean(groupToRemoveFor(selectedUsuario))}
                onHide={() => { setGerenciarVisible(false); setSelectedUsuario(null); }}
                acoes={gerenciarAcoes}
            />
            <UsuarioFormDialog visible={formVisible} loading={criarUsuario.isPending} grupos={grupos} onHide={() => setFormVisible(false)} onSubmit={submitUsuario} />
            <ResetSenhaUsuarioDialog visible={resetVisible} loading={resetarSenha.isPending} onHide={() => setResetVisible(false)} onSubmit={submitResetSenha} />
            <VincularGrupoUsuarioDialog visible={vincularVisible} loading={vincularGrupo.isPending} grupos={grupos} onHide={() => setVincularVisible(false)} onSubmit={submitVincularGrupo} />
            <ReasonDialog visible={Boolean(reasonAction)} title={reasonTitle} loading={inativarUsuario.isPending || reativarUsuario.isPending || removerGrupo.isPending} onHide={() => setReasonAction(null)} onConfirm={confirmReasonAction} />
        </>
    );
};
