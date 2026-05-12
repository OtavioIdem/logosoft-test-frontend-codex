import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionGuard } from '@/components/security/PermissionGuard';

vi.mock('@/features/auth/hooks/usePermissions', () => ({
    usePermissions: () => ({
        hasPermission: (permission?: string) => !permission || permission === 'PRODUTOS_GERENCIAR',
        hasAnyPermission: (permissions?: string[]) => !permissions || permissions.includes('PRODUTOS_GERENCIAR'),
        hasAllPermissions: (permissions?: string[]) => !permissions || permissions.every((permission) => permission === 'PRODUTOS_GERENCIAR')
    })
}));

describe('PermissionGuard', () => {
    it('renderiza conteúdo permitido', () => {
        render(<PermissionGuard permission="PRODUTOS_GERENCIAR">Novo produto</PermissionGuard>);
        expect(screen.getByText('Novo produto')).toBeInTheDocument();
    });

    it('oculta conteúdo sem permissão', () => {
        render(<PermissionGuard permission="VENDAS_APROVAR">Aprovar venda</PermissionGuard>);
        expect(screen.queryByText('Aprovar venda')).not.toBeInTheDocument();
    });
});
