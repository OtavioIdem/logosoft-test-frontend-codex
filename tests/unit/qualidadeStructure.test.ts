import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Qualidade (Onda 3) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Qualidade', () => {
        const api = read('features/qualidade/api/qualidadeApi.ts');
        expect(api).toContain("const INSPECOES = '/api/qualidade/inspecoes'");
        expect(api).toContain("const NAO_CONFORMIDADES = '/api/qualidade/nao-conformidades'");
        expect(api).toContain('${INSPECOES}/${id}/criterios');
        expect(api).toContain('${INSPECOES}/${id}/resultados');
        expect(api).toContain('${INSPECOES}/${id}/aprovar');
        expect(api).toContain('${INSPECOES}/${id}/reprovar');
        expect(api).toContain('${INSPECOES}/${id}/encerrar');
        expect(api).toContain('${NAO_CONFORMIDADES}/${id}/acoes');
        expect(api).toContain('${NAO_CONFORMIDADES}/${id}/acoes/${acaoId}/iniciar');
        expect(api).toContain('${NAO_CONFORMIDADES}/${id}/encerrar');
    });

    it('registra as 3 permissões de Qualidade no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'QUALIDADE_CONSULTAR'");
        expect(erp).toContain("'QUALIDADE_INSPECIONAR'");
        expect(erp).toContain("'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/qualidade');
        expect(rotas).toContain('QUALIDADE_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/qualidade/inspecoes'");
        expect(menu).toContain("to: '/qualidade/nao-conformidades'");
        const page = read('app/(main)/qualidade/inspecoes/page.tsx');
        expect(page).toContain('InspecoesPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('páginas gateiam ações por permissão e sinalizam bloqueio de estoque', () => {
        const inspecoes = read('features/qualidade/components/InspecoesPage.tsx');
        expect(inspecoes).toContain("hasPermission('QUALIDADE_CONSULTAR')");
        expect(inspecoes).toContain('permission="QUALIDADE_INSPECIONAR"');
        const naoConf = read('features/qualidade/components/NaoConformidadesPage.tsx');
        expect(naoConf).toContain('permission="QUALIDADE_NAO_CONFORMIDADE_GERENCIAR"');
        expect(naoConf).toContain('Estoque avançado');
    });

    it('integra controlaQualidade no cadastro de Produtos (a48.1)', () => {
        const tipos = read('features/produtos/types/produtos.types.ts');
        expect(tipos).toContain('controlaQualidade: boolean');
        const schema = read('features/produtos/schemas/produtosSchemas.ts');
        expect(schema).toContain('controlaQualidade');
        const form = read('features/produtos/components/ProdutoFormDialog.tsx');
        expect(form).toContain('controlaQualidade');
    });
});
