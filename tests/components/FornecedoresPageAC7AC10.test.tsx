import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FornecedoresPage } from '@/features/fornecedores/components/FornecedoresPage';
import { fornecedoresApi } from '@/features/fornecedores/api/fornecedoresApi';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import type { FornecedorResponse } from '@/features/fornecedores/types/fornecedores.types';
import { EntityStatus } from '@/types/erp';

/**
 * AC-4, AC-7, AC-8 e AC-10 da fatia v1.11.0a8b66 — Fornecedor.
 *
 * Mesmo desenho de `ProdutosPageAC2AC6.test.tsx`: a página e `useFornecedorMutations` rodam de
 * verdade sobre uma `fornecedoresApi` mockada. Nenhum `Dialog`, `TabView` ou `ConfirmDialog` do
 * PrimeReact é montado no jsdom:
 * - `FornecedorFormDialog` vira um botão que entrega `values` ao `onSubmit` real;
 * - `ReasonDialog` vira um botão rotulado pelo `title` que chama o `onConfirm` real com um motivo;
 * - `ConfirmDialog` vira um botão rotulado pelo `header` que chama o `accept` real.
 * O botão da confirmação só existe enquanto `visible` for verdadeiro, então os casos também provam
 * que a ação de linha abre a confirmação em vez de disparar a mutação direto.
 */

const MOTIVO_REVOGACAO = 'Certidão negativa vencida';

const { toastMock, permsState, formValuesRef } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] },
    formValuesRef: { current: {} as Record<string, unknown> }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));

vi.mock('@/features/fornecedores/api/fornecedoresApi', () => ({
    fornecedoresApi: {
        listar: vi.fn(),
        criar: vi.fn(),
        atualizar: vi.fn(),
        inativar: vi.fn(),
        configurarCompra: vi.fn(),
        homologar: vi.fn(),
        revogarHomologacao: vi.fn()
    }
}));

vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || permsState.perms.includes(code);
    return {
        usePermissions: () => ({
            hasPermission: has,
            hasAnyPermission: (codes?: string[]) => !codes || codes.length === 0 || codes.some(has),
            hasAllPermissions: (codes?: string[]) => !codes || codes.length === 0 || codes.every(has)
        })
    };
});

vi.mock('@/features/pessoas/hooks/usePessoasResources', () => ({
    usePessoas: () => ({ data: [], isFetching: false, isLoading: false })
}));

vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({ snapshot: { empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', filialId: null, isMaster: true, revision: 1 } })
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/fornecedores',
    useSearchParams: () => new URLSearchParams()
}));

// `useFornecedorMutations` fica REAL de propósito; só a listagem é substituída.
vi.mock('@/features/fornecedores/hooks/useFornecedoresResources', async () => {
    // Caminho relativo, não o alias `@`: o alias não resolve dentro de `vi.importActual`.
    const actual = await vi.importActual<typeof import('../../features/fornecedores/hooks/useFornecedoresResources')>('../../features/fornecedores/hooks/useFornecedoresResources');
    return { ...actual, useFornecedores: vi.fn() };
});

vi.mock('@/features/fornecedores/components/FornecedorFormDialog', () => ({
    FornecedorFormDialog: ({ visible, onSubmit }: { visible: boolean; onSubmit: (values: Record<string, unknown>) => Promise<void> }) =>
        visible ? (
            <button type="button" onClick={() => void onSubmit(formValuesRef.current).catch(() => undefined)}>
                submeter-formulario
            </button>
        ) : null
}));

vi.mock('@/components/feedback/ReasonDialog', () => ({
    ReasonDialog: ({ visible, title, onConfirm }: { visible: boolean; title: string; onConfirm: (reason: string) => void }) =>
        visible ? (
            <button type="button" onClick={() => onConfirm(MOTIVO_REVOGACAO)}>
                {`motivo: ${title}`}
            </button>
        ) : null
}));

vi.mock('primereact/confirmdialog', () => ({
    ConfirmDialog: ({ visible, header, accept }: { visible?: boolean; header?: string; accept?: () => void }) =>
        visible ? (
            <button type="button" onClick={() => accept?.()}>
                {`confirmar: ${header}`}
            </button>
        ) : null
}));

const api = vi.mocked(fornecedoresApi);
const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const pessoaId = '66666666-6666-6666-6666-666666666666';
const idDevolvidoPeloCriar = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const condicaoPagamentoId = '20000000-0000-4000-8000-000000000002';

const fornecedor = (overrides: Partial<FornecedorResponse> = {}): FornecedorResponse => ({
    id: '55555555-5555-4555-8555-555555555555',
    empresaId,
    filialId: null,
    pessoaId,
    codigo: 'FOR-B66',
    observacao: null,
    condicaoPagamentoPadraoId: condicaoPagamentoId,
    prazoEntregaMedio: 7,
    homologado: false,
    categoriaFornecimento: 'Matéria-prima',
    status: EntityStatus.Ativo,
    ...overrides
});

const valoresCriacaoSemCompra = (overrides: Record<string, unknown> = {}) => ({
    empresaId,
    filialId: null,
    pessoaId,
    codigo: 'FOR-NOVO',
    observacao: null,
    condicaoPagamentoPadraoId: null,
    prazoEntregaMedio: null,
    categoriaFornecimento: null,
    ...overrides
});

const renderPagina = (registros: FornecedorResponse[] = []) => {
    vi.mocked(useFornecedores).mockReturnValue({ data: registros, isFetching: false, isLoading: false, error: null } as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <FornecedoresPage />
        </QueryClientProvider>
    );
};

const criarEsubmeter = async (values: Record<string, unknown>) => {
    formValuesRef.current = values;
    const user = userEvent.setup();
    renderPagina();
    await user.click(screen.getByRole('button', { name: /novo fornecedor/i }));
    await user.click(await screen.findByRole('button', { name: 'submeter-formulario' }));
};

const editarEsubmeter = async (registro: FornecedorResponse, values: Record<string, unknown>) => {
    formValuesRef.current = values;
    const user = userEvent.setup();
    renderPagina([registro]);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(await screen.findByRole('button', { name: 'submeter-formulario' }));
};

const titulosDeErro = () => toastMock.error.mock.calls.map((argumentos) => String(argumentos[0]));
const titulosDeSucesso = () => toastMock.success.mock.calls.map((argumentos) => String(argumentos[0]));

describe('FornecedoresPage — v1.11.0a8b66 — AC-4: configuração de compra', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permsState.perms = ['FORNECEDORES_CONSULTAR', 'FORNECEDORES_GERENCIAR'];
        api.criar.mockResolvedValue(fornecedor({ id: idDevolvidoPeloCriar, codigo: 'FOR-NOVO' }));
        api.atualizar.mockResolvedValue(fornecedor());
        api.configurarCompra.mockResolvedValue(undefined);
        api.listar.mockResolvedValue([]);
    });

    it('AC-4 (espelho do AC-1): editar fornecedor com os três campos gravados reenvia exatamente os três', async () => {
        const gravado = fornecedor();
        await editarEsubmeter(gravado, {
            id: gravado.id,
            observacao: gravado.observacao,
            condicaoPagamentoPadraoId: gravado.condicaoPagamentoPadraoId,
            prazoEntregaMedio: gravado.prazoEntregaMedio,
            categoriaFornecimento: gravado.categoriaFornecimento
        });

        await waitFor(() => expect(api.configurarCompra).toHaveBeenCalledTimes(1));
        expect(api.atualizar).toHaveBeenCalledTimes(1);
        const [idConfigurado, corpo] = api.configurarCompra.mock.calls[0];
        expect(idConfigurado).toBe(gravado.id);
        expect(corpo).toStrictEqual({ condicaoPagamentoPadraoId: condicaoPagamentoId, prazoEntregaMedio: 7, categoriaFornecimento: 'Matéria-prima' });
    });

    it('AC-4 (D62): editar com o bloco de compra em branco ainda envia o bloco inteiro com null explícito', async () => {
        const gravado = fornecedor();
        await editarEsubmeter(gravado, { id: gravado.id, observacao: null, condicaoPagamentoPadraoId: null, prazoEntregaMedio: null, categoriaFornecimento: null });

        await waitFor(() => expect(api.configurarCompra).toHaveBeenCalledTimes(1));
        expect(api.configurarCompra.mock.calls[0][1]).toStrictEqual({ condicaoPagamentoPadraoId: null, prazoEntregaMedio: null, categoriaFornecimento: null });
    });

    it('AC-4 (espelho do AC-2): criar fornecedor sem campo de compra não dispara o PUT', async () => {
        await criarEsubmeter(valoresCriacaoSemCompra());

        await waitFor(() => expect(titulosDeSucesso()).toContain('Fornecedor salvo'));
        expect(api.criar).toHaveBeenCalledTimes(1);
        expect(api.configurarCompra).not.toHaveBeenCalled();
    });

    it('AC-4 (espelho do AC-2): criar com um campo de compra dispara o PUT depois do POST, com o id devolvido', async () => {
        await criarEsubmeter(valoresCriacaoSemCompra({ prazoEntregaMedio: 0 }));

        await waitFor(() => expect(api.configurarCompra).toHaveBeenCalledTimes(1));
        expect(api.criar.mock.invocationCallOrder[0]).toBeLessThan(api.configurarCompra.mock.invocationCallOrder[0]);
        const [idConfigurado, corpo] = api.configurarCompra.mock.calls[0];
        expect(idConfigurado).toBe(idDevolvidoPeloCriar);
        // Prazo 0 é valor válido (>= 0), não "em branco": um teste de truthiness o descartaria.
        expect(corpo).toStrictEqual({ condicaoPagamentoPadraoId: null, prazoEntregaMedio: 0, categoriaFornecimento: null });
    });

    it('AC-4 (espelho do AC-3): PUT falhando depois do POST mostra "Fornecedor salvo, mas a configuração de compra não foi gravada"', async () => {
        api.configurarCompra.mockRejectedValue(new Error('Condição de pagamento inativa.'));

        await criarEsubmeter(valoresCriacaoSemCompra({ condicaoPagamentoPadraoId: condicaoPagamentoId }));

        await waitFor(() => expect(titulosDeErro()).toContain('Fornecedor salvo, mas a configuração de compra não foi gravada'));
        expect(api.criar).toHaveBeenCalledTimes(1);
        expect(titulosDeErro()).not.toContain('Erro ao salvar fornecedor');
        expect(toastMock.success).not.toHaveBeenCalled();
    });

    // Sem este caso, o espelho do AC-3 passaria com um `save` que usasse o título parcial para qualquer falha.
    it('controle: falha no POST de cadastro mostra "Erro ao salvar fornecedor" e nunca chega ao PUT', async () => {
        api.criar.mockRejectedValue(new Error('Código já utilizado.'));

        await criarEsubmeter(valoresCriacaoSemCompra({ condicaoPagamentoPadraoId: condicaoPagamentoId }));

        await waitFor(() => expect(titulosDeErro()).toContain('Erro ao salvar fornecedor'));
        expect(api.configurarCompra).not.toHaveBeenCalled();
        expect(titulosDeErro()).not.toContain('Fornecedor salvo, mas a configuração de compra não foi gravada');
    });
});

describe('FornecedoresPage — v1.11.0a8b66 — AC-7, AC-8, AC-10: homologação', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permsState.perms = ['FORNECEDORES_CONSULTAR', 'FORNECEDORES_GERENCIAR'];
        api.homologar.mockResolvedValue(undefined);
        api.revogarHomologacao.mockResolvedValue(undefined);
        api.listar.mockResolvedValue([]);
    });

    it('AC-7: fornecedor ativo não homologado — Homologar pede confirmação e chama homologar(id) sem corpo', async () => {
        const registro = fornecedor({ homologado: false });
        const user = userEvent.setup();
        renderPagina([registro]);

        const homologar = screen.getByRole('button', { name: 'Homologar' });
        expect(homologar).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Revogar homologação' })).toBeDisabled();

        await user.click(homologar);
        // A ação de linha só abre a confirmação — a mutação ainda não pode ter saído.
        expect(api.homologar).not.toHaveBeenCalled();
        // Homologar não usa ReasonDialog (D63): nenhum pedido de motivo aparece.
        expect(screen.queryByRole('button', { name: /^motivo:/ })).not.toBeInTheDocument();

        await user.click(await screen.findByRole('button', { name: 'confirmar: Homologar fornecedor' }));

        await waitFor(() => expect(api.homologar).toHaveBeenCalledTimes(1));
        // Exatamente um argumento: o id. Nenhum corpo, nenhum motivo.
        expect(api.homologar.mock.calls[0]).toStrictEqual([registro.id]);
        expect(api.revogarHomologacao).not.toHaveBeenCalled();
        await waitFor(() => expect(titulosDeSucesso()).toContain('Fornecedor homologado'));
    });

    it('AC-8: fornecedor ativo homologado — Revogar pede motivo e chama revogarHomologacao(id, motivo); Homologar desabilitado', async () => {
        const registro = fornecedor({ homologado: true });
        const user = userEvent.setup();
        renderPagina([registro]);

        expect(screen.getByRole('button', { name: 'Homologar' })).toBeDisabled();
        const revogar = screen.getByRole('button', { name: 'Revogar homologação' });
        expect(revogar).toBeEnabled();

        await user.click(revogar);
        expect(api.revogarHomologacao).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: /^confirmar:/ })).not.toBeInTheDocument();

        await user.click(await screen.findByRole('button', { name: 'motivo: Motivo da revogação de homologação' }));

        await waitFor(() => expect(api.revogarHomologacao).toHaveBeenCalledTimes(1));
        // A API monta o corpo `{ motivo }` a partir deste argumento (buildRevogarHomologacaoFornecedorPayload).
        expect(api.revogarHomologacao.mock.calls[0]).toStrictEqual([registro.id, MOTIVO_REVOGACAO]);
        expect(api.homologar).not.toHaveBeenCalled();
        expect(api.inativar).not.toHaveBeenCalled();
        await waitFor(() => expect(titulosDeSucesso()).toContain('Homologação revogada'));
    });

    it('AC-10: fornecedor inativo não homologado — Homologar e Revogar desabilitados', () => {
        renderPagina([fornecedor({ homologado: false, status: EntityStatus.Inativo })]);

        expect(screen.getByRole('button', { name: 'Homologar' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Revogar homologação' })).toBeDisabled();
    });

    it('AC-10: fornecedor inativo homologado — Homologar e Revogar desabilitados', () => {
        renderPagina([fornecedor({ homologado: true, status: EntityStatus.Inativo })]);

        expect(screen.getByRole('button', { name: 'Homologar' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Revogar homologação' })).toBeDisabled();
    });
});
