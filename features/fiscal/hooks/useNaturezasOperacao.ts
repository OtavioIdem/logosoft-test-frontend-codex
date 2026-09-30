'use client';

// Hook do combo de natureza de operação (v1.11.0a8b71, D91). Uma chave raiz e um client só, para que a
// manutenção de naturezas (dívida, `b72`) invalide a família inteira quando chegar.
//
// Sem `staleTime` longo (D91 recusou o cache de 5 minutos do rascunho): a lista vazia é justamente o que
// bloqueia o Confirmar, então o campo oferece "Recarregar" e o dado não fica preso em cache.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { naturezasOperacaoApi } from '@/features/fiscal/api/naturezasOperacaoApi';
import { NATUREZA_OPERACAO_FIELD } from '@/features/fiscal/components/fiscalLabels';
import { SelectOption } from '@/types/erp';

export const NATUREZAS_OPERACAO_ROOT_QUERY_KEY = ['fiscal', 'naturezas-operacao'] as const;

export const naturezasOperacaoOpcoesQueryKey = (empresaId?: string | null) => [...NATUREZAS_OPERACAO_ROOT_QUERY_KEY, 'opcoes', empresaId ?? null] as const;

export const NATUREZAS_OPERACAO_PERMISSAO = 'FISCAL_CADASTROS_CONSULTAR' as const;

// `enabled`: só com a permissão da rota (`NaturezasOperacaoController.cs:42`) e com a empresa resolvida
// (padrão D82/D88) -- sem uma das duas, 0 GET.
export const useNaturezasOperacaoOpcoes = (empresaId?: string | null) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(NATUREZAS_OPERACAO_PERMISSAO);
    const query = useQuery({
        queryKey: naturezasOperacaoOpcoesQueryKey(empresaId),
        queryFn: () => naturezasOperacaoApi.listar({ empresaId: empresaId ?? '' }),
        enabled: permitido && Boolean(empresaId)
    });

    const itens = useMemo(() => query.data?.items ?? [], [query.data]);
    const options = useMemo<SelectOption<string>[]>(() => itens.map((item) => ({ label: `${item.codigo} — ${item.descricao}`, value: item.id })), [itens]);
    // Teto de 200 por página no backend: com mais naturezas ativas que isso, a lista é cortada e a tela diz.
    const listaCortada = (query.data?.totalItems ?? 0) > itens.length;

    return { ...query, itens, options, permitido, listaCortada };
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
 * pelo menos uma natureza ativa da empresa na lista.
 */
export const naturezaOperacaoIndisponivelMotivo = ({ empresaId, permitido, isLoading, isError, options }: EstadoNaturezasOperacao): string | null => {
    if (!empresaId) return NATUREZA_OPERACAO_FIELD.semEmpresa;
    if (!permitido) return NATUREZA_OPERACAO_FIELD.semPermissao;
    if (isLoading) return NATUREZA_OPERACAO_FIELD.carregando;
    if (isError) return NATUREZA_OPERACAO_FIELD.erroConsulta;
    if (options.length === 0) return NATUREZA_OPERACAO_FIELD.vazio;
    return null;
};
