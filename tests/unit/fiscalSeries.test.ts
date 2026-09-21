import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    buildCriarSerieFiscalPayload,
    buildAmpliarNumeroFinalSerieFiscalPayload,
    buildEncerrarVigenciaSerieFiscalPayload,
    buildInativarSerieFiscalPayload
} from '@/features/fiscal/api/seriesFiscaisApi';
import { seriesFiscaisApi, SeriesFiscaisEmpresaObrigatoriaError } from '@/features/fiscal/api/seriesFiscaisApi';
import { toDateOnly, fromDateOnly } from '@/features/fiscal/schemas/seriesFiscaisSchemas';
import { httpClient } from '@/lib/http/httpClient';
import { serieFiscalResponseSchema } from '@/features/fiscal/schemas/seriesFiscaisSchemas';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const modeloId = '33333333-3333-3333-3333-333333333333';

// AC-3: DateOnly com fuso local
describe('AC-3: DateOnly serializa como yyyy-MM-dd no fuso local, nunca com toISOString()', () => {
    it('toDateOnly converte data para yyyy-MM-dd no fuso local', () => {
        // 2026-01-01 à meia-noite no fuso local (TZ=America/Sao_Paulo durante teste)
        const date = new Date(2026, 0, 1, 0, 0, 0);
        const result = toDateOnly(date);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(result).toBe('2026-01-01');
    });

    it('toDateOnly preserva a data mesmo em fuso negativo: nova data próxima de meia-noite', () => {
        // 2026-01-01 23:30:00 no fuso local não deve deslocar a data
        const date = new Date(2026, 0, 1, 23, 30, 0);
        const result = toDateOnly(date);
        expect(result).toBe('2026-01-01');
    });

    it('fromDateOnly converte yyyy-MM-dd de volta para Date', () => {
        const parsed = fromDateOnly('2026-05-15');
        expect(parsed).not.toBeNull();
        expect(parsed?.getFullYear()).toBe(2026);
        expect(parsed?.getMonth()).toBe(4); // 0-indexed
        expect(parsed?.getDate()).toBe(15);
    });

    it('fromDateOnly retorna null para string vazia ou nula', () => {
        expect(fromDateOnly('')).toBeNull();
        expect(fromDateOnly(null)).toBeNull();
        expect(fromDateOnly(undefined)).toBeNull();
    });
});

// AC-2: Schemas de request com regras do domínio
describe('AC-2: Schemas de request refletem regras do agregado SerieFiscal.cs (R1-R9)', () => {
    it('criar: numero entre 0 e 999 (R3)', () => {
        const payload = {
            empresaId,
            filialId: null,
            modeloDocumentoFiscalId: modeloId,
            numero: 500,
            numeroInicial: 1,
            numeroFinal: 100,
            vigenciaInicio: '2026-01-01',
            vigenciaFim: null
        };
        expect(buildCriarSerieFiscalPayload(payload)).toMatchObject({ numero: 500 });

        // numero > 999 deve falhar
        expect(() => buildCriarSerieFiscalPayload({ ...payload, numero: 1000 })).toThrow();
        expect(() => buildCriarSerieFiscalPayload({ ...payload, numero: -1 })).toThrow();
    });

    it('criar: numeroInicial > 0 (R4)', () => {
        const payload = {
            empresaId,
            filialId: null,
            modeloDocumentoFiscalId: modeloId,
            numero: 1,
            numeroInicial: 1,
            numeroFinal: 100,
            vigenciaInicio: '2026-01-01',
            vigenciaFim: null
        };
        expect(buildCriarSerieFiscalPayload(payload)).toMatchObject({ numeroInicial: 1 });

        // numeroInicial = 0 deve falhar
        expect(() => buildCriarSerieFiscalPayload({ ...payload, numeroInicial: 0 })).toThrow();
    });

    it('criar: numeroFinal >= numeroInicial (R5)', () => {
        const payload = {
            empresaId,
            filialId: null,
            modeloDocumentoFiscalId: modeloId,
            numero: 1,
            numeroInicial: 100,
            numeroFinal: 100,
            vigenciaInicio: '2026-01-01',
            vigenciaFim: null
        };
        expect(buildCriarSerieFiscalPayload(payload)).toMatchObject({ numeroFinal: 100 });

        // numeroFinal < numeroInicial deve falhar
        expect(() => buildCriarSerieFiscalPayload({ ...payload, numeroFinal: 99 })).toThrow();
    });

    it('criar: vigenciaInicio obrigatória, vigenciaFim nula ou >= início (R6)', () => {
        const payload = {
            empresaId,
            filialId: null,
            modeloDocumentoFiscalId: modeloId,
            numero: 1,
            numeroInicial: 1,
            numeroFinal: 100,
            vigenciaInicio: '2026-01-01',
            vigenciaFim: null
        };
        expect(buildCriarSerieFiscalPayload(payload)).toMatchObject({ vigenciaFim: null });

        // vigenciaFim >= vigenciaInicio deve funcionar
        expect(buildCriarSerieFiscalPayload({ ...payload, vigenciaFim: '2026-01-01' })).toMatchObject({ vigenciaFim: '2026-01-01' });
        expect(buildCriarSerieFiscalPayload({ ...payload, vigenciaFim: '2026-12-31' })).toMatchObject({ vigenciaFim: '2026-12-31' });

        // vigenciaFim < vigenciaInicio deve falhar
        expect(() => buildCriarSerieFiscalPayload({ ...payload, vigenciaFim: '2025-12-31' })).toThrow();
    });

    it('ampliar: novo final >= final atual (R8)', () => {
        const numeroFinalAtual = 500;
        const payload = { novoNumeroFinal: 500 };
        expect(buildAmpliarNumeroFinalSerieFiscalPayload(numeroFinalAtual, payload)).toMatchObject({ novoNumeroFinal: 500 });

        // novo final > atual
        expect(buildAmpliarNumeroFinalSerieFiscalPayload(numeroFinalAtual, { novoNumeroFinal: 600 })).toMatchObject({ novoNumeroFinal: 600 });

        // novo final < atual deve falhar
        expect(() => buildAmpliarNumeroFinalSerieFiscalPayload(numeroFinalAtual, { novoNumeroFinal: 499 })).toThrow();
    });

    it('encerrar: vigenciaFim >= vigenciaInicio da série (R6)', () => {
        const vigenciaInicioSerie = '2026-01-01';
        const payload = { vigenciaFim: '2026-12-31' };
        expect(buildEncerrarVigenciaSerieFiscalPayload(vigenciaInicioSerie, payload)).toMatchObject({ vigenciaFim: '2026-12-31' });

        // vigenciaFim = início deve funcionar
        expect(buildEncerrarVigenciaSerieFiscalPayload(vigenciaInicioSerie, { vigenciaFim: '2026-01-01' })).toMatchObject({ vigenciaFim: '2026-01-01' });

        // vigenciaFim < início deve falhar
        expect(() => buildEncerrarVigenciaSerieFiscalPayload(vigenciaInicioSerie, { vigenciaFim: '2025-12-31' })).toThrow();
    });

    it('inativar: motivo obrigatório, 1-464 caracteres (R9, B-11)', () => {
        const payload = { motivo: 'Motivo de inativação' };
        expect(buildInativarSerieFiscalPayload(payload)).toMatchObject({ motivo: 'Motivo de inativação' });

        // trim remove espaços
        expect(buildInativarSerieFiscalPayload({ motivo: '  Motivo com espaços  ' })).toMatchObject({ motivo: 'Motivo com espaços' });

        // só espaços deve falhar (trim resulta em string vazia)
        expect(() => buildInativarSerieFiscalPayload({ motivo: '     ' })).toThrow();

        // 464 caracteres deve passar
        const motivo464 = 'x'.repeat(464);
        expect(buildInativarSerieFiscalPayload({ motivo: motivo464 })).toMatchObject({ motivo: motivo464 });

        // 465 caracteres deve falhar
        const motivo465 = 'x'.repeat(465);
        expect(() => buildInativarSerieFiscalPayload({ motivo: motivo465 })).toThrow();
    });
});

// AC-4: Sanitização de payload
describe('AC-4: Payloads sanitizam valores null/undefined e preservam campos válidos', () => {
    it('criar: null vira null no payload, campos obrigatórios via schema', () => {
        const result = buildCriarSerieFiscalPayload({
            empresaId,
            filialId: null,
            modeloDocumentoFiscalId: modeloId,
            numero: 1,
            numeroInicial: 1,
            numeroFinal: 100,
            vigenciaInicio: '2026-01-01',
            vigenciaFim: null
        });
        expect(result.filialId).toBeNull();
        expect(result.vigenciaFim).toBeNull();
    });

    it('.strict() recusa chave extra em request', () => {
        const payload = {
            empresaId,
            filialId: null,
            modeloDocumentoFiscalId: modeloId,
            numero: 1,
            numeroInicial: 1,
            numeroFinal: 100,
            vigenciaInicio: '2026-01-01',
            vigenciaFim: null,
            campExtra: 'xxx' // campo não esperado
        };
        expect(() => buildCriarSerieFiscalPayload(payload)).toThrow();
    });
});

const serieResponse = {
    id: '44444444-4444-4444-4444-444444444444', empresaId, filialId: null,
    modeloDocumentoFiscalId: modeloId, numero: 7, numeroInicial: 1, numeroFinal: 100,
    proximoNumero: 1, vigenciaInicio: '2026-01-01', vigenciaFim: null, ativa: true
};

afterEach(() => vi.restoreAllMocks());

describe('AC-2: Response schema aceita extensão aditiva do backend', () => {
    it('aceita os 11 campos do contrato e descarta campo adicional sem quebrar a tela', () => {
        expect(serieFiscalResponseSchema.parse({ ...serieResponse, novoCampoDoBackend: 'aditivo' })).toEqual(serieResponse);
    });
});

describe('AC-4: adapter HTTP de séries fiscais', () => {
    it('listar envia query canônica; Todas omite somenteAtivas e Inativas preserva false', async () => {
        const get = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: { items: [serieResponse], totalItems: 1 } } as never);
        await seriesFiscaisApi.listar({ empresaId, pagina: 1, tamanhoPagina: 20 });
        expect(get).toHaveBeenLastCalledWith('/api/fiscal/series', { params: { empresaId, pagina: 1, tamanhoPagina: 20 } });

        await seriesFiscaisApi.listar({ empresaId, somenteAtivas: false, pagina: 2, tamanhoPagina: 50 });
        expect(get).toHaveBeenLastCalledWith('/api/fiscal/series', { params: { empresaId, somenteAtivas: false, pagina: 2, tamanhoPagina: 50 } });
    });

    it('sem empresa falha localmente com código específico e não dispara HTTP', async () => {
        const get = vi.spyOn(httpClient, 'get');
        await expect(seriesFiscaisApi.listar({ empresaId: '', pagina: 1, tamanhoPagina: 20 })).rejects.toMatchObject({ code: 'Fiscal.Series.EmpresaObrigatoria' });
        expect(get).not.toHaveBeenCalled();
        expect(new SeriesFiscaisEmpresaObrigatoriaError()).toMatchObject({ code: 'Fiscal.Series.EmpresaObrigatoria' });
    });

    it('criar envia exatamente as oito chaves validadas', async () => {
        const post = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: serieResponse } as never);
        await seriesFiscaisApi.criar({ empresaId, filialId: null, modeloDocumentoFiscalId: modeloId, numero: 7, numeroInicial: 1, numeroFinal: 100, vigenciaInicio: '2026-01-01', vigenciaFim: null });
        expect(post).toHaveBeenCalledWith('/api/fiscal/series', {
            empresaId, filialId: null, modeloDocumentoFiscalId: modeloId, numero: 7,
            numeroInicial: 1, numeroFinal: 100, vigenciaInicio: '2026-01-01', vigenciaFim: null
        });
        expect(Object.keys(post.mock.calls[0][1] as object)).toHaveLength(8);
    });

    it('ampliar, encerrar e inativar usam URL, corpo e 204 sem parse de resposta', async () => {
        const post = vi.spyOn(httpClient, 'post')
            .mockResolvedValueOnce({ data: serieResponse } as never)
            .mockResolvedValueOnce({ data: serieResponse } as never)
            .mockResolvedValueOnce({ status: 204, data: '' } as never);
        await seriesFiscaisApi.ampliar(serieResponse.id, 100, { novoNumeroFinal: 101 });
        expect(post).toHaveBeenLastCalledWith(`/api/fiscal/series/${serieResponse.id}/ampliar`, { novoNumeroFinal: 101 });
        await seriesFiscaisApi.encerrarVigencia(serieResponse.id, '2026-01-01', { vigenciaFim: '2026-01-02' });
        expect(post).toHaveBeenLastCalledWith(`/api/fiscal/series/${serieResponse.id}/encerrar-vigencia`, { vigenciaFim: '2026-01-02' });
        await expect(seriesFiscaisApi.inativar(serieResponse.id, { motivo: 'Encerrada' })).resolves.toBeUndefined();
        expect(post).toHaveBeenLastCalledWith(`/api/fiscal/series/${serieResponse.id}/inativar`, { motivo: 'Encerrada' });
    });
});
