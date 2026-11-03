import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfiguracaoFiscalPage } from '@/features/fiscal/components/ConfiguracaoFiscalPage';
import { CONFIGURACAO_FISCAL_EMPRESA, CONFIGURACAO_FISCAL_FILIAL, CONFIGURACAO_FISCAL_PAGINA, CONFIGURACAO_FISCAL_PERMISSAO, CERTIFICADOS_DIGITAIS } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { sefazSimuladaQueryKey } from '@/features/fiscal/hooks/useSefazSimulada';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';
import {
    EMPRESA_USUARIO_ID,
    erroServidor,
    FILIAL_ID,
    instalarServidorFiscal,
    empresaConfigurada,
    filialConfigurada
} from '@/tests/mocks/fiscal/configuracaoFiscalServidor';

// Página inteira, com as três abas reais. Contexto, permissão e sessão são mockados (como em SeriesFiscaisPage.test.tsx);
// o cliente HTTP, o cache e os formulários são reais, e o servidor falso responde no adapter.

// Dublê padrão do repo para o Dropdown do PrimeReact: o seletor de filial (SearchSelect) vira um <select> nativo.
vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/hooks/useOrganizationalContext', () => ({ useOrganizationalContext: vi.fn() }));
vi.mock('@/features/auth/hooks/usePermissions', () => ({ usePermissions: vi.fn() }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', () => ({
    useFiliaisOptions: () => ({
        options: [{ label: 'Filial Centro', value: FILIAL_ID }],
        blocked: false,
        blockedMessage: '',
        error: null,
        isFetching: false
    })
}));

const mockedUseOrganizationalContext = vi.mocked(useOrganizationalContext) as unknown as ReturnType<typeof vi.fn>;
const mockedUsePermissions = vi.mocked(usePermissions) as unknown as ReturnType<typeof vi.fn>;
const mockedUseAuth = vi.mocked(useAuth) as unknown as ReturnType<typeof vi.fn>;

const EMPRESA_OUTRA_ID = '99999999-9999-9999-9999-999999999999';

const contextoPara = (empresaId: string | null, isMaster = false, filialId: string | null = null) => {
    const snapshot = Object.freeze({ empresaId, filialId, isMaster, revision: 1 });
    return {
        empresaId,
        filialId,
        isGlobal: false,
        canChangeOrganization: true,
        requiresOrganizationSelection: false,
        snapshot,
        organizationalScopeKey: organizationalScopeKey(snapshot),
        setEmpresaId: vi.fn(),
        setFilialId: vi.fn()
    };
};

// Padrão: usuário NÃO master (D114). Só o master passa isMaster = true.
const sessao = (permissoes: string[], empresaUsuario = EMPRESA_USUARIO_ID, contextoEmpresa: string | null = EMPRESA_USUARIO_ID, isMaster = false, filialContexto: string | null = null) => {
    mockedUsePermissions.mockReturnValue({
        hasPermission: (code: string) => permissoes.includes(code),
        hasAnyPermission: (codes: string[]) => codes.some((code) => permissoes.includes(code)),
        hasAllPermissions: (codes: string[]) => codes.every((code) => permissoes.includes(code))
    });
    mockedUseAuth.mockReturnValue({ user: { id: 'u-1', nome: 'Operador', email: 'op@logosoft.local', empresaId: empresaUsuario, permissoes } });
    const contexto = contextoPara(contextoEmpresa, isMaster, filialContexto);
    mockedUseOrganizationalContext.mockReturnValue(contexto);
    return contexto;
};

const renderPagina = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const utils = render(
        <QueryClientProvider client={queryClient}>
            <ConfiguracaoFiscalPage />
        </QueryClientProvider>
    );
    return { queryClient, ...utils };
};

const rotasBase = (extra: Record<string, unknown> = {}) => ({
    'GET /api/fiscal/configuracao/empresa': erroServidor(404, 'Recurso.NaoEncontrado'),
    'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] },
    ...extra
});

describe('AC-1: sessão sem nenhuma permissão de configuração não vê a tela', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('mostra o acesso negado com o nome da permissão e não consulta nenhuma rota', () => {
        sessao(['FISCAL_CONSULTAR']);
        const servidor = instalarServidorFiscal(rotasBase());
        restaurar = servidor.restaurar;

        renderPagina();

        expect(screen.getByText(CONFIGURACAO_FISCAL_PERMISSAO.unauthorizedDescription)).toBeInTheDocument();
        expect(servidor.chamadas.filter((chamada) => chamada.url.startsWith('/api/fiscal/configuracao'))).toHaveLength(0);
    });
});

describe('AC-1: sessão só com CONSULTAR abre a tela e não vê nenhum botão de gravar', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('nas três abas, não há Salvar, Cadastrar, Inativar, Reativar nem Verificar', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR']);
        const servidor = instalarServidorFiscal(rotasBase({ 'GET /api/fiscal/configuracao/empresa': { status: 200, body: empresaConfigurada() } }));
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderPagina();
        expect(await screen.findByRole('heading', { name: CONFIGURACAO_FISCAL_PAGINA.titulo })).toBeInTheDocument();
        expect(await screen.findByText(/Somente leitura/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.salvar })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.inativar })).not.toBeInTheDocument();

        await usuario.click(screen.getByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaCertificados }));
        // Espera o conteúdo da aba de certificados antes de afirmar a ausência; senão a ausência valeria por aba não renderizada.
        expect(await screen.findByText(CERTIFICADOS_DIGITAIS.cardTitulo)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: CERTIFICADOS_DIGITAIS.cadastrar })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Verificar/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Inativar/ })).not.toBeInTheDocument();
    });

    it('com GERENCIAR, a mesma tela mostra o salvar da empresa (controle positivo do teste acima)', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR', 'FISCAL_CONFIGURACAO_GERENCIAR']);
        const servidor = instalarServidorFiscal(rotasBase());
        restaurar = servidor.restaurar;

        renderPagina();

        expect(await screen.findByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.salvar })).toBeInTheDocument();
        expect(screen.queryByText(/Somente leitura/)).not.toBeInTheDocument();
    });
});

describe('AC-10: selo "SEFAZ simulada" só com fiscal.mock === true no health', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('com fiscal.mock true, o selo aparece junto do aviso de que Verificar não prova o arquivo montado', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR']);
        const servidor = instalarServidorFiscal(rotasBase(), { health: { fiscal: { mock: true, ambiente: 'Homologacao' } } });
        restaurar = servidor.restaurar;

        const { queryClient } = renderPagina();

        expect(await screen.findByLabelText(CONFIGURACAO_FISCAL_PAGINA.seloSefazSimulada)).toBeInTheDocument();
        expect(screen.getByText(CONFIGURACAO_FISCAL_PAGINA.seloSefazSimuladaDetalhe)).toBeInTheDocument();
        await waitFor(() => expect(queryClient.getQueryState(sefazSimuladaQueryKey())?.status).toBe('success'));
    });

    it('sem o bloco fiscal no health, o selo não aparece e nada afirma SEFAZ real', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR']);
        const servidor = instalarServidorFiscal(rotasBase());
        restaurar = servidor.restaurar;

        const { queryClient } = renderPagina();
        // A ausência do selo só vale depois que o health respondeu; senão o teste passaria sem ter verificado nada.
        await waitFor(() => expect(queryClient.getQueryState(sefazSimuladaQueryKey())?.status).toBe('success'));

        expect(screen.queryByLabelText(CONFIGURACAO_FISCAL_PAGINA.seloSefazSimulada)).not.toBeInTheDocument();
        expect(screen.queryByText(CONFIGURACAO_FISCAL_PAGINA.seloSefazSimuladaDetalhe)).not.toBeInTheDocument();
    });

    it('com fiscal.mock false, também não aparece', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR']);
        const servidor = instalarServidorFiscal(rotasBase(), { health: { fiscal: { mock: false, ambiente: 'Producao' } } });
        restaurar = servidor.restaurar;

        const { queryClient } = renderPagina();
        await waitFor(() => expect(queryClient.getQueryState(sefazSimuladaQueryKey())?.status).toBe('success'));

        expect(screen.queryByLabelText(CONFIGURACAO_FISCAL_PAGINA.seloSefazSimulada)).not.toBeInTheDocument();
    });
});

describe('AC-11: usuário não master com empresa selecionada diferente da do usuário vê o aviso (D114)', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('contexto em outra empresa: o aviso aparece', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR'], EMPRESA_USUARIO_ID, EMPRESA_OUTRA_ID);
        const servidor = instalarServidorFiscal(rotasBase());
        restaurar = servidor.restaurar;

        renderPagina();

        expect(await screen.findByText(CONFIGURACAO_FISCAL_PAGINA.avisoContextoDivergente)).toBeInTheDocument();
    });

    it('master com empresa selecionada diferente da do usuário: sem aviso, porque para o master não há divergência (D114)', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR'], EMPRESA_USUARIO_ID, EMPRESA_OUTRA_ID, true);
        const servidor = instalarServidorFiscal(rotasBase());
        restaurar = servidor.restaurar;

        renderPagina();

        // A mensagem de configuração do master aparece; a de divergência não.
        expect(await screen.findByText(CONFIGURACAO_FISCAL_PAGINA.masterEmpresaSelecionada)).toBeInTheDocument();
        expect(screen.queryByText(CONFIGURACAO_FISCAL_PAGINA.avisoContextoDivergente)).not.toBeInTheDocument();
    });

    it('contexto na mesma empresa do usuário (com caixa diferente): sem aviso', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR'], EMPRESA_USUARIO_ID, EMPRESA_USUARIO_ID.toUpperCase());
        const servidor = instalarServidorFiscal(rotasBase());
        restaurar = servidor.restaurar;

        renderPagina();

        expect(await screen.findByRole('heading', { name: CONFIGURACAO_FISCAL_PAGINA.titulo })).toBeInTheDocument();
        expect(screen.queryByText(CONFIGURACAO_FISCAL_PAGINA.avisoContextoDivergente)).not.toBeInTheDocument();
    });
});

// D115 (AC-3): a filial é a do header. Trocar só a filial no header troca a filial exibida; nada da anterior fica.
describe('trocar a filial no header troca a filial exibida (D115, AC-3)', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('a filial F1 some e a F2 aparece; as requisições seguintes vão só à F2', async () => {
        const FILIAL_F2 = '77777777-7777-7777-7777-777777777777';
        const contexto = sessao(['FISCAL_CONFIGURACAO_CONSULTAR', 'FISCAL_CONFIGURACAO_GERENCIAR'], EMPRESA_USUARIO_ID, EMPRESA_USUARIO_ID, false, FILIAL_ID);
        const servidor = instalarServidorFiscal({
            [`GET /api/fiscal/configuracao/filiais/${FILIAL_ID}`]: { status: 200, body: filialConfigurada({ serieNFePadrao: '1' }) },
            [`GET /api/fiscal/configuracao/filiais/${FILIAL_F2}`]: { status: 200, body: filialConfigurada({ id: '88888888-8888-8888-8888-888888888888', filialId: FILIAL_F2, serieNFePadrao: '2' }) }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        const { rerender, queryClient } = renderPagina();
        await usuario.click(await screen.findByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaFiliais }));
        expect(await screen.findByLabelText(CONFIGURACAO_FISCAL_FILIAL.serieNFePadrao)).toHaveValue('1');

        // Troca só a filial no header (mesma empresa): nova revisão do contexto, nova chave.
        const antesDaTroca = servidor.chamadas.length;
        const snapshotF2 = Object.freeze({ empresaId: EMPRESA_USUARIO_ID, filialId: FILIAL_F2, isMaster: false, revision: 2 });
        mockedUseOrganizationalContext.mockReturnValue({ ...contexto, filialId: FILIAL_F2, snapshot: snapshotF2, organizationalScopeKey: organizationalScopeKey(snapshotF2) });
        rerender(
            <QueryClientProvider client={queryClient}>
                <ConfiguracaoFiscalPage />
            </QueryClientProvider>
        );

        expect(await screen.findByLabelText(CONFIGURACAO_FISCAL_FILIAL.serieNFePadrao)).toHaveValue('2');
        const depois = servidor.chamadas.slice(antesDaTroca).filter((chamada) => chamada.url.includes('/filiais/'));
        expect(depois.length).toBeGreaterThan(0);
        expect(depois.every((chamada) => chamada.url === `/api/fiscal/configuracao/filiais/${FILIAL_F2}`)).toBe(true);
    });
});
