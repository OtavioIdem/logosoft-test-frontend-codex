import { describe, expect, it } from 'vitest';
import { normalizeProdutosListResponse } from '@/features/produtos/api/produtosApi';

const produto = {
    id: '11111111-1111-1111-1111-111111111111',
    empresaId: '22222222-2222-2222-2222-222222222222',
    codigo: 'PROD-001',
    descricao: 'Produto de teste',
    tipoProduto: 1,
    unidadeMedidaId: '33333333-3333-3333-3333-333333333333',
    precoVendaBase: 10,
    custoReferencial: 5,
    controlaEstoque: true,
    permiteVenda: true,
    permiteCompra: true,
    controlaQualidade: false,
    codigosBarras: [],
    fornecedores: []
};

describe('normalizeProdutosListResponse', () => {
    it('mantém a lista direta do contrato legado', () => {
        expect(normalizeProdutosListResponse([produto])).toEqual([produto]);
    });

    it('desembrulha ApiResult para impedir que consumidores executem map em um objeto', () => {
        expect(normalizeProdutosListResponse({ success: true, data: [produto] })).toEqual([produto]);
    });

    it('aceita a lista paginada devolvida pelo backend', () => {
        expect(normalizeProdutosListResponse({ items: [produto], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 })).toEqual([produto]);
    });

    it('falha de modo controlado quando o contrato não contém uma lista', () => {
        expect(() => normalizeProdutosListResponse({ success: true, data: { codigo: 'invalido' } })).toThrow('formato incompatível');
    });
});
