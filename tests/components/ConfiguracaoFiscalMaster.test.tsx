import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfiguracaoFiscalPage } from '@/features/fiscal/components/ConfiguracaoFiscalPage';
import { CODIGO_CONFIGURACAO, CONFIGURACAO_FISCAL_ERROS, CONFIGURACAO_FISCAL_FILIAL, CONFIGURACAO_FISCAL_PAGINA } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { sefazSimuladaQueryKey } from '@/features/fiscal/hooks/useSefazSimulada';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';
import {
    certificadoMatriz,
    EMPRESA_OUTRA_ID,
    EMPRESA_USUARIO_ID,
    empresaConfigurada,
    erroServidor,
    FILIAL_ID,
    instalarServidorFiscal,
    RotaServidor
} from '@/tests/mocks/fiscal/configuracaoFiscalServidor';

// D114 (v1.11.0a8b82.c3), tela inteira com o cliente HTTP REAL e o interceptor de contexto REAL. Só o contexto
// organizacional, a permissão e a sessão são mockados (como em ConfiguracaoFiscalPage.test.tsx); o servidor falso
// responde no adapter e registra cada request final.
//
// Atenção: estes testes NÃO injetam snapshot no interceptor. Por isso os casos do master (AC-4b e AC-6) mostram o que
// acontece com a chamada real: hoje o `contextoDaChamada(master)` não entrega o snapshot e a política recusa antes
// da rede (ver o relatório da rodada c3).

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

const contextoPara = (empresaId: string | null, isMaster: boolean, revision = 1) => {
    const snapshot = Object.freeze({ empresaId, filialId: null, isMaster, revision });
    return {
        empresaId,
        filialId: null,
        isGlobal: false,
        canChangeOrganization: isMaster,
        requiresOrganizationSelection: false,
        snapshot,
        organizationalScopeKey: organizationalScopeKey(snapshot),
        setEmpresaId: vi.fn(),
        setFilialId: vi.fn()
    };
};

const sessao = (permissoes: string[], empresaUsuario: string, contextoEmpresa: string | null, isMaster: boolean) => {
    mockedUsePermissions.mockReturnValue({
        hasPermission: (code: string) => permissoes.includes(code),
        hasAnyPermission: (codes: string[]) => codes.some((code) => permissoes.includes(code)),
        hasAllPermissions: (codes: string[]) => codes.every((code) => permissoes.includes(code))
    });
    mockedUseAuth.mockReturnValue({ user: { id: 'u-1', nome: 'Operador', email: 'op@logosoft.local', empresaId: empresaUsuario, permissoes } });
    const contexto = contextoPara(contextoEmpresa, isMaster);
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

const PERMISSOES_GERENCIAR = ['FISCAL_CONFIGURACAO_CONSULTAR', 'FISCAL_CONFIGURACAO_GERENCIAR'];
const EMPRESA_CONFIG_PATH = '/api/fiscal/configuracao/empresa';
const CERTIFICADOS_PATH = '/api/fiscal/configuracao/certificados';

// Servidor que responde por empresa do seletor: a configuração e os certificados mudam conforme `empresaId`.
const rotasPorEmpresa: Record<string, RotaServidor> = {
    [`GET ${EMPRESA_CONFIG_PATH}`]: (chamada) => ({ status: 200, body: empresaConfigurada({ ambiente: chamada.params.empresaId === EMPRESA_OUTRA_ID ? 2 : 1 }) }),
    [`GET ${CERTIFICADOS_PATH}`]: (chamada) => ({
        status: 200,
        body: [certificadoMatriz({ apelido: chamada.params.empresaId === EMPRESA_OUTRA_ID ? 'Certificado Empresa Dois' : 'Certificado Empresa Um' })]
    })
};

describe('D114 — AC-3: master sem empresa no seletor', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('nenhuma requisição à configuração fiscal sai, e a página pede para escolher a empresa', async () => {
        sessao(PERMISSOES_GERENCIAR, EMPRESA_USUARIO_ID, null, true);
        const servidor = instalarServidorFiscal({});
        restaurar = servidor.restaurar;

        const { queryClient } = renderPagina();
        // O selo do health já respondeu: a ausência de requisições vale depois do primeiro carregamento da tela.
        await waitFor(() => expect(queryClient.getQueryState(sefazSimuladaQueryKey())?.status).toBe('success'));

        expect(await screen.findByText(`${CONFIGURACAO_FISCAL_PAGINA.masterSemEmpresaTitulo}. ${CONFIGURACAO_FISCAL_PAGINA.masterSemEmpresa}`)).toBeInTheDocument();
        expect(servidor.chamadas.filter((chamada) => chamada.url.startsWith('/api/fiscal/configuracao'))).toHaveLength(0);
        // Sem empresa, as abas não são montadas: nenhuma aba de configuração aparece.
        expect(screen.queryByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaEmpresa })).not.toBeInTheDocument();
    });
});

describe('D114 — AC-4: master com empresa no seletor', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('sem aviso de divergência, com a mensagem da empresa selecionada, e a aba Filiais liberada', async () => {
        // Seletor em E2 (outra empresa do usuário, que é E1): para o master não existe divergência.
        sessao(PERMISSOES_GERENCIAR, EMPRESA_USUARIO_ID, EMPRESA_OUTRA_ID, true);
        const servidor = instalarServidorFiscal(rotasPorEmpresa);
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderPagina();

        expect(await screen.findByText(CONFIGURACAO_FISCAL_PAGINA.masterEmpresaSelecionada)).toBeInTheDocument();
        expect(screen.queryByText(CONFIGURACAO_FISCAL_PAGINA.avisoContextoDivergente)).not.toBeInTheDocument();

        await usuario.click(screen.getByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaFiliais }));
        expect(await screen.findByRole('combobox', { name: CONFIGURACAO_FISCAL_FILIAL.selecionar })).toBeEnabled();
        expect(screen.queryByText(CONFIGURACAO_FISCAL_FILIAL.contextoDivergenteBloqueio)).not.toBeInTheDocument();
    });

    it('AC-4 (requisições): a configuração é consultada com a empresa do seletor, E2 na query', async () => {
        sessao(PERMISSOES_GERENCIAR, EMPRESA_USUARIO_ID, EMPRESA_OUTRA_ID, true);
        const servidor = instalarServidorFiscal(rotasPorEmpresa);
        restaurar = servidor.restaurar;

        renderPagina();

        await waitFor(() => expect(servidor.chamadas.filter((chamada) => chamada.url === EMPRESA_CONFIG_PATH).length).toBeGreaterThan(0));
        const consultas = servidor.chamadas.filter((chamada) => chamada.url === EMPRESA_CONFIG_PATH);
        expect(consultas.every((chamada) => chamada.params.empresaId === EMPRESA_OUTRA_ID)).toBe(true);
        expect(consultas.every((chamada) => !('filialId' in chamada.params))).toBe(true);
    });
});

describe('D114 — AC-5: não master com contexto divergente (D112 preservada)', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('mostra o aviso e bloqueia a aba Filiais, sem consultar nenhuma filial', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR'], EMPRESA_USUARIO_ID, EMPRESA_OUTRA_ID, false);
        const servidor = instalarServidorFiscal({ [`GET ${EMPRESA_CONFIG_PATH}`]: { status: 200, body: empresaConfigurada() } });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderPagina();

        expect(await screen.findByText(CONFIGURACAO_FISCAL_PAGINA.avisoContextoDivergente)).toBeInTheDocument();
        await usuario.click(screen.getByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaFiliais }));
        expect(await screen.findByText(CONFIGURACAO_FISCAL_FILIAL.contextoDivergenteBloqueio)).toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: CONFIGURACAO_FISCAL_FILIAL.selecionar })).not.toBeInTheDocument();
        expect(servidor.chamadas.filter((chamada) => chamada.url.startsWith('/api/fiscal/configuracao/filiais'))).toHaveLength(0);
    });
});

describe('D114 — AC-6: master troca a empresa no seletor (E1 -> E2)', () => {
    let restaurar: (() => void) | undefined;
    beforeEach(() => {
        restaurar = undefined;
    });
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('as requisições seguintes levam E2, e nada da empresa E1 continua visível', async () => {
        const contextoE1 = sessao(PERMISSOES_GERENCIAR, EMPRESA_USUARIO_ID, EMPRESA_USUARIO_ID, true);
        const servidor = instalarServidorFiscal(rotasPorEmpresa);
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        const { rerender, queryClient } = renderPagina();
        await usuario.click(await screen.findByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaCertificados }));
        expect(await screen.findByText('Certificado Empresa Um')).toBeInTheDocument();

        // Troca no seletor: o master vai de E1 para E2. Nova revisão do contexto, nova chave.
        const antesDaTroca = servidor.chamadas.length;
        const contextoE2 = contextoPara(EMPRESA_OUTRA_ID, true, 2);
        mockedUseOrganizationalContext.mockReturnValue({ ...contextoE2, setEmpresaId: contextoE1.setEmpresaId });
        rerender(
            <QueryClientProvider client={queryClient}>
                <ConfiguracaoFiscalPage />
            </QueryClientProvider>
        );

        expect(await screen.findByText('Certificado Empresa Dois')).toBeInTheDocument();
        expect(screen.queryByText('Certificado Empresa Um')).not.toBeInTheDocument();

        const depois = servidor.chamadas.slice(antesDaTroca).filter((chamada) => chamada.url.startsWith('/api/fiscal/configuracao'));
        expect(depois.length).toBeGreaterThan(0);
        expect(depois.every((chamada) => chamada.params.empresaId === EMPRESA_OUTRA_ID)).toBe(true);
    });
});

describe('D114 — AC-7: EmpresaObrigatoria de backend sem a v1.26.23 vira erro legível', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('um 400 com Fiscal.Configuracao.EmpresaObrigatoria mostra o texto do mapa e a tela segue montada', async () => {
        sessao(['FISCAL_CONFIGURACAO_CONSULTAR'], EMPRESA_USUARIO_ID, EMPRESA_USUARIO_ID, false);
        const servidor = instalarServidorFiscal({
            [`GET ${EMPRESA_CONFIG_PATH}`]: erroServidor(400, CODIGO_CONFIGURACAO.empresaObrigatoria, 'Empresa obrigatória'),
            [`GET ${CERTIFICADOS_PATH}`]: { status: 200, body: [] }
        });
        restaurar = servidor.restaurar;

        renderPagina();

        expect(await screen.findByText(CONFIGURACAO_FISCAL_ERROS[CODIGO_CONFIGURACAO.empresaObrigatoria])).toBeInTheDocument();
        // A tela não quebrou: título e abas continuam.
        expect(screen.getByRole('heading', { name: CONFIGURACAO_FISCAL_PAGINA.titulo })).toBeInTheDocument();
        expect(within(screen.getByRole('tablist')).getByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaEmpresa })).toBeInTheDocument();
    });
});
