import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('CRM (Onda 3) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de CRM', () => {
        const api = read('features/crm/api/crmApi.ts');
        expect(api).toContain("const LEADS = '/api/crm/leads'");
        expect(api).toContain("const OPORTUNIDADES = '/api/crm/oportunidades'");
        expect(api).toContain("const PROPOSTAS = '/api/crm/propostas'");
        expect(api).toContain('${LEADS}/${id}/qualificar');
        expect(api).toContain('${LEADS}/${id}/descartar');
        expect(api).toContain('${OPORTUNIDADES}/${id}/estagio');
        expect(api).toContain('${OPORTUNIDADES}/${id}/ganhar');
        expect(api).toContain('${OPORTUNIDADES}/${id}/perder');
        expect(api).toContain('${OPORTUNIDADES}/${id}/converter');
        expect(api).toContain('${PROPOSTAS}/${id}/aceitar');
        expect(api).toContain('${PROPOSTAS}/${id}/recusar');
    });

    it('registra as 5 permissões de CRM no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'CRM_CONSULTAR'");
        expect(erp).toContain("'CRM_LEADS_GERENCIAR'");
        expect(erp).toContain("'CRM_OPORTUNIDADES_GERENCIAR'");
        expect(erp).toContain("'CRM_CONVERTER'");
        expect(erp).toContain("'CRM_PROPOSTAS_GERENCIAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/crm');
        expect(rotas).toContain('CRM_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/crm/leads'");
        expect(menu).toContain("to: '/crm/oportunidades'");
        expect(menu).toContain("to: '/crm/propostas'");
        const page = read('app/(main)/crm/oportunidades/page.tsx');
        expect(page).toContain('OportunidadesPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('gateia ações por permissão granular (leads/oportunidades/converter/propostas)', () => {
        const leads = read('features/crm/components/LeadsPage.tsx');
        expect(leads).toContain("hasPermission('CRM_CONSULTAR')");
        expect(leads).toContain("permission: 'CRM_LEADS_GERENCIAR'");
        const oportunidades = read('features/crm/components/OportunidadesPage.tsx');
        expect(oportunidades).toContain('permission="CRM_OPORTUNIDADES_GERENCIAR"');
        expect(oportunidades).toContain('permission="CRM_CONVERTER"');
        const propostas = read('features/crm/components/PropostasPage.tsx');
        expect(propostas).toContain("permission: 'CRM_PROPOSTAS_GERENCIAR'");
    });
});
