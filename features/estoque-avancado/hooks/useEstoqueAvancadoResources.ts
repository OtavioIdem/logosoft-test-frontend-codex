'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { estoqueAvancadoApi } from '@/features/estoque-avancado/api/estoqueAvancadoApi';
import { InventariosListQuery } from '@/features/estoque-avancado/types/estoqueAvancado.types';

export const inventariosQueryKey = (query?: InventariosListQuery) => ['estoque-avancado-inventarios', query ?? {}] as const;
export const inventarioDetalheQueryKey = (id?: string | null) => ['estoque-avancado-inventario', id ?? null] as const;

export const useInventariosAvancado = (query: InventariosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: inventariosQueryKey(query), queryFn: () => estoqueAvancadoApi.listarInventarios(query), enabled });

export const useInventarioAvancado = (id?: string | null) =>
    useQuery({ queryKey: inventarioDetalheQueryKey(id), queryFn: () => estoqueAvancadoApi.obterInventario(id as string), enabled: Boolean(id) });

type IdValues = { id: string; values: unknown };
type IdMotivo = { id: string; motivo: string };

export const useInventariosAvancadoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['estoque-avancado-inventarios'] });
        queryClient.invalidateQueries({ queryKey: ['estoque-avancado-inventario'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => estoqueAvancadoApi.criarInventario(values), onSuccess: invalidate });
    const itemMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => estoqueAvancadoApi.adicionarItem(id, values), onSuccess: invalidate });
    const iniciarMutation = useMutation({ mutationFn: (id: string) => estoqueAvancadoApi.iniciarContagem(id), onSuccess: invalidate });
    const concluirMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => estoqueAvancadoApi.concluirInventario(id, values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => estoqueAvancadoApi.cancelarInventario(id, motivo), onSuccess: invalidate });
    return { criarMutation, itemMutation, iniciarMutation, concluirMutation, cancelarMutation };
};

export const useAjusteEstoqueMutation = () => useMutation({ mutationFn: (values: unknown) => estoqueAvancadoApi.criarAjuste(values) });

export const useBloqueioEstoqueMutations = () => {
    const criarMutation = useMutation({ mutationFn: (values: unknown) => estoqueAvancadoApi.criarBloqueio(values) });
    const liberarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => estoqueAvancadoApi.liberarBloqueio(id, motivo) });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => estoqueAvancadoApi.cancelarBloqueio(id, motivo) });
    return { criarMutation, liberarMutation, cancelarMutation };
};
