import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    converterOportunidadeSchema,
    criarLeadSchema,
    criarPropostaSchema,
    ganharOportunidadeSchema,
    moverEstagioSchema,
    motivoSchema,
    perderOportunidadeSchema,
    qualificarLeadSchema
} from '@/features/crm/schemas/crmSchemas';
import {
    ConverterOportunidadeResponse,
    LeadResponse,
    LeadsListQuery,
    OportunidadeResponse,
    OportunidadesListQuery,
    PropostaResponse,
    PropostasListQuery
} from '@/features/crm/types/crm.types';

type Schema<T> = { parse: (value: unknown) => T };

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const LEADS = '/api/crm/leads';
const OPORTUNIDADES = '/api/crm/oportunidades';
const PROPOSTAS = '/api/crm/propostas';

const leadsParams = (query?: LeadsListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, status: query?.status, termo: query?.termo });
const oportunidadesParams = (query?: OportunidadesListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, estagio: query?.estagio, status: query?.status, termo: query?.termo });
const propostasParams = (query?: PropostasListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, oportunidadeId: query?.oportunidadeId, status: query?.status });

export const crmApi = {
    // ---- Leads ----
    async listarLeads(query?: LeadsListQuery) {
        return runRequest(async () => (await httpClient.get<LeadResponse[]>(LEADS, { params: leadsParams(query) })).data);
    },
    async criarLead(values: unknown) {
        const payload = parseSchema(criarLeadSchema, values);
        return runRequest(async () => (await httpClient.post<LeadResponse>(LEADS, payload)).data);
    },
    async qualificarLead(id: string, values: unknown) {
        const payload = parseSchema(qualificarLeadSchema, values);
        return runRequest(async () => (await httpClient.post<OportunidadeResponse>(`${LEADS}/${id}/qualificar`, payload)).data);
    },
    async descartarLead(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<LeadResponse>(`${LEADS}/${id}/descartar`, payload)).data);
    },

    // ---- Oportunidades ----
    async listarOportunidades(query?: OportunidadesListQuery) {
        return runRequest(async () => (await httpClient.get<OportunidadeResponse[]>(OPORTUNIDADES, { params: oportunidadesParams(query) })).data);
    },
    async obterOportunidade(id: string) {
        return runRequest(async () => (await httpClient.get<OportunidadeResponse>(`${OPORTUNIDADES}/${id}`)).data);
    },
    async moverEstagio(id: string, estagio: number) {
        const payload = parseSchema(moverEstagioSchema, { estagio });
        return runRequest(async () => (await httpClient.post<OportunidadeResponse>(`${OPORTUNIDADES}/${id}/estagio`, payload)).data);
    },
    async ganharOportunidade(id: string, propostaVencedoraId?: string | null) {
        const payload = parseSchema(ganharOportunidadeSchema, { propostaVencedoraId });
        return runRequest(async () => (await httpClient.post<OportunidadeResponse>(`${OPORTUNIDADES}/${id}/ganhar`, payload)).data);
    },
    async perderOportunidade(id: string, values: unknown) {
        const payload = parseSchema(perderOportunidadeSchema, values);
        return runRequest(async () => (await httpClient.post<OportunidadeResponse>(`${OPORTUNIDADES}/${id}/perder`, payload)).data);
    },
    async converterOportunidade(id: string, values: unknown) {
        const payload = parseSchema(converterOportunidadeSchema, values);
        return runRequest(async () => (await httpClient.post<ConverterOportunidadeResponse>(`${OPORTUNIDADES}/${id}/converter`, payload)).data);
    },

    // ---- Propostas ----
    async listarPropostas(query?: PropostasListQuery) {
        return runRequest(async () => (await httpClient.get<PropostaResponse[]>(PROPOSTAS, { params: propostasParams(query) })).data);
    },
    async criarProposta(values: unknown) {
        const payload = parseSchema(criarPropostaSchema, values);
        return runRequest(async () => (await httpClient.post<PropostaResponse>(PROPOSTAS, payload)).data);
    },
    async aceitarProposta(id: string) {
        return runRequest(async () => (await httpClient.post<PropostaResponse>(`${PROPOSTAS}/${id}/aceitar`)).data);
    },
    async recusarProposta(id: string, motivo: string) {
        const payload = parseSchema(motivoSchema, { motivo });
        return runRequest(async () => (await httpClient.post<PropostaResponse>(`${PROPOSTAS}/${id}/recusar`, payload)).data);
    }
};
