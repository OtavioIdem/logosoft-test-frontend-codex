import { describe, expect, it } from 'vitest';
import {
    buildAdicionarImpostoNotaFiscalPayload,
    buildAdicionarItemNotaFiscalPayload,
    buildCriarNotaFiscalPayload,
    buildGerarNotaFiscalPedidoVendaPayload,
    buildExportarNotasFiscaisCsvQueryParams,
    buildInutilizarNumeracaoPayload,
    buildStatusServicoPayload,
    buildTransmitirSefazPayload
} from '@/features/fiscal/api/fiscalApi';
import { OrigemNotaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal, TipoServicoTransmissaoFiscal } from '@/types/erp';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const pedidoVendaId = '33333333-3333-3333-3333-333333333333';
const produtoId = '44444444-4444-4444-4444-444444444444';

describe('payloads fiscais', () => {
    it('monta criação manual de nota fiscal com enums numéricos e campos opcionais nulos', () => {
        expect(
            buildCriarNotaFiscalPayload({
                empresaId,
                filialId: '',
                tipoDocumento: TipoDocumentoFiscal.NFe,
                tipoOperacao: TipoOperacaoFiscal.Venda,
                origem: OrigemNotaFiscal.Manual,
                origemId: '',
                serie: '1',
                numero: '1001',
                dataEmissao: '2026-05-18T10:00:00-03:00',
                naturezaOperacaoId: '',
                pessoaId: '',
                observacao: ''
            })
        ).toEqual({
            empresaId,
            filialId: null,
            tipoDocumento: TipoDocumentoFiscal.NFe,
            tipoOperacao: TipoOperacaoFiscal.Venda,
            origem: OrigemNotaFiscal.Manual,
            origemId: null,
            serie: '1',
            numero: '1001',
            dataEmissao: '2026-05-18T10:00:00-03:00',
            naturezaOperacaoId: null,
            pessoaId: null,
            observacao: null
        });
    });

    it('exige CFOP quando a geração por pedido valida dados fiscais do produto', () => {
        expect(buildGerarNotaFiscalPedidoVendaPayload({ pedidoVendaId, tipoDocumento: TipoDocumentoFiscal.NFe, serie: '1', numero: '1002', cfopPadrao: '5102', unidadeComercialPadrao: 'UN', validarDadosFiscaisProduto: true })).toMatchObject({
            pedidoVendaId,
            cfopPadrao: '5102'
        });
        expect(() => buildGerarNotaFiscalPedidoVendaPayload({ pedidoVendaId, tipoDocumento: TipoDocumentoFiscal.NFe, serie: '1', numero: '1002', cfopPadrao: '', unidadeComercialPadrao: 'UN', validarDadosFiscaisProduto: true })).toThrow(
            'Informe o CFOP'
        );
    });

    it('valida item e imposto parametrizado sem cálculo automático', () => {
        expect(buildAdicionarItemNotaFiscalPayload({ produtoId, codigoItem: 'P001', descricao: 'Produto', ncm: '12345678', cfop: '5102', unidadeComercial: 'UN', quantidade: 2, valorUnitario: 100, valorDesconto: 10, observacao: '' })).toMatchObject({
            produtoId,
            valorDesconto: 10,
            observacao: null
        });
        expect(() => buildAdicionarItemNotaFiscalPayload({ codigoItem: 'P001', descricao: 'Produto', unidadeComercial: 'UN', quantidade: 1, valorUnitario: 100, valorDesconto: 101 })).toThrow('O desconto não pode ultrapassar');
        expect(buildAdicionarImpostoNotaFiscalPayload({ itemNotaFiscalId: '', nome: 'ICMS', cstCsosn: '', baseCalculo: 100, aliquota: 0, valor: 0, observacao: '' })).toEqual({
            itemNotaFiscalId: null,
            nome: 'ICMS',
            cstCsosn: null,
            baseCalculo: 100,
            aliquota: 0,
            valor: 0,
            observacao: null
        });
    });

    it('monta exportação CSV auditada sem paginação visual e bloqueia filtros conflitantes', () => {
        const params = buildExportarNotasFiscaisCsvQueryParams({
            empresaId,
            filialId,
            statusFiscal: 5,
            page: 3,
            pageSize: 100,
            motivo: 'Conferência fiscal auditada',
            limite: 500,
            formato: null
        });

        expect(params).toMatchObject({
            empresaId,
            filialId,
            statusFiscal: 5,
            motivo: 'Conferência fiscal auditada',
            limite: 500,
            formato: 1
        });
        expect(params).not.toHaveProperty('page');
        expect(params).not.toHaveProperty('pageSize');

        expect(() =>
            buildExportarNotasFiscaisCsvQueryParams({
                empresaId,
                motivo: 'Conferência fiscal auditada',
                somenteComPendenciaDanfe: true,
                possuiDanfe: true
            })
        ).toThrow('Não combine pendência de DANFE');
    });


    it('normaliza consulta de status de serviço fiscal com empresa selecionada por dropdown', () => {
        expect(
            buildStatusServicoPayload({
                empresaId,
                filialId: '',
                tipoDocumento: TipoDocumentoFiscal.NFe,
                ufAutorizadora: 'sp',
                xmlStatusServico: '<consStatServ />',
                validarSchemaAntesConsulta: false,
                schemaSetName: 'nfe-vigente',
                correlationId: ''
            })
        ).toEqual({
            empresaId,
            filialId: null,
            tipoDocumento: TipoDocumentoFiscal.NFe,
            ufAutorizadora: 'SP',
            xmlStatusServico: '<consStatServ />',
            validarSchemaAntesConsulta: false,
            schemaSetName: 'nfe-vigente',
            correlationId: null
        });
    });

    it('normaliza transmissão e contrato de inutilização fiscal', () => {
        expect(buildTransmitirSefazPayload({ ufAutorizadora: 'sp', servico: TipoServicoTransmissaoFiscal.Autorizacao, xmlEnvioAssinado: '', validarSchemaAntesTransmissao: false, schemaSetName: 'NFe-4.00', correlationId: '' })).toMatchObject({
            ufAutorizadora: 'SP',
            xmlEnvioAssinado: null,
            correlationId: null
        });

        expect(
            buildInutilizarNumeracaoPayload({
                empresaId,
                filialId: '',
                tipoDocumento: TipoDocumentoFiscal.NFe,
                serie: '1',
                numeroInicial: 10,
                numeroFinal: 11,
                motivo: 'Quebra de sequência numérica válida',
                ufAutorizadora: 'sp',
                xmlInutilizacaoAssinado: '<inutNFe />',
                validarSchemaAntesTransmissao: true,
                schemaSetName: '',
                correlationId: 'front-inutilizacao-001'
            })
        ).toEqual({
            empresaId,
            filialId: null,
            tipoDocumento: TipoDocumentoFiscal.NFe,
            serie: '1',
            numeroInicial: 10,
            numeroFinal: 11,
            motivo: 'Quebra de sequência numérica válida',
            ufAutorizadora: 'SP',
            xmlInutilizacaoAssinado: '<inutNFe />',
            validarSchemaAntesTransmissao: true,
            schemaSetName: null,
            correlationId: 'front-inutilizacao-001'
        });

        expect(() =>
            buildInutilizarNumeracaoPayload({
                empresaId,
                filialId,
                tipoDocumento: TipoDocumentoFiscal.NFe,
                serie: '1',
                numeroInicial: 10,
                numeroFinal: 9,
                motivo: 'Quebra de sequência numérica válida',
                ufAutorizadora: 'SP',
                xmlInutilizacaoAssinado: '<xml/>',
                validarSchemaAntesTransmissao: false
            })
        ).toThrow('O número final deve ser maior ou igual');
    });
});
