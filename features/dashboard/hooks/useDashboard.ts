'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';

export const useDashboard = () =>
    useQuery({
        queryKey: ['dashboard', 'overview'],
        queryFn: dashboardApi.carregar,
        staleTime: 60_000
    });
