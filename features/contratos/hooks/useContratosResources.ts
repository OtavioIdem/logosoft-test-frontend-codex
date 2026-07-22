'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contratosApi } from '@/features/contratos/api/contratosApi';
import { ContratosListQuery } from '@/features/contratos/types/contratos.types';

export const contratosQueryKey = (query?: ContratosListQuery) => ['contratos', query ?? {}] as const;
export const contratoDetalheQueryKey = (id?: string | null) => ['contrato', id ?? null] as const;

type IdValues = { id: string; values: unknown };
type IdMotivo = { id: string; motivo: string };

export const useContratos = (query: ContratosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: contratosQueryKey(query), queryFn: () => contratosApi.listar(query), enabled });

export const useContrato = (id?: string | null) =>
    useQuery({ queryKey: contratoDetalheQueryKey(id), queryFn: () => contratosApi.obter(id as string), enabled: Boolean(id) });

export const useContratoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['contratos'] });
        queryClient.invalidateQueries({ queryKey: ['contrato'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => contratosApi.criar(values), onSuccess: invalidate });
    const atualizarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => contratosApi.atualizar(id, values), onSuccess: invalidate });
    const aprovarMutation = useMutation({ mutationFn: (id: string) => contratosApi.aprovar(id), onSuccess: invalidate });
    const reajustarMutation = useMutation({ mutationFn: ({ id, percentual }: { id: string; percentual: number }) => contratosApi.reajustar(id, percentual), onSuccess: invalidate });
    const renovarMutation = useMutation({ mutationFn: ({ id, novaDataFim }: { id: string; novaDataFim: unknown }) => contratosApi.renovar(id, novaDataFim), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => contratosApi.encerrar(id, motivo), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => contratosApi.cancelar(id, motivo), onSuccess: invalidate });
    const faturamentoMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => contratosApi.gerarFaturamento(id, values), onSuccess: invalidate });
    return { criarMutation, atualizarMutation, aprovarMutation, reajustarMutation, renovarMutation, encerrarMutation, cancelarMutation, faturamentoMutation };
};
