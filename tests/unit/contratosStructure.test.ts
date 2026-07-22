import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Contratos (Onda 3) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Contratos', () => {
        const api = read('features/contratos/api/contratosApi.ts');
        expect(api).toContain("const BASE = '/api/contratos'");
        expect(api).toContain('${BASE}/${id}/aprovar');
        expect(api).toContain('${BASE}/${id}/reajustar');
        expect(api).toContain('${BASE}/${id}/renovar');
        expect(api).toContain('${BASE}/${id}/encerrar');
        expect(api).toContain('${BASE}/${id}/cancelar');
        expect(api).toContain('${BASE}/${id}/faturamentos');
    });

    it('registra as 3 permissões de Contratos no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'CONTRATOS_CONSULTAR'");
        expect(erp).toContain("'CONTRATOS_GERENCIAR'");
        expect(erp).toContain("'CONTRATOS_FATURAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/contratos');
        expect(rotas).toContain('CONTRATOS_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/contratos'");
        const page = read('app/(main)/contratos/page.tsx');
        expect(page).toContain('ContratosPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('gateia por permissão e separa faturamento (CONTRATOS_FATURAR)', () => {
        const contratos = read('features/contratos/components/ContratosPage.tsx');
        expect(contratos).toContain("hasPermission('CONTRATOS_CONSULTAR')");
        expect(contratos).toContain('permission="CONTRATOS_GERENCIAR"');
        expect(contratos).toContain('permission="CONTRATOS_FATURAR"');
    });
});
