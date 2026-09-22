import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('estoque avançado B41', () => {
    it('expõe transferência no menu, e mantém bloqueio só na rota e no guard', () => {
        const transferenciaPage = read('app/(main)/estoque/transferencias/page.tsx');
        const bloqueiosPage = read('app/(main)/estoque/bloqueios/page.tsx');
        const menu = read('layout/AppMenu.tsx');
        const routePermissions = read('lib/security/routePermissions.ts');

        expect(transferenciaPage).toContain('TransferenciaEstoquePage');
        expect(transferenciaPage).not.toContain('ModulePlaceholderPage');
        expect(bloqueiosPage).toContain("redirect('/estoque/avancado')");
        expect(bloqueiosPage).not.toContain('BloqueiosEstoquePage');
        expect(menu).toContain('/estoque/transferencias');
        // A b62 (6d42c62) tirou "Bloqueios" do menu porque a página só redireciona para
        // /estoque/avancado — item que levava a lugar nenhum. A rota e o guard continuam existindo
        // de propósito (quem tem o link direto continua protegido), então as duas asserções abaixo
        // seguem valendo; só a oferta no menu saiu. Esta prova ficou desatualizada na b62 e derrubou
        // `test:unit` da b62 à b64.
        expect(menu).not.toContain('/estoque/bloqueios');
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
