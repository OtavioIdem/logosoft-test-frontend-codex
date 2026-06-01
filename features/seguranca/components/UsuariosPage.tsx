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
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { UsuarioFormDialog } from '@/features/seguranca/components/UsuarioFormDialog';
import { useCriarUsuarioSeguranca, useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { UsuarioFormValues, UsuarioResponse } from '@/features/seguranca/types/seguranca.types';
import { useAppToast } from '@/hooks/useAppToast';
import { useEmpresasOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { mapApiError } from '@/lib/http/apiError';

const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '-');

export const UsuariosPage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const usuariosQuery = useUsuariosSeguranca();
    const empresasQuery = useEmpresasOptions();
    const criarUsuario = useCriarUsuarioSeguranca();
    const [formVisible, setFormVisible] = useState(false);
    const [search, setSearch] = useState('');

    const usuarios = usuariosQuery.data ?? [];
    const empresaLabelMap = useMemo(() => new Map(empresasQuery.options.map((option) => [option.value, option.label])), [empresasQuery.options]);
    const filteredUsuarios = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return usuarios;
        }

        return usuarios.filter((usuario) => `${usuario.nome} ${usuario.email} ${usuario.empresaId} ${usuario.filialId ?? ''}`.toLowerCase().includes(term));
    }, [search, usuarios]);

    if (!hasPermission('SEGURANCA_USUARIOS_CONSULTAR')) {
        return <UnauthorizedState description="A rotina Usuários exige a permissão SEGURANCA_USUARIOS_CONSULTAR." />;
    }

    const submitUsuario = async (values: UsuarioFormValues) => {
        try {
            await criarUsuario.mutateAsync(values);
            toast.success('Usuário criado', 'O usuário foi criado com sucesso.');
            setFormVisible(false);
        } catch (error) {
            toast.error('Erro ao criar usuário', error instanceof Error ? error.message : 'Não foi possível criar o usuário.');
            throw error;
        }
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <span className="p-input-icon-left">
                <i className="pi pi-search" />
                <InputText placeholder="Buscar usuário" value={search} onChange={(event) => setSearch(event.target.value)} />
            </span>
            <PermissionGuard permission="SEGURANCA_USUARIOS_GERENCIAR" mode="disable">
                {({ disabled }) => <Button label="Novo usuário" icon="pi pi-user-plus" onClick={() => setFormVisible(true)} disabled={disabled} />}
            </PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Usuários" description="Gestão de usuários do ERP com integração real ao endpoint /api/seguranca/usuarios." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Esta versão implementa listagem e criação conforme contrato v9.8. Alteração, bloqueio, grupos e permissões ficam desabilitados até existirem endpoints oficiais no backend." />

            <Card>
                {usuariosQuery.error ? <ApiErrorPanel error={mapApiError(usuariosQuery.error)} /> : null}

                <DataTableServer<UsuarioResponse>
                    value={filteredUsuarios}
                    totalRecords={filteredUsuarios.length}
                    loading={usuariosQuery.isFetching}
                    first={0}
                    rows={10}
                    onPage={() => undefined}
                    emptyMessage="Nenhum usuário encontrado."
                >
                    <Column field="nome" header="Nome" />
                    <Column field="email" header="E-mail" />
                    <Column header="Empresa" body={(usuario: UsuarioResponse) => empresaLabelMap.get(usuario.empresaId) ?? 'Empresa não carregada'} />
                    <Column header="Filial" body={(usuario: UsuarioResponse) => (usuario.filialId ? 'Filial vinculada' : '-')} />
                    <Column header="Ativo" body={(usuario: UsuarioResponse) => <Tag value={usuario.ativo ? 'Ativo' : 'Inativo'} severity={usuario.ativo ? 'success' : 'danger'} />} />
                    <Column header="Bloqueado" body={(usuario: UsuarioResponse) => <Tag value={usuario.bloqueado ? 'Bloqueado' : 'Liberado'} severity={usuario.bloqueado ? 'danger' : 'success'} />} />
                    <Column header="Último login" body={(usuario: UsuarioResponse) => formatDateTime(usuario.ultimoLoginEm)} />
                </DataTableServer>

                {!usuariosQuery.isLoading && filteredUsuarios.length === 0 ? <EmptyState title="Nenhum usuário" description="Crie um usuário ou ajuste a busca." /> : null}
            </Card>

            <UsuarioFormDialog visible={formVisible} loading={criarUsuario.isPending} onHide={() => setFormVisible(false)} onSubmit={submitUsuario} />
        </>
    );
};
