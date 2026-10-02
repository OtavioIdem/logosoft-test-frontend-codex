import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildAtualizarEnderecoPessoaPayload, buildCriarEnderecoPessoaPayload, pessoaEnderecosApi, PessoaEnderecosApiError } from '@/features/pessoas/api/pessoaEnderecosApi';
import { atualizarEnderecoPessoaSchema, criarEnderecoPessoaSchema, enderecoPessoaResponseSchema, enderecosPessoaResponseSchema } from '@/features/pessoas/schemas/pessoasSchemas';
import { PESSOA_ENDERECO_VALIDACAO } from '@/features/pessoas/components/pessoaEnderecosLabels';
import { UFS_BRASIL } from '@/lib/constants/ufs';
import { UFS_BRASIL as UFS_BRASIL_FATURAMENTO } from '@/features/faturamento/schemas/faturamentoSchemas';
import { mapApiError } from '@/lib/http/apiError';
import { httpClient } from '@/lib/http/httpClient';

// b73 (D102) — AC-1 e AC-7 dos endereços da Pessoa. Schemas e client REAIS; só a rede (adapter do axios) é
// trocada, e o que se afirma é o request que sairia para o backend e o erro que volta para a tela.

const pessoaId = '10000000-0000-0000-0000-000000000001';
const enderecoId = '20000000-0000-0000-0000-000000000002';

// Os 9 campos de `AdicionarEnderecoPessoaRequest`/`AtualizarEnderecoPessoaRequest` (`EnderecoContatoRequests.cs:5-25`).
const NOVE_CAMPOS = ['bairro', 'cep', 'cidade', 'complemento', 'logradouro', 'numero', 'principal', 'tipo', 'uf'];

const formValido = () => ({
    tipo: 1,
    logradouro: '  Rua das Flores  ',
    numero: '100',
    complemento: 'Sala 2',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'sp',
    cep: '01310-100',
    principal: false
});

const respostaEndereco = (extra: Record<string, unknown> = {}) => ({
    id: enderecoId,
    pessoaId,
    tipo: 1,
    logradouro: 'Rua das Flores',
    numero: '100',
    complemento: null,
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01310100',
    principal: true,
    status: 1,
    municipioIbgeId: null,
    ...extra
});

describe('AC-1: request de endereço é estrito e leva exatamente os 9 campos', () => {
    it.each([
        ['criar', criarEnderecoPessoaSchema],
        ['atualizar', atualizarEnderecoPessoaSchema]
    ])('schema de %s aceita o formulário válido e devolve só os 9 campos, normalizados', (_nome, schema) => {
        const parsed = schema.parse(formValido());
        expect(Object.keys(parsed).sort()).toEqual(NOVE_CAMPOS);
        expect(parsed).toEqual({ tipo: 1, logradouro: 'Rua das Flores', numero: '100', complemento: 'Sala 2', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01310100', principal: false });
    });

    it.each([
        ['criar', criarEnderecoPessoaSchema],
        ['atualizar', atualizarEnderecoPessoaSchema]
    ])('schema de %s recusa campo desconhecido (municipioIbgeCodigo é do PATCH da b75)', (_nome, schema) => {
        const result = schema.safeParse({ ...formValido(), municipioIbgeCodigo: '3550308' });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues.map((issue) => issue.code)).toContain('unrecognized_keys');
    });

    it('as 27 UFs passam; UF fora das 27 é recusada com a mensagem própria', () => {
        expect(UFS_BRASIL).toHaveLength(27);
        for (const uf of UFS_BRASIL) {
            expect(criarEnderecoPessoaSchema.safeParse({ ...formValido(), uf }).success, uf).toBe(true);
        }
        for (const uf of ['XX', 'BR', 'S', '']) {
            const result = criarEnderecoPessoaSchema.safeParse({ ...formValido(), uf });
            expect(result.success, uf).toBe(false);
            if (!result.success) expect(result.error.issues.find((issue) => issue.path[0] === 'uf')?.message).toBe(uf ? PESSOA_ENDERECO_VALIDACAO.ufInvalida : PESSOA_ENDERECO_VALIDACAO.ufObrigatoria);
        }
    });

    it('a lista de UF de Faturamento é a mesma de lib (reexport, não cópia)', () => {
        expect(UFS_BRASIL_FATURAMENTO).toBe(UFS_BRASIL);
    });

    it('cidade com 120 caracteres passa; com 121 é recusada; vazia é obrigatória', () => {
        expect(criarEnderecoPessoaSchema.safeParse({ ...formValido(), cidade: 'C'.repeat(120) }).success).toBe(true);
        const longa = criarEnderecoPessoaSchema.safeParse({ ...formValido(), cidade: 'C'.repeat(121) });
        expect(longa.success).toBe(false);
        if (!longa.success) expect(longa.error.issues.find((issue) => issue.path[0] === 'cidade')?.message).toBe(PESSOA_ENDERECO_VALIDACAO.cidadeTamanho);
        const vazia = criarEnderecoPessoaSchema.safeParse({ ...formValido(), cidade: '   ' });
        expect(vazia.success).toBe(false);
        if (!vazia.success) expect(vazia.error.issues.find((issue) => issue.path[0] === 'cidade')?.message).toBe(PESSOA_ENDERECO_VALIDACAO.cidadeObrigatoria);
    });

    it('limites do C#: logradouro 200, número 30, complemento 120, bairro 120', () => {
        const casos: [string, number][] = [
            ['logradouro', 200],
            ['numero', 30],
            ['complemento', 120],
            ['bairro', 120]
        ];
        for (const [campo, limite] of casos) {
            expect(criarEnderecoPessoaSchema.safeParse({ ...formValido(), [campo]: 'x'.repeat(limite) }).success, `${campo}=${limite}`).toBe(true);
            expect(criarEnderecoPessoaSchema.safeParse({ ...formValido(), [campo]: 'x'.repeat(limite + 1) }).success, `${campo}=${limite + 1}`).toBe(false);
        }
    });

    it('CEP sai só com dígitos; menos de 8 dígitos é recusado', () => {
        expect(criarEnderecoPessoaSchema.parse({ ...formValido(), cep: '01310-100' }).cep).toBe('01310100');
        expect(criarEnderecoPessoaSchema.parse({ ...formValido(), cep: '01.310-100' }).cep).toBe('01310100');
        const curto = criarEnderecoPessoaSchema.safeParse({ ...formValido(), cep: '01310-10_' });
        expect(curto.success).toBe(false);
        if (!curto.success) expect(curto.error.issues.find((issue) => issue.path[0] === 'cep')?.message).toBe(PESSOA_ENDERECO_VALIDACAO.cepInvalido);
    });

    it('complemento vazio vira null; tipo fora do enum é recusado', () => {
        expect(buildCriarEnderecoPessoaPayload({ ...formValido(), complemento: '   ' }).complemento).toBeNull();
        expect(criarEnderecoPessoaSchema.safeParse({ ...formValido(), tipo: 6 }).success).toBe(false);
        expect(criarEnderecoPessoaSchema.safeParse({ ...formValido(), tipo: 99 }).success).toBe(true);
    });

    it('builders de payload de criar e atualizar produzem os 9 campos', () => {
        expect(Object.keys(buildCriarEnderecoPessoaPayload(formValido())).sort()).toEqual(NOVE_CAMPOS);
        expect(Object.keys(buildAtualizarEnderecoPessoaPayload(formValido())).sort()).toEqual(NOVE_CAMPOS);
    });

    it('a response NÃO é estrita: campo aditivo do backend passa', () => {
        expect(enderecoPessoaResponseSchema.safeParse(respostaEndereco({ campoNovoDoBackend: 'x' })).success).toBe(true);
        expect(enderecosPessoaResponseSchema.safeParse([respostaEndereco({ outroCampo: 1 })]).success).toBe(true);
    });
});

type Capturado = { method?: string; url?: string; data: unknown };
let capturados: Capturado[];
const adapterOriginal = httpClient.defaults.adapter;
const ok = (config: InternalAxiosRequestConfig, data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config });
const falha400 = (config: InternalAxiosRequestConfig, data: unknown) => {
    const response = { data, status: 400, statusText: 'Bad Request', headers: new AxiosHeaders(), config };
    return new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, response);
};

const erroPessoasValidacao = {
    success: false,
    error: {
        code: 'PESSOAS_VALIDACAO',
        message: 'Endereço não encontrado para a pessoa.',
        traceId: 'trace-end-400',
        validationErrors: [{ field: 'Cep', message: 'CEP deve ter 8 dígitos.' }]
    }
};

let modo: 'ok' | 'erro';

beforeEach(() => {
    capturados = [];
    modo = 'ok';
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        capturados.push({ method: config.method, url: config.url, data: config.data });
        if (modo === 'erro') throw falha400(config, erroPessoasValidacao);
        if (config.method === 'get') return ok(config, [respostaEndereco()]);
        if (config.method === 'delete') return { data: '', status: 204, statusText: 'No Content', headers: {}, config };
        return ok(config, respostaEndereco(), config.method === 'post' && !String(config.url).endsWith('/principal') ? 201 : 200);
    });
});

afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

describe('client de endereços: rotas e corpo', () => {
    it('criar e atualizar enviam os 9 campos, com CEP só em dígitos e UF maiúscula', async () => {
        await pessoaEnderecosApi.criar(pessoaId, formValido());
        await pessoaEnderecosApi.atualizar(pessoaId, enderecoId, formValido());
        expect(capturados.map((item) => `${item.method} ${item.url}`)).toEqual([`post /api/pessoas/${pessoaId}/enderecos`, `put /api/pessoas/${pessoaId}/enderecos/${enderecoId}`]);
        for (const item of capturados) {
            const corpo = JSON.parse(String(item.data));
            expect(Object.keys(corpo).sort()).toEqual(NOVE_CAMPOS);
            expect(corpo.cep).toBe('01310100');
            expect(corpo.uf).toBe('SP');
        }
    });

    it('principal é POST sem corpo; excluir é DELETE sem corpo', async () => {
        await pessoaEnderecosApi.definirPrincipal(pessoaId, enderecoId);
        await pessoaEnderecosApi.excluir(pessoaId, enderecoId);
        expect(capturados.map((item) => `${item.method} ${item.url}`)).toEqual([`post /api/pessoas/${pessoaId}/enderecos/${enderecoId}/principal`, `delete /api/pessoas/${pessoaId}/enderecos/${enderecoId}`]);
        expect(capturados.map((item) => item.data)).toEqual([undefined, undefined]);
    });

    it('formulário inválido não sai para a rede', async () => {
        await expect(pessoaEnderecosApi.criar(pessoaId, { ...formValido(), uf: 'XX' })).rejects.toThrow();
        expect(capturados).toHaveLength(0);
    });

    it('response fora do contrato vira erro explícito, sem fallback', async () => {
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => ok(config, [{ ...respostaEndereco(), tipo: 'Comercial' }]));
        await expect(pessoaEnderecosApi.listar(pessoaId)).rejects.toBeInstanceOf(PessoaEnderecosApiError);
    });
});

describe('AC-7: o client preserva code, status, traceId e validationErrors', () => {
    it.each([
        ['listar', () => pessoaEnderecosApi.listar(pessoaId)],
        ['criar', () => pessoaEnderecosApi.criar(pessoaId, formValido())],
        ['atualizar', () => pessoaEnderecosApi.atualizar(pessoaId, enderecoId, formValido())],
        ['definirPrincipal', () => pessoaEnderecosApi.definirPrincipal(pessoaId, enderecoId)],
        ['excluir', () => pessoaEnderecosApi.excluir(pessoaId, enderecoId)]
    ])('%s', async (_nome, chamar) => {
        modo = 'erro';
        const erro = await chamar().then(
            () => null,
            (error: unknown) => error
        );
        expect(erro).toBeInstanceOf(PessoaEnderecosApiError);
        const mapeado = mapApiError(erro);
        expect(mapeado.code).toBe('PESSOAS_VALIDACAO');
        expect(mapeado.status).toBe(400);
        expect(mapeado.traceId).toBe('trace-end-400');
        expect(mapeado.message).toBe('Endereço não encontrado para a pessoa.');
        expect(mapeado.validationErrors).toEqual([{ field: 'Cep', message: 'CEP deve ter 8 dígitos.' }]);
    });
});
