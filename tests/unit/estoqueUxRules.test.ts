import { describe, expect, it } from 'vitest';
import { StatusInventario, StatusReservaEstoque, TipoMovimentoEstoque } from '@/types/erp';
import {
    calcularResumoInventarios,
    calcularResumoMovimentos,
    calcularResumoReservas,
    calcularResumoSaldos,
    inventarioStatusLabel,
    isInventarioEmContagem,
    movimentoImpactoLabel,
    reservaStatusLabel
} from '@/features/estoque/components/estoqueUxUtils';
import { EstoqueSaldoResponse, InventarioResponse, MovimentoEstoqueResponse, ReservaEstoqueResponse } from '@/features/estoque/types/estoque.types';

const saldoBase = {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    produtoId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    localEstoqueId: '99999999-9999-9999-9999-999999999999',
    quantidadeAtual: 100,
    quantidadeReservada: 10,
    quantidadeDisponivel: 90
} satisfies EstoqueSaldoResponse;

describe('estoque UX rules', () => {
    it('calcula resumo de saldos sem alterar a fonte de verdade', () => {
        const resumo = calcularResumoSaldos([
            saldoBase,
            { ...saldoBase, id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', quantidadeAtual: 5, quantidadeReservada: 5, quantidadeDisponivel: 0 }
        ]);

        expect(resumo.quantidadeAtual).toBe(105);
        expect(resumo.quantidadeReservada).toBe(15);
        expect(resumo.quantidadeDisponivel).toBe(90);
        expect(resumo.saldosIndisponiveis).toBe(1);
    });

    it('traduz movimentos para rótulos de impacto operacional', () => {
        expect(movimentoImpactoLabel(TipoMovimentoEstoque.Entrada)).toBe('Aumenta saldo físico');
        expect(movimentoImpactoLabel(TipoMovimentoEstoque.Reserva)).toBe('Compromete saldo disponível');
        expect(calcularResumoMovimentos([
            { ...saldoBase, tipoMovimento: TipoMovimentoEstoque.Entrada, quantidade: 10 } as MovimentoEstoqueResponse,
            { ...saldoBase, tipoMovimento: TipoMovimentoEstoque.BaixaReserva, quantidade: 2 } as MovimentoEstoqueResponse
        ])).toMatchObject({ totalMovimentos: 2, entradas: 1, saidas: 1, quantidadeMovimentada: 12 });
    });

    it('calcula resumo e status de reservas', () => {
        const reservas = [
            { ...saldoBase, quantidade: 10, origemModulo: 'VENDAS', statusReserva: StatusReservaEstoque.Ativa } as ReservaEstoqueResponse,
            { ...saldoBase, id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', quantidade: 4, origemModulo: 'VENDAS', statusReserva: StatusReservaEstoque.Baixada } as ReservaEstoqueResponse
        ];

        expect(reservaStatusLabel(StatusReservaEstoque.Ativa)).toBe('Ativa');
        expect(calcularResumoReservas(reservas)).toMatchObject({ totalReservas: 2, ativas: 1, baixadas: 1, quantidadeReservada: 14 });
    });

    it('calcula resumo e status de inventários', () => {
        const inventarios = [
            { ...saldoBase, codigo: 'INV-001', descricao: 'Inventário aberto', statusInventario: StatusInventario.Aberto, itens: [{ produtoId: saldoBase.produtoId, quantidadeContada: 2 }] } as InventarioResponse,
            { ...saldoBase, id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', codigo: 'INV-002', descricao: 'Inventário fechado', statusInventario: StatusInventario.Fechado, itens: [] } as InventarioResponse
        ];

        expect(inventarioStatusLabel(StatusInventario.Fechado)).toBe('Fechado');
        expect(calcularResumoInventarios(inventarios)).toMatchObject({ totalInventarios: 2, abertos: 1, fechados: 1, itensContados: 1 });
    });

    it('reconhece status textual de inventário em contagem', () => {
        const inventarios = [
            { ...saldoBase, codigo: 'INV-003', descricao: 'Inventário em contagem', statusInventario: 'EmContagem', itens: [] } as unknown as InventarioResponse
        ];

        expect(isInventarioEmContagem('EmContagem')).toBe(true);
        expect(inventarioStatusLabel('EmContagem')).toBe('Em contagem');
        expect(calcularResumoInventarios(inventarios)).toMatchObject({ totalInventarios: 1, emContagem: 1 });
    });
});
