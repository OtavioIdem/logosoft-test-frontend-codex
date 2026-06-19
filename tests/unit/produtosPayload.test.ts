import { describe, expect, it } from 'vitest';
import { TipoItemFiscal, TipoProduto } from '@/types/erp';
import {
    buildAdicionarCodigoBarrasProdutoPayload,
    buildAtualizarDadosFiscaisProdutoPayload,
    buildAtualizarPrecoCustoProdutoPayload,
    buildCriarProdutoPayload,
    buildCriarUnidadeMedidaPayload,
    buildProdutoMotivoPayload,
    buildVincularFornecedorProdutoPayload
} from '@/features/produtos/api/produtosApi';

const empresaId = '11111111-1111-1111-1111-111111111111';
const unidadeMedidaId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const fornecedorId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

describe('payloads de Produtos / Catálogo', () => {
    it('monta produto com enums numéricos, filial null e preço/custo não negativos', () => {
        const payload = buildCriarProdutoPayload({
            empresaId,
            filialId: '',
            codigo: 'PROD0001',
            descricao: 'Produto de teste',
            descricaoComercial: '',
            tipoProduto: TipoProduto.Mercadoria,
            unidadeMedidaId,
            categoriaProdutoId: '',
            marcaId: '',
            precoVendaBase: 100,
            custoReferencial: 60,
            controlaEstoque: true,
            permiteVenda: true,
            permiteCompra: true,
            observacao: ''
        });

        expect(payload).toEqual({
            empresaId,
            filialId: null,
            codigo: 'PROD0001',
            descricao: 'Produto de teste',
            descricaoComercial: null,
            tipoProduto: TipoProduto.Mercadoria,
            unidadeMedidaId,
            categoriaProdutoId: null,
            marcaId: null,
            precoVendaBase: 100,
            custoReferencial: 60,
            controlaEstoque: true,
            permiteVenda: true,
            permiteCompra: true,
            observacao: null
        });
    });

    it('rejeita preço negativo', () => {
        expect(() => buildAtualizarPrecoCustoProdutoPayload({ precoVendaBase: -1, custoReferencial: 10 })).toThrow('Preço de venda não pode ser negativo.');
    });

    it('monta dados fiscais com enum numérico e unidade tributável null', () => {
        expect(buildAtualizarDadosFiscaisProdutoPayload({ ncm: '01012100', cest: '', origemMercadoriaCodigo: '0', tipoItemFiscal: TipoItemFiscal.Mercadoria, unidadeTributavelId: '', codigoFiscalExterno: '' })).toEqual({
            ncm: '01012100',
            cest: null,
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            unidadeTributavelId: null,
            codigoFiscalExterno: null
        });
    });

    it('monta código de barras e vínculo com fornecedor', () => {
        expect(buildAdicionarCodigoBarrasProdutoPayload({ codigo: '7891234567895', descricao: '', principal: true })).toEqual({ codigo: '7891234567895', descricao: null, principal: true });
        expect(buildVincularFornecedorProdutoPayload({ fornecedorId, codigoProdutoFornecedor: 'ABC-123', principal: true })).toEqual({ fornecedorId, codigoProdutoFornecedor: 'ABC-123', principal: true });
    });

    it('rejeita vínculo de fornecedor sem fornecedor operacional válido', () => {
        expect(() => buildVincularFornecedorProdutoPayload({ fornecedorId: '', codigoProdutoFornecedor: 'ABC-123', principal: true })).toThrow('Fornecedor deve ser selecionado corretamente.');
        expect(() => buildVincularFornecedorProdutoPayload({ fornecedorId: 'pessoa-001', codigoProdutoFornecedor: 'ABC-123', principal: true })).toThrow('Fornecedor deve ser selecionado corretamente.');
    });

    it('monta unidade de medida e exige motivo na inativação', () => {
        expect(buildCriarUnidadeMedidaPayload({ empresaId, filialId: null, sigla: 'UN', descricao: 'Unidade', casasDecimais: 0, permiteFracionado: false })).toEqual({ empresaId, filialId: null, sigla: 'UN', descricao: 'Unidade', casasDecimais: 0, permiteFracionado: false });
        expect(() => buildProdutoMotivoPayload('')).toThrow('Informe o motivo.');
    });
});
