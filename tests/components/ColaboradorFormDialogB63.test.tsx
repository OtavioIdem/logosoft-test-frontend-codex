import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ColaboradorFormDialog } from '@/features/rh/components/RhDialogs';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useCargos } from '@/features/administracao/hooks/useAdministracaoResources';
import { useSetoresOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useJornadas } from '@/features/rh/hooks/useRhResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import type { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { TipoPessoa, EntityStatus } from '@/types/erp';

vi.mock('@/hooks/useOrganizationalContext', () => ({ useOrganizationalContext: vi.fn() }));
vi.mock('@/features/auth/hooks/usePermissions', () => ({ usePermissions: vi.fn() }));
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', () => ({
    useSetoresOptions: vi.fn(),
    useFiliaisOptions: vi.fn()
}));
vi.mock('@/features/administracao/hooks/useAdministracaoResources', () => ({
    useCargos: vi.fn()
}));
vi.mock('@/features/rh/hooks/useRhResources', () => ({
    useJornadas: vi.fn()
}));
vi.mock('@/features/pessoas/hooks/usePessoasResources', () => ({
    usePessoas: vi.fn()
}));
let onEmpresaChangeCallback: ((value: string | null) => void) | null = null;

vi.mock('@/components/forms/EmpresaFilialFields', () => ({
    EmpresaFilialFields: ({ onEmpresaChange }: any) => {
        onEmpresaChangeCallback = onEmpresaChange;
        return <div data-testid="empresa-filial-fields">Empresa/Filial Fields</div>;
    }
}));

vi.mock('@/components/forms/EntitySelect', () => ({
    EntitySelect: ({ loading, emptyMessage, value, options, entityName }: any) => (
        <div data-testid={`entity-select-${entityName}`}>
            {loading && <div>Carregando...</div>}
            {!loading && <div>{emptyMessage}</div>}
            {entityName === 'pessoa' && (
                <>
                    <div data-testid="pessoas-oferecidas">{options?.map((o: any) => o.value).join(',') || 'nenhuma'}</div>
                    <div data-testid="pessoa-selecionada">{value || 'nada'}</div>
                </>
            )}
        </div>
    )
}));

const mockedUseOrganizationalContext = vi.mocked(useOrganizationalContext);
const mockedUsePermissions = vi.mocked(usePermissions);
const mockedUseCargos = vi.mocked(useCargos);
const mockedUseSetoresOptions = vi.mocked(useSetoresOptions);
const mockedUseJornadas = vi.mocked(useJornadas);
const mockedUsePessoas = vi.mocked(usePessoas);

const empresaA = '11111111-1111-1111-1111-111111111111';
const empresaB = '99999999-9999-9999-9999-999999999999';
const cargoId = '33333333-3333-3333-3333-333333333333';
const pessoaA1 = '44444444-4444-4444-4444-444444444444';
const pessoaB1 = '55555555-5555-5555-5555-555555555555';

const pessoaDeA: PessoaResponse = {
    id: pessoaA1,
    nomeRazaoSocial: 'Pessoa da Empresa A',
    nomeFantasia: 'PessoaA',
    documento: '111.111.111-11',
    empresaId: empresaA,
    filialId: null,
    tipoPessoa: TipoPessoa.Fisica,
    inscricaoEstadual: null,
    inscricaoMunicipal: null,
    observacao: null,
    status: EntityStatus.Ativo
};

const pessoaDeB: PessoaResponse = {
    id: pessoaB1,
    nomeRazaoSocial: 'Pessoa da Empresa B',
    nomeFantasia: 'PessoaB',
    documento: '222.222.222-22',
    empresaId: empresaB,
    filialId: null,
    tipoPessoa: TipoPessoa.Fisica,
    inscricaoEstadual: null,
    inscricaoMunicipal: null,
    observacao: null,
    status: EntityStatus.Ativo
};

const renderComQueryClient = (ui: React.ReactNode) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('ColaboradorFormDialog — B63 — pessoaId', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockedUsePermissions.mockReturnValue({
            hasPermission: (code: string) => code === 'PESSOAS_CONSULTAR',
            hasAnyPermission: () => true,
            hasAllPermissions: () => true
        } as any);

        mockedUseCargos.mockReturnValue({
            listQuery: {
                data: [{ id: cargoId, nome: 'Desenvolvedor', empresaId: empresaA }],
                isLoading: false,
                isFetching: false
            }
        } as any);

        mockedUseSetoresOptions.mockReturnValue({
            options: [],
            data: [],
            isLoading: false,
            isFetching: false,
            isFetched: true,
            isError: false,
            blocked: false
        } as any);

        mockedUseJornadas.mockReturnValue({
            data: [],
            isLoading: false,
            isFetching: false
        } as any);
    });

    describe('AC-6: Campo "Pessoa vinculada" trata os quatro estados', () => {
        it('AC-6a: mostra "Carregando..." quando isFetching=true', () => {
            mockedUseOrganizationalContext.mockReturnValue({
                empresaId: empresaA,
                filialId: null,
                isGlobal: false,
                canChangeOrganization: false,
                requiresOrganizationSelection: false,
                snapshot: { empresaId: empresaA, filialId: null, isMaster: false, revision: 1 },
                organizationalScopeKey: 'test'
            } as any);

            mockedUsePessoas.mockReturnValue({
                data: undefined,
                isLoading: true,
                isFetching: true,
                isError: false,
                error: null
            } as any);

            renderComQueryClient(
                <ColaboradorFormDialog visible={true} onHide={vi.fn()} onSubmit={vi.fn()} />
            );

            expect(screen.getByText('Carregando...')).toBeInTheDocument();
        });

        it('AC-6b: mostra "Nenhuma pessoa encontrada" quando data=[]', () => {
            mockedUseOrganizationalContext.mockReturnValue({
                empresaId: empresaA,
                filialId: null,
                isGlobal: false,
                canChangeOrganization: false,
                requiresOrganizationSelection: false,
                snapshot: { empresaId: empresaA, filialId: null, isMaster: false, revision: 1 },
                organizationalScopeKey: 'test'
            } as any);

            mockedUsePessoas.mockReturnValue({
                data: [],
                isLoading: false,
                isFetching: false,
                isError: false,
                error: null
            } as any);

            renderComQueryClient(
                <ColaboradorFormDialog visible={true} onHide={vi.fn()} onSubmit={vi.fn()} />
            );

            expect(screen.getByText('Nenhuma pessoa encontrada para esta empresa.')).toBeInTheDocument();
        });

        it('AC-6c: mostra mensagem de erro quando isError=true', () => {
            mockedUseOrganizationalContext.mockReturnValue({
                empresaId: empresaA,
                filialId: null,
                isGlobal: false,
                canChangeOrganization: false,
                requiresOrganizationSelection: false,
                snapshot: { empresaId: empresaA, filialId: null, isMaster: false, revision: 1 },
                organizationalScopeKey: 'test'
            } as any);

            mockedUsePessoas.mockReturnValue({
                data: undefined,
                isLoading: false,
                isFetching: false,
                isError: true,
                error: new Error('Falha na consulta')
            } as any);

            renderComQueryClient(
                <ColaboradorFormDialog visible={true} onHide={vi.fn()} onSubmit={vi.fn()} />
            );

            expect(screen.getByText('Não foi possível carregar as pessoas agora. Tente novamente.')).toBeInTheDocument();
        });

        it('AC-6d: mostra mensagem quando permissão PESSOAS_CONSULTAR é negada', () => {
            mockedUseOrganizationalContext.mockReturnValue({
                empresaId: empresaA,
                filialId: null,
                isGlobal: false,
                canChangeOrganization: false,
                requiresOrganizationSelection: false,
                snapshot: { empresaId: empresaA, filialId: null, isMaster: false, revision: 1 },
                organizationalScopeKey: 'test'
            } as any);

            mockedUsePermissions.mockReturnValue({
                hasPermission: () => false,
                hasAnyPermission: () => false,
                hasAllPermissions: () => false
            } as any);

            mockedUsePessoas.mockReturnValue({
                data: [],
                isLoading: false,
                isFetching: false,
                isError: false,
                error: null
            } as any);

            renderComQueryClient(
                <ColaboradorFormDialog visible={true} onHide={vi.fn()} onSubmit={vi.fn()} />
            );

            expect(screen.getByText('Consulta de pessoas indisponível: seu usuário não possui PESSOAS_CONSULTAR.')).toBeInTheDocument();
        });
    });

    describe('AC-4: Trocar empresa limpa pessoaId e refaz a busca', () => {
        it('AC-4: Pessoa de A deixa de ser oferecida após trocar para B', async () => {
            // Setup inicial: empresa A com pessoa de A disponível
            mockedUseOrganizationalContext.mockReturnValue({
                empresaId: empresaA,
                filialId: null,
                isGlobal: false,
                canChangeOrganization: false,
                requiresOrganizationSelection: false,
                snapshot: { empresaId: empresaA, filialId: null, isMaster: false, revision: 1 },
                organizationalScopeKey: `scope-${empresaA}`
            } as any);

            mockedUsePessoas.mockImplementation((query: any) => {
                // Retorna pessoas de A quando empresaId é A, pessoas de B quando é B, vazio caso contrário
                const empresaId = query?.empresaId;
                if (empresaId === empresaA) {
                    return {
                        data: [pessoaDeA],
                        isLoading: false,
                        isFetching: false,
                        isError: false,
                        error: null
                    } as any;
                }
                if (empresaId === empresaB) {
                    return {
                        data: [pessoaDeB],
                        isLoading: false,
                        isFetching: false,
                        isError: false,
                        error: null
                    } as any;
                }
                // Quando empresaId está vazio (inicial do formulário)
                return {
                    data: [],
                    isLoading: false,
                    isFetching: false,
                    isError: false,
                    error: null
                } as any;
            });

            renderComQueryClient(
                <ColaboradorFormDialog visible={true} onHide={vi.fn()} onSubmit={vi.fn()} />
            );

            // Disparar mudança para empresa A (simula escolher empresa no formulário)
            expect(onEmpresaChangeCallback).not.toBeNull();
            onEmpresaChangeCallback?.(empresaA);

            // Aguardar que pessoa de A apareça oferecida
            await waitFor(() => {
                expect(screen.getByTestId('pessoas-oferecidas')).toHaveTextContent(pessoaA1);
            });
            expect(screen.getByTestId('pessoas-oferecidas')).not.toHaveTextContent(pessoaB1);

            // Trocar para empresa B disparando o handler interno
            onEmpresaChangeCallback?.(empresaB);

            // Aguardar que pessoa de B apareça oferecida
            await waitFor(() => {
                expect(screen.getByTestId('pessoas-oferecidas')).toHaveTextContent(pessoaB1);
            });
            expect(screen.getByTestId('pessoas-oferecidas')).not.toHaveTextContent(pessoaA1);

            // Afirmar que a seleção anterior foi limpa (pessoa-selecionada deve estar vazia)
            expect(screen.getByTestId('pessoa-selecionada')).toHaveTextContent('nada');
        });
    });

    describe('Integração básica', () => {
        it('renderiza o diálogo com o título e label do campo', () => {
            mockedUseOrganizationalContext.mockReturnValue({
                empresaId: empresaA,
                filialId: null,
                isGlobal: false,
                canChangeOrganization: false,
                requiresOrganizationSelection: false,
                snapshot: { empresaId: empresaA, filialId: null, isMaster: false, revision: 1 },
                organizationalScopeKey: 'test'
            } as any);

            mockedUsePessoas.mockReturnValue({
                data: [],
                isLoading: false,
                isFetching: false,
                isError: false,
                error: null
            } as any);

            renderComQueryClient(
                <ColaboradorFormDialog visible={true} onHide={vi.fn()} onSubmit={vi.fn()} />
            );

            expect(screen.getByText('Admitir colaborador')).toBeInTheDocument();
            expect(screen.getByText('Pessoa vinculada')).toBeInTheDocument();
        });
    });
});
