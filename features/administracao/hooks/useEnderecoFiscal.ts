'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';

type DefinirEnderecoFiscalPayload = { id: string; values: unknown };

/**
 * `PUT .../{id}/endereco-fiscal` e `DELETE .../{id}/endereco-fiscal/municipio` são endpoints
 * próprios, fora do `saveMutation` genérico de `useAdministracaoResource` (que grava
 * Criar/AtualizarEmpresaRequest ou Criar/AtualizarFilialRequest). Invalida a mesma chave de lista
 * (`['administracao', resourceKey]`) para o registro reabrir já com o endereço gravado.
 */
export const useEnderecoFiscal = (resourceKey: 'empresas' | 'filiais') => {
    const queryClient = useQueryClient();
    const invalidar = () => queryClient.invalidateQueries({ queryKey: ['administracao', resourceKey] });

    const definirMutation = useMutation({
        mutationFn: ({ id, values }: DefinirEnderecoFiscalPayload) => administracaoApi.definirEnderecoFiscal(resourceKey, id, values),
        onSuccess: invalidar
    });

    const removerMunicipioMutation = useMutation({
        mutationFn: (id: string) => administracaoApi.removerMunicipioEnderecoFiscal(resourceKey, id),
        onSuccess: invalidar
    });

    return { definirMutation, removerMunicipioMutation };
};
