'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { segurancaApi } from '@/features/seguranca/api/segurancaApi';
import { AcessoEfetivoUsuario, SegurancaListQuery } from '@/features/seguranca/types/seguranca.types';

export const usuariosQueryKey = ['seguranca', 'usuarios'] as const;
export const gruposAcessoQueryKey = ['seguranca', 'grupos-acesso'] as const;

const invalidateSeguranca = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: usuariosQueryKey });
    queryClient.invalidateQueries({ queryKey: gruposAcessoQueryKey });
};

export const usuarioPermissoesEfetivasQueryKey = (usuarioId: string, escopo: string) => ['seguranca', 'usuarios', usuarioId, 'permissoes-efetivas', escopo] as const;

/**
 * Acesso efetivo do usuário no escopo empresa/filial. Como o backend não devolve grupos em
 * `UsuarioResponse`, os grupos vinculados são derivados de `origens[].grupoAcessoId`. Quando o
 * backend confirma permissões mas não devolve origem, `origemIndisponivel` fica true para a tela
 * explicar o motivo em vez de exibir "-".
 */
export const usePermissoesEfetivasUsuario = (
    usuarioId: string | null,
    scope: { empresaId: string | null; filialId: string | null },
    habilitado: boolean,
    resolverNomeGrupo: (grupoAcessoId: string) => string
) =>
    useQuery({
        queryKey: usuarioPermissoesEfetivasQueryKey(usuarioId ?? '', `${scope.empresaId ?? ''}|${scope.filialId ?? ''}`),
        queryFn: async (): Promise<AcessoEfetivoUsuario> => {
            const data = await segurancaApi.obterPermissoesEfetivasUsuario(usuarioId as string, { empresaId: scope.empresaId as string, filialId: scope.filialId });
            const idsGrupos = Array.from(new Set(data.origens.map((origem) => origem.grupoAcessoId).filter(Boolean)));
            return {
                grupos: idsGrupos.map((id) => ({ id, nome: resolverNomeGrupo(id) })),
                totalPermissoes: data.permissoes.length,
                origemIndisponivel: idsGrupos.length === 0 && data.permissoes.length > 0
            };
        },
        enabled: Boolean(usuarioId && scope.empresaId) && habilitado,
        staleTime: 30_000
    });

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
        onSuccess: (_data, variables) => {
            invalidateSeguranca(queryClient);
            queryClient.invalidateQueries({ queryKey: ['seguranca', 'usuarios', variables.id, 'permissoes-efetivas'] });
        }
    });
};

export const useRemoverGrupoUsuarioSeguranca = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, grupoAcessoId, motivo }: { id: string; grupoAcessoId: string; motivo: string }) => segurancaApi.removerGrupoUsuario(id, grupoAcessoId, motivo),
        onSuccess: (_data, variables) => {
            invalidateSeguranca(queryClient);
            queryClient.invalidateQueries({ queryKey: ['seguranca', 'usuarios', variables.id, 'permissoes-efetivas'] });
        }
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
