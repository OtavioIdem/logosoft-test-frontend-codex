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
        expect(bloqueiosPage).toContain('BloqueiosEstoquePage');
        expect(bloqueiosPage).not.toContain('ModulePlaceholderPage');
        expect(menu).toContain('/estoque/transferencias');
        expect(menu).toContain('/estoque/bloqueios');
        expect(routePermissions).toContain('^\\/estoque\\/transferencias');
        expect(routePermissions).toContain('^\\/estoque\\/bloqueios');
        expect(routePermissions).toContain('ESTOQUE_MOVIMENTAR');
    });

    it('cobre endpoints reais de transferência, bloqueio e inventário avançado', () => {
        const api = read('features/estoque/api/estoqueApi.ts');

        expect(api).toContain('/api/estoque/transferencias');
        expect(api).toContain('/api/estoque/bloqueios');
        expect(api).toContain('/api/estoque/bloqueios/${id}/liberar');
        expect(api).toContain('/api/estoque/bloqueios/${id}/cancelar');
        expect(api).toContain('/api/estoque/inventarios/${id}');
        expect(api).toContain('/api/estoque/inventarios/${id}/iniciar-contagem');
        expect(api).toContain('/api/estoque/inventarios/${id}/concluir');
        expect(api).not.toContain('/api/estoque/inventarios/${id}/fechar');
        expect(api).toContain('buildConcluirInventarioPayload');
        expect(api).toContain('motivoAjuste');
    });

    it('conecta inventário à contagem, detalhe e conclusão sem rota legada fechar', () => {
        const page = read('features/estoque/components/InventariosEstoquePage.tsx');
        const hooks = read('features/estoque/hooks/useEstoqueResources.ts');

        expect(page).toContain('useInventarioEstoqueDetalhe');
        expect(page).toContain('iniciarContagemMutation');
        expect(page).toContain('concluirMutation');
        expect(page).toContain('Detalhes');
        expect(page).toContain('Iniciar contagem');
        expect(page).toContain('Concluir');
        expect(hooks).toContain('iniciarContagemInventario');
        expect(hooks).toContain('concluirInventario');
        expect(hooks).not.toContain('fecharInventario');
    });

    it('classifica divergências de estoque avançado como implementadas na allowlist e documentação', () => {
        const allowlist = read('scripts/backend-contract-map.allowlist.json');
        const contractDoc = read('docs/CONTRATO_FRONTEND_BACKEND_B38.md');

        expect(allowlist).toContain('ESTOQUE_INVENTARIO_FECHAR_VS_CONCLUIR');
        expect(allowlist).toContain('ESTOQUE_TRANSFERENCIAS_AUSENTE_FRONTEND');
        expect(allowlist).toContain('ESTOQUE_BLOQUEIOS_AUSENTE_FRONTEND');
        expect(allowlist).toContain('IMPLEMENTADO_B41');
        expect(contractDoc).toContain('IMPLEMENTADO_B41');
        expect(contractDoc).toContain('/estoque/transferencias');
        expect(contractDoc).toContain('/estoque/bloqueios');
        expect(contractDoc).toContain('/concluir');
    });
});
