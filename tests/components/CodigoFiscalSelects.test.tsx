import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CestCodigoSelect, CODIGO_FISCAL_SEM_PERMISSAO, NcmCodigoSelect, OrigemMercadoriaSelect } from '@/features/fiscal/components/CodigoFiscalSelects';
import { httpClient } from '@/lib/http/httpClient';

// v1.11.0a8b77 — selects por CÓDIGO do bloco fiscal do produto, com hook, client e `httpClient` reais; só a rede e
// o `Dropdown` (dublê em tests/mocks) são trocados.

const { estado } = vi.hoisted(() => ({ estado: { perms: ['FISCAL_CADASTROS_CONSULTAR'] as string[] } }));

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || estado.perms.includes(code);
    return { usePermissions: () => ({ hasPermission: has, hasAnyPermission: (codes?: string[]) => !codes || codes.some(has), hasAllPermissions: (codes?: string[]) => !codes || codes.every(has) }) };
});

type Capturado = { url?: string; params: Record<string, unknown> };
let capturados: Capturado[];
const adapterOriginal = httpClient.defaults.adapter;
const pagina = (items: unknown[]) => ({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });

const vinculosPorNcm: Record<string, string[]> = { '22030000': ['0300100', '0300200'], '10059010': [] };
const descricaoCest: Record<string, string> = { '0300100': 'Cerveja em garrafa', '0300200': 'Cerveja em lata' };

beforeEach(() => {
    estado.perms = ['FISCAL_CADASTROS_CONSULTAR'];
    capturados = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const params = (config.params ?? {}) as Record<string, unknown>;
        capturados.push({ url: config.url, params });
        let data: unknown = pagina([]);
        if (config.url === '/api/fiscal/cadastros/ncm') data = pagina([{ id: 'n1', codigo: '22030000', descricao: 'Cervejas', ativo: true }]);
        if (config.url === '/api/fiscal/cadastros/ncm-cest') data = pagina((vinculosPorNcm[String(params.ncmCodigo)] ?? []).map((cestCodigo, i) => ({ id: `v${i}`, ncmId: 'n1', ncmCodigo: params.ncmCodigo, cestId: `c${i}`, cestCodigo, ativo: true })));
        if (config.url === '/api/fiscal/cadastros/cest') data = pagina([{ id: 'c', codigo: params.codigo, descricao: descricaoCest[String(params.codigo)] ?? 'CEST', ativo: true }]);
        if (config.url === '/api/fiscal/cadastros/origens-mercadoria') data = pagina([{ id: 'o0', codigo: '0', descricao: 'Nacional', ehEstrangeira: false, ativo: true }, { id: 'o1', codigo: '1', descricao: 'Estrangeira - importação direta', ehEstrangeira: true, ativo: true }]);
        return { data, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config };
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

const renderCom = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const chamadas = (url: string) => capturados.filter((item) => item.url === url);

describe('NcmCodigoSelect', () => {
    it('devolve o CÓDIGO do NCM (8 dígitos), não o id do cadastro', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderCom(<NcmCodigoSelect value={null} onChange={onChange} />);
        await screen.findByRole('option', { name: '22030000 — Cervejas' });
        await user.selectOptions(screen.getByRole('combobox', { name: 'NCM' }), '22030000 — Cervejas');
        expect(onChange).toHaveBeenCalledWith('22030000');
    });

    it('sem FISCAL_CADASTROS_CONSULTAR: nenhuma consulta, campo desabilitado e o motivo visível', async () => {
        estado.perms = [];
        renderCom(<NcmCodigoSelect value="22030000" onChange={vi.fn()} />);
        expect(screen.getByRole('combobox', { name: 'NCM' })).toBeDisabled();
        expect(screen.getByText(CODIGO_FISCAL_SEM_PERMISSAO)).toBeInTheDocument();
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(capturados).toHaveLength(0);
    });

    it('código já gravado continua exibido mesmo fora da página da busca', async () => {
        renderCom(<NcmCodigoSelect value="10059010" onChange={vi.fn()} />);
        expect(await screen.findByRole('option', { name: '10059010' })).toBeInTheDocument();
    });
});

describe('CestCodigoSelect depende do NCM', () => {
    it('sem NCM: desabilitado, pede o NCM e não consulta nada', async () => {
        renderCom(<CestCodigoSelect ncmCodigo={null} value={null} onChange={vi.fn()} />);
        expect(screen.getByRole('combobox', { name: 'CEST' })).toBeDisabled();
        expect(screen.getAllByText(/Selecione o NCM/).length).toBeGreaterThan(0);
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(capturados).toHaveLength(0);
    });

    it('com NCM: lista só os CESTs vinculados (consulta pelo código do NCM) com a descrição, e devolve o código', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderCom(<CestCodigoSelect ncmCodigo="22030000" value={null} onChange={onChange} />);
        await screen.findByRole('option', { name: '0300100 — Cerveja em garrafa' });
        expect(screen.getByRole('option', { name: '0300200 — Cerveja em lata' })).toBeInTheDocument();
        expect(chamadas('/api/fiscal/cadastros/ncm-cest')[0].params).toMatchObject({ ncmCodigo: '22030000' });
        await user.selectOptions(screen.getByRole('combobox', { name: 'CEST' }), '0300200 — Cerveja em lata');
        expect(onChange).toHaveBeenCalledWith('0300200');
    });

    it('NCM sem vínculos: informa que não exige CEST e o campo fica desabilitado', async () => {
        renderCom(<CestCodigoSelect ncmCodigo="10059010" value={null} onChange={vi.fn()} />);
        expect((await screen.findAllByText('Este NCM não exige CEST.')).length).toBeGreaterThan(0);
        expect(screen.getByRole('combobox', { name: 'CEST' })).toBeDisabled();
    });

    it('trocar o NCM troca a lista de CESTs (nova consulta com o novo código)', async () => {
        const Harness = () => {
            const [ncm, setNcm] = useState<string | null>('22030000');
            return (
                <>
                    <button type="button" onClick={() => setNcm('10059010')}>trocar</button>
                    <CestCodigoSelect ncmCodigo={ncm} value={null} onChange={vi.fn()} />
                </>
            );
        };
        const user = userEvent.setup();
        renderCom(<Harness />);
        await screen.findByRole('option', { name: '0300100 — Cerveja em garrafa' });
        await user.click(screen.getByRole('button', { name: 'trocar' }));
        await waitFor(() => expect(screen.queryByRole('option', { name: '0300100 — Cerveja em garrafa' })).not.toBeInTheDocument());
        expect(chamadas('/api/fiscal/cadastros/ncm-cest').map((item) => item.params.ncmCodigo)).toEqual(['22030000', '10059010']);
    });

    it('sem FISCAL_CADASTROS_CONSULTAR: desabilitado com aviso, e o CEST gravado segue visível', async () => {
        estado.perms = [];
        renderCom(<CestCodigoSelect ncmCodigo="22030000" value="0300100" onChange={vi.fn()} />);
        expect(screen.getByRole('combobox', { name: 'CEST' })).toBeDisabled();
        expect(screen.getByText(CODIGO_FISCAL_SEM_PERMISSAO)).toBeInTheDocument();
        expect(screen.getByRole('option', { name: '0300100' })).toBeInTheDocument();
        expect(capturados).toHaveLength(0);
    });
});

describe('OrigemMercadoriaSelect', () => {
    it('carrega as origens ativas e devolve o código, inclusive "0"', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderCom(<OrigemMercadoriaSelect value={null} onChange={onChange} />);
        await screen.findByRole('option', { name: '0 — Nacional' });
        expect(chamadas('/api/fiscal/cadastros/origens-mercadoria')[0].params).toMatchObject({ ativo: true, tamanhoPagina: 50 });
        await user.selectOptions(screen.getByRole('combobox', { name: 'Origem da mercadoria' }), '0 — Nacional');
        expect(onChange).toHaveBeenCalledWith('0');
    });

    it('sem permissão: desabilitado, aviso visível e nenhuma consulta', async () => {
        estado.perms = [];
        renderCom(<OrigemMercadoriaSelect value="1" onChange={vi.fn()} />);
        expect(screen.getByRole('combobox', { name: 'Origem da mercadoria' })).toBeDisabled();
        expect(screen.getByText(CODIGO_FISCAL_SEM_PERMISSAO)).toBeInTheDocument();
        expect(capturados).toHaveLength(0);
    });
});
