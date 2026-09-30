import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CADASTRO_FISCAL_SEM_PERMISSAO, CfopSelect, NcmSelect } from '@/features/fiscal/components/CadastroFiscalSelects';
import { CADASTROS_FISCAIS_DEBOUNCE_MS } from '@/features/fiscal/hooks/useCadastrosFiscais';
import { httpClient } from '@/lib/http/httpClient';

// b72 (D99, AC-8) — selects de NCM/CFOP em `features/fiscal` com o hook, o client e o `httpClient` REAIS. Só a
// rede e o `Dropdown` do PrimeReact (dublê em tests/mocks) são trocados. Prova o debounce da busca, o erro
// visível com nova tentativa e o filtro de âmbito/tipo no CFOP.

const { estado } = vi.hoisted(() => ({ estado: { perms: ['FISCAL_CADASTROS_CONSULTAR'] as string[] } }));

vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));
vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || estado.perms.includes(code);
    return { usePermissions: () => ({ hasPermission: has, hasAnyPermission: (codes?: string[]) => !codes || codes.some(has), hasAllPermissions: (codes?: string[]) => !codes || codes.every(has) }) };
});

type Capturado = { url?: string; params: Record<string, unknown> };
let capturados: Capturado[];
let falhar: boolean;
const adapterOriginal = httpClient.defaults.adapter;

const pagina = (items: unknown[]) => ({ items, page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 });

beforeEach(() => {
    estado.perms = ['FISCAL_CADASTROS_CONSULTAR'];
    capturados = [];
    falhar = false;
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const params = (config.params ?? {}) as Record<string, unknown>;
        capturados.push({ url: config.url, params });
        if (falhar) {
            const response = { data: { code: 'FISCAL_CADASTROS_INDISPONIVEL', message: 'Serviço de cadastros fora do ar.', traceId: 'trace-cfop' }, status: 503, statusText: 'Service Unavailable', headers: new AxiosHeaders(), config };
            throw new AxiosError('Request failed with status code 503', 'ERR_BAD_RESPONSE', config, {}, response);
        }
        if (config.url === '/api/fiscal/cadastros/cfop') return { data: pagina([{ id: 'c1', codigo: '5102', descricao: 'Venda', tipo: 2, ambito: 1, ativo: true, campoAditivo: 'x' }]), status: 200, statusText: 'OK', headers: {}, config };
        return { data: pagina([{ id: 'n1', codigo: '22030000', descricao: 'Cervejas', ativo: true }]), status: 200, statusText: 'OK', headers: {}, config };
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

const renderCom = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const buscasCfop = () => capturados.filter((item) => item.url === '/api/fiscal/cadastros/cfop');

describe('AC-8: debounce da busca de CFOP', () => {
    it('digitar "5102" rápido gera UMA busca com o termo final, depois do prazo; nunca "5", "51" ou "510"', async () => {
        const user = userEvent.setup();
        renderCom(<CfopSelect value={null} onChange={vi.fn()} ambito={1} tipo={2} />);
        await waitFor(() => expect(buscasCfop()).toHaveLength(1));
        expect(buscasCfop()[0].params).toMatchObject({ ambito: 1, tipo: 2, ativo: true });
        expect(buscasCfop()[0].params).not.toHaveProperty('termo');

        const inicio = Date.now();
        await user.type(screen.getByRole('searchbox', { name: 'Código ou descrição do CFOP' }), '5102');
        // Logo depois de digitar, nenhum termo parcial saiu.
        expect(buscasCfop().filter((item) => item.params.termo !== undefined)).toHaveLength(0);

        await waitFor(() => expect(buscasCfop().filter((item) => item.params.termo !== undefined)).toHaveLength(1));
        expect(Date.now() - inicio).toBeGreaterThanOrEqual(CADASTROS_FISCAIS_DEBOUNCE_MS - 50);
        expect(buscasCfop().map((item) => item.params.termo).filter(Boolean)).toEqual(['5102']);
        expect(buscasCfop().at(-1)!.params).toMatchObject({ termo: '5102', ambito: 1, tipo: 2 });
    });

    it('sem tipo, a busca não envia o parâmetro tipo (âmbito continua)', async () => {
        renderCom(<CfopSelect value={null} onChange={vi.fn()} ambito={3} />);
        await waitFor(() => expect(buscasCfop()).toHaveLength(1));
        expect(buscasCfop()[0].params).toMatchObject({ ambito: 3 });
        expect(buscasCfop()[0].params).not.toHaveProperty('tipo');
    });

    it('a escolha devolve o id e o código do CFOP; campo aditivo da resposta não quebra o parse', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderCom(<CfopSelect value={null} onChange={onChange} ambito={1} />);
        const select = screen.getByRole('combobox', { name: 'Buscar CFOP' });
        await screen.findByRole('option', { name: '5102 — Venda' });
        await user.selectOptions(select, '5102 — Venda');
        expect(onChange).toHaveBeenCalledWith('c1', { codigo: '5102' });
    });
});

describe('AC-8: erro da busca visível, com Tentar novamente', () => {
    it('CFOP: a falha aparece com a mensagem, o código, o status e o trace; Tentar novamente refaz e limpa o erro', async () => {
        const user = userEvent.setup();
        falhar = true;
        renderCom(<CfopSelect value={null} onChange={vi.fn()} ambito={1} erroMessage="Não foi possível buscar os CFOPs." />);
        const alerta = await screen.findByRole('alert');
        expect(alerta).toHaveTextContent('Não foi possível buscar os CFOPs.');
        expect(alerta).toHaveTextContent('Serviço de cadastros fora do ar.');
        expect(alerta).toHaveTextContent('FISCAL_CADASTROS_INDISPONIVEL');
        expect(alerta).toHaveTextContent('HTTP 503');
        expect(alerta).toHaveTextContent('trace-cfop');

        const antes = buscasCfop().length;
        falhar = false;
        await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
        expect(buscasCfop().length).toBe(antes + 1);
        expect(await screen.findByRole('option', { name: '5102 — Venda' })).toBeInTheDocument();
    });

    it('NCM: a falha também aparece, em vez de lista vazia', async () => {
        falhar = true;
        renderCom(<NcmSelect value={null} onChange={vi.fn()} />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível buscar os NCMs.');
        expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    });

    it('sem FISCAL_CADASTROS_CONSULTAR: 0 busca, select desabilitado e o motivo visível', async () => {
        estado.perms = [];
        renderCom(<CfopSelect value={null} onChange={vi.fn()} ambito={1} />);
        expect(screen.getByRole('combobox', { name: 'Buscar CFOP' })).toBeDisabled();
        expect(screen.getByText(CADASTRO_FISCAL_SEM_PERMISSAO)).toBeInTheDocument();
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(capturados).toHaveLength(0);
    });
});
