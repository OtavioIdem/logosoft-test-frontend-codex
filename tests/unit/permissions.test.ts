import { describe, expect, it } from 'vitest';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/permissions/permissions';
import { CurrentUser } from '@/types/erp';
const user: CurrentUser = { id: '1', nome: 'Teste', email: 'teste@logosoft.local', permissoes: ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR'] };
describe('permissions', () => {
    it('valida permissão simples', () => expect(hasPermission(user, 'PRODUTOS_CONSULTAR')).toBe(true));
    it('valida qualquer permissão', () => expect(hasAnyPermission(user, ['CLIENTES_CONSULTAR', 'PRODUTOS_GERENCIAR'])).toBe(true));
    it('valida todas as permissões', () => expect(hasAllPermissions(user, ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR'])).toBe(true));
    it('concede bypass funcional ao master para permissões do catálogo', () => {
        expect(hasPermission({ ...user, isMaster: true, permissoes: [] }, 'PRODUTOS_GERENCIAR')).toBe(true);
        expect(hasPermission({ ...user, permissoes: ['*'] as never }, 'PRODUTOS_GERENCIAR')).toBe(true);
    });
    it.each(['MASTER_GOD', '*'])('não permite solicitar claim administrativa %s', (requiredPermission) => {
        const currentUser = { ...user, isMaster: true, permissoes: [] };
        expect(hasPermission(currentUser, requiredPermission as never)).toBe(false);
    });
});
