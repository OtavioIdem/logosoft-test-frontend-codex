import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { alertasDoRetorno, feedbackRetornoSefaz } from '@/features/fiscal/components/fiscalUiUtils';
import { StatusNotaFiscal, TipoServicoTransmissaoFiscal } from '@/types/erp';
import type { ReprocessarNotaFiscalSefazRequest, TransmissaoSefazResponse, TransmitirNotaFiscalSefazRequest } from '@/features/fiscal/types/fiscal.types';

// AC-1 (v1.11.0a8b57): TransmissaoSefazResponse ganha `alertas?: string[]` (NotaFiscalResponse.cs:273-275) e
// TransmitirNotaFiscalSefazRequest.correlationId vira obrigatório (NotaFiscalValidators.cs:238).
describe('AC-1: tipos de transmissão SEFAZ', () => {
    it('TransmissaoSefazResponse aceita alertas (literal tipado, fiscal.types.ts:621-631)', () => {
        const resposta: TransmissaoSefazResponse = {
            notaFiscalId: '11111111-1111-1111-1111-111111111111',
            statusFiscal: StatusNotaFiscal.Autorizada,
            comunicacaoOk: true,
            autorizada: true,
            codigoStatus: '100',
            motivo: 'Autorizado o uso da NF-e',
            protocolo: '135260000000001',
            chaveAcesso: '35260600000000000000550010000000011000000015',
            deveReprocessar: false,
            alertas: ['Nota fiscal autorizada, mas o pedido de venda não pôde ser faturado.']
        };

        expect(resposta.alertas).toEqual(['Nota fiscal autorizada, mas o pedido de venda não pôde ser faturado.']);

        // Aditivo: response sem `alertas` continua um TransmissaoSefazResponse válido (campo opcional).
        const { alertas: _alertas, ...semAlertas } = resposta;
        const respostaSemAlertas: TransmissaoSefazResponse = semAlertas as TransmissaoSefazResponse;
        expect(respostaSemAlertas.alertas).toBeUndefined();
    });

    it('TransmitirNotaFiscalSefazRequest.correlationId é string obrigatória, sem null nem undefined', () => {
        const request: TransmitirNotaFiscalSefazRequest = {
            ufAutorizadora: 'SP',
            servico: TipoServicoTransmissaoFiscal.Autorizacao,
            xmlEnvioAssinado: null,
            validarSchemaAntesTransmissao: true,
            schemaSetName: null,
            correlationId: 'front-transmitir-20260916-abc123'
        };

        expect(typeof request.correlationId).toBe('string');

        // @ts-expect-error correlationId deixou de aceitar null (NotaFiscalValidators.cs:238)
        const _correlationIdNull: TransmitirNotaFiscalSefazRequest['correlationId'] = null;
        // @ts-expect-error correlationId é obrigatório: omiti-lo tem de falhar o typecheck
        const _semCorrelationId: TransmitirNotaFiscalSefazRequest = {
            ufAutorizadora: 'SP',
            servico: TipoServicoTransmissaoFiscal.Autorizacao,
            xmlEnvioAssinado: null,
            validarSchemaAntesTransmissao: true,
            schemaSetName: null
        };
        void _correlationIdNull;
        void _semCorrelationId;
    });

    it('ReprocessarNotaFiscalSefazRequest não muda: correlationId já era obrigatório antes desta fatia', () => {
        const request: ReprocessarNotaFiscalSefazRequest = {
            ufAutorizadora: 'SP',
            servico: TipoServicoTransmissaoFiscal.Autorizacao,
            xmlEnvioAssinado: null,
            validarSchemaAntesTransmissao: true,
            schemaSetName: null,
            correlationId: 'front-reprocessar-20260916-abc123',
            logIntegracaoFiscalId: '22222222-2222-2222-2222-222222222222',
            correlationIdOriginal: 'front-transmitir-20260915-zzz999',
            motivo: 'Reprocessamento solicitado pelo operador'
        };

        expect(typeof request.correlationId).toBe('string');
        expect(request.motivo).toBe('Reprocessamento solicitado pelo operador');
    });

    it('os comentários citam o arquivo:linha do backend que sustenta o contrato', () => {
        const source = readFileSync('features/fiscal/types/fiscal.types.ts', 'utf8');
        expect(source).toContain('NotaFiscalResponse.cs:273-275');
        expect(source).toContain('NotaFiscalValidators.cs:238');
    });
});

// AC-5 (v1.11.0a8b57): feedbackRetornoSefaz(alertas, sucesso) em fiscalUiUtils.ts -- warn com contagem de alertas
// quando existem, senão success com o texto de hoje.
describe('AC-5: feedbackRetornoSefaz', () => {
    it('devolve warn com a contagem de alertas quando há alerta(s)', () => {
        expect(feedbackRetornoSefaz(['Alerta 1'], 'Retorno da transmissão recebido.')).toEqual({
            severity: 'warn',
            detail: 'Retorno recebido com 1 alerta(s). Leia o painel "Último retorno operacional" antes de seguir.'
        });

        expect(feedbackRetornoSefaz(['Alerta 1', 'Alerta 2'], 'Retorno da transmissão recebido.')).toEqual({
            severity: 'warn',
            detail: 'Retorno recebido com 2 alerta(s). Leia o painel "Último retorno operacional" antes de seguir.'
        });
    });

    it('devolve success com o texto de hoje quando não há alerta', () => {
        expect(feedbackRetornoSefaz([], 'Retorno da transmissão recebido.')).toEqual({
            severity: 'success',
            detail: 'Retorno da transmissão recebido.'
        });
    });

    it('alertasDoRetorno filtra o que não é string ou está em branco, sem confiar no tipo', () => {
        expect(alertasDoRetorno({ alertas: ['ok', '', '   ', 42, null, undefined, 'outro'] as unknown[] })).toEqual(['ok', 'outro']);
        expect(alertasDoRetorno(null)).toEqual([]);
        expect(alertasDoRetorno(undefined)).toEqual([]);
        expect(alertasDoRetorno({})).toEqual([]);
        expect(alertasDoRetorno({ alertas: 'não é array' as unknown as string[] })).toEqual([]);
    });

    it('estrutura: transmitir, reprocessar e consultar protocolo usam feedbackRetornoSefaz na tela de detalhe', () => {
        const source = readFileSync('features/fiscal/components/NotaFiscalDetalhePage.tsx', 'utf8');
        const occurrences = (source.match(/feedbackRetornoSefaz\(/g) ?? []).length;
        expect(occurrences).toBe(1); // um único ponto de uso, no helper runRetornoSefaz compartilhado pelos três handlers
        expect(source).toContain('const transmitir = (values: unknown) => runRetornoSefaz(');
        expect(source).toContain('const reprocessar = (values: unknown) => runRetornoSefaz(');
        expect(source).toContain('const consultarProtocolo = (values: unknown) => runRetornoSefaz(');
    });
});
