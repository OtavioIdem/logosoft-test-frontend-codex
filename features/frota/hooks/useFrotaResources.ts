'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { frotaApi } from '@/features/frota/api/frotaApi';
import { MotoristasListQuery, VeiculoSubRecursoQuery, VeiculosListQuery, ViagensListQuery } from '@/features/frota/types/frota.types';

export const veiculosQueryKey = (query?: VeiculosListQuery) => ['frota-veiculos', query ?? {}] as const;
export const veiculoDetalheQueryKey = (id?: string | null) => ['frota-veiculo', id ?? null] as const;
export const abastecimentosQueryKey = (query?: VeiculoSubRecursoQuery) => ['frota-abastecimentos', query ?? {}] as const;
export const manutencoesQueryKey = (query?: VeiculoSubRecursoQuery) => ['frota-manutencoes', query ?? {}] as const;
export const despesasQueryKey = (query?: VeiculoSubRecursoQuery) => ['frota-despesas', query ?? {}] as const;
export const documentosQueryKey = (query?: VeiculoSubRecursoQuery) => ['frota-documentos', query ?? {}] as const;
export const motoristasQueryKey = (query?: MotoristasListQuery) => ['frota-motoristas', query ?? {}] as const;
export const viagensQueryKey = (query?: ViagensListQuery) => ['frota-viagens', query ?? {}] as const;

type IdValues = { id: string; values: unknown };
type IdMotivo = { id: string; motivo: string };

// ---- Veículos ----
export const useVeiculos = (query: VeiculosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: veiculosQueryKey(query), queryFn: () => frotaApi.listarVeiculos(query), enabled });

export const useVeiculo = (id?: string | null) =>
    useQuery({ queryKey: veiculoDetalheQueryKey(id), queryFn: () => frotaApi.obterVeiculo(id as string), enabled: Boolean(id) });

export const useVeiculoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['frota-veiculos'] });
        queryClient.invalidateQueries({ queryKey: ['frota-veiculo'] });
    };
    const criarMutation = useMutation({ mutationFn: (values: unknown) => frotaApi.criarVeiculo(values), onSuccess: invalidate });
    const atualizarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => frotaApi.atualizarVeiculo(id, values), onSuccess: invalidate });
    const statusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: number }) => frotaApi.alterarStatusVeiculo(id, status), onSuccess: invalidate });
    return { criarMutation, atualizarMutation, statusMutation };
};

// ---- Abastecimentos ----
export const useAbastecimentos = (query: VeiculoSubRecursoQuery, enabled = true) =>
    useQuery({ queryKey: abastecimentosQueryKey(query), queryFn: () => frotaApi.listarAbastecimentos(query), enabled });

export const useAbastecimentoMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (values: unknown) => frotaApi.registrarAbastecimento(values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['frota-abastecimentos'] });
            queryClient.invalidateQueries({ queryKey: ['frota-veiculo'] });
        }
    });
};

// ---- Manutenções ----
export const useManutencoes = (query: VeiculoSubRecursoQuery, enabled = true) =>
    useQuery({ queryKey: manutencoesQueryKey(query), queryFn: () => frotaApi.listarManutencoes(query), enabled });

export const useManutencaoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['frota-manutencoes'] });
    const registrarMutation = useMutation({ mutationFn: (values: unknown) => frotaApi.registrarManutencao(values), onSuccess: invalidate });
    const concluirMutation = useMutation({ mutationFn: (id: string) => frotaApi.concluirManutencao(id), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => frotaApi.cancelarManutencao(id, motivo), onSuccess: invalidate });
    return { registrarMutation, concluirMutation, cancelarMutation };
};

// ---- Despesas ----
export const useDespesas = (query: VeiculoSubRecursoQuery, enabled = true) =>
    useQuery({ queryKey: despesasQueryKey(query), queryFn: () => frotaApi.listarDespesas(query), enabled });

export const useDespesaMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: (values: unknown) => frotaApi.registrarDespesa(values), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['frota-despesas'] }) });
};

// ---- Documentos ----
export const useDocumentos = (query: VeiculoSubRecursoQuery, enabled = true) =>
    useQuery({ queryKey: documentosQueryKey(query), queryFn: () => frotaApi.listarDocumentos(query), enabled });

export const useDocumentoMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: (values: unknown) => frotaApi.registrarDocumento(values), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['frota-documentos'] }) });
};

// ---- Motoristas ----
export const useMotoristas = (query: MotoristasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: motoristasQueryKey(query), queryFn: () => frotaApi.listarMotoristas(query), enabled });

export const useMotoristaMutations = () => {
    const queryClient = useQueryClient();
    const criarMutation = useMutation({ mutationFn: (values: unknown) => frotaApi.criarMotorista(values), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['frota-motoristas'] }) });
    return { criarMutation };
};

// ---- Viagens ----
export const useViagens = (query: ViagensListQuery = {}, enabled = true) =>
    useQuery({ queryKey: viagensQueryKey(query), queryFn: () => frotaApi.listarViagens(query), enabled });

export const useViagemMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['frota-viagens'] });
        queryClient.invalidateQueries({ queryKey: ['frota-veiculo'] });
    };
    const iniciarMutation = useMutation({ mutationFn: (values: unknown) => frotaApi.iniciarViagem(values), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => frotaApi.encerrarViagem(id, values), onSuccess: invalidate });
    const cancelarMutation = useMutation({ mutationFn: ({ id, motivo }: IdMotivo) => frotaApi.cancelarViagem(id, motivo), onSuccess: invalidate });
    return { iniciarMutation, encerrarMutation, cancelarMutation };
};
