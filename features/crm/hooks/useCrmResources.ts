'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crmApi } from '@/features/crm/api/crmApi';
import { LeadsListQuery, OportunidadesListQuery, PropostasListQuery } from '@/features/crm/types/crm.types';

export const leadsQueryKey = (query?: LeadsListQuery) => ['crm-leads', query ?? {}] as const;
export const oportunidadesQueryKey = (query?: OportunidadesListQuery) => ['crm-oportunidades', query ?? {}] as const;
export const propostasQueryKey = (query?: PropostasListQuery) => ['crm-propostas', query ?? {}] as const;

type IdValues = { id: string; values: unknown };

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
    queryClient.invalidateQueries({ queryKey: ['crm-oportunidades'] });
    queryClient.invalidateQueries({ queryKey: ['crm-propostas'] });
};

// ---- Leads ----
export const useLeads = (query: LeadsListQuery = {}, enabled = true) =>
    useQuery({ queryKey: leadsQueryKey(query), queryFn: () => crmApi.listarLeads(query), enabled });

export const useLeadMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => invalidateAll(queryClient);
    const criarMutation = useMutation({ mutationFn: (values: unknown) => crmApi.criarLead(values), onSuccess: invalidate });
    const qualificarMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => crmApi.qualificarLead(id, values), onSuccess: invalidate });
    const descartarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => crmApi.descartarLead(id, motivo), onSuccess: invalidate });
    return { criarMutation, qualificarMutation, descartarMutation };
};

// ---- Oportunidades ----
export const useOportunidades = (query: OportunidadesListQuery = {}, enabled = true) =>
    useQuery({ queryKey: oportunidadesQueryKey(query), queryFn: () => crmApi.listarOportunidades(query), enabled });

export const useOportunidadeMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => invalidateAll(queryClient);
    const estagioMutation = useMutation({ mutationFn: ({ id, estagio }: { id: string; estagio: number }) => crmApi.moverEstagio(id, estagio), onSuccess: invalidate });
    const ganharMutation = useMutation({ mutationFn: ({ id, propostaVencedoraId }: { id: string; propostaVencedoraId?: string | null }) => crmApi.ganharOportunidade(id, propostaVencedoraId), onSuccess: invalidate });
    const perderMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => crmApi.perderOportunidade(id, values), onSuccess: invalidate });
    const converterMutation = useMutation({ mutationFn: ({ id, values }: IdValues) => crmApi.converterOportunidade(id, values), onSuccess: invalidate });
    return { estagioMutation, ganharMutation, perderMutation, converterMutation };
};

// ---- Propostas ----
export const usePropostas = (query: PropostasListQuery = {}, enabled = true) =>
    useQuery({ queryKey: propostasQueryKey(query), queryFn: () => crmApi.listarPropostas(query), enabled });

export const usePropostaMutations = () => {
    const queryClient = useQueryClient();
    const invalidate = () => invalidateAll(queryClient);
    const criarMutation = useMutation({ mutationFn: (values: unknown) => crmApi.criarProposta(values), onSuccess: invalidate });
    const aceitarMutation = useMutation({ mutationFn: (id: string) => crmApi.aceitarProposta(id), onSuccess: invalidate });
    const recusarMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => crmApi.recusarProposta(id, motivo), onSuccess: invalidate });
    return { criarMutation, aceitarMutation, recusarMutation };
};
