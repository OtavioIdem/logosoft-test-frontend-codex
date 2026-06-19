'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { segurancaApi } from '@/features/seguranca/api/segurancaApi';
import { SegurancaListQuery } from '@/features/seguranca/types/seguranca.types';

export const usuariosQueryKey = ['seguranca', 'usuarios'] as const;
export const gruposAcessoQueryKey = ['seguranca', 'grupos-acesso'] as const;

const invalidateSeguranca = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: usuariosQueryKey });
    queryClient.invalidateQueries({ queryKey: gruposAcessoQueryKey });
};

export const useUsuariosSeguranca = (query?: SegurancaListQuery) =>
    useQuery({
        queryKey: [...usuariosQueryKey, query ?? {}],
        queryFn: () => segurancaApi.listarUsuarios(query),
        staleTime: 30_000
    });

export const useGruposAcessoSeguranca = (query?: SegurancaListQuery) =>
    useQuery({
        queryKey: [...gruposAcessoQueryKey, query ?? {}],
        queryFn: () => segurancaApi.listarGruposAcesso(query),
        staleTime: 30_000
    });

export const useCriarUsuarioSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: segurancaApi.criarUsuario,
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};

export const useInativarUsuarioSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, motivo }: { id: string; motivo: string }) => segurancaApi.inativarUsuario(id, motivo),
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};

export const useReativarUsuarioSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, motivo }: { id: string; motivo: string }) => segurancaApi.reativarUsuario(id, motivo),
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};

export const useResetSenhaUsuarioSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, values }: { id: string; values: Parameters<typeof segurancaApi.resetarSenhaUsuario>[1] }) => segurancaApi.resetarSenhaUsuario(id, values),
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};

export const useVincularGrupoUsuarioSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, values }: { id: string; values: Parameters<typeof segurancaApi.vincularGrupoUsuario>[1] }) => segurancaApi.vincularGrupoUsuario(id, values),
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};

export const useRemoverGrupoUsuarioSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, grupoAcessoId, motivo }: { id: string; grupoAcessoId: string; motivo: string }) => segurancaApi.removerGrupoUsuario(id, grupoAcessoId, motivo),
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};

export const useCriarGrupoAcessoSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: segurancaApi.criarGrupoAcesso,
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};

export const useAtualizarGrupoAcessoSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, values }: { id: string; values: Parameters<typeof segurancaApi.atualizarGrupoAcesso>[1] }) => segurancaApi.atualizarGrupoAcesso(id, values),
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};

export const useInativarGrupoAcessoSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, motivo }: { id: string; motivo: string }) => segurancaApi.inativarGrupoAcesso(id, motivo),
        onSuccess: () => invalidateSeguranca(queryClient)
    });
};
