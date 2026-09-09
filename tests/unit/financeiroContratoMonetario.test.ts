import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Financeiro — Contrato Monetário v1.11.0a8b49 (F1.1 e F1.5)', () => {
    it('tipos `ContaReceberResponse` e `ContaPagarResponse` seguem o contrato do backend', () => {
        const types = read('features/financeiro/types/financeiro.types.ts');

        // Asimetria do contrato: ContaReceber tem `valorRecebido`, ContaPagar tem `valorPago`
        expect(types).toContain('valorRecebido?: number | null;');
        expect(types).toMatch(/export type ContaReceberResponse[\s\S]*?valorRecebido/);
        expect(types).toMatch(/export type ContaPagarResponse[\s\S]*?valorPago\?: number \| null;/);

        // Ambas têm `valorSaldo` (o campo crítico do defeito de R$ 0,00)
        expect(types).toMatch(/export type ContaReceberResponse[\s\S]*?valorSaldo/);
        expect(types).toMatch(/export type ContaPagarResponse[\s\S]*?valorSaldo/);
    });

    it('parcelas portam os campos monetários certos: valorOriginal, valorPago, valorSaldo', () => {
        const types = read('features/financeiro/types/financeiro.types.ts');

        // ParcelaReceberResponse
        expect(types).toMatch(/export type ParcelaReceberResponse[\s\S]*?valorOriginal: number;/);
        expect(types).toMatch(/export type ParcelaReceberResponse[\s\S]*?valorPago: number;/);
        expect(types).toMatch(/export type ParcelaReceberResponse[\s\S]*?valorSaldo: number;/);

        // ParcelaPagarResponse
        expect(types).toMatch(/export type ParcelaPagarResponse[\s\S]*?valorOriginal: number;/);
        expect(types).toMatch(/export type ParcelaPagarResponse[\s\S]*?valorPago: number;/);
        expect(types).toMatch(/export type ParcelaPagarResponse[\s\S]*?valorSaldo: number;/);
    });

    it('Recebimento e Pagamento portam referências corretas: parcelaReceberId, parcelaPagarId', () => {
        const types = read('features/financeiro/types/financeiro.types.ts');

        // RecebimentoResponse refere-se a parcelaReceberId
        expect(types).toMatch(/export type RecebimentoResponse[\s\S]*?parcelaReceberId: Guid;/);

        // PagamentoResponse refere-se a parcelaPagarId
        expect(types).toMatch(/export type PagamentoResponse[\s\S]*?parcelaPagarId: Guid;/);
    });

    it('requests mantêm `parcelaId` (não mudaram): ReceberContaRequest, PagarContaRequest', () => {
        const types = read('features/financeiro/types/financeiro.types.ts');

        // Request não renomeia: ambos usam parcelaId (genérico)
        expect(types).toMatch(/export type ReceberContaRequest[\s\S]*?parcelaId: Guid;/);
        expect(types).toMatch(/export type PagarContaRequest[\s\S]*?parcelaId: Guid;/);

        // Mas os valores no request: valorRecebido e valorPago (não "valor" genérico)
        expect(types).toMatch(/export type ReceberContaRequest[\s\S]*?valorRecebido: number;/);
        expect(types).toMatch(/export type PagarContaRequest[\s\S]*?valorPago: number;/);
    });

    it('não existem campos obsoletos que causavam R$ 0,00: statusConta eliminado, dashboard usa valorSaldo', () => {
        const types = read('features/financeiro/types/financeiro.types.ts');
        const dashboard = read('features/dashboard/api/dashboardApi.ts');

        // statusConta não deve existir em tipos financeiros (só status)
        expect(types).not.toContain('statusConta');

        // Dashboard lê contasReceber/contasPagar com campo valorSaldo (o correto)
        expect(dashboard).toContain('valorSaldo');

        // Dashboard filtra e soma por valorSaldo, não por um campo ausente
        expect(dashboard).toMatch(/\.map\(\(conta\) => conta\.valorSaldo\)/);
    });

    it('formatMoney no diálogo de baixa lê `valorSaldo` de parcela, não campo ausente', () => {
        const dialog = read('features/financeiro/components/FinanceiroActionDialogs.tsx');

        // Linha 74: setValor usa parcela.valorSaldo (não `.saldo` nem `.valor`)
        expect(dialog).toMatch(/setValor\(parcela \? Number\(parcela\.valorSaldo\) : null\);/);

        // Linha 93: dropdown de parcelas exibe formatMoney(parcela.valorSaldo)
        expect(dialog).toContain('formatMoney(parcela.valorSaldo)');

        // Linha 100: helper text também usa valorSaldo
        expect(dialog).toMatch(/Saldo da parcela: \{formatMoney\(parcelas\.find.*?valorSaldo\)\}/);
    });

    it('resumo de conta em dashboard lê `valorSaldo` correto (F1.1)', () => {
        const dashboard = read('features/dashboard/api/dashboardApi.ts');

        // A contagem de abertos deve usar valorSaldo (não valorTotal ou campo ausente)
        expect(dashboard).toContain('valorSaldo');
        // Verifica que filtra e soma por valorSaldo, não por um campo inexistente
        expect(dashboard).toMatch(/ContaFinanceiraResumo[\s\S]*?valorSaldo/);
    });

    it('status é único em resposta: não existe par (status?, statusConta?)', () => {
        const types = read('features/financeiro/types/financeiro.types.ts');

        // Resposta tem apenas status (não status + statusConta)
        expect(types).toMatch(/export type ContaReceberResponse[\s\S]*?status\?: StatusContaFinanceira \| number;[\s\S]*?parcelas\?:/);
        expect(types).toMatch(/export type ContaPagarResponse[\s\S]*?status\?: StatusContaFinanceira \| number;[\s\S]*?parcelas\?:/);
    });

    it('fixture E2E serve dados no formato correto do contrato (R$ 251,00 receber, R$ 800,00 pagar)', () => {
        const fixture = read('tests/e2e/fixtures/logosoft.ts');

        // Receber: R$ 251,00 de saldo (não pode ser 0)
        expect(fixture).toContain("valorSaldo: 251,");
        expect(fixture).toMatch(/contasReceber[\s\S]*?valorSaldo: 251/);

        // Pagar: R$ 800,00 de saldo
        expect(fixture).toContain("valorSaldo: 800,");
        expect(fixture).toMatch(/contasPagar[\s\S]*?valorSaldo: 800/);

        // Parcelas também portam valorSaldo (não 0)
        expect(fixture).toMatch(/parcelas:[\s\S]*?\{\s*id:[\s\S]*?valorSaldo: 251/);
        expect(fixture).toMatch(/parcelas:[\s\S]*?\{\s*id:[\s\S]*?valorSaldo: 800/);
    });

    it('Contagem de financeiros abertos lê valorSaldo corretamente (F1.1)', () => {
        const utils = read('features/financeiro/components/financeiroUiUtils.ts');

        // A função countOpenFinancialRecords filtra e conta por valorSaldo (não por campo ausente)
        expect(utils).toMatch(/countOpenFinancialRecords[\s\S]*?valorSaldo/);
    });
});
