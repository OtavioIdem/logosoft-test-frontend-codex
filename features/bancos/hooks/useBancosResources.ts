'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bancosApi } from '@/features/bancos/api/bancosApi';
import { BoletosListQuery, ContasBancariasListQuery } from '@/features/bancos/types/bancos.types';

export const bancosQueryKey = ['bancos-bancos'] as const;
export const contasBancariasQueryKey = (query?: ContasBancariasListQuery) => ['bancos-contas', query ?? {}] as const;
export const conveniosQueryKey = ['bancos-convenios'] as const;
export const carteirasQueryKey = ['bancos-carteiras'] as const;
export const boletosQueryKey = (query?: BoletosListQuery) => ['bancos-boletos', query ?? {}] as const;
export const boletoHistoricoQueryKey = (id?: string | null) => ['bancos-boleto-historico', id ?? null] as const;

// ---- Cadastros ----
export const useBancos = (enabled = true) => useQuery({ queryKey: bancosQueryKey, queryFn: () => bancosApi.listarBancos(), enabled });
export const useContasBancarias = (query: ContasBancariasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: contasBancariasQueryKey(query), queryFn: () => bancosApi.listarContasBancarias(query), enabled });
export const useConvenios = (enabled = true) => useQuery({ queryKey: conveniosQueryKey, queryFn: () => bancosApi.listarConvenios(), enabled });
export const useCarteiras = (enabled = true) => useQuery({ queryKey: carteirasQueryKey, queryFn: () => bancosApi.listarCarteiras(), enabled });

export const useCadastroBancarioMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['bancos-bancos'] });
        queryClient.invalidateQueries({ queryKey: ['bancos-contas'] });
        queryClient.invalidateQueries({ queryKey: ['bancos-convenios'] });
        queryClient.invalidateQueries({ queryKey: ['bancos-carteiras'] });
    };
    const bancoMutation = useMutation({ mutationFn: (values: unknown) => bancosApi.criarBanco(values), onSuccess: invalidate });
    const contaMutation = useMutation({ mutationFn: (values: unknown) => bancosApi.criarContaBancaria(values), onSuccess: invalidate });
    const convenioMutation = useMutation({ mutationFn: (values: unknown) => bancosApi.criarConvenio(values), onSuccess: invalidate });
    const carteiraMutation = useMutation({ mutationFn: (values: unknown) => bancosApi.criarCarteira(values), onSuccess: invalidate });
    return { bancoMutation, contaMutation, convenioMutation, carteiraMutation };
};

// ---- Boletos ----
export const useBoletos = (query: BoletosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: boletosQueryKey(query), queryFn: () => bancosApi.listarBoletos(query), enabled });

export const useBoletoHistorico = (id?: string | null) =>
    useQuery({ queryKey: boletoHistoricoQueryKey(id), queryFn: () => bancosApi.historicoBoleto(id as string), enabled: Boolean(id) });

export const useBoletoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bancos-boletos'] });
    const gerarMutation = useMutation({ mutationFn: (values: unknown) => bancosApi.gerarBoleto(values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => bancosApi.cancelarBoleto(id, motivo), onSuccess: invalidate });
    return { gerarMutation, cancelarMutation };
};

// ---- CNAB ----
export const useCnabMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bancos-boletos'] });
    const remessaMutation = useMutation({ mutationFn: (values: unknown) => bancosApi.gerarRemessa(values), onSuccess: invalidate });
    const retornoMutation = useMutation({ mutationFn: (values: unknown) => bancosApi.importarRetorno(values), onSuccess: invalidate });
    return { remessaMutation, retornoMutation };
};
