import { describe, expect, it } from 'vitest';
import { TipoMovimentoEstoque } from '@/types/erp';
import { movimentoEstoqueLabel } from '@/features/estoque/components/estoqueUxUtils';

describe('AC-2: TipoMovimentoEstoque enum com tipos 8, 9, 10', () => {
    it('enum TipoMovimentoEstoque tem os valores esperados (8, 9, 10)', () => {
        expect(TipoMovimentoEstoque.TransferenciaSaida).toBe(8);
        expect(TipoMovimentoEstoque.TransferenciaEntrada).toBe(9);
        expect(TipoMovimentoEstoque.EstornoBaixaReserva).toBe(10);
    });

    it('prova que TipoMovimentoEstoque.TransferenciaSaida (8) tem rótulo "Transferência — saída"', () => {
        expect(movimentoEstoqueLabel(TipoMovimentoEstoque.TransferenciaSaida)).toBe('Transferência — saída');
    });

    it('prova que TipoMovimentoEstoque.TransferenciaEntrada (9) tem rótulo "Transferência — entrada"', () => {
        expect(movimentoEstoqueLabel(TipoMovimentoEstoque.TransferenciaEntrada)).toBe('Transferência — entrada');
    });

    it('prova que TipoMovimentoEstoque.EstornoBaixaReserva (10) tem rótulo "Estorno de baixa de reserva"', () => {
        expect(movimentoEstoqueLabel(TipoMovimentoEstoque.EstornoBaixaReserva)).toBe('Estorno de baixa de reserva');
    });

    it('prova que todos os 10 tipos têm rótulos', () => {
        const tipos = [
            TipoMovimentoEstoque.Entrada,
            TipoMovimentoEstoque.Saida,
            TipoMovimentoEstoque.AjusteEntrada,
            TipoMovimentoEstoque.AjusteSaida,
            TipoMovimentoEstoque.Reserva,
            TipoMovimentoEstoque.BaixaReserva,
            TipoMovimentoEstoque.CancelamentoReserva,
            TipoMovimentoEstoque.TransferenciaSaida,
            TipoMovimentoEstoque.TransferenciaEntrada,
            TipoMovimentoEstoque.EstornoBaixaReserva
        ];
        tipos.forEach((tipo) => {
            const label = movimentoEstoqueLabel(tipo);
            expect(label).not.toBe('-');
            expect(label).not.toBe(String(tipo));
            expect(label.length).toBeGreaterThan(0);
        });
    });
});
