import { useState } from 'react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmarFaturamentoDialog } from '@/features/faturamento/components/FaturamentoDialogs';
import { faturamentoApi } from '@/features/faturamento/api/faturamentoApi';
import { NATUREZA_OPERACAO_FIELD } from '@/features/fiscal/components/fiscalLabels';
import { NATUREZA_OPERACAO_FIELD_VAZIO } from '@/features/fiscal/components/naturezasOperacaoLabels';
import { FATURAMENTO_CONFIRMAR } from '@/features/faturamento/components/faturamentoLabels';
import { httpClient } from '@/lib/http/httpClient';
import type { ConfirmarFaturamentoRequestValues } from '@/features/faturamento/types/faturamento.types';

// b71 — Confirmar do faturamento com o diálogo REAL, o client REAL (`faturamentoApi.confirmar`), o hook e o
// client REAIS de naturezas, e o `httpClient` real. Só o adapter do axios (a rede) é trocado: o body
// capturado é o que sairia para o backend.
//
// Ficam simulados apenas os campos de seleção que não estão sob prova (o combo de busca, o calendário e a
// série), trocados por controles nativos com rótulo; o valor escolhido neles segue pelo mesmo `onChange`.

const { permsState } = vi.hoisted(() => ({ permsState: { perms: [] as string[] } }));

vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || permsState.perms.includes(code);
    return {
        usePermissions: () => ({
            hasPermission: has,
            hasAnyPermission: (codes?: string[]) => !codes || codes.length === 0 || codes.some(has),
            hasAllPermissions: (codes?: string[]) => !codes || codes.length === 0 || codes.every(has)
        })
    };
});
vi.mock('@/features/financeiro/hooks/useFinanceiroResources', () => ({
    useCondicoesPagamentoOptions: () => ({ options: [], data: [], isFetching: false, isLoading: false })
}));
vi.mock('@/components/forms/EntitySelect', () => ({
    EntitySelect: ({ id, value, options, onChange, disabled, entityName }: { id?: string; value?: string | null; options: { label: string; value: string }[]; onChange: (value: string | null) => void; disabled?: boolean; entityName: string }) => (
        <select id={id} aria-label={entityName} value={value ?? ''} disabled={disabled} onChange={(event) => onChange(event.target.value || null)}>
            <option value="">Selecione</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}));
vi.mock('@/components/forms/DateInput', () => ({
    DateInput: ({ onChange }: { onChange: (value: Date | null) => void }) => (
        <button type="button" onClick={() => onChange(new Date('2026-10-10T00:00:00.000Z'))}>
            Escolher vencimento
        </button>
    )
}));
vi.mock('@/features/fiscal/components/NotaFiscalSerieField', () => ({
    NotaFiscalSerieField: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => <input aria-label="Série" value={value} onChange={(event) => onChange(event.target.value)} />
}));

const empresaId = '11111111-1111-1111-1111-111111111111';
const faturamentoId = '99999999-9999-9999-9999-999999999999';
const naturezaVendaId = '44444444-4444-4444-4444-444444444444';
const naturezaDevolucaoId = '55555555-5555-5555-5555-555555555555';

type Capturado = { method?: string; url?: string; params?: Record<string, unknown>; body: Record<string, unknown> };
type RespostaConfirmar = 'rede' | 400 | 200;

// Os 15 campos de `NaturezaOperacaoResponse` (b72, D98): o schema de resposta exige todos, com `cfops`.
const naturezaItem = (id: string, codigo: string, descricao: string) => ({
    id,
    empresaId,
    filialId: null,
    codigo,
    descricao,
    tipoDocumento: 1,
    tipoOperacao: 1,
    finalidade: 1,
    indicadorPresencaComprador: 1,
    indicadorConsumidorFinal: false,
    movimentaEstoque: true,
    geraFinanceiro: true,
    observacao: null,
    ativa: true,
    cfops: [{ ambito: 1, cfopId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', cfopCodigo: '5102', tipoItem: null }]
});

const faturamentoResposta = { id: faturamentoId, empresaId, pedidoVendaId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', etapa: 5, valorTotal: 100, legs: [] };

describe('ConfirmarFaturamentoDialog — b71 (D91, D92, D94)', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let capturados: Capturado[];
    let naturezas: ReturnType<typeof naturezaItem>[];
    let respostasConfirmar: RespostaConfirmar[];

    const preparar = () => {
        permsState.perms = ['FISCAL_CADASTROS_CONSULTAR'];
        capturados = [];
        naturezas = [naturezaItem(naturezaVendaId, '5102', 'Venda de mercadoria'), naturezaItem(naturezaDevolucaoId, '1202', 'Devolução de venda')];
        respostasConfirmar = [];
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            capturados.push({ method: config.method, url: config.url, params: config.params, body: config.data ? JSON.parse(String(config.data)) : {} });
            if (config.method === 'get' && config.url === '/api/fiscal/naturezas-operacao') {
                return { data: { items: naturezas, page: 1, pageSize: 200, totalItems: naturezas.length, totalPages: 1 }, status: 200, statusText: 'OK', headers: {}, config };
            }
            if (config.method === 'post' && config.url === `/api/faturamento/${faturamentoId}/confirmar`) {
                const proxima = respostasConfirmar.shift() ?? 200;
                if (proxima === 'rede') throw new AxiosError('Network Error', 'ERR_NETWORK', config, {});
                if (proxima === 400) {
                    const response = { data: { code: 'Fiscal.SefazRejeicao', message: 'Rejeição da SEFAZ.', traceId: 'trace-400' }, status: 400, statusText: 'Bad Request', headers: new AxiosHeaders(), config };
                    throw new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, response);
                }
                return { data: { faturamento: faturamentoResposta, alertas: [] }, status: 200, statusText: 'OK', headers: {}, config };
            }
            throw new Error(`Rota não esperada no teste: ${config.method} ${config.url}`);
        });
    };

    beforeEach(preparar);

    // Aquecimento: a primeira montagem do diálogo no worker paga a injeção e o parse dos estilos do PrimeReact no
    // jsdom (o primeiro teste do arquivo levava 3 s sob a carga da varredura, contra ~0,5 s dos seguintes). O custo
    // fica no limite próprio do hook. Nada é afirmado; nenhum POST sai.
    beforeAll(async () => {
        preparar();
        const { unmount } = renderDialog();
        const combo = await screen.findByRole('combobox', { name: 'natureza de operação' });
        await within(combo).findByRole('option', { name: '5102 — Venda de mercadoria' });
        unmount();
        httpClient.defaults.adapter = originalAdapter;
    }, 30000);

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
        vi.clearAllMocks();
    });

    // Monta o diálogo real; o onSubmit é o mesmo caminho da página: o client real do faturamento.
    const Harness = ({ onHideExtra }: { onHideExtra?: () => void }) => {
        const [visible, setVisible] = useState(true);
        return (
            <>
                <button type="button" onClick={() => setVisible(true)}>
                    Reabrir
                </button>
                <ConfirmarFaturamentoDialog
                    visible={visible}
                    faturamentoId={faturamentoId}
                    empresaId={empresaId}
                    filialId={null}
                    onHide={() => {
                        setVisible(false);
                        onHideExtra?.();
                    }}
                    onSubmit={async (values: ConfirmarFaturamentoRequestValues) => {
                        await faturamentoApi.confirmar(faturamentoId, values);
                    }}
                />
            </>
        );
    };

    const renderDialog = () => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        return render(
            <QueryClientProvider client={queryClient}>
                <Harness />
            </QueryClientProvider>
        );
    };

    const confirmarButton = () => within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' });
    const postsConfirmar = () => capturados.filter((item) => item.method === 'post');

    // Campo de texto: foco e colagem numa chamada só (um onChange com o valor inteiro), sem digitar tecla a tecla.
    const colar = async (user: ReturnType<typeof userEvent.setup>, campo: HTMLElement, texto: string) => {
        await user.click(campo);
        await user.paste(texto);
    };

    // `natureza: null` deixa o combo sem escolha (caso do QA-01).
    const preencher = async (user: ReturnType<typeof userEvent.setup>, { uf = 'SP', natureza = naturezaVendaId }: { uf?: string; natureza?: string | null } = {}) => {
        const combo = await screen.findByRole('combobox', { name: 'natureza de operação' });
        // As opções chegam da API; o combo aparece antes, ainda vazio e desabilitado.
        await within(combo).findByRole('option', { name: '5102 — Venda de mercadoria' });
        await waitFor(() => expect(combo).toBeEnabled());
        if (natureza) await user.selectOptions(combo, natureza);
        await colar(user, screen.getByLabelText('Série'), '1');
        await colar(user, screen.getByLabelText('Número *'), '1001');
        await colar(user, screen.getByLabelText('UF autorizadora *'), uf);
        await colar(user, screen.getByLabelText('Unidade comercial padrão *'), 'UN');
        await user.click(screen.getByRole('button', { name: 'Escolher vencimento' }));
    };

    it('AC-1: o body do POST confirmar leva naturezaOperacaoId da natureza escolhida e o correlationId, e não leva cfopPadrao', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialog();
        await preencher(user, { natureza: naturezaDevolucaoId });

        // O combo lista as naturezas pelo rótulo "código — descrição", nunca pelo GUID.
        expect(screen.getByRole('option', { name: '1202 — Devolução de venda' })).toBeInTheDocument();

        const correlationNaTela = (screen.getByLabelText(FATURAMENTO_CONFIRMAR.correlationIdRotulo) as HTMLInputElement).value;
        await user.click(confirmarButton());

        await waitFor(() => expect(postsConfirmar()).toHaveLength(1));
        const [{ body }] = postsConfirmar();
        expect(body.naturezaOperacaoId).toBe(naturezaDevolucaoId);
        expect(body.correlationId).toBe(correlationNaTela);
        expect(String(body.correlationId)).toMatch(/^front-faturamento-99999999-\d{14}-[a-z0-9]+$/);
        expect(body).not.toHaveProperty('cfopPadrao');
        expect(body).toMatchObject({ ufAutorizadora: 'SP', serie: '1', numero: '1001', unidadeComercialPadrao: 'UN', primeiraDataVencimentoContaReceber: '2026-10-10T00:00:00.000Z' });
    });

    it('AC-1 (D91): a consulta de naturezas é da empresa do faturamento e só das ativas (filtro no servidor)', async () => {
        renderDialog();
        await screen.findByRole('combobox', { name: 'natureza de operação' });
        const consultas = capturados.filter((item) => item.url === '/api/fiscal/naturezas-operacao');
        expect(consultas.length).toBeGreaterThan(0);
        for (const consulta of consultas) {
            expect(consulta.params).toMatchObject({ empresaId, somenteAtivas: true });
        }
    });

    it('AC-2: sem natureza ativa na empresa, o Confirmar fica desabilitado e o motivo aparece; nenhum POST sai', async () => {
        naturezas = [];
        renderDialog();

        // D100 (b72): com FISCAL_CADASTROS_CONSULTAR, o vazio usa o texto com permissão (o cadastro agora tem tela).
        expect(await screen.findByText(`${FATURAMENTO_CONFIRMAR.indisponivelPrefixo} ${NATUREZA_OPERACAO_FIELD_VAZIO.comPermissao}`)).toBeInTheDocument();
        expect(confirmarButton()).toBeDisabled();
        expect(screen.queryByRole('combobox', { name: 'natureza de operação' })).not.toBeInTheDocument();
        expect(postsConfirmar()).toHaveLength(0);
    });

    it('AC-2: com uma natureza ativa, o Confirmar habilita e o motivo não aparece', async () => {
        naturezas = [naturezaItem(naturezaVendaId, '5102', 'Venda de mercadoria')];
        renderDialog();

        await screen.findByRole('combobox', { name: 'natureza de operação' });
        await waitFor(() => expect(confirmarButton()).toBeEnabled());
        expect(screen.queryByText(new RegExp(FATURAMENTO_CONFIRMAR.indisponivelPrefixo))).not.toBeInTheDocument();
    });

    it('AC-2: sem a permissão de consultar naturezas, o Confirmar fica desabilitado com o motivo da permissão', async () => {
        permsState.perms = [];
        renderDialog();

        expect(await screen.findByText(`${FATURAMENTO_CONFIRMAR.indisponivelPrefixo} ${NATUREZA_OPERACAO_FIELD.semPermissao}`)).toBeInTheDocument();
        expect(confirmarButton()).toBeDisabled();
        expect(capturados.filter((item) => item.url === '/api/fiscal/naturezas-operacao')).toHaveLength(0);
    });

    it('AC-3 (D92): mesmo correlationId no reenvio após falha de rede; id novo após resposta 400 e após 200', async () => {
        respostasConfirmar = ['rede', 'rede', 400, 200, 200];
        const user = userEvent.setup({ delay: null });
        renderDialog();
        await preencher(user);

        for (let envio = 1; envio <= 5; envio += 1) {
            await user.click(confirmarButton());
            await waitFor(() => expect(postsConfirmar()).toHaveLength(envio));
        }
        const ids = postsConfirmar().map((item) => item.body.correlationId as string);

        // 1 → 2: o primeiro falhou sem resposta; o reenvio usa o MESMO id (não autoriza duas vezes).
        expect(ids[1]).toBe(ids[0]);
        // 2 → 3: o segundo também falhou sem resposta; o terceiro ainda reusa o id.
        expect(ids[2]).toBe(ids[0]);
        // 3 → 4: o terceiro teve resposta 400; o quarto sai com id novo (falha finalizada exige id novo).
        expect(ids[3]).not.toBe(ids[2]);
        // 4 → 5: o quarto teve resposta 200; o quinto sai com id novo.
        expect(ids[4]).not.toBe(ids[3]);
    });

    it('AC-3 (D92): reabrir o diálogo gera um correlationId novo', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialog();
        await screen.findByRole('combobox', { name: 'natureza de operação' });
        const primeiro = (screen.getByLabelText(FATURAMENTO_CONFIRMAR.correlationIdRotulo) as HTMLInputElement).value;
        expect(primeiro).toMatch(/^front-faturamento-/);

        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: 'Reabrir' }));

        const campo = (await screen.findByLabelText(FATURAMENTO_CONFIRMAR.correlationIdRotulo)) as HTMLInputElement;
        await waitFor(() => expect(campo.value).toMatch(/^front-faturamento-/));
        expect(campo.value).not.toBe(primeiro);
        // O id é somente leitura: o operador não o digita.
        expect(campo).toHaveAttribute('readonly');
    });

    it('QA-01 (emenda D91): natureza disponível, validação fiscal desligada e nenhuma escolhida → 0 POST e a mensagem visível', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialog();
        await preencher(user, { natureza: null });

        const validar = screen.getByRole('checkbox', { name: 'Validar dados fiscais' });
        expect(validar).toBeChecked();
        // O input escondido do PrimeReact chama preventDefault no clique e, no jsdom, o `checked` do DOM volta ao
        // valor anterior depois do render; o estado do diálogo é que muda. A prova de que o clique desligou a
        // validação é a mutação com a condição antiga (validação E sem natureza): com ela, este caso envia o POST.
        await user.click(validar);
        // Com natureza disponível, o Confirmar está habilitado: a trava aqui é a do formulário, não a da lista vazia.
        expect(confirmarButton()).toBeEnabled();

        await user.click(confirmarButton());

        expect(await screen.findByText('Selecione a natureza de operação.')).toBeInTheDocument();
        expect(postsConfirmar()).toHaveLength(0);
    });

    it('AC-6 (D94): UF fora das 27 é recusada no diálogo, com a mensagem, e nenhum POST sai', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialog();
        await preencher(user, { uf: 'XX' });

        await user.click(confirmarButton());

        expect(await screen.findByText('Informe uma UF válida (sigla de 2 letras, por exemplo SP).')).toBeInTheDocument();
        expect(postsConfirmar()).toHaveLength(0);
    });
});
