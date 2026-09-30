'use client';

// Hooks das buscas de NCM e CFOP dos selects (v1.11.0a8b72, D99; debounce da D52). Antes em `useTributacao.ts`.
// Dependem de `FISCAL_CADASTROS_CONSULTAR`, que é permissão de OUTRO módulo para quem chama de Tributação: sem
// ela a query nem sai e o select mostra a indisponibilidade em vez de empurrar um 403.
//
// Debounce: o termo digitado só vira parâmetro da query depois de 350 ms parado (mesmo prazo das demais
// buscas do app). `isBuscando` cobre a espera e a requisição, para o select não parecer vazio nesse intervalo.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { cadastrosFiscaisApi } from '@/features/fiscal/api/cadastrosFiscaisApi';
import { CfopBuscaFiltros } from '@/features/fiscal/types/cadastrosFiscais.types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SelectOption } from '@/types/erp';

export const CADASTROS_FISCAIS_DEBOUNCE_MS = 350;
export const CADASTROS_FISCAIS_PERMISSAO = 'FISCAL_CADASTROS_CONSULTAR' as const;

export const ncmOptionsQueryKey = (termo?: string | null) => ['fiscal', 'cadastros', 'ncm', termo ?? null] as const;
export const cfopOptionsQueryKey = (termo?: string | null, filtros: CfopBuscaFiltros = {}) => ['fiscal', 'cadastros', 'cfop', termo ?? null, filtros.ambito ?? null, filtros.tipo ?? null] as const;

export const useNcmOptions = (termo?: string | null) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(CADASTROS_FISCAIS_PERMISSAO);
    const termoAplicado = useDebouncedValue(termo || null, CADASTROS_FISCAIS_DEBOUNCE_MS);

    const query = useQuery({
        queryKey: ncmOptionsQueryKey(termoAplicado),
        queryFn: () => cadastrosFiscaisApi.listarNcm(termoAplicado),
        enabled: permitido
    });

    const itens = useMemo(() => query.data?.items ?? [], [query.data]);
    const options = useMemo<SelectOption<string>[]>(() => itens.map((item) => ({ label: `${item.codigo} — ${item.descricao}`, value: item.id })), [itens]);

    return { ...query, options, permitido, itens, isBuscando: query.isFetching || (termo || null) !== termoAplicado };
};

export const useCfopOptions = (termo?: string | null, filtros: CfopBuscaFiltros = {}) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(CADASTROS_FISCAIS_PERMISSAO);
    const termoAplicado = useDebouncedValue(termo || null, CADASTROS_FISCAIS_DEBOUNCE_MS);

    const query = useQuery({
        queryKey: cfopOptionsQueryKey(termoAplicado, filtros),
        queryFn: () => cadastrosFiscaisApi.listarCfop(termoAplicado, filtros),
        enabled: permitido
    });

    const itens = useMemo(() => query.data?.items ?? [], [query.data]);
    const options = useMemo<SelectOption<string>[]>(() => itens.map((item) => ({ label: `${item.codigo} — ${item.descricao}`, value: item.id })), [itens]);

    return { ...query, options, permitido, itens, isBuscando: query.isFetching || (termo || null) !== termoAplicado };
};
