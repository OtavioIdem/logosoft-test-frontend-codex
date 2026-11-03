import { AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cadastrosFiscaisApi } from '@/features/fiscal/api/cadastrosFiscaisApi';
import { gtinClassificacaoResponseSchema } from '@/features/fiscal/schemas/cadastrosFiscaisSchemas';
import { httpClient } from '@/lib/http/httpClient';

// v1.11.0a8b80 (D110/D111) — requisição e resposta da rota `GET /api/fiscal/cadastros/gtin-classificacao/{gtin}`.
// O client e o schema são os reais; só a rede (adapter do httpClient) é trocada. O schema de RESPONSE não é strict:
// campo aditivo do backend não pode quebrar o painel.

const GTIN_14 = '07891000100103';
const ROTA = `/api/fiscal/cadastros/gtin-classificacao/${GTIN_14}`;

const item = {
    anexo: 'I',
    itemAnexo: '1.2',
    descricaoItemAnexo: 'Cesta básica',
    ncmCodigo: '22030000',
    descricao: 'Arroz integral',
    cstIbsCbs: '200',
    classificacaoTributaria: '000001',
    percentualReducaoIbs: 60,
    percentualReducaoCbs: 40,
    vigenciaInicio: '2026-01-01',
    vigenciaFim: null,
    alternativas: 'I:22030000:000002:50 | II:22030000:000003:30'
};

const encontrado = { gtin: GTIN_14, encontrado: true, classificacao: item };

let capturado: InternalAxiosRequestConfig | null;
let resposta: unknown;
const adapterOriginal = httpClient.defaults.adapter;

beforeEach(() => {
    capturado = null;
    resposta = encontrado;
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
        capturado = config;
        return { data: resposta, status: 200, statusText: 'OK', headers: new AxiosHeaders(), config };
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

describe('cadastrosFiscaisApi.obterClassificacaoPorGtin — requisição', () => {
    it('faz GET no caminho com o GTIN como texto, zero à esquerda intacto, sem corpo e sem query', async () => {
        await cadastrosFiscaisApi.obterClassificacaoPorGtin(GTIN_14);

        expect(capturado?.method).toBe('get');
        expect(capturado?.url).toBe(ROTA);
        expect(capturado?.params).toBeUndefined();
        expect(capturado?.data).toBeUndefined();
    });

    it('apara espaços do GTIN antes de montar o caminho (nenhum espaço vai para a URL)', async () => {
        await cadastrosFiscaisApi.obterClassificacaoPorGtin(`  ${GTIN_14} `);
        expect(capturado?.url).toBe(ROTA);
    });

    it('não envia `data` do dia: a ausência de parâmetro deixa o default de hoje para o backend', async () => {
        await cadastrosFiscaisApi.obterClassificacaoPorGtin(GTIN_14);
        expect(capturado?.url).not.toContain('data=');
        expect(capturado?.params).toBeUndefined();
    });
});

describe('cadastrosFiscaisApi.obterClassificacaoPorGtin — resposta', () => {
    it('devolve o encontrado com a classificação e o GTIN como texto', async () => {
        const retorno = await cadastrosFiscaisApi.obterClassificacaoPorGtin(GTIN_14);
        expect(retorno.gtin).toBe(GTIN_14);
        expect(retorno.encontrado).toBe(true);
        expect(retorno.classificacao).toMatchObject({ ncmCodigo: '22030000', classificacaoTributaria: '000001', cstIbsCbs: '200', percentualReducaoIbs: 60, percentualReducaoCbs: 40 });
    });

    it('encontrado false com classificacao null é resposta válida', async () => {
        resposta = { gtin: GTIN_14, encontrado: false, classificacao: null };
        const retorno = await cadastrosFiscaisApi.obterClassificacaoPorGtin(GTIN_14);
        expect(retorno).toEqual({ gtin: GTIN_14, encontrado: false, classificacao: null });
    });
});

describe('gtinClassificacaoResponseSchema', () => {
    it('aceita a resposta válida', () => {
        expect(gtinClassificacaoResponseSchema.safeParse(encontrado).success).toBe(true);
    });

    it('aceita campo aditivo na raiz e dentro do item (sem .strict() em response)', () => {
        const comAditivos = { ...encontrado, campoNovoRaiz: 'futuro', classificacao: { ...item, campoNovoItem: 42 } };
        expect(gtinClassificacaoResponseSchema.safeParse(comAditivos).success).toBe(true);
    });

    it('aceita classificacao null quando encontrado é false', () => {
        expect(gtinClassificacaoResponseSchema.safeParse({ gtin: GTIN_14, encontrado: false, classificacao: null }).success).toBe(true);
    });

    it('aceita alternativas, descricao e vigenciaFim ausentes ou nulos', () => {
        const minimo = { ...item, alternativas: undefined, descricao: undefined, vigenciaFim: undefined, descricaoItemAnexo: undefined };
        expect(gtinClassificacaoResponseSchema.safeParse({ gtin: GTIN_14, encontrado: true, classificacao: minimo }).success).toBe(true);
    });

    it('rejeita GTIN numérico: se virasse número, o zero à esquerda se perderia', () => {
        expect(gtinClassificacaoResponseSchema.safeParse({ ...encontrado, gtin: 7891000100103 }).success).toBe(false);
    });

    it('rejeita item sem percentual de redução (campo obrigatório do contrato)', () => {
        const { percentualReducaoIbs: _removido, ...semReducao } = item;
        expect(gtinClassificacaoResponseSchema.safeParse({ ...encontrado, classificacao: semReducao }).success).toBe(false);
    });
});
