import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('RH (Onda 2) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de RH', () => {
        const api = read('features/rh/api/rhApi.ts');
        expect(api).toContain("const COLABORADORES = '/api/rh/colaboradores'");
        expect(api).toContain("const JORNADAS = '/api/rh/jornadas'");
        expect(api).toContain("const PONTO = '/api/rh/ponto'");
        expect(api).toContain("const FERIAS = '/api/rh/ferias'");
        expect(api).toContain("const AFASTAMENTOS = '/api/rh/afastamentos'");
        expect(api).toContain("const BENEFICIOS = '/api/rh/beneficios'");
        expect(api).toContain("const CONCESSOES = '/api/rh/beneficios/concessoes'");
        expect(api).toContain("const EVENTOS = '/api/rh/eventos'");
        expect(api).toContain('${COLABORADORES}/${id}/desligar');
        expect(api).toContain('${FERIAS}/${id}/aprovar');
        expect(api).toContain('${FERIAS}/${id}/rejeitar');
        expect(api).toContain('${FERIAS}/${id}/iniciar');
        expect(api).toContain('${FERIAS}/${id}/concluir');
        expect(api).toContain('${FERIAS}/${id}/cancelar');
        expect(api).not.toContain('${FERIAS}/${id}/${acao}');
        expect(api).toContain('${AFASTAMENTOS}/${id}/encerrar');
        expect(api).toContain('${CONCESSOES}/${id}/encerrar');
    });

    it('registra as 4 permissões de RH no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'RH_CONSULTAR'");
        expect(erp).toContain("'RH_GERENCIAR'");
        expect(erp).toContain("'RH_PONTO_REGISTRAR'");
        expect(erp).toContain("'RH_EVENTOS_GERENCIAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/rh');
        expect(rotas).toContain('RH_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/rh/colaboradores'");
        expect(menu).toContain("to: '/rh/ponto'");
        expect(menu).toContain("to: '/rh/ausencias'");
        expect(menu).toContain("to: '/rh/eventos'");
        const page = read('app/(main)/rh/colaboradores/page.tsx');
        expect(page).toContain('ColaboradoresPage');
        expect(page).not.toContain('ModulePlaceholderPage');
    });

    it('páginas gateiam ações por permissão (gerenciar/ponto/eventos)', () => {
        const colab = read('features/rh/components/ColaboradoresPage.tsx');
        expect(colab).toContain("hasPermission('RH_CONSULTAR')");
        expect(colab).toContain('permission="RH_GERENCIAR"');
        const ponto = read('features/rh/components/PontoPage.tsx');
        expect(ponto).toContain('permission="RH_PONTO_REGISTRAR"');
        const eventos = read('features/rh/components/EventosPage.tsx');
        expect(eventos).toContain('permission="RH_EVENTOS_GERENCIAR"');
    });
});
