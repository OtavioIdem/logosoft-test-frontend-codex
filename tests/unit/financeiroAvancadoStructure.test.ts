import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Financeiro avançado — estrutura e scaffold', () => {
    it('client usa os endpoints /api/financeiro/avancado/* (não o núcleo)', () => {
        const api = read('features/financeiro-avancado/api/financeiroAvancadoApi.ts');
        expect(api).toContain('/api/financeiro/avancado/contas-');
        expect(api).toContain('/api/financeiro/avancado/contas/${id}');
        expect(api).toContain("'/api/financeiro/avancado/fluxo-caixa'");
        expect(api).toContain('${base(tipo)}/${id}/baixar');
        expect(api).toContain('${base(tipo)}/${id}/estornar');
    });

    it('registra a permissão de fluxo de caixa e a rota (antes da genérica /financeiro)', () => {
        expect(read('types/erp.ts')).toContain("'FINANCEIRO_FLUXO_CAIXA_CONSULTAR'");
        const rotas = read('lib/security/routePermissions.ts');
        const idxAvancado = rotas.indexOf('/financeiro\\/avancado');
        const idxGen = rotas.indexOf("pattern: /^\\/financeiro(?:");
        expect(idxAvancado).toBeGreaterThan(-1);
        expect(idxAvancado).toBeLessThan(idxGen);
        expect(read('layout/AppMenu.tsx')).toContain("to: '/financeiro/avancado'");
        expect(read('app/(main)/financeiro/avancado/page.tsx')).toContain('FinanceiroAvancadoPage');
    });

    it('página tem abas receber/pagar/fluxo com permissões de baixa corretas', () => {
        const page = read('features/financeiro-avancado/components/FinanceiroAvancadoPage.tsx');
        expect(page).toContain('tipo="receber"');
        expect(page).toContain('baixarPermission="FINANCEIRO_RECEBER"');
        expect(page).toContain('tipo="pagar"');
        expect(page).toContain('baixarPermission="FINANCEIRO_PAGAR"');
        expect(page).toContain('FluxoCaixaTab');
    });

    it('baixa/estorno informam contabilização automática do backend', () => {
        const tab = read('features/financeiro-avancado/components/ContasAvancadoTab.tsx');
        expect(tab).toContain('Contabilização disparada automaticamente');
        expect(tab).toContain('Estorno contábil automático');
        expect(tab).toContain("permission=\"FINANCEIRO_ESTORNAR\"");
    });
});
