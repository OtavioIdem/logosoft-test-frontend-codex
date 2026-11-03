// Client da fatia Configuração fiscal e certificados (v1.11.0a8b81, D112). Segue `seriesFiscaisApi.ts`: `httpClient`
// + `sanitizePayload`/`cleanQueryParams`; o erro sobe como `AxiosError` para a tela converter com `mapApiError`
// (preserva `code`, `status`, `traceId` e erros por campo).
//
// Empresa (D112 + D114): o usuário comum NÃO injeta empresa -- o backend a lê do token, e a chamada declara
// `organizationalContext: { scope: 'global' }`. O MASTER não tem empresa no token: para ele (`master = true`) as 10
// chamadas usam o escopo `query` (`required: true`, `includeFilial: false`) COM o `snapshot` do contexto na metadata (o
// `httpClient` aplica a política sem snapshot próprio, como em `administracaoApi`), que põe `?empresaId=` do seletor em
// GET, PUT e POST (backend v1.26.23, `EmpresaSelecionadaNaRequisicao`). Sem empresa no seletor, a política recusa antes
// da rede. O parâmetro `master` é `null` para o usuário comum. `includeFilial: false`: a filial vai na rota, e um `filialId` injetado mudaria o filtro dos certificados.
//
// 404 de "ainda não configurada" (empresa e filial) devolve `null`: é estado, não erro. Só vale para o código
// esperado (ver `ehEstadoNaoConfigurada`); qualquer outro 404 continua subindo como erro.

import { httpClient } from '@/lib/http/httpClient';
import type { OrganizationalContextSnapshot } from '@/lib/http/organizationalContextPolicy';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    cadastrarCertificadoDigitalSchema,
    certificadoDigitalResponseSchema,
    configuracaoFiscalEmpresaResponseSchema,
    configuracaoFiscalFilialResponseSchema,
    motivoConfiguracaoFiscalSchema,
    salvarConfiguracaoFiscalEmpresaSchema,
    salvarConfiguracaoFiscalFilialSchema,
    verificarCertificadoDigitalResponseSchema
} from '@/features/fiscal/schemas/configuracaoFiscalSchemas';
import {
    CadastrarCertificadoDigitalRequest,
    CertificadoDigitalResponse,
    ConfiguracaoFiscalEmpresaResponse,
    ConfiguracaoFiscalFilialResponse,
    ListarCertificadosQuery,
    MotivoConfiguracaoFiscalRequest,
    SalvarConfiguracaoFiscalEmpresaRequest,
    SalvarConfiguracaoFiscalFilialRequest,
    VerificarCertificadoDigitalResponse
} from '@/features/fiscal/types/configuracaoFiscal.types';
import { CODIGO_CONFIGURACAO, ehEstadoNaoConfigurada } from '@/features/fiscal/components/configuracaoFiscalLabels';

const BASE = '/api/fiscal/configuracao';
/** Master = snapshot do contexto (sempre vai na metadata do escopo `query`); usuário comum = `null`, escopo `global`. */
export type ContextoMaster = OrganizationalContextSnapshot | null;

const contextoDaChamada = (master: ContextoMaster) =>
    master
        ? { organizationalContext: { scope: 'query' as const, required: true, includeFilial: false, snapshot: master } }
        : { organizationalContext: { scope: 'global' as const } };

export const buildSalvarConfiguracaoEmpresaPayload = (values: unknown): SalvarConfiguracaoFiscalEmpresaRequest =>
    sanitizePayload(salvarConfiguracaoFiscalEmpresaSchema.parse(values)) as SalvarConfiguracaoFiscalEmpresaRequest;

export const buildSalvarConfiguracaoFilialPayload = (values: unknown): SalvarConfiguracaoFiscalFilialRequest =>
    sanitizePayload(salvarConfiguracaoFiscalFilialSchema.parse(values)) as SalvarConfiguracaoFiscalFilialRequest;

export const buildMotivoConfiguracaoPayload = (values: unknown): MotivoConfiguracaoFiscalRequest =>
    sanitizePayload(motivoConfiguracaoFiscalSchema.parse(values)) as MotivoConfiguracaoFiscalRequest;

/** `validoAte` sai em ISO UTC (`toISOString()`), qualquer que seja o fuso do navegador. */
export const buildCadastrarCertificadoPayload = (values: unknown): CadastrarCertificadoDigitalRequest =>
    sanitizePayload(cadastrarCertificadoDigitalSchema.parse(values)) as CadastrarCertificadoDigitalRequest;

const parseEmpresa = (data: unknown) => configuracaoFiscalEmpresaResponseSchema.parse(data) as ConfiguracaoFiscalEmpresaResponse;
const parseFilial = (data: unknown) => configuracaoFiscalFilialResponseSchema.parse(data) as ConfiguracaoFiscalFilialResponse;
const parseCertificado = (data: unknown) => certificadoDigitalResponseSchema.parse(data) as CertificadoDigitalResponse;

export const configuracaoFiscalApi = {
    /** `null` = empresa ainda não configurada (404 esperado). */
    async obterEmpresa(master: ContextoMaster = null): Promise<ConfiguracaoFiscalEmpresaResponse | null> {
        try {
            const response = await httpClient.get<ConfiguracaoFiscalEmpresaResponse>(`${BASE}/empresa`, contextoDaChamada(master));
            return parseEmpresa(response.data);
        } catch (error) {
            if (ehEstadoNaoConfigurada(mapApiError(error), CODIGO_CONFIGURACAO.empresaNaoEncontrada)) return null;
            throw error;
        }
    },
    async salvarEmpresa(values: unknown, master: ContextoMaster = null): Promise<ConfiguracaoFiscalEmpresaResponse> {
        const payload = buildSalvarConfiguracaoEmpresaPayload(values);
        const response = await httpClient.put<ConfiguracaoFiscalEmpresaResponse>(`${BASE}/empresa`, payload, contextoDaChamada(master));
        return parseEmpresa(response.data);
    },
    async inativarEmpresa(values: unknown, master: ContextoMaster = null): Promise<void> {
        const payload = buildMotivoConfiguracaoPayload(values);
        await httpClient.post(`${BASE}/empresa/inativar`, payload, contextoDaChamada(master));
    },
    async reativarEmpresa(values: unknown, master: ContextoMaster = null): Promise<void> {
        const payload = buildMotivoConfiguracaoPayload(values);
        await httpClient.post(`${BASE}/empresa/reativar`, payload, contextoDaChamada(master));
    },
    /** `null` = filial sem configuração própria (herda da empresa). */
    async obterFilial(filialId: string, master: ContextoMaster = null): Promise<ConfiguracaoFiscalFilialResponse | null> {
        try {
            const response = await httpClient.get<ConfiguracaoFiscalFilialResponse>(`${BASE}/filiais/${filialId}`, contextoDaChamada(master));
            return parseFilial(response.data);
        } catch (error) {
            if (ehEstadoNaoConfigurada(mapApiError(error), CODIGO_CONFIGURACAO.filialNaoEncontrada)) return null;
            throw error;
        }
    },
    async salvarFilial(filialId: string, values: unknown, master: ContextoMaster = null): Promise<ConfiguracaoFiscalFilialResponse> {
        const payload = buildSalvarConfiguracaoFilialPayload(values);
        const response = await httpClient.put<ConfiguracaoFiscalFilialResponse>(`${BASE}/filiais/${filialId}`, payload, contextoDaChamada(master));
        return parseFilial(response.data);
    },
    async listarCertificados(query: ListarCertificadosQuery = {}, master: ContextoMaster = null): Promise<CertificadoDigitalResponse[]> {
        const response = await httpClient.get<CertificadoDigitalResponse[]>(`${BASE}/certificados`, {
            ...contextoDaChamada(master),
            params: cleanQueryParams({ somenteAtivos: query.somenteAtivos })
        });
        return (response.data ?? []).map(parseCertificado);
    },
    /** A resposta traz só o thumbprint mascarado; o chamador nunca deve gravar o valor do formulário em cache. */
    async cadastrarCertificado(values: unknown, master: ContextoMaster = null): Promise<CertificadoDigitalResponse> {
        const payload = buildCadastrarCertificadoPayload(values);
        const response = await httpClient.post<CertificadoDigitalResponse>(`${BASE}/certificados`, payload, contextoDaChamada(master));
        return parseCertificado(response.data);
    },
    async inativarCertificado(id: string, values: unknown, master: ContextoMaster = null): Promise<CertificadoDigitalResponse> {
        const payload = buildMotivoConfiguracaoPayload(values);
        const response = await httpClient.post<CertificadoDigitalResponse>(`${BASE}/certificados/${id}/inativar`, payload, contextoDaChamada(master));
        return parseCertificado(response.data);
    },
    async verificarCertificado(id: string, master: ContextoMaster = null): Promise<VerificarCertificadoDigitalResponse> {
        const response = await httpClient.post<VerificarCertificadoDigitalResponse>(`${BASE}/certificados/${id}/verificar`, undefined, contextoDaChamada(master));
        const parsed = verificarCertificadoDigitalResponseSchema.parse(response.data);
        return { disponivel: parsed.disponivel, motivo: parsed.motivo ?? '' };
    }
};
