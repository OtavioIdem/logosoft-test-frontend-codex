'use client';

import { useQuery } from '@tanstack/react-query';
import { auditoriaApi } from '@/features/auditoria/api/auditoriaApi';
import { AuditoriaOperacionalQuery } from '@/features/auditoria/types/auditoria.types';

export const auditoriaQueryKeys = {
    eventos: ['auditoria', 'eventos'] as const,
    eventosRecentes: ['auditoria', 'eventos-recentes'] as const,
    operacional: (query: AuditoriaOperacionalQuery) => ['auditoria', 'operacional', query] as const
};

export const useAuditoriaEventos = () =>
    useQuery({
        queryKey: auditoriaQueryKeys.eventos,
        queryFn: auditoriaApi.listarEventos
    });

export const useAuditoriaEventosRecentes = () =>
    useQuery({
        queryKey: auditoriaQueryKeys.eventosRecentes,
        queryFn: auditoriaApi.listarEventosRecentes,
        staleTime: 30_000
    });

export const useAuditoriaOperacional = (query: AuditoriaOperacionalQuery) =>
    useQuery({
        queryKey: auditoriaQueryKeys.operacional(query),
        queryFn: () => auditoriaApi.consultarOperacional(query),
        staleTime: 15_000
    });
