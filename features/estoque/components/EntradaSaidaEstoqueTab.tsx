'use client';

import { Message } from 'primereact/message';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { MovimentoEstoqueFormDialog } from '@/features/estoque/components/MovimentoEstoqueFormDialog';
import { useMovimentoEstoqueMutations } from '@/features/estoque/hooks/useEstoqueResources';
import { MovimentoEstoqueFormValues } from '@/features/estoque/types/estoque.types';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';

type EntradaSaidaKind = 'entrada' | 'saida';

const tabText: Record<EntradaSaidaKind, { description: string; successSummary: string; successDetail: string }> = {
    entrada: {
        description: 'Registra entrada manual de produto em local de estoque. Toda entrada gera movimento e afeta saldo.',
        successSummary: 'Entrada registrada',
        successDetail: 'Entrada de estoque concluída com sucesso.'
    },
    saida: {
        description: 'Registra saída manual de produto com validação de saldo disponível no backend, que impede saída sem saldo.',
        successSummary: 'Saída registrada',
        successDetail: 'Saída de estoque concluída com sucesso.'
    }
};

// A própria aba é o cadastro: evita abrir um segundo diálogo para iniciar uma operação já escolhida.
export const EntradaSaidaEstoqueTab = ({ kind }: { kind: EntradaSaidaKind }) => {
    const runWithToast = useMutationWithToast();
    const { hasPermission } = usePermissions();
    const { entradaMutation, saidaMutation } = useMovimentoEstoqueMutations();
    const mutation = kind === 'entrada' ? entradaMutation : saidaMutation;

    const submit = async (values: MovimentoEstoqueFormValues) => {
        await runWithToast(
            async () => {
                await mutation.mutateAsync(values);
            },
            { success: { summary: tabText[kind].successSummary, detail: tabText[kind].successDetail }, error: { summary: 'Erro no movimento', detail: 'Não foi possível registrar o movimento.' }, rethrow: true }
        );
    };

    return (
        <>
            <p className="text-color-secondary mt-0 mb-3">{tabText[kind].description}</p>
            {hasPermission('ESTOQUE_MOVIMENTAR') ? <MovimentoEstoqueFormDialog embedded visible kind={kind} loading={mutation.isPending} onHide={() => undefined} onSubmit={submit} /> : <Message severity="warn" className="w-full" text="Você pode consultar esta operação, mas não pode registrá-la sem a permissão ESTOQUE_MOVIMENTAR." />}
        </>
    );
};
