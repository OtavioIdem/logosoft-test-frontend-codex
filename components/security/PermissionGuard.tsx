'use client';

import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { PermissionCode } from '@/types/erp';

type PermissionGuardProps = {
    permission?: PermissionCode;
    anyOf?: PermissionCode[];
    allOf?: PermissionCode[];
    mode?: 'hide' | 'disable';
    fallback?: React.ReactNode;
    children: React.ReactNode | ((props: { disabled: boolean }) => React.ReactNode);
};

export const PermissionGuard = ({ permission, anyOf, allOf, mode = 'hide', fallback = null, children }: PermissionGuardProps) => {
    const permissions = usePermissions();
    const allowed = permissions.hasPermission(permission) && permissions.hasAnyPermission(anyOf) && permissions.hasAllPermissions(allOf);

    if (allowed) {
        return <>{typeof children === 'function' ? children({ disabled: false }) : children}</>;
    }

    if (mode === 'disable' && typeof children === 'function') {
        return <>{children({ disabled: true })}</>;
    }

    return <>{fallback}</>;
};
