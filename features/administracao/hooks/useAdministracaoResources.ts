'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';
import { AdministracaoListQuery } from '@/features/administracao/types/administracao.types';

export type AdministracaoResourceKey = 'empresas' | 'filiais' | 'setores' | 'cargos' | 'centros-custo';

type MutationPayload = { id?: string; values: unknown };
type InativarPayload = { id: string; motivo: string };
type ResourceApi = { list: (query?: AdministracaoListQuery) => Promise<unknown[]>; create: (values: unknown) => Promise<unknown>; update: (id: string, values: unknown) => Promise<unknown>; inativar: (id: string, motivo: string) => Promise<void> };
const toRecord = (value: unknown): Record<string, unknown> => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {});

const resourceApis: Record<AdministracaoResourceKey, ResourceApi> = {
    empresas: { list: administracaoApi.listarEmpresas, create: administracaoApi.criarEmpresa, update: administracaoApi.atualizarEmpresa, inativar: administracaoApi.inativarEmpresa },
    filiais: { list: administracaoApi.listarFiliais, create: administracaoApi.criarFilial, update: administracaoApi.atualizarFilial, inativar: administracaoApi.inativarFilial },
    setores: { list: administracaoApi.listarSetores, create: administracaoApi.criarSetor, update: administracaoApi.atualizarSetor, inativar: administracaoApi.inativarSetor },
    cargos: { list: administracaoApi.listarCargos, create: administracaoApi.criarCargo, update: administracaoApi.atualizarCargo, inativar: administracaoApi.inativarCargo },
    'centros-custo': { list: administracaoApi.listarCentrosCusto, create: administracaoApi.criarCentroCusto, update: administracaoApi.atualizarCentroCusto, inativar: administracaoApi.inativarCentroCusto }
};

export const useAdministracaoResource = (resourceKey: AdministracaoResourceKey, query: AdministracaoListQuery = {}) => {
    const queryClient = useQueryClient();
    const api = resourceApis[resourceKey];
    const queryKey = ['administracao', resourceKey, query] as const;
    const listQuery = useQuery({ queryKey, queryFn: async () => (await api.list(query)).map(toRecord) });
    const saveMutation = useMutation({ mutationFn: ({ id, values }: MutationPayload) => (id ? api.update(id, values) : api.create(values)), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['administracao', resourceKey] }) });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: InativarPayload) => api.inativar(id, motivo), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['administracao', resourceKey] }) });
    return { listQuery, saveMutation, inativarMutation };
};

export const useEmpresas = (query?: AdministracaoListQuery) => useAdministracaoResource('empresas', query);
export const useFiliais = (query?: AdministracaoListQuery) => useAdministracaoResource('filiais', query);
export const useSetores = (query?: AdministracaoListQuery) => useAdministracaoResource('setores', query);
export const useCargos = (query?: AdministracaoListQuery) => useAdministracaoResource('cargos', query);
export const useCentrosCusto = (query?: AdministracaoListQuery) => useAdministracaoResource('centros-custo', query);
