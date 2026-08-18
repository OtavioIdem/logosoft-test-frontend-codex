import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('auditoria B45 structure', () => {
    it('expõe endpoints operacionais e recentes no client', () => {
        const api = read('features/auditoria/api/auditoriaApi.ts');
        expect(api).toContain('/api/auditoria/eventos');
        expect(api).toContain('/api/auditoria/eventos-recentes');
        expect(api).toContain('/api/auditoria/operacional');
        expect(api).toContain('buildAuditoriaOperacionalQuery');
    });

    it('cria rota operacional e mantém auditoria protegida no menu/guard', () => {
        const page = read('app/(main)/auditoria/operacional/page.tsx');
        const menu = read('layout/AppMenu.tsx');
        const routes = read('lib/security/routePermissions.ts');
        expect(page).toContain('AuditoriaEventosPage');
        expect(page).not.toContain('ModulePlaceholderPage');
        expect(menu).toContain('/auditoria/operacional');
        expect(menu).toContain('/auditoria/eventos');
        expect(routes).toContain('^\\/auditoria');
        expect(routes).toContain('AUDITORIA_CONSULTAR');
    });

    it('cobre filtros avançados sem campo manual de entidadeId', () => {
        const component = read('features/auditoria/components/AuditoriaEventosPage.tsx');
        expect(component).toContain('EmpresaFilialFilter');
        expect(component).toContain('usuarioId');
        expect(component).toContain('modulo');
        expect(component).toContain('entidade');
        expect(component).toContain('acao');
        expect(component).toContain('termo');
        expect(component).toContain('dataInicial');
        expect(component).toContain('dataFinal');
        expect(component).not.toContain("update('entidadeId'");
        expect(component).not.toContain('ID da entidade');
    });

    it('bloqueia exposição visual de GUID bruto', () => {
        const component = read('features/auditoria/components/AuditoriaEventosPage.tsx');
        const display = read('features/auditoria/utils/auditoriaDisplay.ts');
        expect(component).toContain('maskAuditoriaTechnicalIds');
        expect(component).toContain('Usuário vinculado');
        expect(component).toContain('Contexto protegido');
        expect(component).not.toContain('evento.entidadeId');
        expect(component).not.toContain('evento.empresaId');
        expect(component).not.toContain('evento.filialId');
        expect(display).toContain('UUID_REGEX');
        expect(display).toContain('vínculo técnico');
    });

    it('mantém o mapa de contrato em auditoria sem supressões históricas', () => {
        const allowlist = JSON.parse(read('scripts/backend-contract-map.allowlist.json')) as { status: string; suppressions: unknown[] };
        expect(allowlist.status).toBe('audit-only-no-suppressions');
        expect(allowlist.suppressions).toEqual([]);
    });
});
