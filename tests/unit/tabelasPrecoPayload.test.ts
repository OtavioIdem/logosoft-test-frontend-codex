import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    buildAtualizarTabelaPrecoItemPayload,
    buildAtualizarTabelaPrecoPayload,
    buildCriarTabelaPrecoItemPayload,
    buildCriarTabelaPrecoPayload,
    buildTabelaPrecoMotivoPayload,
    tabelasPrecoApi
} from '@/features/tabelas-preco/api/tabelasPrecoApi';
import { httpClient } from '@/lib/http/httpClient';

vi.mock('@/lib/http/httpClient');

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const produtoId = '33333333-3333-3333-3333-333333333333';

const date = (value: string) => new Date(`${value}T12:00:00.000Z`);

describe('payloads de Tabelas de Preço B40', () => {
    it('monta criação de tabela com empresa, filial opcional e datas date-only', () => {
        expect(buildCriarTabelaPrecoPayload({
            empresaId,
            filialId: '',
            nome: ' Tabela Padrão 2026 ',
            dataInicioVigencia: date('2026-06-01'),
            dataFimVigencia: null,
            padrao: true
        })).toEqual({
            empresaId,
            filialId: null,
            nome: 'Tabela Padrão 2026',
            dataInicioVigencia: '2026-06-01',
            dataFimVigencia: null,
            padrao: true
        });
    });

    it('monta atualização sem enviar empresa ou filial', () => {
        expect(buildAtualizarTabelaPrecoPayload({
            empresaId,
            filialId,
            nome: 'Tabela Atualizada',
            dataInicioVigencia: date('2026-06-01'),
            dataFimVigencia: date('2026-12-31'),
            padrao: false
        })).toEqual({
            nome: 'Tabela Atualizada',
            dataInicioVigencia: '2026-06-01',
            dataFimVigencia: '2026-12-31',
            padrao: false
        });
    });

    it('monta criação e atualização de item preservando contrato do backend', () => {
        expect(buildCriarTabelaPrecoItemPayload({ produtoId, precoVenda: 100, precoMinimo: 80, margemPercentual: 30 })).toEqual({ produtoId, precoVenda: 100, precoMinimo: 80, margemPercentual: 30 });
        expect(buildAtualizarTabelaPrecoItemPayload({ produtoId, precoVenda: 120, precoMinimo: 90, margemPercentual: 35 })).toEqual({ precoVenda: 120, precoMinimo: 90, margemPercentual: 35 });
    });

    it('bloqueia item sem produto e preço mínimo maior que preço de venda', () => {
        expect(() => buildCriarTabelaPrecoItemPayload({ produtoId: '', precoVenda: 100, precoMinimo: 80, margemPercentual: 30 })).toThrow('Selecione um produto válido.');
        expect(() => buildCriarTabelaPrecoItemPayload({ produtoId, precoVenda: 100, precoMinimo: 101, margemPercentual: 30 })).toThrow('O preço mínimo não pode ser maior que o preço de venda.');
    });

    it('exige motivo auditável para inativação', () => {
        expect(buildTabelaPrecoMotivoPayload('Tabela substituída')).toEqual({ motivo: 'Tabela substituída' });
        expect(() => buildTabelaPrecoMotivoPayload('')).toThrow('Informe um motivo com pelo menos 5 caracteres.');
    });
});

describe('tabelas-preco — AC-4: client não envia termo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('listar sem termo não inclui termo nos parâmetros', async () => {
        vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { resultado: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } } } as never);

        await tabelasPrecoApi.listar({ page: 1, pageSize: 10 });

        expect(vi.mocked(httpClient.get)).toHaveBeenCalledWith('/api/tabelas-preco', expect.any(Object));

        const callConfig = vi.mocked(httpClient.get).mock.calls[0][1];
        const params = callConfig?.params;

        if (params) {
            expect(params).not.toHaveProperty('termo');
        }
    });

    it('params() function constructs correctly without termo field', async () => {
        vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { resultado: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } } } as never);

        const queryEmpresaId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
        await tabelasPrecoApi.listar({ empresaId: queryEmpresaId, page: 1, pageSize: 10, status: '2' });

        const callConfig = vi.mocked(httpClient.get).mock.calls[0][1];
        const params = callConfig?.params;

        expect(Object.keys(params || {})).not.toContain('termo');
    });

    it('does not include undefined or null values in params', async () => {
        vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { resultado: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } } } as never);

        await tabelasPrecoApi.listar({ page: 1, pageSize: 10, filialId: null });

        const callConfig = vi.mocked(httpClient.get).mock.calls[0][1];
        const params = callConfig?.params;

        expect(params).not.toHaveProperty('filialId');
    });
});
