'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fornecedoresApi } from '@/features/fornecedores/api/fornecedoresApi';
import { FornecedorFormValues, FornecedorListQuery } from '@/features/fornecedores/types/fornecedores.types';

type SavePayload = { id?: string; values: FornecedorFormValues };
type InativarPayload = { id: string; motivo: string };
type ConfigurarCompraPayload = { id: string; values: unknown };
type RevogarPayload = { id: string; motivo: string };

export const fornecedoresQueryKey = (query?: FornecedorListQuery) => ['fornecedores', query] as const;

export const useFornecedores = (query: FornecedorListQuery = {}) =>
    useQuery({
        queryKey: fornecedoresQueryKey(query),
        queryFn: () => fornecedoresApi.listar(query)
    });

export const useFornecedorMutations = (query: FornecedorListQuery = {}) => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fornecedores'] });

    const saveMutation = useMutation({
        mutationFn: ({ id, values }: SavePayload) => (id ? fornecedoresApi.atualizar(id, values) : fornecedoresApi.criar(values)),
        onSuccess: invalidate
    });

    const inativarMutation = useMutation({
        mutationFn: ({ id, motivo }: InativarPayload) => fornecedoresApi.inativar(id, motivo),
        onSuccess: invalidate
    });
    const configurarCompraMutation = useMutation({
        mutationFn: ({ id, values }: ConfigurarCompraPayload) => fornecedoresApi.configurarCompra(id, values),
        onSuccess: invalidate
    });
    const homologarMutation = useMutation({
        mutationFn: (id: string) => fornecedoresApi.homologar(id),
        onSuccess: invalidate
    });
    const revogarMutation = useMutation({
        mutationFn: ({ id, motivo }: RevogarPayload) => fornecedoresApi.revogarHomologacao(id, motivo),
        onSuccess: invalidate
    });

    return { saveMutation, inativarMutation, configurarCompraMutation, homologarMutation, revogarMutation, queryKey: fornecedoresQueryKey(query) };
};
