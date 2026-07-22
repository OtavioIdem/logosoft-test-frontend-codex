import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Portaria (Onda 2) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Portaria', () => {
        const api = read('features/portaria/api/portariaApi.ts');
        expect(api).toContain("const PRE_AUTORIZACOES = '/api/portaria/pre-autorizacoes'");
        expect(api).toContain("const REGISTROS = '/api/portaria/registros'");
        expect(api).toContain("const OCORRENCIAS = '/api/portaria/ocorrencias'");
        expect(api).toContain('${PRE_AUTORIZACOES}/${id}/cancelar');
        expect(api).toContain('${REGISTROS}/entrada');
        expect(api).toContain('${REGISTROS}/${id}/validar-documento');
        expect(api).toContain('${REGISTROS}/${id}/saida');
        expect(api).toContain('${REGISTROS}/${id}/cancelar');
        expect(api).toContain('${OCORRENCIAS}/${id}/resolver');
    });

    it('registra as 3 permissões de Portaria no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'PORTARIA_CONSULTAR'");
        expect(erp).toContain("'PORTARIA_PRE_AUTORIZAR'");
        expect(erp).toContain("'PORTARIA_OPERAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/portaria');
        expect(rotas).toContain('PORTARIA_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/portaria'");
        const page = read('app/(main)/portaria/page.tsx');
        expect(page).toContain('PortariaPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('abas gateiam ações por permissão de operação/pré-autorização', () => {
        const preAut = read('features/portaria/components/PreAutorizacoesTab.tsx');
        expect(preAut).toContain('permission="PORTARIA_PRE_AUTORIZAR"');
        const registros = read('features/portaria/components/RegistrosAcessoTab.tsx');
        expect(registros).toContain("permission: 'PORTARIA_OPERAR'");
        const page = read('features/portaria/components/PortariaPage.tsx');
        expect(page).toContain("hasAnyPermission(['PORTARIA_CONSULTAR', 'PORTARIA_PRE_AUTORIZAR', 'PORTARIA_OPERAR'])");
    });
});
