import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAtualizarDadosFiscaisPessoaPayload, pessoaFiscalApi, PessoaFiscalApiError } from '@/features/pessoas/api/pessoaFiscalApi';
import { buildVincularMunicipioEnderecoPessoaPayload, pessoaEnderecosApi } from '@/features/pessoas/api/pessoaEnderecosApi';
import { atualizarDadosFiscaisPessoaSchema, pessoaResponseSchema, vincularMunicipioEnderecoPessoaSchema } from '@/features/pessoas/schemas/pessoasSchemas';
import { PESSOA_FISCAL_VALIDACAO } from '@/features/pessoas/components/pessoaFiscalLabels';
import { fiscalFormFromRecord, montarDadosFiscaisRequest, municipioOuPaisPreenchido, registroTemDadosFiscais } from '@/features/pessoas/components/pessoaFiscalForm';
import { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { httpClient } from '@/lib/http/httpClient';

// b75 (D104) — AC-1 da Pessoa fiscal. Schemas, funções do formulário e clients REAIS; só a rede (adapter do axios) é
// trocada. O que se afirma é o request que sairia para o backend (PATCH que SUBSTITUI o bloco inteiro, PF-1).

const pessoaId = '10000000-0000-0000-0000-000000000001';
const enderecoId = '20000000-0000-0000-0000-000000000002';

// Os 8 campos de `AtualizarDadosFiscaisPessoaRequest` (`PessoaRequests.cs:37-45`).
const OITO_CAMPOS = ['contribuinteIpi', 'indicadorContribuinteIcms', 'inscricaoEstadualSt', 'municipioIbgeCodigo', 'paisCodigoBacen', 'regimeTributarioParceiro', 'suframa', 'tomadorOrgaoPublico'];

const tudoNulo = () => ({
    indicadorContribuinteIcms: null,
    inscricaoEstadualSt: null,
    suframa: null,
    regimeTributarioParceiro: null,
    municipioIbgeCodigo: null,
    paisCodigoBacen: null,
    contribuinteIpi: null,
    tomadorOrgaoPublico: null
});

const preenchido = (extra: Record<string, unknown> = {}) => ({
    ...tudoNulo(),
    indicadorContribuinteIcms: 3,
    inscricaoEstadualSt: '  st-123  ',
    suframa: ' 123456789 ',
    regimeTributarioParceiro: 0,
    contribuinteIpi: false,
    tomadorOrgaoPublico: true,
    ...extra
});

const mensagens = (result: { success: boolean; error?: { issues: { message: string; path: (string | number)[] }[] } }) => (result.success ? [] : (result.error?.issues ?? []).map((issue) => `${issue.path.join('.')}: ${issue.message}`));

// `PessoaResponse.cs:7-29`: 22 campos, os fiscais incluídos (nulos são devolvidos, não omitidos).
const respostaPessoa = (extra: Record<string, unknown> = {}) => ({
    id: pessoaId,
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    tipoPessoa: 2,
    nomeRazaoSocial: 'Cliente Teste Ltda',
    nomeFantasia: null,
    documento: '11222333000181',
    inscricaoEstadual: '123456789',
    inscricaoMunicipal: null,
    observacao: null,
    status: 1,
    indicadorContribuinteIcms: 1,
    indicadorIeDestinatario: 1,
    inscricaoEstadualSt: null,
    suframa: null,
    regimeTributarioParceiro: null,
    municipioIbgeId: null,
    paisId: null,
    bloqueada: false,
    motivoBloqueio: null,
    contribuinteIpi: null,
    tomadorOrgaoPublico: null,
    ...extra
});

const adapterOriginal = httpClient.defaults.adapter;
afterEach(() => {
    httpClient.defaults.adapter = adapterOriginal;
});

type Capturado = { method?: string; url?: string; data: unknown };
const instalarRede = (responder: (config: InternalAxiosRequestConfig) => unknown) => {
    const capturados: Capturado[] = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        capturados.push({ method: config.method, url: config.url, data: config.data });
        const resposta = responder(config);
        if (resposta instanceof Error) throw resposta;
        return { data: resposta, status: 200, statusText: 'OK', headers: {}, config };
    });
    return capturados;
};

describe('AC-1: request de dados fiscais `.strict()` com os 8 campos obrigatórios (null explícito)', () => {
    it('os 8 em null passam (limpar o bloco) e o payload leva exatamente as 8 chaves, todas null', () => {
        const payload = buildAtualizarDadosFiscaisPessoaPayload(tudoNulo());
        expect(Object.keys(payload).sort()).toEqual(OITO_CAMPOS);
        for (const campo of OITO_CAMPOS) expect(payload[campo as keyof typeof payload]).toBeNull();
    });

    it.each(OITO_CAMPOS)('omitir "%s" reprova (campo omitido apagaria o valor gravado em silêncio)', (campo) => {
        const valores: Record<string, unknown> = tudoNulo();
        delete valores[campo];
        const result = atualizarDadosFiscaisPessoaSchema.safeParse(valores);
        expect(result.success).toBe(false);
        expect(mensagens(result).some((linha) => linha.startsWith(`${campo}:`))).toBe(true);
    });

    it('campo desconhecido reprova com unrecognized_keys (request estrito)', () => {
        const result = atualizarDadosFiscaisPessoaSchema.safeParse({ ...tudoNulo(), indicadorIeDestinatario: 1 });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues.map((issue) => issue.code)).toContain('unrecognized_keys');
    });

    it('normaliza: textos aparados, texto em branco vira null, false é preservado', () => {
        const payload = buildAtualizarDadosFiscaisPessoaPayload(preenchido({ suframa: '   ' }));
        expect(payload).toEqual({
            indicadorContribuinteIcms: 3,
            inscricaoEstadualSt: 'st-123',
            suframa: null,
            regimeTributarioParceiro: 0,
            municipioIbgeCodigo: null,
            paisCodigoBacen: null,
            contribuinteIpi: false,
            tomadorOrgaoPublico: true
        });
    });

    it.each([
        ['inscricaoEstadualSt', 'X'],
        ['suframa', '1'],
        ['regimeTributarioParceiro', 0],
        ['contribuinteIpi', false],
        ['tomadorOrgaoPublico', false],
        ['municipioIbgeCodigo', '3550308'],
        ['paisCodigoBacen', '1058']
    ])('indicador obrigatório quando "%s" está preenchido', (campo, valor) => {
        const result = atualizarDadosFiscaisPessoaSchema.safeParse({ ...tudoNulo(), [campo]: valor });
        expect(mensagens(result)).toEqual([`indicadorContribuinteIcms: ${PESSOA_FISCAL_VALIDACAO.indicadorObrigatorio}`]);
        expect(atualizarDadosFiscaisPessoaSchema.safeParse({ ...tudoNulo(), [campo]: valor, indicadorContribuinteIcms: 2 }).success).toBe(true);
    });

    it('indicador fora de 1/2/3 e regime fora de 0/1/2 reprovam', () => {
        expect(mensagens(atualizarDadosFiscaisPessoaSchema.safeParse({ ...tudoNulo(), indicadorContribuinteIcms: 9 }))).toEqual([`indicadorContribuinteIcms: ${PESSOA_FISCAL_VALIDACAO.valorInvalido}`]);
        expect(mensagens(atualizarDadosFiscaisPessoaSchema.safeParse(preenchido({ regimeTributarioParceiro: 3 })))).toEqual([`regimeTributarioParceiro: ${PESSOA_FISCAL_VALIDACAO.valorInvalido}`]);
    });

    it('SUFRAMA: só dígitos e até 9', () => {
        expect(atualizarDadosFiscaisPessoaSchema.safeParse(preenchido({ suframa: '123456789' })).success).toBe(true);
        expect(mensagens(atualizarDadosFiscaisPessoaSchema.safeParse(preenchido({ suframa: '1234567890' })))).toEqual([`suframa: ${PESSOA_FISCAL_VALIDACAO.suframaTamanho}`]);
        expect(mensagens(atualizarDadosFiscaisPessoaSchema.safeParse(preenchido({ suframa: '12345A' })))).toEqual([`suframa: ${PESSOA_FISCAL_VALIDACAO.suframaSoDigitos}`]);
        expect(mensagens(atualizarDadosFiscaisPessoaSchema.safeParse(preenchido({ suframa: '12.345' })))).toEqual([`suframa: ${PESSOA_FISCAL_VALIDACAO.suframaSoDigitos}`]);
    });

    it('IE de ST: até 20', () => {
        expect(atualizarDadosFiscaisPessoaSchema.safeParse(preenchido({ inscricaoEstadualSt: 'A'.repeat(20) })).success).toBe(true);
        expect(mensagens(atualizarDadosFiscaisPessoaSchema.safeParse(preenchido({ inscricaoEstadualSt: 'A'.repeat(21) })))).toEqual([`inscricaoEstadualSt: ${PESSOA_FISCAL_VALIDACAO.inscricaoEstadualStTamanho}`]);
    });

    it('o client envia o PATCH com as 8 chaves e devolve a resposta validada', async () => {
        const capturados = instalarRede(() => respostaPessoa({ indicadorContribuinteIcms: 3, suframa: '123456789' }));
        const resposta = await pessoaFiscalApi.atualizar(pessoaId, preenchido());
        expect(capturados).toHaveLength(1);
        expect(capturados[0]).toMatchObject({ method: 'patch', url: `/api/pessoas/${pessoaId}/dados-fiscais` });
        const corpo = JSON.parse(String(capturados[0].data));
        expect(Object.keys(corpo).sort()).toEqual(OITO_CAMPOS);
        expect(corpo).toMatchObject({ indicadorContribuinteIcms: 3, suframa: '123456789', contribuinteIpi: false, municipioIbgeCodigo: null, paisCodigoBacen: null });
        expect(resposta.suframa).toBe('123456789');
    });

    it('request inválido não chega à rede', async () => {
        const capturados = instalarRede(() => respostaPessoa());
        await expect(pessoaFiscalApi.atualizar(pessoaId, { indicadorContribuinteIcms: 3 })).rejects.toBeTruthy();
        expect(capturados).toHaveLength(0);
    });

    it('erro 400 do backend preserva code, status, traceId e erros por campo', async () => {
        instalarRede((config) => {
            const data = { success: false, error: { code: 'PESSOAS_VALIDACAO', message: 'Contribuinte exige IE.', traceId: 'trace-b75-400', validationErrors: [{ field: 'IndicadorContribuinteIcms', message: 'Exige IE.' }] } };
            return new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, { data, status: 400, statusText: 'Bad Request', headers: new AxiosHeaders(), config });
        });
        const erro = await pessoaFiscalApi.atualizar(pessoaId, preenchido()).catch((error) => error);
        expect(erro).toBeInstanceOf(PessoaFiscalApiError);
        expect(erro.apiError).toMatchObject({ code: 'PESSOAS_VALIDACAO', status: 400, traceId: 'trace-b75-400', message: 'Contribuinte exige IE.' });
        expect(JSON.stringify(erro.apiError)).toContain('IndicadorContribuinteIcms');
    });
});

describe('AC-1: request de vínculo de município com exatamente 7 dígitos', () => {
    it.each([['3550308'], [' 3304557 ']])('aceita "%s" e envia só municipioIbgeCodigo aparado', (codigo) => {
        expect(buildVincularMunicipioEnderecoPessoaPayload({ municipioIbgeCodigo: codigo })).toEqual({ municipioIbgeCodigo: codigo.trim() });
    });

    it.each([['355030'], ['35503080'], ['355030A'], [''], [null], [undefined]])('recusa %s', (codigo) => {
        const result = vincularMunicipioEnderecoPessoaSchema.safeParse({ municipioIbgeCodigo: codigo });
        expect(result.success).toBe(false);
        expect(mensagens(result)).toEqual([`municipioIbgeCodigo: ${PESSOA_FISCAL_VALIDACAO.municipioIbgeCodigoInvalido}`]);
    });

    it('recusa campo desconhecido (request estrito)', () => {
        const result = vincularMunicipioEnderecoPessoaSchema.safeParse({ municipioIbgeCodigo: '3550308', municipioIbgeId: 'x' });
        expect(result.success).toBe(false);
        if (!result.success) expect(result.error.issues.map((issue) => issue.code)).toContain('unrecognized_keys');
    });

    it('o client envia PATCH .../enderecos/{id}/municipio com o código', async () => {
        const capturados = instalarRede(() => ({ id: enderecoId, pessoaId, tipo: 1, logradouro: 'Rua', numero: '1', complemento: null, bairro: 'B', cidade: 'São Paulo', uf: 'SP', cep: '01310100', principal: true, status: 1, municipioIbgeId: '30000000-0000-0000-0000-000000003550' }));
        await pessoaEnderecosApi.vincularMunicipio(pessoaId, enderecoId, { municipioIbgeCodigo: '3550308' });
        expect(capturados).toHaveLength(1);
        expect(capturados[0]).toMatchObject({ method: 'patch', url: `/api/pessoas/${pessoaId}/enderecos/${enderecoId}/municipio` });
        expect(JSON.parse(String(capturados[0].data))).toEqual({ municipioIbgeCodigo: '3550308' });
    });
});

describe('AC-1: PessoaResponse com os campos fiscais, não estrito, createdAt opcional', () => {
    it('aceita a resposta do backend sem createdAt e lê os campos fiscais', () => {
        const parsed = pessoaResponseSchema.parse(respostaPessoa({ suframa: '123', municipioIbgeId: '30000000-0000-0000-0000-000000003550' }));
        expect(parsed).not.toHaveProperty('createdAt');
        expect(parsed).toMatchObject({ indicadorContribuinteIcms: 1, indicadorIeDestinatario: 1, suframa: '123', municipioIbgeId: '30000000-0000-0000-0000-000000003550', paisId: null, bloqueada: false });
    });

    it('campo aditivo do backend não quebra a leitura e é preservado', () => {
        const result = pessoaResponseSchema.safeParse(respostaPessoa({ campoNovoDoBackend: 'x' }));
        expect(result.success).toBe(true);
        if (result.success) expect((result.data as Record<string, unknown>).campoNovoDoBackend).toBe('x');
    });

    it('enum em texto (fora do contrato) reprova, sem fallback silencioso', () => {
        expect(pessoaResponseSchema.safeParse(respostaPessoa({ indicadorContribuinteIcms: 'Contribuinte' })).success).toBe(false);
    });
});

describe('PF-1 e emenda da D104: o formulário carrega do registro e envia os 8', () => {
    const registro = (extra: Partial<PessoaResponse> = {}) => respostaPessoa({ indicadorContribuinteIcms: 3, inscricaoEstadualSt: 'ST1', suframa: '777', regimeTributarioParceiro: 1, contribuinteIpi: true, tomadorOrgaoPublico: false, ...extra }) as unknown as PessoaResponse;

    it('fiscalFormFromRecord + montarDadosFiscaisRequest devolvem os valores gravados, município e país nulos', () => {
        expect(montarDadosFiscaisRequest(fiscalFormFromRecord(registro()))).toEqual({
            indicadorContribuinteIcms: 3,
            inscricaoEstadualSt: 'ST1',
            suframa: '777',
            regimeTributarioParceiro: 1,
            municipioIbgeCodigo: null,
            paisCodigoBacen: null,
            contribuinteIpi: true,
            tomadorOrgaoPublico: false
        });
    });

    it('registro com chave fiscal ausente (undefined) não é gravável; null é', () => {
        expect(registroTemDadosFiscais(registro())).toBe(true);
        for (const chave of ['indicadorContribuinteIcms', 'inscricaoEstadualSt', 'suframa', 'regimeTributarioParceiro', 'municipioIbgeId', 'paisId', 'contribuinteIpi', 'tomadorOrgaoPublico']) {
            const semChave = { ...registro() } as Record<string, unknown>;
            delete semChave[chave];
            expect({ chave, gravavel: registroTemDadosFiscais(semChave as unknown as PessoaResponse) }).toEqual({ chave, gravavel: false });
        }
    });

    it('município ou país preenchido no registro é detectado', () => {
        expect(municipioOuPaisPreenchido(registro())).toBe(false);
        expect(municipioOuPaisPreenchido(registro({ municipioIbgeId: '30000000-0000-0000-0000-000000003550' }))).toBe(true);
        expect(municipioOuPaisPreenchido(registro({ paisId: '40000000-0000-0000-0000-000000001058' }))).toBe(true);
    });
});
