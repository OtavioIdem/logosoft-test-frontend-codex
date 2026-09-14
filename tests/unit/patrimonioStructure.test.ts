import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Patrimônio (Onda 4) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Patrimônio', () => {
        const api = read('features/patrimonio/api/patrimonioApi.ts');
        expect(api).toContain("const BENS = '/api/patrimonio/bens'");
        expect(api).toContain("const DEPRECIACAO = '/api/patrimonio/depreciacao'");
        expect(api).toContain("const INVENTARIOS = '/api/patrimonio/inventarios'");
        expect(api).toContain('${BENS}/${id}/transferir');
        expect(api).toContain('${BENS}/${id}/bloquear');
        expect(api).toContain('${BENS}/${id}/baixar');
        expect(api).toContain('${DEPRECIACAO}/processar');
        expect(api).toContain('${INVENTARIOS}/${id}/contagem');
        expect(api).toContain('${INVENTARIOS}/${id}/encerrar');
    });

    it('registra as 6 permissões de Patrimônio no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'PATRIMONIO_CONSULTAR'");
        expect(erp).toContain("'PATRIMONIO_BENS_GERENCIAR'");
        expect(erp).toContain("'PATRIMONIO_TRANSFERIR'");
        expect(erp).toContain("'PATRIMONIO_BAIXAR'");
        expect(erp).toContain("'PATRIMONIO_DEPRECIAR'");
        expect(erp).toContain("'PATRIMONIO_INVENTARIO_GERENCIAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/patrimonio');
        expect(rotas).toContain('PATRIMONIO_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/patrimonio/bens'");
        expect(menu).toContain("to: '/patrimonio/depreciacao'");
        expect(menu).toContain("to: '/patrimonio/inventarios'");
        const page = read('app/(main)/patrimonio/bens/page.tsx');
        expect(page).toContain('BensPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('bens gateiam ações por permissão granular (transferir/baixar/depreciar)', () => {
        const bens = read('features/patrimonio/components/BensPage.tsx');
        expect(bens).toContain("hasPermission('PATRIMONIO_CONSULTAR')");
        expect(bens).toContain("permission: 'PATRIMONIO_TRANSFERIR'");
        expect(bens).toContain("permission: 'PATRIMONIO_BAIXAR'");
        const depreciacao = read('features/patrimonio/components/DepreciacaoPage.tsx');
        expect(depreciacao).toContain('permission="PATRIMONIO_DEPRECIAR"');
    });

    it('v1.11.0a8b54.c1: tipo DepreciacaoResultadoResponse reflete contrato C# com competencia/totalBensDepreciados/valorTotalDepreciado', () => {
        const types = read('features/patrimonio/types/patrimonio.types.ts');

        // Competencia é int no backend (YYYYMM), necessário decodificar
        expect(types).toContain('competencia: number');

        // Campo corrigido: TotalBensDepreciados → totalBensDepreciados
        expect(types).toContain('totalBensDepreciados: number');

        // Campo corrigido: ValorTotalDepreciado → valorTotalDepreciado
        expect(types).toContain('valorTotalDepreciado: number');

        // TotalContabilizados (entregue pelo backend, opcional exibição)
        expect(types).toContain('totalContabilizados: number');

        // Array de bens depreciados
        expect(types).toContain('bens: BemDepreciadoResponse[]');
    });

    it('v1.11.0a8b54.c1: tipo BemPatrimonialResponse tem valorContabilAtual (não valorContabil)', () => {
        const types = read('features/patrimonio/types/patrimonio.types.ts');

        // Campo corrigido: ValorContabilAtual → valorContabilAtual
        expect(types).toContain('valorContabilAtual: number');
    });

    it('v1.11.0a8b54.c1: DepreciacaoPage decodifica competencia e renderiza resultado corrigido', () => {
        const page = read('features/patrimonio/components/DepreciacaoPage.tsx');

        // Decodificação de competencia (Math.floor / modulo)
        expect(page).toContain('resultado.competencia');

        // Campos que refletem o contrato
        expect(page).toContain('totalBensDepreciados');
        expect(page).toContain('valorTotalDepreciado');
    });

    it('v1.11.0a8b54.c1: BensPage renderiza valorContabilAtual (não valorContabil)', () => {
        const page = read('features/patrimonio/components/BensPage.tsx');

        // Campo corrigido de valor contábil
        expect(page).toContain('valorContabilAtual');
    });

    it('v1.11.0a8b54.c2: AC-2 — enum antigo StatusBem não existe em features/', () => {
        const types = read('features/patrimonio/types/patrimonio.types.ts');
        const labels = read('features/patrimonio/components/patrimonioLabels.ts');
        const schemas = read('features/patrimonio/schemas/patrimonioSchemas.ts');
        const api = read('features/patrimonio/api/patrimonioApi.ts');
        const bensPage = read('features/patrimonio/components/BensPage.tsx');
        const dialogs = read('features/patrimonio/components/PatrimonioDialogs.tsx');

        // Regressão textual: StatusBem como palavra inteira (não StatusBemPatrimonial)
        // O enum antigo tinha Ativo=1, Bloqueado=2, Baixado=3
        expect(types).not.toMatch(/\bStatusBem\b/);
        expect(labels).not.toMatch(/\bStatusBem\b/);
        expect(schemas).not.toMatch(/\bStatusBem\b/);
        expect(api).not.toMatch(/\bStatusBem\b/);
        expect(bensPage).not.toMatch(/\bStatusBem\b/);
        expect(dialogs).not.toMatch(/\bStatusBem\b/);
    });

    it('v1.11.0a8b54.c2: AC-6 — enum antigo CategoriaBem não existe em features/', () => {
        const types = read('features/patrimonio/types/patrimonio.types.ts');
        const labels = read('features/patrimonio/components/patrimonioLabels.ts');
        const schemas = read('features/patrimonio/schemas/patrimonioSchemas.ts');
        const bensPage = read('features/patrimonio/components/BensPage.tsx');
        const dialogs = read('features/patrimonio/components/PatrimonioDialogs.tsx');

        // Regressão textual: CategoriaBem como palavra inteira (não CategoriaBemPatrimonial)
        // O enum antigo tinha 6 valores (Movel, Imovel, Veiculo, Maquina, Equipamento, Outro)
        expect(types).not.toMatch(/\bCategoriaBem\b/);
        expect(labels).not.toMatch(/\bCategoriaBem\b/);
        expect(schemas).not.toMatch(/\bCategoriaBem\b/);
        expect(bensPage).not.toMatch(/\bCategoriaBem\b/);
        expect(dialogs).not.toMatch(/\bCategoriaBem\b/);
    });

    it('v1.11.0a8b54.c2: AC-8 — ação Desbloquear chama desbloquear(row.id) direto sem diálogo', () => {
        const page = read('features/patrimonio/components/BensPage.tsx');

        // Verificar que não existe 'dialog === "desbloquear"'
        expect(page).not.toContain("dialog === 'desbloquear'");

        // Verificar que a ação desbloquear chama a função desbloquear
        expect(page).toContain('desbloquear(row.id)');
    });
});
