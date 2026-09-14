import { describe, expect, it } from 'vitest';
import {
    acaoRetomadaOptions,
    confirmacaoBloqueadaPorReversao,
    estadoLegLabel,
    estadoLegSeverity,
    legFaturamentoLabel,
    montarLinhasDeLegs
} from '@/features/faturamento/components/faturamentoLabels';
import {
    AcaoRetomadaReversaoLeg,
    EstadoLegIntegracaoFaturamento,
    LegIntegracaoFaturamento,
    FaturamentoResponse,
    FaturamentoLegResponse
} from '@/features/faturamento/types/faturamento.types';

describe('Faturamento — rótulos e regras de UI', () => {
    it('AC-1: enum LegIntegracaoFaturamento tem exatamente os 6 valores (FaturamentoLegIntegracao.cs:12-20)', () => {
        expect(legFaturamentoLabel(LegIntegracaoFaturamento.GerarNotaFiscal)).toBe('Gerar nota fiscal');
        expect(legFaturamentoLabel(LegIntegracaoFaturamento.GerarXmlEnvio)).toBe('Gerar XML de envio');
        expect(legFaturamentoLabel(LegIntegracaoFaturamento.AssinarXml)).toBe('Assinar XML');
        expect(legFaturamentoLabel(LegIntegracaoFaturamento.TransmitirAutorizarSefaz)).toBe('Transmitir e autorizar na SEFAZ');
        expect(legFaturamentoLabel(LegIntegracaoFaturamento.BaixarEstoque)).toBe('Baixar estoque');
        expect(legFaturamentoLabel(LegIntegracaoFaturamento.GerarContaReceber)).toBe('Gerar conta a receber');
        expect(
            Object.entries(LegIntegracaoFaturamento).filter(([, v]) => typeof v === 'number')
        ).toEqual([
            ['GerarNotaFiscal', 1],
            ['GerarXmlEnvio', 2],
            ['AssinarXml', 3],
            ['TransmitirAutorizarSefaz', 4],
            ['BaixarEstoque', 5],
            ['GerarContaReceber', 6]
        ]);
    });

    it('AC-1: enum EstadoLegIntegracaoFaturamento tem exatamente 4 valores (FaturamentoLegIntegracao.cs:31-66)', () => {
        expect(estadoLegLabel(EstadoLegIntegracaoFaturamento.Integrado)).toBe('Integrado');
        expect(estadoLegLabel(EstadoLegIntegracaoFaturamento.Falhou)).toBe('Falhou');
        expect(estadoLegLabel(EstadoLegIntegracaoFaturamento.Revertido)).toBe('Revertido');
        expect(estadoLegLabel(EstadoLegIntegracaoFaturamento.EmReversao)).toBe('Em reversão');
        expect(estadoLegSeverity(EstadoLegIntegracaoFaturamento.Integrado)).toBe('success');
        expect(estadoLegSeverity(EstadoLegIntegracaoFaturamento.Falhou)).toBe('danger');
        expect(estadoLegSeverity(EstadoLegIntegracaoFaturamento.Revertido)).toBe('info');
        expect(estadoLegSeverity(EstadoLegIntegracaoFaturamento.EmReversao)).toBe('warning');
        expect(
            Object.entries(EstadoLegIntegracaoFaturamento).filter(([, v]) => typeof v === 'number')
        ).toEqual([
            ['Integrado', 1],
            ['Falhou', 2],
            ['Revertido', 3],
            ['EmReversao', 4]
        ]);
    });

    it('AC-1: enum AcaoRetomadaReversaoLeg tem exatamente 2 valores (FaturamentoContracts.cs:124-128)', () => {
        expect(acaoRetomadaOptions).toHaveLength(2);
        expect(acaoRetomadaOptions[0]).toEqual({ label: 'Reaplicar a inversa', value: AcaoRetomadaReversaoLeg.ReaplicarInversa });
        expect(acaoRetomadaOptions[1]).toEqual({ label: 'Declarar efeito desfeito', value: AcaoRetomadaReversaoLeg.DeclararEfeitoDesfeito });
        expect(
            Object.entries(AcaoRetomadaReversaoLeg).filter(([, v]) => typeof v === 'number')
        ).toEqual([
            ['ReaplicarInversa', 1],
            ['DeclararEfeitoDesfeito', 2]
        ]);
    });

    it('AC-3: estados 0, 5 e 99 nunca viram "Revertido" e aparecem como "Estado desconhecido (n)"', () => {
        expect(estadoLegLabel(0)).toBe('Estado desconhecido (0)');
        expect(estadoLegLabel(5)).toBe('Estado desconhecido (5)');
        expect(estadoLegLabel(99)).toBe('Estado desconhecido (99)');
        expect(estadoLegSeverity(0)).toBe(null);
        expect(estadoLegSeverity(5)).toBe(null);
        expect(estadoLegSeverity(99)).toBe(null);
    });

    it('AC-2/D25: montarLinhasDeLegs monta 6 linhas na ordem 1 a 6', () => {
        const leg1: FaturamentoLegResponse = {
            id: '11111111-1111-1111-1111-111111111111',
            leg: LegIntegracaoFaturamento.GerarNotaFiscal,
            estado: EstadoLegIntegracaoFaturamento.Integrado,
            ocorreuEm: '2026-09-14T10:00:00Z'
        };
        const lines = montarLinhasDeLegs([leg1]);
        expect(lines).toHaveLength(6);
        expect(lines[0].leg).toBe(LegIntegracaoFaturamento.GerarNotaFiscal);
        expect(lines[0].registro).toEqual(leg1);
        expect(lines[1].leg).toBe(LegIntegracaoFaturamento.GerarXmlEnvio);
        expect(lines[1].registro).toBeNull();
        expect(lines[5].leg).toBe(LegIntegracaoFaturamento.GerarContaReceber);
        expect(lines[5].registro).toBeNull();
    });

    it('AC-2/D25: montarLinhasDeLegs mostra "Sem registro" (null registro) para leg ausente', () => {
        const lines = montarLinhasDeLegs([]);
        expect(lines).toHaveLength(6);
        lines.forEach((line) => {
            expect(line.registro).toBeNull();
            expect(line.legLabel).not.toBe('Sem registro');
        });
    });

    it('AC-2/D25: montarLinhasDeLegs cria linha extra para leg desconhecido', () => {
        const legDesconhecido: FaturamentoLegResponse = {
            id: '22222222-2222-2222-2222-222222222222',
            leg: 99,
            estado: EstadoLegIntegracaoFaturamento.Falhou,
            ocorreuEm: '2026-09-14T10:00:00Z',
            motivo: 'Teste'
        };
        const lines = montarLinhasDeLegs([legDesconhecido]);
        expect(lines).toHaveLength(7);
        expect(lines[6].leg).toBe(99);
        expect(lines[6].legLabel).toBe('Leg desconhecido (99)');
        expect(lines[6].registro).toEqual(legDesconhecido);
    });

    it('AC-12: confirmacaoBloqueadaPorReversao lê possuiLegEmReversao corretamente', () => {
        const com_reversao: FaturamentoResponse = {
            id: '11111111-1111-1111-1111-111111111111',
            empresaId: '22222222-2222-2222-2222-222222222222',
            pedidoVendaId: '33333333-3333-3333-3333-333333333333',
            etapa: 2,
            valorTotal: 1000,
            possuiLegEmReversao: true
        };
        const sem_reversao: FaturamentoResponse = {
            ...com_reversao,
            possuiLegEmReversao: false
        };
        expect(confirmacaoBloqueadaPorReversao(com_reversao)).toBe(true);
        expect(confirmacaoBloqueadaPorReversao(sem_reversao)).toBe(false);
    });
});
