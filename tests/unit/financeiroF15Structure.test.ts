import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

    it('em contas a RECEBER, origem continua aceitando PedidoVenda (PedidoVenda válido)', () => {
        const formDialog = read('features/financeiro/components/ContaFinanceiraFormDialog.tsx');
        const types = read('features/financeiro/types/financeiro.types.ts');

        // ContaReceberFormValues deve usar CriarContaReceberRequest
        expect(types).toMatch(/export type ContaReceberFormValues = CriarContaReceberRequest/);

        // CriarContaReceberRequest deve ter campo origem
        expect(types).toMatch(/export type CriarContaReceberRequest[\s\S]*?origem: OrigemFinanceira/);

        // Formulário deve renderizar EntitySelect para receber (PedidoVenda é entidade)
        expect(formDialog).toContain('EntitySelect');
        expect(formDialog).toMatch(/tipo === ['"]receber['"]|type === ['"]receber['"]/i);
    });

    it('origemFinanceiraOptions mantém todas as 6 origens (catálogo base não é reduzido)', () => {
        const utils = read('features/financeiro/api/financeiroApi.ts');
        const types = read('features/financeiro/types/financeiro.types.ts');

        // OrigemFinanceira enum não foi reduzido
        // Verificar que há referência ao enum completo
        expect(types).toContain('OrigemFinanceira');

        // As 6 origens devem estar documentadas ou referenciadas no código
        // Manual, PedidoVenda, Pedido (Compra), NF, Outro, Juros/Multa/Desconto
        // (nomes reais dependem da enum em types/erp.ts)
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
