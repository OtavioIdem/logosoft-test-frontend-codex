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

    // `masterOnly` é checado ANTES da permissão, e de propósito: quem tem a permissão do módulo
    // passaria pelo `hasAnyPermission` abaixo, e é justamente essa sessão que a marca precisa
    // recusar (D109). A ordem inversa deixaria a rota aberta para o perfil que ela quer limitar.
    if (rule.masterOnly && !permissions.isMaster) {
        return (
            <UnauthorizedState
                title="Tela em desenvolvimento"
                description={`A rota ${rule.description} está no grupo Desenvolvimento e hoje só é liberada para o usuário master. A permissão do módulo continua sua; o que está restrito é a tela, enquanto o fluxo que a sustenta não existir.`}
            />
        );
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
