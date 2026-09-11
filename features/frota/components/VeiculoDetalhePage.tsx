'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
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
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { AnexosPanel } from '@/features/anexos/components/AnexosPanel';
import {
    useAbastecimentoMutation,
    useAbastecimentos,
    useDespesaMutation,
    useDespesas,
    useDocumentoMutation,
    useDocumentos,
    useManutencaoMutations,
    useManutencoes,
    useMotoristas,
    useVeiculo,
    useVeiculoMutations
} from '@/features/frota/hooks/useFrotaResources';
import { AbastecimentoResponse, DespesaVeiculoResponse, DocumentoVeiculoResponse, ManutencaoResponse, StatusVeiculo } from '@/features/frota/types/frota.types';
import { AbastecimentoDialog, DespesaDialog, DocumentoDialog, ManutencaoDialog } from '@/features/frota/components/VeiculoSubDialogs';
import {
    combustivelLabel,
    manutencaoPodeCancelar,
    manutencaoPodeConcluir,
    statusManutencaoLabel,
    statusManutencaoSeverity,
    statusVeiculoLabel,
    statusVeiculoOptions,
    statusVeiculoSeverity,
    tipoDespesaLabel,
    tipoDocumentoLabel,
    tipoManutencaoLabel,
    tipoVeiculoLabel,
    veiculoPodeStatus
} from '@/features/frota/components/frotaLabels';
import { formatMoney } from '@/lib/formatters/money';

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');
const formatOdometro = (value?: number | null) => (value == null ? '—' : value.toLocaleString('pt-BR'));

type DialogKind = 'abastecimento' | 'manutencao' | 'despesa' | 'documento' | 'status' | 'cancelarManutencao' | null;

export const VeiculoDetalhePage = ({ veiculoId }: { veiculoId: string }) => {
    const router = useRouter();
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [dialog, setDialog] = useState<DialogKind>(null);
    const [novoStatus, setNovoStatus] = useState<number>(StatusVeiculo.Ativo);
    const [manutencaoAlvo, setManutencaoAlvo] = useState<string | null>(null);

    const veiculoQuery = useVeiculo(veiculoId);
    const veiculo = veiculoQuery.data ?? null;
    const scope = { veiculoId, empresaId: veiculo?.empresaId ?? null, filialId: veiculo?.filialId ?? null };
    const enabled = Boolean(veiculo);

    const abastecimentosQuery = useAbastecimentos(scope, enabled);
    const manutencoesQuery = useManutencoes(scope, enabled);
    const despesasQuery = useDespesas(scope, enabled);
    const documentosQuery = useDocumentos(scope, enabled);
    const motoristasQuery = useMotoristas({ empresaId: veiculo?.empresaId ?? null, filialId: veiculo?.filialId ?? null }, enabled);
    const fornecedoresQuery = useFornecedores({ empresaId: veiculo?.empresaId ?? null, filialId: veiculo?.filialId ?? null });

    const motoristaOptions = useMemo(() => (motoristasQuery.data ?? []).map((motorista) => ({ label: motorista.nome, value: motorista.id })), [motoristasQuery.data]);
    const fornecedorOptions = useMemo(() => (fornecedoresQuery.data ?? []).map((fornecedor) => ({ label: fornecedor.codigo, value: fornecedor.id })), [fornecedoresQuery.data]);

    const { statusMutation } = useVeiculoMutations();
    const abastecimentoMutation = useAbastecimentoMutation();
    const { registrarMutation: manutencaoMutation, concluirMutation, cancelarMutation } = useManutencaoMutations();
    const despesaMutation = useDespesaMutation();
    const documentoMutation = useDocumentoMutation();

    if (!hasPermission('FROTA_CONSULTAR')) {
        return <UnauthorizedState description="A rotina de Frota exige a permissão FROTA_CONSULTAR." />;
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

    const abrirStatus = () => {
        setNovoStatus(veiculo ? Number(veiculo.status) : StatusVeiculo.Ativo);
        setDialog('status');
    };
    const abrirCancelarManutencao = (id: string) => {
        setManutencaoAlvo(id);
        setDialog('cancelarManutencao');
    };

    const headerActions = (
        <div className="flex gap-2 flex-wrap justify-content-end">
            <Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.push('/frota/veiculos')} />
            {veiculo && veiculoPodeStatus(Number(veiculo.status)) ? <PermissionGuard permission="FROTA_GERENCIAR" mode="disable">{({ disabled }) => <Button label="Alterar status" icon="pi pi-sync" disabled={disabled} onClick={abrirStatus} />}</PermissionGuard> : null}
        </div>
    );

    const registrarAcao = (
        <PermissionGuard permission="FROTA_GERENCIAR" mode="disable">
            {({ disabled }) => (
                <div className="flex gap-2 flex-wrap mb-3">
                    <Button label="Abastecimento" icon="pi pi-bolt" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('abastecimento')} />
                    <Button label="Manutenção" icon="pi pi-wrench" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('manutencao')} />
                    <Button label="Despesa" icon="pi pi-money-bill" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('despesa')} />
                    <Button label="Documento" icon="pi pi-id-card" size="small" severity="secondary" disabled={disabled} onClick={() => setDialog('documento')} />
                </div>
            )}
        </PermissionGuard>
    );

    return (
        <>
            <PageHeader title={veiculo ? `${veiculo.placa} — ${veiculo.modelo}` : 'Veículo'} description="Ciclo do veículo: abastecimentos, manutenções, despesas e documentos." actions={headerActions} />

            {veiculoQuery.isLoading ? <LoadingState variant="detail" /> : null}
            {veiculoQuery.error ? <ApiErrorPanel error={mapApiError(veiculoQuery.error)} /> : null}

            {veiculo ? (
                <>
                    <Card className="mb-3">
                        <div className="grid">
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Status</span><Tag value={statusVeiculoLabel(Number(veiculo.status))} severity={statusVeiculoSeverity(Number(veiculo.status)) ?? undefined} /></div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Tipo</span>{tipoVeiculoLabel(Number(veiculo.tipo))}</div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Combustível</span>{combustivelLabel(Number(veiculo.combustivel))}</div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Odômetro atual</span><strong>{formatOdometro(veiculo.odometroAtual)}</strong></div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Marca</span>{veiculo.marca || '—'}</div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Ano</span>{veiculo.ano ?? '—'}</div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Renavam</span>{veiculo.renavam || '—'}</div>
                            <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Odômetro inicial</span>{formatOdometro(veiculo.odometroInicial)}</div>
                        </div>
                    </Card>

                    {registrarAcao}

                    <Card className="mb-3">
                        <TabView>
                            <TabPanel header="Abastecimentos">
                                {abastecimentosQuery.error ? <ApiErrorPanel error={mapApiError(abastecimentosQuery.error)} /> : null}
                                <DataTable value={abastecimentosQuery.data ?? []} dataKey="id" loading={abastecimentosQuery.isFetching} emptyMessage="Nenhum abastecimento." responsiveLayout="scroll" stripedRows size="small">
                                    <Column header="Data" body={(row: AbastecimentoResponse) => formatDate(row.data)} />
                                    <Column header="Odômetro" body={(row: AbastecimentoResponse) => formatOdometro(row.odometro)} />
                                    <Column header="Litros" body={(row: AbastecimentoResponse) => row.litros.toLocaleString('pt-BR')} />
                                    <Column header="Valor/L" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: AbastecimentoResponse) => formatMoney(row.valorLitro)} />
                                    <Column header="Total" body={(row: AbastecimentoResponse) => formatMoney(row.valorTotal)} />
                                    <Column header="Tanque cheio" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: AbastecimentoResponse) => (row.tanqueCheio ? 'Sim' : 'Não')} />
                                </DataTable>
                            </TabPanel>
                            <TabPanel header="Manutenções">
                                {manutencoesQuery.error ? <ApiErrorPanel error={mapApiError(manutencoesQuery.error)} /> : null}
                                <DataTable value={manutencoesQuery.data ?? []} dataKey="id" loading={manutencoesQuery.isFetching} emptyMessage="Nenhuma manutenção." responsiveLayout="scroll" stripedRows size="small">
                                    <Column header="Data" body={(row: ManutencaoResponse) => formatDate(row.data)} />
                                    <Column header="Tipo" body={(row: ManutencaoResponse) => tipoManutencaoLabel(Number(row.tipo))} />
                                    <Column field="descricao" header="Descrição" />
                                    <Column header="Valor" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: ManutencaoResponse) => formatMoney(row.valor)} />
                                    <Column header="Status" body={(row: ManutencaoResponse) => <Tag value={statusManutencaoLabel(Number(row.status))} severity={statusManutencaoSeverity(Number(row.status)) ?? undefined} />} />
                                    <Column header="Ações" alignHeader="right" body={(row: ManutencaoResponse) => (
                                        <div className="flex gap-1 justify-content-end">
                                            {manutencaoPodeConcluir(Number(row.status)) ? <PermissionGuard permission="FROTA_GERENCIAR" mode="disable">{({ disabled }) => <Button icon="pi pi-check" label="Concluir" size="small" text disabled={disabled} onClick={() => run(() => concluirMutation.mutateAsync(row.id), 'Manutenção concluída', 'Erro ao concluir manutenção')} />}</PermissionGuard> : null}
                                            {manutencaoPodeCancelar(Number(row.status)) ? <PermissionGuard permission="FROTA_GERENCIAR" mode="disable">{({ disabled }) => <Button icon="pi pi-ban" label="Cancelar" size="small" text severity="danger" disabled={disabled} onClick={() => abrirCancelarManutencao(row.id)} />}</PermissionGuard> : null}
                                        </div>
                                    )} />
                                </DataTable>
                            </TabPanel>
                            <TabPanel header="Despesas">
                                {despesasQuery.error ? <ApiErrorPanel error={mapApiError(despesasQuery.error)} /> : null}
                                <DataTable value={despesasQuery.data ?? []} dataKey="id" loading={despesasQuery.isFetching} emptyMessage="Nenhuma despesa." responsiveLayout="scroll" stripedRows size="small">
                                    <Column header="Data" body={(row: DespesaVeiculoResponse) => formatDate(row.data)} />
                                    <Column header="Tipo" body={(row: DespesaVeiculoResponse) => tipoDespesaLabel(Number(row.tipo))} />
                                    <Column field="descricao" header="Descrição" />
                                    <Column header="Valor" body={(row: DespesaVeiculoResponse) => formatMoney(row.valor)} />
                                    <Column header="Conta a pagar" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: DespesaVeiculoResponse) => (row.contaPagarId ? <Tag value="Gerada" severity="info" /> : '—')} />
                                </DataTable>
                            </TabPanel>
                            <TabPanel header="Documentos">
                                {documentosQuery.error ? <ApiErrorPanel error={mapApiError(documentosQuery.error)} /> : null}
                                <DataTable value={documentosQuery.data ?? []} dataKey="id" loading={documentosQuery.isFetching} emptyMessage="Nenhum documento." responsiveLayout="scroll" stripedRows size="small">
                                    <Column header="Tipo" body={(row: DocumentoVeiculoResponse) => tipoDocumentoLabel(Number(row.tipo))} />
                                    <Column field="numero" header="Número" body={(row: DocumentoVeiculoResponse) => row.numero || '—'} />
                                    <Column header="Emissão" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: DocumentoVeiculoResponse) => formatDate(row.dataEmissao)} />
                                    <Column header="Validade" body={(row: DocumentoVeiculoResponse) => (row.vencido ? <Tag value={`${formatDate(row.dataValidade)} · vencido`} severity="danger" /> : formatDate(row.dataValidade))} />
                                </DataTable>
                            </TabPanel>
                        </TabView>
                    </Card>

                    <AnexosPanel modulo="Frota" entidade="Veiculo" entidadeId={veiculo.id} empresaId={veiculo.empresaId} filialId={veiculo.filialId} />

                    <AbastecimentoDialog visible={dialog === 'abastecimento'} loading={abastecimentoMutation.isPending} veiculoId={veiculoId} motoristaOptions={motoristaOptions} combustivelPadrao={Number(veiculo.combustivel)} onHide={close} onSubmit={(values) => run(() => abastecimentoMutation.mutateAsync(values), 'Abastecimento registrado', 'Erro ao registrar abastecimento')} />
                    <ManutencaoDialog visible={dialog === 'manutencao'} loading={manutencaoMutation.isPending} veiculoId={veiculoId} fornecedorOptions={fornecedorOptions} fornecedorLoading={fornecedoresQuery.isFetching} onHide={close} onSubmit={(values) => run(() => manutencaoMutation.mutateAsync(values), 'Manutenção registrada', 'Erro ao registrar manutenção')} />
                    <DespesaDialog visible={dialog === 'despesa'} loading={despesaMutation.isPending} veiculoId={veiculoId} fornecedorOptions={fornecedorOptions} fornecedorLoading={fornecedoresQuery.isFetching} onHide={close} onSubmit={(values) => run(() => despesaMutation.mutateAsync(values), 'Despesa registrada', 'Erro ao registrar despesa')} />
                    <DocumentoDialog visible={dialog === 'documento'} loading={documentoMutation.isPending} veiculoId={veiculoId} onHide={close} onSubmit={(values) => run(() => documentoMutation.mutateAsync(values), 'Documento registrado', 'Erro ao registrar documento')} />
                    <ReasonDialog visible={dialog === 'cancelarManutencao'} title="Cancelar manutenção" confirmLabel="Cancelar manutenção" loading={cancelarMutation.isPending} onHide={close} onConfirm={(motivo) => manutencaoAlvo && run(() => cancelarMutation.mutateAsync({ id: manutencaoAlvo, motivo }), 'Manutenção cancelada', 'Erro ao cancelar manutenção')} />

                    <Dialog header="Alterar status do veículo" visible={dialog === 'status'} modal style={{ width: 'min(28rem, 96vw)' }} onHide={close} footer={
                        <div className="flex justify-content-end gap-2">
                            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={close} disabled={statusMutation.isPending} />
                            <Button type="button" label="Aplicar" icon="pi pi-check" loading={statusMutation.isPending} onClick={() => run(() => statusMutation.mutateAsync({ id: veiculoId, status: novoStatus }), 'Status atualizado', 'Erro ao alterar status')} />
                        </div>
                    }>
                        <label htmlFor="veicNovoStatus" className="block font-medium mb-2">Novo status</label>
                        <Dropdown inputId="veicNovoStatus" className="w-full" value={novoStatus} options={statusVeiculoOptions} onChange={(event) => setNovoStatus(event.value)} />
                        <Message className="w-full mt-3" severity="info" text="A troca de status é auditada. Em manutenção bloqueia novas viagens." />
                    </Dialog>
                </>
            ) : null}
        </>
    );
};
