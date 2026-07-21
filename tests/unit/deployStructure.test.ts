import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Deploy + Relatórios (Onda 5) — estrutura e scaffold', () => {
    it('client de Deploy expõe os endpoints reais', () => {
        const api = read('features/deploy/api/deployApi.ts');
        expect(api).toContain("const BASE = '/api/deploy'");
        expect(api).toContain('${BASE}/ambiente');
        expect(api).toContain('${BASE}/migracoes');
        expect(api).toContain('${BASE}/${id}/checklist');
        expect(api).toContain('${BASE}/${id}/concluir');
        expect(api).toContain('${BASE}/${id}/falhar');
        expect(api).toContain('${BASE}/${id}/reverter');
        expect(api).toContain('${BASE}/checklist');
        expect(api).toContain('${BASE}/checklist/${itemId}/resultado');
    });

    it('registra as permissões de Deploy e a de exportação de relatórios', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'DEPLOY_CONSULTAR'");
        expect(erp).toContain("'DEPLOY_GERENCIAR'");
        expect(erp).toContain("'RELATORIOS_EXPORTAR'");
    });

    it('registra rota (regra específica antes da geral de administração) e menu', () => {
        const rotas = read('lib/security/routePermissions.ts');
        const idxDeploy = rotas.indexOf('/^\\/administracao\\/deploy');
        const idxAdmin = rotas.indexOf("pattern: /^\\/administracao(?:");
        expect(idxDeploy).toBeGreaterThan(-1);
        expect(idxDeploy).toBeLessThan(idxAdmin);
        expect(rotas).toContain('DEPLOY_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/administracao/deploy'");
        const page = read('app/(main)/administracao/deploy/page.tsx');
        expect(page).toContain('DeployPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('painel de Deploy gateia ações por DEPLOY_GERENCIAR', () => {
        const deploy = read('features/deploy/components/DeployPage.tsx');
        expect(deploy).toContain("hasPermission('DEPLOY_CONSULTAR')");
        expect(deploy).toContain('permission="DEPLOY_GERENCIAR"');
    });

    it('relatórios ganham produção gerencial e exportação (blob/download)', () => {
        const api = read('features/relatorios/api/relatoriosApi.ts');
        expect(api).toContain('/api/relatorios/gerenciais/producao');
        expect(api).toContain('/api/relatorios/gerenciais/exportar');
        expect(api).toContain("responseType: 'blob'");
        const hooks = read('features/relatorios/hooks/useRelatoriosResources.ts');
        expect(hooks).toContain('useExportarRelatorio');
        expect(hooks).toContain('createObjectURL');
        const page = read('features/relatorios/components/RelatoriosPage.tsx');
        expect(page).toContain('permission="RELATORIOS_EXPORTAR"');
    });
});
