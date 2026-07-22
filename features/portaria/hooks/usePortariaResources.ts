'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portariaApi } from '@/features/portaria/api/portariaApi';
import { OcorrenciasListQuery, PreAutorizacoesListQuery, RegistrosAcessoListQuery } from '@/features/portaria/types/portaria.types';

export const preAutorizacoesQueryKey = (query?: PreAutorizacoesListQuery) => ['portaria-pre-autorizacoes', query ?? {}] as const;
export const registrosQueryKey = (query?: RegistrosAcessoListQuery) => ['portaria-registros', query ?? {}] as const;
export const ocorrenciasQueryKey = (query?: OcorrenciasListQuery) => ['portaria-ocorrencias', query ?? {}] as const;

type IdValues = { id: string; values: unknown };
type IdMotivo = { id: string; motivo: string };

// ---- Pré-autorizações ----
export const usePreAutorizacoes = (query: PreAutorizacoesListQuery = {}, enabled = true) =>
    useQuery({ queryKey: preAutorizacoesQueryKey(query), queryFn: () => portariaApi.listarPreAutorizacoes(query), enabled });

export const usePreAutorizacaoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['portaria-pre-autorizacoes'] });
    const criarMutation = useMutation({ mutationFn: (values: unknown) => portariaApi.criarPreAutorizacao(values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => portariaApi.cancelarPreAutorizacao(id, motivo), onSuccess: invalidate });
    return { criarMutation, cancelarMutation };
};

// ---- Registros de acesso ----
export const useRegistrosAcesso = (query: RegistrosAcessoListQuery = {}, enabled = true) =>
    useQuery({ queryKey: registrosQueryKey(query), queryFn: () => portariaApi.listarRegistros(query), enabled });

export const useRegistroAcessoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['portaria-registros'] });
    const entradaMutation = useMutation({ mutationFn: (values: unknown) => portariaApi.registrarEntrada(values), onSuccess: invalidate });
    const validarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => portariaApi.validarDocumento(id, values), onSuccess: invalidate });
    const saidaMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => portariaApi.registrarSaida(id, values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => portariaApi.cancelarRegistro(id, motivo), onSuccess: invalidate });
    return { entradaMutation, validarMutation, saidaMutation, cancelarMutation };
};

// ---- Ocorrências ----
export const useOcorrencias = (query: OcorrenciasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: ocorrenciasQueryKey(query), queryFn: () => portariaApi.listarOcorrencias(query), enabled });

export const useOcorrenciaMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['portaria-ocorrencias'] });
    const registrarMutation = useMutation({ mutationFn: (values: unknown) => portariaApi.registrarOcorrencia(values), onSuccess: invalidate });
    const resolverMutation = useMutation({ mutationFn: ({ id, resolucao }: { id: string; resolucao: string }) => portariaApi.resolverOcorrencia(id, resolucao), onSuccess: invalidate });
    return { registrarMutation, resolverMutation };
};
