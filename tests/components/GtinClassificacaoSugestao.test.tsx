import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GtinClassificacaoSugestao } from '@/features/produtos/components/GtinClassificacaoSugestao';
import { GTIN_FORMATO_INVALIDO_CODE, gtinClassificacaoLabels as labels } from '@/features/produtos/components/gtinClassificacaoLabels';
import type { CodigoBarrasProdutoResponse } from '@/features/produtos/types/produtos.types';
import { httpClient } from '@/lib/http/httpClient';
import type { CurrentUser, PermissionCode } from '@/types/erp';

// v1.11.0a8b80 (D111) — COMPORTAMENTO do painel de sugestão por GTIN, AC-1..AC-8. O componente, o hook, o client e
// o `httpClient` são os reais. Só a rede (adapter) é trocada, e a sessão é nominal: o `usePermissions` real lê a lista
// de permissões de `useAuth`, então "sem FISCAL_CADASTROS_CONSULTAR" significa exatamente isso.

const { sessao } = vi.hoisted(() => ({ sessao: { user: null as CurrentUser | null } }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: sessao.user }) }));

const sessaoCom = (...permissoes: PermissionCode[]): CurrentUser => ({ id: '11111111-1111-4111-8111-111111111111', nome: 'Operador', email: 'operador@teste.local', isMaster: false, permissoes });

const GTIN_14 = '07891000100103'; // zero à esquerda: a regressão clássica é perdê-lo
const GTIN_13 = '7891000100103';
const GTIN_12 = '789100001000';
const GTIN_8 = '78910000';
const NCM_ATUAL = '22030000';
const NCM_SUGERIDO = '33030010';
const PREFIXO_ROTA = '/api/fiscal/cadastros/gtin-classificacao/';

const barra = (codigo: string, principal = false): CodigoBarrasProdutoResponse => ({ codigo, principal });

const itemEncontrado = (ncmCodigo = NCM_SUGERIDO, sobrescrever: Record<string, unknown> = {}) => ({
    anexo: 'I',
    itemAnexo: '1.2',
    descricaoItemAnexo: 'Cesta básica',
    ncmCodigo,
    descricao: 'Arroz integral',
    cstIbsCbs: '200',
    classificacaoTributaria: '000001',
    percentualReducaoIbs: 60,
    percentualReducaoCbs: 40,
    vigenciaInicio: '2026-01-01',
    vigenciaFim: null,
    alternativas: 'I:22030000:000002:50 | II:22030000:000003:30',
    ...sobrescrever
});

const respostaEncontrada = (gtin = GTIN_14, ncm = NCM_SUGERIDO, sobrescrever: Record<string, unknown> = {}) => ({ gtin, encontrado: true, classificacao: itemEncontrado(ncm, sobrescrever) });
const respostaNaoEncontrada = (gtin = GTIN_14) => ({ gtin, encontrado: false, classificacao: null });

let chamadasGtin: string[];
let responde: (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;
const adapterOriginal = httpClient.defaults.adapter;

const resposta = async (config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> => {
    if (status >= 400) {
        throw new AxiosError('falha', 'ERR_BAD_RESPONSE', config, null, { status, statusText: 'ERR', headers: new AxiosHeaders(), config, data });
    }
    return { data, status, statusText: 'OK', headers: new AxiosHeaders(), config };
};

beforeEach(() => {
    sessao.user = sessaoCom('FISCAL_CADASTROS_CONSULTAR');
    chamadasGtin = [];
    responde = (config) => resposta(config, 200, respostaEncontrada());
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const url = String(config.url);
        // Qualquer rota fora da sugestão por GTIN é defeito de teste: o painel não deve consultar mais nada.
        if (!url.startsWith(PREFIXO_ROTA)) throw new Error(`rota inesperada: ${url}`);
        chamadasGtin.push(url);
        return responde(config);
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

const novoCliente = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

type Props = { codigosBarras?: CodigoBarrasProdutoResponse[] | null; ncmAtual?: string | null; onUsarNcm?: (ncmCodigo: string) => void };

const montar = (props: Props = {}, cliente = novoCliente()) => {
    const user = userEvent.setup();
    const onUsarNcm = props.onUsarNcm ?? vi.fn();
    const utils = render(
        <QueryClientProvider client={cliente}>
            <GtinClassificacaoSugestao codigosBarras={props.codigosBarras === undefined ? [barra(GTIN_14, true)] : props.codigosBarras} ncmAtual={props.ncmAtual === undefined ? NCM_ATUAL : props.ncmAtual} onUsarNcm={onUsarNcm} />
        </QueryClientProvider>
    );
    return { user, onUsarNcm, ...utils };
};

const painel = () => screen.getByRole('region', { name: labels.regiao });
const botaoSugerir = () => screen.findByRole('button', { name: labels.botao });

// Campo da lista de detalhes: o rótulo (`dt`) e o valor (`dd`) ficam no mesmo bloco.
const campo = (rotulo: string) => screen.getByText(rotulo, { selector: 'dt' }).parentElement as HTMLElement;

describe('AC-1 — visibilidade do botão por permissão e por tamanho do código', () => {
    it.each([
        ['8', GTIN_8],
        ['12', GTIN_12],
        ['13', GTIN_13],
        ['14', GTIN_14]
    ])('código de %s dígitos com FISCAL_CADASTROS_CONSULTAR mostra "Sugerir classificação"', async (_tamanho, codigo) => {
        montar({ codigosBarras: [barra(codigo, true)] });
        expect(await botaoSugerir()).toBeEnabled();
    });

    it('sessão sem FISCAL_CADASTROS_CONSULTAR não vê botão nem painel', () => {
        sessao.user = sessaoCom('PRODUTOS_DADOS_FISCAIS_GERENCIAR');
        montar();
        expect(screen.queryByRole('button', { name: labels.botao })).not.toBeInTheDocument();
        expect(screen.queryByRole('region', { name: labels.regiao })).not.toBeInTheDocument();
    });

    it('sessão sem permissão não dispara nenhuma consulta', async () => {
        sessao.user = sessaoCom();
        montar();
        expect(screen.queryByRole('region', { name: labels.regiao })).not.toBeInTheDocument();
        expect(chamadasGtin).toEqual([]);
    });
});

describe('AC-2 — a consulta é disparada pelo clique, com o GTIN em texto', () => {
    it('o clique chama a rota com o GTIN de 14 dígitos e o zero à esquerda intacto', async () => {
        const { user } = montar({ codigosBarras: [barra(GTIN_14, true)] });
        await user.click(await botaoSugerir());
        await waitFor(() => expect(chamadasGtin).toEqual([`${PREFIXO_ROTA}${GTIN_14}`]));
    });

    it('controle positivo: o clique de fato dispara a chamada (o zero sozinho não prova nada sem ela)', async () => {
        const { user } = montar();
        expect(chamadasGtin).toHaveLength(0);
        await user.click(await botaoSugerir());
        await screen.findByText(NCM_SUGERIDO);
        expect(chamadasGtin).toHaveLength(1);
    });

    it('não consulta ao montar o componente: só o clique faz a chamada', async () => {
        montar();
        await botaoSugerir();
        expect(chamadasGtin).toHaveLength(0);
    });

    it('usa o código de barras PRINCIPAL, mesmo quando ele não é o primeiro da lista', async () => {
        const { user } = montar({ codigosBarras: [barra(GTIN_13), barra(GTIN_14, true)] });
        await user.click(await botaoSugerir());
        await waitFor(() => expect(chamadasGtin).toEqual([`${PREFIXO_ROTA}${GTIN_14}`]));
    });

    it('sem principal, usa o primeiro código da lista', async () => {
        const { user } = montar({ codigosBarras: [barra(GTIN_8), barra(GTIN_13)] });
        await user.click(await botaoSugerir());
        await waitFor(() => expect(chamadasGtin).toEqual([`${PREFIXO_ROTA}${GTIN_8}`]));
    });

    it('apara espaços do código antes de consultar: nenhum espaço vai para a URL', async () => {
        const { user } = montar({ codigosBarras: [barra(`  ${GTIN_14} `, true)] });
        await user.click(await botaoSugerir());
        await waitFor(() => expect(chamadasGtin).toEqual([`${PREFIXO_ROTA}${GTIN_14}`]));
    });
});

describe('AC-3 — encontrado: true mostra a classificação inteira e o texto de alternativas cru', () => {
    it('mostra anexo, item, NCM, cClassTrib, CST, as duas reduções e a vigência, campo a campo', async () => {
        const { user } = montar();
        await user.click(await botaoSugerir());

        expect(await screen.findByText('Anexo', { selector: 'dt' })).toBeInTheDocument();
        expect(campo('Anexo')).toHaveTextContent('I');
        expect(campo('Item do anexo')).toHaveTextContent('1.2 — Cesta básica');
        expect(campo('NCM')).toHaveTextContent(NCM_SUGERIDO);
        expect(campo('cClassTrib')).toHaveTextContent('000001');
        expect(campo('CST IBS/CBS')).toHaveTextContent('200');
        expect(campo('Redução IBS')).toHaveTextContent('60%');
        expect(campo('Redução CBS')).toHaveTextContent('40%');
        expect(campo('Vigência')).toHaveTextContent('desde 01/01/2026');
        expect(campo('GTIN consultado')).toHaveTextContent(GTIN_14);
    });

    it('vigência com fim mostra o intervalo em dd/MM/yyyy', async () => {
        responde = (config) => resposta(config, 200, respostaEncontrada(GTIN_14, NCM_SUGERIDO, { vigenciaFim: '2026-12-31' }));
        const { user } = montar();
        await user.click(await botaoSugerir());
        expect(await screen.findByText('Vigência', { selector: 'dt' })).toBeInTheDocument();
        expect(campo('Vigência')).toHaveTextContent('01/01/2026 a 31/12/2026');
    });

    it('alternativas aparece como texto cru, sem parse: o separador " | " e os segmentos seguem exatamente como vieram', async () => {
        const { user } = montar();
        await user.click(await botaoSugerir());
        expect(await screen.findByText(labels.outrasClassificacoes)).toBeInTheDocument();
        expect(screen.getByText('I:22030000:000002:50 | II:22030000:000003:30')).toBeInTheDocument();
    });

    it('sem alternativas, o bloco "Outras classificações possíveis" não aparece', async () => {
        responde = (config) => resposta(config, 200, respostaEncontrada(GTIN_14, NCM_SUGERIDO, { alternativas: null }));
        const { user } = montar();
        await user.click(await botaoSugerir());
        await screen.findByText('Vigência', { selector: 'dt' });
        expect(screen.queryByText(labels.outrasClassificacoes)).not.toBeInTheDocument();
    });
});

describe('AC-4 — encontrado: false é informação, nunca erro', () => {
    it('diz que o GTIN não consta da tabela e que a tributação é normal, sem alerta de erro', async () => {
        responde = (config) => resposta(config, 200, respostaNaoEncontrada());
        const { user } = montar();
        await user.click(await botaoSugerir());

        expect(await screen.findByText(labels.naoEncontrado)).toBeInTheDocument();
        // O PrimeReact `Message` leva role="alert" também na severidade info, então o papel não separa informação de erro.
        // A prova de "não é erro" é a ausência do que só o erro produz: o painel de erro e o "Tentar novamente".
        expect(screen.queryByRole('button', { name: labels.tentarNovamente })).not.toBeInTheDocument();
        expect(screen.queryByText(labels.erroTitulo)).not.toBeInTheDocument();
        expect(screen.queryByText('cClassTrib', { selector: 'dt' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: new RegExp(`^${labels.usarNcm}`) })).not.toBeInTheDocument();
    });
});

describe('AC-5 — "Usar este NCM" só quando difere e só troca o NCM', () => {
    it('NCM sugerido igual ao atual não oferece o botão', async () => {
        responde = (config) => resposta(config, 200, respostaEncontrada(GTIN_14, NCM_ATUAL));
        const { user } = montar({ ncmAtual: NCM_ATUAL });
        await user.click(await botaoSugerir());
        await screen.findByText('Vigência', { selector: 'dt' });
        expect(screen.queryByRole('button', { name: new RegExp(`^${labels.usarNcm}`) })).not.toBeInTheDocument();
    });

    it('a comparação ignora a máscara do NCM atual: 2203.00.00 é o mesmo que 22030000', async () => {
        responde = (config) => resposta(config, 200, respostaEncontrada(GTIN_14, NCM_ATUAL));
        const { user } = montar({ ncmAtual: '2203.00.00' });
        await user.click(await botaoSugerir());
        await screen.findByText('Vigência', { selector: 'dt' });
        expect(screen.queryByRole('button', { name: new RegExp(`^${labels.usarNcm}`) })).not.toBeInTheDocument();
    });

    it('NCM sugerido diferente oferece o botão e o clique chama o callback com o NCM sugerido, uma vez', async () => {
        const onUsarNcm = vi.fn();
        const { user } = montar({ ncmAtual: NCM_ATUAL, onUsarNcm });
        await user.click(await botaoSugerir());
        await user.click(await screen.findByRole('button', { name: `${labels.usarNcm} ${NCM_SUGERIDO}` }));
        expect(onUsarNcm).toHaveBeenCalledTimes(1);
        expect(onUsarNcm).toHaveBeenCalledWith(NCM_SUGERIDO);
    });

    it('produto sem NCM atual oferece o botão', async () => {
        const { user } = montar({ ncmAtual: null });
        await user.click(await botaoSugerir());
        expect(await screen.findByRole('button', { name: `${labels.usarNcm} ${NCM_SUGERIDO}` })).toBeEnabled();
    });

    it('o clique em "Usar este NCM" não dispara consulta nova nem mexe em mais nada além do callback', async () => {
        const onUsarNcm = vi.fn();
        const { user } = montar({ ncmAtual: NCM_ATUAL, onUsarNcm });
        await user.click(await botaoSugerir());
        await user.click(await screen.findByRole('button', { name: `${labels.usarNcm} ${NCM_SUGERIDO}` }));
        expect(chamadasGtin).toHaveLength(1);
        expect(onUsarNcm.mock.calls).toEqual([[NCM_SUGERIDO]]);
    });
});

describe('AC-6 — nada automático: sem clique não há resultado, e reabrir não reaproveita o cache', () => {
    it('o resultado só aparece depois do clique desta montagem', async () => {
        montar();
        await botaoSugerir();
        expect(screen.queryByText(NCM_SUGERIDO)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: `${labels.usarNcm} ${NCM_SUGERIDO}` })).not.toBeInTheDocument();
    });

    it('nenhum callback de troca roda sem clique no "Usar este NCM"', async () => {
        const onUsarNcm = vi.fn();
        const { user } = montar({ onUsarNcm });
        await user.click(await botaoSugerir());
        await screen.findByText(NCM_SUGERIDO);
        expect(onUsarNcm).not.toHaveBeenCalled();
    });

    it('remontar o painel com o mesmo cache não mostra o resultado anterior nem consulta de novo', async () => {
        const cliente = novoCliente();
        const primeira = montar({}, cliente);
        await primeira.user.click(await botaoSugerir());
        await screen.findByText(NCM_SUGERIDO);
        expect(chamadasGtin).toHaveLength(1);
        primeira.unmount();

        montar({}, cliente);
        await botaoSugerir();
        expect(screen.queryByText(NCM_SUGERIDO)).not.toBeInTheDocument();
        expect(chamadasGtin).toHaveLength(1);
    });
});

describe('AC-7 — 403 esconde o painel sem erro; 400 de formato mostra a mensagem do catálogo', () => {
    it('403 remove o painel inteiro, sem mensagem de erro', async () => {
        responde = (config) => resposta(config, 403, { message: 'sem permissão' });
        const { user } = montar();
        await user.click(await botaoSugerir());

        await waitFor(() => expect(screen.queryByRole('region', { name: labels.regiao })).not.toBeInTheDocument());
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.queryByText(/permissão/i)).not.toBeInTheDocument();
    });

    it('antes do clique, o painel com 403 ainda não foi consultado: a região existe', () => {
        montar();
        expect(painel()).toBeInTheDocument();
    });

    it('400 FISCAL_CADASTROS_GTIN_FORMATO_INVALIDO mostra a mensagem do catálogo e oferece tentar de novo', async () => {
        responde = (config) => resposta(config, 400, { code: GTIN_FORMATO_INVALIDO_CODE, message: 'GTIN com formato inválido.' });
        const { user } = montar();
        await user.click(await botaoSugerir());

        expect(await screen.findByText(labels.formatoInvalido)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: labels.tentarNovamente })).toBeEnabled();
        expect(screen.getByRole('region', { name: labels.regiao })).toBeInTheDocument();
    });

    it('erro recuperável (500) mostra o painel de erro e deixa tentar de novo', async () => {
        responde = (config) => resposta(config, 500, { message: 'falha interna' });
        const { user } = montar();
        await user.click(await botaoSugerir());

        expect(await screen.findByText('falha interna')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: labels.tentarNovamente })).toBeEnabled();
    });
});

describe('AC-8 — motivo visível e sem botão quando não há GTIN consultável', () => {
    it('produto sem código de barras explica o motivo e não tem botão', () => {
        montar({ codigosBarras: [] });
        expect(screen.getByText(labels.semCodigo)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: labels.botao })).not.toBeInTheDocument();
        expect(chamadasGtin).toEqual([]);
    });

    it('codigosBarras null tem o mesmo tratamento de ausência', () => {
        montar({ codigosBarras: null });
        expect(screen.getByText(labels.semCodigo)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: labels.botao })).not.toBeInTheDocument();
    });

    it.each(['1234567', '789100010010A', '7891-0001-0010'])('código "%s" fora do formato explica o motivo e não tem botão', (codigo) => {
        montar({ codigosBarras: [barra(codigo, true)] });
        expect(screen.getByText(labels.codigoForaDoFormato)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: labels.botao })).not.toBeInTheDocument();
        expect(chamadasGtin).toEqual([]);
    });

    it('o código principal é quem decide: principal fora do formato não cai no secundário válido', () => {
        montar({ codigosBarras: [barra(GTIN_14), barra('1234567', true)] });
        expect(screen.getByText(labels.codigoForaDoFormato)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: labels.botao })).not.toBeInTheDocument();
    });
});
