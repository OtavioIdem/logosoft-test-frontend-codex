import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResultadoConfirmacaoPanel } from '@/features/faturamento/components/ResultadoConfirmacaoPanel';
import { FATURAMENTO_RESULTADO } from '@/features/faturamento/components/faturamentoLabels';
import { sefazSimuladaQueryKey } from '@/features/fiscal/hooks/useSefazSimulada';
import type { FaturamentoResponse, ResultadoConfirmacaoFaturamento } from '@/features/faturamento/types/faturamento.types';

// D113/AJ-37 — selo "SEFAZ simulada" (AC-10) e recusa local no leg 4 (AC-11), no painel de resultado REAL.
// O health é o único ponto externo: o selo só aparece com `fiscal.mock === true` no health.
// AC-11 (emenda QA-01): a recusa local vem do `codigoRejeicao` da NOTA, lido pela página e passado ao painel. O
// motivo do leg 4 tem o texto REAL do backend, que nunca contém RECUSA_LOCAL.

const { saudeState } = vi.hoisted(() => ({
    saudeState: { responder: (): Promise<unknown> => Promise.resolve({ status: 'ok', service: 'LogoSoft', utcNow: '2026-09-30T10:00:00Z', fiscal: { mock: false, ambiente: 'homologacao' } }) }
}));

vi.mock('@/lib/api/healthApi', () => ({
    healthApi: { check: () => saudeState.responder() }
}));

const empresaId = '11111111-1111-1111-1111-111111111111';
const faturamentoId = '99999999-9999-9999-9999-999999999999';
const CORRELATION_ID = 'front-faturamento-99999999-20260930120000-abc123';
// Texto real de `ConfirmarFaturamentoUseCase.cs:277`. O trecho depois de "Motivo:" é ilustrativo.
const MOTIVO_CSTAT_VAZIO = 'Nota fiscal rejeitada pela SEFAZ. Código: . Motivo: Certificado digital vencido.';
const MOTIVO_CSTAT_PREENCHIDO = 'Nota fiscal rejeitada pela SEFAZ. Código: 999. Motivo: Certificado digital vencido.';
const MOTIVO_SEFAZ = 'Nota fiscal rejeitada pela SEFAZ. Código: 539. Motivo: Duplicidade de NF-e com diferença na chave de acesso.';

const faturamento = (overrides: Partial<FaturamentoResponse>): FaturamentoResponse => ({
    id: faturamentoId,
    empresaId,
    filialId: null,
    pedidoVendaId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    notaFiscalId: '88888888-8888-8888-8888-888888888888',
    contaReceberId: null,
    etapa: 5,
    valorTotal: 251,
    confirmadoEm: null,
    confirmadoPor: null,
    canceladoEm: null,
    canceladoPor: null,
    motivoCancelamento: null,
    legs: [],
    possuiLegComFalha: false,
    possuiLegRevertido: false,
    etapaDivergeDosLegs: false,
    possuiLegEmReversao: false,
    ...overrides
});

// Leg 4 (transmissão SEFAZ) em falha com o motivo gravado; etapa Erro, como o backend devolve.
const resultadoComLeg4Falho = (motivo: string, alertas: string[] = []): ResultadoConfirmacaoFaturamento => ({
    correlationId: CORRELATION_ID,
    resposta: {
        faturamento: faturamento({
            etapa: 7,
            possuiLegComFalha: true,
            legs: [
                { id: 'l1', leg: 1, estado: 1, ocorreuEm: '2026-09-30T10:00:00Z' },
                { id: 'l2', leg: 2, estado: 1, ocorreuEm: '2026-09-30T10:00:01Z' },
                { id: 'l3', leg: 3, estado: 1, ocorreuEm: '2026-09-30T10:00:02Z' },
                { id: 'l4', leg: 4, estado: 2, ocorreuEm: '2026-09-30T10:00:03Z', motivo }
            ]
        }),
        alertas
    }
});

const resultadoFaturado = (alertas: string[] = []): ResultadoConfirmacaoFaturamento => ({
    correlationId: CORRELATION_ID,
    resposta: {
        faturamento: faturamento({ etapa: 5, confirmadoEm: '2026-09-30T10:00:10Z', legs: [1, 2, 3, 4, 5, 6].map((leg) => ({ id: `l${leg}`, leg, estado: 1, ocorreuEm: '2026-09-30T10:00:00Z' })) }),
        alertas
    }
});

describe('Resultado do Confirmar — selo SEFAZ simulada (AC-10)', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    });

    afterEach(() => {
        saudeState.responder = () => Promise.resolve({ status: 'ok', service: 'LogoSoft', utcNow: '2026-09-30T10:00:00Z', fiscal: { mock: false, ambiente: 'homologacao' } });
    });

    const renderPainel = (resultado: ResultadoConfirmacaoFaturamento) =>
        render(
            <QueryClientProvider client={queryClient}>
                <ResultadoConfirmacaoPanel resultado={resultado} podeConfirmarDeNovo={false} onConfirmarDeNovo={() => undefined} />
            </QueryClientProvider>
        );

    it('com fiscal.mock = true no health, mostra o selo "SEFAZ simulada" e a explicação', async () => {
        saudeState.responder = () => Promise.resolve({ status: 'ok', service: 'LogoSoft', utcNow: '2026-09-30T10:00:00Z', fiscal: { mock: true, ambiente: 'homologacao' } });
        renderPainel(resultadoFaturado());

        expect(await screen.findByText(FATURAMENTO_RESULTADO.seloSefazSimulada)).toBeInTheDocument();
        expect(screen.getByText(FATURAMENTO_RESULTADO.seloSefazSimuladaDetalhe)).toBeInTheDocument();
    });

    it('o selo fica junto dos alertas devolvidos, sem substituí-los', async () => {
        saudeState.responder = () => Promise.resolve({ status: 'ok', service: 'LogoSoft', utcNow: '2026-09-30T10:00:00Z', fiscal: { mock: true, ambiente: 'homologacao' } });
        renderPainel(resultadoFaturado(['Certificado vence em 30 dias']));

        expect(await screen.findByText(FATURAMENTO_RESULTADO.seloSefazSimulada)).toBeInTheDocument();
        expect(screen.getByText('Certificado vence em 30 dias')).toBeInTheDocument();
    });

    it('com fiscal.mock = false, não mostra o selo', async () => {
        renderPainel(resultadoFaturado());

        await waitFor(() => expect(queryClient.getQueryState(sefazSimuladaQueryKey())?.status).toBe('success'));
        expect(screen.queryByText(FATURAMENTO_RESULTADO.seloSefazSimulada)).toBeNull();
    });

    it('sem bloco fiscal no health (ausência não prova SEFAZ real), não mostra o selo', async () => {
        saudeState.responder = () => Promise.resolve({ status: 'ok', service: 'LogoSoft', utcNow: '2026-09-30T10:00:00Z' });
        renderPainel(resultadoFaturado());

        await waitFor(() => expect(queryClient.getQueryState(sefazSimuladaQueryKey())?.status).toBe('success'));
        expect(screen.queryByText(FATURAMENTO_RESULTADO.seloSefazSimulada)).toBeNull();
    });

    it('health indisponível: não mostra o selo e não afirma SEFAZ real', async () => {
        saudeState.responder = () => Promise.reject(new Error('health fora do ar'));
        renderPainel(resultadoFaturado());

        await waitFor(() => expect(queryClient.getQueryState(sefazSimuladaQueryKey())?.status).toBe('error'));
        expect(screen.queryByText(FATURAMENTO_RESULTADO.seloSefazSimulada)).toBeNull();
    });
});

describe('Resultado do Confirmar — recusa local do leg 4 com o código da nota (AC-11, emenda QA-01)', () => {
    beforeEach(() => {
        saudeState.responder = () => Promise.resolve({ status: 'ok', service: 'LogoSoft', utcNow: '2026-09-30T10:00:00Z', fiscal: { mock: false, ambiente: 'homologacao' } });
    });

    const renderPainel = (resultado: ResultadoConfirmacaoFaturamento, codigoRejeicaoNota: string | null) => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        return render(
            <QueryClientProvider client={queryClient}>
                <ResultadoConfirmacaoPanel resultado={resultado} podeConfirmarDeNovo={false} onConfirmarDeNovo={() => undefined} codigoRejeicaoNota={codigoRejeicaoNota} />
            </QueryClientProvider>
        );
    };

    it.each([
        ['cStat vazio', MOTIVO_CSTAT_VAZIO],
        ['cStat preenchido', MOTIVO_CSTAT_PREENCHIDO]
    ])('nota RECUSA_LOCAL (%s): o texto mostrado é o da recusa local, e o motivo do backend não aparece', async (_, motivo) => {
        renderPainel(resultadoComLeg4Falho(motivo, [motivo]), 'RECUSA_LOCAL');

        // O resumo ("Parou no leg 4") e o alerta do Confirmar recebem o texto da recusa local.
        expect((await screen.findAllByText(FATURAMENTO_RESULTADO.recusaLocal, { exact: false })).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText(/rejeitada pela SEFAZ/i)).toBeNull();
        expect(screen.queryByText(/RECUSA_LOCAL/)).toBeNull();
    });

    it('sem o código da nota (sem permissão, leitura falhando ou carregando): mostra o motivo como veio, sem afirmar recusa local', async () => {
        renderPainel(resultadoComLeg4Falho(MOTIVO_CSTAT_VAZIO, [MOTIVO_CSTAT_VAZIO]), null);

        expect((await screen.findAllByText(MOTIVO_CSTAT_VAZIO, { exact: false })).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText(FATURAMENTO_RESULTADO.recusaLocal, { exact: false })).toBeNull();
    });

    it('nota com outro código (rejeição comum da SEFAZ): mostra o motivo como veio', async () => {
        renderPainel(resultadoComLeg4Falho(MOTIVO_SEFAZ), '539');

        expect((await screen.findAllByText(MOTIVO_SEFAZ, { exact: false })).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText(FATURAMENTO_RESULTADO.recusaLocal, { exact: false })).toBeNull();
    });
});
