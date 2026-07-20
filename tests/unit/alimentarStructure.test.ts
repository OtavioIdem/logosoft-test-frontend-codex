import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Alimentar (Onda 2) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Alimentar', () => {
        const api = read('features/alimentar/api/alimentarApi.ts');
        expect(api).toContain("const LOTES = '/api/alimentar/lotes'");
        expect(api).toContain("const RECALLS = '/api/alimentar/recalls'");
        expect(api).toContain('${LOTES}/a-vencer');
        expect(api).toContain('${LOTES}/${id}/bloquear');
        expect(api).toContain('${LOTES}/${id}/desbloquear');
        expect(api).toContain('${LOTES}/${loteId}/movimentacoes');
        expect(api).toContain('${LOTES}/movimentacoes');
        expect(api).toContain('${RECALLS}/${id}/lotes');
        expect(api).toContain('${RECALLS}/${id}/encerrar');
        expect(api).toContain('${RECALLS}/${id}/cancelar');
    });

    it('registra as 3 permissões de Alimentar no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'ALIMENTAR_CONSULTAR'");
        expect(erp).toContain("'ALIMENTAR_LOTES_GERENCIAR'");
        expect(erp).toContain("'ALIMENTAR_RECALL_GERENCIAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/alimentar');
        expect(rotas).toContain('ALIMENTAR_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/alimentar/lotes'");
        expect(menu).toContain("to: '/alimentar/recalls'");
        const pageLotes = read('app/(main)/alimentar/lotes/page.tsx');
        expect(pageLotes).toContain('LotesPage');
        expect(pageLotes).not.toContain('ModulePlaceholderPage');
        const pageRecalls = read('app/(main)/alimentar/recalls/page.tsx');
        expect(pageRecalls).toContain('RecallsPage');
    });

    it('lotes/recalls gateiam por permissão e recall integra com estoque avançado', () => {
        const lotes = read('features/alimentar/components/LotesPage.tsx');
        expect(lotes).toContain("hasPermission('ALIMENTAR_CONSULTAR')");
        expect(lotes).toContain('permission="ALIMENTAR_LOTES_GERENCIAR"');
        const recalls = read('features/alimentar/components/RecallsPage.tsx');
        expect(recalls).toContain('permission="ALIMENTAR_RECALL_GERENCIAR"');
        expect(recalls).toContain('Estoque avançado');
    });
});
