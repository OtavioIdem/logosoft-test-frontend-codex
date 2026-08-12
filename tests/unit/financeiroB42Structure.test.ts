import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('financeiro gerencial B42', () => {
    it('alinha baixa e estorno às rotas oficiais do backend', () => {
        const api = read('features/financeiro/api/financeiroApi.ts');
        const dialogs = read('features/financeiro/components/FinanceiroActionDialogs.tsx');

        expect(api).toContain('/api/financeiro/contas-receber/${id}/receber');
        expect(api).toContain('/api/financeiro/contas-pagar/${id}/pagar');
        expect(api).toContain('/api/financeiro/contas-receber/${id}/estornar-recebimento');
        expect(api).toContain('/api/financeiro/contas-pagar/${id}/estornar-pagamento');
        expect(dialogs).toContain('dataRecebimento');
        expect(dialogs).toContain('parcelaId');
        expect(dialogs).toContain('formaPagamentoId');
        expect(dialogs).toContain('gerarMovimentoCaixa');
    });

    it('expõe fluxo de caixa como página real protegida por FINANCEIRO_CONSULTAR', () => {
        const page = read('app/(main)/financeiro/fluxo-caixa/page.tsx');
        const component = read('features/financeiro/components/FluxoCaixaPage.tsx');
        const menu = read('layout/AppMenu.tsx');
        const routePermissions = read('lib/security/routePermissions.ts');
        const api = read('features/financeiro/api/financeiroApi.ts');

        expect(page).toContain("redirect('/financeiro/avancado')");
        expect(component).toContain('Financeiro avançado');
        expect(menu).toContain('/financeiro/fluxo-caixa');
        expect(routePermissions).toContain('^\\/financeiro\\/fluxo-caixa');
        expect(api).not.toContain('/api/financeiro/fluxo-caixa');
    });

    it('mantém o contrato financeiro sem exceções auditáveis', () => {
        const allowlist = read('scripts/backend-contract-map.allowlist.json');
        const contractDoc = read('docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md');

        expect(JSON.parse(allowlist).documentedDivergences).toEqual([]);
        expect(contractDoc).toContain('/receber');
        expect(contractDoc).toContain('/estornar-recebimento');
    });
});
