'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

export const useDashboard = () => {
    const { empresaId, filialId, organizationalScopeKey } = useOrganizationalContext();

    return useQuery({
        queryKey: ['dashboard', 'overview', organizationalScopeKey],
        queryFn: () => dashboardApi.carregar({ empresaId, filialId }),
        staleTime: 60_000
    });
};
