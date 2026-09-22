import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProdutosPage } from '@/features/produtos/components/ProdutosPage';
import { produtosApi } from '@/features/produtos/api/produtosApi';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import type { ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { EntityStatus, TipoItemFiscal, TipoProduto } from '@/types/erp';

/**
 * AC-2, AC-2b e AC-6 da fatia v1.11.0a8b64.c2.
 *
 * O que estes casos provam é **decisão de fluxo**, não forma de payload: se a chamada
 * `produtosApi.atualizarDadosFiscais` acontece ou não. Teste de payload (tests/unit/produtosPayload.test.ts)
 * não observa isso — ele só vê o objeto depois de alguém decidir enviá-lo.
 *
 * `ProdutosPage.save` roda **de verdade** aqui, com `useProdutoMutations` real sobre uma `produtosApi`
 * mockada. O que é substituído é só a UI do formulário: `ProdutoFormDialog` vira um botão que entrega
 * um `values` controlado ao `onSubmit` real da página. Dirigir os dropdowns do PrimeReact para chegar
 * no mesmo ponto tornaria o teste frágil sem provar nada a mais — e replicar a regra dentro do teste
 * não provaria nada, porque a cópia continuaria verde com o código de produção quebrado.
 */

const { toastMock, permsState, formValuesRef } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] },
    formValuesRef: { current: {} as Record<string, unknown> }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));

vi.mock('@/features/produtos/api/produtosApi', () => ({
    produtosApi: {
        listar: vi.fn(),
        criar: vi.fn(),
        atualizar: vi.fn(),
        atualizarPrecoCusto: vi.fn(),
        atualizarDadosFiscais: vi.fn(),
        adicionarCodigoBarras: vi.fn(),
        vincularFornecedor: vi.fn(),
        inativar: vi.fn()
    },
    categoriasProdutoApi: { listar: vi.fn() },
    marcasApi: { listar: vi.fn() },
    unidadesMedidaApi: { listar: vi.fn() }
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

vi.mock('@/features/fornecedores/hooks/useFornecedoresResources', () => ({
    useFornecedores: () => ({ data: [], isFetching: false, isLoading: false })
}));

vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({ snapshot: { empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', filialId: null, isMaster: true, revision: 1 } })
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/produtos',
    useSearchParams: () => new URLSearchParams()
}));

// `useProdutoMutations` fica REAL de propósito: é ele que leva (ou não) a decisão do `save` até a
// `produtosApi`. Só os hooks de listagem e catálogo são substituídos, para a página montar sem rede.
vi.mock('@/features/produtos/hooks/useProdutosResources', async () => {
    // Caminho relativo, não o alias `@`: o alias não resolve dentro de `vi.importActual`.
    const actual = await vi.importActual<typeof import('../../features/produtos/hooks/useProdutosResources')>('../../features/produtos/hooks/useProdutosResources');
    return {
        ...actual,
        useProdutos: vi.fn(),
        useCategoriasProduto: vi.fn(() => ({ data: [], isFetching: false, isLoading: false })),
        useUnidadesMedida: vi.fn(() => ({ data: [], isFetching: false, isLoading: false })),
        useMarcas: vi.fn(() => ({ data: [], isFetching: false, isLoading: false }))
    };
});

vi.mock('@/features/produtos/components/ProdutoComplementoDialogs', () => ({
    CodigoBarrasDialog: () => null,
    ProdutoFornecedorDialog: () => null
}));

// O diálogo vira um botão que entrega `values` ao `onSubmit` REAL da página.
vi.mock('@/features/produtos/components/ProdutoFormDialog', () => ({
    ProdutoFormDialog: ({ visible, onSubmit }: { visible: boolean; onSubmit: (values: Record<string, unknown>) => Promise<void> }) =>
        visible ? (
            <button type="button" onClick={() => void onSubmit(formValuesRef.current).catch(() => undefined)}>
                submeter-formulario
            </button>
        ) : null
}));

const api = vi.mocked(produtosApi);
const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const produtoGravado = { id: 'pppppppp-pppp-pppp-pppp-pppppppppppp', empresaId, status: EntityStatus.Ativo } as unknown as ProdutoResponse;

/** Cadastro válido com o bloco fiscal inteiramente em branco — os sete campos que a tela conhece. */
const valoresSemFiscal = (overrides: Record<string, unknown> = {}) => ({
    empresaId,
    filialId: null,
    codigo: 'PROD-001',
    descricao: 'Produto de teste',
    descricaoComercial: null,
    tipoProduto: TipoProduto.Mercadoria,
    unidadeMedidaId: 'uuuuuuuu-uuuu-uuuu-uuuu-uuuuuuuuuuuu',
    categoriaProdutoId: null,
    marcaId: null,
    precoVendaBase: 100,
    custoReferencial: 60,
    controlaEstoque: true,
    controlaQualidade: false,
    permiteVenda: true,
    permiteCompra: true,
    ncmCodigo: null,
    cestCodigo: null,
    origemMercadoriaCodigo: null,
    tipoItemFiscal: null,
    tipoItemSped: null,
    unidadeMedidaTributavelId: null,
    codigoFiscalExterno: null,
    observacao: null,
    ...overrides
});

const abrirEsubmeter = async (values: Record<string, unknown>) => {
    formValuesRef.current = values;
    const user = userEvent.setup();
    vi.mocked(useProdutos).mockReturnValue({ data: [], isFetching: false, isLoading: false, error: undefined } as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ProdutosPage />
        </QueryClientProvider>
    );
    await user.click(screen.getByRole('button', { name: /novo produto/i }));
    await user.click(await screen.findByRole('button', { name: 'submeter-formulario' }));
};

describe('ProdutosPage — v1.11.0a8b64.c2 — quando o PATCH de dados fiscais é disparado', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permsState.perms = ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR', 'PRODUTOS_DADOS_FISCAIS_GERENCIAR'];
        api.criar.mockResolvedValue(produtoGravado);
        api.atualizar.mockResolvedValue(produtoGravado);
        api.atualizarPrecoCusto.mockResolvedValue(produtoGravado);
        api.atualizarDadosFiscais.mockResolvedValue(produtoGravado);
        api.listar.mockResolvedValue([] as never);
    });

    it('AC-2: criar produto sem tocar em campo fiscal não dispara o PATCH', async () => {
        await abrirEsubmeter(valoresSemFiscal());

        expect(api.criar).toHaveBeenCalledTimes(1);
        expect(api.atualizarDadosFiscais).not.toHaveBeenCalled();
    });

    it('AC-2b: editar produto com o bloco fiscal vazio não dispara o PATCH', async () => {
        await abrirEsubmeter(valoresSemFiscal({ id: produtoGravado.id }));

        expect(api.atualizar).toHaveBeenCalledTimes(1);
        expect(api.atualizarDadosFiscais).not.toHaveBeenCalled();
    });

    // Sem este caso, o AC-2 passaria com um `save` que nunca chama nada.
    it('controle: com um campo fiscal preenchido, o PATCH é disparado', async () => {
        await abrirEsubmeter(valoresSemFiscal({ ncmCodigo: '84713012' }));

        expect(api.atualizarDadosFiscais).toHaveBeenCalledTimes(1);
    });

    // Sem este caso, o AC-2 passaria pelo motivo errado: a permissão faltando, não o bloco em branco.
    it('controle: sem PRODUTOS_DADOS_FISCAIS_GERENCIAR o PATCH nunca é disparado, mesmo com campo fiscal', async () => {
        permsState.perms = ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR'];
        await abrirEsubmeter(valoresSemFiscal({ ncmCodigo: '84713012', tipoItemFiscal: TipoItemFiscal.Mercadoria }));

        expect(api.criar).toHaveBeenCalledTimes(1);
        expect(api.atualizarDadosFiscais).not.toHaveBeenCalled();
    });

    it('AC-6: PATCH falhando depois do cadastro gravado não diz que o produto não foi salvo', async () => {
        api.atualizarDadosFiscais.mockRejectedValue(new Error('TipoItemSped é obrigatório.'));

        await abrirEsubmeter(valoresSemFiscal({ ncmCodigo: '84713012' }));

        expect(api.criar).toHaveBeenCalledTimes(1);
        const chamadasDeErro = toastMock.error.mock.calls.map((argumentos) => String(argumentos[0]));
        expect(chamadasDeErro).toContain('Produto salvo, mas os dados fiscais não foram gravados');
        expect(chamadasDeErro).not.toContain('Erro ao salvar produto');
        expect(toastMock.success).not.toHaveBeenCalled();
    });
});
