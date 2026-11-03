'use client';

// Código de rejeição da nota do faturamento (v1.11.0a8b82, emenda QA-01 da D113). O `RECUSA_LOCAL` só existe na nota
// (`NotaFiscal.CodigoRejeicao`), não no motivo do leg 4. A leitura só acontece com o leg 4 em `Falhou`, com
// `notaFiscalId` e com `isMaster` ou `FISCAL_CONSULTAR`. Sem permissão, falhando ou carregando, devolve `null`: a tela
// mostra o motivo do backend como veio, sem afirmar recusa local.

import { QueryClient, useQuery } from '@tanstack/react-query';
import { fiscalApi } from '@/features/fiscal/api/fiscalApi';
import { leg4Falhou } from '@/features/faturamento/components/faturamentoLabels';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { FaturamentoLegResponse } from '@/features/faturamento/types/faturamento.types';

export const codigoRejeicaoNotaQueryKey = (notaFiscalId?: string | null) => ['faturamento-nota-rejeicao', notaFiscalId ?? null] as const;

const buscarCodigoRejeicao = async (notaFiscalId: string) => (await fiscalApi.buscarNota(notaFiscalId)).codigoRejeicao ?? null;

/** Para ler a nota fora de um componente (o toast do Confirmar espera a leitura, com falha silenciosa e sem afirmar nada). */
export const buscarCodigoRejeicaoNota = async (queryClient: QueryClient, notaFiscalId: string): Promise<string | null> => {
    try {
        return await queryClient.fetchQuery({ queryKey: codigoRejeicaoNotaQueryKey(notaFiscalId), queryFn: () => buscarCodigoRejeicao(notaFiscalId), staleTime: 0 });
    } catch {
        return null;
    }
};

export const useConsultaNotaPermitida = () => {
    const context = useOrganizationalContext();
    const { hasPermission } = usePermissions();
    return context.snapshot.isMaster || hasPermission('FISCAL_CONSULTAR');
};

export const useCodigoRejeicaoNota = (faturamento?: { notaFiscalId?: string | null; legs?: FaturamentoLegResponse[] | null } | null): string | null => {
    const permitido = useConsultaNotaPermitida();
    const notaFiscalId = faturamento?.notaFiscalId ?? null;
    const query = useQuery({
        queryKey: codigoRejeicaoNotaQueryKey(notaFiscalId),
        queryFn: () => buscarCodigoRejeicao(notaFiscalId as string),
        enabled: permitido && Boolean(notaFiscalId) && leg4Falhou(faturamento?.legs),
        retry: false
    });
    return query.isSuccess ? query.data ?? null : null;
};
