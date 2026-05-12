'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeiroApi } from '@/features/financeiro/api/financeiroApi';
import {
    CondicaoPagamentoFormValues,
    CondicaoPagamentoResponse,
    ContaPagarFormValues,
    ContaReceberFormValues,
    FinanceiroListQuery,
    FormaPagamentoFormValues,
    FormaPagamentoResponse
} from '@/features/financeiro/types/financeiro.types';
import { SelectOption } from '@/types/erp';

type SaveFormaPayload = { id?: string; values: FormaPagamentoFormValues };
type SaveCondicaoPayload = { id?: string; values: CondicaoPagamentoFormValues };
type ReasonPayload = { id: string; motivo: string };
type ContaReceberPayload = { values: ContaReceberFormValues };
type ContaPagarPayload = { values: ContaPagarFormValues };
type ContaActionPayload = { id: string; values: unknown };
type ContaReasonPayload = { id: string; motivo: string };
type GerarPedidoPayload = { pedidoVendaId: string; values: unknown };

export const formasPagamentoQueryKey = (empresaId?: string | null) => ['financeiro', 'formas-pagamento', empresaId ?? null] as const;
export const condicoesPagamentoQueryKey = (empresaId?: string | null) => ['financeiro', 'condicoes-pagamento', empresaId ?? null] as const;
export const contasReceberQueryKey = (query?: FinanceiroListQuery) => ['financeiro', 'contas-receber', query] as const;
export const contasPagarQueryKey = (query?: FinanceiroListQuery) => ['financeiro', 'contas-pagar', query] as const;

const formaLabel = (forma: FormaPagamentoResponse) => `${forma.codigo} • ${forma.nome}`;
const condicaoLabel = (condicao: CondicaoPagamentoResponse) => `${condicao.codigo} • ${condicao.nome}`;

export const useFormasPagamento = (empresaId?: string | null) =>
    useQuery({
        queryKey: formasPagamentoQueryKey(empresaId),
        queryFn: () => financeiroApi.listarFormasPagamento({ empresaId })
    });

export const useFormasPagamentoOptions = (empresaId?: string | null, mode: 'recebimento' | 'pagamento' | 'ambos' = 'ambos') => {
    const query = useFormasPagamento(empresaId);
    const options = useMemo<SelectOption<string>[]>(() => {
        const items = query.data ?? [];
        return items
            .filter((forma) => {
                if (mode === 'recebimento') return forma.permiteRecebimento;
                if (mode === 'pagamento') return forma.permitePagamento;
                return forma.permiteRecebimento || forma.permitePagamento;
            })
            .map((forma) => ({ label: formaLabel(forma), value: forma.id }));
    }, [mode, query.data]);
    return { ...query, options };
};

export const useCondicoesPagamento = (empresaId?: string | null) =>
    useQuery({
        queryKey: condicoesPagamentoQueryKey(empresaId),
        queryFn: () => financeiroApi.listarCondicoesPagamento({ empresaId })
    });

export const useCondicoesPagamentoOptions = (empresaId?: string | null) => {
    const query = useCondicoesPagamento(empresaId);
    const options = useMemo<SelectOption<string>[]>(() => (query.data ?? []).map((condicao) => ({ label: condicaoLabel(condicao), value: condicao.id })), [query.data]);
    return { ...query, options };
};

export const useContasReceber = (query: FinanceiroListQuery = {}) =>
    useQuery({
        queryKey: contasReceberQueryKey(query),
        queryFn: () => financeiroApi.listarContasReceber(query)
    });

export const useContasPagar = (query: FinanceiroListQuery = {}) =>
    useQuery({
        queryKey: contasPagarQueryKey(query),
        queryFn: () => financeiroApi.listarContasPagar(query)
    });

export const useFinanceiroMutations = () => {
    const queryClient = useQueryClient();
    const invalidateFormas = () => queryClient.invalidateQueries({ queryKey: ['financeiro', 'formas-pagamento'] });
    const invalidateCondicoes = () => queryClient.invalidateQueries({ queryKey: ['financeiro', 'condicoes-pagamento'] });
    const invalidateReceber = () => queryClient.invalidateQueries({ queryKey: ['financeiro', 'contas-receber'] });
    const invalidatePagar = () => queryClient.invalidateQueries({ queryKey: ['financeiro', 'contas-pagar'] });

    const formaSaveMutation = useMutation({
        mutationFn: ({ id, values }: SaveFormaPayload) => (id ? financeiroApi.atualizarFormaPagamento(id, values) : financeiroApi.criarFormaPagamento(values)),
        onSuccess: invalidateFormas
    });

    const formaInativarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => financeiroApi.inativarFormaPagamento(id, motivo), onSuccess: invalidateFormas });

    const condicaoSaveMutation = useMutation({
        mutationFn: ({ id, values }: SaveCondicaoPayload) => (id ? financeiroApi.atualizarCondicaoPagamento(id, values) : financeiroApi.criarCondicaoPagamento(values)),
        onSuccess: invalidateCondicoes
    });

    const condicaoInativarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => financeiroApi.inativarCondicaoPagamento(id, motivo), onSuccess: invalidateCondicoes });

    const contaReceberCreateMutation = useMutation({ mutationFn: ({ values }: ContaReceberPayload) => financeiroApi.criarContaReceber(values), onSuccess: invalidateReceber });
    const gerarContaReceberPedidoMutation = useMutation({ mutationFn: ({ pedidoVendaId, values }: GerarPedidoPayload) => financeiroApi.gerarContaReceberPedido(pedidoVendaId, values), onSuccess: invalidateReceber });
    const receberMutation = useMutation({ mutationFn: ({ id, values }: ContaActionPayload) => financeiroApi.receberConta(id, values), onSuccess: invalidateReceber });
    const estornarRecebimentoMutation = useMutation({ mutationFn: ({ id, values }: ContaActionPayload) => financeiroApi.estornarRecebimento(id, values), onSuccess: invalidateReceber });
    const cancelarReceberMutation = useMutation({ mutationFn: ({ id, motivo }: ContaReasonPayload) => financeiroApi.cancelarContaReceber(id, motivo), onSuccess: invalidateReceber });

    const contaPagarCreateMutation = useMutation({ mutationFn: ({ values }: ContaPagarPayload) => financeiroApi.criarContaPagar(values), onSuccess: invalidatePagar });
    const pagarMutation = useMutation({ mutationFn: ({ id, values }: ContaActionPayload) => financeiroApi.pagarConta(id, values), onSuccess: invalidatePagar });
    const estornarPagamentoMutation = useMutation({ mutationFn: ({ id, values }: ContaActionPayload) => financeiroApi.estornarPagamento(id, values), onSuccess: invalidatePagar });
    const cancelarPagarMutation = useMutation({ mutationFn: ({ id, motivo }: ContaReasonPayload) => financeiroApi.cancelarContaPagar(id, motivo), onSuccess: invalidatePagar });

    return {
        formaSaveMutation,
        formaInativarMutation,
        condicaoSaveMutation,
        condicaoInativarMutation,
        contaReceberCreateMutation,
        gerarContaReceberPedidoMutation,
        receberMutation,
        estornarRecebimentoMutation,
        cancelarReceberMutation,
        contaPagarCreateMutation,
        pagarMutation,
        estornarPagamentoMutation,
        cancelarPagarMutation
    };
};
