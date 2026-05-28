import { describe, expect, it } from 'vitest';
import {
    buildAvaliarContingenciaPayload,
    buildBaixarEstoquePayload,
    buildCancelarNotaFiscalSefazPayload,
    buildConsultarProtocoloPayload,
    buildEmitirCartaCorrecaoPayload,
    buildGerarContaReceberPayload,
    buildGerarDanfePayload,
    buildHabilitarContingenciaPayload,
    buildInutilizarNumeracaoPayload,
    buildReprocessarSefazPayload,
    buildStatusServicoPayload,
    buildTransmitirSefazPayload
} from '@/features/fiscal/api/fiscalApi';
import { maskFiscalSensitiveText, resolveFiscalWorkflowActionState } from '@/features/fiscal/components/fiscalUiUtils';
import {
    NotaFiscalListagemResponse,
    NotaFiscalResponse,
    ObservabilidadeFiscalResponse,
    ResumoOperacionalNotaFiscalResponse,
    WorkflowOperacionalNotaFiscalResponse
} from '@/features/fiscal/types/fiscal.types';
import {
    OrigemNotaFiscal,
    StatusNotaFiscal,
    TipoContingenciaFiscal,
    TipoDocumentoFiscal,
    TipoEventoFiscal,
    TipoOperacaoFiscal,
    TipoServicoTransmissaoFiscal,
    TipoXmlFiscal
} from '@/types/erp';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const notaFiscalId = '33333333-3333-3333-3333-333333333333';
const pedidoVendaId = '44444444-4444-4444-4444-444444444444';
const pessoaId = '55555555-5555-5555-5555-555555555555';
const logIntegracaoFiscalId = '66666666-6666-6666-6666-666666666666';
const contaReceberId = '77777777-7777-7777-7777-777777777777';
const iso = '2026-05-25T10:00:00-03:00';

const hasOwn = (source: unknown, key: string) => Object.prototype.hasOwnProperty.call(source, key);

describe('contratos fiscais frontend/backend', () => {
    it('mantém listagem fiscal leve sem campos pesados ou XML completo', () => {
        const response = {
            items: [
                {
                    id: notaFiscalId,
                    empresaId,
                    filialId,
                    tipoDocumento: TipoDocumentoFiscal.NFe,
                    tipoOperacao: TipoOperacaoFiscal.Venda,
                    statusFiscal: StatusNotaFiscal.Autorizada,
                    origem: OrigemNotaFiscal.PedidoVenda,
                    origemId: pedidoVendaId,
                    pessoaId,
                    serie: '1',
                    numero: '100',
                    chaveAcesso: '35260500000000000100550010000001001000001000',
                    protocoloAutorizacao: '135260000000001',
                    dataEmissao: iso,
                    autorizadaEm: iso,
                    canceladaEm: null,
                    valorTotal: 150.75,
                    possuiXmlEnvio: true,
                    possuiXmlAutorizado: true,
                    possuiDanfe: true,
                    estoqueAplicavel: true,
                    estoqueBaixado: false,
                    estoquePendente: true,
                    financeiroAplicavel: true,
                    contaReceberGerada: false,
                    financeiroPendente: true,
                    acaoPrincipalCodigo: 'BAIXAR_ESTOQUE',
                    acaoPrincipalNome: 'Baixar estoque',
                    acaoPrincipalMetodoHttp: 'POST',
                    acaoPrincipalEndpoint: `/api/fiscal/notas-fiscais/${notaFiscalId}/baixar-estoque`,
                    acaoPrincipalPermissao: 'ESTOQUE_MOVIMENTAR',
                    alertas: ['Estoque pendente.']
                }
            ],
            page: 1,
            pageSize: 20,
            totalItems: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false
        } satisfies NotaFiscalListagemResponse;

        const item = response.items[0];

        expect(item.acaoPrincipalCodigo).toBe('BAIXAR_ESTOQUE');
        expect(item.estoquePendente).toBe(true);
        expect(item.financeiroPendente).toBe(true);
        expect(hasOwn(item, 'itens')).toBe(false);
        expect(hasOwn(item, 'impostos')).toBe(false);
        expect(hasOwn(item, 'xmls')).toBe(false);
        expect(hasOwn(item, 'eventos')).toBe(false);
        expect(hasOwn(item, 'conteudoXml')).toBe(false);
        expect(hasOwn(item, 'payloadResumo')).toBe(false);
    });

    it('mantém detalhe fiscal com metadados de XML, sem conteudoXml completo', () => {
        const detalhe = {
            id: notaFiscalId,
            empresaId,
            filialId: null,
            tipoDocumento: TipoDocumentoFiscal.NFe,
            tipoOperacao: TipoOperacaoFiscal.Venda,
            origem: OrigemNotaFiscal.PedidoVenda,
            origemId: pedidoVendaId,
            pessoaId,
            serie: '1',
            numero: '101',
            chaveAcesso: '35260500000000000100550010000001011000001010',
            protocoloAutorizacao: '135260000000101',
            dataEmissao: iso,
            autorizadaEm: iso,
            canceladaEm: null,
            statusFiscal: StatusNotaFiscal.Autorizada,
            valorProdutos: 200,
            valorDesconto: 10,
            valorTotal: 190,
            codigoRejeicao: null,
            mensagemRejeicao: null,
            motivoCancelamento: null,
            observacao: 'Observação fiscal',
            itens: [
                {
                    id: '88888888-8888-8888-8888-888888888888',
                    sequencia: 1,
                    produtoId: '99999999-9999-9999-9999-999999999999',
                    codigoItem: 'PROD-001',
                    descricao: 'Produto teste',
                    ncm: '01012100',
                    cfop: '5102',
                    unidadeComercial: 'UN',
                    quantidade: 2,
                    valorUnitario: 100,
                    valorBruto: 200,
                    valorDesconto: 10,
                    valorTotal: 190,
                    observacao: null
                }
            ],
            impostos: [
                {
                    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    itemNotaFiscalId: '88888888-8888-8888-8888-888888888888',
                    nome: 'ICMS',
                    cstCsosn: '102',
                    baseCalculo: 190,
                    aliquota: 0,
                    valor: 0,
                    observacao: 'Parametrizado pelo backend'
                }
            ],
            xmls: [
                {
                    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                    tipo: TipoXmlFiscal.Autorizado,
                    hashSha256: 'hash-sha256',
                    protocolo: '135260000000101',
                    chaveAcesso: '35260500000000000100550010000001011000001010',
                    armazenadoEm: iso
                }
            ],
            eventos: [
                {
                    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                    tipo: TipoEventoFiscal.Autorizacao,
                    codigo: '100',
                    descricao: 'Autorizado',
                    protocolo: '135260000000101',
                    dataEvento: iso,
                    usuarioId: null
                }
            ]
        } satisfies NotaFiscalResponse;

        expect(detalhe.xmls[0].hashSha256).toBe('hash-sha256');
        expect(hasOwn(detalhe.xmls[0], 'conteudoXml')).toBe(false);
        expect(hasOwn(detalhe, 'conteudoXml')).toBe(false);
        expect(detalhe.eventos[0].codigo).toBe('100');
    });

    it('usa resumo e workflow como fonte de verdade para ações operacionais', () => {
        const resumo = {
            notaFiscalId,
            empresaId,
            filialId: null,
            tipoDocumento: TipoDocumentoFiscal.NFe,
            serie: '1',
            numero: '102',
            statusFiscal: StatusNotaFiscal.Autorizada,
            origem: OrigemNotaFiscal.PedidoVenda,
            origemId: pedidoVendaId,
            possuiXmlEnvio: true,
            possuiXmlAutorizado: true,
            possuiDanfe: false,
            pedidoVenda: {
                id: pedidoVendaId,
                numero: 'PV-102',
                status: 5,
                clienteId: pessoaId,
                valorTotal: 300,
                faturadoEm: iso
            },
            estoque: {
                aplicavel: true,
                baixado: false,
                itensPendentes: 1,
                quantidadePendente: 2,
                sequenciasPendentes: [1]
            },
            financeiro: {
                aplicavel: true,
                contaReceberGerada: true,
                contaReceberId,
                status: 1,
                valorOriginal: 300,
                valorSaldo: 300
            },
            acoes: {
                podeValidar: false,
                podeGerarXmlEnvio: false,
                podeAssinarXmlEnvio: false,
                podeTransmitirSefaz: false,
                podeGerarDanfe: true,
                podeBaixarEstoque: true,
                podeGerarContaReceber: false,
                podeCancelar: true,
                podeEmitirCartaCorrecao: true
            },
            alertas: ['DANFE pendente.']
        } satisfies ResumoOperacionalNotaFiscalResponse;

        const workflow = {
            notaFiscalId,
            empresaId,
            filialId: null,
            tipoDocumento: TipoDocumentoFiscal.NFe,
            statusFiscal: StatusNotaFiscal.Autorizada,
            etapaAtual: 'Autorizada',
            ordemEtapaAtual: 6,
            percentualConcluido: 75,
            resumo: {},
            etapas: [
                {
                    ordem: 6,
                    codigo: 'DANFE',
                    nome: 'Gerar DANFE/documento auxiliar',
                    status: 'Disponivel',
                    obrigatoria: false,
                    metodoHttp: 'POST',
                    endpoint: `/api/fiscal/notas-fiscais/${notaFiscalId}/danfe`,
                    permissao: 'FISCAL_EMITIR',
                    motivoBloqueio: null
                }
            ],
            proximasAcoes: [
                {
                    codigo: 'GERAR_DANFE',
                    nome: 'Gerar DANFE',
                    metodoHttp: 'POST',
                    endpoint: `/api/fiscal/notas-fiscais/${notaFiscalId}/danfe`,
                    permissao: 'FISCAL_EMITIR',
                    habilitada: true,
                    motivoBloqueio: null,
                    payloadReferencia: 'GerarDanfeNotaFiscalRequest'
                },
                {
                    codigo: 'GERAR_CONTA_RECEBER',
                    nome: 'Gerar conta a receber',
                    metodoHttp: 'POST',
                    endpoint: `/api/fiscal/notas-fiscais/${notaFiscalId}/gerar-conta-receber`,
                    permissao: 'FINANCEIRO_GERENCIAR',
                    habilitada: false,
                    motivoBloqueio: 'Conta a receber já gerada.',
                    payloadReferencia: 'GerarContaReceberNotaFiscalRequest'
                }
            ],
            bloqueios: [],
            alertas: ['DANFE pendente.']
        } satisfies WorkflowOperacionalNotaFiscalResponse;

        expect(resumo.acoes.podeGerarDanfe).toBe(true);
        expect(resolveFiscalWorkflowActionState(workflow, ['GERAR_DANFE'], true)).toMatchObject({ habilitada: true });
        expect(resolveFiscalWorkflowActionState(workflow, ['GERAR_CONTA_RECEBER'], true)).toMatchObject({ habilitada: false, motivoBloqueio: 'Conta a receber já gerada.' });
    });

    it('mantém observabilidade sanitizada e mascara XML ou credenciais por defesa em profundidade', () => {
        const observabilidade = {
            empresaId,
            filialId: null,
            geradoEm: iso,
            registradoApos: '2026-05-25T09:00:00-03:00',
            totalLogsAnalisados: 1,
            totalSucesso: 0,
            totalFalha: 1,
            totalReprocessamento: 0,
            totalPendente: 0,
            ultimoRegistroEm: iso,
            possuiFalhaRecente: true,
            possuiPendenciaRecente: false,
            operacoesComFalha: ['NFeAutorizacao'],
            alertas: ['Foram encontrados logs fiscais com conteúdo sensível mascarado.'],
            logsRecentes: [
                {
                    id: logIntegracaoFiscalId,
                    empresaId,
                    filialId: null,
                    notaFiscalId,
                    operacao: 'NFeAutorizacao',
                    statusIntegracao: 3,
                    correlationId: 'front-transmitir-001',
                    payloadResumo: 'token=abc; senha=segredo; <NFe><emit><CNPJ>12345678000199</CNPJ></emit></NFe>',
                    mensagem: 'Falha técnica simulada',
                    registradoEm: iso,
                    podeReprocessar: true,
                    contemDadoSensivelOcultado: true
                }
            ]
        } satisfies ObservabilidadeFiscalResponse;

        const masked = maskFiscalSensitiveText(observabilidade.logsRecentes[0].payloadResumo);

        expect(observabilidade.logsRecentes[0].podeReprocessar).toBe(true);
        expect(masked).toContain('[XML_MASKED]');
        expect(masked).toContain('token=[MASKED]');
        expect(masked).not.toContain('12345678000199');
        expect(masked).not.toContain('<emit>');
    });

    it('preserva correlationId em todos os payloads fiscais críticos', () => {
        expect(buildTransmitirSefazPayload({ ufAutorizadora: 'SP', servico: TipoServicoTransmissaoFiscal.Autorizacao, xmlEnvioAssinado: '<NFe />', validarSchemaAntesTransmissao: true, schemaSetName: 'nfe-vigente', correlationId: 'front-transmitir-001' })).toMatchObject({ correlationId: 'front-transmitir-001' });
        expect(buildReprocessarSefazPayload({ ufAutorizadora: 'SP', servico: TipoServicoTransmissaoFiscal.Autorizacao, xmlEnvioAssinado: '<NFe />', validarSchemaAntesTransmissao: false, schemaSetName: null, logIntegracaoFiscalId, correlationIdOriginal: 'front-transmitir-001', correlationId: 'front-reprocessar-001', motivo: 'Reprocessamento operacional.' })).toMatchObject({ correlationIdOriginal: 'front-transmitir-001', correlationId: 'front-reprocessar-001' });
        expect(buildConsultarProtocoloPayload({ ufAutorizadora: 'SP', servico: TipoServicoTransmissaoFiscal.ConsultaProtocolo, xmlConsultaAssinado: '<consSitNFe />', validarSchemaAntesConsulta: true, schemaSetName: 'nfe-vigente', aplicarReconciliacaoLocal: true, correlationId: 'front-protocolo-001' })).toMatchObject({ correlationId: 'front-protocolo-001' });
        expect(buildStatusServicoPayload({ empresaId, filialId: null, tipoDocumento: TipoDocumentoFiscal.NFe, ufAutorizadora: 'SP', xmlStatusServico: '<consStatServ />', validarSchemaAntesConsulta: true, schemaSetName: 'nfe-vigente', correlationId: 'front-status-001' })).toMatchObject({ correlationId: 'front-status-001' });
        expect(buildAvaliarContingenciaPayload({ empresaId, filialId: null, tipoDocumento: TipoDocumentoFiscal.NFe, ufAutorizadora: 'SP', tipoContingencia: TipoContingenciaFiscal.OperacionalInterna, motivo: 'Indisponibilidade operacional.', exigirStatusServicoIndisponivelRecente: true, janelaStatusServicoMinutos: 30, correlationId: 'front-contingencia-001' })).toMatchObject({ correlationId: 'front-contingencia-001' });
        expect(buildHabilitarContingenciaPayload({ ufAutorizadora: 'SP', tipoContingencia: TipoContingenciaFiscal.OperacionalInterna, motivo: 'Contingência da nota.', exigirStatusServicoIndisponivelRecente: true, janelaStatusServicoMinutos: 30, correlationId: 'front-contingencia-nota-001' })).toMatchObject({ correlationId: 'front-contingencia-nota-001' });
        expect(buildCancelarNotaFiscalSefazPayload({ ufAutorizadora: 'SP', motivo: 'Cancelamento solicitado.', xmlEventoAssinado: '<eventoCancelamento />', validarSchemaAntesTransmissao: true, schemaSetName: 'nfe-vigente', correlationId: 'front-cancelar-001' })).toMatchObject({ correlationId: 'front-cancelar-001' });
        expect(buildEmitirCartaCorrecaoPayload({ ufAutorizadora: 'SP', textoCorrecao: 'Correção operacional permitida.', xmlEventoAssinado: '<eventoCartaCorrecao />', validarSchemaAntesTransmissao: true, schemaSetName: 'nfe-vigente', correlationId: 'front-cce-001' })).toMatchObject({ correlationId: 'front-cce-001' });
        expect(buildInutilizarNumeracaoPayload({ empresaId, filialId: null, tipoDocumento: TipoDocumentoFiscal.NFe, serie: '1', numeroInicial: 300, numeroFinal: 305, motivo: 'Quebra de sequência.', ufAutorizadora: 'SP', xmlInutilizacaoAssinado: '<inutNFe />', validarSchemaAntesTransmissao: true, schemaSetName: 'nfe-vigente', correlationId: 'front-inutilizacao-001' })).toMatchObject({ correlationId: 'front-inutilizacao-001' });
        expect(buildGerarDanfePayload({ correlationId: 'front-danfe-001' })).toMatchObject({ correlationId: 'front-danfe-001' });
        expect(buildBaixarEstoquePayload({ motivo: 'Baixa operacional.', documento: 'NF-100', correlationId: 'front-estoque-001' })).toMatchObject({ correlationId: 'front-estoque-001' });
        expect(buildGerarContaReceberPayload({ condicaoPagamentoId: null, primeiraDataVencimento: '2026-06-24T00:00:00-03:00', documento: 'NF-100', observacao: 'Conta a receber fiscal.', correlationId: 'front-financeiro-001' })).toMatchObject({ correlationId: 'front-financeiro-001' });
    });
});
