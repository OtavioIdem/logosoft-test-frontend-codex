'use client';

import { useAuth } from './useAuth';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/permissions/permissions';
import { PermissionCode } from '@/types/erp';

export const usePermissions = () => {
    const { user } = useAuth();

    return {
        // `masterOnly` (D109) é decidido por isto, não por permissão: quem lê precisa do fato cru
        // da sessão, porque `hasPermission` devolve true para master em QUALQUER código e por isso
        // não serve para separar master de não-master.
        isMaster: user?.isMaster === true,
        hasPermission: (permission?: PermissionCode) => hasPermission(user, permission),
        hasAnyPermission: (permissions?: PermissionCode[]) => hasAnyPermission(user, permissions),
        hasAllPermissions: (permissions?: PermissionCode[]) => hasAllPermissions(user, permissions)
    };
};
