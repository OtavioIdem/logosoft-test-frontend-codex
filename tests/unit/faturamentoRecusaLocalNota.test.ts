import { describe, expect, it } from 'vitest';
import {
    alertaExibicao,
    descricaoLegQueParou,
    FATURAMENTO_RESULTADO,
    leg4Falhou,
    motivoLegExibicao,
    notaRecusadaLocalmente,
    resumoResultadoConfirmacao
} from '@/features/faturamento/components/faturamentoLabels';
import { legQueParou } from '@/features/faturamento/components/faturamentoLabels';
import { LegIntegracaoFaturamento } from '@/features/faturamento/types/faturamento.types';
import type { FaturamentoLegResponse, FaturamentoResponse } from '@/features/faturamento/types/faturamento.types';

// Emenda QA-01 da D113. O backend NUNCA põe RECUSA_LOCAL no motivo do leg 4. O texto real é
// `ConfirmarFaturamentoUseCase.cs:277`: "Nota fiscal rejeitada pela SEFAZ. Código: {cStat}. Motivo: {motivo}."
// Na recusa local o cStat costuma vir vazio. O código `RECUSA_LOCAL` só existe em `codigoRejeicao` da nota.
// O trecho depois de "Motivo:" é ilustrativo; o prefixo e o formato são os do backend.

const MOTIVO_CSTAT_VAZIO = 'Nota fiscal rejeitada pela SEFAZ. Código: . Motivo: Certificado digital vencido.';
const MOTIVO_CSTAT_PREENCHIDO = 'Nota fiscal rejeitada pela SEFAZ. Código: 999. Motivo: Certificado digital vencido.';
const MOTIVO_SEFAZ_COMUM = 'Nota fiscal rejeitada pela SEFAZ. Código: 539. Motivo: Duplicidade de NF-e com diferença na chave de acesso.';

const leg = (numero: number, estado: number, motivo?: string): FaturamentoLegResponse => ({ id: `l${numero}`, leg: numero, estado, ocorreuEm: '2026-09-30T10:00:00Z', motivo });

describe('notaRecusadaLocalmente — o código gravado na nota é o sinal primário', () => {
    it('RECUSA_LOCAL na nota é recusa local', () => {
        expect(notaRecusadaLocalmente('RECUSA_LOCAL')).toBe(true);
    });

    it.each([
        ['outro código da nota', '539'],
        ['nota sem código', null],
        ['nota não lida', undefined],
        ['vazio', '']
    ])('%s NÃO é recusa local', (_, codigo) => {
        expect(notaRecusadaLocalmente(codigo)).toBe(false);
    });
});

describe('motivoLegExibicao com o código da nota (leg 4)', () => {
    it.each([
        ['cStat vazio', MOTIVO_CSTAT_VAZIO],
        ['cStat preenchido', MOTIVO_CSTAT_PREENCHIDO]
    ])('nota RECUSA_LOCAL + motivo real (%s) dá o texto da recusa local', (_, motivo) => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, motivo, 'RECUSA_LOCAL')).toBe(FATURAMENTO_RESULTADO.recusaLocal);
    });

    it.each([
        ['nota com outro código', MOTIVO_SEFAZ_COMUM, '539'],
        ['nota sem código', MOTIVO_CSTAT_VAZIO, null],
        ['nota não lida (sem permissão, erro ou carregando)', MOTIVO_CSTAT_VAZIO, undefined]
    ])('%s + motivo real dá o motivo cru, sem afirmar recusa local', (_, motivo, codigo) => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, motivo, codigo)).toBe(motivo);
    });

    it('leg diferente de 4 não muda, mesmo com a nota RECUSA_LOCAL', () => {
        for (const numero of [1, 2, 3, 5, 6]) {
            expect(motivoLegExibicao(numero, MOTIVO_CSTAT_VAZIO, 'RECUSA_LOCAL')).toBe(MOTIVO_CSTAT_VAZIO);
        }
    });

    it('segundo sinal: o código RECUSA_LOCAL no próprio motivo ainda vale no leg 4 (sem a nota)', () => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, 'Código: RECUSA_LOCAL', null)).toBe(FATURAMENTO_RESULTADO.recusaLocal);
    });

    it('motivo vazio vira null, mesmo com a nota recusada', () => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, null, 'RECUSA_LOCAL')).toBe(FATURAMENTO_RESULTADO.recusaLocal);
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, '   ', null)).toBeNull();
    });
});

describe('alertaExibicao com o código da nota (alerta do Confirmar)', () => {
    it('alerta "rejeitada pela SEFAZ" + nota RECUSA_LOCAL recebe o texto da recusa local', () => {
        expect(alertaExibicao(MOTIVO_CSTAT_VAZIO, 'RECUSA_LOCAL')).toBe(FATURAMENTO_RESULTADO.recusaLocal);
    });

    it('alerta "rejeitada pela SEFAZ" sem a nota recusada passa como veio', () => {
        expect(alertaExibicao(MOTIVO_CSTAT_VAZIO, null)).toBe(MOTIVO_CSTAT_VAZIO);
        expect(alertaExibicao(MOTIVO_SEFAZ_COMUM, '539')).toBe(MOTIVO_SEFAZ_COMUM);
    });

    it('alerta que não é de rejeição não muda, mesmo com a nota RECUSA_LOCAL', () => {
        expect(alertaExibicao('Certificado vence em 30 dias', 'RECUSA_LOCAL')).toBe('Certificado vence em 30 dias');
    });
});

describe('leg4Falhou — só então a nota é lida', () => {
    it('leg 4 em Falhou é verdadeiro', () => {
        expect(leg4Falhou([leg(1, 1), leg(4, 2, MOTIVO_CSTAT_VAZIO)])).toBe(true);
    });

    it('leg 4 integrado, ou só outro leg em falha, é falso', () => {
        expect(leg4Falhou([leg(4, 1)])).toBe(false);
        expect(leg4Falhou([leg(3, 2, 'falha')])).toBe(false);
        expect(leg4Falhou(null)).toBe(false);
    });
});

describe('texto do resultado e do painel com a recusa local', () => {
    const faturamentoComLeg4 = (motivo: string): FaturamentoResponse =>
        ({
            id: '99999999-9999-9999-9999-999999999999',
            empresaId: '11111111-1111-1111-1111-111111111111',
            filialId: null,
            pedidoVendaId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            notaFiscalId: '88888888-8888-8888-8888-888888888888',
            contaReceberId: null,
            etapa: 7,
            valorTotal: 251,
            confirmadoEm: null,
            legs: [leg(1, 1), leg(4, 2, motivo)],
            possuiLegComFalha: true,
            possuiLegRevertido: false,
            etapaDivergeDosLegs: false,
            possuiLegEmReversao: false
        }) as FaturamentoResponse;

    it('o resumo (usado pelo toast) leva o texto da recusa local quando a nota é RECUSA_LOCAL', () => {
        const resumo = resumoResultadoConfirmacao(faturamentoComLeg4(MOTIVO_CSTAT_VAZIO), 'RECUSA_LOCAL');
        expect(resumo.detalhe).toContain(FATURAMENTO_RESULTADO.recusaLocal);
        expect(resumo.detalhe).not.toContain('rejeitada pela SEFAZ');
    });

    it('sem o código da nota, o resumo leva o motivo cru', () => {
        const resumo = resumoResultadoConfirmacao(faturamentoComLeg4(MOTIVO_CSTAT_VAZIO), null);
        expect(resumo.detalhe).toContain(MOTIVO_CSTAT_VAZIO);
        expect(resumo.detalhe).not.toContain(FATURAMENTO_RESULTADO.recusaLocal);
    });

    it('a descrição do leg que parou usa o código da nota', () => {
        const parou = legQueParou(faturamentoComLeg4(MOTIVO_CSTAT_VAZIO).legs);
        expect(parou).not.toBeNull();
        expect(descricaoLegQueParou(parou!, 'RECUSA_LOCAL')).toContain(FATURAMENTO_RESULTADO.recusaLocal);
    });
});
