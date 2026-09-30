'use client';

// Hooks de natureza de operação (v1.11.0a8b71 combo, D91; v1.11.0a8b72 manutenção, D98). Uma chave raiz e um
// client só: a lista da manutenção e o combo do Faturamento/Nota vivem sob `['fiscal','naturezas-operacao']`, e
// toda mutação invalida a RAIZ -- criar/editar/inativar atualiza a lista e o combo juntos.
//
// Sem `staleTime` longo (D91 recusou o cache de 5 minutos do rascunho): a lista vazia é justamente o que
// bloqueia o Confirmar, então o campo oferece "Recarregar" e o dado não fica preso em cache.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { naturezasOperacaoApi } from '@/features/fiscal/api/naturezasOperacaoApi';
import { NATUREZA_OPERACAO_FIELD } from '@/features/fiscal/components/fiscalLabels';
import { NATUREZA_OPERACAO_FIELD_VAZIO } from '@/features/fiscal/components/naturezasOperacaoLabels';
import { NATUREZAS_OPERACAO_TAMANHO_PAGINA_MAXIMO } from '@/features/fiscal/schemas/naturezasOperacaoSchemas';
import { NaturezaOperacaoListQuery } from '@/features/fiscal/types/naturezasOperacao.types';
import { SelectOption } from '@/types/erp';

export const NATUREZAS_OPERACAO_ROOT_QUERY_KEY = ['fiscal', 'naturezas-operacao'] as const;

export const naturezasOperacaoOpcoesQueryKey = (empresaId?: string | null) => [...NATUREZAS_OPERACAO_ROOT_QUERY_KEY, 'opcoes', empresaId ?? null] as const;

// AC-2: a chave leva o escopo organizacional (`organizationalScopeKey`) e a query -- troca de empresa dispara
// refetch em vez de reaproveitar a página anterior (precedente: `seriesFiscaisQueryKey`).
export const naturezasOperacaoQueryKey = (organizationalScopeKey: string, query: NaturezaOperacaoListQuery) => [...NATUREZAS_OPERACAO_ROOT_QUERY_KEY, 'lista', organizationalScopeKey, query] as const;

export const NATUREZAS_OPERACAO_PERMISSAO = 'FISCAL_CADASTROS_CONSULTAR' as const;

// Lista da manutenção: só sai com `empresaId` resolvido (o backend exige o parâmetro, controller :44) e com a
// permissão da rota (`NaturezasOperacaoController.cs:42`) -- sem uma das duas, 0 GET.
export const useNaturezasOperacao = (organizationalScopeKey: string, query: NaturezaOperacaoListQuery) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(NATUREZAS_OPERACAO_PERMISSAO);

    return useQuery({
        queryKey: naturezasOperacaoQueryKey(organizationalScopeKey, query),
        queryFn: () => naturezasOperacaoApi.listar(query),
        enabled: permitido && Boolean(query.empresaId)
    });
};

// Combo: sempre `somenteAtivas=true` e página cheia (200). `enabled`: só com a permissão da rota e com a
// empresa resolvida (padrão D82/D88) -- sem uma das duas, 0 GET.
export const useNaturezasOperacaoOpcoes = (empresaId?: string | null) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(NATUREZAS_OPERACAO_PERMISSAO);
    const query = useQuery({
        queryKey: naturezasOperacaoOpcoesQueryKey(empresaId),
        queryFn: () => naturezasOperacaoApi.listar({ empresaId: empresaId ?? '', somenteAtivas: true, tamanhoPagina: NATUREZAS_OPERACAO_TAMANHO_PAGINA_MAXIMO }),
        enabled: permitido && Boolean(empresaId)
    });

    const itens = useMemo(() => query.data?.items ?? [], [query.data]);
    const options = useMemo<SelectOption<string>[]>(() => itens.map((item) => ({ label: `${item.codigo} — ${item.descricao}`, value: item.id })), [itens]);
    // Teto de 200 por página no backend: com mais naturezas ativas que isso, a lista é cortada e a tela diz.
    const listaCortada = (query.data?.totalItems ?? 0) > itens.length;

    return { ...query, itens, options, permitido, listaCortada };
};

// `onSettled` invalida a RAIZ mesmo quando a mutação falha: dado velho na tela é pior que um refetch a mais, e
// o combo do Faturamento/Nota pertence à mesma família (D98).
export const useNaturezasOperacaoMutations = () => {
    const queryClient = useQueryClient();
    const invalidarNaturezas = () => queryClient.invalidateQueries({ queryKey: NATUREZAS_OPERACAO_ROOT_QUERY_KEY });

    const criarMutation = useMutation({
        mutationFn: (values: unknown) => naturezasOperacaoApi.criar(values),
        onSettled: invalidarNaturezas
    });

    const atualizarMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: unknown }) => naturezasOperacaoApi.atualizar(id, values),
        onSettled: invalidarNaturezas
    });

    const inativarMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: unknown }) => naturezasOperacaoApi.inativar(id, values),
        onSettled: invalidarNaturezas
    });

    return { criarMutation, atualizarMutation, inativarMutation };
};

type EstadoNaturezasOperacao = {
    empresaId?: string | null;
    permitido: boolean;
    isLoading: boolean;
    isError: boolean;
    options: SelectOption<string>[];
};

/**
 * D91/AC-2: motivo para o Confirmar ficar indisponível por falta de natureza selecionável; `null` quando há
 * pelo menos uma natureza ativa da empresa na lista. Com a permissão de consulta (`permitido`), a pessoa tem
 * acesso ao cadastro, então o vazio usa o texto com permissão (D100).
 */
export const naturezaOperacaoIndisponivelMotivo = ({ empresaId, permitido, isLoading, isError, options }: EstadoNaturezasOperacao): string | null => {
    if (!empresaId) return NATUREZA_OPERACAO_FIELD.semEmpresa;
    if (!permitido) return NATUREZA_OPERACAO_FIELD.semPermissao;
    if (isLoading) return NATUREZA_OPERACAO_FIELD.carregando;
    if (isError) return NATUREZA_OPERACAO_FIELD.erroConsulta;
    if (options.length === 0) return NATUREZA_OPERACAO_FIELD_VAZIO.comPermissao;
    return null;
};
