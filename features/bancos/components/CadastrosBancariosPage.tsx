'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useBancos, useCadastroBancarioMutations, useCarteiras, useContasBancarias, useConvenios } from '@/features/bancos/hooks/useBancosResources';
import { BancoResponse, CarteiraCobrancaResponse, ContaBancariaResponse, ConvenioBancarioResponse } from '@/features/bancos/types/bancos.types';
import { BancoDialog, CarteiraDialog, ContaBancariaDialog, ConvenioDialog } from '@/features/bancos/components/BancosDialogs';
import { tipoCobrancaLabel } from '@/features/bancos/components/bancosLabels';

export const CadastrosBancariosPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [dialog, setDialog] = useState<'banco' | 'conta' | 'convenio' | 'carteira' | null>(null);

    const podeConsultar = hasPermission('BANCOS_CONSULTAR');
    const bancosQuery = useBancos(podeConsultar);
    const contasQuery = useContasBancarias({}, podeConsultar);
    const conveniosQuery = useConvenios(podeConsultar);
    const carteirasQuery = useCarteiras(podeConsultar);
    const { bancoMutation, contaMutation, convenioMutation, carteiraMutation } = useCadastroBancarioMutations();

    const bancoLabel = useMemo(() => {
        const map = new Map((bancosQuery.data ?? []).map((banco) => [banco.id, `${banco.codigo} - ${banco.nome}`]));
        return (id: string) => map.get(id) ?? id;
    }, [bancosQuery.data]);
    const contaLabel = useMemo(() => {
        const map = new Map((contasQuery.data ?? []).map((conta) => [conta.id, `Ag ${conta.agencia} / Cc ${conta.conta}`]));
        return (id: string) => map.get(id) ?? id;
    }, [contasQuery.data]);
    const convenioLabel = useMemo(() => {
        const map = new Map((conveniosQuery.data ?? []).map((convenio) => [convenio.id, convenio.numeroConvenio]));
        return (id: string) => map.get(id) ?? id;
    }, [conveniosQuery.data]);

    if (!podeConsultar) {
        return <UnauthorizedState description="O módulo Bancos exige a permissão BANCOS_CONSULTAR." />;
    }

    const close = () => setDialog(null);
    const run = <T,>(action: () => Promise<T>, success: string, error: string) => runWithToast(async () => { await action(); close(); }, { success: { summary: success }, error: { summary: error }, rethrow: true });

    const novoButton = (label: string, kind: 'banco' | 'conta' | 'convenio' | 'carteira') => (
        <PermissionGuard permission="BANCOS_GERENCIAR" mode="disable">{({ disabled }) => <Button label={label} icon="pi pi-plus" size="small" className="mb-3" disabled={disabled} onClick={() => setDialog(kind)} />}</PermissionGuard>
    );

    return (
        <>
            <PageHeader title="Cadastros bancários" description="Hierarquia: banco → conta bancária → convênio → carteira de cobrança." />
            <TabView>
                <TabPanel header="Bancos">
                    {novoButton('Novo banco', 'banco')}
                    {bancosQuery.error ? <ApiErrorPanel error={mapApiError(bancosQuery.error)} /> : null}
                    <DataTable value={bancosQuery.data ?? []} dataKey="id" loading={bancosQuery.isFetching} emptyMessage="Nenhum banco." responsiveLayout="scroll" stripedRows size="small">
                        <Column field="codigo" header="Código" />
                        <Column field="nome" header="Nome" />
                    </DataTable>
                </TabPanel>
                <TabPanel header="Contas bancárias">
                    {novoButton('Nova conta', 'conta')}
                    {contasQuery.error ? <ApiErrorPanel error={mapApiError(contasQuery.error)} /> : null}
                    <DataTable value={contasQuery.data ?? []} dataKey="id" loading={contasQuery.isFetching} emptyMessage="Nenhuma conta." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Banco" body={(row: ContaBancariaResponse) => bancoLabel(row.bancoId)} />
                        <Column header="Agência" body={(row: ContaBancariaResponse) => `${row.agencia}${row.agenciaDv ? `-${row.agenciaDv}` : ''}`} />
                        <Column header="Conta" body={(row: ContaBancariaResponse) => `${row.conta}${row.contaDv ? `-${row.contaDv}` : ''}`} />
                    </DataTable>
                </TabPanel>
                <TabPanel header="Convênios">
                    {novoButton('Novo convênio', 'convenio')}
                    {conveniosQuery.error ? <ApiErrorPanel error={mapApiError(conveniosQuery.error)} /> : null}
                    <DataTable value={conveniosQuery.data ?? []} dataKey="id" loading={conveniosQuery.isFetching} emptyMessage="Nenhum convênio." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Conta" body={(row: ConvenioBancarioResponse) => contaLabel(row.contaBancariaId)} />
                        <Column field="numeroConvenio" header="Número" />
                        <Column field="cedente" header="Cedente" body={(row: ConvenioBancarioResponse) => row.cedente || '—'} />
                    </DataTable>
                </TabPanel>
                <TabPanel header="Carteiras">
                    {novoButton('Nova carteira', 'carteira')}
                    {carteirasQuery.error ? <ApiErrorPanel error={mapApiError(carteirasQuery.error)} /> : null}
                    <DataTable value={carteirasQuery.data ?? []} dataKey="id" loading={carteirasQuery.isFetching} emptyMessage="Nenhuma carteira." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Convênio" body={(row: CarteiraCobrancaResponse) => convenioLabel(row.convenioBancarioId)} />
                        <Column field="codigo" header="Código" />
                        <Column header="Tipo de cobrança" body={(row: CarteiraCobrancaResponse) => <Tag value={tipoCobrancaLabel(Number(row.tipoCobranca))} severity="info" />} />
                    </DataTable>
                </TabPanel>
            </TabView>

            <BancoDialog visible={dialog === 'banco'} loading={bancoMutation.isPending} onHide={close} onSubmit={(values) => run(() => bancoMutation.mutateAsync(values), 'Banco criado', 'Erro ao criar banco')} />
            <ContaBancariaDialog visible={dialog === 'conta'} loading={contaMutation.isPending} onHide={close} onSubmit={(values) => run(() => contaMutation.mutateAsync(values), 'Conta criada', 'Erro ao criar conta')} />
            <ConvenioDialog visible={dialog === 'convenio'} loading={convenioMutation.isPending} onHide={close} onSubmit={(values) => run(() => convenioMutation.mutateAsync(values), 'Convênio criado', 'Erro ao criar convênio')} />
            <CarteiraDialog visible={dialog === 'carteira'} loading={carteiraMutation.isPending} onHide={close} onSubmit={(values) => run(() => carteiraMutation.mutateAsync(values), 'Carteira criada', 'Erro ao criar carteira')} />
        </>
    );
};
