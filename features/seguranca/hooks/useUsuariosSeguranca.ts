'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { segurancaApi } from '@/features/seguranca/api/segurancaApi';

export const usuariosQueryKey = ['seguranca', 'usuarios'] as const;

export const useUsuariosSeguranca = () =>
    useQuery({
        queryKey: usuariosQueryKey,
        queryFn: () => segurancaApi.listarUsuarios(),
        staleTime: 30_000
    });

export const useCriarUsuarioSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: segurancaApi.criarUsuario,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: usuariosQueryKey })
    });
};
