import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProdutoFormDialog } from '@/features/produtos/components/ProdutoFormDialog';
import type { ProdutoFormValues, ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { httpClient } from '@/lib/http/httpClient';
import { EntityStatus, TipoProduto } from '@/types/erp';

// v1.11.0a8b77 — COMPORTAMENTO da limpeza do CEST no ProdutoFormDialog (não é grep de fonte). O diálogo, os hooks, o
// client e o `httpClient` são os reais; só a rede (adapter) e o `Dropdown` (dublê em tests/mocks) são trocados.
// O harness imita ProdutosPage: o diálogo fica SEMPRE montado e só muda `visible`/`record`.

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = () => true;
    return { usePermissions: () => ({ hasPermission: has, hasAnyPermission: has, hasAllPermissions: has }) };
});

const pagina = (items: unknown[], totalItems = items.length) => ({ items, page: 1, pageSize: 100, totalItems, totalPages: 1 });
const adapterOriginal = httpClient.defaults.adapter;

const NCM_A = '22030000'; // vínculos: 0300100, 0300200
const NCM_B = '33030010'; // vínculos: 0500100
const NCM_SEM = '10059010'; // sem vínculos
const NCM_PARCIAL = '99999999'; // 1 vínculo carregado de 150
const vinculosPorNcm: Record<string, string[]> = { [NCM_A]: ['0300100', '0300200'], [NCM_B]: ['0500100'], [NCM_SEM]: [], [NCM_PARCIAL]: ['0700100'] };
const ncmCatalogo = [NCM_A, NCM_B, NCM_SEM, NCM_PARCIAL].map((codigo) => ({ id: `id-${codigo}`, codigo, descricao: `NCM ${codigo}`, ativo: true }));

beforeEach(() => {
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const params = (config.params ?? {}) as Record<string, unknown>;
        let data: unknown = pagina([]);
        // Catálogos do produto (unidade, categoria, marca) devolvem array; grupos e unidades tributáveis, página.
        if (['/api/produtos/unidades-medida', '/api/produtos/categorias', '/api/produtos/marcas'].includes(String(config.url))) data = [];
        if (config.url === '/api/fiscal/cadastros/ncm')data = pagina(ncmCatalogo);
        if (config.url === '/api/fiscal/cadastros/ncm-cest') {
            const ncm = String(params.ncmCodigo);
            data = pagina(
                (vinculosPorNcm[ncm] ?? []).map((cestCodigo, i) => ({ id: `v${i}`, ncmId: 'n', ncmCodigo: ncm, cestId: `c${i}`, cestCodigo, ativo: true })),
                ncm === NCM_PARCIAL ? 150 : undefined
            );
        }
        if (config.url === '/api/fiscal/cadastros/cest') data = pagina([{ id: 'c', codigo: params.codigo, descricao: `CEST ${String(params.codigo)}`, ativo: true }]);
        if (config.url === '/api/fiscal/cadastros/origens-mercadoria') data = pagina([{ id: 'o0', codigo: '0', descricao: 'Nacional', ehEstrangeira: false, ativo: true }]);
        return { data, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config };
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

const produto = (id: string, ncm: string | null, cest: string | null): ProdutoResponse => ({
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
    status: EntityStatus.Ativo,
    codigosBarras: [],
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
            <button type="button" onClick={() => setVisible(false)}>fechar-externo</button>
            <ProdutoFormDialog visible={visible} record={record} onHide={() => setVisible(false)} onSubmit={onSubmit} />
        </>
    );
};

const montar = async (produtos: Record<string, ProdutoResponse>) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_values: ProdutoFormValues) => undefined);
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
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

const trocarNcm = async (user: ReturnType<typeof userEvent.setup>, codigo: string) => {
    const select = screen.getByRole('combobox', { name: 'NCM' });
    await screen.findByRole('option', { name: `${codigo} — NCM ${codigo}` });
    await user.selectOptions(select, `${codigo} — NCM ${codigo}`);
};

const aguardarVinculos = async (primeiroCest: string) => {
    await screen.findByRole('option', { name: new RegExp(`^${primeiroCest}`) });
};

const salvar = async (user: ReturnType<typeof userEvent.setup>, onSubmit: ReturnType<typeof vi.fn>) => {
    await user.click(screen.getByRole('button', { name: /Salvar/ }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    return onSubmit.mock.calls[onSubmit.mock.calls.length - 1][0] as ProdutoFormValues;
};

describe('ProdutoFormDialog: limpeza do CEST ao trocar o NCM (comportamento)', () => {
    it('troca de NCM com CEST fora dos vínculos do novo NCM zera o CEST no submit', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await trocarNcm(user, NCM_B);
        await aguardarVinculos('0500100');
        const values = await salvar(user, onSubmit);
        expect(values.ncmCodigo).toBe(NCM_B);
        expect(values.cestCodigo).toBeNull();
    });

    it('troca de NCM com CEST DENTRO dos vínculos do novo NCM mantém o CEST', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0500100') });
        await abrir(user, 'a');
        await trocarNcm(user, NCM_B);
        await aguardarVinculos('0500100');
        const values = await salvar(user, onSubmit);
        expect(values.ncmCodigo).toBe(NCM_B);
        expect(values.cestCodigo).toBe('0500100');
    });

    it('produto legado sem troca de NCM mantém o CEST, mesmo fora dos vínculos (o backend é quem recusa)', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '9999999') });
        await abrir(user, 'a');
        await aguardarVinculos('0300100');
        const values = await salvar(user, onSubmit);
        expect(values.ncmCodigo).toBe(NCM_A);
        expect(values.cestCodigo).toBe('9999999');
    });

    it('troca para NCM sem vínculos zera o CEST', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await trocarNcm(user, NCM_SEM);
        await waitFor(() => expect(screen.getAllByText('Este NCM não exige CEST.').length).toBeGreaterThan(0));
        const values = await salvar(user, onSubmit);
        expect(values.ncmCodigo).toBe(NCM_SEM);
        expect(values.cestCodigo).toBeNull();
    });

    it('lista de vínculos parcial (totalItems > página) não limpa o CEST', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await trocarNcm(user, NCM_PARCIAL);
        await aguardarVinculos('0700100');
        await screen.findByText(/A lista de CESTs deste NCM está incompleta/);
        const values = await salvar(user, onSubmit);
        expect(values.cestCodigo).toBe('0300100');
    });

    it('limpar o NCM limpa o CEST', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await aguardarVinculos('0300100');
        await user.selectOptions(screen.getByRole('combobox', { name: 'NCM' }), '');
        const values = await salvar(user, onSubmit);
        expect(values.ncmCodigo).toBeNull();
        expect(values.cestCodigo).toBeNull();
    });

    it('reabrir OUTRO produto não zera o CEST do novo registro, mesmo após troca de NCM na abertura anterior', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100'), b: produto('b', NCM_B, '9999999') });
        await abrir(user, 'a');
        await trocarNcm(user, NCM_B); // troca do operador: ncmAlterado verdadeiro na abertura de "a"
        await aguardarVinculos('0500100');
        await user.click(screen.getByRole('button', { name: /Cancelar/ }));
        await waitFor(() => expect(screen.queryByRole('combobox', { name: 'NCM' })).not.toBeInTheDocument());

        await abrir(user, 'b'); // legado: NCM_B com CEST fora dos vínculos, sem troca nesta abertura
        await aguardarVinculos('0500100');
        const values = await salvar(user, onSubmit);
        expect(values.id).toBe('b');
        expect(values.ncmCodigo).toBe(NCM_B);
        expect(values.cestCodigo).toBe('9999999');
    });

    it('reabrir o MESMO produto descarta a troca anterior e devolve o CEST gravado', async () => {
        const { user, onSubmit } = await montar({ a: produto('a', NCM_A, '0300100') });
        await abrir(user, 'a');
        await trocarNcm(user, NCM_B);
        await aguardarVinculos('0500100');
        await user.click(screen.getByRole('button', { name: /Cancelar/ }));
        await waitFor(() => expect(screen.queryByRole('combobox', { name: 'NCM' })).not.toBeInTheDocument());

        await abrir(user, 'a');
        await aguardarVinculos('0300100');
        const values = await salvar(user, onSubmit);
        expect(values.ncmCodigo).toBe(NCM_A);
        expect(values.cestCodigo).toBe('0300100');
    });
});
