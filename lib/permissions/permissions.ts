import { CurrentUser, PermissionCode } from '@/types/erp';

export const hasPermission = (user: CurrentUser | null | undefined, permission?: PermissionCode) => {
    if (!permission) return true;
    return Boolean(user?.permissoes?.includes(permission));
};

export const hasAnyPermission = (user: CurrentUser | null | undefined, permissions?: PermissionCode[]) => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.some((permission) => hasPermission(user, permission));
};

export const hasAllPermissions = (user: CurrentUser | null | undefined, permissions?: PermissionCode[]) => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.every((permission) => hasPermission(user, permission));
};
