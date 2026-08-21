'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { GerenciarUsuarioDialog, RemoverGrupoUsuarioDialog, ResetSenhaUsuarioDialog, VincularGrupoUsuarioDialog } from '@/features/seguranca/components/SegurancaActionDialogs';
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
    usePermissoesEfetivasUsuario,
    useVincularGrupoUsuarioSeguranca
} from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { ResetSenhaUsuarioFormValues, UsuarioFormValues, UsuarioResponse, VincularGrupoUsuarioFormValues } from '@/features/seguranca/types/seguranca.types';

const formatDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '-');
// Na tabela, a empresa é resumida ao nome fantasia (primeiro segmento do label "Fantasia • Razão • Documento") para não estourar a largura; o label completo fica no tooltip.
const empresaCurto = (label: string) => label.split(' • ')[0] || label;

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
    const [reasonAction, setReasonAction] = useState<'inativar' | 'reativar' | null>(null);
    const [removerVisible, setRemoverVisible] = useState(false);
    // Guardamos o id, não o objeto: o snapshot congelado em state era o que deixava o diálogo
    // exibindo dados velhos depois de vincular um grupo.
    const [selectedUsuarioId, setSelectedUsuarioId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const usuarios = useMemo(() => usuariosQuery.data ?? [], [usuariosQuery.data]);
    const grupos = useMemo(() => gruposQuery.data ?? [], [gruposQuery.data]);
    const empresaLabelMap = useMemo(() => new Map(empresasQuery.options.map((option) => [option.value, option.label])), [empresasQuery.options]);
    const grupoById = useMemo(() => new Map(grupos.map((grupo) => [grupo.id, grupo])), [grupos]);
    const filteredUsuarios = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return usuarios;
        return usuarios.filter((usuario) => `${usuario.nome} ${usuario.email} ${usuario.login ?? ''} ${usuario.empresaId} ${usuario.filialId ?? ''}`.toLowerCase().includes(term));
    }, [search, usuarios]);
    const selectedUsuario = useMemo(() => usuarios.find((usuario) => usuario.id === selectedUsuarioId) ?? null, [selectedUsuarioId, usuarios]);
    const podeConsultarAcesso = hasPermission('SEGURANCA_PERMISSOES_CONSULTAR');
    const acessoQuery = usePermissoesEfetivasUsuario(
        selectedUsuarioId,
        { empresaId: selectedUsuario?.empresaId ?? null, filialId: selectedUsuario?.filialId ?? null },
        podeConsultarAcesso,
        (grupoAcessoId) => grupoById.get(grupoAcessoId)?.nome ?? 'Grupo vinculado'
    );
    const acessoEstado = {
        data: acessoQuery.data,
        isLoading: acessoQuery.isLoading || acessoQuery.isFetching,
        isError: acessoQuery.isError,
        permitido: podeConsultarAcesso,
        onRetry: () => { void acessoQuery.refetch(); }
    };
    const gruposVinculados = acessoQuery.data?.grupos ?? [];

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
                // Mantemos a seleção e devolvemos o usuário ao diálogo de gestão para que ele veja
                // o acesso efetivo recarregado, em vez de só receber um toast.
                setGerenciarVisible(true);
            },
            { success: { summary: 'Grupo vinculado', detail: 'O grupo de acesso foi vinculado ao usuário.' }, error: { summary: 'Erro ao vincular grupo', detail: 'Não foi possível vincular o grupo.' }, rethrow: true }
        );
    };

    const confirmReasonAction = async (motivo: string) => {
        if (!selectedUsuario || !reasonAction) return;
        const success =
            reasonAction === 'inativar'
                ? { summary: 'Usuário inativado', detail: 'O usuário foi inativado com motivo auditável.' }
                : { summary: 'Usuário reativado', detail: 'O usuário foi reativado com motivo auditável.' };
        await runWithToast(
            async () => {
                if (reasonAction === 'inativar') await inativarUsuario.mutateAsync({ id: selectedUsuario.id, motivo });
                if (reasonAction === 'reativar') await reativarUsuario.mutateAsync({ id: selectedUsuario.id, motivo });
                setReasonAction(null);
            },
            { success, error: { summary: 'Erro na operação', detail: 'Não foi possível concluir a operação.' } }
        );
    };

    const submitRemoverGrupo = async (values: { grupoAcessoId: string; motivo: string }) => {
        if (!selectedUsuario) return;
        await runWithToast(
            async () => {
                await removerGrupo.mutateAsync({ id: selectedUsuario.id, grupoAcessoId: values.grupoAcessoId, motivo: values.motivo });
                setRemoverVisible(false);
                setGerenciarVisible(true);
            },
            { success: { summary: 'Grupo removido', detail: 'O grupo foi removido do usuário.' }, error: { summary: 'Erro ao remover grupo', detail: 'Não foi possível remover o grupo.' }, rethrow: true }
        );
    };

    const abrirGerenciar = (usuario: UsuarioResponse) => { setSelectedUsuarioId(usuario.id); setGerenciarVisible(true); };
    const gerenciarAcoes = {
        onResetSenha: () => { setGerenciarVisible(false); setResetVisible(true); },
        onVincularGrupo: () => { setGerenciarVisible(false); setVincularVisible(true); },
        onRemoverGrupo: () => { setGerenciarVisible(false); setRemoverVisible(true); },
        onInativar: () => { setGerenciarVisible(false); setReasonAction('inativar'); },
        onReativar: () => { setGerenciarVisible(false); setReasonAction('reativar'); }
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText placeholder="Buscar usuário" value={search} onChange={(event) => setSearch(event.target.value)} /></span>
            <PermissionGuard permission="SEGURANCA_USUARIOS_GERENCIAR" mode="disable">
                {({ disabled }) => <Button label="Novo usuário" icon="pi pi-user-plus" onClick={() => setFormVisible(true)} disabled={disabled} />}
            </PermissionGuard>
        </div>
    );

    const reasonTitle = reasonAction === 'inativar' ? 'Inativar usuário' : 'Reativar usuário';

    return (
        <>
            <PageHeader title="Usuários" description="Gestão de usuários, status, senha e grupos de acesso usando os endpoints reais de Segurança." actions={headerActions} />

            <Card>
                {usuariosQuery.error ? <ApiErrorPanel error={mapApiError(usuariosQuery.error)} /> : null}
                {gruposQuery.error ? <ApiErrorPanel error={mapApiError(gruposQuery.error)} title="Não foi possível carregar grupos de acesso." /> : null}

                <DataTableServer<UsuarioResponse> value={filteredUsuarios} totalRecords={filteredUsuarios.length} loading={usuariosQuery.isFetching} first={0} rows={10} onPage={() => undefined} emptyMessage="Nenhum usuário encontrado.">
                    <Column field="nome" header="Nome" />
                    <Column field="email" header="E-mail" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" />
                    <Column header="Login" headerClassName="hidden xl:table-cell" bodyClassName="hidden xl:table-cell" body={(usuario: UsuarioResponse) => usuario.login ?? usuario.email} />
                    <Column
                        header="Empresa"
                        headerClassName="hidden lg:table-cell"
                        bodyClassName="hidden lg:table-cell"
                        body={(usuario: UsuarioResponse) => {
                            const label = empresaLabelMap.get(usuario.empresaId) ?? 'Empresa não carregada';
                            return <span title={label}>{empresaCurto(label)}</span>;
                        }}
                    />
                    <Column header="Ativo" body={(usuario: UsuarioResponse) => <Tag value={usuario.ativo ? 'Ativo' : 'Inativo'} severity={usuario.ativo ? 'success' : 'danger'} />} />
                    <Column header="Bloqueado" headerClassName="hidden lg:table-cell" bodyClassName="hidden lg:table-cell" body={(usuario: UsuarioResponse) => <Tag value={usuario.bloqueado ? 'Bloqueado' : 'Liberado'} severity={usuario.bloqueado ? 'danger' : 'success'} />} />
                    <Column header="Último login" headerClassName="hidden xl:table-cell" bodyClassName="hidden xl:table-cell" body={(usuario: UsuarioResponse) => formatDateTime(usuario.ultimoLoginEm)} />
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
                acesso={acessoEstado}
                onHide={() => { setGerenciarVisible(false); setSelectedUsuarioId(null); }}
                acoes={gerenciarAcoes}
            />
            <UsuarioFormDialog visible={formVisible} loading={criarUsuario.isPending} grupos={grupos} onHide={() => setFormVisible(false)} onSubmit={submitUsuario} />
            <ResetSenhaUsuarioDialog visible={resetVisible} loading={resetarSenha.isPending} onHide={() => setResetVisible(false)} onSubmit={submitResetSenha} />
            <VincularGrupoUsuarioDialog visible={vincularVisible} loading={vincularGrupo.isPending} grupos={grupos} onHide={() => setVincularVisible(false)} onSubmit={submitVincularGrupo} />
            <RemoverGrupoUsuarioDialog visible={removerVisible} loading={removerGrupo.isPending} grupos={gruposVinculados} onHide={() => setRemoverVisible(false)} onSubmit={submitRemoverGrupo} />
            <ReasonDialog visible={Boolean(reasonAction)} title={reasonTitle} loading={inativarUsuario.isPending || reativarUsuario.isPending} onHide={() => setReasonAction(null)} onConfirm={confirmReasonAction} />
        </>
    );
};
