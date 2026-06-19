import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('financeiro gerencial B42', () => {
    it('alinha baixa e estorno às rotas oficiais do backend', () => {
        const api = read('features/financeiro/api/financeiroApi.ts');
        const dialogs = read('features/financeiro/components/FinanceiroActionDialogs.tsx');

        expect(api).toContain('/api/financeiro/contas-receber/${id}/baixar');
        expect(api).toContain('/api/financeiro/contas-pagar/${id}/baixar');
        expect(api).toContain('/api/financeiro/contas-receber/${id}/estornar');
        expect(api).toContain('/api/financeiro/contas-pagar/${id}/estornar');
        expect(api).not.toContain('/api/financeiro/contas-receber/${id}/receber');
        expect(api).not.toContain('/api/financeiro/contas-pagar/${id}/pagar');
        expect(api).not.toContain('/estornar-recebimento');
        expect(api).not.toContain('/estornar-pagamento');
        expect(dialogs).toContain('dataBaixa');
        expect(dialogs).toContain('baixaId');
        expect(dialogs).not.toContain('formaPagamentoId');
        expect(dialogs).not.toContain('gerarMovimentoCaixa');
    });

    it('expõe fluxo de caixa como página real protegida por FINANCEIRO_CONSULTAR', () => {
        const page = read('app/(main)/financeiro/fluxo-caixa/page.tsx');
        const component = read('features/financeiro/components/FluxoCaixaPage.tsx');
        const menu = read('layout/AppMenu.tsx');
        const routePermissions = read('lib/security/routePermissions.ts');
        const api = read('features/financeiro/api/financeiroApi.ts');

        expect(page).toContain('FluxoCaixaPage');
        expect(page).not.toContain('ModulePlaceholderPage');
        expect(component).toContain('FINANCEIRO_CONSULTAR');
        expect(component).toContain('entradasPrevistas');
        expect(component).toContain('saldoRealizado');
        expect(menu).toContain('/financeiro/fluxo-caixa');
        expect(routePermissions).toContain('^\\/financeiro\\/fluxo-caixa');
        expect(api).toContain('/api/financeiro/fluxo-caixa');
    });

    it('classifica divergências financeiras B42 como implementadas', () => {
        const allowlist = read('scripts/backend-contract-map.allowlist.json');
        const contractDoc = read('docs/CONTRATO_FRONTEND_BACKEND_B38.md');

        expect(allowlist).toContain('FINANCEIRO_BAIXAR_VS_RECEBER_PAGAR');
        expect(allowlist).toContain('FINANCEIRO_ESTORNO_DIVERGENTE');
        expect(allowlist).toContain('IMPLEMENTADO_B42');
        expect(contractDoc).toContain('IMPLEMENTADO_B42');
        expect(contractDoc).toContain('/baixar');
        expect(contractDoc).toContain('/estornar');
    });
});
