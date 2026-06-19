import { describe, expect, it } from 'vitest';
import { buildAuditoriaReference, formatAuditoriaDateTime, getAuditoriaActionLabel, getAuditoriaActionSeverity, maskAuditoriaTechnicalIds } from '@/features/auditoria/utils/auditoriaDisplay';

describe('auditoriaDisplay', () => {
    it('mapeia ações de auditoria para rótulos amigáveis', () => {
        expect(getAuditoriaActionLabel(4)).toBe('Cancelamento');
        expect(getAuditoriaActionLabel(7)).toBe('Estorno');
        expect(getAuditoriaActionLabel(99)).toBe('Ação 99');
        expect(getAuditoriaActionLabel('Atualizacao')).toBe('Atualização');
    });

    it('mapeia severidade visual para ações críticas', () => {
        expect(getAuditoriaActionSeverity(1)).toBe('success');
        expect(getAuditoriaActionSeverity(7)).toBe('warning');
        expect(getAuditoriaActionSeverity(4)).toBe('danger');
        expect(getAuditoriaActionSeverity('Cancelamento')).toBe('danger');
    });

    it('formata datas inválidas sem quebrar a tela', () => {
        expect(formatAuditoriaDateTime(null)).toBe('Sem data');
        expect(formatAuditoriaDateTime('valor-invalido')).toBe('Sem data');
    });

    it('gera referência amigável sem expor GUID cru', () => {
        expect(buildAuditoriaReference('PedidoVenda', 5)).toBe('PedidoVenda: aprovação registrada com rastreabilidade');
    });

    it('mascara GUID bruto em textos de auditoria', () => {
        expect(maskAuditoriaTechnicalIds('Evento 33333333-3333-3333-3333-333333333333 processado')).toBe('Evento vínculo técnico processado');
    });
});
