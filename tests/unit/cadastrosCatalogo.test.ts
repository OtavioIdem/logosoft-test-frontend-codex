import { describe, expect, it } from 'vitest';
import { cadastroCategorias, cadastroItens, cadastrosAnyPermissions } from '@/features/cadastros/cadastrosCatalogo';
import { findRoutePermissionRule } from '@/lib/security/routePermissions';

describe('central de cadastros', () => {
    it('mantém os 34 destinos em oito etapas sem anunciar o cadastro bancário bloqueado', () => {
        expect(cadastroCategorias).toHaveLength(8);
        expect(cadastroItens).toHaveLength(34);
        expect(new Set(cadastroItens.map((item) => item.id)).size).toBe(34);
        expect(new Set(cadastroItens.map((item) => item.to)).size).toBe(34);
        expect(cadastroItens.some((item) => item.to === '/bancos')).toBe(false);
    });

    it('preserva em cada item a permissão já exigida pela rota canônica', () => {
        for (const item of cadastroItens) {
            const regra = findRoutePermissionRule(item.to);
            expect(regra, item.to).toBeDefined();
            expect(item.anyPermissions.every((permission) => regra?.anyOf.includes(permission))).toBe(true);
        }
    });

    it('mantém a união do catálogo como o guard de /cadastros', () => {
        expect(findRoutePermissionRule('/cadastros')?.anyOf).toEqual(cadastrosAnyPermissions);
        expect(findRoutePermissionRule('/cadastros/inexistente')?.description).toBe('Central de cadastros');
    });
});
