'use client';

import { useAuth } from './useAuth';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/permissions/permissions';
import { PermissionCode } from '@/types/erp';

export const usePermissions = () => {
    const { user } = useAuth();

    return {
        hasPermission: (permission?: PermissionCode) => hasPermission(user, permission),
        hasAnyPermission: (permissions?: PermissionCode[]) => hasAnyPermission(user, permissions),
        hasAllPermissions: (permissions?: PermissionCode[]) => hasAllPermissions(user, permissions)
    };
};
