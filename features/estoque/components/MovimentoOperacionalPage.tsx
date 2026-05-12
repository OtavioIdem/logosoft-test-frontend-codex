'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { MovimentoEstoqueFormDialog } from '@/features/estoque/components/MovimentoEstoqueFormDialog';
import { estoqueOperacaoImpactos } from '@/features/estoque/components/estoqueUxUtils';
import { useLocaisEstoque, useMovimentoEstoqueMutations } from '@/features/estoque/hooks/useEstoqueResources';
import { MovimentoEstoqueFormValues } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useAppToast } from '@/hooks/useAppToast';

type MovimentoKind = 'entrada' | 'saida' | 'ajuste';

const pageText: Record<MovimentoKind, { title: string; description: string; button: string; info: string }> = {
    entrada: { title: 'Entrada de estoque', description: 'Registra entrada manual de produto em local de estoque.', button: 'Registrar entrada', info: 'Toda entrada gera movimento e afeta saldo. Informe empresa, filial, produto, local, quantidade e motivo.' },
    saida: { title: 'Saída de estoque', description: 'Registra saída manual de produto com validação de saldo disponível no backend.', button: 'Registrar saída', info: 'Toda saída gera movimento. O backend impede saída sem saldo disponível.' },
    ajuste: { title: 'Ajuste de estoque', description: 'Registra ajuste por quantidade contada, mantendo rastreabilidade por movimento.', button: 'Registrar ajuste', info: 'Ajuste não altera saldo diretamente; o backend calcula diferença e registra movimento.' }
};

export const MovimentoOperacionalPage = ({ kind }: { kind: MovimentoKind }) => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const [dialogVisible, setDialogVisible] = useState(false);
    const produtosQuery = useProdutos({});
    const locaisQuery = useLocaisEstoque({});
    const { entradaMutation, saidaMutation, ajusteMutation } = useMovimentoEstoqueMutations();

    if (!hasPermission('ESTOQUE_MOVIMENTAR')) return <UnauthorizedState description="Movimentações exigem ESTOQUE_MOVIMENTAR." />;

    const submit = async (values: MovimentoEstoqueFormValues) => {
        try {
            if (kind === 'entrada') await entradaMutation.mutateAsync(values);
            if (kind === 'saida') await saidaMutation.mutateAsync(values);
            if (kind === 'ajuste') await ajusteMutation.mutateAsync(values);
            toast.success('Movimento registrado', `${pageText[kind].title} concluída com sucesso.`);
            setDialogVisible(false);
        } catch (error) {
            toast.error('Erro no movimento', error instanceof Error ? error.message : 'Não foi possível registrar o movimento.');
            throw error;
        }
    };

    const loading = entradaMutation.isPending || saidaMutation.isPending || ajusteMutation.isPending;
    const impactos = estoqueOperacaoImpactos(kind);

    return (
        <>
            <PageHeader title={pageText[kind].title} description={pageText[kind].description} actions={<PermissionGuard permission="ESTOQUE_MOVIMENTAR" mode="disable">{({ disabled }) => <Button label={pageText[kind].button} icon="pi pi-plus" disabled={disabled} onClick={() => setDialogVisible(true)} />}</PermissionGuard>} />
            <Card className="mb-3">
                <Message severity="info" className="w-full" text={pageText[kind].info} />
            </Card>
            <div className="grid">
                {impactos.map((impacto, index) => (
                    <div key={impacto} className="col-12 md:col-4">
                        <Card>
                            <span className="block text-color-secondary mb-2">Etapa {index + 1}</span>
                            <strong>{impacto}</strong>
                        </Card>
                    </div>
                ))}
            </div>
            <MovimentoEstoqueFormDialog visible={dialogVisible} kind={kind} produtos={produtosQuery.data ?? []} locais={locaisQuery.data ?? []} loading={loading} onHide={() => setDialogVisible(false)} onSubmit={submit} />
        </>
    );
};
