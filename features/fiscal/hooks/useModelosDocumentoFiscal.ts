'use client';

// Hook do combo de modelo de documento fiscal (v1.11.0a8b58, F3.5 -- só combo, D53).

import { useQuery } from '@tanstack/react-query';
import { modelosDocumentoFiscalApi } from '@/features/fiscal/api/modelosDocumentoFiscalApi';
import { ModeloDocumentoFiscalListQuery } from '@/features/fiscal/types/modelosDocumentoFiscal.types';

export const modelosDocumentoFiscalQueryKey = (query?: ModeloDocumentoFiscalListQuery) => ['fiscal', 'modelos-documento', query ?? null] as const;

// AC-6 (S1/S2b): `habilitado` é amarrado à permissão FISCAL_MODELOS_CONSULTAR pelo chamador -- sem ela, 0 GET.
export const useModelosDocumentoFiscal = (query: ModeloDocumentoFiscalListQuery, habilitado: boolean) =>
    useQuery({
        queryKey: modelosDocumentoFiscalQueryKey(query),
        queryFn: () => modelosDocumentoFiscalApi.listar(query),
        enabled: habilitado,
        staleTime: 5 * 60 * 1000
    });
