import { describe, expect, it } from 'vitest';
import { buildAuditoriaOperacionalQuery } from '@/features/auditoria/api/auditoriaApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const usuarioId = '33333333-3333-3333-3333-333333333333';

describe('auditoria payloads B45', () => {
    it('monta query operacional com contexto, usuário, ação e paginação', () => {
        expect(buildAuditoriaOperacionalQuery({
            empresaId,
            filialId,
            usuarioId,
            modulo: ' Financeiro ',
            entidade: 'ContaFinanceiraOperacional',
            acao: 'Atualizacao',
            termo: ' baixa ',
            dataInicial: new Date('2026-06-01T00:00:00.000Z'),
            dataFinal: new Date('2026-06-30T23:59:59.000Z'),
            page: 2,
            pageSize: 50
        })).toEqual({
            empresaId,
            filialId,
            usuarioId,
            modulo: 'Financeiro',
            entidade: 'ContaFinanceiraOperacional',
            acao: 'Atualizacao',
            termo: 'baixa',
            dataInicial: '2026-06-01T00:00:00.000Z',
            dataFinal: '2026-06-30T23:59:59.000Z',
            page: 2,
            pageSize: 50
        });
    });

    it('omite GUIDs inválidos e aplica paginação padrão', () => {
        expect(buildAuditoriaOperacionalQuery({ empresaId: '', filialId: '99', usuarioId: '0', modulo: '', dataInicial: '', dataFinal: '' })).toEqual({ page: 1, pageSize: 20 });
    });

    it('bloqueia período invertido', () => {
        expect(() => buildAuditoriaOperacionalQuery({ dataInicial: '2026-07-01', dataFinal: '2026-06-30' })).toThrow('Data final deve ser maior ou igual à inicial.');
    });
});
