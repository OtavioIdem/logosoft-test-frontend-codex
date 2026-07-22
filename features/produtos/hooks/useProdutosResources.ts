'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriasProdutoApi, marcasApi, produtosApi, unidadesMedidaApi } from '@/features/produtos/api/produtosApi';
import { CatalogoListQuery, ProdutoListQuery } from '@/features/produtos/types/produtos.types';

type SavePayload = { id?: string; values: unknown };
type ReasonPayload = { id: string; motivo: string };
type ProdutoPatchPayload = { id: string; values: unknown };

export const produtosQueryKey = (query?: ProdutoListQuery) => ['produtos', query] as const;
export const categoriasProdutoQueryKey = (query?: CatalogoListQuery) => ['produtos-categorias', query] as const;
export const unidadesMedidaQueryKey = (query?: CatalogoListQuery) => ['produtos-unidades-medida', query] as const;
export const marcasQueryKey = (query?: CatalogoListQuery) => ['produtos-marcas', query] as const;

export const useProdutos = (query: ProdutoListQuery = {}, enabled = true) =>
    useQuery({
        queryKey: produtosQueryKey(query),
        queryFn: () => produtosApi.listar(query),
        enabled
    });

export const useCategoriasProduto = (query: CatalogoListQuery = {}, enabled = true) =>
    useQuery({
        queryKey: categoriasProdutoQueryKey(query),
        queryFn: () => categoriasProdutoApi.listar(query),
        enabled
    });

export const useUnidadesMedida = (query: CatalogoListQuery = {}, enabled = true) =>
    useQuery({
        queryKey: unidadesMedidaQueryKey(query),
        queryFn: () => unidadesMedidaApi.listar(query),
        enabled
    });

export const useMarcas = (query: CatalogoListQuery = {}, enabled = true) =>
    useQuery({
        queryKey: marcasQueryKey(query),
        queryFn: () => marcasApi.listar(query),
        enabled
    });

export const useProdutoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['produtos'] });

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: SavePayload) => (id ? produtosApi.atualizar(id, values) : produtosApi.criar(values)),
        onSuccess: invalidate
    });

    const precoCustoMutation = useMutation({ mutationFn: ({ id, values }: ProdutoPatchPayload) => produtosApi.atualizarPrecoCusto(id, values), onSuccess: invalidate });
    const dadosFiscaisMutation = useMutation({ mutationFn: ({ id, values }: ProdutoPatchPayload) => produtosApi.atualizarDadosFiscais(id, values), onSuccess: invalidate });
    const codigoBarrasMutation = useMutation({ mutationFn: ({ id, values }: ProdutoPatchPayload) => produtosApi.adicionarCodigoBarras(id, values), onSuccess: invalidate });
    const fornecedorMutation = useMutation({ mutationFn: ({ id, values }: ProdutoPatchPayload) => produtosApi.vincularFornecedor(id, values), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => produtosApi.inativar(id, motivo), onSuccess: invalidate });

    return { saveMutation, precoCustoMutation, dadosFiscaisMutation, codigoBarrasMutation, fornecedorMutation, inativarMutation };
};

export const useCategoriaProdutoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['produtos-categorias'] });
    const saveMutation = useMutation({ mutationFn: ({ id, values }: SavePayload) => (id ? categoriasProdutoApi.atualizar(id, values) : categoriasProdutoApi.criar(values)), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => categoriasProdutoApi.inativar(id, motivo), onSuccess: invalidate });
    return { saveMutation, inativarMutation };
};

export const useUnidadeMedidaMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['produtos-unidades-medida'] });
    const saveMutation = useMutation({ mutationFn: ({ id, values }: SavePayload) => (id ? unidadesMedidaApi.atualizar(id, values) : unidadesMedidaApi.criar(values)), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => unidadesMedidaApi.inativar(id, motivo), onSuccess: invalidate });
    return { saveMutation, inativarMutation };
};

export const useMarcaMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['produtos-marcas'] });
    const saveMutation = useMutation({ mutationFn: ({ id, values }: SavePayload) => (id ? marcasApi.atualizar(id, values) : marcasApi.criar(values)), onSuccess: invalidate });
    const inativarMutation = useMutation({ mutationFn: ({ id, motivo }: ReasonPayload) => marcasApi.inativar(id, motivo), onSuccess: invalidate });
    return { saveMutation, inativarMutation };
};
