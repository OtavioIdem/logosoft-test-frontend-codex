import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Produção (Onda 3) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Produção', () => {
        const api = read('features/producao/api/producaoApi.ts');
        expect(api).toContain("const FICHAS = '/api/producao/fichas-tecnicas'");
        expect(api).toContain("const ORDENS = '/api/producao/ordens'");
        expect(api).toContain('${FICHAS}/${id}/componentes');
        expect(api).toContain('${FICHAS}/${id}/ativar');
        expect(api).toContain('${FICHAS}/${id}/inativar');
        expect(api).toContain('${ORDENS}/${id}/necessidade');
        expect(api).toContain('${ORDENS}/${id}/liberar');
        expect(api).toContain('${ORDENS}/${id}/apontamentos');
        expect(api).toContain('${ORDENS}/${id}/encerrar');
        expect(api).toContain('${ORDENS}/${id}/cancelar');
    });

    it('registra as 7 permissões de Produção no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'PRODUCAO_CONSULTAR'");
        expect(erp).toContain("'PRODUCAO_FICHA_TECNICA_GERENCIAR'");
        expect(erp).toContain("'PRODUCAO_ORDENS_GERENCIAR'");
        expect(erp).toContain("'PRODUCAO_ORDENS_LIBERAR'");
        expect(erp).toContain("'PRODUCAO_ORDENS_APONTAR'");
        expect(erp).toContain("'PRODUCAO_ORDENS_ENCERRAR'");
        expect(erp).toContain("'PRODUCAO_ORDENS_CANCELAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/producao');
        expect(rotas).toContain('PRODUCAO_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/producao/fichas-tecnicas'");
        expect(menu).toContain("to: '/producao/ordens'");
        const page = read('app/(main)/producao/ordens/page.tsx');
        expect(page).toContain('OrdensProducaoPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('OP gateia ações por permissão granular (liberar/apontar/encerrar/cancelar)', () => {
        const ordens = read('features/producao/components/OrdensProducaoPage.tsx');
        expect(ordens).toContain("hasPermission('PRODUCAO_CONSULTAR')");
        expect(ordens).toContain('permission="PRODUCAO_ORDENS_LIBERAR"');
        expect(ordens).toContain('permission="PRODUCAO_ORDENS_APONTAR"');
        expect(ordens).toContain('permission="PRODUCAO_ORDENS_ENCERRAR"');
        expect(ordens).toContain('permission="PRODUCAO_ORDENS_CANCELAR"');
    });
});
