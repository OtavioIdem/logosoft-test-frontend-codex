import { type InternalAxiosRequestConfig } from 'axios';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PessoasPage } from '@/features/pessoas/components/PessoasPage';
import { PESSOA_ENDERECO_MUNICIPIO_FISCAL, PESSOA_ENDERECOS_ABA } from '@/features/pessoas/components/pessoaEnderecosLabels';
import {
    PESSOA_FISCAL_ABA,
    PESSOA_FISCAL_CONTRIBUINTE_SEM_IE,
    PESSOA_FISCAL_INDISPONIVEL,
    PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO,
    PESSOA_FISCAL_PERMISSAO,
    PESSOA_FISCAL_REGISTRO_INCOMPLETO,
    PESSOA_FISCAL_TOAST,
    PESSOA_MUNICIPIO_DIALOG,
    PESSOA_MUNICIPIO_INDISPONIVEL,
    PESSOA_MUNICIPIO_TOAST
} from '@/features/pessoas/components/pessoaFiscalLabels';
import { AuthContext } from '@/providers/AuthProvider';
import { AppToastContext, AppToastContextValue } from '@/hooks/useAppToast';
import { httpClient } from '@/lib/http/httpClient';
import { PermissionCode } from '@/types/erp';
import { AuthContextValue } from '@/features/auth/types/auth.types';

// b75 (D104) — aba "Dados fiscais" e "Vincular município", com a PessoasPage, o PessoaFormDialog, as abas, os hooks,
// os clients e o `httpClient` REAIS. Só a rede (adapter do axios) é trocada e os requests são capturados. A página é
// montada inteira porque o PF-4 só existe nela: o diálogo recebe o registro VIVO da lista relida. A sessão entra pelo
// `AuthContext` real e o toast pelo `AppToastContext` real com espiões. Dublados: o `Dropdown` do PrimeReact (painel não
// operável no jsdom) e o filtro Empresa/Filial do cabeçalho, que não participa de nenhuma prova desta fatia.

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/components/forms/EmpresaFilialFilter', () => ({ EmpresaFilialFilter: () => null }));

const pessoaId = '10000000-0000-0000-0000-000000000001';
const idAlfa = '20000000-0000-0000-0000-00000000000a';
const idBeta = '20000000-0000-0000-0000-00000000000b';
const municipioSp = '30000000-0000-0000-0000-000000003550';
const municipioRj = '30000000-0000-0000-0000-000000003304';

// Sessões do plano (§5).
const S1: PermissionCode[] = ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR'];
const S2: PermissionCode[] = [...S1, 'PESSOAS_DADOS_FISCAIS_GERENCIAR', 'FISCAL_CADASTROS_CONSULTAR'];
const S3: PermissionCode[] = [...S1, 'PESSOAS_DADOS_FISCAIS_GERENCIAR'];

type Registro = Record<string, unknown>;

// `PessoaResponse.cs:7-29`: os 22 campos, os fiscais com valor (o PATCH tem de reenviar os 7 não editados).
const pessoa = (extra: Registro = {}): Registro => ({
    id: pessoaId,
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    tipoPessoa: 2,
    nomeRazaoSocial: 'Cliente Teste Ltda',
    nomeFantasia: null,
    documento: '11222333000181',
    inscricaoEstadual: '110042490114',
    inscricaoMunicipal: null,
    observacao: null,
    status: 1,
    indicadorContribuinteIcms: 3,
    indicadorIeDestinatario: 9,
    inscricaoEstadualSt: 'ST-ANTIGA',
    suframa: '777',
    regimeTributarioParceiro: 1,
    municipioIbgeId: null,
    paisId: null,
    bloqueada: false,
    motivoBloqueio: null,
    contribuinteIpi: true,
    tomadorOrgaoPublico: false,
    ...extra
});

const endereco = (id: string, extra: Registro): Registro => ({
    id,
    pessoaId,
    tipo: 1,
    logradouro: 'Rua',
    numero: '1',
    complemento: null,
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01310100',
    principal: false,
    status: 1,
    municipioIbgeId: null,
    ...extra
});
const alfa = () => endereco(idAlfa, { logradouro: 'Rua Alfa', numero: '10', principal: true, municipioIbgeId: municipioSp });
const beta = (extra: Registro = {}) => endereco(idBeta, { logradouro: 'Rua Beta', numero: '20', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20040002', ...extra });

const MUNICIPIOS = [
    { id: municipioRj, codigoIbge: '3304557', nome: 'Rio de Janeiro', ufSigla: 'RJ', ufId: 'uf-rj', codigoSiafi: null, ativo: true, motivoInativacao: null },
    { id: '30000000-0000-0000-0000-000000003303', codigoIbge: '3303302', nome: 'Niterói', ufSigla: 'RJ', ufId: 'uf-rj', codigoSiafi: null, ativo: true, motivoInativacao: null },
    { id: municipioSp, codigoIbge: '3550308', nome: 'São Paulo', ufSigla: 'SP', ufId: 'uf-sp', codigoSiafi: null, ativo: true, motivoInativacao: null }
];

type Capturado = { method?: string; url?: string; params?: Record<string, unknown>; data: unknown };

let capturados: Capturado[];
let pessoasServidor: Registro[];
let enderecosServidor: Registro[];
let toast: { [K in keyof AppToastContextValue]: ReturnType<typeof vi.fn> };
const adapterOriginal = httpClient.defaults.adapter;

const urlPessoas = '/api/pessoas';
const urlFiscal = `/api/pessoas/${pessoaId}/dados-fiscais`;
const urlEnderecos = `/api/pessoas/${pessoaId}/enderecos`;
const urlMunicipios = '/api/fiscal/cadastros/municipios';
const ok = (config: InternalAxiosRequestConfig, data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config });

const instalarRede = () => {
    capturados = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        capturados.push({ method: config.method, url: config.url, params: config.params, data: config.data });
        if (config.method === 'get' && config.url === urlPessoas) return ok(config, pessoasServidor.map((item) => ({ ...item })));
        if (config.method === 'patch' && config.url === urlFiscal) {
            const corpo = JSON.parse(String(config.data));
            // O domínio grava a IE de ST em maiúsculas (`DadosFiscaisPessoa.cs:118-135`): o GET seguinte devolve o gravado.
            pessoasServidor = pessoasServidor.map((item) => (item.id === pessoaId ? { ...item, ...corpo, inscricaoEstadualSt: corpo.inscricaoEstadualSt ? String(corpo.inscricaoEstadualSt).toUpperCase() : null, municipioIbgeCodigo: undefined, paisCodigoBacen: undefined } : item));
            // A resposta do PATCH é deliberadamente DIFERENTE do que o GET seguinte devolve: a tela tem de mostrar o GET.
            return ok(config, pessoa({ inscricaoEstadualSt: 'RESPOSTA-DO-PATCH' }));
        }
        if (config.method === 'get' && config.url === urlEnderecos) return ok(config, enderecosServidor.map((item) => ({ ...item })));
        if (config.method === 'patch' && /\/enderecos\/[^/]+\/municipio$/.test(String(config.url))) {
            const enderecoId = String(config.url).split('/').at(-2);
            const codigo = JSON.parse(String(config.data)).municipioIbgeCodigo;
            const municipio = MUNICIPIOS.find((item) => item.codigoIbge === codigo);
            enderecosServidor = enderecosServidor.map((item) => (item.id === enderecoId ? { ...item, municipioIbgeId: municipio?.id ?? null } : item));
            return ok(config, enderecosServidor.find((item) => item.id === enderecoId));
        }
        if (config.method === 'get' && config.url === urlMunicipios) {
            const items = MUNICIPIOS.filter((item) => item.ufSigla === config.params?.ufSigla && (!config.params?.termo || item.nome.toUpperCase().includes(String(config.params.termo).toUpperCase())));
            return ok(config, { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });
        }
        throw new Error(`Rota não esperada no teste: ${config.method} ${config.url}`);
    });
};

const authValue = (permissoes: PermissionCode[]): AuthContextValue => ({
    user: { id: 'u1', nome: 'Operador', email: 'operador@teste.local', permissoes },
    isAuthenticated: true,
    isLoading: false,
    authStatus: 'authenticated',
    authError: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    refreshUserFromStorage: vi.fn(),
    retrySession: vi.fn()
});

const renderPagina = (permissoes: PermissionCode[] = S2) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <AuthContext.Provider value={authValue(permissoes)}>
            <AppToastContext.Provider value={toast as unknown as AppToastContextValue}>
                <QueryClientProvider client={client}>
                    <PessoasPage />
                </QueryClientProvider>
            </AppToastContext.Provider>
        </AuthContext.Provider>
    );
};

const listagensPessoas = () => capturados.filter((item) => item.method === 'get' && item.url === urlPessoas);
const patchesFiscais = () => capturados.filter((item) => item.method === 'patch' && item.url === urlFiscal);
const listagensEnderecos = () => capturados.filter((item) => item.method === 'get' && item.url === urlEnderecos);
const buscasMunicipio = () => capturados.filter((item) => item.method === 'get' && item.url === urlMunicipios);
const corpo = (item: Capturado) => JSON.parse(String(item.data));

const abrirEdicao = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    return screen.findByRole('dialog', { name: 'Editar pessoa' });
};
const abrirAba = (titulo: string) => fireEvent.click(screen.getByRole('tab', { name: titulo }));
const botaoSalvarFiscal = () => screen.getByRole('button', { name: PESSOA_FISCAL_ABA.salvar });
const campoIeSt = () => screen.getByLabelText('Inscrição estadual de ST') as HTMLInputElement;
const linhaDe = (texto: string) => screen.getByRole('cell', { name: texto }).closest('tr') as HTMLElement;

const preparar = () => {
    pessoasServidor = [pessoa()];
    enderecosServidor = [alfa(), beta()];
    toast = { show: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    instalarRede();
};

beforeEach(preparar);

// Aquecimento (precedente b71-b73): monta a página, abre a edição e a aba fiscal; nada é afirmado aqui.
beforeAll(async () => {
    preparar();
    const { unmount } = renderPagina();
    await abrirEdicao();
    abrirAba(PESSOA_FISCAL_ABA.titulo);
    await screen.findByLabelText('Inscrição estadual de ST');
    unmount();
    httpClient.defaults.adapter = adapterOriginal;
}, 30_000);

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

describe('AC-4: a aba envia sempre os 8 campos e a lista de Pessoas é relida', () => {
    it('editar 1 campo reenvia os outros 7 com os valores do registro; a aba mostra o registro relido, não a resposta do PATCH', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        await abrirEdicao();
        abrirAba(PESSOA_FISCAL_ABA.titulo);
        expect(campoIeSt().value).toBe('ST-ANTIGA');
        const listasAntes = listagensPessoas().length;

        await user.clear(campoIeSt());
        await user.paste('st-nova');
        await user.click(botaoSalvarFiscal());

        await waitFor(() => expect(patchesFiscais()).toHaveLength(1));
        expect(corpo(patchesFiscais()[0])).toEqual({
            indicadorContribuinteIcms: 3,
            inscricaoEstadualSt: 'st-nova',
            suframa: '777',
            regimeTributarioParceiro: 1,
            municipioIbgeCodigo: null,
            paisCodigoBacen: null,
            contribuinteIpi: true,
            tomadorOrgaoPublico: false
        });

        // A lista é relida, e a aba recarrega do registro NOVO (o servidor gravou em maiúsculas).
        await waitFor(() => expect(campoIeSt().value).toBe('ST-NOVA'));
        expect(listagensPessoas().length).toBeGreaterThan(listasAntes);
        expect(screen.queryByDisplayValue('RESPOSTA-DO-PATCH')).not.toBeInTheDocument();
        expect(toast.success).toHaveBeenCalledWith(PESSOA_FISCAL_TOAST.salvo);
        expect(botaoSalvarFiscal()).toBeDisabled();
        expect(botaoSalvarFiscal()).toHaveAttribute('title', PESSOA_FISCAL_INDISPONIVEL.semAlteracao);
    });

    it('PF-4: o texto digitado e não salvo em "Dados gerais" sobrevive ao salvar dos dados fiscais', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        await abrirEdicao();
        const nome = screen.getByLabelText(/^Nome\/Razão social/) as HTMLInputElement;
        await user.clear(nome);
        await user.paste('Nome digitado e não salvo');

        abrirAba(PESSOA_FISCAL_ABA.titulo);
        await user.clear(campoIeSt());
        await user.paste('st-nova');
        await user.click(botaoSalvarFiscal());
        await waitFor(() => expect(campoIeSt().value).toBe('ST-NOVA'));
        expect(patchesFiscais()).toHaveLength(1);

        abrirAba('Dados gerais');
        expect((screen.getByLabelText(/^Nome\/Razão social/) as HTMLInputElement).value).toBe('Nome digitado e não salvo');
        // Nenhum PUT da pessoa saiu: o texto só existe no formulário.
        expect(capturados.filter((item) => item.method === 'put')).toHaveLength(0);
    });

    it.each([
        ['município', { municipioIbgeId: municipioSp }],
        ['país', { paisId: '40000000-0000-0000-0000-000000001058' }]
    ])('%s preenchido no registro bloqueia o salvar, com motivo, e faz 0 PATCH', async (_nome, extra) => {
        const user = userEvent.setup({ delay: null });
        pessoasServidor = [pessoa(extra)];
        renderPagina();
        await abrirEdicao();
        abrirAba(PESSOA_FISCAL_ABA.titulo);

        expect(screen.getByText(PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO.titulo)).toBeInTheDocument();
        expect(screen.getByText(PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO.texto)).toBeInTheDocument();
        await user.type(campoIeSt(), 'X');
        expect(botaoSalvarFiscal()).toBeDisabled();
        expect(botaoSalvarFiscal()).toHaveAttribute('title', PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO.tituloBotao);
        fireEvent.click(botaoSalvarFiscal());
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(patchesFiscais()).toHaveLength(0);
    });

    it('registro com chave fiscal ausente (undefined) não grava e mostra o motivo', async () => {
        const user = userEvent.setup({ delay: null });
        const incompleto = pessoa();
        delete incompleto.tomadorOrgaoPublico;
        pessoasServidor = [incompleto];
        renderPagina();
        await abrirEdicao();
        abrirAba(PESSOA_FISCAL_ABA.titulo);

        expect(screen.getByText(PESSOA_FISCAL_REGISTRO_INCOMPLETO.titulo)).toBeInTheDocument();
        await user.type(campoIeSt(), 'X');
        expect(botaoSalvarFiscal()).toBeDisabled();
        expect(botaoSalvarFiscal()).toHaveAttribute('title', PESSOA_FISCAL_REGISTRO_INCOMPLETO.tituloBotao);
        fireEvent.click(botaoSalvarFiscal());
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(patchesFiscais()).toHaveLength(0);
    });
});

describe('AC-5: Contribuinte com IE vazia no registro bloqueia o envio', () => {
    it('o motivo aparece, o botão fica desabilitado com o motivo e sai 0 PATCH; IE digitada e não salva também orienta', async () => {
        const user = userEvent.setup({ delay: null });
        pessoasServidor = [pessoa({ inscricaoEstadual: null, indicadorContribuinteIcms: null, indicadorIeDestinatario: null })];
        renderPagina();
        await abrirEdicao();

        // IE digitada na aba Documentos e não salva: não conta (PF-2).
        abrirAba('Documentos e observações');
        fireEvent.change(screen.getByLabelText('Inscrição estadual'), { target: { value: '110042490114' } });
        abrirAba(PESSOA_FISCAL_ABA.titulo);

        await user.selectOptions(screen.getByLabelText('Indicador de contribuinte do ICMS'), 'Contribuinte');
        expect(screen.getByText(PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.titulo)).toBeInTheDocument();
        expect(screen.getByText(PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.texto)).toBeInTheDocument();
        expect(screen.getByText(PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.ieNaoSalva)).toBeInTheDocument();
        expect(botaoSalvarFiscal()).toBeDisabled();
        expect(botaoSalvarFiscal()).toHaveAttribute('title', PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.tituloBotao);
        fireEvent.click(botaoSalvarFiscal());
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(patchesFiscais()).toHaveLength(0);

        // Trocar para "Isento" libera: a regra é só do Contribuinte.
        await user.selectOptions(screen.getByLabelText('Indicador de contribuinte do ICMS'), 'Isento');
        expect(screen.queryByText(PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.titulo)).not.toBeInTheDocument();
        expect(botaoSalvarFiscal()).toBeEnabled();
    });
});

describe('AC-3: permissões da aba Dados fiscais e da ação Vincular município', () => {
    it('S1 (sem PESSOAS_DADOS_FISCAIS_GERENCIAR) vê a aba Dados fiscais só leitura', async () => {
        renderPagina(S1);
        await abrirEdicao();
        abrirAba(PESSOA_FISCAL_ABA.titulo);
        expect(screen.getByText(PESSOA_FISCAL_PERMISSAO.somenteLeitura)).toBeInTheDocument();
        expect(campoIeSt()).toBeDisabled();
        expect(campoIeSt().value).toBe('ST-ANTIGA');
        for (const rotulo of ['Indicador de contribuinte do ICMS', 'Regime tributário do parceiro', 'Inscrição SUFRAMA', 'Contribuinte do IPI', 'Tomador é órgão público']) {
            expect(screen.getByLabelText(rotulo)).toBeDisabled();
        }
        expect(botaoSalvarFiscal()).toBeDisabled();
        expect(botaoSalvarFiscal()).toHaveAttribute('title', PESSOA_FISCAL_PERMISSAO.acaoSemGerenciar);
    });

    it('S1 não vê a ação Vincular município em nenhuma linha', async () => {
        renderPagina(S1);
        await abrirEdicao();
        abrirAba(PESSOA_ENDERECOS_ABA.titulo);
        await screen.findByRole('cell', { name: 'Rua Beta, 20' });
        expect(screen.queryByRole('button', { name: /^Vincular município/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Trocar município vinculado/ })).not.toBeInTheDocument();
    });

    it('S3 (sem FISCAL_CADASTROS_CONSULTAR) vê a ação desabilitada, com o motivo, e faz 0 GET de busca', async () => {
        renderPagina(S3);
        await abrirEdicao();
        abrirAba(PESSOA_ENDERECOS_ABA.titulo);
        await screen.findByRole('cell', { name: 'Rua Beta, 20' });
        expect(screen.getByText(PESSOA_MUNICIPIO_INDISPONIVEL.avisoTabelaSemBusca)).toBeInTheDocument();
        const acao = screen.getByRole('button', { name: 'Vincular município do endereço Rua Beta, 20' });
        expect(acao).toBeDisabled();
        expect(acao).toHaveAttribute('title', PESSOA_MUNICIPIO_INDISPONIVEL.semBusca);
        fireEvent.click(acao);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(screen.queryByRole('dialog', { name: PESSOA_MUNICIPIO_DIALOG.titulo })).not.toBeInTheDocument();
        expect(buscasMunicipio()).toHaveLength(0);
    });
});

describe('AC-2: S2 vincula o município pela busca filtrada pela UF do endereço', () => {
    it('o GET da busca leva a UF do endereço, o PATCH leva o código IBGE e a lista de endereços é relida', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina(S2);
        await abrirEdicao();
        abrirAba(PESSOA_ENDERECOS_ABA.titulo);
        await screen.findByRole('cell', { name: 'Rua Beta, 20' });
        expect(within(linhaDe('Rua Beta, 20')).getByText(PESSOA_ENDERECO_MUNICIPIO_FISCAL.naoVinculado)).toBeInTheDocument();
        const listasAntes = listagensEnderecos().length;

        await user.click(screen.getByRole('button', { name: 'Vincular município do endereço Rua Beta, 20' }));
        const dialogo = await screen.findByRole('dialog', { name: PESSOA_MUNICIPIO_DIALOG.titulo });
        await waitFor(() => expect(buscasMunicipio().length).toBeGreaterThan(0));
        for (const busca of buscasMunicipio()) expect(busca.params).toMatchObject({ ufSigla: 'RJ', ativo: true });

        const select = within(dialogo).getByLabelText(PESSOA_MUNICIPIO_DIALOG.placeholder);
        await within(select).findByRole('option', { name: 'Rio de Janeiro' });
        expect(within(select).queryByRole('option', { name: 'São Paulo' })).not.toBeInTheDocument();
        await user.selectOptions(select, 'Rio de Janeiro');
        await user.click(within(dialogo).getByRole('button', { name: PESSOA_MUNICIPIO_DIALOG.confirmLabel }));

        await waitFor(() => expect(capturados.filter((item) => item.method === 'patch')).toHaveLength(1));
        const patch = capturados.find((item) => item.method === 'patch') as Capturado;
        expect(patch.url).toBe(`${urlEnderecos}/${idBeta}/municipio`);
        expect(corpo(patch)).toEqual({ municipioIbgeCodigo: '3304557' });

        await waitFor(() => expect(within(linhaDe('Rua Beta, 20')).getByText(PESSOA_ENDERECO_MUNICIPIO_FISCAL.vinculado)).toBeInTheDocument());
        expect(listagensEnderecos().length).toBeGreaterThan(listasAntes);
        expect(toast.success).toHaveBeenCalledWith(PESSOA_MUNICIPIO_TOAST.vinculado('Rio de Janeiro', 'RJ'));
        expect(screen.queryByRole('dialog', { name: PESSOA_MUNICIPIO_DIALOG.titulo })).not.toBeInTheDocument();
    });

    it('D52: o termo digitado na busca chega ao servidor (GET com termo e a UF do endereço)', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina(S2);
        await abrirEdicao();
        abrirAba(PESSOA_ENDERECOS_ABA.titulo);
        await screen.findByRole('cell', { name: 'Rua Beta, 20' });
        await user.click(screen.getByRole('button', { name: 'Vincular município do endereço Rua Beta, 20' }));
        const dialogo = await screen.findByRole('dialog', { name: PESSOA_MUNICIPIO_DIALOG.titulo });

        await user.type(within(dialogo).getByLabelText(PESSOA_MUNICIPIO_DIALOG.filtroPlaceholder), 'Niter');
        await waitFor(() => expect(buscasMunicipio().some((busca) => busca.params?.termo === 'Niter' && busca.params?.ufSigla === 'RJ')).toBe(true));
    });
});
