import { describe, expect, it } from 'vitest';
import { OrigemFinanceira } from '@/types/erp';
import { origemFinanceiraLabel } from '@/features/financeiro/components/financeiroUiUtils';

describe('Financeiro — AC-1 — origemFinanceiraLabel', () => {
    it('mostra rótulo para OrdemServico (7)', () => {
        const label = origemFinanceiraLabel(OrigemFinanceira.OrdemServico);
        expect(label).not.toBe('-');
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
    });

    it('mostra rótulo para Frota (8)', () => {
        const label = origemFinanceiraLabel(OrigemFinanceira.Frota);
        expect(label).not.toBe('-');
        expect(label).toBeTruthy();
        expect(typeof label).toBe('string');
    });

    it('diferencia rótulo de OrdemServico de Frota', () => {
        const labelOrdenServico = origemFinanceiraLabel(OrigemFinanceira.OrdemServico);
        const labelFrota = origemFinanceiraLabel(OrigemFinanceira.Frota);
        expect(labelOrdenServico).not.toBe(labelFrota);
    });

    it('mantém rótulos para todas as 8 origens', () => {
        const labels = [
            origemFinanceiraLabel(OrigemFinanceira.Manual),
            origemFinanceiraLabel(OrigemFinanceira.PedidoVenda),
            origemFinanceiraLabel(OrigemFinanceira.NotaFiscal),
            origemFinanceiraLabel(OrigemFinanceira.Compra),
            origemFinanceiraLabel(OrigemFinanceira.Contrato),
            origemFinanceiraLabel(OrigemFinanceira.AjusteAutorizado),
            origemFinanceiraLabel(OrigemFinanceira.OrdemServico),
            origemFinanceiraLabel(OrigemFinanceira.Frota)
        ];

        // Nenhum label deve ser fallback vazio
        expect(labels.every((label) => label && label !== '-')).toBe(true);
        // Todos devem ser strings não-vazias
        expect(labels.every((label) => typeof label === 'string' && label.trim().length > 0)).toBe(true);
    });
});
