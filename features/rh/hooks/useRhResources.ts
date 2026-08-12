'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rhApi } from '@/features/rh/api/rhApi';
import {
    AfastamentosListQuery,
    BeneficiosListQuery,
    ColaboradoresListQuery,
    ConcessoesListQuery,
    EventosListQuery,
    FeriasListQuery,
    JornadasListQuery,
    PontoListQuery
} from '@/features/rh/types/rh.types';

type IdValues = { id: string; values: unknown };

// ---- Colaboradores ----
export const colaboradoresQueryKey = (query?: ColaboradoresListQuery) => ['rh-colaboradores', query ?? {}] as const;
export const useColaboradores = (query: ColaboradoresListQuery = {}, enabled = true) =>
    useQuery({ queryKey: colaboradoresQueryKey(query), queryFn: () => rhApi.listarColaboradores(query), enabled });

export const useColaboradorOptions = (empresaId?: string | null, filialId?: string | null) => {
    const query = useColaboradores({ empresaId: empresaId ?? null, filialId: filialId ?? null });
    const options = (query.data ?? []).map((colaborador) => ({ label: `${colaborador.matricula} - ${colaborador.nome}`, value: colaborador.id }));
    return { ...query, options };
};

export const useColaboradorMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rh-colaboradores'] });
    const admitirMutation = useMutation({ mutationFn: (values: unknown) => rhApi.admitirColaborador(values), onSuccess: invalidate });
    const atualizarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => rhApi.atualizarColaborador(id, values), onSuccess: invalidate });
    const desligarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => rhApi.desligarColaborador(id, values), onSuccess: invalidate });
    return { admitirMutation, atualizarMutation, desligarMutation };
};

// ---- Jornadas ----
export const jornadasQueryKey = (query?: JornadasListQuery) => ['rh-jornadas', query ?? {}] as const;
export const useJornadas = (query: JornadasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: jornadasQueryKey(query), queryFn: () => rhApi.listarJornadas(query), enabled });

export const useJornadaMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rh-jornadas'] });
    const criarMutation = useMutation({ mutationFn: (values: unknown) => rhApi.criarJornada(values), onSuccess: invalidate });
    const atualizarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => rhApi.atualizarJornada(id, values), onSuccess: invalidate });
    return { criarMutation, atualizarMutation };
};

// ---- Ponto ----
export const pontoQueryKey = (query?: PontoListQuery) => ['rh-ponto', query ?? {}] as const;
export const usePonto = (query: PontoListQuery = {}, enabled = true) =>
    useQuery({ queryKey: pontoQueryKey(query), queryFn: () => rhApi.listarPonto(query), enabled });

export const usePontoMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: (values: unknown) => rhApi.registrarPonto(values), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rh-ponto'] }) });
};

// ---- Férias ----
export const feriasQueryKey = (query?: FeriasListQuery) => ['rh-ferias', query ?? {}] as const;
export const useFerias = (query: FeriasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: feriasQueryKey(query), queryFn: () => rhApi.listarFerias(query), enabled });

export const useFeriasMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['rh-ferias'] });
        queryClient.invalidateQueries({ queryKey: ['rh-colaboradores'] });
    };
    const solicitarMutation = useMutation({ mutationFn: (values: unknown) => rhApi.solicitarFerias(values), onSuccess: invalidate });
    const acaoMutation = useMutation({
        mutationFn: ({ id, acao, motivo }: { id: string; acao: 'aprovar' | 'rejeitar' | 'iniciar' | 'concluir' | 'cancelar'; motivo?: string }) => {
            switch (acao) {
                case 'aprovar': return rhApi.aprovarFerias(id);
                case 'rejeitar': return rhApi.rejeitarFerias(id, motivo ?? '');
                case 'iniciar': return rhApi.iniciarFerias(id);
                case 'concluir': return rhApi.concluirFerias(id);
                case 'cancelar': return rhApi.cancelarFerias(id, motivo ?? '');
            }
        },
        onSuccess: invalidate
    });
    return { solicitarMutation, acaoMutation };
};

// ---- Afastamentos ----
export const afastamentosQueryKey = (query?: AfastamentosListQuery) => ['rh-afastamentos', query ?? {}] as const;
export const useAfastamentos = (query: AfastamentosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: afastamentosQueryKey(query), queryFn: () => rhApi.listarAfastamentos(query), enabled });

export const useAfastamentoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['rh-afastamentos'] });
        queryClient.invalidateQueries({ queryKey: ['rh-colaboradores'] });
    };
    const registrarMutation = useMutation({ mutationFn: (values: unknown) => rhApi.registrarAfastamento(values), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => rhApi.encerrarAfastamento(id, values), onSuccess: invalidate });
    return { registrarMutation, encerrarMutation };
};

// ---- Benefícios ----
export const beneficiosQueryKey = (query?: BeneficiosListQuery) => ['rh-beneficios', query ?? {}] as const;
export const useBeneficios = (query: BeneficiosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: beneficiosQueryKey(query), queryFn: () => rhApi.listarBeneficios(query), enabled });

export const useBeneficioMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rh-beneficios'] });
    const criarMutation = useMutation({ mutationFn: (values: unknown) => rhApi.criarBeneficio(values), onSuccess: invalidate });
    const atualizarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => rhApi.atualizarBeneficio(id, values), onSuccess: invalidate });
    return { criarMutation, atualizarMutation };
};

export const concessoesQueryKey = (query?: ConcessoesListQuery) => ['rh-concessoes', query ?? {}] as const;
export const useConcessoes = (query: ConcessoesListQuery = {}, enabled = true) =>
    useQuery({ queryKey: concessoesQueryKey(query), queryFn: () => rhApi.listarConcessoes(query), enabled });

export const useConcessaoMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rh-concessoes'] });
    const concederMutation = useMutation({ mutationFn: (values: unknown) => rhApi.concederBeneficio(values), onSuccess: invalidate });
    const encerrarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => rhApi.encerrarConcessao(id, values), onSuccess: invalidate });
    return { concederMutation, encerrarMutation };
};

// ---- Eventos ----
export const eventosQueryKey = (query?: EventosListQuery) => ['rh-eventos', query ?? {}] as const;
export const useEventos = (query: EventosListQuery = {}, enabled = true) =>
    useQuery({ queryKey: eventosQueryKey(query), queryFn: () => rhApi.listarEventos(query), enabled });

export const useEventoMutation = () => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: (values: unknown) => rhApi.registrarEvento(values), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rh-eventos'] }) });
};
