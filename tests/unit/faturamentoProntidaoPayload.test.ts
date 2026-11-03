import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InternalAxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/http/httpClient';
import { faturamentoApi } from '@/features/faturamento/api/faturamentoApi';
import { faturamentoProntidaoQueryKey } from '@/features/faturamento/hooks/useFaturamentoResources';
import { prontidaoFaturamentoQuerySchema, prontidaoFaturamentoResponseSchema } from '@/features/faturamento/schemas/faturamentoSchemas';
import type { ProntidaoFaturamentoQuery } from '@/features/faturamento/types/faturamento.types';

// D113: a chave da query e o payload da consulta de prontidão. A chave carrega TODOS os parâmetros (resposta de
// parâmetros anteriores nunca serve aos atuais); o request não leva campo fora do contrato; a resposta aceita campo
// e valor aditivos do backend.

const pedidoId = '11111111-1111-1111-1111-111111111111';
const naturezaId = '22222222-2222-2222-2222-222222222222';
const naturezaOutraId = '77777777-7777-7777-7777-777777777777';
const condicaoId = '33333333-3333-3333-3333-333333333333';
const pedidoOutroId = '88888888-8888-8888-8888-888888888888';

const completo: ProntidaoFaturamentoQuery = { pedidoVendaId: pedidoId, naturezaOperacaoId: naturezaId, serie: ' 1 ', tipoDocumento: 1, numero: ' 1001 ', condicaoPagamentoId: condicaoId };

describe('faturamentoProntidaoQueryKey — a chave carrega todos os parâmetros (D113)', () => {
    it('a chave completa traz os seis parâmetros, com serie e número sem espaços', () => {
        expect(faturamentoProntidaoQueryKey(completo)).toEqual([
            'faturamento-prontidao',
            { pedidoVendaId: pedidoId, naturezaOperacaoId: naturezaId, serie: '1', tipoDocumento: 1, numero: '1001', condicaoPagamentoId: condicaoId }
        ]);
    });

    it('a chave tem exatamente os seis campos, sem sobra', () => {
        const [, parametros] = faturamentoProntidaoQueryKey(completo);
        expect(Object.keys(parametros).sort()).toEqual(['condicaoPagamentoId', 'naturezaOperacaoId', 'numero', 'pedidoVendaId', 'serie', 'tipoDocumento']);
    });

    it.each<[string, Partial<ProntidaoFaturamentoQuery>]>([
        ['pedido', { pedidoVendaId: pedidoOutroId }],
        ['natureza', { naturezaOperacaoId: naturezaOutraId }],
        ['série', { serie: '2' }],
        ['tipo de documento', { tipoDocumento: 2 }],
        ['número', { numero: '1002' }],
        ['condição de pagamento', { condicaoPagamentoId: null }]
    ])('trocar %s muda a chave (a resposta de uma não serve à outra)', (_, troca) => {
        expect(faturamentoProntidaoQueryKey({ ...completo, ...troca })).not.toEqual(faturamentoProntidaoQueryKey(completo));
    });

    it('valores vazios e ausentes são a mesma chave (estável)', () => {
        expect(faturamentoProntidaoQueryKey({ pedidoVendaId: pedidoId, serie: '  ', numero: '' })).toEqual(faturamentoProntidaoQueryKey({ pedidoVendaId: pedidoId }));
    });

    it('sem parâmetros, a chave continua com os seis campos (nulos)', () => {
        expect(faturamentoProntidaoQueryKey({ pedidoVendaId: pedidoId })).toEqual([
            'faturamento-prontidao',
            { pedidoVendaId: pedidoId, naturezaOperacaoId: null, serie: null, tipoDocumento: null, numero: null, condicaoPagamentoId: null }
        ]);
    });
});

describe('prontidaoFaturamentoQuerySchema — request sem campo fora do contrato', () => {
    it('aceita só o pedido, com os demais parâmetros ausentes', () => {
        expect(prontidaoFaturamentoQuerySchema.safeParse({ pedidoVendaId: pedidoId }).success).toBe(true);
    });

    it.each([
        ['cfopPadrao', { cfopPadrao: '5102' }],
        ['correlationId', { correlationId: 'front-faturamento-x' }],
        ['empresaId', { empresaId: pedidoOutroId }]
    ])('rejeita o campo %s, que não é do contrato de prontidão', (_, extra) => {
        expect(prontidaoFaturamentoQuerySchema.safeParse({ pedidoVendaId: pedidoId, ...extra }).success).toBe(false);
    });

    it('rejeita pedido que não é GUID', () => {
        expect(prontidaoFaturamentoQuerySchema.safeParse({ pedidoVendaId: 'nao-e-guid' }).success).toBe(false);
    });
});

describe('prontidaoFaturamentoResponseSchema — resposta aceita campo e valor aditivos', () => {
    it('aceita recurso e etapa desconhecidos e campos extras, sem quebrar a tela', () => {
        const resposta = {
            pronto: false,
            avaliacao: 'AvaliacaoNova',
            campoNovo: true,
            pendencias: [{ etapa: 'EtapaNova', codigo: 'c1', mensagem: 'm', recurso: 'RecursoNovo', recursoId: null, extra: 1 }]
        };
        expect(prontidaoFaturamentoResponseSchema.safeParse(resposta).success).toBe(true);
    });

    it('rejeita "pronto" que não é booleano', () => {
        expect(prontidaoFaturamentoResponseSchema.safeParse({ pronto: 'sim', avaliacao: 'PrimeiraConfirmacao', pendencias: [] }).success).toBe(false);
    });
});

describe('faturamentoApi.prontidao — payload enviado ao backend', () => {
    const originalAdapter = httpClient.defaults.adapter;
    let capturados: InternalAxiosRequestConfig[];

    beforeEach(() => {
        capturados = [];
        httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
            capturados.push(config);
            return { data: { pronto: true, avaliacao: 'PrimeiraConfirmacao', pendencias: [] }, status: 200, statusText: 'OK', headers: {}, config };
        });
    });

    afterEach(() => {
        httpClient.defaults.adapter = originalAdapter;
    });

    it('GET em /api/faturamento/prontidao com os nomes do Confirmar, sem valores vazios e sem campo estranho', async () => {
        const resposta = await faturamentoApi.prontidao({ pedidoVendaId: pedidoId, naturezaOperacaoId: naturezaId, serie: '1', tipoDocumento: 1, numero: '1001', condicaoPagamentoId: null });

        expect(capturados).toHaveLength(1);
        expect(capturados[0].method).toBe('get');
        expect(capturados[0].url).toBe('/api/faturamento/prontidao');
        expect(capturados[0].params).toEqual({ pedidoVendaId: pedidoId, naturezaOperacaoId: naturezaId, serie: '1', tipoDocumento: 1, numero: '1001' });
        expect(resposta.pronto).toBe(true);
    });

    it('um parâmetro não informado não vai na URL (sem série, sem número)', async () => {
        await faturamentoApi.prontidao({ pedidoVendaId: pedidoId });
        expect(capturados[0].params).toEqual({ pedidoVendaId: pedidoId });
    });

    it('o pedido inválido não sai: a validação do request barra antes da rede', async () => {
        await expect(faturamentoApi.prontidao({ pedidoVendaId: 'nao-e-guid' } as ProntidaoFaturamentoQuery)).rejects.toThrow();
        expect(capturados).toHaveLength(0);
    });
});
