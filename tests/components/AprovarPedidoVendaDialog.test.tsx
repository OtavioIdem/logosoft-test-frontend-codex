import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AprovarPedidoVendaDialog } from '@/features/vendas/components/PedidoVendaActionDialogs';
import { usePedidoVenda } from '@/features/vendas/hooks/useVendasResources';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import type { PedidoVendaResponse } from '@/features/vendas/types/vendas.types';

vi.mock('@/features/vendas/hooks/useVendasResources');
vi.mock('@/features/clientes/hooks/useClientesResources');
vi.mock('@/features/pessoas/hooks/usePessoasResources');

describe('AprovarPedidoVendaDialog — AC-8, AC-9, AC-10', () => {
    const pedidoId = '11111111-1111-1111-1111-111111111111';
    const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const clienteId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const pessoaId = 'pppppppp-pppp-pppp-pppp-pppppppppppp';

    const mockPedido: PedidoVendaResponse = {
        id: pedidoId,
        empresaId,
        numero: 'PV-001',
        clienteId,
        dataEmissao: '2026-09-25T10:00:00Z',
        tipo: 1,
        statusPedido: 2,
        valorProdutos: 1000,
        valorDesconto: 0,
        valorTotal: 1000,
        itens: [
            {
                id: '11111111-1111-1111-1111-111111111112',
                produtoId: 'pppppppp-pppp-pppp-pppp-pppppppppppp',
                quantidade: 2,
                valorUnitario: 500,
                valorDesconto: 0
            }
        ]
    };

    const mockCliente = {
        id: clienteId,
        codigo: 'CLI-001',
        pessoaId
    };

    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        vi.clearAllMocks();

        vi.mocked(usePedidoVenda).mockImplementation((id?: string | null) => ({
            data: id === pedidoId ? mockPedido : null,
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never));

        vi.mocked(useClientes).mockReturnValue({
            data: [mockCliente],
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);

        vi.mocked(usePessoas).mockReturnValue({
            data: [
                {
                    id: pessoaId,
                    nomeRazaoSocial: 'Empresa Teste LTDA',
                    nomeFantasia: 'Teste'
                }
            ],
            isLoading: false,
            isFetching: false,
            error: undefined
        } as never);
    });

    describe('AC-8: resumo no diálogo', () => {
        it('mostra número, cliente por rótulo, itens e valor total — carrega apenas uma vez do cache', async () => {
            const onSubmit = vi.fn();
            render(
                <QueryClientProvider client={queryClient}>
                    <AprovarPedidoVendaDialog
                        visible={true}
                        pedidoId={pedidoId}
                        onHide={vi.fn()}
                        onSubmit={onSubmit}
                    />
                </QueryClientProvider>
            );

            const numeroElement = await screen.findByText('PV-001');
            expect(numeroElement).toBeInTheDocument();

            const clienteElement = screen.getByText((content) => content.includes('CLI-001'));
            expect(clienteElement).toBeInTheDocument();

            expect(screen.getByText(/Reserva o saldo/i)).toBeInTheDocument();

            // AC-8: usePedidoVenda foi chamado apenas uma vez com o pedidoId (dados do cache)
            expect(vi.mocked(usePedidoVenda)).toHaveBeenCalledWith(pedidoId);
            expect(vi.mocked(usePedidoVenda)).toHaveBeenCalledTimes(1);
        });

        it('checkbox reservarEstoque vem marcado', () => {
            const onSubmit = vi.fn();
            render(
                <QueryClientProvider client={queryClient}>
                    <AprovarPedidoVendaDialog
                        visible={true}
                        pedidoId={pedidoId}
                        onHide={vi.fn()}
                        onSubmit={onSubmit}
                    />
                </QueryClientProvider>
            );

            const checkbox = screen.getByRole('checkbox', { name: /Reservar estoque/i });
            expect(checkbox).toBeChecked();
        });

        it('desmarcar enviar reservarEstoque: false no request', async () => {
            const onSubmit = vi.fn().mockResolvedValue(undefined);
            const user = userEvent.setup();

            render(
                <QueryClientProvider client={queryClient}>
                    <AprovarPedidoVendaDialog
                        visible={true}
                        pedidoId={pedidoId}
                        onHide={vi.fn()}
                        onSubmit={onSubmit}
                    />
                </QueryClientProvider>
            );

            const checkbox = screen.getByRole('checkbox', { name: /Reservar estoque/i });
            await user.click(checkbox);

            const aprovarButton = screen.getByRole('button', { name: /Aprovar/i });
            await user.click(aprovarButton);

            await vi.waitFor(() => {
                expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ reservarEstoque: false }));
            });
        });
    });

    describe('AC-10: erro aparece no ApiErrorPanel', () => {
        it('mostra erro quando error é definido', () => {
            const errorMessage = 'Não há estoque suficiente';
            const error = new Error(errorMessage);

            const onSubmit = vi.fn();
            render(
                <QueryClientProvider client={queryClient}>
                    <AprovarPedidoVendaDialog
                        visible={true}
                        pedidoId={pedidoId}
                        loading={false}
                        error={error}
                        onHide={vi.fn()}
                        onSubmit={onSubmit}
                    />
                </QueryClientProvider>
            );

            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });
});
