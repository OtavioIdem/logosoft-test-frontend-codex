import type { InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrepararFaturamentoDialog } from '@/features/faturamento/components/FaturamentoDialogs';
import { FATURAMENTO_PREPARAR } from '@/features/faturamento/components/faturamentoLabels';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { httpClient } from '@/lib/http/httpClient';
import { StatusPedidoVenda } from '@/types/erp';

// b71 — AC-7 (D95) no diálogo REAL de Preparar. A lista de pedidos vem do hook de Vendas (simulado aqui
// como o servidor: só devolve o que o filtro de status pede); a consulta dos faturamentos existentes do pedido
// passa pelo hook, pelo client e pelo `httpClient` reais, com a rede trocada no adapter.

vi.mock('@/features/vendas/hooks/useVendasResources', () => ({ usePedidosVenda: vi.fn() }));
vi.mock('@/components/forms/EntitySelect', () => ({
    EntitySelect: ({ id, value, options, onChange, disabled, entityName }: { id?: string; value?: string | null; options: { label: string; value: string }[]; onChange: (value: string | null) => void; disabled?: boolean; entityName: string }) => (
        <select id={id} aria-label={entityName} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
            <option value="">Selecione</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}));

const empresaId = '11111111-1111-1111-1111-111111111111';
const pedidoAprovadoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
const pedidoAprovadoLimpoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
const pedidoRascunhoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
const faturamentoErroRecenteId = 'ffffffff-ffff-ffff-ffff-fffffffffff1';
const faturamentoErroAntigoId = 'ffffffff-ffff-ffff-ffff-fffffffffff2';

const pedidos = [
    { id: pedidoAprovadoId, empresaId, numero: 'PV-00014', clienteId: 'c1', statusPedido: StatusPedidoVenda.Aprovado, valorTotal: 251, itens: [] },
    { id: pedidoAprovadoLimpoId, empresaId, numero: 'PV-00015', clienteId: 'c1', statusPedido: StatusPedidoVenda.Aprovado, valorTotal: 99, itens: [] },
    { id: pedidoRascunhoId, empresaId, numero: 'PV-00016', clienteId: 'c1', statusPedido: StatusPedidoVenda.Rascunho, valorTotal: 10, itens: [] }
];

// Faturamentos do pedido PV-00014: dois em Erro (etapa 7), o mais recente primeiro, como o backend ordena.
const faturamentosPorPedido: Record<string, unknown[]> = {
    [pedidoAprovadoId]: [
        { id: faturamentoErroRecenteId, empresaId, pedidoVendaId: pedidoAprovadoId, etapa: 7, valorTotal: 251 },
        { id: faturamentoErroAntigoId, empresaId, pedidoVendaId: pedidoAprovadoId, etapa: 7, valorTotal: 251 }
    ],
    [pedidoAprovadoLimpoId]: []
};

describe('PrepararFaturamentoDialog — AC-7 (D95)', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let consultas: Record<string, unknown>[];

    beforeEach(() => {
        consultas = [];
        // Simula o servidor: aplica o filtro de status que o hook recebeu.
        vi.mocked(usePedidosVenda).mockImplementation(((query?: { status?: number | null }) => ({
            data: pedidos.filter((pedido) => query?.status === undefined || query?.status === null || pedido.statusPedido === query.status),
            isFetching: false,
            isLoading: false
        })) as never);
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            if (config.method === 'get' && config.url === '/api/faturamento') {
                consultas.push(config.params ?? {});
                const itens = faturamentosPorPedido[String(config.params?.pedidoVendaId)] ?? [];
                return { data: { items: itens, page: 1, pageSize: 100, totalItems: itens.length, totalPages: 1 }, status: 200, statusText: 'OK', headers: {}, config };
            }
            throw new Error(`Rota não esperada no teste: ${config.method} ${config.url}`);
        });
    });

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
        vi.clearAllMocks();
    });

    const renderDialog = (onAbrirFaturamento = vi.fn(), onSubmit = vi.fn().mockResolvedValue(undefined)) => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        render(
            <QueryClientProvider client={queryClient}>
                <PrepararFaturamentoDialog visible empresaId={empresaId} filialId={null} onHide={vi.fn()} onSubmit={onSubmit} onAbrirFaturamento={onAbrirFaturamento} />
            </QueryClientProvider>
        );
        return { onAbrirFaturamento, onSubmit };
    };

    it('lista só pedidos Aprovado: o combo pede status Aprovado e o pedido em Rascunho não aparece', () => {
        renderDialog();
        const combo = screen.getByRole('combobox', { name: 'pedido aprovado' });

        expect(vi.mocked(usePedidosVenda).mock.calls.length).toBeGreaterThan(0);
        for (const chamada of vi.mocked(usePedidosVenda).mock.calls) {
            expect(chamada[0]).toMatchObject({ empresaId, status: StatusPedidoVenda.Aprovado });
        }
        const rotulos = Array.from((combo as HTMLSelectElement).options).map((option) => option.textContent ?? '');
        expect(rotulos.some((rotulo) => rotulo.startsWith('PV-00014'))).toBe(true);
        expect(rotulos.some((rotulo) => rotulo.startsWith('PV-00015'))).toBe(true);
        expect(rotulos.some((rotulo) => rotulo.startsWith('PV-00016'))).toBe(false);
        // Pedido por rótulo (número e total), nunca o GUID.
        expect(rotulos.some((rotulo) => rotulo.includes(pedidoAprovadoId))).toBe(false);
    });

    it('com faturamento em Erro para o pedido escolhido, consulta por pedidoVendaId e oferece abrir o mais recente', async () => {
        const user = userEvent.setup();
        const { onAbrirFaturamento, onSubmit } = renderDialog();

        await user.selectOptions(screen.getByRole('combobox', { name: 'pedido aprovado' }), pedidoAprovadoId);

        expect(await screen.findByText(FATURAMENTO_PREPARAR.existenteErro(2))).toBeInTheDocument();
        expect(consultas.at(-1)).toMatchObject({ empresaId, pedidoVendaId: pedidoAprovadoId });

        await user.click(screen.getByRole('button', { name: FATURAMENTO_PREPARAR.abrirExistente }));
        expect(onAbrirFaturamento).toHaveBeenCalledTimes(1);
        expect(onAbrirFaturamento).toHaveBeenCalledWith(faturamentoErroRecenteId);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('pedido sem faturamento existente não oferece abrir nada', async () => {
        const user = userEvent.setup();
        renderDialog();

        await user.selectOptions(screen.getByRole('combobox', { name: 'pedido aprovado' }), pedidoAprovadoLimpoId);

        await waitFor(() => expect(consultas.some((params) => params.pedidoVendaId === pedidoAprovadoLimpoId)).toBe(true));
        expect(screen.queryByRole('button', { name: FATURAMENTO_PREPARAR.abrirExistente })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: FATURAMENTO_PREPARAR.abrirAtivo })).not.toBeInTheDocument();
    });
});
