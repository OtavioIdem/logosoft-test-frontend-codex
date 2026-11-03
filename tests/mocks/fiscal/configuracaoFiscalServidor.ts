// Servidor HTTP falso da fatia Configuração fiscal e certificados (v1.11.0a8b81). Fica em tests/mocks, o único lugar
// permitido para mock. Troca só o `adapter` do `httpClient` e do `rawHttpClient`: o cliente real, o interceptor de
// contexto organizacional e o `mapApiError` rodam de verdade. Respostas de erro viram `AxiosError` de verdade, para
// que o caminho de erro passe pelo mesmo código de produção.
//
// Segredo: o thumbprint usado nos testes é um valor de fixture claramente falso (prefixo SEGREDO-TESTE). Nunca
// aparece em resposta do servidor falso; só no corpo do POST, que é o que a tela deve enviar.

import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { vi } from 'vitest';
import { httpClient, rawHttpClient } from '@/lib/http/httpClient';

export type RespostaServidor = { status: number; body?: unknown };
export type ChamadaServidor = { metodo: string; url: string; params: Record<string, unknown>; body: unknown };
// A rota função pode devolver promise: é o que permite segurar uma resposta em voo (ex.: provar o que fica no cache
// enquanto a mutação ainda está pendente). Rota síncrona continua funcionando igual.
export type RotaServidor = RespostaServidor | ((chamada: ChamadaServidor) => RespostaServidor | Promise<RespostaServidor>);

/**
 * Erro com corpo reconhecível (code e/ou message). Sem nenhum dos dois, o corpo é omitido de propósito: é o "404 sem
 * corpo" que o cliente precisa tratar como erro.
 */
export const erroServidor = (status: number, code?: string, message?: string): RespostaServidor => ({
    status,
    body: code || message ? { code, message: message ?? 'Falha simulada' } : undefined
});

const lerCorpo = (data: unknown): unknown => {
    if (typeof data !== 'string') return data;
    try {
        return JSON.parse(data);
    } catch {
        return data;
    }
};

const responder = (config: InternalAxiosRequestConfig, resposta: RespostaServidor) => {
    if (resposta.status >= 400) {
        throw new AxiosError(`Request failed with status code ${resposta.status}`, 'ERR_BAD_REQUEST', config, undefined, {
            data: resposta.body,
            status: resposta.status,
            statusText: '',
            headers: {},
            config
        });
    }
    return { data: resposta.body, status: resposta.status, statusText: 'OK', headers: {}, config };
};

export type ServidorFiscalOpcoes = {
    /** Bloco `fiscal` do health. Omitido = o backend não devolveu o bloco (não prova SEFAZ real). */
    health?: { fiscal?: { mock: boolean; ambiente: string } | null };
};

/**
 * Instala as rotas falsas e devolve o registro de chamadas. Rota sem mock responde 500 com código explícito, para
 * que um teste que esqueceu uma rota falhe de forma visível, nunca por silêncio.
 */
export const instalarServidorFiscal = (rotas: Record<string, RotaServidor>, opcoes: ServidorFiscalOpcoes = {}) => {
    const chamadas: ChamadaServidor[] = [];
    const adapterOriginalHttp = httpClient.defaults.adapter;
    const adapterOriginalRaw = rawHttpClient.defaults.adapter;

    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        const metodo = String(config.method ?? 'get').toUpperCase();
        const url = String(config.url);
        const chamada: ChamadaServidor = { metodo, url, params: { ...((config.params as Record<string, unknown>) ?? {}) }, body: lerCorpo(config.data) };
        chamadas.push(chamada);

        const chave = `${metodo} ${url}`;
        const rota = rotas[chave];
        const resposta: RespostaServidor =
            rota === undefined
                ? erroServidor(500, 'Teste.RotaNaoMockada', `Sem mock para ${chave}`)
                : typeof rota === 'function'
                  ? await rota(chamada)
                  : rota;
        return responder(config, resposta);
    });

    rawHttpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
        responder(config, {
            status: 200,
            body: { status: 'ok', service: 'LogoSoft.Erp.Api', utcNow: new Date().toISOString(), ...(opcoes.health ?? {}) }
        })
    );

    return {
        chamadas,
        chamadasDe: (chave: string) => chamadas.filter((chamada) => `${chamada.metodo} ${chamada.url}` === chave),
        restaurar: () => {
            httpClient.defaults.adapter = adapterOriginalHttp;
            rawHttpClient.defaults.adapter = adapterOriginalRaw;
        }
    };
};

// Fixtures. Identificadores fixos e legíveis; datas sempre relativas ao instante do teste.
export const EMPRESA_USUARIO_ID = '11111111-1111-1111-1111-111111111111';
export const EMPRESA_OUTRA_ID = '99999999-9999-9999-9999-999999999999';
export const FILIAL_ID = '22222222-2222-2222-2222-222222222222';
export const CONFIGURACAO_EMPRESA_ID = '55555555-5555-5555-5555-555555555555';
export const CONFIGURACAO_FILIAL_ID = '66666666-6666-6666-6666-666666666666';
export const CERT_MATRIZ_ID = '33333333-3333-3333-3333-333333333333';
export const CERT_FILIAL_ID = '44444444-4444-4444-4444-444444444444';

/** Thumbprint digitado no cadastro. Valor de fixture: nunca deve sobreviver ao salvar nem aparecer no cache. */
export const THUMBPRINT_DIGITADO = 'SEGREDO-TESTE-THUMB-7F3A9C12E8';
export const THUMBPRINT_MASCARADO_MATRIZ = '******C12E8';

export const diasAFrente = (dias: number, agora: Date = new Date()) => new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();

export const empresaConfigurada = (over: Record<string, unknown> = {}) => ({
    id: CONFIGURACAO_EMPRESA_ID,
    ambiente: 1,
    emitirNFe: true,
    emitirNFCe: false,
    emitirNFSe: false,
    certificadoDigitalId: null,
    observacao: null,
    ativo: true,
    ...over
});

export const filialConfigurada = (over: Record<string, unknown> = {}) => ({
    id: CONFIGURACAO_FILIAL_ID,
    filialId: FILIAL_ID,
    ambiente: 2,
    herdaConfiguracaoEmpresa: false,
    certificadoDigitalId: null,
    serieNFePadrao: '1',
    serieNFCePadrao: null,
    observacao: null,
    ativo: true,
    ...over
});

export const certificadoMatriz = (over: Record<string, unknown> = {}) => ({
    id: CERT_MATRIZ_ID,
    filialId: null,
    apelido: 'Certificado Matriz',
    tipo: 1,
    thumbprintMascarado: THUMBPRINT_MASCARADO_MATRIZ,
    validoAte: diasAFrente(400),
    situacao: 1,
    observacao: null,
    ...over
});

export const certificadoFilial = (over: Record<string, unknown> = {}) => ({
    id: CERT_FILIAL_ID,
    filialId: FILIAL_ID,
    apelido: 'Certificado Filial',
    tipo: 2,
    thumbprintMascarado: '******A0B1C',
    validoAte: diasAFrente(200),
    situacao: 1,
    observacao: null,
    ...over
});
