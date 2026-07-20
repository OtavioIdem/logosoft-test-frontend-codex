import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Patrimônio (Onda 4) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Patrimônio', () => {
        const api = read('features/patrimonio/api/patrimonioApi.ts');
        expect(api).toContain("const BENS = '/api/patrimonio/bens'");
        expect(api).toContain("const DEPRECIACAO = '/api/patrimonio/depreciacao'");
        expect(api).toContain("const INVENTARIOS = '/api/patrimonio/inventarios'");
        expect(api).toContain('${BENS}/${id}/transferir');
        expect(api).toContain('${BENS}/${id}/bloquear');
        expect(api).toContain('${BENS}/${id}/baixar');
        expect(api).toContain('${DEPRECIACAO}/processar');
        expect(api).toContain('${INVENTARIOS}/${id}/contagem');
        expect(api).toContain('${INVENTARIOS}/${id}/encerrar');
    });

    it('registra as 6 permissões de Patrimônio no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'PATRIMONIO_CONSULTAR'");
        expect(erp).toContain("'PATRIMONIO_BENS_GERENCIAR'");
        expect(erp).toContain("'PATRIMONIO_TRANSFERIR'");
        expect(erp).toContain("'PATRIMONIO_BAIXAR'");
        expect(erp).toContain("'PATRIMONIO_DEPRECIAR'");
        expect(erp).toContain("'PATRIMONIO_INVENTARIO_GERENCIAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/patrimonio');
        expect(rotas).toContain('PATRIMONIO_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/patrimonio/bens'");
        expect(menu).toContain("to: '/patrimonio/depreciacao'");
        expect(menu).toContain("to: '/patrimonio/inventarios'");
        const page = read('app/(main)/patrimonio/bens/page.tsx');
        expect(page).toContain('BensPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('bens gateiam ações por permissão granular (transferir/baixar/depreciar)', () => {
        const bens = read('features/patrimonio/components/BensPage.tsx');
        expect(bens).toContain("hasPermission('PATRIMONIO_CONSULTAR')");
        expect(bens).toContain("permission: 'PATRIMONIO_TRANSFERIR'");
        expect(bens).toContain("permission: 'PATRIMONIO_BAIXAR'");
        const depreciacao = read('features/patrimonio/components/DepreciacaoPage.tsx');
        expect(depreciacao).toContain('permission="PATRIMONIO_DEPRECIAR"');
    });
});
