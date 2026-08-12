import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('estoque avançado B41', () => {
    it('expõe páginas reais de transferência e bloqueio no menu e nos guards de rota', () => {
        const transferenciaPage = read('app/(main)/estoque/transferencias/page.tsx');
        const bloqueiosPage = read('app/(main)/estoque/bloqueios/page.tsx');
        const menu = read('layout/AppMenu.tsx');
        const routePermissions = read('lib/security/routePermissions.ts');

        expect(transferenciaPage).toContain('TransferenciaEstoquePage');
        expect(transferenciaPage).not.toContain('ModulePlaceholderPage');
        expect(bloqueiosPage).toContain("redirect('/estoque/avancado')");
        expect(bloqueiosPage).not.toContain('BloqueiosEstoquePage');
        expect(menu).toContain('/estoque/transferencias');
        expect(menu).toContain('/estoque/bloqueios');
        expect(routePermissions).toContain('^\\/estoque\\/transferencias');
        expect(routePermissions).toContain('^\\/estoque\\/bloqueios');
        expect(routePermissions).toContain('ESTOQUE_MOVIMENTAR');
    });

    it('cobre endpoints reais de transferência, bloqueio e inventário avançado', () => {
        const api = read('features/estoque/api/estoqueApi.ts');

        expect(api).toContain('/api/estoque/transferencias');
        expect(api).not.toContain('/api/estoque/bloqueios');
        expect(api).not.toMatch(/httpClient\.get<InventarioResponse>\(`\/api\/estoque\/inventarios\/\$\{id\}`\)/);
        expect(api).not.toContain('/api/estoque/inventarios/${id}/iniciar-contagem');
        expect(api).toContain('/api/estoque/inventarios/${id}/fechar');
        expect(api).toContain('buildFecharInventarioPayload');
        expect(api).toContain('{ motivo }');
    });

    it('conecta inventário à contagem, detalhe e conclusão sem rota legada fechar', () => {
        const page = read('features/estoque/components/InventariosEstoquePage.tsx');
        const hooks = read('features/estoque/hooks/useEstoqueResources.ts');

        expect(page).not.toContain('useInventarioEstoqueDetalhe');
        expect(page).not.toContain('iniciarContagemMutation');
        expect(page).toContain('fecharMutation');
        expect(page).toContain('Detalhes');
        expect(page).not.toContain('Iniciar contagem');
        expect(page).toContain('Fechar');
        expect(hooks).not.toContain('iniciarContagemInventario');
        expect(hooks).toContain('fecharInventario');
    });

    it('mantém o contrato de estoque sem exceções auditáveis', () => {
        const allowlist = read('scripts/backend-contract-map.allowlist.json');
        const contractDoc = read('docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md');

        expect(JSON.parse(allowlist).documentedDivergences).toEqual([]);
        expect(contractDoc).toContain('POST /api/estoque/entradas | /saidas | /ajustes | /transferencias');
        expect(contractDoc).toContain('### `api/estoque/avancado`');
        expect(contractDoc).toContain('/fechar');
    });
});
