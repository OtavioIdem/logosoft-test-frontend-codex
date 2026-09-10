import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('tabelas de preço B40', () => {
    it('expõe página real no menu e no guard de rotas', () => {
        const page = read('app/(main)/tabelas-preco/page.tsx');
        const menu = read('layout/AppMenu.tsx');
        const routePermissions = read('lib/security/routePermissions.ts');

        expect(page).toContain('TabelasPrecoPage');
        expect(page).not.toContain('ModulePlaceholderPage');
        expect(menu).toContain('/tabelas-preco');
        expect(menu).toContain('TABELAS_PRECO_CONSULTAR');
        expect(routePermissions).toContain('^\\/tabelas-preco');
        expect(routePermissions).toContain('TABELAS_PRECO_GERENCIAR');
    });

    it('protege mutações por permissão e não usa severity inválido no Tag', () => {
        const component = read('features/tabelas-preco/components/TabelasPrecoPage.tsx');

        expect(component).not.toContain("severity={tabela.padrao ? 'info' : 'secondary'}");
        expect(component).not.toContain('canManageTabelaPreco');
        expect(component).toContain("permission: 'TABELAS_PRECO_GERENCIAR'");
        expect(component).toContain("permission: 'TABELAS_PRECO_ATIVAR'");
        expect(component).toContain("permission: 'TABELAS_PRECO_INATIVAR'");
        expect(component).toContain("permission: 'TABELAS_PRECO_ITENS_GERENCIAR'");
        expect(component).not.toContain('VENDAS_GERENCIAR');
    });

    it('cobre endpoints principais de tabelas, itens e preço vigente', () => {
        const api = read('features/tabelas-preco/api/tabelasPrecoApi.ts');

        expect(api).toContain('/api/tabelas-preco');
        expect(api).toContain('/api/tabelas-preco/${id}/ativar');
        expect(api).toContain('/api/tabelas-preco/${id}/inativar');
        expect(api).toContain('/api/tabelas-preco/${id}/itens');
        expect(api).toContain('/api/tabelas-preco/${id}/itens/${itemId}');
        expect(api).toContain('/api/tabelas-preco/${id}/itens/${itemId}/inativar');
        expect(api).toContain('/api/tabelas-preco/produtos/${query.produtoId}/preco-vigente');
    });

    it('guard de entrada exige permissão de consulta de tabelas sem aceitar permissão de vendas', () => {
        const component = read('features/tabelas-preco/components/TabelasPrecoPage.tsx');
        const routes = read('lib/security/routePermissions.ts');

        expect(component).toContain("hasPermission('TABELAS_PRECO_CONSULTAR')");
        expect(component).toContain('TABELAS_PRECO_CONSULTAR');
        expect(component).not.toContain('VENDAS_');
        expect(routes).toContain('TABELAS_PRECO_CONSULTAR');
        expect(routes).toContain('TABELAS_PRECO_GERENCIAR');
    });

    it('mantém o mapa de contrato em auditoria sem supressões históricas', () => {
        const allowlist = JSON.parse(read('scripts/backend-contract-map.allowlist.json')) as { status: string; suppressions: unknown[] };
        expect(allowlist.status).toBe('audit-only-no-suppressions');
        expect(allowlist.suppressions).toEqual([]);
    });
});
