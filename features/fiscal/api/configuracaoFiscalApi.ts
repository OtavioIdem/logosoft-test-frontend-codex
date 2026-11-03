// Client da fatia Configuração fiscal e certificados (v1.11.0a8b81, D112). Segue `seriesFiscaisApi.ts`: `httpClient`
// + `sanitizePayload`/`cleanQueryParams`; o erro sobe como `AxiosError` para a tela converter com `mapApiError`
// (preserva `code`, `status`, `traceId` e erros por campo).
//
// A empresa NUNCA vai na rota, na query nem no corpo: o backend a lê do token. Por isso toda chamada declara
// `organizationalContext: { scope: 'global' }`, o escopo que não injeta `empresaId`/`filialId` (D112).
//
// 404 de "ainda não configurada" (empresa e filial) devolve `null`: é estado, não erro. Só vale para o código
// esperado (ver `ehEstadoNaoConfigurada`); qualquer outro 404 continua subindo como erro.

import { httpClient } from '@/lib/http/httpClient';
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
const SEM_INJECAO_DE_EMPRESA = { organizationalContext: { scope: 'global' as const } };

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
    async obterEmpresa(): Promise<ConfiguracaoFiscalEmpresaResponse | null> {
        try {
            const response = await httpClient.get<ConfiguracaoFiscalEmpresaResponse>(`${BASE}/empresa`, SEM_INJECAO_DE_EMPRESA);
            return parseEmpresa(response.data);
        } catch (error) {
            if (ehEstadoNaoConfigurada(mapApiError(error), CODIGO_CONFIGURACAO.empresaNaoEncontrada)) return null;
            throw error;
        }
    },
    async salvarEmpresa(values: unknown): Promise<ConfiguracaoFiscalEmpresaResponse> {
        const payload = buildSalvarConfiguracaoEmpresaPayload(values);
        const response = await httpClient.put<ConfiguracaoFiscalEmpresaResponse>(`${BASE}/empresa`, payload, SEM_INJECAO_DE_EMPRESA);
        return parseEmpresa(response.data);
    },
    async inativarEmpresa(values: unknown): Promise<void> {
        const payload = buildMotivoConfiguracaoPayload(values);
        await httpClient.post(`${BASE}/empresa/inativar`, payload, SEM_INJECAO_DE_EMPRESA);
    },
    async reativarEmpresa(values: unknown): Promise<void> {
        const payload = buildMotivoConfiguracaoPayload(values);
        await httpClient.post(`${BASE}/empresa/reativar`, payload, SEM_INJECAO_DE_EMPRESA);
    },
    /** `null` = filial sem configuração própria (herda da empresa). */
    async obterFilial(filialId: string): Promise<ConfiguracaoFiscalFilialResponse | null> {
        try {
            const response = await httpClient.get<ConfiguracaoFiscalFilialResponse>(`${BASE}/filiais/${filialId}`, SEM_INJECAO_DE_EMPRESA);
            return parseFilial(response.data);
        } catch (error) {
            if (ehEstadoNaoConfigurada(mapApiError(error), CODIGO_CONFIGURACAO.filialNaoEncontrada)) return null;
            throw error;
        }
    },
    async salvarFilial(filialId: string, values: unknown): Promise<ConfiguracaoFiscalFilialResponse> {
        const payload = buildSalvarConfiguracaoFilialPayload(values);
        const response = await httpClient.put<ConfiguracaoFiscalFilialResponse>(`${BASE}/filiais/${filialId}`, payload, SEM_INJECAO_DE_EMPRESA);
        return parseFilial(response.data);
    },
    async listarCertificados(query: ListarCertificadosQuery = {}): Promise<CertificadoDigitalResponse[]> {
        const response = await httpClient.get<CertificadoDigitalResponse[]>(`${BASE}/certificados`, {
            ...SEM_INJECAO_DE_EMPRESA,
            params: cleanQueryParams({ somenteAtivos: query.somenteAtivos })
        });
        return (response.data ?? []).map(parseCertificado);
    },
    /** A resposta traz só o thumbprint mascarado; o chamador nunca deve gravar o valor do formulário em cache. */
    async cadastrarCertificado(values: unknown): Promise<CertificadoDigitalResponse> {
        const payload = buildCadastrarCertificadoPayload(values);
        const response = await httpClient.post<CertificadoDigitalResponse>(`${BASE}/certificados`, payload, SEM_INJECAO_DE_EMPRESA);
        return parseCertificado(response.data);
    },
    async inativarCertificado(id: string, values: unknown): Promise<CertificadoDigitalResponse> {
        const payload = buildMotivoConfiguracaoPayload(values);
        const response = await httpClient.post<CertificadoDigitalResponse>(`${BASE}/certificados/${id}/inativar`, payload, SEM_INJECAO_DE_EMPRESA);
        return parseCertificado(response.data);
    },
    async verificarCertificado(id: string): Promise<VerificarCertificadoDigitalResponse> {
        const response = await httpClient.post<VerificarCertificadoDigitalResponse>(`${BASE}/certificados/${id}/verificar`, undefined, SEM_INJECAO_DE_EMPRESA);
        const parsed = verificarCertificadoDigitalResponseSchema.parse(response.data);
        return { disponivel: parsed.disponivel, motivo: parsed.motivo ?? '' };
    }
};
