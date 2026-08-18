'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { administracaoApi, AdministracaoApiError } from '@/features/administracao/api/administracaoApi';
import { AdministracaoListQuery } from '@/features/administracao/types/administracao.types';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import type { OrganizationalContextSnapshot } from '@/lib/http/organizationalContextPolicy';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';

export type AdministracaoResourceKey = 'empresas' | 'filiais' | 'setores' | 'cargos' | 'centros-custo';

type MutationPayload = { id?: string; values: unknown };
type InativarPayload = { id: string; motivo: string };
type ResourceApi = { list: (query?: AdministracaoListQuery, snapshot?: OrganizationalContextSnapshot) => Promise<unknown[]>; create: (values: unknown) => Promise<unknown>; update: (id: string, values: unknown) => Promise<unknown>; inativar: (id: string, motivo: string) => Promise<void> };
const toRecord = (value: unknown): Record<string, unknown> => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {});

const resourceApis: Record<AdministracaoResourceKey, ResourceApi> = {
    empresas: { list: administracaoApi.listarEmpresas, create: administracaoApi.criarEmpresa, update: administracaoApi.atualizarEmpresa, inativar: administracaoApi.inativarEmpresa },
    filiais: { list: (query, snapshot) => {
        if (!query?.empresaId || !snapshot) {
            throw new AdministracaoApiError({ code: 'OrganizationalContextRequired', message: 'Selecione uma empresa antes de consultar filiais.' });
        }
        return administracaoApi.listarFiliais({ ...query, empresaId: query.empresaId }, snapshot);
    }, create: administracaoApi.criarFilial, update: administracaoApi.atualizarFilial, inativar: administracaoApi.inativarFilial },
    setores: { list: administracaoApi.listarSetores, create: administracaoApi.criarSetor, update: administracaoApi.atualizarSetor, inativar: administracaoApi.inativarSetor },
    cargos: { list: administracaoApi.listarCargos, create: administracaoApi.criarCargo, update: administracaoApi.atualizarCargo, inativar: administracaoApi.inativarCargo },
    'centros-custo': { list: administracaoApi.listarCentrosCusto, create: administracaoApi.criarCentroCusto, update: administracaoApi.atualizarCentroCusto, inativar: administracaoApi.inativarCentroCusto }
};

export const useAdministracaoResource = (resourceKey: AdministracaoResourceKey, query: AdministracaoListQuery = {}) => {
    const queryClient = useQueryClient();
    const context = useOrganizationalContext();
    const { hasPermission } = usePermissions();
    const api = resourceApis[resourceKey];
    const isFiliaisResource = resourceKey === 'filiais';
    const empresaId = normalizeGuidOrNull(query.empresaId);
    const canConsultFiliais = context.snapshot.isMaster || hasPermission('ADMINISTRACAO_CONSULTAR');
    const contextMatches = Boolean(context.snapshot.empresaId && context.snapshot.empresaId === empresaId);
    const filiaisBlocked = isFiliaisResource && (!empresaId || !contextMatches || !canConsultFiliais);
    const filiaisBlockedMessage = !empresaId
        ? 'Selecione uma empresa no contexto organizacional antes de consultar filiais.'
        : !context.snapshot.empresaId
            ? 'Selecione uma empresa no contexto organizacional antes de consultar filiais.'
            : !contextMatches
            ? 'A empresa selecionada diverge do contexto ativo.'
            : 'Seu usuário não possui acesso para consultar filiais.';
    const queryKey = resourceKey === 'filiais'
        ? (['administracao', resourceKey, organizationalScopeKey(context.snapshot), query] as const)
        : (['administracao', resourceKey, query] as const);
    const listQuery = useQuery({
        queryKey,
        queryFn: async () => (await api.list(query, context.snapshot)).map(toRecord),
        enabled: !isFiliaisResource || (Boolean(empresaId) && contextMatches && canConsultFiliais)
    });
    const saveMutation = useMutation({ mutationFn: ({ id, values }: MutationPayload) => (id ? api.update(id, values) : api.create(values)), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['administracao', resourceKey] }) });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: InativarPayload) => api.inativar(id, motivo), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['administracao', resourceKey] }) });
    return { listQuery, saveMutation, inativarMutation, blocked: filiaisBlocked, blockedMessage: filiaisBlocked ? filiaisBlockedMessage : undefined };
};

export const useEmpresas = (query?: AdministracaoListQuery) => useAdministracaoResource('empresas', query);
export const useFiliais = (query?: AdministracaoListQuery) => useAdministracaoResource('filiais', query);
export const useSetores = (query?: AdministracaoListQuery) => useAdministracaoResource('setores', query);
export const useCargos = (query?: AdministracaoListQuery) => useAdministracaoResource('cargos', query);
export const useCentrosCusto = (query?: AdministracaoListQuery) => useAdministracaoResource('centros-custo', query);
