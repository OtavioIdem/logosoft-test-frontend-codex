import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
    buildAdicionarImpostoNotaFiscalPayload,
    buildAdicionarItemNotaFiscalPayload,
    buildCriarNotaFiscalPayload,
    buildDefinirValoresAcessoriosPayload,
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
        expect(buildAdicionarImpostoNotaFiscalPayload({ itemNotaFiscalId: '', nome: 'ICMS', cstCsosn: '', baseCalculo: 100, aliquota: 0, valor: 0, observacao: 'Lançamento manual conferido.' })).toEqual({
            itemNotaFiscalId: null,
            nome: 'ICMS',
            cstCsosn: null,
            baseCalculo: 100,
            aliquota: 0,
            valor: 0,
            observacao: 'Lançamento manual conferido.'
        });
    });

    // AC-12 / D35: o motivo do lançamento manual passa a ser obrigatório (1-500, após trim); sem texto
    // padrão, o backend recusa a checagem de não vazio (NotaFiscalBasicaUseCases.cs:326-329).
    it('AC-12: exige motivo de 1 a 500 caracteres no lançamento manual de imposto, sem texto padrão', () => {
        const base = { itemNotaFiscalId: '', nome: 'IPI', cstCsosn: '', baseCalculo: 100, aliquota: 10, valor: 10 };

        expect(() => buildAdicionarImpostoNotaFiscalPayload({ ...base, observacao: '' })).toThrow('Informe o motivo do lançamento manual.');
        expect(() => buildAdicionarImpostoNotaFiscalPayload({ ...base, observacao: '     ' })).toThrow('Informe o motivo do lançamento manual.');
        expect(() => buildAdicionarImpostoNotaFiscalPayload({ ...base })).toThrow();

        const motivo500 = 'x'.repeat(500);
        expect(buildAdicionarImpostoNotaFiscalPayload({ ...base, observacao: motivo500 })).toMatchObject({ observacao: motivo500 });

        const motivo501 = 'x'.repeat(501);
        expect(() => buildAdicionarImpostoNotaFiscalPayload({ ...base, observacao: motivo501 })).toThrow('Informe no máximo 500 caracteres.');
    });

    // AC-8: os 3 campos são obrigatórios e não-negativos; .strict() recusa chave extra; sem coerção de string.
    it('AC-8: valores acessórios exige os 3 campos numéricos não-negativos, sem coerção e sem chave extra', () => {
        expect(buildDefinirValoresAcessoriosPayload({ valorFrete: 0, valorSeguro: 0, valorOutrasDespesas: 0 })).toEqual({
            valorFrete: 0,
            valorSeguro: 0,
            valorOutrasDespesas: 0
        });
        expect(buildDefinirValoresAcessoriosPayload({ valorFrete: 12.5, valorSeguro: 3, valorOutrasDespesas: 7.25 })).toEqual({
            valorFrete: 12.5,
            valorSeguro: 3,
            valorOutrasDespesas: 7.25
        });

        expect(() => buildDefinirValoresAcessoriosPayload({ valorFrete: -0.01, valorSeguro: 0, valorOutrasDespesas: 0 })).toThrow();
        expect(() => buildDefinirValoresAcessoriosPayload({ valorFrete: '10', valorSeguro: 0, valorOutrasDespesas: 0 })).toThrow();
        expect(() => buildDefinirValoresAcessoriosPayload({ valorFrete: null, valorSeguro: 0, valorOutrasDespesas: 0 })).toThrow();
        expect(() => buildDefinirValoresAcessoriosPayload({ valorFrete: 0, valorSeguro: 0 })).toThrow();
        expect(() => buildDefinirValoresAcessoriosPayload({ valorFrete: 0, valorSeguro: 0, valorOutrasDespesas: 0, extra: 1 })).toThrow();
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

    // AC-2 (v1.11.0a8b57): correlationId da transmissão vira requiredText (NotaFiscalValidators.cs:238) --
    // antes '' virava null e passava; agora recusa. Caso reescrito, não apagado (D43).
    it('recusa correlationId vazio, em branco, nulo, ausente ou acima de 120 na transmissão SEFAZ; aceita até 120 com trim', () => {
        const base = { ufAutorizadora: 'sp', servico: TipoServicoTransmissaoFiscal.Autorizacao, xmlEnvioAssinado: '', validarSchemaAntesTransmissao: false, schemaSetName: 'NFe-4.00' };

        expect(() => buildTransmitirSefazPayload({ ...base, correlationId: '' })).toThrow('Informe o correlation ID da transmissão.');
        expect(() => buildTransmitirSefazPayload({ ...base, correlationId: '   ' })).toThrow('Informe o correlation ID da transmissão.');
        expect(() => buildTransmitirSefazPayload({ ...base, correlationId: null })).toThrow('Expected string, received null');
        expect(() => buildTransmitirSefazPayload({ ...base })).toThrow('Required');
        expect(() => buildTransmitirSefazPayload({ ...base, correlationId: 'a'.repeat(121) })).toThrow('Informe no máximo 120 caracteres.');

        expect(buildTransmitirSefazPayload({ ...base, correlationId: 'a'.repeat(120) })).toMatchObject({
            ufAutorizadora: 'SP',
            xmlEnvioAssinado: null,
            correlationId: 'a'.repeat(120)
        });

        expect(buildTransmitirSefazPayload({ ...base, correlationId: '  front-transmitir-20260916-abc123  ' })).toMatchObject({
            correlationId: 'front-transmitir-20260916-abc123'
        });
    });

    // AC-2: correlationIdSchema (:13) não muda -- reprocessar continua recusando vazio (é requiredText desde antes) e
    // as demais 9 chamadas do schema opcional (correlationIdSchema) ficam intactas.
    it('não altera correlationIdSchema; só a transmissão passou a exigir o campo', () => {
        const schemaSource = readFileSync('features/fiscal/schemas/fiscalSchemas.ts', 'utf8');
        expect((schemaSource.match(/correlationId: correlationIdSchema/g) ?? []).length).toBe(9);
        expect(schemaSource).toContain(
            "const correlationIdSchema = z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? null : value), z.string().trim().max(120, 'Correlation ID deve ter no máximo 120 caracteres.').nullable().optional());"
        );
    });

    it('normaliza contrato de inutilização fiscal', () => {
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
