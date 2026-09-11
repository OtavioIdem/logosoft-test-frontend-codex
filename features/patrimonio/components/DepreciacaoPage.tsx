'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { useDepreciacaoMutation } from '@/features/patrimonio/hooks/usePatrimonioResources';
import { DepreciacaoResultadoResponse, ProcessarDepreciacaoFormValues } from '@/features/patrimonio/types/patrimonio.types';
import { ProcessarDepreciacaoDialog } from '@/features/patrimonio/components/PatrimonioDialogs';
import { formatMoney } from '@/lib/formatters/money';

const mesNomes = ['—', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const competenciaLabelPt = (ano: number, mes: number) => `${mesNomes[mes] ?? mes}/${ano}`;

export const DepreciacaoPage = () => {
    const { hasPermission } = usePermissions();
    const runWithToast = useMutationWithToast();
    const [dialogVisible, setDialogVisible] = useState(false);
    const [resultado, setResultado] = useState<DepreciacaoResultadoResponse | null>(null);
    const depreciacaoMutation = useDepreciacaoMutation();

    if (!hasPermission('PATRIMONIO_CONSULTAR')) {
        return <UnauthorizedState description="O módulo Patrimônio exige a permissão PATRIMONIO_CONSULTAR." />;
    }

    const processar = async (values: ProcessarDepreciacaoFormValues) => {
        await runWithToast(
            async () => { const res = await depreciacaoMutation.mutateAsync(values); setResultado(res); setDialogVisible(false); },
            { success: { summary: 'Depreciação processada' }, error: { summary: 'Erro ao processar depreciação' }, rethrow: true }
        );
    };

    const headerActions = (
        <PermissionGuard permission="PATRIMONIO_DEPRECIAR" mode="disable">{({ disabled }) => <Button label="Processar competência" icon="pi pi-sync" disabled={disabled} onClick={() => setDialogVisible(true)} />}</PermissionGuard>
    );

    return (
        <>
            <PageHeader title="Depreciação" description="Processamento em lote por competência (ano/mês). O cálculo é idempotente." actions={headerActions} />
            <Card>
                {resultado ? (
                    /* DepreciacaoResultadoResponse não bate em nome com ProcessarDepreciacaoPeriodoResponse do backend — correção de campo é da b54.c1, D5 */
                    <Message className="w-full" severity="success" text={`Competência ${competenciaLabelPt(resultado.ano, resultado.mes)}: ${resultado.bensDepreciados} bem(ns) depreciado(s), total ${formatMoney(resultado.valorTotal)}.`} />
                ) : (
                    <p className="text-color-secondary m-0">Escolha a empresa e a competência para processar a depreciação do período. Reprocessar a mesma competência não duplica lançamentos.</p>
                )}
            </Card>
            <ProcessarDepreciacaoDialog visible={dialogVisible} loading={depreciacaoMutation.isPending} onHide={() => setDialogVisible(false)} onSubmit={processar} />
        </>
    );
};
