import { describe, expect, it } from 'vitest';
import { findRoutePermissionRule } from '@/lib/security/routePermissions';

describe('route permission rules', () => {
    it('protege rotas de vendas por permissões do módulo', () => {
        const rule = findRoutePermissionRule('/vendas/pedidos/novo');
        expect(rule?.anyOf).toContain('VENDAS_GERENCIAR');
        expect(rule?.anyOf).toContain('VENDAS_CONSULTAR');
    });

    it('protege auditoria por permissão específica', () => {
        expect(findRoutePermissionRule('/auditoria/eventos')?.anyOf).toEqual(['AUDITORIA_CONSULTAR']);
        expect(findRoutePermissionRule('/auditoria/operacional')?.anyOf).toEqual(['AUDITORIA_CONSULTAR']);
    });

    it('protege fluxo de caixa por consulta financeira', () => {
        expect(findRoutePermissionRule('/financeiro/fluxo-caixa')?.anyOf).toEqual(['FINANCEIRO_CONSULTAR']);
    });




    it('protege relatórios por ao menos uma permissão granular do backend', () => {
        const rule = findRoutePermissionRule('/relatorios');
        expect(rule?.anyOf).toContain('RELATORIOS_OPERACIONAIS_CONSULTAR');
        expect(rule?.anyOf).toContain('RELATORIOS_EXPORTAR');
    });

    it('protege atividades por permissões granulares do workflow operacional', () => {
        const rule = findRoutePermissionRule('/atividades');
        expect(rule?.anyOf).toContain('ATIVIDADES_CONSULTAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_CRIAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_ATUALIZAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_CANCELAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_COMENTAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_ATRIBUIR');
    });

    it('protege inutilizações fiscais por permissão específica', () => {
        expect(findRoutePermissionRule('/fiscal/inutilizacoes')?.anyOf).toEqual(['FISCAL_INUTILIZAR']);
    });

    it('não exige permissão granular para dashboard autenticado', () => {
        expect(findRoutePermissionRule('/dashboard')).toBeUndefined();
    });
});
