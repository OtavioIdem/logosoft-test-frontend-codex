'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { faturamentoApi } from '@/features/faturamento/api/faturamentoApi';
import { ConfirmarFaturamentoRequestValues, FaturamentosListQuery, ProntidaoFaturamentoQuery } from '@/features/faturamento/types/faturamento.types';

export const faturamentosQueryKey = (query?: FaturamentosListQuery) => ['faturamentos', query ?? {}] as const;
export const faturamentoDetalheQueryKey = (id?: string | null) => ['faturamento', id ?? null] as const;
export const faturamentoHistoricoQueryKey = (id?: string | null) => ['faturamento-historico', id ?? null] as const;
export const faturamentoOcorrenciasQueryKey = (id?: string | null) => ['faturamento-ocorrencias', id ?? null] as const;

// D97 (FT-9): `GET /api/faturamento` exige `EmpresaId` (`FaturamentoContracts.cs:144`, não anulável) e o
// backend recusa `Guid.Empty` com 400. Sem empresa resolvida, a consulta nem sai -- padrão de
// `usePedidosVenda` (D82/D88), quarta ocorrência da classe.
export const useFaturamentos = (query: FaturamentosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: faturamentosQueryKey(query), queryFn: () => faturamentoApi.listar(query), enabled: enabled && Boolean(query.empresaId) });

export const useFaturamento = (id?: string | null) =>
    useQuery({ queryKey: faturamentoDetalheQueryKey(id), queryFn: () => faturamentoApi.obter(id as string), enabled: Boolean(id) });

export const useFaturamentoHistorico = (id?: string | null) =>
    useQuery({ queryKey: faturamentoHistoricoQueryKey(id), queryFn: () => faturamentoApi.historico(id as string), enabled: Boolean(id) });

export const useFaturamentoOcorrencias = (id?: string | null) =>
    useQuery({ queryKey: faturamentoOcorrenciasQueryKey(id), queryFn: () => faturamentoApi.ocorrencias(id as string), enabled: Boolean(id) });

// D113: a chave carrega TODOS os parâmetros da consulta (valores ausentes viram null, para a chave ser estável).
// Resposta de parâmetros anteriores nunca serve de dado para os atuais: chave diferente, cache diferente.
export const faturamentoProntidaoQueryKey = (query?: ProntidaoFaturamentoQuery | null) =>
    [
        'faturamento-prontidao',
        {
            pedidoVendaId: query?.pedidoVendaId ?? null,
            naturezaOperacaoId: query?.naturezaOperacaoId || null,
            serie: query?.serie?.trim() || null,
            tipoDocumento: query?.tipoDocumento ?? null,
            numero: query?.numero?.trim() || null,
            condicaoPagamentoId: query?.condicaoPagamentoId || null
        }
    ] as const;

// Sem retry (falha bloqueia o Confirmar e o operador usa "Reconferir"), sem staleTime e sem placeholderData: a tela só
// habilita ação com resposta fresca dos parâmetros atuais. `gcTime: 0` descarta a resposta quando ninguém a observa.
export const useProntidaoFaturamento = (query: ProntidaoFaturamentoQuery | null, enabled = true) =>
    useQuery({
        queryKey: faturamentoProntidaoQueryKey(query),
        queryFn: () => faturamentoApi.prontidao(query as ProntidaoFaturamentoQuery),
        enabled: enabled && Boolean(query?.pedidoVendaId),
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always'
    });

type IdValues = { id: string; values: unknown };

export const useFaturamentoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['faturamentos'] });
        queryClient.invalidateQueries({ queryKey: ['faturamento'] });
        queryClient.invalidateQueries({ queryKey: ['faturamento-historico'] });
        queryClient.invalidateQueries({ queryKey: ['faturamento-ocorrencias'] });
        // D113/AJ-37: invalida e refaz o GET da prontidão; nunca setQueryData com a resposta de uma mutação.
        queryClient.invalidateQueries({ queryKey: ['faturamento-prontidao'] });
        queryClient.invalidateQueries({ queryKey: ['faturamento-nota-rejeicao'] });
    };

    const prepararMutation = useMutation({ mutationFn: (values: unknown) => faturamentoApi.preparar(values), onSuccess: invalidate });
    // D27: confirmar, cancelar e retomar reconsultam também no erro — é o que deixa o leg EmReversao visível de novo.
    const confirmarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: ConfirmarFaturamentoRequestValues }) => faturamentoApi.confirmar(id, values), onSettled: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => faturamentoApi.cancelar(id, motivo), onSettled: invalidate });
    const retomarReversaoMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => faturamentoApi.retomarReversao(id, values), onSettled: invalidate });

    return { prepararMutation, confirmarMutation, cancelarMutation, retomarReversaoMutation };
};
