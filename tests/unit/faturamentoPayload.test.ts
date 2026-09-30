import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { sanitizePayload } from '@/lib/http/requestUtils';
import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { FaturamentoApiError, faturamentoApi, respostaHttpRecebida } from '@/features/faturamento/api/faturamentoApi';
import { tipoDocumentoOptions } from '@/features/faturamento/components/faturamentoLabels';
import { cancelarFaturamentoSchema, confirmarFaturamentoFormSchema, confirmarFaturamentoSchema, prepararFaturamentoSchema, retomarReversaoLegSchema, UFS_BRASIL } from '@/features/faturamento/schemas/faturamentoSchemas';
import { TipoDocumentoFiscal, LegIntegracaoFaturamento, AcaoRetomadaReversaoLeg } from '@/features/faturamento/types/faturamento.types';

const pedidoId = '11111111-1111-1111-1111-111111111111';
const condicaoId = '22222222-2222-2222-2222-222222222222';
const naturezaId = '33333333-3333-3333-3333-333333333333';
const correlationId = 'front-faturamento-99999999-20260930120000-abc123';

const confirmarValido = () => ({
    ufAutorizadora: 'SP',
    tipoDocumento: TipoDocumentoFiscal.NFe,
    serie: '1',
    numero: '1001',
    naturezaOperacaoId: naturezaId,
    unidadeComercialPadrao: 'UN',
    validarDadosFiscaisProduto: true,
    condicaoPagamentoId: condicaoId,
    primeiraDataVencimentoContaReceber: new Date('2026-08-10T00:00:00.000Z'),
    correlationId
});

const build = <T>(schema: { parse: (v: unknown) => T }, values: unknown) => sanitizePayload(schema.parse(values));

describe('Faturamento — payloads', () => {
    it('monta preparar com pedido e observação opcional', () => {
        expect(build(prepararFaturamentoSchema, { pedidoVendaId: pedidoId, observacao: 'Urgente' })).toEqual({ pedidoVendaId: pedidoId, observacao: 'Urgente' });
        const semObs = build(prepararFaturamentoSchema, { pedidoVendaId: pedidoId, observacao: '' }) as Record<string, unknown>;
        expect(semObs).toMatchObject({ pedidoVendaId: pedidoId });
        expect(semObs.observacao).toBeNull();
    });

    it('rejeita preparar sem pedido válido', () => {
        expect(() => prepararFaturamentoSchema.parse({ pedidoVendaId: '99' })).toThrow();
    });

    it('monta confirmar com dados fiscais, natureza e correlationId, sem cfopPadrao, e converte a data de vencimento para ISO', () => {
        const payload = build(confirmarFaturamentoSchema, confirmarValido()) as Record<string, unknown>;
        expect(payload).toMatchObject({
            ufAutorizadora: 'SP',
            tipoDocumento: TipoDocumentoFiscal.NFe,
            serie: '1',
            numero: '1001',
            naturezaOperacaoId: naturezaId,
            correlationId,
            unidadeComercialPadrao: 'UN',
            condicaoPagamentoId: condicaoId
        });
        expect(payload.primeiraDataVencimentoContaReceber).toBe('2026-08-10T00:00:00.000Z');
        // D94: o CFOP não vai mais no request.
        expect(payload).not.toHaveProperty('cfopPadrao');
    });

    it('D94/D92: o request do confirmar recusa cfopPadrao (strict) e exige correlationId até 100 caracteres', () => {
        expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), cfopPadrao: '5102' })).toThrow();
        const { correlationId: _omitido, ...semCorrelation } = confirmarValido();
        expect(() => confirmarFaturamentoSchema.parse(semCorrelation)).toThrow();
        expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), correlationId: 'x'.repeat(101) })).toThrow('Identificador de correlação acima de 100 caracteres.');
        expect(confirmarFaturamentoSchema.parse({ ...confirmarValido(), correlationId: 'x'.repeat(100) }).correlationId).toHaveLength(100);
    });

    it('exige campos fiscais obrigatórios e a data de vencimento no confirmar', () => {
        // Cada caso parte do request válido e quebra um campo só, para o throw vir do campo testado.
        expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), ufAutorizadora: '' })).toThrow('Informe a UF autorizadora.');
        expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), primeiraDataVencimentoContaReceber: null })).toThrow('Informe a primeira data de vencimento.');
    });

    it('D91 (emenda do builder): exige a natureza sempre, com a validação fiscal ligada ou desligada', () => {
        expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), naturezaOperacaoId: null })).toThrow('Selecione a natureza de operação.');
        // Desligada, o backend aceitaria, mas a nota sairia sem CFOP e presa ao pedido (B-27): a UI recusa.
        expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), naturezaOperacaoId: null, validarDadosFiscaisProduto: false })).toThrow('Selecione a natureza de operação.');
        expect(confirmarFaturamentoFormSchema.safeParse({ ...confirmarValido(), naturezaOperacaoId: null, validarDadosFiscaisProduto: false }).success).toBe(false);
        // Com natureza, desligar a validação continua aceito.
        expect(confirmarFaturamentoSchema.parse({ ...confirmarValido(), validarDadosFiscaisProduto: false }).naturezaOperacaoId).toBe(naturezaId);
    });

    it('AC-6 (D94): UF só entre as 27 siglas, em maiúsculas', () => {
        expect(UFS_BRASIL).toHaveLength(27);
        for (const uf of ['XX', 'BR', 'S1', 'ZZ']) {
            expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), ufAutorizadora: uf })).toThrow('Informe uma UF válida (sigla de 2 letras, por exemplo SP).');
        }
        expect(confirmarFaturamentoSchema.parse({ ...confirmarValido(), ufAutorizadora: ' rj ' }).ufAutorizadora).toBe('RJ');
        expect(confirmarFaturamentoFormSchema.safeParse({ ...confirmarValido(), ufAutorizadora: 'XX' }).success).toBe(false);
    });

    it('AC-6 (D94): unidade comercial aceita 20 caracteres e recusa 21', () => {
        expect(confirmarFaturamentoSchema.parse({ ...confirmarValido(), unidadeComercialPadrao: 'U'.repeat(20) }).unidadeComercialPadrao).toBe('U'.repeat(20));
        expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), unidadeComercialPadrao: 'U'.repeat(21) })).toThrow('A unidade comercial aceita até 20 caracteres.');
    });

    it('AC-6 (D94): tipo de documento só NF-e e NFC-e, no schema e nas opções do diálogo', () => {
        expect(confirmarFaturamentoSchema.parse({ ...confirmarValido(), tipoDocumento: TipoDocumentoFiscal.NFCe }).tipoDocumento).toBe(TipoDocumentoFiscal.NFCe);
        for (const tipo of [TipoDocumentoFiscal.NFSe, TipoDocumentoFiscal.CTe, TipoDocumentoFiscal.MDFe, TipoDocumentoFiscal.Outro]) {
            expect(() => confirmarFaturamentoSchema.parse({ ...confirmarValido(), tipoDocumento: tipo })).toThrow('O tipo de documento deve ser NF-e ou NFC-e.');
        }
        expect(tipoDocumentoOptions).toEqual([
            { label: 'NF-e', value: TipoDocumentoFiscal.NFe },
            { label: 'NFC-e', value: TipoDocumentoFiscal.NFCe }
        ]);
    });

    it('monta cancelamento com motivo', () => {
        expect(build(cancelarFaturamentoSchema, { motivo: 'Erro de emissão' })).toEqual({ motivo: 'Erro de emissão' });
        expect(() => cancelarFaturamentoSchema.parse({ motivo: '' })).toThrow();
    });

    it('AC-17: cancelamento aceita 300 caracteres e recusa 301', () => {
        const motivo300 = 'x'.repeat(300);
        const motivo301 = 'x'.repeat(301);
        expect(build(cancelarFaturamentoSchema, { motivo: motivo300 })).toEqual({ motivo: motivo300 });
        expect(() => cancelarFaturamentoSchema.parse({ motivo: motivo301 })).toThrow('O motivo aceita até 300 caracteres.');
    });

    it('AC-9: retomada aceita motivo de 500 caracteres e recusa 501', () => {
        const motivo500 = 'x'.repeat(500);
        const motivo501 = 'x'.repeat(501);
        expect(build(retomarReversaoLegSchema, { leg: LegIntegracaoFaturamento.BaixarEstoque, acao: AcaoRetomadaReversaoLeg.ReaplicarInversa, motivo: motivo500 })).toEqual({ leg: 5, acao: 1, motivo: motivo500 });
        expect(() => retomarReversaoLegSchema.parse({ leg: LegIntegracaoFaturamento.BaixarEstoque, acao: AcaoRetomadaReversaoLeg.ReaplicarInversa, motivo: motivo501 })).toThrow('O motivo aceita até 500 caracteres.');
    });

    it('AC-9: retomada aplica trim ao motivo e recusa vazio/só espaços', () => {
        expect(build(retomarReversaoLegSchema, { leg: LegIntegracaoFaturamento.BaixarEstoque, acao: AcaoRetomadaReversaoLeg.ReaplicarInversa, motivo: '  test  ' })).toEqual({ leg: 5, acao: 1, motivo: 'test' });
        expect(() => retomarReversaoLegSchema.parse({ leg: LegIntegracaoFaturamento.BaixarEstoque, acao: AcaoRetomadaReversaoLeg.ReaplicarInversa, motivo: '' })).toThrow();
        expect(() => retomarReversaoLegSchema.parse({ leg: LegIntegracaoFaturamento.BaixarEstoque, acao: AcaoRetomadaReversaoLeg.ReaplicarInversa, motivo: '   ' })).toThrow();
    });

    it('AC-9: retomada recusa enum em string e campo extra', () => {
        expect(() => retomarReversaoLegSchema.parse({ leg: '5', acao: 1, motivo: 'test' })).toThrow();
        expect(() => retomarReversaoLegSchema.parse({ leg: 5, acao: 1, motivo: 'test', extra: true })).toThrow();
    });
});

// AC-5 (D93): o client de faturamento preserva o erro da API. O request passa pelo client real e pelo
// `httpClient` real; só o adapter (a rede) é trocado.
describe('Faturamento — client preserva o erro da API (AC-5) e sinaliza resposta HTTP (D92)', () => {
    const originalAdapter = httpClient.defaults.adapter;
    const faturamentoId = '99999999-9999-9999-9999-999999999999';

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
    });

    const responderCom400 = () => {
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            const response = {
                data: { code: 'Faturamento.CfopNaturezaOperacaoNaoInformada', message: 'Natureza de operação não informada.', traceId: 'trace-b71-400' },
                status: 400,
                statusText: 'Bad Request',
                headers: new AxiosHeaders(),
                config
            };
            throw new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', config, {}, response);
        });
    };

    it('400 vira FaturamentoApiError com code, status e traceId, e mapApiError devolve os mesmos metadados', async () => {
        responderCom400();
        const erro = await faturamentoApi.confirmar(faturamentoId, confirmarValido()).catch((falha: unknown) => falha);

        expect(erro).toBeInstanceOf(FaturamentoApiError);
        const apiError = (erro as FaturamentoApiError).apiError;
        expect(apiError.code).toBe('Faturamento.CfopNaturezaOperacaoNaoInformada');
        expect(apiError.status).toBe(400);
        expect(apiError.traceId).toBe('trace-b71-400');
        expect(apiError.message).toBe('Natureza de operação não informada.');
        expect(mapApiError(erro)).toMatchObject({ code: 'Faturamento.CfopNaturezaOperacaoNaoInformada', status: 400, traceId: 'trace-b71-400' });
        expect(respostaHttpRecebida(erro)).toBe(true);
    });

    it('falha de rede (sem resposta) não conta como resposta HTTP', async () => {
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            throw new AxiosError('Network Error', 'ERR_NETWORK', config, {});
        });
        const erro = await faturamentoApi.confirmar(faturamentoId, confirmarValido()).catch((falha: unknown) => falha);

        expect(erro).toBeInstanceOf(FaturamentoApiError);
        expect((erro as FaturamentoApiError).apiError.status).toBeUndefined();
        expect(respostaHttpRecebida(erro)).toBe(false);
    });
});
