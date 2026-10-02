import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NaturezasOperacaoPage } from '@/features/fiscal/components/NaturezasOperacaoPage';
import {
    NATUREZAS_OPERACAO_PAGINA,
    NATUREZAS_OPERACAO_PERMISSAO,
    NATUREZAS_OPERACAO_VAZIO,
    NATUREZA_CFOP_GRADE,
    NATUREZA_CODIGO_DUPLICADO,
    NATUREZA_MOTIVO_INATIVAR_MAX,
    NATUREZA_OPERACAO_INATIVAR_DIALOG
} from '@/features/fiscal/components/naturezasOperacaoLabels';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';
import { httpClient } from '@/lib/http/httpClient';

// b72 (D98) — tela de naturezas com a página, os diálogos, os hooks, o client e o `httpClient` REAIS. Só a rede
// (adapter do axios) é trocada: o que se afirma é o request que sairia para o backend. Ficam dublados apenas a
// sessão (permissões), o contexto organizacional, as listas de empresa/filial (fora da prova) e o `Dropdown` do
// PrimeReact (dublê em `tests/mocks/primereact/dropdown.tsx`, porque o painel real não é operável no jsdom).

const { estado } = vi.hoisted(() => ({ estado: { perms: [] as string[], empresaId: null as string | null } }));

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || estado.perms.includes(code);
    return {
        usePermissions: () => ({
            hasPermission: has,
            hasAnyPermission: (codes?: string[]) => !codes || codes.length === 0 || codes.some(has),
            hasAllPermissions: (codes?: string[]) => !codes || codes.length === 0 || codes.every(has)
        })
    };
});
vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => {
        const snapshot = { empresaId: estado.empresaId, filialId: null, isMaster: false, revision: 1 };
        return {
            empresaId: estado.empresaId,
            filialId: null,
            isGlobal: false,
            canChangeOrganization: true,
            requiresOrganizationSelection: false,
            snapshot,
            organizationalScopeKey: organizationalScopeKey(snapshot as never),
            setEmpresaId: vi.fn(),
            setFilialId: vi.fn()
        };
    }
}));
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/administracao/hooks/useEmpresaFilialOptions')>()),
    useEmpresasOptions: () => ({ options: [{ label: 'Empresa A', value: '11111111-1111-1111-1111-111111111111' }], data: [], isLoading: false, isFetching: false }),
    useFiliaisOptions: () => ({ options: [], data: [], isLoading: false, isFetching: false, isFetched: true, isError: false, error: null })
}));

const empresaA = '11111111-1111-1111-1111-111111111111';
const empresaB = '99999999-9999-9999-9999-999999999999';
const naturezaId = '44444444-4444-4444-4444-444444444444';
const cfop5102 = 'c5102000-0000-0000-0000-000000000000';
const cfop5405 = 'c5405000-0000-0000-0000-000000000000';
const cfop6102 = 'c6102000-0000-0000-0000-000000000000';

const S1 = ['FISCAL_CONSULTAR', 'FISCAL_CADASTROS_CONSULTAR'];
const S2 = ['FISCAL_CONSULTAR', 'FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'];
const S3 = ['FISCAL_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'];

// Natureza carregada com 3 mapeamentos, dois deles "qualquer item" (`tipoItem: null`).
const naturezaCarregada = () => ({
    id: naturezaId,
    empresaId: empresaA,
    filialId: null,
    codigo: 'VENDA',
    descricao: 'Venda de mercadoria',
    tipoDocumento: 1,
    tipoOperacao: 1,
    finalidade: 1,
    indicadorPresencaComprador: 1,
    indicadorConsumidorFinal: false,
    movimentaEstoque: true,
    geraFinanceiro: true,
    observacao: 'Obs original',
    ativa: true,
    cfops: [
        { ambito: 1, cfopId: cfop5102, cfopCodigo: '5102', tipoItem: null },
        { ambito: 2, cfopId: cfop6102, cfopCodigo: '6102', tipoItem: null },
        { ambito: 1, cfopId: cfop5405, cfopCodigo: '5405', tipoItem: 2 }
    ]
});

const naturezaInativa = () => ({ ...naturezaCarregada(), id: '55555555-5555-5555-5555-555555555555', codigo: 'ANTIGA', descricao: 'Natureza encerrada', ativa: false, cfops: [] });

const catalogoCfop = [
    { id: cfop5102, codigo: '5102', descricao: 'Venda de mercadoria adquirida', tipo: 2, ambito: 1, ativo: true },
    { id: cfop5405, codigo: '5405', descricao: 'Venda com ST', tipo: 2, ambito: 1, ativo: true },
    { id: cfop6102, codigo: '6102', descricao: 'Venda interestadual', tipo: 2, ambito: 2, ativo: true }
];

type Capturado = { method?: string; url?: string; params: Record<string, unknown>; body: Record<string, unknown> | undefined };

let capturados: Capturado[];
let naturezasNaLista: ReturnType<typeof naturezaCarregada>[];
let respostaEscrita: 'ok' | 'duplicado';
const adapterOriginal = httpClient.defaults.adapter;

const ok = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config });

const instalarRede = () => {
    capturados = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const params = (config.params ?? {}) as Record<string, unknown>;
        capturados.push({ method: config.method, url: config.url, params, body: config.data ? JSON.parse(String(config.data)) : undefined });
        if (config.method === 'get' && config.url === '/api/fiscal/naturezas-operacao') {
            const itens = naturezasNaLista.filter((item) => params.somenteAtivas !== true || item.ativa);
            return ok(config, { items: itens, page: 1, pageSize: 20, totalItems: itens.length, totalPages: 1 });
        }
        if (config.method === 'get' && config.url === '/api/fiscal/cadastros/cfop') {
            const itens = catalogoCfop.filter((item) => (params.ambito === undefined || item.ambito === params.ambito) && (params.tipo === undefined || item.tipo === params.tipo));
            return ok(config, { items: itens, page: 1, pageSize: 20, totalItems: itens.length, totalPages: 1 });
        }
        if (config.method === 'post' && config.url === '/api/fiscal/naturezas-operacao') {
            if (respostaEscrita === 'duplicado') {
                const response = { data: { code: NATUREZA_CODIGO_DUPLICADO.codigoDoErro, message: 'Já existe natureza com o código VENDA.', traceId: 'trace-dup' }, status: 400, statusText: 'Bad Request', headers: new AxiosHeaders(), config };
                throw new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, response);
            }
            return ok(config, { ...naturezaCarregada(), id: '66666666-6666-6666-6666-666666666666', codigo: 'NOVA' }, 201);
        }
        if (config.method === 'put' && config.url === `/api/fiscal/naturezas-operacao/${naturezaId}`) return ok(config, naturezaCarregada());
        if (config.method === 'post' && config.url === `/api/fiscal/naturezas-operacao/${naturezaId}/inativar`) return { data: '', status: 204, statusText: 'No Content', headers: {}, config };
        throw new Error(`Rota não esperada no teste: ${config.method} ${config.url}`);
    });
};

const renderPagina = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const view = render(
        <QueryClientProvider client={client}>
            <NaturezasOperacaoPage />
        </QueryClientProvider>
    );
    return { ...view, client, rerenderPagina: () => view.rerender(<QueryClientProvider client={client}><NaturezasOperacaoPage /></QueryClientProvider>) };
};

const listagens = () => capturados.filter((item) => item.method === 'get' && item.url === '/api/fiscal/naturezas-operacao');
const buscasCfop = () => capturados.filter((item) => item.method === 'get' && item.url === '/api/fiscal/cadastros/cfop');
const escritas = () => capturados.filter((item) => item.method !== 'get');
const dialogo = (nome: string | RegExp) => screen.findByRole('dialog', { name: nome });
// O `Campo` do diálogo agrupa rótulo, controle e mensagem de erro no mesmo contêiner; o erro do campo é procurado nele.
const campoDe = (controle: HTMLElement) => controle.parentElement as HTMLElement;

const preparar = () => {
    estado.perms = S2;
    estado.empresaId = empresaA;
    naturezasNaLista = [naturezaCarregada(), naturezaInativa()];
    respostaEscrita = 'ok';
    instalarRede();
};

beforeEach(preparar);

// Limite por teste acima do padrão de 5 s: medido pelo QA, os testes mais lentos deste arquivo levam de 5,6 a 7,3 s
// sob a carga da varredura, por causa da digitação (user.type) nos campos do diálogo. O limite não muda asserção.
vi.setConfig({ testTimeout: 30_000 });

// Antes do primeiro teste: prepara sessão, contexto e rede, monta a página uma vez, espera a linha VENDA da
// listagem, desmonta e devolve o adapter original do axios. Nada é afirmado aqui.
beforeAll(async () => {
    preparar();
    const { unmount } = renderPagina();
    await screen.findByRole('cell', { name: 'VENDA' });
    unmount();
    httpClient.defaults.adapter = adapterOriginal;
}, 30_000);

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

describe('AC-2: listagem por empresa, filtro Ativas/Todas e troca de empresa', () => {
    it('sem empresa no contexto não consulta e diz por quê', async () => {
        estado.empresaId = null;
        renderPagina();
        expect(await screen.findByText(NATUREZAS_OPERACAO_VAZIO.semEmpresa)).toBeInTheDocument();
        expect(listagens()).toHaveLength(0);
    });

    it('"Ativas" (padrão) envia somenteAtivas=true; "Todas" omite o parâmetro', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        expect(await screen.findByRole('cell', { name: 'VENDA' })).toBeInTheDocument();
        expect(listagens()[0].params).toMatchObject({ empresaId: empresaA, somenteAtivas: true, pagina: 1 });
        expect(screen.queryByRole('cell', { name: 'ANTIGA' })).not.toBeInTheDocument();

        await user.selectOptions(screen.getByRole('combobox', { name: NATUREZAS_OPERACAO_PAGINA.campoSituacao }), 'Todas');
        expect(await screen.findByRole('cell', { name: 'ANTIGA' })).toBeInTheDocument();
        const ultima = listagens().at(-1)!;
        expect(ultima.params.empresaId).toBe(empresaA);
        expect(ultima.params).not.toHaveProperty('somenteAtivas');
    });

    it('trocar a empresa do contexto refaz a consulta com a empresa nova', async () => {
        const { rerenderPagina } = renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        expect(listagens().every((item) => item.params.empresaId === empresaA)).toBe(true);

        estado.empresaId = empresaB;
        rerenderPagina();
        await waitFor(() => expect(listagens().some((item) => item.params.empresaId === empresaB)).toBe(true));
    });
});

describe('AC-3: sessões S1, S2 e S3', () => {
    it('S1 (só consultar) vê a lista, com Nova natureza desabilitada pelo motivo, e sem Editar nem Inativar', async () => {
        estado.perms = S1;
        renderPagina();
        expect(await screen.findByRole('cell', { name: 'VENDA' })).toBeInTheDocument();
        const nova = screen.getByRole('button', { name: NATUREZAS_OPERACAO_PAGINA.novaNatureza });
        expect(nova).toBeDisabled();
        expect(nova).toHaveAttribute('title', NATUREZAS_OPERACAO_PERMISSAO.novaNaturezaSemGerenciar);
        expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Inativar' })).not.toBeInTheDocument();
    });

    it('S2 (consultar + gerenciar) opera tudo na natureza ativa; a inativa fica sem ação', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        expect(screen.getByRole('button', { name: NATUREZAS_OPERACAO_PAGINA.novaNatureza })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Editar' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Inativar' })).toBeEnabled();

        await user.selectOptions(screen.getByRole('combobox', { name: NATUREZAS_OPERACAO_PAGINA.campoSituacao }), 'Todas');
        await screen.findByRole('cell', { name: 'ANTIGA' });
        // Duas linhas, uma ação de cada: só a ativa tem Editar/Inativar.
        expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: 'Inativar' })).toHaveLength(1);
    });

    it('S3 (só gerenciar) alcança a página e vê o UnauthorizedState, sem nenhuma consulta', async () => {
        estado.perms = S3;
        renderPagina();
        expect(await screen.findByText(NATUREZAS_OPERACAO_PERMISSAO.unauthorizedDescription)).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: NATUREZAS_OPERACAO_PAGINA.novaNatureza })).not.toBeInTheDocument();
        expect(capturados).toHaveLength(0);
    });
});

const preencherClassificacao = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, operacao = 'Venda') => {
    await user.selectOptions(within(dialog).getByLabelText('Tipo de documento'), 'NF-e');
    await user.selectOptions(within(dialog).getByLabelText('Tipo de operação'), operacao);
    await user.selectOptions(within(dialog).getByLabelText('Finalidade'), 'Normal');
    await user.selectOptions(within(dialog).getByLabelText('Presença do comprador'), 'Presencial');
};

describe('AC-4: criar e editar', () => {
    it('criar envia a empresa do contexto, filial null e os 13 campos, com o CFOP pelo código', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        await user.click(screen.getByRole('button', { name: NATUREZAS_OPERACAO_PAGINA.novaNatureza }));
        const dialog = await dialogo('Cadastrar natureza de operação');

        await user.type(within(dialog).getByLabelText('Código'), 'VENDA 2');
        await user.type(within(dialog).getByLabelText('Descrição'), 'Venda interna');
        await preencherClassificacao(user, dialog);
        await user.click(within(dialog).getByRole('button', { name: NATUREZA_CFOP_GRADE.adicionarLinha }));
        const cfop = within(dialog).getByRole('combobox', { name: NATUREZA_CFOP_GRADE.cfopPlaceholder });
        await within(cfop).findByRole('option', { name: '5102 — Venda de mercadoria adquirida' });
        await user.selectOptions(cfop, '5102 — Venda de mercadoria adquirida');
        await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

        await waitFor(() => expect(escritas()).toHaveLength(1));
        const [post] = escritas();
        expect(post).toMatchObject({ method: 'post', url: '/api/fiscal/naturezas-operacao' });
        expect(Object.keys(post.body!).sort()).toEqual(['cfops', 'codigo', 'descricao', 'empresaId', 'filialId', 'finalidade', 'geraFinanceiro', 'indicadorConsumidorFinal', 'indicadorPresencaComprador', 'movimentaEstoque', 'observacao', 'tipoDocumento', 'tipoOperacao']);
        expect(post.body).toMatchObject({ empresaId: empresaA, filialId: null, codigo: 'VENDA2', descricao: 'Venda interna', tipoDocumento: 1, tipoOperacao: 1, finalidade: 1, indicadorPresencaComprador: 1, observacao: null });
        // AC-5: o body leva o CÓDIGO do CFOP, nunca o id.
        expect(post.body!.cfops).toEqual([{ ambito: 1, cfopCodigo: '5102', tipoItem: null }]);
    });

    it('FISCAL_CADASTROS_NATUREZA_CODIGO_DUPLICADO aparece no campo Código, e o diálogo fica aberto', async () => {
        const user = userEvent.setup({ delay: null });
        respostaEscrita = 'duplicado';
        renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        await user.click(screen.getByRole('button', { name: NATUREZAS_OPERACAO_PAGINA.novaNatureza }));
        const dialog = await dialogo('Cadastrar natureza de operação');
        await user.type(within(dialog).getByLabelText('Código'), 'VENDA');
        await user.type(within(dialog).getByLabelText('Descrição'), 'Outra venda');
        await preencherClassificacao(user, dialog);
        await user.click(within(dialog).getByRole('button', { name: 'Cadastrar' }));

        const codigo = within(dialog).getByLabelText('Código');
        expect(await within(campoDe(codigo)).findByText(NATUREZA_CODIGO_DUPLICADO.campo)).toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: 'Cadastrar natureza de operação' })).toBeInTheDocument();
        // O erro de campo não é repetido no painel geral.
        expect(within(dialog).queryByText('Já existe natureza com o código VENDA.')).not.toBeInTheDocument();
    });

    it('na edição o código é só leitura e não vai no PUT', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        await user.click(screen.getByRole('button', { name: 'Editar' }));
        const dialog = await dialogo('Editar natureza de operação VENDA');
        const codigo = within(dialog).getByLabelText('Código');
        expect(codigo).toBeDisabled();
        expect(codigo).toHaveValue('VENDA');

        await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
        await waitFor(() => expect(escritas()).toHaveLength(1));
        const [put] = escritas();
        expect(put).toMatchObject({ method: 'put', url: `/api/fiscal/naturezas-operacao/${naturezaId}` });
        expect(put.body).not.toHaveProperty('codigo');
        expect(put.body).not.toHaveProperty('empresaId');
        expect(put.body).not.toHaveProperty('filialId');
    });
});

describe('AC-5: grade de CFOP', () => {
    it('chave (âmbito, tipo de item) repetida marca as duas linhas e desabilita Cadastrar; nenhum POST sai', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        await user.click(screen.getByRole('button', { name: NATUREZAS_OPERACAO_PAGINA.novaNatureza }));
        const dialog = await dialogo('Cadastrar natureza de operação');
        await user.type(within(dialog).getByLabelText('Código'), 'X');
        await user.type(within(dialog).getByLabelText('Descrição'), 'X');
        await preencherClassificacao(user, dialog);
        await user.click(within(dialog).getByRole('button', { name: NATUREZA_CFOP_GRADE.adicionarLinha }));
        await user.click(within(dialog).getByRole('button', { name: NATUREZA_CFOP_GRADE.adicionarLinha }));

        // A linha nova nasce livre (Interestadual × Qualquer item): nada marcado ainda.
        expect(within(dialog).queryByText(NATUREZA_CFOP_GRADE.chaveRepetida)).not.toBeInTheDocument();
        const ambitos = within(dialog).getAllByRole('combobox', { name: NATUREZA_CFOP_GRADE.colunaAmbito });
        expect(ambitos).toHaveLength(2);
        await user.selectOptions(ambitos[1], 'Interno');

        expect(within(dialog).getAllByText(NATUREZA_CFOP_GRADE.chaveRepetida)).toHaveLength(2);
        expect(within(dialog).getByText(NATUREZA_CFOP_GRADE.chaveRepetidaAviso)).toBeInTheDocument();
        const cadastrar = within(dialog).getByRole('button', { name: 'Cadastrar' });
        expect(cadastrar).toBeDisabled();
        expect(cadastrar).toHaveAttribute('title', NATUREZA_CFOP_GRADE.chaveRepetidaAviso);

        // Desfazer a colisão pelo tipo de item libera o salvar.
        await user.selectOptions(within(dialog).getAllByRole('combobox', { name: NATUREZA_CFOP_GRADE.colunaTipoItem })[1], 'Revenda');
        expect(within(dialog).queryByText(NATUREZA_CFOP_GRADE.chaveRepetida)).not.toBeInTheDocument();
        expect(within(dialog).getByRole('button', { name: 'Cadastrar' })).toBeEnabled();
        expect(escritas()).toHaveLength(0);
    });

    it('a busca de CFOP da linha envia o âmbito da linha e o tipo pela operação (Venda→Saída, Compra→Entrada, outro sem tipo)', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        await user.click(screen.getByRole('button', { name: NATUREZAS_OPERACAO_PAGINA.novaNatureza }));
        const dialog = await dialogo('Cadastrar natureza de operação');
        await user.selectOptions(within(dialog).getByLabelText('Tipo de operação'), 'Venda');
        await user.click(within(dialog).getByRole('button', { name: NATUREZA_CFOP_GRADE.adicionarLinha }));

        await waitFor(() => expect(buscasCfop().at(-1)?.params).toMatchObject({ ambito: 1, tipo: 2, ativo: true }));

        await user.selectOptions(within(dialog).getByLabelText('Tipo de operação'), 'Compra');
        await waitFor(() => expect(buscasCfop().at(-1)?.params).toMatchObject({ ambito: 1, tipo: 1 }));

        await user.selectOptions(within(dialog).getByLabelText('Tipo de operação'), 'Devolução');
        await waitFor(() => {
            const ultima = buscasCfop().at(-1)!;
            expect(ultima.params).toMatchObject({ ambito: 1 });
            expect(ultima.params).not.toHaveProperty('tipo');
        });

        await user.selectOptions(within(dialog).getByRole('combobox', { name: NATUREZA_CFOP_GRADE.colunaAmbito }), 'Interestadual');
        await waitFor(() => {
            const ultima = buscasCfop().at(-1)!;
            expect(ultima.params).toMatchObject({ ambito: 2 });
            expect(ultima.params).not.toHaveProperty('tipo');
        });
    });
});

describe('AC-6: o PUT sempre leva a lista completa de mapeamentos', () => {
    const abrirEdicao = async (user: ReturnType<typeof userEvent.setup>) => {
        renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        await user.click(screen.getByRole('button', { name: 'Editar' }));
        return dialogo('Editar natureza de operação VENDA');
    };

    it('editar só a descrição reenvia os 3 mapeamentos carregados, com tipoItem null explícito', async () => {
        const user = userEvent.setup({ delay: null });
        const dialog = await abrirEdicao(user);
        const descricao = within(dialog).getByLabelText('Descrição');
        await user.clear(descricao);
        await user.type(descricao, 'Venda de mercadoria revisada');
        await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

        await waitFor(() => expect(escritas()).toHaveLength(1));
        const body = escritas()[0].body!;
        expect(body.descricao).toBe('Venda de mercadoria revisada');
        expect(body.cfops).toEqual([
            { ambito: 1, cfopCodigo: '5102', tipoItem: null },
            { ambito: 2, cfopCodigo: '6102', tipoItem: null },
            { ambito: 1, cfopCodigo: '5405', tipoItem: 2 }
        ]);
        // `null` explícito: a chave existe no JSON (omitida, o backend leria o genérico do mesmo jeito, mas a prova é do contrato).
        expect((body.cfops as Record<string, unknown>[]).filter((item) => Object.prototype.hasOwnProperty.call(item, 'tipoItem') && item.tipoItem === null)).toHaveLength(2);
    });

    it('remover uma linha envia a lista sem ela, e só sem ela', async () => {
        const user = userEvent.setup({ delay: null });
        const dialog = await abrirEdicao(user);
        await user.click(within(dialog).getByRole('button', { name: NATUREZA_CFOP_GRADE.removerLinhaAria('Interestadual', 'Qualquer item') }));
        await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

        await waitFor(() => expect(escritas()).toHaveLength(1));
        expect(escritas()[0].body!.cfops).toEqual([
            { ambito: 1, cfopCodigo: '5102', tipoItem: null },
            { ambito: 1, cfopCodigo: '5405', tipoItem: 2 }
        ]);
    });

    it('remover todas as linhas envia [] explícito; cfops nunca sai null nem ausente', async () => {
        const user = userEvent.setup({ delay: null });
        const dialog = await abrirEdicao(user);
        for (const aria of [NATUREZA_CFOP_GRADE.removerLinhaAria('Interno', 'Qualquer item'), NATUREZA_CFOP_GRADE.removerLinhaAria('Interestadual', 'Qualquer item'), NATUREZA_CFOP_GRADE.removerLinhaAria('Interno', 'Produção própria')]) {
            await user.click(within(dialog).getByRole('button', { name: aria }));
        }
        expect(within(dialog).getByText(NATUREZA_CFOP_GRADE.vazio)).toBeInTheDocument();
        await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

        await waitFor(() => expect(escritas()).toHaveLength(1));
        const body = escritas()[0].body!;
        expect(Object.prototype.hasOwnProperty.call(body, 'cfops')).toBe(true);
        expect(body.cfops).toEqual([]);
    });
});

describe('AC-7: inativar', () => {
    it('exige motivo (1 a 400), diz que é definitivo, envia o motivo, aceita 204 e refaz a lista', async () => {
        const user = userEvent.setup({ delay: null });
        renderPagina();
        await screen.findByRole('cell', { name: 'VENDA' });
        const consultasAntes = listagens().length;
        await user.click(screen.getByRole('button', { name: 'Inativar' }));
        const dialog = await dialogo('Inativar natureza de operação VENDA (definitivo)');

        expect(within(dialog).getByText(new RegExp(NATUREZA_OPERACAO_INATIVAR_DIALOG.avisoDefinitivo.slice(0, 40)))).toBeInTheDocument();
        const motivo = within(dialog).getByLabelText('Motivo obrigatório');
        expect(motivo).toHaveAttribute('maxlength', String(NATUREZA_MOTIVO_INATIVAR_MAX));
        const confirmar = within(dialog).getByRole('button', { name: 'Inativar' });
        expect(confirmar).toBeDisabled();
        await user.type(motivo, '   ');
        expect(confirmar).toBeDisabled();

        await user.type(motivo, 'Natureza substituída pela VENDA2  ');
        await user.click(confirmar);

        await waitFor(() => expect(escritas()).toHaveLength(1));
        expect(escritas()[0]).toMatchObject({ method: 'post', url: `/api/fiscal/naturezas-operacao/${naturezaId}/inativar`, body: { motivo: 'Natureza substituída pela VENDA2' } });
        await waitFor(() => expect(screen.queryByRole('dialog', { name: /Inativar natureza/ })).not.toBeInTheDocument());
        // A mutação invalida a raiz: a lista é consultada de novo.
        await waitFor(() => expect(listagens().length).toBeGreaterThan(consultasAntes));
    });
});
