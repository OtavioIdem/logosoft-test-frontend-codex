'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { findRoutePermissionRule } from '@/lib/security/routePermissions';

export const RoutePermissionGate = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname();
    const permissions = usePermissions();
    const rule = findRoutePermissionRule(pathname);

    if (!rule) {
        return <>{children}</>;
    }

    if (!permissions.hasAnyPermission(rule.anyOf)) {
        return (
            <UnauthorizedState
                title="Acesso negado"
                description={`A rota ${rule.description} exige uma das permissões: ${rule.anyOf.join(', ')}.`}
            />
        );
    }

    return <>{children}</>;
};
