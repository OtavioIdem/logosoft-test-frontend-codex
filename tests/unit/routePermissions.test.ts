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
    });


    it('protege inutilizações fiscais por permissão específica', () => {
        expect(findRoutePermissionRule('/fiscal/inutilizacoes')?.anyOf).toEqual(['FISCAL_INUTILIZAR']);
    });

    it('não exige permissão granular para dashboard autenticado', () => {
        expect(findRoutePermissionRule('/dashboard')).toBeUndefined();
    });
});
