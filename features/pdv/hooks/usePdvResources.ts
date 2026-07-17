'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caixasApi, vendasPdvApi } from '@/features/pdv/api/pdvApi';
import { CaixasListQuery, VendasPdvListQuery } from '@/features/pdv/types/pdv.types';

export const caixasQueryKey = (query?: CaixasListQuery) => ['pdv-caixas', query ?? {}] as const;
export const caixaDetalheQueryKey = (id?: string | null) => ['pdv-caixa', id ?? null] as const;
export const vendasPdvQueryKey = (query?: VendasPdvListQuery) => ['pdv-vendas', query ?? {}] as const;

export const useCaixas = (query: CaixasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: caixasQueryKey(query), queryFn: () => caixasApi.listar(query), enabled });

export const useCaixa = (id?: string | null) =>
    useQuery({ queryKey: caixaDetalheQueryKey(id), queryFn: () => caixasApi.obter(id as string), enabled: Boolean(id) });

export const useVendasPdv = (query: VendasPdvListQuery = {}, enabled = true) =>
    useQuery({ queryKey: vendasPdvQueryKey(query), queryFn: () => vendasPdvApi.listar(query), enabled });

type IdValues = { id: string; values: unknown };

export const useCaixasMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['pdv-caixas'] });
        queryClient.invalidateQueries({ queryKey: ['pdv-caixa'] });
    };

    const abrirMutation = useMutation({ mutationFn: (values: unknown) => caixasApi.abrir(values), onSuccess: invalidate });
    const suprimentoMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => caixasApi.suprimento(id, values), onSuccess: invalidate });
    const sangriaMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => caixasApi.sangria(id, values), onSuccess: invalidate });
    const fecharMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => caixasApi.fechar(id, values), onSuccess: invalidate });

    return { abrirMutation, suprimentoMutation, sangriaMutation, fecharMutation };
};

export const useVendasPdvMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['pdv-vendas'] });
        queryClient.invalidateQueries({ queryKey: ['pdv-caixas'] });
        queryClient.invalidateQueries({ queryKey: ['pdv-caixa'] });
    };

    const registrarMutation = useMutation({ mutationFn: (values: unknown) => vendasPdvApi.registrar(values), onSuccess: invalidate });

    return { registrarMutation };
};
