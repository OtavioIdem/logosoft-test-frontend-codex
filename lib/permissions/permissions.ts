import { CurrentUser, PermissionCode } from '@/types/erp';

const NON_BYPASS_PERMISSION_CODES = new Set<string>(['MASTER_GOD', '*']);

export const hasPermission = (user: CurrentUser | null | undefined, permission?: PermissionCode) => {
    if (!permission) return true;
    if (NON_BYPASS_PERMISSION_CODES.has(permission)) return false;
    if (user?.isMaster === true || user?.permissoes?.includes('*' as PermissionCode)) return true;
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
