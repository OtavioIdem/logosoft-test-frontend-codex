import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('atividades B43 structure', () => {
    it('expõe client com todos os endpoints reais de atividades', () => {
        const api = read('features/atividades/api/atividadesApi.ts');
        expect(api).toContain("'/api/atividades'");
        expect(api).toContain('/api/atividades/${id}');
        expect(api).toContain('/api/atividades/${id}/atribuir');
        expect(api).toContain('/api/atividades/${id}/status');
        expect(api).toContain('/api/atividades/${id}/comentarios');
        expect(api).toContain('/api/atividades/${id}/cancelar');
    });

    it('cria página real com workflow e sem placeholder', () => {
        const page = read('app/(main)/atividades/page.tsx');
        const component = read('features/atividades/components/AtividadesPage.tsx');
        expect(page).toContain('AtividadesPage');
        expect(page).not.toContain('ModulePlaceholderPage');
        expect(component).toContain("hasAnyPermission(['ATIVIDADES_CONSULTAR', 'ATIVIDADES_GERENCIAR'])");
        expect(component).toContain('ATIVIDADES_GERENCIAR');
        expect(component).toContain('AtribuirAtividadeDialog');
        expect(component).toContain('AlterarStatusAtividadeDialog');
        expect(component).toContain('ComentarAtividadeDialog');
        expect(component).toContain('Cancelar atividade');
    });

    it('inclui menu, permissões de rota e tipos de permissão do módulo', () => {
        const menu = read('layout/AppMenu.tsx');
        const routes = read('lib/security/routePermissions.ts');
        const erpTypes = read('types/erp.ts');
        expect(menu).toContain('/atividades');
        expect(menu).toContain('ATIVIDADES_CONSULTAR');
        expect(routes).toContain('^\\/atividades');
        expect(routes).toContain('ATIVIDADES_GERENCIAR');
        expect(erpTypes).toContain("'ATIVIDADES_CONSULTAR'");
        expect(erpTypes).toContain("'ATIVIDADES_GERENCIAR'");
    });



    it('não usa responsavelUsuarioId como fallback visual bruto', () => {
        const component = read('features/atividades/components/AtividadesPage.tsx');
        expect(component).toContain('Responsável vinculado');
        expect(component).not.toContain('?? row.responsavelUsuarioId');
        expect(component).not.toContain('?? detalhe.responsavelUsuarioId');
    });

    it('não expõe campo manual de GUID de origem operacional', () => {
        const form = read('features/atividades/components/AtividadeFormDialog.tsx');
        const page = read('features/atividades/components/AtividadesPage.tsx');
        expect(form).not.toContain('atividadeEntidadeOrigemId');
        expect(form).not.toContain('ID da origem');
        expect(form).not.toContain("update('entidadeOrigemId'");
        expect(form).toContain('não é permitido digitar GUID operacional manualmente');
        expect(page).toContain('vínculo técnico');
        expect(page).not.toContain(' • ${row.entidadeOrigemId}');
    });

    it('classifica atividades como implementado no mapa B43', () => {
        const allowlist = read('scripts/backend-contract-map.allowlist.json');
        const contractDoc = read('docs/CONTRATO_FRONTEND_BACKEND_B38.md');
        expect(allowlist).toContain('ATIVIDADES_AUSENTE_FRONTEND');
        expect(allowlist).toContain('IMPLEMENTADO_B43');
        expect(contractDoc).toContain('IMPLEMENTADO_B43');
        expect(contractDoc).toContain('/api/atividades');
    });
});
