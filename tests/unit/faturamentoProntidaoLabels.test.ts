import { describe, expect, it } from 'vitest';
import {
    alertaExibicao,
    ehRecusaLocal,
    FATURAMENTO_CONFIRMAR,
    FATURAMENTO_PRONTIDAO,
    FATURAMENTO_RESULTADO,
    motivoLegExibicao,
    PRONTIDAO_ETAPA_ROTULO,
    PRONTIDAO_RECURSO_ROTULO
} from '@/features/faturamento/components/faturamentoLabels';
import { LegIntegracaoFaturamento, PRONTIDAO_ETAPAS, PRONTIDAO_RECURSOS } from '@/features/faturamento/types/faturamento.types';

// D113/AJ-37 e emenda QA-01: a recusa local vem do `codigoRejeicao` da NOTA (sinal primário). O motivo do leg 4
// tem o texto real do backend ("Nota fiscal rejeitada pela SEFAZ. Código: {cStat}. Motivo: {motivo}."), que NUNCA
// contém RECUSA_LOCAL. A substring no motivo é só segundo sinal. Aqui as fixtures são o texto real.

const MOTIVO_CSTAT_VAZIO = 'Nota fiscal rejeitada pela SEFAZ. Código: . Motivo: Certificado digital vencido.';
const MOTIVO_SEFAZ = 'Nota fiscal rejeitada pela SEFAZ. Código: 539. Motivo: Duplicidade de NF-e com diferença na chave de acesso.';

describe('ehRecusaLocal — segundo sinal, só a substring', () => {
    it.each<[string | null | undefined, boolean]>([
        ['Código: RECUSA_LOCAL', true],
        ['Motivo com RECUSA_LOCAL no meio do texto', true],
        [MOTIVO_CSTAT_VAZIO, false],
        [MOTIVO_SEFAZ, false],
        ['', false],
        [null, false],
        [undefined, false]
    ])('motivo %j tem a substring? %s', (motivo, esperado) => {
        expect(ehRecusaLocal(motivo)).toBe(esperado);
    });
});

describe('motivoLegExibicao — leg 4 com o texto real do backend', () => {
    it('sem o código da nota, o motivo real sai como veio (o segundo sinal não casa)', () => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, MOTIVO_CSTAT_VAZIO)).toBe(MOTIVO_CSTAT_VAZIO);
    });

    it('com a nota RECUSA_LOCAL, o motivo real vira o texto da recusa local', () => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, MOTIVO_CSTAT_VAZIO, 'RECUSA_LOCAL')).toBe(FATURAMENTO_RESULTADO.recusaLocal);
    });

    it('motivo comum da SEFAZ continua como veio, mesmo com a nota de outro código', () => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, MOTIVO_SEFAZ, '539')).toBe(MOTIVO_SEFAZ);
    });

    it('segundo sinal: o código no próprio motivo ainda troca o texto no leg 4', () => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, 'Código: RECUSA_LOCAL', null)).toBe(FATURAMENTO_RESULTADO.recusaLocal);
    });

    it('leg diferente de 4 não muda, mesmo com a nota RECUSA_LOCAL', () => {
        expect(motivoLegExibicao(3, MOTIVO_CSTAT_VAZIO, 'RECUSA_LOCAL')).toBe(MOTIVO_CSTAT_VAZIO);
    });

    it('motivo vazio ou ausente vira null', () => {
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, null)).toBeNull();
        expect(motivoLegExibicao(LegIntegracaoFaturamento.TransmitirAutorizarSefaz, '   ')).toBeNull();
    });
});

describe('alertaExibicao — alerta devolvido pelo Confirmar', () => {
    it('alerta "rejeitada pela SEFAZ" com a nota RECUSA_LOCAL recebe o texto da recusa local', () => {
        expect(alertaExibicao(MOTIVO_CSTAT_VAZIO, 'RECUSA_LOCAL')).toBe(FATURAMENTO_RESULTADO.recusaLocal);
    });

    it('alerta comum passa sem alteração', () => {
        expect(alertaExibicao('Certificado vence em 30 dias')).toBe('Certificado vence em 30 dias');
    });
});

describe('rótulos do Confirmar e da prontidão (AC-6 e AC-2)', () => {
    it('avaliação Retomada troca o rótulo do botão para "Retomar"; o normal continua "Confirmar"', () => {
        expect(FATURAMENTO_CONFIRMAR.rotuloRetomar).toBe('Retomar');
        expect(FATURAMENTO_CONFIRMAR.rotuloConfirmar).toBe('Confirmar');
    });

    it('contagem de pendências usa singular para 1 e plural para o resto', () => {
        expect(FATURAMENTO_PRONTIDAO.pendentes(1)).toBe('1 pendência a resolver antes de confirmar');
        expect(FATURAMENTO_PRONTIDAO.pendentes(3)).toBe('3 pendências a resolver antes de confirmar');
    });

    it('todo recurso e toda etapa do backend têm rótulo (nenhum cai no código cru por esquecimento)', () => {
        expect(Object.keys(PRONTIDAO_RECURSO_ROTULO).sort()).toEqual([...PRONTIDAO_RECURSOS].sort());
        expect(Object.keys(PRONTIDAO_ETAPA_ROTULO).sort()).toEqual([...PRONTIDAO_ETAPAS].sort());
        for (const rotulo of Object.values(PRONTIDAO_RECURSO_ROTULO)) expect(rotulo.trim()).not.toBe('');
    });
});
