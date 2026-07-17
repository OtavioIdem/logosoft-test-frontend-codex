'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { AnexosPanel } from '@/features/anexos/components/AnexosPanel';
import { useOrdemServico, useOrdensServicoMutations } from '@/features/servicos/hooks/useServicosResources';
import { ItemOrdemServicoResponse } from '@/features/servicos/types/servicos.types';
import { EncerrarDialog, FaturarDialog, ItemDialog, PlanejarDialog, TriarDialog } from '@/features/servicos/components/OrdemServicoDialogs';
import {
    podeAdicionarItem,
    podeCancelar,
    podeEncerrar,
    podeFaturar,
    podeIniciar,
    podePlanejar,
    podeTriar,
    prioridadeLabel,
    prioridadeSeverity,
    statusOrdemServicoLabel,
    statusOrdemServicoSeverity,
    tipoItemLabel
} from '@/features/servicos/components/servicosLabels';

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

type DialogKind = 'triar' | 'planejar' | 'item' | 'encerrar' | 'faturar' | 'cancelar' | null;

export const OrdemServicoDetalhePage = ({ ordemId }: { ordemId: string }) => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [dialog, setDialog] = useState<DialogKind>(null);

    const ordemQuery = useOrdemServico(ordemId);
    const os = ordemQuery.data ?? null;
    const { triarMutation, planejarMutation, iniciarMutation, itemMutation, encerrarMutation, faturarMutation, cancelarMutation } = useOrdensServicoMutations();

    const scope = { empresaId: os?.empresaId ?? null, filialId: os?.filialId ?? null };
    const usuariosQuery = useUsuariosSeguranca({ empresaId: os?.empresaId ?? undefined, filialId: os?.filialId ?? undefined, ativo: true });
    const produtosQuery = useProdutos(scope);
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);

    if (!hasPermission('SERVICOS_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Serviços exige a permissão SERVICOS_CONSULTAR." />;
    }

    const close = () => setDialog(null);

    const run = <T,>(action: () => Promise<T>, success: string, error: string) =>
        runWithToast(
            async () => {
                await action();
                close();
            },
            { success: { summary: success }, error: { summary: error }, rethrow: true }
        );

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/servicos/ordens')} />
            {os && podeTriar(os) ? <PermissionGuard permission="SERVICOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Triar" icon="pi pi-search" disabled={disabled} onClick={() => setDialog('triar')} />}</PermissionGuard> : null}
            {os && podePlanejar(os) ? <PermissionGuard permission="SERVICOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Planejar" icon="pi pi-list" disabled={disabled} onClick={() => setDialog('planejar')} />}</PermissionGuard> : null}
            {os && podeIniciar(os) ? <PermissionGuard permission="SERVICOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Iniciar execução" icon="pi pi-play" disabled={disabled} loading={iniciarMutation.isPending} onClick={() => run(() => iniciarMutation.mutateAsync(ordemId), 'Execução iniciada', 'Erro ao iniciar execução')} />}</PermissionGuard> : null}
            {os && podeAdicionarItem(os) ? <PermissionGuard permission="SERVICOS_APONTAR" mode="disable">{({ disabled }) => <Button label="Adicionar item" icon="pi pi-plus" severity="secondary" disabled={disabled} onClick={() => setDialog('item')} />}</PermissionGuard> : null}
            {os && podeEncerrar(os) ? <PermissionGuard permission="SERVICOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Encerrar" icon="pi pi-check" severity="success" disabled={disabled} onClick={() => setDialog('encerrar')} />}</PermissionGuard> : null}
            {os && podeFaturar(os) ? <PermissionGuard permission="SERVICOS_FATURAR" mode="disable">{({ disabled }) => <Button label="Faturar" icon="pi pi-dollar" severity="warning" disabled={disabled} onClick={() => setDialog('faturar')} />}</PermissionGuard> : null}
            {os && podeCancelar(os) ? <PermissionGuard permission="SERVICOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Cancelar" icon="pi pi-ban" severity="danger" outlined disabled={disabled} onClick={() => setDialog('cancelar')} />}</PermissionGuard> : null}
        </div>
    );

    return (
        <>
            <PageHeader title={os ? `OS ${os.numero}` : 'Ordem de serviço'} description="Gerencie o ciclo da OS: triagem, planejamento, execução, itens, laudo e faturamento." actions={headerActions} />

            {ordemQuery.isLoading ? <LoadingState variant="detail" /> : null}
            {ordemQuery.error ? <ApiErrorPanel error={mapApiError(ordemQuery.error)} /> : null}

            {os ? (
                <>
                    <Card className="mb-3">
                        <div className="grid">
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Status</span><Tag value={statusOrdemServicoLabel(Number(os.statusOS))} severity={statusOrdemServicoSeverity(Number(os.statusOS)) ?? undefined} /></div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Prioridade</span><Tag value={prioridadeLabel(Number(os.prioridade))} severity={prioridadeSeverity(Number(os.prioridade)) ?? undefined} /></div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Abertura</span>{formatDate(os.dataAbertura)}</div>
                            <div className="col-12 md:col-3"><span className="block text-color-secondary text-sm">Previsão</span>{formatDate(os.dataPrevisao)}</div>
                            <div className="col-12"><span className="block text-color-secondary text-sm">Descrição</span>{os.descricao}</div>
                            {os.diagnostico ? <div className="col-12 md:col-6"><span className="block text-color-secondary text-sm">Diagnóstico</span>{os.diagnostico}</div> : null}
                            {os.planoExecucao ? <div className="col-12 md:col-6"><span className="block text-color-secondary text-sm">Plano de execução</span>{os.planoExecucao}</div> : null}
                            {os.laudoTecnico ? <div className="col-12"><span className="block text-color-secondary text-sm">Laudo técnico</span>{os.laudoTecnico}</div> : null}
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Mão de obra</span>{formatMoney(os.valorMaoDeObra)}</div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Material</span>{formatMoney(os.valorMaterial)}</div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Total</span><strong>{formatMoney(os.valorTotal)}</strong></div>
                        </div>
                        {os.contaReceberId ? <Message className="w-full mt-3" severity="success" text={`Faturada — conta a receber gerada (${os.contaReceberId}).`} /> : null}
                    </Card>

                    <Card title="Itens" className="mb-3">
                        <DataTable value={os.itens} dataKey="id" emptyMessage="Nenhum item lançado." responsiveLayout="scroll" stripedRows size="small">
                            <Column field="sequencia" header="#" />
                            <Column header="Tipo" body={(item: ItemOrdemServicoResponse) => tipoItemLabel(Number(item.tipo))} />
                            <Column field="descricao" header="Descrição" />
                            <Column header="Qtd" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ItemOrdemServicoResponse) => item.quantidade} />
                            <Column header="Valor unit." headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ItemOrdemServicoResponse) => formatMoney(item.valorUnitario)} />
                            <Column header="Total" body={(item: ItemOrdemServicoResponse) => formatMoney(item.valorTotal)} />
                            <Column header="Estoque" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(item: ItemOrdemServicoResponse) => (item.estoqueBaixado ? <Tag value="Baixado" severity="info" /> : '—')} />
                        </DataTable>
                    </Card>

                    <AnexosPanel modulo="Servicos" entidade="OrdemServico" entidadeId={os.id} empresaId={os.empresaId} filialId={os.filialId} />

                    <TriarDialog visible={dialog === 'triar'} loading={triarMutation.isPending} usuarioOptions={usuarioOptions} onHide={close} onSubmit={(values) => run(() => triarMutation.mutateAsync({ id: ordemId, values }), 'OS triada', 'Erro ao triar')} />
                    <PlanejarDialog visible={dialog === 'planejar'} loading={planejarMutation.isPending} onHide={close} onSubmit={(values) => run(() => planejarMutation.mutateAsync({ id: ordemId, values }), 'OS planejada', 'Erro ao planejar')} />
                    <ItemDialog visible={dialog === 'item'} loading={itemMutation.isPending} produtoOptions={produtoOptions} onHide={close} onSubmit={(values) => run(() => itemMutation.mutateAsync({ id: ordemId, values }), 'Item adicionado', 'Erro ao adicionar item')} />
                    <EncerrarDialog visible={dialog === 'encerrar'} loading={encerrarMutation.isPending} onHide={close} onSubmit={(values) => run(() => encerrarMutation.mutateAsync({ id: ordemId, values }), 'OS encerrada', 'Erro ao encerrar')} />
                    <FaturarDialog visible={dialog === 'faturar'} loading={faturarMutation.isPending} onHide={close} onSubmit={(values) => run(() => faturarMutation.mutateAsync({ id: ordemId, values }), 'OS faturada', 'Erro ao faturar')} />
                    <ReasonDialog visible={dialog === 'cancelar'} title="Cancelar ordem de serviço" confirmLabel="Cancelar OS" loading={cancelarMutation.isPending} onHide={close} onConfirm={(motivo) => run(() => cancelarMutation.mutateAsync({ id: ordemId, motivo }), 'OS cancelada', 'Erro ao cancelar')} />
                </>
            ) : null}
        </>
    );
};
