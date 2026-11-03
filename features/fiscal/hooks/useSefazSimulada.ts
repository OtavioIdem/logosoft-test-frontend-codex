'use client';

// Selo "SEFAZ simulada" (v1.11.0a8b81, D112; reaproveitado na b82). Devolve true SOMENTE quando o health traz
// `fiscal.mock === true`. Bloco ausente, health indisponível ou carregando devolvem false -- e false significa "sem
// prova de simulação", nunca "SEFAZ real": nenhuma tela pode afirmar SEFAZ real a partir deste hook.

import { useQuery } from '@tanstack/react-query';
import { healthApi, HealthResponse } from '@/lib/api/healthApi';

export const sefazSimuladaQueryKey = () => ['health', 'fiscal'] as const;

export const isSefazSimulada = (health?: Pick<HealthResponse, 'fiscal'> | null): boolean => health?.fiscal?.mock === true;

export const useSefazSimulada = (): boolean => {
    const query = useQuery({
        queryKey: sefazSimuladaQueryKey(),
        queryFn: () => healthApi.check(),
        staleTime: 5 * 60 * 1000,
        retry: false
    });
    return isSefazSimulada(query.data);
};
