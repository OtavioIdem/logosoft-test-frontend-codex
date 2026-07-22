'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qualidadeApi } from '@/features/qualidade/api/qualidadeApi';
import { InspecoesListQuery, NaoConformidadesListQuery } from '@/features/qualidade/types/qualidade.types';

export const inspecoesQueryKey = (query?: InspecoesListQuery) => ['qualidade-inspecoes', query ?? {}] as const;
export const inspecaoDetalheQueryKey = (id?: string | null) => ['qualidade-inspecao', id ?? null] as const;
export const naoConformidadesQueryKey = (query?: NaoConformidadesListQuery) => ['qualidade-nao-conformidades', query ?? {}] as const;
export const naoConformidadeDetalheQueryKey = (id?: string | null) => ['qualidade-nao-conformidade', id ?? null] as const;

type IdValues = { id: string; values: unknown };

// ---- Inspeções ----
export const useInspecoes = (query: InspecoesListQuery = {}, enabled = true) =>
    useQuery({ queryKey: inspecoesQueryKey(query), queryFn: () => qualidadeApi.listarInspecoes(query), enabled });

export const useInspecao = (id?: string | null) =>
    useQuery({ queryKey: inspecaoDetalheQueryKey(id), queryFn: () => qualidadeApi.obterInspecao(id as string), enabled: Boolean(id) });

export const useInspecaoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['qualidade-inspecoes'] });
        queryClient.invalidateQueries({ queryKey: ['qualidade-inspecao'] });
        queryClient.invalidateQueries({ queryKey: ['qualidade-nao-conformidades'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => qualidadeApi.criarInspecao(values), onSuccess: invalidate });
    const criterioMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => qualidadeApi.adicionarCriterio(id, values), onSuccess: invalidate });
    const resultadoMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => qualidadeApi.registrarResultado(id, values), onSuccess: invalidate });
    const aprovarMutation = useMutation({ mutationFn: (id: string) => qualidadeApi.aprovarInspecao(id), onSuccess: invalidate });
    const reprovarMutation = useMutation({ mutationFn: ({ id, descricao }: { id: string; descricao: string }) => qualidadeApi.reprovarInspecao(id, descricao), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: ({ id, evidencia }: { id: string; evidencia: string }) => qualidadeApi.encerrarInspecao(id, evidencia), onSuccess: invalidate });
    return { criarMutation, criterioMutation, resultadoMutation, aprovarMutation, reprovarMutation, encerrarMutation };
};

// ---- Não-conformidades ----
export const useNaoConformidades = (query: NaoConformidadesListQuery = {}, enabled = true) =>
    useQuery({ queryKey: naoConformidadesQueryKey(query), queryFn: () => qualidadeApi.listarNaoConformidades(query), enabled });

export const useNaoConformidade = (id?: string | null) =>
    useQuery({ queryKey: naoConformidadeDetalheQueryKey(id), queryFn: () => qualidadeApi.obterNaoConformidade(id as string), enabled: Boolean(id) });

export const useNaoConformidadeMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['qualidade-nao-conformidades'] });
        queryClient.invalidateQueries({ queryKey: ['qualidade-nao-conformidade'] });
    };
    const acaoMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => qualidadeApi.adicionarAcao(id, values), onSuccess: invalidate });
    const iniciarMutation = useMutation({ mutationFn: ({ id, acaoId }: { id: string; acaoId: string }) => qualidadeApi.iniciarAcao(id, acaoId), onSuccess: invalidate });
    const concluirMutation = useMutation({ mutationFn: ({ id, acaoId }: { id: string; acaoId: string }) => qualidadeApi.concluirAcao(id, acaoId), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, acaoId, motivo }: { id: string; acaoId: string; motivo: string }) => qualidadeApi.cancelarAcao(id, acaoId, motivo), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: (id: string) => qualidadeApi.encerrarNaoConformidade(id), onSuccess: invalidate });
    return { acaoMutation, iniciarMutation, concluirMutation, cancelarMutation, encerrarMutation };
};
