import { describe, expect, it, vi } from 'vitest';
import { bancosApi } from '@/features/bancos/api/bancosApi';
import { httpClient } from '@/lib/http/httpClient';

vi.mock('@/lib/http/httpClient');

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const boleto = {
    id: '33333333-3333-3333-3333-333333333333',
    contaReceberId: '44444444-4444-4444-4444-444444444444',
    parcelaReceberId: '55555555-5555-5555-5555-555555555555',
    carteiraCobrancaId: '66666666-6666-6666-6666-666666666666',
    nossoNumero: 123456,
    numeroDocumento: 'REC-000123',
    dataEmissao: '2026-10-15T12:00:00Z',
    dataVencimento: '2026-10-30T12:00:00Z',
    valorTitulo: 245.75,
    statusBoleto: 1,
    linhaDigitavel: null,
    codigoBarras: null,
    dataLiquidacao: null,
    valorPago: null
};

describe('Bancos / Boletos — b78 contrato publicado', () => {
    it('AC-1: valida o DTO integral de BoletoResponse e só envia os filtros publicados na listagem', async () => {
        vi.mocked(httpClient.get).mockResolvedValueOnce({ data: [boleto] } as never);

        const result = await bancosApi.listarBoletos({ empresaId, filialId, status: 1, termo: 'REC-000123' } as never);

        expect(result).toEqual([boleto]);
        expect(httpClient.get).toHaveBeenCalledWith('/api/bancos/boletos', {
            params: { empresaId, filialId, status: 1 }
        });
        expect((vi.mocked(httpClient.get).mock.calls[0][1] as { params: Record<string, unknown> }).params).not.toHaveProperty('termo');
    });

    it('AC-1: rejeita BoletoResponse sem o nosso número numérico do contrato', async () => {
        vi.mocked(httpClient.get).mockResolvedValueOnce({ data: [{ ...boleto, nossoNumero: '123456' }] } as never);

        await expect(bancosApi.listarBoletos({ empresaId })).rejects.toThrow();
    });

    it('AC-2: preserva o envelope de geração com boleto e alertas', async () => {
        vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { boleto, alertas: ['Linha digitável calculada em modo best-effort.'] } } as never);

        const result = await bancosApi.gerarBoleto({
            contaReceberId: boleto.contaReceberId,
            parcelaReceberId: boleto.parcelaReceberId,
            carteiraCobrancaId: boleto.carteiraCobrancaId,
            numeroDocumento: boleto.numeroDocumento
        });

        expect(result).toEqual({ boleto, alertas: ['Linha digitável calculada em modo best-effort.'] });
    });

    it('AC-2: rejeita geração sem o array de alertas do envelope publicado', async () => {
        vi.mocked(httpClient.post).mockResolvedValueOnce({ data: { boleto } } as never);

        await expect(bancosApi.gerarBoleto({
            contaReceberId: boleto.contaReceberId,
            parcelaReceberId: boleto.parcelaReceberId,
            carteiraCobrancaId: boleto.carteiraCobrancaId
        })).rejects.toThrow();
    });
});
