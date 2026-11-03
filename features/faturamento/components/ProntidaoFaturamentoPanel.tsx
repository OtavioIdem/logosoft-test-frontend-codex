'use client';

// Painel de leitura da prontidão no detalhe do faturamento (v1.11.0a8b82, D113). Consulta só com o `pedidoVendaId`:
// não confirma nada e não depende do formulário. Quem decide se o Confirmar libera é o diálogo, com os parâmetros
// preenchidos; aqui o operador vê, antes de abrir o diálogo, o que ainda falta cadastrar.

import { Card } from 'primereact/card';
import { useProntidaoFaturamento } from '@/features/faturamento/hooks/useFaturamentoResources';
import { FATURAMENTO_PRONTIDAO } from '@/features/faturamento/components/faturamentoLabels';
import { ProntidaoChecklist } from '@/features/faturamento/components/ProntidaoChecklist';
import { estadoProntidao } from '@/features/faturamento/components/prontidaoRecursos';

export const ProntidaoFaturamentoPanel = ({ pedidoVendaId }: { pedidoVendaId?: string | null }) => {
    const query = useProntidaoFaturamento(pedidoVendaId ? { pedidoVendaId } : null);
    const estado = estadoProntidao({
        temPedido: Boolean(pedidoVendaId),
        aguardandoDigitacao: false,
        isFetching: query.isFetching,
        isError: query.isError,
        isSuccess: query.isSuccess,
        data: query.data
    });

    return (
        <Card className="mb-3">
            <small className="text-color-secondary block mb-2 line-height-3">{FATURAMENTO_PRONTIDAO.descricaoLeitura}</small>
            <ProntidaoChecklist estado={estado} resposta={query.data ?? null} error={query.error} onReconferir={() => { void query.refetch(); }} modoLeitura />
        </Card>
    );
};
