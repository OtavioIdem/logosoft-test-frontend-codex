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
import { comSiglaSelecionada } from '@/features/produtos/components/ProdutoFormDialog';

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
            unidadeTributavelSigla: null,
            unidadeMedidaTributavelId: unidadeMedidaId,
            exTipi: null,
            codigoBeneficioFiscalPadrao: null,
            codigoFiscalExterno: null
        });
    });

    it('monta código de barras e vínculo com fornecedor conforme contrato', () => {
        expect(buildAdicionarCodigoBarrasProdutoPayload({ codigo: '7891234567895', descricao: '', principal: true })).toEqual({ codigo: '7891234567895', descricao: null, principal: true });
        expect(buildVincularFornecedorProdutoPayload({ fornecedorId, codigoFornecedor: 'SUP-001', principal: true })).toEqual({ fornecedorId, codigoFornecedor: 'SUP-001', descricaoFornecedor: null, principal: true });
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
            unidadeTributavelSigla: null,
            unidadeMedidaTributavelId: null,
            exTipi: null,
            codigoBeneficioFiscalPadrao: null,
            codigoFiscalExterno: null
        });

        expect(payload).toEqual({
            ncmCodigo: null,
            cestCodigo: null,
            origemMercadoriaCodigo: null,
            tipoItemFiscal: null,
            tipoItemSped: null,
            unidadeTributavelSigla: null,
            unidadeMedidaTributavelId: null,
            exTipi: null,
            codigoBeneficioFiscalPadrao: null,
            codigoFiscalExterno: null
        });
    });

    // AC-2: unidadeTributavelSigla é string (sigla), não um ID
    it('AC-2: editar dados fiscais com sigla de unidade tributável envia a sigla como string', () => {
        const payload = buildAtualizarDadosFiscaisProdutoPayload({
            ncmCodigo: '84713012',
            cestCodigo: '01048100',
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            tipoItemSped: 0,
            unidadeTributavelSigla: 'KG',
            unidadeMedidaTributavelId: unidadeMedidaId,
            exTipi: '',
            codigoBeneficioFiscalPadrao: '',
            codigoFiscalExterno: ''
        });

        // Verifica que unidadeTributavelSigla é enviado como string, não como Id
        expect(payload.unidadeTributavelSigla).toBe('KG');
        expect(typeof payload.unidadeTributavelSigla).toBe('string');
    });

    // AC-5: exTipi é campo opcional enviado quando preenchido
    it('AC-5: editar dados fiscais com EX-TIPI envia o valor e omite quando vazio', () => {
        const payloadComExTipi = buildAtualizarDadosFiscaisProdutoPayload({
            ncmCodigo: '84713012',
            cestCodigo: '01048100',
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            tipoItemSped: 0,
            unidadeTributavelSigla: 'KG',
            unidadeMedidaTributavelId: unidadeMedidaId,
            exTipi: '001',
            codigoBeneficioFiscalPadrao: '',
            codigoFiscalExterno: ''
        });

        expect(payloadComExTipi.exTipi).toBe('001');

        const payloadSemExTipi = buildAtualizarDadosFiscaisProdutoPayload({
            ncmCodigo: '84713012',
            cestCodigo: '01048100',
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            tipoItemSped: 0,
            unidadeTributavelSigla: 'KG',
            unidadeMedidaTributavelId: unidadeMedidaId,
            exTipi: '',
            codigoBeneficioFiscalPadrao: '',
            codigoFiscalExterno: ''
        });

        expect(payloadSemExTipi.exTipi).toBeNull();
    });

    // AC-6: codigoBeneficioFiscalPadrao é campo opcional enviado quando preenchido
    it('AC-6: editar dados fiscais com benefício fiscal envia o valor e omite quando vazio', () => {
        const payloadComBeneficio = buildAtualizarDadosFiscaisProdutoPayload({
            ncmCodigo: '84713012',
            cestCodigo: '01048100',
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            tipoItemSped: 0,
            unidadeTributavelSigla: 'KG',
            unidadeMedidaTributavelId: unidadeMedidaId,
            exTipi: '',
            codigoBeneficioFiscalPadrao: '0750100',
            codigoFiscalExterno: ''
        });

        expect(payloadComBeneficio.codigoBeneficioFiscalPadrao).toBe('0750100');

        const payloadSemBeneficio = buildAtualizarDadosFiscaisProdutoPayload({
            ncmCodigo: '84713012',
            cestCodigo: '01048100',
            origemMercadoriaCodigo: '0',
            tipoItemFiscal: TipoItemFiscal.Mercadoria,
            tipoItemSped: 0,
            unidadeTributavelSigla: 'KG',
            unidadeMedidaTributavelId: unidadeMedidaId,
            exTipi: '',
            codigoBeneficioFiscalPadrao: '',
            codigoFiscalExterno: ''
        });

        expect(payloadSemBeneficio.codigoBeneficioFiscalPadrao).toBeNull();
    });

    // AC-6: descricaoFornecedor em vínculo de fornecedor
    it('AC-6: vincular fornecedor com descrição envia o valor e omite quando vazio', () => {
        const payloadComDescricao = buildVincularFornecedorProdutoPayload({
            fornecedorId,
            codigoFornecedor: 'SUP-001',
            descricaoFornecedor: 'Fornecedor de alta qualidade',
            principal: true
        });

        expect(payloadComDescricao.descricaoFornecedor).toBe('Fornecedor de alta qualidade');

        const payloadSemDescricao = buildVincularFornecedorProdutoPayload({
            fornecedorId,
            codigoFornecedor: 'SUP-001',
            descricaoFornecedor: '',
            principal: true
        });

        expect(payloadSemDescricao.descricaoFornecedor).toBeNull();
    });
});

describe('comSiglaSelecionada — AC-7 — sintética de unidade tributável', () => {
    // AC-7: sigla já presente nas opções não deve ser duplicada
    it('sigla já presente nas opções não duplica', () => {
        const options = [
            { label: 'Quilograma', value: 'KG' },
            { label: 'Unidade', value: 'UN' }
        ];

        const resultado = comSiglaSelecionada(options, 'UN');

        expect(resultado).toEqual(options);
        expect(resultado.length).toBe(2);
    });

    // AC-7: sigla ausente das opções é anteposta como sintética
    it('sigla ausente das opções antepõe opção sintética com label = sigla', () => {
        const options = [
            { label: 'Quilograma', value: 'KG' },
            { label: 'Unidade', value: 'UN' }
        ];

        const resultado = comSiglaSelecionada(options, 'TON');

        expect(resultado.length).toBe(3);
        expect(resultado[0]).toEqual({ label: 'TON', value: 'TON' });
        expect(resultado.slice(1)).toEqual(options);
    });

    // AC-7: sigla nulo ou vazio retorna opções originais sem alteração
    it('sigla nulo retorna opções originais sem alteração', () => {
        const options = [
            { label: 'Quilograma', value: 'KG' },
            { label: 'Unidade', value: 'UN' }
        ];

        const resultadoNulo = comSiglaSelecionada(options, null);
        const resultadoVazio = comSiglaSelecionada(options, undefined);

        expect(resultadoNulo).toEqual(options);
        expect(resultadoVazio).toEqual(options);
        expect(resultadoNulo).toBe(options); // mesmo objeto
        expect(resultadoVazio).toBe(options); // mesmo objeto
    });
});
