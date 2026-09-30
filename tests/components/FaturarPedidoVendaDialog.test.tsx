import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FaturarPedidoVendaDialog } from '@/features/vendas/components/PedidoVendaActionDialogs';
import { vendasLabels } from '@/features/vendas/components/vendasLabels';
import { usePedidoVenda } from '@/features/vendas/hooks/useVendasResources';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import type { PedidoVendaResponse } from '@/features/vendas/types/vendas.types';

// b71 — AC-8 (D95, D96) no diálogo REAL de Faturar pedido de venda. Os hooks de leitura do pedido, do
// cliente e da pessoa são simulados (padrão de AprovarPedidoVendaDialog.test.tsx); o schema e o diálogo são
// os de produção.

vi.mock('@/features/vendas/hooks/useVendasResources');
vi.mock('@/features/clientes/hooks/useClientesResources');
vi.mock('@/features/pessoas/hooks/usePessoasResources');

const pedidoId = '11111111-1111-1111-1111-111111111111';
const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const clienteId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const pessoaId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const pedido: PedidoVendaResponse = {
    id: pedidoId,
    empresaId,
    numero: 'PV-00014',
    clienteId,
    dataEmissao: '2026-09-25T10:00:00Z',
    tipo: 1,
    statusPedido: 2,
    valorProdutos: 1234.5,
    valorDesconto: 0,
    valorTotal: 1234.5,
    itens: [{ id: '11111111-1111-1111-1111-111111111112', produtoId: '22222222-2222-2222-2222-222222222222', quantidade: 1, valorUnitario: 1234.5, valorDesconto: 0 }]
};

describe('FaturarPedidoVendaDialog — AC-8 (D95, D96)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePedidoVenda).mockImplementation(((id?: string | null) => ({ data: id === pedidoId ? pedido : null, isLoading: false, isFetching: false })) as never);
        vi.mocked(useClientes).mockReturnValue({ data: [{ id: clienteId, codigo: 'CLI-007', pessoaId }], isLoading: false, isFetching: false } as never);
        vi.mocked(usePessoas).mockReturnValue({ data: [{ id: pessoaId, nomeRazaoSocial: 'Mercado Central Ltda', nomeFantasia: null }], isLoading: false, isFetching: false } as never);
    });

    const renderDialog = (props: { error?: unknown } = {}) => {
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        render(<FaturarPedidoVendaDialog visible pedidoId={pedidoId} onHide={vi.fn()} onSubmit={onSubmit} error={props.error} />);
        return { onSubmit };
    };

    it('mostra o resumo (número, cliente por rótulo, valor) e o texto de efeito antes de confirmar', () => {
        renderDialog();

        expect(screen.getByText('PV-00014')).toBeInTheDocument();
        expect(screen.getByText('CLI-007 • Mercado Central Ltda')).toBeInTheDocument();
        expect(screen.getByText(/R\$\s*1\.234,50/)).toBeInTheDocument();
        expect(screen.getByText(vendasLabels.faturamento.efeito)).toBeInTheDocument();
        // O cliente aparece por rótulo, nunca pelo GUID.
        expect(screen.queryByText(clienteId)).not.toBeInTheDocument();
        expect(vi.mocked(usePedidoVenda)).toHaveBeenCalledWith(pedidoId);
    });

    it('aceita documento vazio: o onSubmit recebe documento vazio', async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderDialog();

        await user.click(screen.getByRole('button', { name: 'Faturar' }));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ baixarEstoque: true, documento: '' }));
    });

    it('aceita documento de 80 caracteres e recusa 81, com a mensagem, sem chamar o onSubmit', async () => {
        const user = userEvent.setup();
        const { onSubmit } = renderDialog();
        const documento = screen.getByLabelText(vendasLabels.faturamento.documentoRotulo) as HTMLInputElement;
        // O input limita a 80 no navegador; o schema é a trava que protege o request. O teste remove o limite
        // do elemento para provar a trava do schema.
        documento.removeAttribute('maxlength');

        // Colar em vez de digitar: um onChange com o texto inteiro (81 teclas estouravam o timeout sob carga).
        await user.click(documento);
        await user.paste('D'.repeat(81));
        expect(documento.value).toHaveLength(81);
        await user.click(screen.getByRole('button', { name: 'Faturar' }));
        expect(await screen.findByText('O documento aceita até 80 caracteres.')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();

        await user.clear(documento);
        await user.click(documento);
        await user.paste('D'.repeat(80));
        expect(documento.value).toHaveLength(80);
        await user.click(screen.getByRole('button', { name: 'Faturar' }));
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ documento: 'D'.repeat(80) }));
    });

    it('mostra o erro da API com código, status e traceId no ApiErrorPanel', () => {
        const erro = Object.assign(new Error('Pedido não pode ser faturado no status atual.'), { code: 'Vendas.PedidoStatusInvalido', status: 409, traceId: 'trace-faturar' });
        renderDialog({ error: erro });

        expect(screen.getByText('Pedido não pode ser faturado no status atual.')).toBeInTheDocument();
        expect(screen.getByText('Código: Vendas.PedidoStatusInvalido • HTTP 409 • Trace: trace-faturar')).toBeInTheDocument();
    });
});
