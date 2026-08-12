import { describe, expect, it } from 'vitest';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/permissions/permissions';
import { CurrentUser } from '@/types/erp';
const user: CurrentUser = { id: '1', nome: 'Teste', email: 'teste@logosoft.local', permissoes: ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR'] };
describe('permissions', () => {
    it('valida permissão simples', () => expect(hasPermission(user, 'PRODUTOS_CONSULTAR')).toBe(true));
    it('valida qualquer permissão', () => expect(hasAnyPermission(user, ['CLIENTES_CONSULTAR', 'PRODUTOS_GERENCIAR'])).toBe(true));
    it('valida todas as permissões', () => expect(hasAllPermissions(user, ['PRODUTOS_CONSULTAR', 'PRODUTOS_GERENCIAR'])).toBe(true));
    it.each([
        [{ ...user, isMaster: true, permissoes: [] }, 'PRODUTOS_GERENCIAR'],
        [{ ...user, permissoes: ['*'] as never }, 'PRODUTOS_GERENCIAR'],
        [{ ...user, permissoes: ['MASTER_GOD'] as never }, 'PRODUTOS_GERENCIAR']
    ])('nao concede bypass para claim administrativa fora do catalogo', (currentUser, requiredPermission) => {
        expect(hasPermission(currentUser, requiredPermission as never)).toBe(false);
    });
});
