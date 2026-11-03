import { useState } from 'react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmarFaturamentoDialog } from '@/features/faturamento/components/FaturamentoDialogs';
import { useFaturamentoMutations } from '@/features/faturamento/hooks/useFaturamentoResources';
import { FATURAMENTO_CONFIRMAR, FATURAMENTO_PRONTIDAO, PRONTIDAO_RECURSO_ROTULO } from '@/features/faturamento/components/faturamentoLabels';
import type { ConfirmarFaturamentoRequestValues } from '@/features/faturamento/types/faturamento.types';
import { httpClient } from '@/lib/http/httpClient';

// D113 — prontidão que governa o Confirmar, com o diálogo REAL, o hook de prontidão REAL, o cliente REAL
// (`faturamentoApi`) e o `httpClient` real. Só o adapter do axios (a rede) responde, e cada resposta de prontidão é
// controlada pelo teste, para provar QUAL resposta libera o botão e QUANDO.

const { permsState, prontidaoState } = vi.hoisted(() => ({
    permsState: { perms: [] as string[] },
    prontidaoState: {
        responder: null as null | ((params: Record<string, unknown>) => Promise<{ status: number; data?: unknown; rede?: boolean }>)
    }
}));

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
// Contexto organizacional da empresa do faturamento. Filiais e empresas chegam pelo adapter (rota real).
vi.mock('@/hooks/useOrganizationalContext', () => ({
    useOrganizationalContext: () => ({ snapshot: { empresaId: '11111111-1111-1111-1111-111111111111', filialId: null, isMaster: false, revision: 0 } })
}));
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
const filialId = '22222222-2222-2222-2222-222222222222';
const faturamentoId = '99999999-9999-9999-9999-999999999999';
const pedidoVendaId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const naturezaVendaId = '44444444-4444-4444-4444-444444444444';
const naturezaDevolucaoId = '55555555-5555-5555-5555-555555555555';

const PRONTA = { pronto: true, avaliacao: 'PrimeiraConfirmacao', pendencias: [] };
const pendencia = (etapa: string, codigo: string, mensagem: string, recurso: string) => ({ etapa, codigo, mensagem, recurso, recursoId: null });
const PENDENTE = {
    pronto: false,
    avaliacao: 'PrimeiraConfirmacao',
    pendencias: [pendencia('Produto', 'p1', 'Produto sem NCM', 'Produtos'), pendencia('Emitente', 'e1', 'Emitente sem IE', 'Empresas'), pendencia('Nova', 'n1', 'Algo novo', 'Inventado')]
};

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

const faturamentoResposta = { id: faturamentoId, empresaId, pedidoVendaId, etapa: 5, valorTotal: 100, legs: [] };

type ChamadaHttp = Record<string, unknown>;

describe('Confirmar — checklist de prontidão (D113)', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let prontidaoChamadas: ChamadaHttp[];
    let postsConfirmar: ConfirmarFaturamentoRequestValues[];
    let naturezas: ReturnType<typeof naturezaItem>[];
    let empresas: unknown[];
    let filiais: unknown[];
    let empresasGate: Promise<void>;
    let liberarEmpresas: () => void;
    let empresasRequisicoes: number;
    let administracaoGets: string[];

    beforeEach(() => {
        permsState.perms = ['FISCAL_CADASTROS_CONSULTAR', 'PRODUTOS_CONSULTAR'];
        administracaoGets = [];
        prontidaoChamadas = [];
        postsConfirmar = [];
        naturezas = [naturezaItem(naturezaVendaId, '5102', 'Venda de mercadoria'), naturezaItem(naturezaDevolucaoId, '1202', 'Devolução de venda')];
        empresas = [];
        filiais = [];
        empresasGate = Promise.resolve();
        liberarEmpresas = () => undefined;
        empresasRequisicoes = 0;
        prontidaoState.responder = async () => ({ status: 200, data: PRONTA });

        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            const ok = (data: unknown) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
            const url = config.url ?? '';
            if (config.method === 'get' && url === '/api/fiscal/naturezas-operacao') {
                return ok({ items: naturezas, page: 1, pageSize: 200, totalItems: naturezas.length, totalPages: 1 });
            }
            if (config.method === 'get' && url.startsWith('/api/administracao/')) administracaoGets.push(url);
            if (config.method === 'get' && url === '/api/administracao/empresas') {
                empresasRequisicoes += 1;
                await empresasGate;
                return ok(empresas);
            }
            if (config.method === 'get' && url === '/api/administracao/filiais') return ok(filiais);
            if (config.method === 'get' && url === '/api/faturamento/prontidao') {
                prontidaoChamadas.push({ ...(config.params as ChamadaHttp) });
                const resposta = await prontidaoState.responder!(config.params as ChamadaHttp);
                if (resposta.rede) throw new AxiosError('Network Error', 'ERR_NETWORK', config, {});
                if (resposta.status >= 400) {
                    const response = { data: resposta.data, status: resposta.status, statusText: 'Erro', headers: new AxiosHeaders(), config };
                    throw new AxiosError(`Request failed with status code ${resposta.status}`, 'ERR_BAD_REQUEST', config, {}, response);
                }
                return ok(resposta.data);
            }
            if (config.method === 'post' && url === `/api/faturamento/${faturamentoId}/confirmar`) {
                postsConfirmar.push(JSON.parse(String(config.data)) as ConfirmarFaturamentoRequestValues);
                return ok({ faturamento: faturamentoResposta, alertas: [] });
            }
            throw new Error(`Rota não esperada no teste: ${config.method} ${url}`);
        });
    });

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
    });

    // Monta o diálogo com o mesmo caminho da página: `useFaturamentoMutations` (que invalida a prontidão no fim).
    const Harness = ({ filial }: { filial: string | null }) => {
        const { confirmarMutation } = useFaturamentoMutations();
        return (
            <ConfirmarFaturamentoDialog
                visible
                faturamentoId={faturamentoId}
                pedidoVendaId={pedidoVendaId}
                empresaId={empresaId}
                filialId={filial}
                loading={confirmarMutation.isPending}
                onHide={() => undefined}
                onSubmit={async (values: ConfirmarFaturamentoRequestValues) => {
                    await confirmarMutation.mutateAsync({ id: faturamentoId, values });
                }}
            />
        );
    };

    const renderDialog = ({ filial = null, queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }) }: { filial?: string | null; queryClient?: QueryClient } = {}) => {
        const utils = render(
            <QueryClientProvider client={queryClient}>
                <Harness filial={filial} />
            </QueryClientProvider>
        );
        return { ...utils, queryClient };
    };

    const confirmarButton = () => within(screen.getByRole('dialog')).getByRole('button', { name: FATURAMENTO_CONFIRMAR.rotuloConfirmar });
    const ultimaConsulta = () => prontidaoChamadas[prontidaoChamadas.length - 1];

    const colar = async (user: ReturnType<typeof userEvent.setup>, campo: HTMLElement, texto: string) => {
        await user.click(campo);
        await user.paste(texto);
    };

    // Preenche o formulário e espera a prontidão dos parâmetros atuais (debounce + resposta) liberar o botão.
    const preencher = async (user: ReturnType<typeof userEvent.setup>, { natureza = naturezaVendaId, uf = 'SP' }: { natureza?: string | null; uf?: string } = {}) => {
        const combo = await screen.findByRole('combobox', { name: 'natureza de operação' });
        await within(combo).findByRole('option', { name: '5102 — Venda de mercadoria' });
        await waitFor(() => expect(combo).toBeEnabled());
        if (natureza) await user.selectOptions(combo, natureza);
        await colar(user, screen.getByLabelText('Série'), '1');
        await colar(user, screen.getByLabelText('Número *'), '1001');
        await colar(user, screen.getByLabelText('UF autorizadora *'), uf);
        await colar(user, screen.getByLabelText('Unidade comercial padrão *'), 'UN');
        await user.click(screen.getByRole('button', { name: 'Escolher vencimento' }));
        await waitFor(() => expect(confirmarButton()).toBeEnabled(), { timeout: 3000 });
    };

    const esperarNaturezasCarregadas = async () => {
        const combo = await screen.findByRole('combobox', { name: 'natureza de operação' });
        await within(combo).findByRole('option', { name: '5102 — Venda de mercadoria' });
        await waitFor(() => expect(combo).toBeEnabled());
        return combo;
    };

    it('AC-1: abre a consulta com o pedido e, ao preencher, refaz a consulta com os parâmetros do formulário pelos nomes do Confirmar', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialog();

        await waitFor(() => expect(prontidaoChamadas.length).toBeGreaterThan(0));
        expect(prontidaoChamadas[0]).toMatchObject({ pedidoVendaId });

        await preencher(user, { natureza: naturezaDevolucaoId });

        expect(ultimaConsulta()).toMatchObject({ pedidoVendaId, naturezaOperacaoId: naturezaDevolucaoId, serie: '1', numero: '1001', tipoDocumento: 1 });
        // A prontidão não leva o correlationId: ele é do envio, não da conferência.
        expect(ultimaConsulta()).not.toHaveProperty('correlationId');
    });

    it('AC-2: pronto = false desabilita o Confirmar, lista as pendências agrupadas por etapa na ordem do tipo e linka a tela de cada uma', async () => {
        prontidaoState.responder = async () => ({ status: 200, data: PENDENTE });
        renderDialog();

        expect(await screen.findByText('Produto sem NCM')).toBeInTheDocument();
        // Ordem do tipo (Emitente antes de Produto), etapa desconhecida no fim; dentro da etapa, a ordem da resposta.
        const textos = screen.getAllByRole('listitem').map((item) => (item.textContent ?? '').replace(/(Abrir|Peça).*$/, '').trim());
        expect(textos).toEqual(['Emitente sem IE', 'Produto sem NCM', 'Algo novo']);
        expect(screen.getByText('Emitente (empresa e filial)')).toBeInTheDocument();
        expect(screen.getByText('Produtos')).toBeInTheDocument();
        expect(screen.getByText('Nova')).toBeInTheDocument();

        expect(confirmarButton()).toBeDisabled();
        expect(screen.getByText(FATURAMENTO_PRONTIDAO.confirmarBloqueado)).toBeInTheDocument();

        // Recurso conhecido vira link para a tela; recurso desconhecido aparece sem link.
        expect(screen.getByRole('link', { name: PRONTIDAO_RECURSO_ROTULO.Produtos })).toHaveAttribute('href', '/produtos');
        const algoNovo = screen.getAllByRole('listitem').find((item) => item.textContent?.includes('Algo novo'));
        expect(algoNovo).toBeDefined();
        expect(within(algoNovo as HTMLElement).queryByRole('link')).toBeNull();
    });

    it('AC-2: pronto = true habilita o Confirmar e não lista pendência', async () => {
        renderDialog();

        expect(await screen.findByText(FATURAMENTO_PRONTIDAO.pronto)).toBeInTheDocument();
        await waitFor(() => expect(confirmarButton()).toBeEnabled());
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
        expect(screen.queryByText(FATURAMENTO_PRONTIDAO.confirmarBloqueado)).not.toBeInTheDocument();
    });

    it('AC-3 (armadilha central): mudar a natureza não libera o Confirmar com a resposta do parâmetro anterior; o botão só libera com a resposta NOVA', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialog();
        const combo = await esperarNaturezasCarregadas();
        await waitFor(() => expect(confirmarButton()).toBeEnabled());

        // A resposta dos parâmetros novos fica pendente até o teste liberá-la.
        let liberar: (resposta: unknown) => void = () => undefined;
        const pendente = new Promise<{ status: number; data: unknown }>((resolve) => {
            liberar = (data) => resolve({ status: 200, data });
        });
        prontidaoState.responder = async (params) => (params.naturezaOperacaoId === naturezaDevolucaoId ? pendente : { status: 200, data: PRONTA });

        await user.selectOptions(combo, naturezaDevolucaoId);
        // Logo após a mudança: a resposta antiga (pronta) está em cache, mas não vale para os parâmetros novos.
        expect(confirmarButton()).toBeDisabled();

        await waitFor(() => expect(prontidaoChamadas.some((params) => params.naturezaOperacaoId === naturezaDevolucaoId)).toBe(true), { timeout: 2000 });
        // A consulta dos parâmetros novos está em voo: segue desabilitado.
        expect(confirmarButton()).toBeDisabled();

        await act(async () => {
            liberar(PRONTA);
        });
        await waitFor(() => expect(confirmarButton()).toBeEnabled());
    });

    it('AC-3: a resposta nova com pronto = false mantém o Confirmar desabilitado e mostra a pendência', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialog();
        const combo = await esperarNaturezasCarregadas();
        await waitFor(() => expect(confirmarButton()).toBeEnabled());

        prontidaoState.responder = async (params) => (params.naturezaOperacaoId === naturezaDevolucaoId ? { status: 200, data: PENDENTE } : { status: 200, data: PRONTA });
        await user.selectOptions(combo, naturezaDevolucaoId);

        expect(await screen.findByText('Produto sem NCM')).toBeInTheDocument();
        expect(confirmarButton()).toBeDisabled();
    });

    it('AC-3: Reconferir em voo mantém o Confirmar desabilitado, mesmo com a resposta anterior pronta em cache', async () => {
        const user = userEvent.setup({ delay: null });
        renderDialog();
        await waitFor(() => expect(confirmarButton()).toBeEnabled());

        let liberar: () => void = () => undefined;
        const pendente = new Promise<{ status: number; data: unknown }>((resolve) => {
            liberar = () => resolve({ status: 200, data: PRONTA });
        });
        prontidaoState.responder = async () => pendente;

        await user.click(screen.getByRole('button', { name: 'Reconferir' }));
        await waitFor(() => expect(prontidaoChamadas).toHaveLength(2));

        // Mesma chave, dado antigo ainda pronto: só a consulta em voo impede a liberação.
        expect(confirmarButton()).toBeDisabled();

        await act(async () => {
            liberar();
        });
        await waitFor(() => expect(confirmarButton()).toBeEnabled());
    });

    it('AC-4: Reconferir refaz a consulta e mostra a resposta nova', async () => {
        const user = userEvent.setup({ delay: null });
        let chamadas = 0;
        prontidaoState.responder = async () => {
            chamadas += 1;
            return chamadas === 1 ? { status: 200, data: PRONTA } : { status: 200, data: PENDENTE };
        };
        renderDialog();
        await waitFor(() => expect(confirmarButton()).toBeEnabled());

        await user.click(screen.getByRole('button', { name: 'Reconferir' }));

        expect(await screen.findByText('Produto sem NCM')).toBeInTheDocument();
        expect(prontidaoChamadas).toHaveLength(2);
        expect(confirmarButton()).toBeDisabled();
    });

    // O ApiErrorPanel mostra a mensagem do erro; o título só aparece quando não há mensagem. Por isso a asserção é
    // a mensagem que o usuário lê, e o bloqueio do Confirmar é o que a tela promete em qualquer falha.
    it.each([
        ['erro 500', { status: 500, data: { code: 'Erro.Interno', message: 'Falha interna.', traceId: 'trace-500' } }, 'Falha interna.'],
        ['pedido fora do contexto (404)', { status: 404, data: { code: 'Recurso.NaoEncontrado', message: 'Pedido não encontrado.', traceId: 'trace-404' } }, FATURAMENTO_PRONTIDAO.erroNaoEncontrado],
        ['falha de rede', { status: 0, rede: true }, 'Não foi possível conectar à API. Verifique a URL configurada e tente novamente.']
    ])('AC-5: %s mostra a mensagem de erro, o bloqueio, mantém o Confirmar desabilitado e não lista pendência', async (_, falha, mensagem) => {
        prontidaoState.responder = async () => falha as { status: number; data?: unknown; rede?: boolean };
        renderDialog();

        expect(await screen.findByText(mensagem)).toBeInTheDocument();
        expect(screen.getByText(FATURAMENTO_PRONTIDAO.erroBloqueio)).toBeInTheDocument();
        expect(confirmarButton()).toBeDisabled();
        expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    });

    it('AC-5: 404 mostra a mensagem genérica de pedido fora do contexto, e não a lista', async () => {
        prontidaoState.responder = async () => ({ status: 404, data: { code: 'Recurso.NaoEncontrado', message: 'Pedido não encontrado.', traceId: 'trace-404' } });
        renderDialog();

        expect(await screen.findByText(FATURAMENTO_PRONTIDAO.erroNaoEncontrado)).toBeInTheDocument();
        expect(confirmarButton()).toBeDisabled();
    });

    it('AC-6: avaliação Retomada troca o botão para "Retomar" e mostra o texto da retomada; o botão segue liberado com pronto = true', async () => {
        prontidaoState.responder = async () => ({ status: 200, data: { pronto: true, avaliacao: 'Retomada', pendencias: [] } });
        renderDialog();

        const retomar = await screen.findByRole('button', { name: FATURAMENTO_CONFIRMAR.rotuloRetomar });
        await waitFor(() => expect(retomar).toBeEnabled());
        expect(screen.getByText(FATURAMENTO_PRONTIDAO.retomadaTexto)).toBeInTheDocument();
        expect(within(screen.getByRole('dialog')).queryByRole('button', { name: FATURAMENTO_CONFIRMAR.rotuloConfirmar })).toBeNull();
    });

    it('AC-9: a UF abre sugerida pela FILIAL do faturamento, antes da empresa', async () => {
        permsState.perms.push('ADMINISTRACAO_CONSULTAR');
        empresas = [{ id: empresaId, nomeFantasia: 'Empresa', enderecoFiscal: { uf: 'SP' } }];
        filiais = [{ id: filialId, empresaId, nome: 'Filial', documento: '', enderecoFiscal: { uf: 'RJ' } }];
        renderDialog({ filial: filialId });

        await waitFor(() => expect(screen.getByLabelText(/UF autorizadora/)).toHaveValue('RJ'));
    });

    it('AC-9: sem UF na filial, a UF abre sugerida pela EMPRESA', async () => {
        permsState.perms.push('ADMINISTRACAO_CONSULTAR');
        empresas = [{ id: empresaId, nomeFantasia: 'Empresa', enderecoFiscal: { uf: 'SP' } }];
        renderDialog();

        await waitFor(() => expect(screen.getByLabelText(/UF autorizadora/)).toHaveValue('SP'));
    });

    it('AC-9: a UF que o operador digitou não é sobrescrita quando a sugestão chega depois', async () => {
        const user = userEvent.setup({ delay: null });
        permsState.perms.push('ADMINISTRACAO_CONSULTAR');
        // A lista de empresas chega depois: a sugestão (SP) só existe quando ela responder.
        empresasGate = new Promise<void>((resolve) => {
            liberarEmpresas = resolve;
        });
        empresas = [{ id: empresaId, nomeFantasia: 'Empresa', enderecoFiscal: { uf: 'SP' } }];
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        renderDialog({ queryClient });

        await waitFor(() => expect(empresasRequisicoes).toBe(1));
        const uf = screen.getByLabelText(/UF autorizadora/);
        await user.click(uf);
        await user.type(uf, 'MG');

        await act(async () => {
            liberarEmpresas();
        });
        await waitFor(() => expect(queryClient.getQueryState(['administracao', 'empresas', 'select'])?.status).toBe('success'));
        await act(async () => {});

        expect(uf).toHaveValue('MG');
    });

    it('AC-9 (sem permissão): com o diálogo aberto, sem ADMINISTRACAO_CONSULTAR e sem master, nenhum GET a /api/administracao/* sai e a UF fica vazia e editável', async () => {
        const user = userEvent.setup({ delay: null });
        // beforeEach: sem ADMINISTRACAO_CONSULTAR; contexto não é master (snapshot do mock).
        renderDialog({ filial: filialId });
        await waitFor(() => expect(prontidaoChamadas.length).toBeGreaterThan(0));

        const uf = screen.getByLabelText(/UF autorizadora/);
        expect(uf).toHaveValue('');
        await user.click(uf);
        await user.type(uf, 'MG');
        expect(uf).toHaveValue('MG');

        // Contagem nominal no adapter: nenhuma consulta de administração saiu, nem da filial nem da empresa.
        expect(administracaoGets).toEqual([]);
    });

    it('invalidação (AJ-37): depois do Confirmar, a prontidão é INVALIDADA e refeita, e nunca recebe setQueryData', async () => {
        const user = userEvent.setup({ delay: null });
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
        const invalidar = vi.spyOn(queryClient, 'invalidateQueries');
        const setDados = vi.spyOn(queryClient, 'setQueryData');
        renderDialog({ queryClient });
        await preencher(user);

        const antesDoConfirmar = prontidaoChamadas.length;
        await user.click(confirmarButton());
        await waitFor(() => expect(postsConfirmar).toHaveLength(1));

        expect(invalidar).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['faturamento-prontidao'] }));
        expect(setDados).not.toHaveBeenCalled();
        // A invalidação refaz o GET da prontidão: a resposta do Confirmar não substitui a conferência.
        await waitFor(() => expect(prontidaoChamadas.length).toBeGreaterThan(antesDoConfirmar));
    });
});
