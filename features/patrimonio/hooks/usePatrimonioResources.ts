'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { patrimonioApi } from '@/features/patrimonio/api/patrimonioApi';
import { BensListQuery, InventariosListQuery } from '@/features/patrimonio/types/patrimonio.types';

export const bensQueryKey = (query?: BensListQuery) => ['patrimonio-bens', query ?? {}] as const;
export const inventariosQueryKey = (query?: InventariosListQuery) => ['patrimonio-inventarios', query ?? {}] as const;
export const inventarioDetalheQueryKey = (id?: string | null) => ['patrimonio-inventario', id ?? null] as const;

type IdValues = { id: string; values: unknown };
type IdMotivo = { id: string; motivo: string };

// ---- Bens ----
export const useBens = (query: BensListQuery = {}, enabled = true) =>
    useQuery({ queryKey: bensQueryKey(query), queryFn: () => patrimonioApi.listarBens(query), enabled });

export const useBemMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['patrimonio-bens'] });
    const cadastrarMutation = useMutation({ mutationFn: (values: unknown) => patrimonioApi.cadastrarBem(values), onSuccess: invalidate });
    const transferirMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => patrimonioApi.transferirBem(id, values), onSuccess: invalidate });
    const bloquearMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => patrimonioApi.bloquearBem(id, motivo), onSuccess: invalidate });
    const desbloquearMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => patrimonioApi.desbloquearBem(id, motivo), onSuccess: invalidate });
    const baixarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => patrimonioApi.baixarBem(id, values), onSuccess: invalidate });
    return { cadastrarMutation, transferirMutation, bloquearMutation, desbloquearMutation, baixarMutation };
};

// ---- Depreciação ----
export const useDepreciacaoMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: (values: unknown) => patrimonioApi.processarDepreciacao(values), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patrimonio-bens'] }) });
};

// ---- Inventários ----
export const useInventariosPatrimonio = (query: InventariosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: inventariosQueryKey(query), queryFn: () => patrimonioApi.listarInventarios(query), enabled });

export const useInventarioPatrimonio = (id?: string | null) =>
    useQuery({ queryKey: inventarioDetalheQueryKey(id), queryFn: () => patrimonioApi.obterInventario(id as string), enabled: Boolean(id) });

export const useInventarioPatrimonioMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['patrimonio-inventarios'] });
        queryClient.invalidateQueries({ queryKey: ['patrimonio-inventario'] });
    };
    const abrirMutation = useMutation({ mutationFn: (values: unknown) => patrimonioApi.abrirInventario(values), onSuccess: invalidate });
    const contagemMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => patrimonioApi.registrarContagem(id, values), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: (id: string) => patrimonioApi.encerrarInventario(id), onSuccess: invalidate });
    return { abrirMutation, contagemMutation, encerrarMutation };
};
