'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useCarteiras, useCnabMutations, useContasBancarias } from '@/features/bancos/hooks/useBancosResources';
import { ImportarRetornoFormValues, RemessaCnabResponse, RetornoCnabResponse } from '@/features/bancos/types/bancos.types';
import { ImportarRetornoDialog } from '@/features/bancos/components/BancosOperacoesDialogs';
import { tipoCobrancaLabel } from '@/features/bancos/components/bancosLabels';

export const CnabPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [carteiraId, setCarteiraId] = useState<string | null>(null);
    const [importarVisible, setImportarVisible] = useState(false);
    const [remessa, setRemessa] = useState<RemessaCnabResponse | null>(null);
    const [retorno, setRetorno] = useState<RetornoCnabResponse | null>(null);

    const podeConsultar = hasPermission('BANCOS_CONSULTAR');
    const carteirasQuery = useCarteiras(podeConsultar);
    const contasQuery = useContasBancarias({}, podeConsultar);
    const { remessaMutation, retornoMutation } = useCnabMutations();

    const carteiraOptions = useMemo(() => (carteirasQuery.data ?? []).map((carteira) => ({ label: `${carteira.codigo} — ${tipoCobrancaLabel(Number(carteira.tipoCobranca))}`, value: carteira.id })), [carteirasQuery.data]);
    const contaOptions = useMemo(() => (contasQuery.data ?? []).map((conta) => ({ label: `Ag ${conta.agencia} / Cc ${conta.conta}`, value: conta.id })), [contasQuery.data]);

    if (!podeConsultar) {
        return <UnauthorizedState description="O módulo Bancos exige a permissão BANCOS_CONSULTAR." />;
    }

    const gerarRemessa = async () => {
        if (!carteiraId) return;
        await runWithToast(async () => { const res = await remessaMutation.mutateAsync({ carteiraCobrancaId: carteiraId }); setRemessa(res); }, { success: { summary: 'Remessa gerada' }, error: { summary: 'Erro ao gerar remessa' }, rethrow: true });
    };
    const importarRetorno = async (values: ImportarRetornoFormValues) => {
        await runWithToast(async () => { const res = await retornoMutation.mutateAsync(values); setRetorno(res); setImportarVisible(false); }, { success: { summary: 'Retorno processado' }, error: { summary: 'Erro ao processar retorno' }, rethrow: true });
    };

    return (
        <>
            <PageHeader title="CNAB" description="Geração de remessa e importação de retorno (upload de arquivo)." />
            <Message className="w-full mb-3" severity="info" text="Layout CNAB é best-effort — validar contra o banco real antes de usar em produção." />

            <div className="grid">
                <div className="col-12 lg:col-6">
                    <Card title="Gerar remessa">
                        <div className="flex flex-column gap-2">
                            <div>
                                <label htmlFor="remessaCarteira" className="block font-medium mb-1">Carteira de cobrança</label>
                                <EntitySelect id="remessaCarteira" entityName="carteira" value={carteiraId} options={carteiraOptions} loading={carteirasQuery.isFetching} onChange={setCarteiraId} />
                            </div>
                            <div className="flex justify-content-end">
                                <PermissionGuard permission="CNAB_REMESSA_GERAR" mode="disable">{({ disabled }) => <Button label="Gerar remessa" icon="pi pi-upload" loading={remessaMutation.isPending} disabled={disabled || !carteiraId} onClick={gerarRemessa} />}</PermissionGuard>
                            </div>
                            {remessa ? (
                                <Message className="w-full" severity="success" text={`Remessa gerada: ${remessa.quantidadeBoletos} boleto(s)${remessa.nomeArquivo ? ` — ${remessa.nomeArquivo}` : ''}.${remessa.alertas && remessa.alertas.length ? ' Alertas: ' + remessa.alertas.join(' · ') : ''}`} />
                            ) : null}
                        </div>
                    </Card>
                </div>
                <div className="col-12 lg:col-6">
                    <Card title="Importar retorno">
                        <div className="flex flex-column gap-2">
                            <p className="text-color-secondary m-0">Faça upload do arquivo de retorno do banco para conciliar os boletos.</p>
                            <div className="flex justify-content-end">
                                <PermissionGuard permission="CNAB_RETORNO_PROCESSAR" mode="disable">{({ disabled }) => <Button label="Importar retorno" icon="pi pi-download" disabled={disabled} onClick={() => setImportarVisible(true)} />}</PermissionGuard>
                            </div>
                            {retorno ? (
                                <Message className="w-full" severity="success" text={`Retorno ${retorno.nomeArquivo}: ${retorno.quantidadeProcessada} registro(s) processado(s).${retorno.alertas && retorno.alertas.length ? ' Alertas: ' + retorno.alertas.join(' · ') : ''}`} />
                            ) : null}
                        </div>
                    </Card>
                </div>
            </div>

            <ImportarRetornoDialog visible={importarVisible} loading={retornoMutation.isPending} contaOptions={contaOptions} contaLoading={contasQuery.isFetching} onHide={() => setImportarVisible(false)} onSubmit={importarRetorno} />
        </>
    );
};
