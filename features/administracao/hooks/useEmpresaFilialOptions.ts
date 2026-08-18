'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';
import { EmpresaResponse, FilialResponse, SetorResponse } from '@/features/administracao/types/administracao.types';
import { SelectOption } from '@/types/erp';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';

const empresaLabel = (empresa: EmpresaResponse) => [empresa.nomeFantasia, empresa.razaoSocial, empresa.documento].filter(Boolean).join(' • ');
const filialLabel = (filial: FilialResponse) => [filial.nome, filial.documento].filter(Boolean).join(' • ');
const setorLabel = (setor: SetorResponse) => [setor.nome, setor.descricao].filter(Boolean).join(' • ');

const optionsFrom = <T extends { id: string }>(items: T[] | undefined, labelFactory: (item: T) => string): SelectOption<string>[] =>
    (items ?? []).map((item) => ({ label: labelFactory(item), value: item.id }));

export const useEmpresasOptions = () => {
    const query = useQuery({ queryKey: ['administracao', 'empresas', 'select'], queryFn: administracaoApi.listarEmpresas, staleTime: 5 * 60 * 1000 });
    const options = useMemo<SelectOption<string>[]>(() => optionsFrom(query.data, empresaLabel), [query.data]);
    return { ...query, options };
};

export const useFiliaisOptions = (empresaId?: string | null) => {
    const normalizedEmpresaId = normalizeGuidOrNull(empresaId);
    const context = useOrganizationalContext();
    const { hasPermission } = usePermissions();
    const canConsultRemotely = context.snapshot.isMaster || hasPermission('ADMINISTRACAO_CONSULTAR');
    const contextMatches = Boolean(context.snapshot.empresaId && context.snapshot.empresaId === normalizedEmpresaId);
    const localFiliais: FilialResponse[] = !canConsultRemotely && context.snapshot.filialId && contextMatches ? [{ id: context.snapshot.filialId, empresaId: normalizedEmpresaId as string, nome: 'Filial atual', documento: '' }] : [];
    const blocked = Boolean(normalizedEmpresaId) && (!contextMatches || (!canConsultRemotely && !context.snapshot.filialId));
    const blockedMessage = !context.snapshot.empresaId ? 'Selecione a empresa no contexto organizacional antes de consultar filiais.' : !contextMatches ? 'A empresa selecionada diverge do contexto ativo.' : 'Seu usuário não possui acesso para consultar filiais.';
    const query = useQuery({
        queryKey: ['administracao', 'filiais', 'select', organizationalScopeKey(context.snapshot), normalizedEmpresaId],
        queryFn: () => administracaoApi.listarFiliais({ empresaId: normalizedEmpresaId as string }, context.snapshot),
        enabled: Boolean(normalizedEmpresaId) && canConsultRemotely && contextMatches,
        placeholderData: [],
        staleTime: 5 * 60 * 1000
    });
    const options = useMemo<SelectOption<string>[]>(() => localFiliais.length ? optionsFrom(localFiliais, filialLabel) : optionsFrom(query.data, filialLabel), [localFiliais, query.data]);
    return { ...query, data: localFiliais.length ? localFiliais : query.data, options, blocked, blockedMessage };
};

export const useTodasFiliaisOptions = (empresaId?: string | null) => {
    const normalizedEmpresaId = normalizeGuidOrNull(empresaId);
    const context = useOrganizationalContext();
    const { hasPermission } = usePermissions();
    const canConsultRemotely = context.snapshot.isMaster || hasPermission('ADMINISTRACAO_CONSULTAR');
    const contextMatches = Boolean(context.snapshot.empresaId && context.snapshot.empresaId === normalizedEmpresaId);
    const localFiliais: FilialResponse[] = !canConsultRemotely && context.snapshot.filialId && contextMatches ? [{ id: context.snapshot.filialId, empresaId: normalizedEmpresaId as string, nome: 'Filial atual', documento: '' }] : [];
    const blocked = Boolean(normalizedEmpresaId) && (!contextMatches || (!canConsultRemotely && !context.snapshot.filialId));
    const blockedMessage = !context.snapshot.empresaId ? 'Selecione a empresa no contexto organizacional antes de consultar filiais.' : !contextMatches ? 'A empresa selecionada diverge do contexto ativo.' : 'Seu usuário não possui acesso para consultar filiais.';
    const query = useQuery({
        queryKey: ['administracao', 'filiais', 'select', 'todas', organizationalScopeKey(context.snapshot), normalizedEmpresaId],
        queryFn: () => administracaoApi.listarFiliais({ empresaId: normalizedEmpresaId as string }, context.snapshot),
        enabled: Boolean(normalizedEmpresaId) && canConsultRemotely && contextMatches,
        placeholderData: [],
        staleTime: 5 * 60 * 1000
    });
    const options = useMemo<SelectOption<string>[]>(() => localFiliais.length ? optionsFrom(localFiliais, filialLabel) : optionsFrom(query.data, filialLabel), [localFiliais, query.data]);
    return { ...query, data: localFiliais.length ? localFiliais : query.data, options, blocked, blockedMessage };
};

export const useSetoresOptions = (empresaId?: string | null, filialId?: string | null) => {
    const normalizedEmpresaId = normalizeGuidOrNull(empresaId);
    const normalizedFilialId = normalizeGuidOrNull(filialId);
    const query = useQuery({
        queryKey: ['administracao', 'setores', 'select', normalizedEmpresaId, normalizedFilialId],
        queryFn: () => administracaoApi.listarSetores({ empresaId: normalizedEmpresaId, filialId: normalizedFilialId }),
        enabled: Boolean(normalizedEmpresaId),
        placeholderData: [],
        staleTime: 5 * 60 * 1000
    });
    const options = useMemo<SelectOption<string>[]>(() => optionsFrom(query.data, setorLabel), [query.data]);
    return { ...query, options };
};

export const useTodosSetoresOptions = () => {
    const query = useQuery({ queryKey: ['administracao', 'setores', 'select', 'todos'], queryFn: () => administracaoApi.listarSetores(), placeholderData: [], staleTime: 5 * 60 * 1000 });
    const options = useMemo<SelectOption<string>[]>(() => optionsFrom(query.data, setorLabel), [query.data]);
    return { ...query, options };
};
