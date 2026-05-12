'use client';

import { useQuery } from '@tanstack/react-query';
import { auditoriaApi } from '@/features/auditoria/api/auditoriaApi';

export const auditoriaQueryKeys = {
    eventos: ['auditoria', 'eventos'] as const
};

export const useAuditoriaEventos = () =>
    useQuery({
        queryKey: auditoriaQueryKeys.eventos,
        queryFn: auditoriaApi.listarEventos
    });
