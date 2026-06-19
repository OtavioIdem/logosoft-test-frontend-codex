'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTableActions } from '@/components/data/DataTableActions';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { GrupoAcessoFormDialog } from '@/features/seguranca/components/GrupoAcessoFormDialog';
import { useAtualizarGrupoAcessoSeguranca, useCriarGrupoAcessoSeguranca, useGruposAcessoSeguranca, useInativarGrupoAcessoSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { GrupoAcessoFormValues, GrupoAcessoResponse } from '@/features/seguranca/types/seguranca.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';

export const GruposAcessoPage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const gruposQuery = useGruposAcessoSeguranca();
    const criarGrupo = useCriarGrupoAcessoSeguranca();
    const atualizarGrupo = useAtualizarGrupoAcessoSeguranca();
    const inativarGrupo = useInativarGrupoAcessoSeguranca();
    const [search, setSearch] = useState('');
    const [formVisible, setFormVisible] = useState(false);
    const [reasonVisible, setReasonVisible] = useState(false);
    const [selectedGrupo, setSelectedGrupo] = useState<GrupoAcessoResponse | null>(null);

    const grupos = gruposQuery.data ?? [];
    const filteredGrupos = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return grupos;
        return grupos.filter((grupo) => `${grupo.nome} ${grupo.descricao ?? ''} ${(grupo.permissoes ?? []).join(' ')}`.toLowerCase().includes(term));
    }, [grupos, search]);

    if (!hasPermission('SEGURANCA_PERMISSOES_GERENCIAR')) {
        return <UnauthorizedState description="A rotina Grupos de acesso exige a permissão SEGURANCA_PERMISSOES_GERENCIAR." />;
    }

    const submitGrupo = async (values: GrupoAcessoFormValues) => {
        try {
            if (selectedGrupo) {
                await atualizarGrupo.mutateAsync({ id: selectedGrupo.id, values });
                toast.success('Grupo atualizado', 'O grupo de acesso foi atualizado com sucesso.');
            } else {
                await criarGrupo.mutateAsync(values);
                toast.success('Grupo criado', 'O grupo de acesso foi criado com sucesso.');
            }
            setFormVisible(false);
            setSelectedGrupo(null);
        } catch (error) {
            toast.error('Erro ao salvar grupo', error instanceof Error ? error.message : 'Não foi possível salvar o grupo.');
            throw error;
        }
    };

    const confirmInativar = async (motivo: string) => {
        if (!selectedGrupo) return;
        try {
            await inativarGrupo.mutateAsync({ id: selectedGrupo.id, motivo });
            toast.success('Grupo inativado', 'O grupo de acesso foi inativado com motivo auditável.');
            setReasonVisible(false);
            setSelectedGrupo(null);
        } catch (error) {
            toast.error('Erro ao inativar grupo', error instanceof Error ? error.message : 'Não foi possível inativar o grupo.');
        }
    };

    const headerActions = (
        <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
            <span className="p-input-icon-left"><i className="pi pi-search" /><InputText placeholder="Buscar grupo" value={search} onChange={(event) => setSearch(event.target.value)} /></span>
            <PermissionGuard permission="SEGURANCA_PERMISSOES_GERENCIAR" mode="disable">
                {({ disabled }) => <Button label="Novo grupo" icon="pi pi-shield" onClick={() => { setSelectedGrupo(null); setFormVisible(true); }} disabled={disabled} />}
            </PermissionGuard>
        </div>
    );

    return (
        <>
            <PageHeader title="Grupos de acesso" description="RBAC operacional com grupos, permissões granulares e manutenção auditável." actions={headerActions} />
            <Message className="w-full mb-3" severity="info" text="Permissões devem continuar sendo validadas pelo backend. O frontend apenas administra contratos e melhora a experiência operacional." />

            <Card>
                {gruposQuery.error ? <ApiErrorPanel error={mapApiError(gruposQuery.error)} /> : null}
                <DataTableServer<GrupoAcessoResponse> value={filteredGrupos} totalRecords={filteredGrupos.length} loading={gruposQuery.isFetching} first={0} rows={10} onPage={() => undefined} emptyMessage="Nenhum grupo encontrado.">
                    <Column field="nome" header="Grupo" />
                    <Column field="descricao" header="Descrição" />
                    <Column header="Permissões" body={(grupo: GrupoAcessoResponse) => <Tag value={`${grupo.permissoes?.length ?? 0} permissão(ões)`} severity={(grupo.permissoes?.length ?? 0) > 0 ? 'info' : 'warning'} />} />
                    <Column header="Status" body={(grupo: GrupoAcessoResponse) => <Tag value={grupo.ativo ? 'Ativo' : 'Inativo'} severity={grupo.ativo ? 'success' : 'danger'} />} />
                    <Column
                        header="Ações"
                        align="right"
                        body={(grupo: GrupoAcessoResponse) => (
                            <DataTableActions
                                actions={[
                                    { key: 'editar', label: 'Editar', icon: 'pi pi-pencil', permission: 'SEGURANCA_PERMISSOES_GERENCIAR', onClick: () => { setSelectedGrupo(grupo); setFormVisible(true); } },
                                    { key: 'inativar', label: 'Inativar', icon: 'pi pi-ban', permission: 'SEGURANCA_PERMISSOES_GERENCIAR', severity: 'danger', disabled: !grupo.ativo, onClick: () => { setSelectedGrupo(grupo); setReasonVisible(true); } }
                                ]}
                            />
                        )}
                    />
                </DataTableServer>
                {!gruposQuery.isLoading && filteredGrupos.length === 0 ? <EmptyState title="Nenhum grupo" description="Crie um grupo ou ajuste a busca." /> : null}
            </Card>

            <GrupoAcessoFormDialog visible={formVisible} loading={criarGrupo.isPending || atualizarGrupo.isPending} grupo={selectedGrupo} onHide={() => { setFormVisible(false); setSelectedGrupo(null); }} onSubmit={submitGrupo} />
            <ReasonDialog visible={reasonVisible} title="Inativar grupo de acesso" loading={inativarGrupo.isPending} onHide={() => setReasonVisible(false)} onConfirm={confirmInativar} />
        </>
    );
};
