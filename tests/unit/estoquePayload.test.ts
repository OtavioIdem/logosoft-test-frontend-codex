import { describe, expect, it } from 'vitest';
import { buildAjusteEstoquePayload, buildConcluirInventarioPayload, buildCriarBloqueioEstoquePayload, buildCriarLocalEstoquePayload, buildMovimentoManualEstoquePayload, buildCriarReservaEstoquePayload, buildTransferenciaEstoquePayload } from '@/features/estoque/api/estoqueApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const produtoId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const localEstoqueId = '99999999-9999-9999-9999-999999999999';
const localDestinoId = '88888888-8888-8888-8888-888888888888';
const filialOrigemId = '22222222-2222-2222-2222-222222222222';
const filialDestinoId = '33333333-3333-3333-3333-333333333333';

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



    it('monta transferência com origem, destino, quantidade e motivo', () => {
        const payload = buildTransferenciaEstoquePayload({ empresaId, filialOrigemId, localOrigemId: localEstoqueId, filialDestinoId, localDestinoId, produtoId, quantidade: 3, motivo: 'Reposição entre filiais' });

        expect(payload).toEqual({ empresaId, filialOrigemId, localOrigemId: localEstoqueId, filialDestinoId, localDestinoId, produtoId, quantidade: 3, motivo: 'Reposição entre filiais' });
    });

    it('bloqueia transferência para o mesmo local da mesma filial', () => {
        expect(() => buildTransferenciaEstoquePayload({ empresaId, filialOrigemId, localOrigemId: localEstoqueId, filialDestinoId: filialOrigemId, localDestinoId: localEstoqueId, produtoId, quantidade: 3, motivo: 'Mesmo local' })).toThrow('Destino deve ser diferente da origem.');
    });

    it('monta bloqueio e conclusão de inventário com payloads oficiais B41', () => {
        expect(buildCriarBloqueioEstoquePayload({ empresaId, filialId: '', localEstoqueId, produtoId, quantidade: 2, motivo: 'Produto avariado' })).toEqual({ empresaId, localEstoqueId, produtoId, quantidade: 2, motivo: 'Produto avariado' });
        expect(buildConcluirInventarioPayload('Ajuste por inventário')).toEqual({ motivoAjuste: 'Ajuste por inventário' });
    });

    it('monta reserva com origem de vendas', () => {
        const payload = buildCriarReservaEstoquePayload({ empresaId, produtoId, localEstoqueId, quantidade: 2, origemModulo: 'VENDAS', observacao: '' });
        expect(payload).toMatchObject({ empresaId, produtoId, localEstoqueId, quantidade: 2, origemModulo: 'VENDAS' });
        expect(payload).not.toHaveProperty('observacao');
    });
});
