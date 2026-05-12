'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';
import { EmpresaResponse, FilialResponse, SetorResponse } from '@/features/administracao/types/administracao.types';
import { SelectOption } from '@/types/erp';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';

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
    const query = useQuery({
        queryKey: ['administracao', 'filiais', 'select', normalizedEmpresaId],
        queryFn: () => administracaoApi.listarFiliais({ empresaId: normalizedEmpresaId }),
        enabled: Boolean(normalizedEmpresaId),
        placeholderData: [],
        staleTime: 5 * 60 * 1000
    });
    const options = useMemo<SelectOption<string>[]>(() => optionsFrom(query.data, filialLabel), [query.data]);
    return { ...query, options };
};

export const useTodasFiliaisOptions = () => {
    const query = useQuery({ queryKey: ['administracao', 'filiais', 'select', 'todas'], queryFn: () => administracaoApi.listarFiliais(), placeholderData: [], staleTime: 5 * 60 * 1000 });
    const options = useMemo<SelectOption<string>[]>(() => optionsFrom(query.data, filialLabel), [query.data]);
    return { ...query, options };
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
