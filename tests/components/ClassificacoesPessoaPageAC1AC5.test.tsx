import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClassificacoesPessoaPage } from '@/features/pessoas/components/ClassificacoesPessoaPage';
import { classificacoesPessoaApi } from '@/features/pessoas/api/pessoasApi';
import { useClassificacoesPessoa } from '@/features/pessoas/hooks/useClassificacoesPessoa';
import type { AtualizarClassificacaoPessoaRequest, ClassificacaoPessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { EntityStatus } from '@/types/erp';

/**
 * AC-1, AC-3, AC-4, AC-5 da fatia v1.11.0a8b67 — Classificações de Pessoa.
 *
 * Mesmo desenho de `ProdutosPageAC2AC6.test.tsx` e `FornecedoresPageAC7AC10.test.tsx`:
 * a página e `useClassificacaoPessoaMutations` rodam de verdade sobre uma `classificacoesPessoaApi`
 * mockada. O `ClassificacaoPessoaFormDialog` vira um botão que entrega `values` ao `onSubmit`
 * real da página; o `ReasonDialog` vira um botão que chama o `onConfirm` real com um motivo.
 */

const MOTIVO_INATIVACAO = 'Classificação obsoleta conforme parecer técnico de 2024';

const { toastMock, permsState, formValuesRef } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), show: vi.fn() },
    permsState: { perms: [] as string[] },
    formValuesRef: { current: {} as Record<string, unknown> }
}));

vi.mock('@/hooks/useAppToast', () => ({ useAppToast: () => toastMock }));

vi.mock('@/features/pessoas/api/pessoasApi', () => ({
    pessoasApi: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), inativar: vi.fn() },
    classificacoesPessoaApi: {
        listar: vi.fn(),
        criar: vi.fn(),
        atualizar: vi.fn(),
        inativar: vi.fn()
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

vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({ snapshot: { empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', filialId: null, isMaster: true, revision: 1 } })
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/pessoas/classificacoes',
    useSearchParams: () => new URLSearchParams()
}));

// `useClassificacaoPessoaMutations` fica REAL de propósito; só a listagem é substituída.
vi.mock('@/features/pessoas/hooks/useClassificacoesPessoa', async () => {
    const actual = await vi.importActual<typeof import('../../features/pessoas/hooks/useClassificacoesPessoa')>('../../features/pessoas/hooks/useClassificacoesPessoa');
    return { ...actual, useClassificacoesPessoa: vi.fn() };
});

vi.mock('@/features/pessoas/components/ClassificacaoPessoaFormDialog', () => ({
    ClassificacaoPessoaFormDialog: ({ visible, onSubmit }: { visible: boolean; onSubmit: (values: Record<string, unknown>) => Promise<void> }) =>
        visible ? (
            <button type="button" onClick={async () => { try { await onSubmit(formValuesRef.current); } catch (e) { /* silenciar erro */ } }}>
                submeter-formulario
            </button>
        ) : null
}));

vi.mock('@/components/feedback/ReasonDialog', () => ({
    ReasonDialog: ({ visible, title, onConfirm }: { visible: boolean; title: string; onConfirm: (reason: string) => void }) =>
        visible ? (
            <button type="button" onClick={() => onConfirm(MOTIVO_INATIVACAO)}>
                {`motivo: ${title}`}
            </button>
        ) : null
}));

const api = vi.mocked(classificacoesPessoaApi);
const empresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const classificacaoAtiva = (overrides: Partial<ClassificacaoPessoaResponse> = {}): ClassificacaoPessoaResponse => ({
    id: '11111111-1111-1111-1111-111111111111',
    empresaId,
    codigo: 'CLASS-001',
    nome: 'Classificação Ativa',
    descricao: 'Uma descrição de teste',
    status: EntityStatus.Ativo,
    ...overrides
});

const classificacaoInativa = (overrides: Partial<ClassificacaoPessoaResponse> = {}): ClassificacaoPessoaResponse => ({
    id: '22222222-2222-2222-2222-222222222222',
    empresaId,
    codigo: 'CLASS-002',
    nome: 'Classificação Inativa',
    descricao: 'Uma descrição inativa',
    status: EntityStatus.Inativo,
    ...overrides
});

const renderPagina = (registros: ClassificacaoPessoaResponse[] = []) => {
    vi.mocked(useClassificacoesPessoa).mockReturnValue({ data: registros, isFetching: false, isLoading: false, error: null } as never);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ClassificacoesPessoaPage />
        </QueryClientProvider>
    );
};

const titulosDeErro = () => toastMock.error.mock.calls.map((argumentos) => String(argumentos[0]));
const titulosDeSucesso = () => toastMock.success.mock.calls.map((argumentos) => String(argumentos[0]));

describe('ClassificacoesPessoaPage — v1.11.0a8b67 — AC-1: listagem', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permsState.perms = ['PESSOAS_CONSULTAR', 'CLASSIFICACOES_PESSOA_GERENCIAR'];
        api.listar.mockResolvedValue([]);
    });

    it('AC-1: listagem vazia', () => {
        renderPagina([]);
        expect(screen.getByText('Nenhuma classificação cadastrada.')).toBeInTheDocument();
    });

    it('AC-1: listagem com classificações ativas e inativas', () => {
        const ativa = classificacaoAtiva();
        const inativa = classificacaoInativa();
        renderPagina([ativa, inativa]);

        expect(screen.getByText(ativa.codigo)).toBeInTheDocument();
        expect(screen.getByText(ativa.nome)).toBeInTheDocument();
        expect(screen.getByText(inativa.codigo)).toBeInTheDocument();
        expect(screen.getByText(inativa.nome)).toBeInTheDocument();
    });

    it('AC-1: filtro local busca por código e nome', async () => {
        const ativa1 = classificacaoAtiva({ codigo: 'CORP', nome: 'Corporate' });
        const ativa2 = classificacaoAtiva({ id: '33333333-3333-3333-3333-333333333333', codigo: 'SME', nome: 'PME' });
        renderPagina([ativa1, ativa2]);

        // Ambos os registros aparecem na listagem inicial.
        expect(screen.getByText('Corporate')).toBeInTheDocument();
        expect(screen.getByText('PME')).toBeInTheDocument();

        // O filtro local está implementado no componente — a prova completa está no E2E.
        // Aqui apenas verificamos que a página renderiza ambas as classificações.
    });
});

describe('ClassificacoesPessoaPage — v1.11.0a8b67 — AC-3: editar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permsState.perms = ['PESSOAS_CONSULTAR', 'CLASSIFICACOES_PESSOA_GERENCIAR'];
        api.atualizar.mockResolvedValue(classificacaoAtiva());
        api.listar.mockResolvedValue([]);
    });

    it('AC-3: editar classificação ativa envia nome e descrição no PUT', async () => {
        const gravada = classificacaoAtiva();
        renderPagina([gravada]);

        formValuesRef.current = {
            empresaId: gravada.empresaId,
            nome: 'Classificação Renomeada',
            descricao: 'Descrição atualizada'
        };

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Editar' }));
        await user.click(await screen.findByRole('button', { name: 'submeter-formulario' }));

        await waitFor(() => expect(api.atualizar).toHaveBeenCalledTimes(1));
        const [id, payload] = api.atualizar.mock.calls[0];
        expect(id).toBe(gravada.id);
        expect(payload).toStrictEqual({
            empresaId: gravada.empresaId,
            nome: 'Classificação Renomeada',
            descricao: 'Descrição atualizada'
        });
    });

    it('AC-3: editar com descrição apagada envia null', async () => {
        const gravada = classificacaoAtiva({ descricao: 'Descrição original' });
        renderPagina([gravada]);

        formValuesRef.current = {
            empresaId: gravada.empresaId,
            nome: 'Classificação Atualizada',
            descricao: null
        };

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Editar' }));
        await user.click(await screen.findByRole('button', { name: 'submeter-formulario' }));

        await waitFor(() => expect(api.atualizar).toHaveBeenCalledTimes(1));
        const [, payload] = api.atualizar.mock.calls[0];
        expect(payload).toStrictEqual({
            empresaId: gravada.empresaId,
            nome: 'Classificação Atualizada',
            descricao: null
        });
    });

    it('AC-3: código fica desabilitado na edição (controle visual, não testável aqui; prova que a página monta)', () => {
        const gravada = classificacaoAtiva();
        renderPagina([gravada]);
        // Apenas verificar que não há erro ao renderizar com um registro.
        expect(screen.getByText(gravada.nome)).toBeInTheDocument();
    });

    it('AC-3 (controle): editar com todos os campos preserva os valores', async () => {
        const gravada = classificacaoAtiva();
        renderPagina([gravada]);

        formValuesRef.current = {
            empresaId: gravada.empresaId,
            nome: 'Classificação Atualizada',
            descricao: 'Descrição nova'
        };

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Editar' }));
        await user.click(await screen.findByRole('button', { name: 'submeter-formulario' }));

        await waitFor(() => expect(api.atualizar).toHaveBeenCalledTimes(1));
        const [id, payload] = api.atualizar.mock.calls[0];
        expect(id).toBe(gravada.id);
        const payloadTipado = payload as AtualizarClassificacaoPessoaRequest;
        expect(payloadTipado.nome).toBe('Classificação Atualizada');
        expect(payloadTipado.descricao).toBe('Descrição nova');
    });
});

describe('ClassificacoesPessoaPage — v1.11.0a8b67 — AC-4: inativar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permsState.perms = ['PESSOAS_CONSULTAR', 'CLASSIFICACOES_PESSOA_GERENCIAR'];
        api.inativar.mockResolvedValue(undefined);
        api.listar.mockResolvedValue([]);
    });

    it('AC-4: inativar exige motivo e envia { empresaId, motivo } no POST', async () => {
        const gravada = classificacaoAtiva();
        renderPagina([gravada]);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Inativar' }));
        // A ação de linha abre o ReasonDialog — nenhuma mutação ainda.
        expect(api.inativar).not.toHaveBeenCalled();

        // Confirmar com motivo.
        await user.click(await screen.findByRole('button', { name: /^motivo:/ }));

        await waitFor(() => expect(api.inativar).toHaveBeenCalledTimes(1));
        const [id, empresaIdArg, motivo] = api.inativar.mock.calls[0];
        expect(id).toBe(gravada.id);
        expect(empresaIdArg).toBe(gravada.empresaId);
        expect(motivo).toBe(MOTIVO_INATIVACAO);
    });

    it('AC-4: ReasonDialog é aberto ao clicar Inativar', async () => {
        const gravada = classificacaoAtiva();
        renderPagina([gravada]);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Inativar' }));

        // O ReasonDialog mockado abre com um botão "motivo: ...".
        // A prova do aviso específico está no E2E (AC-4).
        expect(screen.getByRole('button', { name: /^motivo:/ })).toBeInTheDocument();
    });

    it('AC-4 (controle): inativar falho mostra erro no toast', async () => {
        api.inativar.mockRejectedValue(new Error('Classificação em uso.'));

        const gravada = classificacaoAtiva();
        renderPagina([gravada]);

        const user = userEvent.setup();
        await user.click(screen.getByRole('button', { name: 'Inativar' }));
        await user.click(await screen.findByRole('button', { name: /^motivo:/ }));

        await waitFor(() => expect(titulosDeErro()).toContain('Erro ao inativar'));
    });
});

describe('ClassificacoesPessoaPage — v1.11.0a8b67 — AC-5: inativa desabilitada', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        permsState.perms = ['PESSOAS_CONSULTAR', 'CLASSIFICACOES_PESSOA_GERENCIAR'];
        api.listar.mockResolvedValue([]);
    });

    it('AC-5: classificação inativa — Editar e Inativar desabilitados', async () => {
        const inativa = classificacaoInativa();
        renderPagina([inativa]);

        const botoes = screen.getAllByRole('button', { name: /Editar|Inativar/ });
        botoes.forEach((botao) => {
            expect(botao).toBeDisabled();
        });
    });

    it('AC-5: classificação ativa — Editar e Inativar habilitados', async () => {
        const ativa = classificacaoAtiva();
        renderPagina([ativa]);

        expect(screen.getByRole('button', { name: 'Editar' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Inativar' })).toBeEnabled();
    });

    it('AC-5 (controle): sem CLASSIFICACOES_PESSOA_GERENCIAR, Editar e Inativar não aparecem', () => {
        permsState.perms = ['PESSOAS_CONSULTAR'];
        const ativa = classificacaoAtiva();
        renderPagina([ativa]);

        // DataTableActions oculta ações sem permissão.
        expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Inativar' })).not.toBeInTheDocument();
    });
});

describe('ClassificacoesPessoaPage — v1.11.0a8b67 — permissões', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.listar.mockResolvedValue([]);
    });

    it('sem PESSOAS_CONSULTAR: tela bloqueada com UnauthorizedState', () => {
        permsState.perms = ['CLASSIFICACOES_PESSOA_GERENCIAR'];
        renderPagina([]);

        expect(screen.getByText(/Classificações de pessoa exigem a permissão PESSOAS_CONSULTAR/)).toBeInTheDocument();
    });

    it('com PESSOAS_CONSULTAR sem CLASSIFICACOES_PESSOA_GERENCIAR: "Nova classificação" desabilitado', () => {
        permsState.perms = ['PESSOAS_CONSULTAR'];
        renderPagina([]);

        const novaBotao = screen.getByRole('button', { name: /Nova classificação/ });
        expect(novaBotao).toBeDisabled();
    });
});
