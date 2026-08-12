import { describe, expect, it } from 'vitest';
import { buildRelatorioPeriodoQuery } from '@/features/relatorios/api/relatoriosApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';

describe('relatórios payloads B44', () => {
    it('monta query de período com empresa, filial e datas ISO', () => {
        const payload = buildRelatorioPeriodoQuery({
            empresaId,
            filialId,
            dataInicial: new Date('2026-06-01T00:00:00.000Z'),
            dataFinal: new Date('2026-06-30T23:59:59.000Z')
        });

        expect(payload).toEqual({
            empresaId,
            filialId,
            dataInicial: '2026-06-01T00:00:00.000Z',
            dataFinal: '2026-06-30T23:59:59.000Z'
        });
    });

    it('exige empresa para o relatório operacional, conforme o contrato do backend', () => {
        expect(() => buildRelatorioPeriodoQuery({ empresaId: '', dataInicial: '2026-06-01', dataFinal: '2026-06-30' })).toThrow();
    });

    it('bloqueia data final menor que data inicial', () => {
        expect(() => buildRelatorioPeriodoQuery({ empresaId, dataInicial: '2026-07-01', dataFinal: '2026-06-30' })).toThrow('Data final deve ser maior ou igual à inicial.');
    });
});
