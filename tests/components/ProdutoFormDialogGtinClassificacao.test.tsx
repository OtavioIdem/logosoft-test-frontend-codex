import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProdutoFormDialog } from '@/features/produtos/components/ProdutoFormDialog';
import { gtinClassificacaoLabels as labels } from '@/features/produtos/components/gtinClassificacaoLabels';
import type { CodigoBarrasProdutoResponse, ProdutoFormValues, ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { httpClient } from '@/lib/http/httpClient';
import type { CurrentUser, PermissionCode } from '@/types/erp';
import { EntityStatus, TipoProduto } from '@/types/erp';

// v1.11.0a8b80 (D111) — COMPORTAMENTO da sugestão por GTIN dentro do ProdutoFormDialog, aba "Dados fiscais". O diálogo,
// o painel, o hook, o client e o `httpClient` são os reais. Trocados: a rede (adapter), o `Dropdown` (dublê em
// tests/mocks) e a sessão (`useAuth`, para que o `usePermissions` real leia uma sessão nominal).

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));

const { sessao } = vi.hoisted(() => ({ sessao: { user: null as CurrentUser | null } }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: sessao.user }) }));

const sessaoCom = (...permissoes: PermissionCode[]): CurrentUser => ({ id: '11111111-1111-4111-8111-111111111111', nome: 'Operador', email: 'operador@teste.local', isMaster: false, permissoes });

const pagina = (items: unknown[], totalItems = items.length) => ({ items, page: 1, pageSize: 100, totalItems, totalPages: 1 });
const adapterOriginal = httpClient.defaults.adapter;

const GTIN_14 = '07891000100103';
const PREFIXO_ROTA = '/api/fiscal/cadastros/gtin-classificacao/';
const NCM_A = '22030000'; // vínculos de CEST: 0300100, 0300200
const NCM_B = '33030010'; // vínculos de CEST: 0500100
const NCM_SEM = '10059010';
const vinculosPorNcm: Record<string, string[]> = { [NCM_A]: ['0300100', '0300200'], [NCM_B]: ['0500100'], [NCM_SEM]: [] };
const ncmCatalogo = [NCM_A, NCM_B, NCM_SEM].map((codigo) => ({ id: `id-${codigo}`, codigo, descricao: `NCM ${codigo}`, ativo: true }));

let sugestao: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
let chamadasGtin: string[];

const resposta = async (config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> => {
    if (status >= 400) {
        throw new AxiosError('falha', 'ERR_BAD_RESPONSE', config, null, { status, statusText: 'ERR', headers: new AxiosHeaders(), config, data });
    }
    return { data, status, statusText: 'OK', headers: new AxiosHeaders(), config };
};

const encontradoComNcm = (ncmCodigo: string) => ({
    gtin: GTIN_14,
    encontrado: true,
    classificacao: {
        anexo: 'I',
        itemAnexo: '1.2',
        descricaoItemAnexo: 'Cesta básica',
        ncmCodigo,
        cstIbsCbs: '200',
        classificacaoTributaria: '000001',
        percentualReducaoIbs: 60,
        percentualReducaoCbs: 40,
        vigenciaInicio: '2026-01-01',
        vigenciaFim: null,
        alternativas: null
    }
});

beforeEach(() => {
    sessao.user = sessaoCom('FISCAL_CADASTROS_CONSULTAR', 'PRODUTOS_DADOS_FISCAIS_GERENCIAR');
    chamadasGtin = [];
    sugestao = (config) => resposta(config, 200, encontradoComNcm(NCM_B));
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const params = (config.params ?? {}) as Record<string, unknown>;
        const url = String(config.url);
        if (url.startsWith(PREFIXO_ROTA)) {
            chamadasGtin.push(url);
            return sugestao(config);
        }
        let data: unknown = pagina([]);
        if (['/api/produtos/unidades-medida', '/api/produtos/categorias', '/api/produtos/marcas'].includes(url)) data = [];
        if (url === '/api/fiscal/cadastros/ncm') data = pagina(ncmCatalogo);
        if (url === '/api/fiscal/cadastros/ncm-cest') {
            const ncm = String(params.ncmCodigo);
            data = pagina((vinculosPorNcm[ncm] ?? []).map((cestCodigo, i) => ({ id: `v${i}`, ncmId: 'n', ncmCodigo: ncm, cestId: `c${i}`, cestCodigo, ativo: true })));
        }
        if (url === '/api/fiscal/cadastros/cest') data = pagina([{ id: 'c', codigo: params.codigo, descricao: `CEST ${String(params.codigo)}`, ativo: true }]);
        if (url === '/api/fiscal/cadastros/origens-mercadoria') data = pagina([{ id: 'o0', codigo: '0', descricao: 'Nacional', ehEstrangeira: false, ativo: true }]);
        return resposta(config, 200, data);
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

const barra = (codigo: string, principal = true): CodigoBarrasProdutoResponse => ({ codigo, principal });

const produto = (id: string, ncm: string | null, cest: string | null, codigosBarras: CodigoBarrasProdutoResponse[] = [barra(GTIN_14)]): ProdutoResponse => ({
    id,
    empresaId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    filialId: null,
    codigo: `P-${id}`,
    descricao: `Produto ${id}`,
    tipoProduto: TipoProduto.Mercadoria,
    unidadeMedidaId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    precoVendaBase: 10,
    custoReferencial: 5,
    controlaEstoque: true,
    controlaQualidade: false,
    permiteVenda: true,
    permiteCompra: true,
    ncm,
    cest,
    exTipi: '01',
    codigoBeneficioFiscalPadrao: 'RS123456',
    codigoFiscalExterno: 'EXT-77',
    status: EntityStatus.Ativo,
    codigosBarras,
    fornecedores: []
});

const Harness = ({ produtos, onSubmit }: { produtos: Record<string, ProdutoResponse>; onSubmit: (values: ProdutoFormValues) => Promise<void> }) => {
    const [visible, setVisible] = useState(false);
    const [record, setRecord] = useState<ProdutoResponse | null>(null);
    return (
        <>
            {Object.keys(produtos).map((chave) => (
                <button key={chave} type="button" onClick={() => { setRecord(produtos[chave]); setVisible(true); }}>
                    {`abrir-${chave}`}
                </button>
            ))}
            <ProdutoFormDialog visible={visible} record={record} onHide={() => setVisible(false)} onSubmit={onSubmit} />
        </>
    );
};

const montar = async (produtos: Record<string, ProdutoResponse>) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_values: ProdutoFormValues) => undefined);
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
            <Harness produtos={produtos} onSubmit={onSubmit} />
        </QueryClientProvider>
    );
    return { user, onSubmit };
};

const abrir = async (user: ReturnType<typeof userEvent.setup>, chave: string) => {
    await user.click(screen.getByRole('button', { name: `abrir-${chave}` }));
    await user.click(await screen.findByRole('tab', { name: 'Dados fiscais' }));
    await screen.findByRole('combobox', { name: 'NCM' });
};

const aguardarVinculos = async (primeiroCest: string) => {
    await screen.findByRole('option', { name: new RegExp(`^${primeiroCest}`) });
};

const sugerir = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole('button', { name: labels.botao }));
};

const salvar = async (user: ReturnType<typeof userEvent.setup>, onSubmit: ReturnType<typeof vi.fn>) => {
    await user.click(screen.getByRole('button', { name: /Salvar/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    return onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0] as unknown as Record<string, unknown>;
};

describe('ProdutoFormDialog — "Sugerir classificação" na aba Dados fiscais (D111)', () => {
    it('AC-1: com FISCAL_CADASTROS_CONSULTAR o botão aparece na edição', async () => {
        const { user } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        expect(await screen.findByRole('button', { name: labels.botao })).toBeEnabled();
    });

    it('AC-1: sem FISCAL_CADASTROS_CONSULTAR a aba segue renderizada e o botão não existe', async () => {
        sessao.user = sessaoCom('PRODUTOS_DADOS_FISCAIS_GERENCIAR');
        const { user } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        // A aba só conta como renderizada se a própria tela de dados fiscais estiver montada: o campo EX-TIPI prova isso.
        expect(screen.getByLabelText('EX-TIPI')).toHaveValue('01');
        await aguardarVinculos('0300100');
        expect(screen.queryByRole('button', { name: labels.botao })).not.toBeInTheDocument();
        expect(chamadasGtin).toEqual([]);
    });

    it('AC-6: abrir o diálogo e a aba não dispara consulta ao GTIN', async () => {
        const { user } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await aguardarVinculos('0300100');
        expect(screen.getByRole('button', { name: labels.botao })).toBeEnabled();
        expect(chamadasGtin).toEqual([]);
    });

    it('AC-5: "Usar este NCM" troca só o NCM, pelo mesmo caminho do select: CEST fora dos vínculos é reconferido e nenhum outro campo muda', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await aguardarVinculos('0300100');
        const antes = await salvar(user, onSubmit);

        await sugerir(user);
        await user.click(await screen.findByRole('button', { name: `${labels.usarNcm} ${NCM_B}` }));
        expect(chamadasGtin).toEqual([`${PREFIXO_ROTA}${GTIN_14}`]);
        expect(screen.getByRole('combobox', { name: 'NCM' })).toHaveDisplayValue(new RegExp(NCM_B));

        await aguardarVinculos('0500100');
        const depois = await salvar(user, onSubmit);
        expect(depois.ncmCodigo).toBe(NCM_B);
        expect(depois.cestCodigo).toBeNull();

        // Campo a campo: qualquer campo que o clique tivesse alterado aparece aqui com o nome.
        const outrosCampos = Object.keys(antes).filter((campo) => campo !== 'ncmCodigo' && campo !== 'cestCodigo');
        expect(outrosCampos).toEqual(expect.arrayContaining(['exTipi', 'codigoBeneficioFiscalPadrao', 'codigoFiscalExterno', 'descricao', 'precoVendaBase']));
        for (const campo of outrosCampos) {
            expect(depois[campo], `campo ${campo} mudou com "Usar este NCM"`).toEqual(antes[campo]);
        }
    });

    it('AC-5: a sugestão só aparece depois do clique e antes dele o NCM do formulário segue o gravado', async () => {
        const { user } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await aguardarVinculos('0300100');
        await sugerir(user);
        await screen.findByRole('button', { name: `${labels.usarNcm} ${NCM_B}` });
        expect(screen.getByRole('combobox', { name: 'NCM' })).toHaveDisplayValue(new RegExp(NCM_A));
    });

    it('AC-5: NCM sugerido igual ao atual não oferece "Usar este NCM" dentro do diálogo', async () => {
        sugestao = (config) => resposta(config, 200, encontradoComNcm(NCM_A));
        const { user } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await sugerir(user);
        // Espera o resultado chegar (a vigência só existe com `encontrado: true`) antes de afirmar que não há troca.
        expect(await screen.findByText('Vigência', { selector: 'dt' })).toBeInTheDocument();
        expect(chamadasGtin).toHaveLength(1);
        expect(screen.queryByRole('button', { name: new RegExp(`^${labels.usarNcm}`) })).not.toBeInTheDocument();
    });

    it('AC-6: erro na consulta não bloqueia o Salvar', async () => {
        sugestao = (config) => resposta(config, 500, { message: 'falha interna' });
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await aguardarVinculos('0300100');
        await sugerir(user);
        expect(await screen.findByText('falha interna')).toBeInTheDocument();

        const values = await salvar(user, onSubmit);
        expect(values.ncmCodigo).toBe(NCM_A);
        expect(values.cestCodigo).toBe('0300100');
    });

    it('AC-7: 403 esconde o painel dentro do diálogo e o Salvar segue disponível', async () => {
        sugestao = (config) => resposta(config, 403, { message: 'sem permissão' });
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await aguardarVinculos('0300100');
        await sugerir(user);
        await waitFor(() => expect(screen.queryByRole('button', { name: labels.botao })).not.toBeInTheDocument());
        expect(screen.queryByRole('region', { name: labels.regiao })).not.toBeInTheDocument();

        await salvar(user, onSubmit);
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });
});
