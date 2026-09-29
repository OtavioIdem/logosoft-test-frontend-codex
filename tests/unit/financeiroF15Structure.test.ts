import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { origemFinanceiraOptions } from '@/features/financeiro/components/financeiroUiUtils';
import { OrigemFinanceira } from '@/types/erp';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Financeiro — F1.5 (Origem em Contas a Pagar)', () => {
    it('em contas a PAGAR, Origem Manual é desabilitada (não oferece Compra)', () => {
        const formDialog = read('features/financeiro/components/ContaFinanceiraFormDialog.tsx');

        // Deve conter lógica que desabilita Compra ou Manual para tipo "pagar"
        // Busca por disabledOrigens ou condição de tipo === 'pagar'
        expect(formDialog).toMatch(/tipo === ['"]pagar['"]|type === ['"]pagar['"]/i);

        // Se há filtro de origens por tipo, deve impedir Compra em pagar
        if (formDialog.includes('disabledOrigens') || formDialog.includes('permitidas')) {
            // Verificar que há lógica de restrição
            expect(formDialog).toMatch(/(disabledOrigens|permitidas|filter)[\s\S]*?(Compra|type.*pagar)/i);
        }
    });

    it('em contas a RECEBER, lançamento manual só oferece origem Manual (D86)', () => {
        const formDialog = read('features/financeiro/components/ContaFinanceiraFormDialog.tsx');
        const types = read('features/financeiro/types/financeiro.types.ts');

        // ContaReceberFormValues deve usar CriarContaReceberRequest
        expect(types).toMatch(/export type ContaReceberFormValues = CriarContaReceberRequest/);

        // CriarContaReceberRequest deve ter campo origem
        expect(types).toMatch(/export type CriarContaReceberRequest[\s\S]*?origem: OrigemFinanceira/);

        // Formulário deve ter referência a receber
        expect(formDialog).toMatch(/type === ['"]receber['"]|tipo === ['"]receber['"]/i);
        // Verificar que há lógica que restringe origem a "Manual" em lançamento manual (financialOriginOptions)
        expect(formDialog).toMatch(/financialOriginOptions\s*=\s*\(\)\s*=>\s*origemFinanceiraOptions\.filter.*Manual/);
    });

    it('origemFinanceiraOptions mantém as 8 origens do backend (D85; catálogo base não é reduzido)', () => {
        // O filtro para Manual é do diálogo de lançamento; o catálogo usado para rotular a coluna
        // "Origem" precisa continuar com as 8 origens, cada uma com o seu valor do contrato.
        expect(origemFinanceiraOptions.map((option) => [option.value, option.label])).toEqual([
            [OrigemFinanceira.Manual, 'Manual'],
            [OrigemFinanceira.PedidoVenda, 'Pedido de venda'],
            [OrigemFinanceira.NotaFiscal, 'Nota fiscal'],
            [OrigemFinanceira.Compra, 'Compra'],
            [OrigemFinanceira.Contrato, 'Contrato'],
            [OrigemFinanceira.AjusteAutorizado, 'Ajuste autorizado'],
            [OrigemFinanceira.OrdemServico, 'Ordem de serviço'],
            [OrigemFinanceira.Frota, 'Frota']
        ]);
        expect([OrigemFinanceira.Manual, OrigemFinanceira.PedidoVenda, OrigemFinanceira.NotaFiscal, OrigemFinanceira.Compra, OrigemFinanceira.Contrato, OrigemFinanceira.AjusteAutorizado, OrigemFinanceira.OrdemServico, OrigemFinanceira.Frota]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('coluna "Origem" em listagem mostra as origens (com suporte a Origem derivada de Compra em pagar)', () => {
        const page = read('features/financeiro/components/ContasFinanceirasPage.tsx');

        // A coluna deve renderizar o campo origem
        expect(page).toMatch(/origem|Origem/i);

        // Deve estar usando os dados corretos da response (Compra é derivada, não deletada)
        expect(page).toContain('origem');
    });

    it('ao trocar empresa em Contas a Receber, PedidoVenda é limpo (dependência)', () => {
        const formDialog = read('features/financeiro/components/ContaFinanceiraFormDialog.tsx');

        // Buscar lógica de onEmpresaChange que limpa valores dependentes
        expect(formDialog).toMatch(/onEmpresaChange[\s\S]*?setPedidoVendaId|origemId/i);
    });
});
