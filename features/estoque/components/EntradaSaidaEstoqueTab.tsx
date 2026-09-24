'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { MovimentoEstoqueFormDialog } from '@/features/estoque/components/MovimentoEstoqueFormDialog';
import { estoqueOperacaoImpactos } from '@/features/estoque/components/estoqueUxUtils';
import { useMovimentoEstoqueMutations } from '@/features/estoque/hooks/useEstoqueResources';
import { MovimentoEstoqueFormValues } from '@/features/estoque/types/estoque.types';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';

type EntradaSaidaKind = 'entrada' | 'saida';

const tabText: Record<EntradaSaidaKind, { description: string; button: string; successSummary: string; successDetail: string }> = {
    entrada: {
        description: 'Registra entrada manual de produto em local de estoque. Toda entrada gera movimento e afeta saldo.',
        button: 'Registrar entrada',
        successSummary: 'Entrada registrada',
        successDetail: 'Entrada de estoque concluída com sucesso.'
    },
    saida: {
        description: 'Registra saída manual de produto com validação de saldo disponível no backend, que impede saída sem saldo.',
        button: 'Registrar saída',
        successSummary: 'Saída registrada',
        successDetail: 'Saída de estoque concluída com sucesso.'
    }
};

// Conteúdo de Entrada/Saída dentro do TabView de `EstoqueMovimentosPage` (D72). A guarda de tela é
// da página (união das permissões das abas); aqui só o botão de ação fica sob `PermissionGuard`, no
// padrão de `AjusteEstoqueTab.tsx:63` — quem só tem ESTOQUE_CONSULTAR vê a aba e entende o que ela
// faz, mas não consegue disparar a ação.
export const EntradaSaidaEstoqueTab = ({ kind }: { kind: EntradaSaidaKind }) => {
    const runWithToast = useMutationWithToast();
    const [dialogVisible, setDialogVisible] = useState(false);
    const { entradaMutation, saidaMutation } = useMovimentoEstoqueMutations();
    const mutation = kind === 'entrada' ? entradaMutation : saidaMutation;

    const submit = async (values: MovimentoEstoqueFormValues) => {
        await runWithToast(
            async () => {
                await mutation.mutateAsync(values);
                setDialogVisible(false);
            },
            { success: { summary: tabText[kind].successSummary, detail: tabText[kind].successDetail }, error: { summary: 'Erro no movimento', detail: 'Não foi possível registrar o movimento.' }, rethrow: true }
        );
    };

    return (
        <>
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-3">
                <p className="text-color-secondary m-0">{tabText[kind].description}</p>
                <PermissionGuard permission="ESTOQUE_MOVIMENTAR" mode="disable">
                    {({ disabled }) => <Button label={tabText[kind].button} icon="pi pi-plus" disabled={disabled} onClick={() => setDialogVisible(true)} />}
                </PermissionGuard>
            </div>
            <div className="grid">
                {estoqueOperacaoImpactos(kind).map((impacto, index) => (
                    <div key={impacto} className="col-12 md:col-4">
                        <Card>
                            <span className="block text-color-secondary mb-2">Etapa {index + 1}</span>
                            <strong>{impacto}</strong>
                        </Card>
                    </div>
                ))}
            </div>
            <MovimentoEstoqueFormDialog visible={dialogVisible} kind={kind} loading={mutation.isPending} onHide={() => setDialogVisible(false)} onSubmit={submit} />
        </>
    );
};
