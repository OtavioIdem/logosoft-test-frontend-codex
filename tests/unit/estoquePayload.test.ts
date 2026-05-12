import { describe, expect, it } from 'vitest';
import { buildAjusteEstoquePayload, buildCriarLocalEstoquePayload, buildMovimentoManualEstoquePayload, buildCriarReservaEstoquePayload } from '@/features/estoque/api/estoqueApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const produtoId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const localEstoqueId = '99999999-9999-9999-9999-999999999999';

describe('estoque payloads', () => {
    it('envia empresa e filial apenas como referência técnica ou null no cadastro de local', () => {
        const payload = buildCriarLocalEstoquePayload({ empresaId, filialId: '', codigo: 'GERAL', nome: 'Estoque Geral', descricao: '' });
        expect(payload).toEqual({ empresaId, codigo: 'GERAL', nome: 'Estoque Geral' });
    });

    it('monta entrada manual com quantidade e motivo', () => {
        const payload = buildMovimentoManualEstoquePayload({ empresaId, filialId: null, produtoId, localEstoqueId, quantidade: 10, origemModulo: 'ESTOQUE', origemId: '', documento: 'ENT-1', motivo: 'Entrada inicial' });
        expect(payload).toMatchObject({ empresaId, produtoId, localEstoqueId, quantidade: 10, origemModulo: 'ESTOQUE', documento: 'ENT-1', motivo: 'Entrada inicial' });
        expect(payload).not.toHaveProperty('origemId');
    });

    it('monta ajuste com quantidade contada', () => {
        const payload = buildAjusteEstoquePayload({ empresaId, produtoId, localEstoqueId, quantidadeContada: 5, origemModulo: 'ESTOQUE', motivo: 'Conferência' });
        expect(payload.quantidadeContada).toBe(5);
    });

    it('monta reserva com origem de vendas', () => {
        const payload = buildCriarReservaEstoquePayload({ empresaId, produtoId, localEstoqueId, quantidade: 2, origemModulo: 'VENDAS', observacao: '' });
        expect(payload).toMatchObject({ empresaId, produtoId, localEstoqueId, quantidade: 2, origemModulo: 'VENDAS' });
        expect(payload).not.toHaveProperty('observacao');
    });
});
