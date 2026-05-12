'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { estoqueApi } from '@/features/estoque/api/estoqueApi';
import { EstoqueListQuery } from '@/features/estoque/types/estoque.types';

type SavePayload = { id?: string; values: unknown };
type ReasonPayload = { id: string; motivo: string };
type ActionPayload = { id: string; values: unknown };

export const estoqueQueryKeys = {
    locais: (query?: EstoqueListQuery) => ['estoque', 'locais', query] as const,
    saldos: (query?: EstoqueListQuery) => ['estoque', 'saldos', query] as const,
    movimentos: (query?: EstoqueListQuery) => ['estoque', 'movimentos', query] as const,
    reservas: (query?: EstoqueListQuery) => ['estoque', 'reservas', query] as const,
    inventarios: (query?: EstoqueListQuery) => ['estoque', 'inventarios', query] as const
};

export const useLocaisEstoque = (query: EstoqueListQuery = {}) => useQuery({ queryKey: estoqueQueryKeys.locais(query), queryFn: () => estoqueApi.listarLocais(query) });
export const useSaldosEstoque = (query: EstoqueListQuery = {}) => useQuery({ queryKey: estoqueQueryKeys.saldos(query), queryFn: () => estoqueApi.listarSaldos(query) });
export const useMovimentosEstoque = (query: EstoqueListQuery = {}) => useQuery({ queryKey: estoqueQueryKeys.movimentos(query), queryFn: () => estoqueApi.listarMovimentos(query) });
export const useReservasEstoque = (query: EstoqueListQuery = {}) => useQuery({ queryKey: estoqueQueryKeys.reservas(query), queryFn: () => estoqueApi.listarReservas(query) });
export const useInventariosEstoque = (query: EstoqueListQuery = {}) => useQuery({ queryKey: estoqueQueryKeys.inventarios(query), queryFn: () => estoqueApi.listarInventarios(query) });

export const useLocalEstoqueMutations = (query: EstoqueListQuery = {}) => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['estoque', 'locais'] });
    const saveMutation = useMutation({ mutationFn: ({ id, values }: SavePayload) => (id ? estoqueApi.atualizarLocal(id, values) : estoqueApi.criarLocal(values)), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => estoqueApi.inativarLocal(id, motivo), onSuccess: invalidate });
    return { saveMutation, inativarMutation, query };
};

export const useMovimentoEstoqueMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['estoque', 'saldos'] });
        queryClient.invalidateQueries({ queryKey: ['estoque', 'movimentos'] });
        queryClient.invalidateQueries({ queryKey: ['estoque', 'reservas'] });
    };
    const entradaMutation = useMutation({ mutationFn: estoqueApi.registrarEntrada, onSuccess: invalidate });
    const saidaMutation = useMutation({ mutationFn: estoqueApi.registrarSaida, onSuccess: invalidate });
    const ajusteMutation = useMutation({ mutationFn: estoqueApi.registrarAjuste, onSuccess: invalidate });
    return { entradaMutation, saidaMutation, ajusteMutation };
};

export const useReservaEstoqueMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['estoque', 'reservas'] });
        queryClient.invalidateQueries({ queryKey: ['estoque', 'saldos'] });
        queryClient.invalidateQueries({ queryKey: ['estoque', 'movimentos'] });
    };
    const criarMutation = useMutation({ mutationFn: estoqueApi.criarReserva, onSuccess: invalidate });
    const baixarMutation = useMutation({ mutationFn: ({ id, values }: ActionPayload) => estoqueApi.baixarReserva(id, values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, values }: ActionPayload) => estoqueApi.cancelarReserva(id, values), onSuccess: invalidate });
    return { criarMutation, baixarMutation, cancelarMutation };
};

export const useInventarioEstoqueMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['estoque', 'inventarios'] });
        queryClient.invalidateQueries({ queryKey: ['estoque', 'saldos'] });
        queryClient.invalidateQueries({ queryKey: ['estoque', 'movimentos'] });
    };
    const abrirMutation = useMutation({ mutationFn: estoqueApi.abrirInventario, onSuccess: invalidate });
    const adicionarItemMutation = useMutation({ mutationFn: ({ id, values }: ActionPayload) => estoqueApi.adicionarItemInventario(id, values), onSuccess: invalidate });
    const fecharMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => estoqueApi.fecharInventario(id, motivo), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => estoqueApi.cancelarInventario(id, motivo), onSuccess: invalidate });
    return { abrirMutation, adicionarItemMutation, fecharMutation, cancelarMutation };
};
