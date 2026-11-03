import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfiguracaoFiscalPage } from '@/features/fiscal/components/ConfiguracaoFiscalPage';
import { CERTIFICADO_CADASTRAR_DIALOG, CERTIFICADOS_DIGITAIS, CONFIGURACAO_FISCAL_FILIAL, CONFIGURACAO_FISCAL_PAGINA } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';
import {
    certificadoMatriz,
    EMPRESA_OUTRA_ID,
    EMPRESA_USUARIO_ID,
    empresaConfigurada,
    FILIAL_ID,
    filialConfigurada,
    instalarServidorFiscal,
    RotaServidor
} from '@/tests/mocks/fiscal/configuracaoFiscalServidor';

// D115 (v1.11.0a8b82.c4): empresa e filial vêm SÓ do seletor de contexto do header. Não há seletor de empresa nem de
// filial em nenhuma aba nem no cadastro de certificado. Cliente HTTP real, interceptor real, servidor falso no adapter.
// Só contexto, permissão e sessão são mockados.

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/hooks/useOrganizationalContext', () => ({ useOrganizationalContext: vi.fn() }));
vi.mock('@/features/auth/hooks/usePermissions', () => ({ usePermissions: vi.fn() }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', () => ({
    useFiliaisOptions: () => ({ options: [{ label: 'Filial Centro', value: FILIAL_ID }], blocked: false, blockedMessage: '', error: null, isFetching: false })
}));

const mockedUseOrganizationalContext = vi.mocked(useOrganizationalContext) as unknown as ReturnType<typeof vi.fn>;
const mockedUsePermissions = vi.mocked(usePermissions) as unknown as ReturnType<typeof vi.fn>;
const mockedUseAuth = vi.mocked(useAuth) as unknown as ReturnType<typeof vi.fn>;

const FILIAL_F2 = '77777777-7777-7777-7777-777777777777';
const PERMISSOES = ['FISCAL_CONFIGURACAO_CONSULTAR', 'FISCAL_CONFIGURACAO_GERENCIAR'];
const GET_EMPRESA = 'GET /api/fiscal/configuracao/empresa';
const GET_CERTIFICADOS = 'GET /api/fiscal/configuracao/certificados';
const POST_CERTIFICADO = 'POST /api/fiscal/configuracao/certificados';
const filialUrl = (id: string) => `/api/fiscal/configuracao/filiais/${id}`;

const contextoPara = (empresaId: string | null, isMaster: boolean, filialId: string | null, revision = 1) => {
    const snapshot = Object.freeze({ empresaId, filialId, isMaster, revision });
    return {
        empresaId,
        filialId,
        isGlobal: false,
        canChangeOrganization: isMaster,
        requiresOrganizationSelection: false,
        snapshot,
        organizationalScopeKey: organizationalScopeKey(snapshot),
        setEmpresaId: vi.fn(),
        setFilialId: vi.fn()
    };
};

const sessao = (empresaContexto: string | null, isMaster: boolean, filialContexto: string | null, usuarioEmpresa = EMPRESA_USUARIO_ID) => {
    mockedUsePermissions.mockReturnValue({
        hasPermission: (code: string) => PERMISSOES.includes(code),
        hasAnyPermission: (codes: string[]) => codes.some((code) => PERMISSOES.includes(code)),
        hasAllPermissions: (codes: string[]) => codes.every((code) => PERMISSOES.includes(code))
    });
    mockedUseAuth.mockReturnValue({ user: { id: 'u-1', nome: 'Operador', email: 'op@logosoft.local', empresaId: usuarioEmpresa, permissoes: PERMISSOES } });
    const contexto = contextoPara(empresaContexto, isMaster, filialContexto);
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

const rotasBase = (filiais: Record<string, RotaServidor> = {}): Record<string, RotaServidor> => ({
    [GET_EMPRESA]: { status: 200, body: empresaConfigurada() },
    [GET_CERTIFICADOS]: { status: 200, body: [] },
    [`GET ${filialUrl(FILIAL_ID)}`]: { status: 200, body: filialConfigurada({ serieNFePadrao: '1' }) },
    [`PUT ${filialUrl(FILIAL_ID)}`]: (chamada) => ({ status: 200, body: filialConfigurada({ ...(chamada.body as Record<string, unknown>), serieNFePadrao: '1' }) }),
    [`GET ${filialUrl(FILIAL_F2)}`]: { status: 200, body: filialConfigurada({ id: '88888888-8888-8888-8888-888888888888', filialId: FILIAL_F2, serieNFePadrao: '2' }) },
    [`PUT ${filialUrl(FILIAL_F2)}`]: (chamada) => ({ status: 200, body: filialConfigurada({ ...(chamada.body as Record<string, unknown>), filialId: FILIAL_F2, serieNFePadrao: '2' }) }),
    ...filiais
});

// Preenche o cadastro com o mínimo válido e envia. Mesmos passos do CertificadosDigitaisTab.test.tsx.
const preencherECadastrar = async (usuario: ReturnType<typeof userEvent.setup>) => {
    const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo });
    await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.apelido), 'Certificado Novo');
    await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint), 'SEGREDO-TESTE-THUMB-NOVO');
    fireEvent.input(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.validoAte), { target: { value: '31/12/2026 23:59' } });
    await usuario.click(within(dialogo).getByRole('button', { name: CERTIFICADO_CADASTRAR_DIALOG.confirmLabel }));
    return dialogo;
};

const abrirCadastro = async (usuario: ReturnType<typeof userEvent.setup>) => {
    await usuario.click(await screen.findByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaCertificados }));
    await usuario.click(await screen.findByRole('button', { name: CERTIFICADOS_DIGITAIS.cadastrar }));
};

// Combobox cujo nome fala de empresa ou filial: é o que o D115 remove. Vale para qualquer aba e para o diálogo.
// Pelo nome acessível (role + label), como o usuário enxerga; não pelo id do elemento.
const seletoresDeEmpresaOuFilial = (raiz: HTMLElement | Document) => within(raiz as HTMLElement).queryAllByRole('combobox', { name: /empresa|filial/i });

afterEach(() => {
    vi.clearAllMocks();
});

describe('D115 — AC-1: nenhum seletor de empresa nem de filial na tela', () => {
    it('nas três abas e no diálogo de cadastro não há combobox de empresa ou de filial', async () => {
        sessao(EMPRESA_USUARIO_ID, false, FILIAL_ID);
        const servidor = instalarServidorFiscal(rotasBase());
        const usuario = userEvent.setup();
        try {
            renderPagina();
            expect(await screen.findByRole('heading', { name: CONFIGURACAO_FISCAL_PAGINA.titulo })).toBeInTheDocument();
            expect(seletoresDeEmpresaOuFilial(document.body)).toHaveLength(0);

            await usuario.click(screen.getByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaFiliais }));
            await screen.findByText(CONFIGURACAO_FISCAL_FILIAL.filialDoContexto);
            expect(seletoresDeEmpresaOuFilial(document.body)).toHaveLength(0);

            await abrirCadastro(usuario);
            const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo });
            expect(seletoresDeEmpresaOuFilial(dialogo)).toHaveLength(0);
            expect(within(dialogo).queryByRole('combobox', { name: /empresa/i })).not.toBeInTheDocument();
            expect(within(dialogo).queryByRole('combobox', { name: /filial/i })).not.toBeInTheDocument();
        } finally {
            servidor.restaurar();
        }
    });
});

describe('D115 — AC-2: a aba Filiais usa a filial do header', () => {
    it('com F1 no header, GET e PUT vão a /filiais/F1', async () => {
        sessao(EMPRESA_USUARIO_ID, false, FILIAL_ID);
        const servidor = instalarServidorFiscal(rotasBase());
        const usuario = userEvent.setup();
        try {
            renderPagina();
            await usuario.click(await screen.findByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaFiliais }));
            await waitFor(() => expect(servidor.chamadasDe(`GET ${filialUrl(FILIAL_ID)}`)).toHaveLength(1));

            await usuario.click(await screen.findByRole('button', { name: CONFIGURACAO_FISCAL_FILIAL.salvar }));
            await waitFor(() => expect(servidor.chamadasDe(`PUT ${filialUrl(FILIAL_ID)}`)).toHaveLength(1));
            // Nenhuma chamada de filial foi para outro id.
            expect(servidor.chamadas.filter((chamada) => chamada.url.includes('/filiais/') && !chamada.url.endsWith(FILIAL_ID))).toHaveLength(0);
        } finally {
            servidor.restaurar();
        }
    });

    it('sem filial no header, a aba pede para escolher no header e nenhuma requisição vai a /filiais/', async () => {
        sessao(EMPRESA_USUARIO_ID, false, null);
        const servidor = instalarServidorFiscal(rotasBase());
        const usuario = userEvent.setup();
        try {
            const { queryClient } = renderPagina();
            await waitFor(() => expect(queryClient.getQueryState(['health', 'fiscal'])?.status).toBe('success'));
            await usuario.click(await screen.findByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaFiliais }));

            expect(await screen.findByText(CONFIGURACAO_FISCAL_FILIAL.selecionarNoContexto)).toBeInTheDocument();
            expect(servidor.chamadas.filter((chamada) => chamada.url.includes('/filiais/'))).toHaveLength(0);
        } finally {
            servidor.restaurar();
        }
    });
});

describe('D115 — AC-3 e AC-6: trocar a filial (e a empresa, no master) no header não mistura as duas', () => {
    it('troca F1 por F2 no header: a filial exibida é F2 e as requisições seguintes só vão a F2', async () => {
        sessao(EMPRESA_USUARIO_ID, false, FILIAL_ID);
        const servidor = instalarServidorFiscal(rotasBase());
        const usuario = userEvent.setup();
        try {
            const { rerender, queryClient } = renderPagina();
            await usuario.click(await screen.findByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaFiliais }));
            expect(await screen.findByLabelText(CONFIGURACAO_FISCAL_FILIAL.serieNFePadrao)).toHaveValue('1');

            const antes = servidor.chamadas.length;
            const contexto = contextoPara(EMPRESA_USUARIO_ID, false, FILIAL_F2, 2);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            rerender(
                <QueryClientProvider client={queryClient}>
                    <ConfiguracaoFiscalPage />
                </QueryClientProvider>
            );

            expect(await screen.findByLabelText(CONFIGURACAO_FISCAL_FILIAL.serieNFePadrao)).toHaveValue('2');
            const depois = servidor.chamadas.slice(antes).filter((chamada) => chamada.url.includes('/filiais/'));
            expect(depois.length).toBeGreaterThan(0);
            expect(depois.every((chamada) => chamada.url === filialUrl(FILIAL_F2))).toBe(true);
        } finally {
            servidor.restaurar();
        }
    });

    it('master troca E1/F1 por E2/F2 no header: nenhuma requisição depois da troca combina a filial antiga com a empresa nova', async () => {
        sessao(EMPRESA_USUARIO_ID, true, FILIAL_ID);
        const servidor = instalarServidorFiscal({
            ...rotasBase(),
            [GET_EMPRESA]: (chamada) => ({ status: 200, body: empresaConfigurada({ ambiente: chamada.params.empresaId === EMPRESA_OUTRA_ID ? 2 : 1 }) }),
            [GET_CERTIFICADOS]: { status: 200, body: [] }
        });
        const usuario = userEvent.setup();
        try {
            const { rerender, queryClient } = renderPagina();
            await usuario.click(await screen.findByRole('tab', { name: CONFIGURACAO_FISCAL_PAGINA.abaFiliais }));
            await waitFor(() => expect(servidor.chamadasDe(`GET ${filialUrl(FILIAL_ID)}`).length).toBeGreaterThan(0));

            const antes = servidor.chamadas.length;
            const contexto = contextoPara(EMPRESA_OUTRA_ID, true, FILIAL_F2, 3);
            mockedUseOrganizationalContext.mockReturnValue(contexto);
            rerender(
                <QueryClientProvider client={queryClient}>
                    <ConfiguracaoFiscalPage />
                </QueryClientProvider>
            );

            expect(await screen.findByLabelText(CONFIGURACAO_FISCAL_FILIAL.serieNFePadrao)).toHaveValue('2');
            const depois = servidor.chamadas.slice(antes).filter((chamada) => chamada.url.startsWith('/api/fiscal/configuracao'));
            expect(depois.length).toBeGreaterThan(0);
            // Ninguém vai à filial antiga depois da troca, e toda consulta leva a empresa nova.
            expect(depois.some((chamada) => chamada.url === filialUrl(FILIAL_ID))).toBe(false);
            expect(depois.filter((chamada) => chamada.url.includes('/filiais/')).every((chamada) => chamada.url === filialUrl(FILIAL_F2))).toBe(true);
            expect(depois.every((chamada) => chamada.params.empresaId === EMPRESA_OUTRA_ID)).toBe(true);
        } finally {
            servidor.restaurar();
        }
    });
});

describe('D115 — AC-4: cadastro de certificado com "Vincular à filial do contexto"', () => {
    it('com filial no header e a caixa DESMARCADA, o POST leva filialId null (certificado da empresa toda)', async () => {
        sessao(EMPRESA_USUARIO_ID, false, FILIAL_ID);
        const servidor = instalarServidorFiscal({ ...rotasBase(), [POST_CERTIFICADO]: { status: 201, body: certificadoMatriz({ apelido: 'Certificado Novo' }) } });
        const usuario = userEvent.setup();
        try {
            renderPagina();
            await abrirCadastro(usuario);
            const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo });
            expect(within(dialogo).getByRole('checkbox', { name: CERTIFICADO_CADASTRAR_DIALOG.vincularFilial })).not.toBeChecked();

            await preencherECadastrar(usuario);
            await waitFor(() => expect(servidor.chamadasDe(POST_CERTIFICADO)).toHaveLength(1));
            expect(servidor.chamadasDe(POST_CERTIFICADO)[0].body).toMatchObject({ filialId: null });
        } finally {
            servidor.restaurar();
        }
    });

    it('com filial no header e a caixa MARCADA, o POST leva filialId = filial do header', async () => {
        sessao(EMPRESA_USUARIO_ID, false, FILIAL_ID);
        const servidor = instalarServidorFiscal({ ...rotasBase(), [POST_CERTIFICADO]: { status: 201, body: certificadoMatriz({ apelido: 'Certificado Novo' }) } });
        const usuario = userEvent.setup();
        try {
            renderPagina();
            await abrirCadastro(usuario);
            const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo });
            // O input escondido do PrimeReact chama preventDefault no clique e, no jsdom, o `checked` do DOM volta ao valor
            // anterior depois do render (ver ConfirmarFaturamentoDialog.test.tsx:318-320). A prova é o POST: só ele mostra o
            // estado que o usuário marcou.
            await usuario.click(within(dialogo).getByRole('checkbox', { name: CERTIFICADO_CADASTRAR_DIALOG.vincularFilial }));

            await preencherECadastrar(usuario);
            await waitFor(() => expect(servidor.chamadasDe(POST_CERTIFICADO)).toHaveLength(1));
            expect(servidor.chamadasDe(POST_CERTIFICADO)[0].body).toMatchObject({ filialId: FILIAL_ID });
        } finally {
            servidor.restaurar();
        }
    });

    it('sem filial no header, a caixa não existe e o POST leva filialId null', async () => {
        sessao(EMPRESA_USUARIO_ID, false, null);
        const servidor = instalarServidorFiscal({ ...rotasBase(), [POST_CERTIFICADO]: { status: 201, body: certificadoMatriz({ apelido: 'Certificado Novo' }) } });
        const usuario = userEvent.setup();
        try {
            renderPagina();
            await abrirCadastro(usuario);
            const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo });
            expect(within(dialogo).queryByRole('checkbox', { name: CERTIFICADO_CADASTRAR_DIALOG.vincularFilial })).not.toBeInTheDocument();

            await preencherECadastrar(usuario);
            await waitFor(() => expect(servidor.chamadasDe(POST_CERTIFICADO)).toHaveLength(1));
            expect(servidor.chamadasDe(POST_CERTIFICADO)[0].body).toMatchObject({ filialId: null });
        } finally {
            servidor.restaurar();
        }
    });
});
