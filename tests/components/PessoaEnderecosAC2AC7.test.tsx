import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PessoaFormDialog } from '@/features/pessoas/components/PessoaFormDialog';
import {
    PESSOA_ENDERECO_AVISOS,
    PESSOA_ENDERECO_CAMPOS,
    PESSOA_ENDERECO_EXCLUIR_DIALOG,
    PESSOA_ENDERECO_PRINCIPAL,
    PESSOA_ENDERECOS_ABA,
    PESSOA_ENDERECOS_CRIACAO,
    PESSOA_ENDERECOS_ERRO,
    PESSOA_ENDERECOS_INDISPONIVEL,
    PESSOA_ENDERECOS_PERMISSAO,
    PESSOA_ENDERECOS_TOAST
} from '@/features/pessoas/components/pessoaEnderecosLabels';
import { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { AuthContext } from '@/providers/AuthProvider';
import { AppToastContext, AppToastContextValue } from '@/hooks/useAppToast';
import { httpClient } from '@/lib/http/httpClient';
import { EntityStatus, PermissionCode, TipoPessoa } from '@/types/erp';
import { AuthContextValue } from '@/features/auth/types/auth.types';

// b73 (D102) — aba Endereços do PessoaFormDialog com o diálogo, a aba, os hooks, o client e o `httpClient` REAIS.
// Só a rede (adapter do axios) é trocada e os requests são capturados. A sessão entra pelo `AuthContext` real
// (as permissões chegam à aba pelo `usePermissions` do diálogo), o toast pelo `AppToastContext` real com espiões.
// Dublados: o `Dropdown` do PrimeReact (painel não operável no jsdom) e o bloco Empresa/Filial da criação da
// Pessoa, que não participa de nenhuma prova desta fatia.

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/components/forms/EmpresaFilialFields', () => ({ EmpresaFilialFields: () => null }));

const pessoaId = '10000000-0000-0000-0000-000000000001';
const idAlfa = '20000000-0000-0000-0000-00000000000a';
const idBeta = '20000000-0000-0000-0000-00000000000b';
const idNovo = '20000000-0000-0000-0000-00000000000c';
const idResposta = '20000000-0000-0000-0000-0000000000ff';
const municipioSp = '30000000-0000-0000-0000-000000003550';

const S1: PermissionCode[] = ['PESSOAS_CONSULTAR'];
const S2: PermissionCode[] = ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR'];
const SO_GERENCIAR: PermissionCode[] = ['PESSOAS_GERENCIAR'];

type Endereco = Record<string, unknown> & { id: string; logradouro: string; numero: string; principal: boolean };

const endereco = (id: string, extra: Partial<Endereco>): Endereco => ({
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

// Alfa: principal, com município vinculado. Beta: sem vínculo.
const alfa = (extra: Partial<Endereco> = {}) => endereco(idAlfa, { logradouro: 'Rua Alfa', numero: '10', principal: true, municipioIbgeId: municipioSp, ...extra });
const beta = (extra: Partial<Endereco> = {}) => endereco(idBeta, { logradouro: 'Rua Beta', numero: '20', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20040002', bairro: 'Saúde', ...extra });
// A resposta de toda mutação é deliberadamente DIFERENTE do que o GET seguinte devolve (EP-5/EP-6).
const respostaDaMutacao = () => endereco(idResposta, { logradouro: 'Rua Resposta Da Mutacao', numero: '999', principal: true });

const pessoa = (extra: Partial<PessoaResponse> = {}): PessoaResponse =>
    ({
        id: pessoaId,
        empresaId: '11111111-1111-1111-1111-111111111111',
        filialId: null,
        tipoPessoa: TipoPessoa.Juridica,
        nomeRazaoSocial: 'Cliente Teste Ltda',
        nomeFantasia: null,
        documento: '11222333000181',
        inscricaoEstadual: null,
        inscricaoMunicipal: null,
        observacao: null,
        status: EntityStatus.Ativo,
        ...extra
    }) as PessoaResponse;

type Capturado = { method?: string; url?: string; data: unknown };

let capturados: Capturado[];
let servidor: Endereco[];
let aposMutacao: Endereco[] | null;
let falharEscrita: boolean;
let falharLista: boolean;
const adapterOriginal = httpClient.defaults.adapter;

const base = `/api/pessoas/${pessoaId}/enderecos`;
const ok = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config });
const erro400 = (config: InternalAxiosRequestConfig) => {
    const data = { success: false, error: { code: 'PESSOAS_VALIDACAO', message: 'Endereço inválido para a pessoa.', traceId: 'trace-b73-400', validationErrors: [{ field: 'Cep', message: 'CEP deve ter 8 dígitos.' }] } };
    const response = { data, status: 400, statusText: 'Bad Request', headers: new AxiosHeaders(), config };
    return new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, response);
};

const instalarRede = () => {
    capturados = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        capturados.push({ method: config.method, url: config.url, data: config.data });
        if (config.method === 'get' && config.url === base) {
            if (falharLista) throw erro400(config);
            return ok(config, servidor.map((item) => ({ ...item })));
        }
        const escrita =
            (config.method === 'post' && config.url === base) ||
            (config.method === 'put' && String(config.url).startsWith(`${base}/`)) ||
            (config.method === 'post' && /\/principal$/.test(String(config.url))) ||
            (config.method === 'delete' && String(config.url).startsWith(`${base}/`));
        if (!escrita) throw new Error(`Rota não esperada no teste: ${config.method} ${config.url}`);
        if (falharEscrita) throw erro400(config);
        if (aposMutacao) servidor = aposMutacao;
        if (config.method === 'delete') return { data: '', status: 204, statusText: 'No Content', headers: {}, config };
        return ok(config, respostaDaMutacao(), config.method === 'post' && config.url === base ? 201 : 200);
    });
};

let toast: { [K in keyof AppToastContextValue]: ReturnType<typeof vi.fn> };

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

const renderDialogo = ({ permissoes = S2, record = pessoa() as PessoaResponse | null } = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <AuthContext.Provider value={authValue(permissoes)}>
            <AppToastContext.Provider value={toast as unknown as AppToastContextValue}>
                <QueryClientProvider client={client}>
                    <PessoaFormDialog visible record={record} onHide={vi.fn()} onSubmit={vi.fn(async () => undefined)} />
                </QueryClientProvider>
            </AppToastContext.Provider>
        </AuthContext.Provider>
    );
};

const listagens = () => capturados.filter((item) => item.method === 'get' && item.url === base);
const escritas = () => capturados.filter((item) => item.method !== 'get');
const abrirAba = () => fireEvent.click(screen.getByRole('tab', { name: PESSOA_ENDERECOS_ABA.titulo }));
const tabela = () => screen.findByRole('region', { name: PESSOA_ENDERECOS_ABA.tabelaAria });
const linhaDe = (texto: string) => screen.getByRole('cell', { name: texto }).closest('tr') as HTMLElement;
const dialogoEndereco = (nome: string) => screen.findByRole('dialog', { name: nome });
const corpo = (item: Capturado) => (item.data === undefined ? undefined : JSON.parse(String(item.data)));
const NOVE_CAMPOS = ['bairro', 'cep', 'cidade', 'complemento', 'logradouro', 'numero', 'principal', 'tipo', 'uf'];

const preparar = () => {
    servidor = [alfa(), beta()];
    aposMutacao = null;
    falharEscrita = false;
    falharLista = false;
    toast = { show: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    instalarRede();
};

beforeEach(preparar);

// Aquecimento (precedente b71/b72): monta o diálogo uma vez, abre a aba e espera a tabela; nada é afirmado aqui.
beforeAll(async () => {
    preparar();
    const { unmount } = renderDialogo();
    abrirAba();
    await screen.findByRole('cell', { name: 'Rua Alfa, 10' });
    unmount();
    httpClient.defaults.adapter = adapterOriginal;
}, 30_000);

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

describe('AC-2: a aba lista na edição e não chama a rede na criação', () => {
    it('edição: lista os endereços devolvidos pelo GET da pessoa', async () => {
        renderDialogo();
        abrirAba();
        await tabela();
        expect(screen.getByRole('cell', { name: 'Rua Alfa, 10' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'Rua Beta, 20' })).toBeInTheDocument();
        expect(within(linhaDe('Rua Beta, 20')).getByRole('cell', { name: 'Rio de Janeiro/RJ' })).toBeInTheDocument();
        expect(within(linhaDe('Rua Beta, 20')).getByRole('cell', { name: '20040-002' })).toBeInTheDocument();
        expect(listagens()).toHaveLength(1);
    });

    it('criação: mostra "salve a pessoa" e faz 0 GET', async () => {
        renderDialogo({ record: null });
        abrirAba();
        expect(await screen.findByText(PESSOA_ENDERECOS_CRIACAO.texto)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: PESSOA_ENDERECOS_ABA.novoEndereco })).not.toBeInTheDocument();
        expect(capturados).toHaveLength(0);
    });
});

describe('AC-3: permissões', () => {
    it('S1 (só consultar) vê a lista, sem ações por linha, Novo indisponível e o motivo visível', async () => {
        renderDialogo({ permissoes: S1 });
        abrirAba();
        await tabela();
        expect(screen.getByRole('cell', { name: 'Rua Alfa, 10' })).toBeInTheDocument();
        expect(screen.getByText(PESSOA_ENDERECOS_PERMISSAO.somenteLeitura)).toBeInTheDocument();
        const novo = screen.getByRole('button', { name: PESSOA_ENDERECOS_ABA.novoEndereco });
        expect(novo).toBeDisabled();
        expect(novo).toHaveAttribute('title', PESSOA_ENDERECOS_PERMISSAO.acaoSemGerenciar);
        expect(screen.queryByRole('button', { name: /^Editar endereço/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Marcar como principal/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Excluir endereço/ })).not.toBeInTheDocument();
    });

    it('S2 opera tudo: Novo, Editar, Principal (fora da linha principal) e Excluir habilitados', async () => {
        renderDialogo({ permissoes: S2 });
        abrirAba();
        await tabela();
        expect(screen.queryByText(PESSOA_ENDERECOS_PERMISSAO.somenteLeitura)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: PESSOA_ENDERECOS_ABA.novoEndereco })).toBeEnabled();
        for (const linha of ['Rua Alfa, 10', 'Rua Beta, 20']) {
            expect(screen.getByRole('button', { name: `Editar endereço ${linha}` })).toBeEnabled();
            expect(screen.getByRole('button', { name: `Excluir endereço ${linha}` })).toBeEnabled();
        }
        expect(screen.getByRole('button', { name: 'Marcar como principal o endereço Rua Beta, 20' })).toBeEnabled();
        const jaPrincipal = screen.getByRole('button', { name: 'Marcar como principal o endereço Rua Alfa, 10' });
        expect(jaPrincipal).toBeDisabled();
        expect(jaPrincipal).toHaveAttribute('title', PESSOA_ENDERECOS_INDISPONIVEL.jaPrincipal);
    });

    it('sem PESSOAS_CONSULTAR: motivo visível e 0 GET', async () => {
        renderDialogo({ permissoes: SO_GERENCIAR });
        abrirAba();
        expect(await screen.findByText(PESSOA_ENDERECOS_PERMISSAO.semConsultar)).toBeInTheDocument();
        expect(listagens()).toHaveLength(0);
    });
});

describe('AC-4: toda mutação relê a lista e a tela mostra o GET, não a resposta da mutação', () => {
    it('criar: POST com os 9 campos, novo GET, tela com o que o GET devolveu', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        aposMutacao = [alfa(), beta(), endereco(idNovo, { logradouro: 'Rua Relida', numero: '7', cidade: 'Campinas', cep: '13010000' })];

        await user.click(screen.getByRole('button', { name: PESSOA_ENDERECOS_ABA.novoEndereco }));
        const dialogo = await dialogoEndereco('Novo endereço');
        fireEvent.change(within(dialogo).getByLabelText(/^Logradouro/), { target: { value: 'Rua Relida' } });
        fireEvent.change(within(dialogo).getByLabelText(/^Número/), { target: { value: '7' } });
        fireEvent.change(within(dialogo).getByLabelText(/^Bairro/), { target: { value: 'Centro' } });
        fireEvent.change(within(dialogo).getByLabelText(/^Cidade/), { target: { value: 'Campinas' } });
        await user.selectOptions(within(dialogo).getByLabelText(/^UF/), 'SP');
        const cep = within(dialogo).getByLabelText(/^CEP/);
        await user.click(cep);
        await user.paste('13010000');
        await user.click(within(dialogo).getByRole('button', { name: 'Cadastrar' }));

        expect(await screen.findByRole('cell', { name: 'Rua Relida, 7' })).toBeInTheDocument();
        const post = escritas();
        expect(post).toHaveLength(1);
        expect(post[0]).toMatchObject({ method: 'post', url: base });
        const enviado = corpo(post[0]);
        expect(Object.keys(enviado).sort()).toEqual(NOVE_CAMPOS);
        expect(enviado).toEqual({ tipo: 1, logradouro: 'Rua Relida', numero: '7', complemento: null, bairro: 'Centro', cidade: 'Campinas', uf: 'SP', cep: '13010000', principal: false });
        expect(listagens()).toHaveLength(2);
        expect(screen.queryByText(/Rua Resposta Da Mutacao/)).not.toBeInTheDocument();
        expect(toast.success).toHaveBeenCalledWith(PESSOA_ENDERECOS_TOAST.criado);
    });

    it('editar: PUT no endereço com os 9 campos, novo GET, tela com o que o GET devolveu', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        aposMutacao = [alfa(), beta({ logradouro: 'Rua Beta Relida' })];

        await user.click(screen.getByRole('button', { name: 'Editar endereço Rua Beta, 20' }));
        const dialogo = await dialogoEndereco('Editar endereço');
        fireEvent.change(within(dialogo).getByLabelText(/^Logradouro/), { target: { value: 'Rua Beta Editada' } });
        await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

        expect(await screen.findByRole('cell', { name: 'Rua Beta Relida, 20' })).toBeInTheDocument();
        const put = escritas();
        expect(put).toHaveLength(1);
        expect(put[0]).toMatchObject({ method: 'put', url: `${base}/${idBeta}` });
        expect(corpo(put[0])).toEqual({ tipo: 1, logradouro: 'Rua Beta Editada', numero: '20', complemento: null, bairro: 'Saúde', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20040002', principal: false });
        expect(listagens()).toHaveLength(2);
        expect(screen.queryByText(/Rua Resposta Da Mutacao/)).not.toBeInTheDocument();
        expect(screen.queryByRole('cell', { name: 'Rua Beta Editada, 20' })).not.toBeInTheDocument();
    });
});

describe('AC-5: principal, endereço da nota, marcar principal e excluir', () => {
    it('o principal aparece marcado e a aba diz que ele é o endereço da nota', async () => {
        renderDialogo();
        abrirAba();
        await tabela();
        expect(screen.getByText(PESSOA_ENDERECOS_ABA.descricao)).toBeInTheDocument();
        const marcaAlfa = within(linhaDe('Rua Alfa, 10')).getByText(PESSOA_ENDERECO_PRINCIPAL.marca);
        expect(marcaAlfa.closest('[title]')).toHaveAttribute('title', PESSOA_ENDERECO_PRINCIPAL.texto);
        expect(within(linhaDe('Rua Beta, 20')).queryByText(PESSOA_ENDERECO_PRINCIPAL.marca)).not.toBeInTheDocument();
    });

    it('marcar principal: POST …/principal sem corpo, relê a lista e a marca muda de linha', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        aposMutacao = [alfa({ principal: false }), beta({ principal: true })];

        await user.click(screen.getByRole('button', { name: 'Marcar como principal o endereço Rua Beta, 20' }));

        await waitFor(() => expect(within(linhaDe('Rua Beta, 20')).getByText(PESSOA_ENDERECO_PRINCIPAL.marca)).toBeInTheDocument());
        expect(within(linhaDe('Rua Alfa, 10')).queryByText(PESSOA_ENDERECO_PRINCIPAL.marca)).not.toBeInTheDocument();
        expect(escritas()).toEqual([{ method: 'post', url: `${base}/${idBeta}/principal`, data: undefined }]);
        expect(listagens()).toHaveLength(2);
        expect(screen.queryByText(/Rua Resposta Da Mutacao/)).not.toBeInTheDocument();
        expect(toast.success).toHaveBeenCalledWith(PESSOA_ENDERECOS_TOAST.principalDefinido);
    });

    it('excluir o principal: avisa da promoção, DELETE sem corpo, relê a lista e mostra o promovido', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        aposMutacao = [beta({ principal: true })];

        await user.click(screen.getByRole('button', { name: 'Excluir endereço Rua Alfa, 10' }));
        const confirmar = await screen.findByRole('dialog', { name: PESSOA_ENDERECO_EXCLUIR_DIALOG.titulo('Rua Alfa, 10') });
        expect(within(confirmar).getByText(PESSOA_ENDERECO_EXCLUIR_DIALOG.avisoPrincipal)).toBeInTheDocument();
        expect(within(confirmar).getByText(PESSOA_ENDERECO_EXCLUIR_DIALOG.avisoDefinitivo)).toBeInTheDocument();
        expect(escritas()).toHaveLength(0);
        await user.click(within(confirmar).getByRole('button', { name: PESSOA_ENDERECO_EXCLUIR_DIALOG.confirmLabel }));

        await waitFor(() => expect(screen.queryByRole('cell', { name: 'Rua Alfa, 10' })).not.toBeInTheDocument());
        expect(within(linhaDe('Rua Beta, 20')).getByText(PESSOA_ENDERECO_PRINCIPAL.marca)).toBeInTheDocument();
        expect(escritas()).toEqual([{ method: 'delete', url: `${base}/${idAlfa}`, data: undefined }]);
        expect(listagens()).toHaveLength(2);
        expect(toast.success).toHaveBeenCalledWith(PESSOA_ENDERECOS_TOAST.excluidoPromovido);
    });

    it('excluir endereço que não é o principal: sem aviso de promoção', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        aposMutacao = [alfa()];

        await user.click(screen.getByRole('button', { name: 'Excluir endereço Rua Beta, 20' }));
        const confirmar = await screen.findByRole('dialog', { name: PESSOA_ENDERECO_EXCLUIR_DIALOG.titulo('Rua Beta, 20') });
        expect(within(confirmar).queryByText(PESSOA_ENDERECO_EXCLUIR_DIALOG.avisoPrincipal)).not.toBeInTheDocument();
        await user.click(within(confirmar).getByRole('button', { name: PESSOA_ENDERECO_EXCLUIR_DIALOG.confirmLabel }));
        await waitFor(() => expect(screen.queryByRole('cell', { name: 'Rua Beta, 20' })).not.toBeInTheDocument());
        expect(escritas()).toEqual([{ method: 'delete', url: `${base}/${idBeta}`, data: undefined }]);
        expect(toast.success).toHaveBeenCalledWith(PESSOA_ENDERECOS_TOAST.excluido);
    });
});

describe('QA-05 (b73): checkbox do principal e foco depois de excluir ou cancelar', () => {
    const checkboxPrincipal = (dialogo: HTMLElement) => within(dialogo).getByLabelText(PESSOA_ENDERECO_CAMPOS.principal);
    const botaoNovo = () => screen.getByRole('button', { name: PESSOA_ENDERECOS_ABA.novoEndereco });

    it('editar o principal: checkbox marcado e desabilitado, com a dica do único principal', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        await user.click(screen.getByRole('button', { name: 'Editar endereço Rua Alfa, 10' }));
        const dialogo = await dialogoEndereco('Editar endereço');
        const checkbox = checkboxPrincipal(dialogo);
        expect(checkbox).toBeChecked();
        expect(checkbox).toBeDisabled();
        expect(within(dialogo).getByText(PESSOA_ENDERECO_PRINCIPAL.unicoPrincipalDica)).toBeInTheDocument();
    });

    it('editar endereço que não é o principal: checkbox desmarcado e habilitado', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        await user.click(screen.getByRole('button', { name: 'Editar endereço Rua Beta, 20' }));
        const dialogo = await dialogoEndereco('Editar endereço');
        const checkbox = checkboxPrincipal(dialogo);
        expect(checkbox).not.toBeChecked();
        expect(checkbox).toBeEnabled();
        expect(within(dialogo).getByText(PESSOA_ENDERECO_CAMPOS.principalHint)).toBeInTheDocument();
    });

    it('criar o primeiro endereço: checkbox marcado e desabilitado, com a dica de que o primeiro vira principal', async () => {
        const user = userEvent.setup({ delay: null });
        servidor = [];
        renderDialogo();
        abrirAba();
        await waitFor(() => expect(listagens()).toHaveLength(1));
        await waitFor(() => expect(botaoNovo()).toBeEnabled());
        await user.click(botaoNovo());
        const dialogo = await dialogoEndereco('Novo endereço');
        const checkbox = checkboxPrincipal(dialogo);
        expect(checkbox).toBeChecked();
        expect(checkbox).toBeDisabled();
        expect(within(dialogo).getByText(PESSOA_ENDERECO_PRINCIPAL.primeiroEhPrincipal)).toBeInTheDocument();
    });

    it('QA-04: depois de excluir, o foco vai para "Novo endereço" (e não cai no BODY)', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        aposMutacao = [alfa()];

        await user.click(screen.getByRole('button', { name: 'Excluir endereço Rua Beta, 20' }));
        const confirmar = await screen.findByRole('dialog', { name: PESSOA_ENDERECO_EXCLUIR_DIALOG.titulo('Rua Beta, 20') });
        await user.click(within(confirmar).getByRole('button', { name: PESSOA_ENDERECO_EXCLUIR_DIALOG.confirmLabel }));
        await waitFor(() => expect(screen.queryByRole('cell', { name: 'Rua Beta, 20' })).not.toBeInTheDocument());

        const botao = botaoNovo();
        await waitFor(() => expect(document.activeElement).toBe(botao));
        expect(botao).toBeEnabled();
    });

    it('cancelar o diálogo aninhado de endereço: o foco volta ao "Novo endereço"', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        const botao = botaoNovo();
        await user.click(botao);
        const dialogo = await dialogoEndereco('Novo endereço');
        await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
        await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Novo endereço' })).not.toBeInTheDocument());

        await waitFor(() => expect(document.activeElement).toBe(botao));
        expect(escritas()).toHaveLength(0);
    });
});

describe('AC-6: avisos de vínculo de município na edição', () => {
    it('com vínculo: UF trocada avisa remoção; cidade trocada com a mesma UF avisa vínculo antigo; UF tem precedência', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        await user.click(screen.getByRole('button', { name: 'Editar endereço Rua Alfa, 10' }));
        const dialogo = await dialogoEndereco('Editar endereço');
        expect(within(dialogo).queryByText(PESSOA_ENDERECO_AVISOS.ufTrocadaComVinculo)).not.toBeInTheDocument();
        expect(within(dialogo).queryByText(PESSOA_ENDERECO_AVISOS.cidadeTrocadaMesmaUfComVinculo)).not.toBeInTheDocument();

        await user.selectOptions(within(dialogo).getByLabelText(/^UF/), 'RJ');
        expect(within(dialogo).getByText(PESSOA_ENDERECO_AVISOS.ufTrocadaComVinculo)).toBeInTheDocument();
        expect(within(dialogo).queryByText(PESSOA_ENDERECO_AVISOS.cidadeTrocadaMesmaUfComVinculo)).not.toBeInTheDocument();

        // UF e cidade trocadas: só o aviso da UF (precedência).
        fireEvent.change(within(dialogo).getByLabelText(/^Cidade/), { target: { value: 'Niterói' } });
        expect(within(dialogo).getByText(PESSOA_ENDERECO_AVISOS.ufTrocadaComVinculo)).toBeInTheDocument();
        expect(within(dialogo).queryByText(PESSOA_ENDERECO_AVISOS.cidadeTrocadaMesmaUfComVinculo)).not.toBeInTheDocument();

        // Volta a UF original, cidade continua trocada: aviso do vínculo antigo.
        await user.selectOptions(within(dialogo).getByLabelText(/^UF/), 'SP');
        expect(within(dialogo).getByText(PESSOA_ENDERECO_AVISOS.cidadeTrocadaMesmaUfComVinculo)).toBeInTheDocument();
        expect(within(dialogo).queryByText(PESSOA_ENDERECO_AVISOS.ufTrocadaComVinculo)).not.toBeInTheDocument();
    });

    it('sem vínculo: trocar UF e cidade não mostra aviso nenhum', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        await user.click(screen.getByRole('button', { name: 'Editar endereço Rua Beta, 20' }));
        const dialogo = await dialogoEndereco('Editar endereço');
        await user.selectOptions(within(dialogo).getByLabelText(/^UF/), 'SP');
        expect(within(dialogo).queryByText(PESSOA_ENDERECO_AVISOS.ufTrocadaComVinculo)).not.toBeInTheDocument();
        await user.selectOptions(within(dialogo).getByLabelText(/^UF/), 'RJ');
        fireEvent.change(within(dialogo).getByLabelText(/^Cidade/), { target: { value: 'Niterói' } });
        expect(within(dialogo).queryByText(PESSOA_ENDERECO_AVISOS.ufTrocadaComVinculo)).not.toBeInTheDocument();
        expect(within(dialogo).queryByText(PESSOA_ENDERECO_AVISOS.cidadeTrocadaMesmaUfComVinculo)).not.toBeInTheDocument();
    });
});

describe('AC-7: o erro do backend chega ao ApiErrorPanel com code, status e traceId', () => {
    it('salvar recusado: o diálogo mostra code, HTTP, trace e o erro por campo, e a lista é relida', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialogo();
        abrirAba();
        await tabela();
        falharEscrita = true;

        await user.click(screen.getByRole('button', { name: 'Editar endereço Rua Beta, 20' }));
        const dialogo = await dialogoEndereco('Editar endereço');
        await user.click(within(dialogo).getByRole('button', { name: 'Salvar' }));

        expect(await within(dialogo).findByText('Endereço inválido para a pessoa.')).toBeInTheDocument();
        expect(within(dialogo).getByText('Código: PESSOAS_VALIDACAO • HTTP 400 • Trace: trace-b73-400')).toBeInTheDocument();
        expect(within(dialogo).getByText(/CEP deve ter 8 dígitos\./)).toBeInTheDocument();
        expect(within(dialogo).getByText(PESSOA_ENDERECOS_ERRO.listaDesatualizada)).toBeInTheDocument();
        await waitFor(() => expect(listagens()).toHaveLength(2));
    });

    it('lista recusada: painel com code e trace, e botão de nova tentativa', async () => {
        falharLista = true;
        renderDialogo();
        abrirAba();
        expect(await screen.findByText(PESSOA_ENDERECOS_ERRO.tituloListagem)).toBeInTheDocument();
        expect(screen.getByText('Código: PESSOAS_VALIDACAO • HTTP 400 • Trace: trace-b73-400')).toBeInTheDocument();
        falharLista = false;
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: PESSOA_ENDERECOS_ERRO.tentarNovamente }));
        });
        expect(await screen.findByRole('cell', { name: 'Rua Alfa, 10' })).toBeInTheDocument();
    });
});
