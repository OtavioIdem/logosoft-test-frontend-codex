import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Contábil (Onda 4) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Contábil', () => {
        const api = read('features/contabil/api/contabilApi.ts');
        expect(api).toContain("const PLANO_CONTAS = '/api/contabil/plano-contas'");
        expect(api).toContain("const PERIODOS = '/api/contabil/periodos'");
        expect(api).toContain("const LANCAMENTOS = '/api/contabil/lancamentos'");
        expect(api).toContain("const REGRAS = '/api/contabil/regras'");
        expect(api).toContain('${PLANO_CONTAS}/${id}/inativar');
        expect(api).toContain('${PERIODOS}/${id}/fechar');
        expect(api).toContain('${PERIODOS}/${id}/reabrir');
        expect(api).toContain('${LANCAMENTOS}/${id}/estornar');
        expect(api).toContain('${REGRAS}/${id}/inativar');
    });

    it('registra as 6 permissões de Contábil no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'CONTABIL_CONSULTAR'");
        expect(erp).toContain("'CONTABIL_PLANO_CONTAS_GERENCIAR'");
        expect(erp).toContain("'CONTABIL_PERIODOS_GERENCIAR'");
        expect(erp).toContain("'CONTABIL_LANCAMENTOS_GERENCIAR'");
        expect(erp).toContain("'CONTABIL_LANCAMENTOS_ESTORNAR'");
        expect(erp).toContain("'CONTABIL_REGRAS_GERENCIAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/contabil');
        expect(rotas).toContain('CONTABIL_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/contabil/plano-contas'");
        expect(menu).toContain("to: '/contabil/lancamentos'");
        const page = read('app/(main)/contabil/lancamentos/page.tsx');
        expect(page).toContain('LancamentosPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('editor de lançamento valida débito=crédito e gateia estorno por permissão própria', () => {
        const dialogs = read('features/contabil/components/ContabilDialogs.tsx');
        expect(dialogs).toContain('totalDebito');
        expect(dialogs).toContain('totalCredito');
        expect(dialogs).toContain('balanceado');
        const lancamentos = read('features/contabil/components/LancamentosPage.tsx');
        expect(lancamentos).toContain("permission: 'CONTABIL_LANCAMENTOS_ESTORNAR'");
    });

    it('schema garante partidas balanceadas e conta analítica', () => {
        const schema = read('features/contabil/schemas/contabilSchemas.ts');
        expect(schema).toContain('soma dos débitos deve ser igual à soma dos créditos');
        expect(schema).toContain('ao menos duas partidas');
    });

    it('v1.11.0a8b54.c1: tipo LancamentoContabilResponse reflete contrato C# com totalDebito/totalCredito/statusLancamento', () => {
        const types = read('features/contabil/types/contabil.types.ts');

        // Campos corrigidos: TotalDebito → totalDebito
        expect(types).toContain('totalDebito: number');

        // Campos corrigidos: TotalCredito → totalCredito
        expect(types).toContain('totalCredito: number');

        // Campo de status corrigido: StatusLancamento → statusLancamento
        expect(types).toContain('statusLancamento: StatusLancamentoContabil | number');

        // Partidas que existem no backend
        expect(types).toContain('partidas: PartidaContabilResponse[]');

        // Enum StatusLancamentoContabil: 3 valores, idêntico ao backend
        expect(types).toContain('Normal = 1');
        expect(types).toContain('Estornado = 2');
        expect(types).toContain('Estorno = 3');
    });

    it('v1.11.0a8b54.c1: LancamentosPage renderiza colunas com totalDebito/totalCredito/statusLancamento', () => {
        const page = read('features/contabil/components/LancamentosPage.tsx');

        // Colunas que lêem os campos corrigidos
        expect(page).toContain('totalDebito');
        expect(page).toContain('totalCredito');
        expect(page).toContain('statusLancamento');
    });
});
