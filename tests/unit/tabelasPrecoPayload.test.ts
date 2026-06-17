import { describe, expect, it } from 'vitest';
import {
    buildAtualizarTabelaPrecoItemPayload,
    buildAtualizarTabelaPrecoPayload,
    buildCriarTabelaPrecoItemPayload,
    buildCriarTabelaPrecoPayload,
    buildTabelaPrecoMotivoPayload
} from '@/features/tabelas-preco/api/tabelasPrecoApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const produtoId = '33333333-3333-3333-3333-333333333333';

const date = (value: string) => new Date(`${value}T12:00:00.000Z`);

describe('payloads de Tabelas de Preço B40', () => {
    it('monta criação de tabela com empresa, filial opcional e datas date-only', () => {
        expect(buildCriarTabelaPrecoPayload({
            empresaId,
            filialId: '',
            nome: ' Tabela Padrão 2026 ',
            dataInicioVigencia: date('2026-06-01'),
            dataFimVigencia: null,
            padrao: true
        })).toEqual({
            empresaId,
            filialId: null,
            nome: 'Tabela Padrão 2026',
            dataInicioVigencia: '2026-06-01',
            dataFimVigencia: null,
            padrao: true
        });
    });

    it('monta atualização sem enviar empresa ou filial', () => {
        expect(buildAtualizarTabelaPrecoPayload({
            empresaId,
            filialId,
            nome: 'Tabela Atualizada',
            dataInicioVigencia: date('2026-06-01'),
            dataFimVigencia: date('2026-12-31'),
            padrao: false
        })).toEqual({
            nome: 'Tabela Atualizada',
            dataInicioVigencia: '2026-06-01',
            dataFimVigencia: '2026-12-31',
            padrao: false
        });
    });

    it('monta criação e atualização de item preservando contrato do backend', () => {
        expect(buildCriarTabelaPrecoItemPayload({ produtoId, precoVenda: 100, precoMinimo: 80, margemPercentual: 30 })).toEqual({ produtoId, precoVenda: 100, precoMinimo: 80, margemPercentual: 30 });
        expect(buildAtualizarTabelaPrecoItemPayload({ produtoId, precoVenda: 120, precoMinimo: 90, margemPercentual: 35 })).toEqual({ precoVenda: 120, precoMinimo: 90, margemPercentual: 35 });
    });

    it('bloqueia item sem produto e preço mínimo maior que preço de venda', () => {
        expect(() => buildCriarTabelaPrecoItemPayload({ produtoId: '', precoVenda: 100, precoMinimo: 80, margemPercentual: 30 })).toThrow('Selecione um produto válido.');
        expect(() => buildCriarTabelaPrecoItemPayload({ produtoId, precoVenda: 100, precoMinimo: 101, margemPercentual: 30 })).toThrow('O preço mínimo não pode ser maior que o preço de venda.');
    });

    it('exige motivo auditável para inativação', () => {
        expect(buildTabelaPrecoMotivoPayload('Tabela substituída')).toEqual({ motivo: 'Tabela substituída' });
        expect(() => buildTabelaPrecoMotivoPayload('')).toThrow('Informe um motivo com pelo menos 5 caracteres.');
    });
});
