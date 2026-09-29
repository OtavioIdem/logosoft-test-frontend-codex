import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContasAvancadoTab } from '@/features/financeiro-avancado/components/ContasAvancadoTab';
import { origemModuloLabel } from '@/features/financeiro-avancado/components/financeiroAvancadoLabels';
import { useContaAvancado, useContasAvancado, useContasAvancadoMutations } from '@/features/financeiro-avancado/hooks/useFinanceiroAvancadoResources';
import type { ContaFinanceiraResponse } from '@/features/financeiro-avancado/types/financeiroAvancado.types';

vi.mock('@/features/financeiro-avancado/hooks/useFinanceiroAvancadoResources', () => ({
    useContasAvancado: vi.fn(),
    useContaAvancado: vi.fn(),
    useContasAvancadoMutations: vi.fn()
}));
vi.mock('@/features/auth/hooks/usePermissions', () => ({
    usePermissions: () => ({ hasPermission: () => true, hasAnyPermission: () => true, hasAllPermissions: () => true })
}));
vi.mock('@/hooks/useMutationWithToast', () => ({ useMutationWithToast: () => vi.fn() }));
// Filtro de empresa e diálogos de ação não participam do detalhe; ficam inertes para não puxar
// contexto organizacional nem hooks de cadastro.
vi.mock('@/components/forms/EmpresaFilialFilter', () => ({ EmpresaFilialFilter: () => null }));
vi.mock('@/features/financeiro-avancado/components/ContaDialogs', () => ({
    CriarContaDialog: () => null,
    BaixarContaDialog: () => null,
    EstornarBaixaDialog: () => null
}));

const contaId = '66666666-6666-6666-6666-666666666666';
const pedidoCompraId = '77777777-7777-7777-7777-777777777777';

const contaBase: ContaFinanceiraResponse = {
    id: contaId,
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    tipo: 2,
    participanteId: '22222222-2222-2222-2222-222222222222',
    descricao: 'Fornecedor de insumos',
    valorOriginal: 1000,
    saldo: 1000,
    dataVencimento: '2026-10-15T00:00:00Z',
    status: 1,
    documento: 'NF-100',
    dataEmissao: '2026-09-15T00:00:00Z',
    origemModulo: null,
    origemId: null,
    baixas: []
};

const idle = { mutateAsync: vi.fn(), isPending: false };

const montarDetalhe = (conta: ContaFinanceiraResponse) => {
    vi.mocked(useContasAvancado).mockReturnValue({
        data: { items: [conta], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
        isFetching: false,
        error: null
    } as never);
    // O detalhe só existe depois de a linha ser aberta: sem id selecionado, sem dado.
    vi.mocked(useContaAvancado).mockImplementation(((id?: string | null) => ({ data: id === conta.id ? conta : undefined, isFetching: false, error: null })) as never);
    vi.mocked(useContasAvancadoMutations).mockReturnValue({ criarMutation: idle, baixarMutation: idle, estornarMutation: idle, cancelarMutation: idle } as never);
};

const abrirConta = async () => {
    const user = userEvent.setup();
    render(<ContasAvancadoTab tipo="pagar" baixarPermission="FINANCEIRO_PAGAR" gerenciarPermission="FINANCEIRO_GERENCIAR" />);
    expect(screen.queryByTestId('conta-origem')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    return screen.findByTestId('conta-origem');
};

describe('Financeiro Avançado — AC-2 — Origem do título visível', () => {
    describe('origemModuloLabel função', () => {
        it('retorna "Manual" quando origem vazia', () => {
            const resultado = origemModuloLabel();
            expect(resultado).toBe('Manual');
        });

        it('retorna "Manual" quando origemModulo vazio e origemId vazio', () => {
            const resultado = origemModuloLabel('', '');
            expect(resultado).toBe('Manual');
        });

        it('retorna "—" quando origemModulo vazio mas origemId presente', () => {
            const resultado = origemModuloLabel('', 'some-id');
            expect(resultado).toBe('—');
        });

        it('retorna "—" quando origemModulo null mas origemId presente', () => {
            const resultado = origemModuloLabel(null, 'some-id');
            expect(resultado).toBe('—');
        });

        it('transforma "Compras.PedidoCompra" em "Compras › Pedido Compra"', () => {
            const resultado = origemModuloLabel('Compras.PedidoCompra', 'id-123');
            expect(resultado).toContain('Compras');
            expect(resultado).toContain('Pedido Compra');
            expect(resultado).toContain('›');
        });

        it('transforma "Vendas.PedidoVenda" em "Vendas › Pedido Venda"', () => {
            const resultado = origemModuloLabel('Vendas.PedidoVenda', 'id-456');
            expect(resultado).toContain('Vendas');
            expect(resultado).toContain('Pedido Venda');
        });

        it('transforma "Financeiro.TituloReceber" em "Financeiro › Titulo Receber"', () => {
            const resultado = origemModuloLabel('Financeiro.TituloReceber', 'id-789');
            expect(resultado).toContain('Financeiro');
            expect(resultado).toContain('Titulo Receber');
        });
    });

    describe('ContasAvancadoTab real — detalhe da conta aberta pela linha', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('conta com origemModulo e origemId mostra o rótulo do módulo e "Referência: <id>"', async () => {
            montarDetalhe({ ...contaBase, origemModulo: 'Compras.PedidoCompra', origemId: pedidoCompraId });

            const origem = await abrirConta();

            expect(within(origem).getByText('Origem')).toBeInTheDocument();
            expect(within(origem).getByText(origemModuloLabel('Compras.PedidoCompra', pedidoCompraId))).toBeInTheDocument();
            expect(within(origem).getByText('Compras › Pedido Compra')).toBeInTheDocument();
            expect(within(origem).getByText(`Referência: ${pedidoCompraId}`)).toBeInTheDocument();
            expect(within(origem).queryByText('Manual')).not.toBeInTheDocument();
        });

        it('conta com origemModulo e origemId nulos mostra "Manual" e nenhuma referência', async () => {
            montarDetalhe({ ...contaBase, origemModulo: null, origemId: null });

            const origem = await abrirConta();

            expect(within(origem).getByText('Manual')).toBeInTheDocument();
            expect(within(origem).queryByText(/Referência:/)).not.toBeInTheDocument();
        });
    });
});
