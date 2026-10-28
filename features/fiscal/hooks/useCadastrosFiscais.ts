'use client';

// Hooks das buscas de NCM e CFOP dos selects (v1.11.0a8b72, D99; debounce da D52). Antes em `useTributacao.ts`.
// Dependem de `FISCAL_CADASTROS_CONSULTAR`, que é permissão de OUTRO módulo para quem chama de Tributação: sem
// ela a query nem sai e o select mostra a indisponibilidade em vez de empurrar um 403.
//
// Debounce: o termo digitado só vira parâmetro da query depois de 350 ms parado (mesmo prazo das demais
// buscas do app). `isBuscando` cobre a espera e a requisição, para o select não parecer vazio nesse intervalo.

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { cadastrosFiscaisApi } from '@/features/fiscal/api/cadastrosFiscaisApi';
import { CfopBuscaFiltros } from '@/features/fiscal/types/cadastrosFiscais.types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SelectOption } from '@/types/erp';

export const CADASTROS_FISCAIS_DEBOUNCE_MS = 350;
export const CADASTROS_FISCAIS_PERMISSAO = 'FISCAL_CADASTROS_CONSULTAR' as const;

export const ncmOptionsQueryKey = (termo?: string | null) => ['fiscal', 'cadastros', 'ncm', termo ?? null] as const;
export const cfopOptionsQueryKey = (termo?: string | null, filtros: CfopBuscaFiltros = {}) => ['fiscal', 'cadastros', 'cfop', termo ?? null, filtros.ambito ?? null, filtros.tipo ?? null] as const;

export const origensMercadoriaQueryKey = () => ['fiscal', 'cadastros', 'origens-mercadoria'] as const;
export const vinculosNcmCestQueryKey = (ncmCodigo?: string | null) => ['fiscal', 'cadastros', 'ncm-cest', ncmCodigo ?? null] as const;
export const cestPorCodigoQueryKey = (codigo?: string | null) => ['fiscal', 'cadastros', 'cest', 'codigo', codigo ?? null] as const;

const CADASTROS_FISCAIS_STALE_MS = 5 * 60 * 1000;

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

/**
 * Origem da mercadoria (`'0'` a `'8'`): tabela fechada de 9 itens, carregada inteira. O `value` é o CÓDIGO, que é o que
 * o backend resolve no produto. Sem `FISCAL_CADASTROS_CONSULTAR` a query nem sai (`permitido: false`).
 */
export const useOrigensMercadoria = (habilitado = true) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(CADASTROS_FISCAIS_PERMISSAO);

    const query = useQuery({
        queryKey: origensMercadoriaQueryKey(),
        queryFn: () => cadastrosFiscaisApi.listarOrigensMercadoria(),
        enabled: permitido && habilitado,
        staleTime: CADASTROS_FISCAIS_STALE_MS
    });

    const options = useMemo<SelectOption<string>[]>(() => (query.data?.items ?? []).map((item) => ({ label: `${item.codigo} — ${item.descricao}`, value: item.codigo })), [query.data]);

    return { ...query, options, permitido };
};

/**
 * CEST aceitos para um NCM: vêm dos vínculos `ncm-cest` do NCM informado (pelo código). O `value` é o código do CEST.
 * `exigeCest` só é verdadeiro depois que a consulta responde com ao menos um vínculo; antes disso (carregando ou com
 * erro) o campo mostra o estado real em vez de afirmar que o NCM não exige CEST. A descrição de cada CEST vem de
 * `/cest?codigo=`, uma consulta por vínculo; se uma delas falha, o rótulo é só o código (a opção continua válida).
 */
export const useCestPorNcm = (ncmCodigo?: string | null, habilitado = true) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(CADASTROS_FISCAIS_PERMISSAO);
    const escopo = ncmCodigo || null;

    const vinculos = useQuery({
        queryKey: vinculosNcmCestQueryKey(escopo),
        queryFn: () => cadastrosFiscaisApi.listarVinculosNcmCest(escopo as string),
        enabled: permitido && habilitado && Boolean(escopo),
        staleTime: CADASTROS_FISCAIS_STALE_MS
    });

    const codigos = useMemo(() => Array.from(new Set((vinculos.data?.items ?? []).map((item) => item.cestCodigo))), [vinculos.data]);
    const descricoes = useQueries({
        queries: codigos.map((codigo) => ({
            queryKey: cestPorCodigoQueryKey(codigo),
            queryFn: () => cadastrosFiscaisApi.obterCestPorCodigo(codigo),
            staleTime: CADASTROS_FISCAIS_STALE_MS,
            retry: 1
        }))
    });
    // `descricoes` muda de identidade a cada render; esta chave estável (JSON, sem ambiguidade de separador) resume o conteúdo.
    const descricaoPorCodigo = JSON.stringify(descricoes.map((consulta) => consulta.data?.descricao ?? ''));

    const options = useMemo<SelectOption<string>[]>(() => {
        const textos = JSON.parse(descricaoPorCodigo) as string[];
        return codigos.map((codigo, indice) => ({ label: [codigo, textos[indice]].filter(Boolean).join(' — '), value: codigo }));
    }, [codigos, descricaoPorCodigo]);

    const exigeCest = vinculos.isSuccess && codigos.length > 0;
    const semVinculos = vinculos.isSuccess && codigos.length === 0;
    const parcial = vinculos.isSuccess && (vinculos.data?.totalItems ?? 0) > (vinculos.data?.items.length ?? 0);

    return { ...vinculos, options, codigos, permitido, exigeCest, semVinculos, parcial, descricoesCarregando: descricoes.some((consulta) => consulta.isFetching) };
};
