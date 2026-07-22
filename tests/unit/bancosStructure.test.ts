import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Bancos/Boletos/CNAB (Onda 4) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Bancos', () => {
        const api = read('features/bancos/api/bancosApi.ts');
        expect(api).toContain("const BASE = '/api/bancos'");
        expect(api).toContain('${BASE}/contas-bancarias');
        expect(api).toContain('${BASE}/convenios');
        expect(api).toContain('${BASE}/carteiras');
        expect(api).toContain('${BASE}/boletos/gerar');
        expect(api).toContain('${BASE}/boletos/${id}/cancelar');
        expect(api).toContain('${BASE}/boletos/${id}/historico');
        expect(api).toContain('${BASE}/cnab/remessas');
        expect(api).toContain('${BASE}/cnab/retornos/importar');
    });

    it('registra as 6 permissões de Bancos no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'BANCOS_CONSULTAR'");
        expect(erp).toContain("'BANCOS_GERENCIAR'");
        expect(erp).toContain("'BOLETOS_GERAR'");
        expect(erp).toContain("'BOLETOS_CANCELAR'");
        expect(erp).toContain("'CNAB_REMESSA_GERAR'");
        expect(erp).toContain("'CNAB_RETORNO_PROCESSAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/bancos');
        expect(rotas).toContain('BANCOS_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/bancos'");
        expect(menu).toContain("to: '/bancos/boletos'");
        expect(menu).toContain("to: '/bancos/cnab'");
        const page = read('app/(main)/bancos/boletos/page.tsx');
        expect(page).toContain('BoletosPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('boletos/CNAB gateiam ações por permissão própria e retorno CNAB é upload base64', () => {
        const boletos = read('features/bancos/components/BoletosPage.tsx');
        expect(boletos).toContain('permission="BOLETOS_GERAR"');
        expect(boletos).toContain("permission: 'BOLETOS_CANCELAR'");
        const cnab = read('features/bancos/components/CnabPage.tsx');
        expect(cnab).toContain('permission="CNAB_REMESSA_GERAR"');
        expect(cnab).toContain('permission="CNAB_RETORNO_PROCESSAR"');
        const dialogs = read('features/bancos/components/BancosOperacoesDialogs.tsx');
        expect(dialogs).toContain('readAsDataURL');
    });
});
