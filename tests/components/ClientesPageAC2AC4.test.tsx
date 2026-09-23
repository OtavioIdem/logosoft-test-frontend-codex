import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClientesPage } from '@/features/clientes/components/ClientesPage';
import { clientesApi } from '@/features/clientes/api/clientesApi';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import type { ClienteResponse } from '@/features/clientes/types/clientes.types';
import { EntityStatus } from '@/types/erp';

/**
 * AC-1, AC-2, AC-3 e AC-6 da fatia v1.11.0a8b66 — Cliente, configuração comercial.
 *
 * Mesmo desenho de `ProdutosPageAC2AC6.test.tsx`: `ClientesPage.save` roda de verdade, com
 * `useClienteMutations` REAL sobre uma `clientesApi` mockada. O que é substituído é só a UI:
 * `ClienteFormDialog` vira um botão que entrega um `values` controlado ao `onSubmit` real da página,
 * e `ReasonDialog` vira `null` (nenhum caso aqui usa motivo). Assim nenhum `Dialog`/`TabView` do
 * PrimeReact é montado no jsdom.
 *
 * O que o diálogo real faz com o registro gravado (`buildInitialValues` hidratando os cinco campos,
 * inclusive `classificacaoId`) é provado ponta a ponta no E2E `b66-cliente-fornecedor.spec.ts`
 * (AC-11: corpo do PUT interceptado igual ao gravado). Aqui o objeto entregue pelo diálogo é o que o
 * diálogo real entregaria, e a asserção é sobre o que a PÁGINA faz com ele.
 */

const { toastMock, permsState, formValuesRef } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] },
    formValuesRef: { current: {} as Record<string, unknown> }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));

vi.mock('@/features/clientes/api/clientesApi', () => ({
    clientesApi: {
        listar: vi.fn(),
        criar: vi.fn(),
        atualizar: vi.fn(),
        bloquearCredito: vi.fn(),
        desbloquearCredito: vi.fn(),
        inativar: vi.fn(),
        configurarComercial: vi.fn()
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
    usePathname: () => '/clientes',
    useSearchParams: () => new URLSearchParams()
}));

// `useClienteMutations` fica REAL de propósito: é ele que leva (ou não) a decisão do `save` até a
// `clientesApi`. Só a listagem é substituída, para a página montar sem rede.
vi.mock('@/features/clientes/hooks/useClientesResources', async () => {
    // Caminho relativo, não o alias `@`: o alias não resolve dentro de `vi.importActual`.
    const actual = await vi.importActual<typeof import('../../features/clientes/hooks/useClientesResources')>('../../features/clientes/hooks/useClientesResources');
    return { ...actual, useClientes: vi.fn() };
});

vi.mock('@/components/feedback/ReasonDialog', () => ({ ReasonDialog: () => null }));

// O diálogo vira um botão que entrega `values` ao `onSubmit` REAL da página.
vi.mock('@/features/clientes/components/ClienteFormDialog', () => ({
    ClienteFormDialog: ({ visible, onSubmit }: { visible: boolean; onSubmit: (values: Record<string, unknown>) => Promise<void> }) =>
        visible ? (
            <button type="button" onClick={() => void onSubmit(formValuesRef.current).catch(() => undefined)}>
                submeter-formulario
            </button>
        ) : null
}));

const api = vi.mocked(clientesApi);
const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const pessoaId = '66666666-6666-6666-6666-666666666666';
const idDevolvidoPeloCriar = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const tabelaPrecoId = '10000000-0000-4000-8000-000000000001';
const condicaoPagamentoId = '20000000-0000-4000-8000-000000000002';
const classificacaoId = '30000000-0000-4000-8000-000000000003';

/** Cliente gravado com os cinco campos comerciais preenchidos — `classificacaoId` não tem controle na tela (D65). */
const clienteGravado: ClienteResponse = {
    id: '44444444-4444-4444-8444-444444444444',
    empresaId,
    filialId: null,
    pessoaId,
    codigo: 'CLI-B66',
    limiteCredito: 5000,
    creditoBloqueado: false,
    motivoBloqueioCredito: null,
    observacao: null,
    tabelaPrecoPadraoId: tabelaPrecoId,
    condicaoPagamentoPadraoId: condicaoPagamentoId,
    classificacaoId,
    diaVencimentoPreferencial: 10,
    permiteVendaAPrazo: true,
    status: EntityStatus.Ativo
};

/** Criação válida com o bloco comercial inteiramente no padrão (em branco / `false`). */
const valoresCriacaoSemComercial = (overrides: Record<string, unknown> = {}) => ({
    empresaId,
    filialId: null,
    pessoaId,
    codigo: 'CLI-NOVO',
    limiteCredito: 1000,
    observacao: null,
    tabelaPrecoPadraoId: null,
    condicaoPagamentoPadraoId: null,
    classificacaoId: null,
    diaVencimentoPreferencial: null,
    permiteVendaAPrazo: false,
    ...overrides
});

/** O que o diálogo entrega na edição: o registro gravado hidratado, com `id`. */
const valoresEdicao = (overrides: Record<string, unknown> = {}) => ({
    id: clienteGravado.id,
    limiteCredito: clienteGravado.limiteCredito,
    observacao: clienteGravado.observacao,
    tabelaPrecoPadraoId: clienteGravado.tabelaPrecoPadraoId,
    condicaoPagamentoPadraoId: clienteGravado.condicaoPagamentoPadraoId,
    classificacaoId: clienteGravado.classificacaoId,
    diaVencimentoPreferencial: clienteGravado.diaVencimentoPreferencial,
    permiteVendaAPrazo: clienteGravado.permiteVendaAPrazo,
    ...overrides
});

const renderPagina = (registros: ClienteResponse[] = []) => {
    vi.mocked(useClientes).mockReturnValue({ data: registros, isFetching: false, isLoading: false, error: null } as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ClientesPage />
        </QueryClientProvider>
    );
};

const criarEsubmeter = async (values: Record<string, unknown>) => {
    formValuesRef.current = values;
    const user = userEvent.setup();
    renderPagina();
    await user.click(screen.getByRole('button', { name: /novo cliente/i }));
    await user.click(await screen.findByRole('button', { name: 'submeter-formulario' }));
};

const editarEsubmeter = async (values: Record<string, unknown>) => {
    formValuesRef.current = values;
    const user = userEvent.setup();
    renderPagina([clienteGravado]);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(await screen.findByRole('button', { name: 'submeter-formulario' }));
};

const titulosDeErro = () => toastMock.error.mock.calls.map((argumentos) => String(argumentos[0]));
const titulosDeSucesso = () => toastMock.success.mock.calls.map((argumentos) => String(argumentos[0]));

describe('ClientesPage — v1.11.0a8b66 — quando o PUT de configuração comercial é disparado', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permsState.perms = ['CLIENTES_CONSULTAR', 'CLIENTES_GERENCIAR'];
        api.criar.mockResolvedValue({ ...clienteGravado, id: idDevolvidoPeloCriar, codigo: 'CLI-NOVO' });
        api.atualizar.mockResolvedValue(clienteGravado);
        api.configurarComercial.mockResolvedValue(undefined);
        api.listar.mockResolvedValue([]);
    });

    it('AC-1 + AC-6: editar cliente com os cinco campos gravados reenvia exatamente os cinco, classificacaoId incluso', async () => {
        await editarEsubmeter(valoresEdicao());

        await waitFor(() => expect(api.configurarComercial).toHaveBeenCalledTimes(1));
        expect(api.atualizar).toHaveBeenCalledTimes(1);
        expect(api.atualizar.mock.calls[0][0]).toBe(clienteGravado.id);
        const [idConfigurado, corpo] = api.configurarComercial.mock.calls[0];
        expect(idConfigurado).toBe(clienteGravado.id);
        // `toStrictEqual` falha com chave a mais, a menos, ou `undefined` no lugar de `null`.
        expect(corpo).toStrictEqual({
            tabelaPrecoPadraoId: tabelaPrecoId,
            condicaoPagamentoPadraoId: condicaoPagamentoId,
            classificacaoId,
            diaVencimentoPreferencial: 10,
            permiteVendaAPrazo: true
        });
        expect(api.criar).not.toHaveBeenCalled();
    });

    it('AC-1 (D62): editar com o bloco comercial em branco ainda envia o bloco inteiro, com null e false explícitos', async () => {
        await editarEsubmeter(
            valoresEdicao({ tabelaPrecoPadraoId: null, condicaoPagamentoPadraoId: null, classificacaoId: null, diaVencimentoPreferencial: null, permiteVendaAPrazo: false })
        );

        await waitFor(() => expect(api.configurarComercial).toHaveBeenCalledTimes(1));
        expect(api.configurarComercial.mock.calls[0][1]).toStrictEqual({
            tabelaPrecoPadraoId: null,
            condicaoPagamentoPadraoId: null,
            classificacaoId: null,
            diaVencimentoPreferencial: null,
            permiteVendaAPrazo: false
        });
    });

    it('AC-2: criar cliente sem campo comercial não dispara o PUT de configuração', async () => {
        await criarEsubmeter(valoresCriacaoSemComercial());

        await waitFor(() => expect(titulosDeSucesso()).toContain('Cliente salvo'));
        expect(api.criar).toHaveBeenCalledTimes(1);
        expect(api.configurarComercial).not.toHaveBeenCalled();
    });

    it('AC-2: criar cliente com um campo comercial dispara o PUT depois do POST, com o id devolvido pelo criar', async () => {
        await criarEsubmeter(valoresCriacaoSemComercial({ tabelaPrecoPadraoId: tabelaPrecoId }));

        await waitFor(() => expect(api.configurarComercial).toHaveBeenCalledTimes(1));
        expect(api.criar).toHaveBeenCalledTimes(1);
        expect(api.criar.mock.invocationCallOrder[0]).toBeLessThan(api.configurarComercial.mock.invocationCallOrder[0]);
        const [idConfigurado, corpo] = api.configurarComercial.mock.calls[0];
        expect(idConfigurado).toBe(idDevolvidoPeloCriar);
        expect(corpo).toStrictEqual({
            tabelaPrecoPadraoId: tabelaPrecoId,
            condicaoPagamentoPadraoId: null,
            classificacaoId: null,
            diaVencimentoPreferencial: null,
            permiteVendaAPrazo: false
        });
    });

    // Sem este caso, um `configuracaoComercialEstaEmBranco` que ignorasse o booleano passaria verde:
    // quem cria marcando só "Permite venda a prazo" perderia a marcação sem aviso.
    it('controle: criar com só permiteVendaAPrazo = true também dispara o PUT', async () => {
        await criarEsubmeter(valoresCriacaoSemComercial({ permiteVendaAPrazo: true }));

        await waitFor(() => expect(api.configurarComercial).toHaveBeenCalledTimes(1));
        expect(api.configurarComercial.mock.calls[0][1]).toMatchObject({ permiteVendaAPrazo: true });
    });

    it('AC-3: PUT falhando depois do POST gravado mostra "Cliente salvo, mas a configuração comercial não foi gravada", nunca a mensagem genérica', async () => {
        api.configurarComercial.mockRejectedValue(new Error('Tabela de preço inativa.'));

        await criarEsubmeter(valoresCriacaoSemComercial({ tabelaPrecoPadraoId: tabelaPrecoId }));

        await waitFor(() => expect(titulosDeErro()).toContain('Cliente salvo, mas a configuração comercial não foi gravada'));
        expect(api.criar).toHaveBeenCalledTimes(1);
        expect(titulosDeErro()).not.toContain('Erro ao salvar cliente');
        const chamada = toastMock.error.mock.calls.find((argumentos) => argumentos[0] === 'Cliente salvo, mas a configuração comercial não foi gravada');
        expect(String(chamada?.[1])).toContain('Tabela de preço inativa.');
        expect(toastMock.success).not.toHaveBeenCalled();
    });

    // Sem este caso, o AC-3 passaria com um `save` que exibisse o título parcial para qualquer falha.
    it('controle: falha no POST de cadastro mostra "Erro ao salvar cliente" e nunca chega ao PUT de configuração', async () => {
        api.criar.mockRejectedValue(new Error('Código já utilizado.'));

        await criarEsubmeter(valoresCriacaoSemComercial({ tabelaPrecoPadraoId: tabelaPrecoId }));

        await waitFor(() => expect(titulosDeErro()).toContain('Erro ao salvar cliente'));
        expect(api.configurarComercial).not.toHaveBeenCalled();
        expect(titulosDeErro()).not.toContain('Cliente salvo, mas a configuração comercial não foi gravada');
        expect(toastMock.success).not.toHaveBeenCalled();
    });
});
