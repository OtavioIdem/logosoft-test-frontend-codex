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
            controlaQualidade: true,
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
            controlaQualidade: true,
            permiteVenda: true,
            permiteCompra: true,
            observacao: null
        });
    });

    it('rejeita preço negativo', () => {
        expect(() => buildAtualizarPrecoCustoProdutoPayload({ precoVendaBase: -1, custoReferencial: 10 })).toThrow('Preço de venda não pode ser negativo.');
    });

    it('monta dados fiscais com NCM, CEST e unidade tributável conforme contrato', () => {
        expect(buildAtualizarDadosFiscaisProdutoPayload({ ncmCodigo: '84713012', cestCodigo: '01048100', origemMercadoriaCodigo: '0', tipoItemFiscal: TipoItemFiscal.Mercadoria, unidadeMedidaTributavelId: unidadeMedidaId, codigoFiscalExterno: '' })).toEqual({
            ncmCodigo: '84713012',
            cestCodigo: '01048100',
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            tipoItemSped: null,
            unidadeMedidaTributavelId: unidadeMedidaId,
            codigoFiscalExterno: null
        });
    });

    it('monta código de barras e vínculo com fornecedor conforme contrato', () => {
        expect(buildAdicionarCodigoBarrasProdutoPayload({ codigo: '7891234567895', descricao: '', principal: true })).toEqual({ codigo: '7891234567895', descricao: null, principal: true });
        expect(buildVincularFornecedorProdutoPayload({ fornecedorId, codigoFornecedor: 'SUP-001', principal: true })).toEqual({ fornecedorId, codigoFornecedor: 'SUP-001', principal: true });
    });

    it('rejeita vínculo de fornecedor sem fornecedor operacional válido', () => {
        expect(() => buildVincularFornecedorProdutoPayload({ fornecedorId: '', codigoFornecedor: 'SUP-001', principal: true })).toThrow('Fornecedor deve ser selecionado corretamente.');
        expect(() => buildVincularFornecedorProdutoPayload({ fornecedorId: 'pessoa-001', codigoFornecedor: 'SUP-001', principal: true })).toThrow('Fornecedor deve ser selecionado corretamente.');
    });

    it('monta unidade de medida e exige motivo na inativação', () => {
        expect(buildCriarUnidadeMedidaPayload({ empresaId, filialId: null, sigla: 'UN', descricao: 'Unidade', casasDecimais: 0, permiteFracionado: false })).toEqual({ empresaId, filialId: null, sigla: 'UN', descricao: 'Unidade', casasDecimais: 0, permiteFracionado: false });
        expect(() => buildProdutoMotivoPayload('')).toThrow('Informe o motivo.');
    });

    // AC-1: criar produto sem tocar em campo fiscal não envia tipoItemFiscal nem nenhum outro campo fiscal
    it('AC-1: criar produto sem dados fiscais não envia nenhum campo de classificação fiscal', () => {
        const payload = buildCriarProdutoPayload({
            empresaId,
            filialId: '',
            codigo: 'PROD0002',
            descricao: 'Produto sem dados fiscais',
            descricaoComercial: '',
            tipoProduto: TipoProduto.Mercadoria,
            unidadeMedidaId,
            categoriaProdutoId: '',
            marcaId: '',
            precoVendaBase: 100,
            custoReferencial: 60,
            controlaEstoque: true,
            controlaQualidade: true,
            permiteVenda: true,
            permiteCompra: true,
            observacao: ''
        });

        // Verifica que campos fiscais NÃO aparecem
        expect(payload).not.toHaveProperty('tipoItemFiscal');
        expect(payload).not.toHaveProperty('ncmCodigo');
        expect(payload).not.toHaveProperty('cestCodigo');
        expect(payload).not.toHaveProperty('origemMercadoriaCodigo');
        expect(payload).not.toHaveProperty('tipoItemSped');
        expect(payload).not.toHaveProperty('unidadeMedidaTributavelId');
        expect(payload).not.toHaveProperty('codigoFiscalExterno');
    });

    // AC-3: editar produto com tipoItemSped gravado reenvia o mesmo valor, inclusive quando é 0
    it('AC-3: editar dados fiscais com tipoItemSped=0 (MercadoriaParaRevenda) reenvia o valor 0 sem transformação', () => {
        const payload = buildAtualizarDadosFiscaisProdutoPayload({
            ncmCodigo: '84713012',
            cestCodigo: '01048100',
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            tipoItemSped: 0, // MercadoriaParaRevenda
            unidadeMedidaTributavelId: unidadeMedidaId,
            codigoFiscalExterno: ''
        });

        // Verifica que tipoItemSped = 0 é preservado (não virou null)
        expect(payload.tipoItemSped).toBe(0);
    });

    // AC-4: editar produto sem classificação fiscal mantém o bloco em branco
    it('AC-4: editar produto sem dados fiscais mantém todos os campos nulos', () => {
        const payload = buildAtualizarDadosFiscaisProdutoPayload({
            ncmCodigo: null,
            cestCodigo: null,
            origemMercadoriaCodigo: null,
            tipoItemFiscal: null,
            tipoItemSped: null,
            unidadeMedidaTributavelId: null,
            codigoFiscalExterno: null
        });

        expect(payload).toEqual({
            ncmCodigo: null,
            cestCodigo: null,
            origemMercadoriaCodigo: null,
            tipoItemFiscal: null,
            tipoItemSped: null,
            unidadeMedidaTributavelId: null,
            codigoFiscalExterno: null
        });
    });
});
