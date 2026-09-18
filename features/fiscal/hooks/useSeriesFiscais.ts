'use client';

// Hooks React Query da fatia Séries fiscais (v1.11.0a8b58, F3.1). Segue `useFiscalResources.ts`: `queryKey`
// exportada como função, `enabled` amarrado ao escopo, mutação invalida a família da chave.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { seriesFiscaisApi } from '@/features/fiscal/api/seriesFiscaisApi';
import { SerieFiscalListQuery } from '@/features/fiscal/types/seriesFiscais.types';

const SERIES_FISCAIS_ROOT_KEY = ['fiscal', 'series'] as const;

// AC-5: a chave leva o escopo organizacional (`organizationalScopeKey`) e a query -- troca de empresa/filial
// dispara refetch em vez de reaproveitar a página anterior (SB5).
export const seriesFiscaisQueryKey = (organizationalScopeKey: string, query: SerieFiscalListQuery) => [...SERIES_FISCAIS_ROOT_KEY, 'lista', organizationalScopeKey, query] as const;

export const seriesFiscaisOpcoesQueryKey = (scope: { empresaId?: string | null; filialId?: string | null; modeloDocumentoFiscalId?: string | null }) => [...SERIES_FISCAIS_ROOT_KEY, 'opcoes', scope] as const;

export const serieFiscalBuracosQueryKey = (id?: string | null) => [...SERIES_FISCAIS_ROOT_KEY, 'buracos', id ?? null] as const;

// AC-7 (armadilha 1): sem `empresaId` a query nem sai -- o backend exige o parâmetro e a tela orienta a
// escolher o contexto em vez de deixar a chamada falhar.
export const useSeriesFiscais = (organizationalScopeKey: string, query: SerieFiscalListQuery) =>
    useQuery({
        queryKey: seriesFiscaisQueryKey(organizationalScopeKey, query),
        queryFn: () => seriesFiscaisApi.listar(query),
        enabled: Boolean(query.empresaId)
    });

// AC-15 (combo da nota): mesma listagem, sempre `somenteAtivas=true` e página cheia; só sai com empresa e
// modelo resolvidos. `empresaId` aceita `null`/`undefined` aqui porque o campo da nota ainda não tem
// contexto obrigatório antes de o operador escolher empresa/pedido -- a query fica `enabled: false` até lá.
type SeriesFiscaisOpcoesQuery = Omit<SerieFiscalListQuery, 'empresaId'> & { empresaId?: string | null; habilitado: boolean };

export const useSeriesFiscaisOpcoes = (query: SeriesFiscaisOpcoesQuery) =>
    useQuery({
        queryKey: seriesFiscaisOpcoesQueryKey({ empresaId: query.empresaId, filialId: query.filialId, modeloDocumentoFiscalId: query.modeloDocumentoFiscalId }),
        queryFn: () => seriesFiscaisApi.listar({ ...query, empresaId: query.empresaId ?? '', somenteAtivas: true, tamanhoPagina: 100 }),
        enabled: query.habilitado && Boolean(query.empresaId) && Boolean(query.modeloDocumentoFiscalId)
    });

// AC-13 (armadilha 5, SB6): `enabled: false` sempre -- a consulta só sai pelo `refetch()` explícito do
// clique em "Consultar buracos", nunca ao abrir a tela/diálogo ou ao listar.
export const useSerieFiscalBuracos = (id?: string | null) =>
    useQuery({
        queryKey: serieFiscalBuracosQueryKey(id),
        queryFn: () => seriesFiscaisApi.buracos(id ?? ''),
        enabled: false
    });

// AC-5/P-14a: `onSettled` invalida a família `['fiscal','series']` mesmo quando a mutação falha -- dado
// velho na tela é pior que um refetch a mais.
export const useSeriesFiscaisMutations = () => {
    const queryClient = useQueryClient();
    const invalidateSeries = () => queryClient.invalidateQueries({ queryKey: SERIES_FISCAIS_ROOT_KEY });

    const criarMutation = useMutation({
        mutationFn: (values: unknown) => seriesFiscaisApi.criar(values),
        onSettled: invalidateSeries
    });

    const ampliarMutation = useMutation({
        mutationFn: ({ id, numeroFinalAtual, values }: { id: string; numeroFinalAtual: number; values: unknown }) => seriesFiscaisApi.ampliar(id, numeroFinalAtual, values),
        onSettled: invalidateSeries
    });

    const encerrarVigenciaMutation = useMutation({
        mutationFn: ({ id, vigenciaInicioSerie, values }: { id: string; vigenciaInicioSerie: string; values: unknown }) => seriesFiscaisApi.encerrarVigencia(id, vigenciaInicioSerie, values),
        onSettled: invalidateSeries
    });

    const inativarMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: unknown }) => seriesFiscaisApi.inativar(id, values),
        onSettled: invalidateSeries
    });

    return { criarMutation, ampliarMutation, encerrarVigenciaMutation, inativarMutation };
};
