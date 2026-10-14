import { describe, expect, it } from 'vitest';
import { FormatoDocumentoAuxiliarFiscal, OrigemNotaFiscal, StatusNotaFiscal, TipoContingenciaFiscal, TipoDocumentoAuxiliarFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal } from '@/types/erp';
import {
    createFiscalCorrelationId,
    formatoDocumentoAuxiliarFiscalLabel,
    fiscalActionDisabledReason,
    fiscalOrigemContextLabel,
    MOTIVO_EDICAO_ITENS_INDISPONIVEL,
    notaEditarItensDisabledReason,
    fiscalReferenceContextLabel,
    maskFiscalSensitiveText,
    tipoContingenciaFiscalLabel,
    tipoDocumentoAuxiliarFiscalLabel,
    notaFiscalBloqueiosVisuais,
    notaPodeCancelar,
    notaPodeEditarItens,
    notaPodeGerarDanfe,
    notaPodeConsultarProtocolo,
    notaPodeRegistrarRejeicao,
    notaPodeTransmitir,
    notaPodeValidar,
    origemNotaFiscalLabel,
    resetFiltrosFiscaisPorEmpresa,
    resetFiltrosFiscaisPorFilial,
    resolveFiscalWorkflowActionState,
    resolveReabrirNotaActionState,
    statusNotaFiscalLabel
} from '@/features/fiscal/components/fiscalUiUtils';
import { NotaFiscalResponse, ResumoOperacionalNotaFiscalResponse } from '@/features/fiscal/types/fiscal.types';

const baseNota: NotaFiscalResponse = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    empresaId: '11111111-1111-1111-1111-111111111111',
    filialId: null,
    tipoDocumento: TipoDocumentoFiscal.NFe,
    tipoOperacao: TipoOperacaoFiscal.Venda,
    origem: OrigemNotaFiscal.Manual,
    origemId: null,
    serie: '1',
    numero: '1001',
    chaveAcesso: null,
    protocoloAutorizacao: null,
    dataEmissao: '2026-05-18T10:00:00-03:00',
    autorizadaEm: null,
    canceladaEm: null,
    statusFiscal: StatusNotaFiscal.Rascunho,
    valorProdutos: 0,
    valorDesconto: 0,
    valorFrete: 0,
    valorSeguro: 0,
    valorOutrasDespesas: 0,
    valorTotal: 0,
    codigoRejeicao: null,
    mensagemRejeicao: null,
    motivoCancelamento: null,
    observacao: null,
    itens: [],
    impostos: [],
    xmls: [],
    eventos: []
};

describe('regras visuais fiscais', () => {
    it('bloqueia validação e transmissão quando rascunho não possui item', () => {
        expect(notaPodeEditarItens(baseNota)).toBe(true);
        expect(notaPodeValidar(baseNota)).toBe(false);
        expect(notaPodeTransmitir(baseNota)).toBe(false);
        expect(notaFiscalBloqueiosVisuais(baseNota)).toContain('Inclua pelo menos um item antes de validar, gerar XML ou transmitir.');
    });

    it('habilita validação, mas mantém transmissão bloqueada para rascunho com item', () => {
        const nota = { ...baseNota, valorProdutos: 100, valorTotal: 100, itens: [{ id: 'i1', sequencia: 1, codigoItem: 'P001', descricao: 'Produto', unidadeComercial: 'UN', quantidade: 1, valorUnitario: 100, valorBruto: 100, valorDesconto: 0, valorTotal: 100 } as never] };
        expect(notaPodeValidar(nota)).toBe(true);
        expect(notaPodeTransmitir(nota)).toBe(false);
    });

    it('K2: bloqueia a edição após validar; a correção passa pela reabertura autorizada pelo backend', () => {
        const validada = { ...baseNota, statusFiscal: StatusNotaFiscal.Validada };
        expect(notaPodeEditarItens(validada)).toBe(false);
    });

    it('habilita cancelamento, CC-e e DANFE somente para nota autorizada', () => {
        const autorizada = { ...baseNota, statusFiscal: StatusNotaFiscal.Autorizada };
        expect(statusNotaFiscalLabel(autorizada.statusFiscal)).toBe('Autorizada');
        expect(notaPodeEditarItens(autorizada)).toBe(false);
        expect(notaPodeCancelar(autorizada)).toBe(true);
        expect(notaPodeGerarDanfe(autorizada)).toBe(true);
    });

    it('formata origem fiscal para listagem sem expor identificador técnico', () => {
        expect(origemNotaFiscalLabel(OrigemNotaFiscal.Manual)).toBe('Manual');
        expect(origemNotaFiscalLabel(OrigemNotaFiscal.PedidoVenda)).toBe('Pedido de venda');
        expect(origemNotaFiscalLabel(null)).toBe('-');
    });

    it('reseta filtros dependentes ao trocar empresa ou filial na consulta fiscal', () => {
        const filtros = {
            empresaId: 'empresa-a',
            filialId: 'filial-a',
            pessoaId: 'pessoa-a',
            statusFiscal: StatusNotaFiscal.Autorizada,
            page: 3,
            pageSize: 20
        };

        expect(resetFiltrosFiscaisPorEmpresa(filtros, 'empresa-b')).toMatchObject({
            empresaId: 'empresa-b',
            filialId: null,
            pessoaId: null,
            statusFiscal: StatusNotaFiscal.Autorizada,
            page: 1,
            pageSize: 20
        });

        expect(resetFiltrosFiscaisPorFilial(filtros, 'filial-b')).toMatchObject({
            empresaId: 'empresa-a',
            filialId: 'filial-b',
            pessoaId: null,
            statusFiscal: StatusNotaFiscal.Autorizada,
            page: 1,
            pageSize: 20
        });
    });

    it('representa vínculos fiscais sem expor identificadores técnicos no detalhe', () => {
        expect(fiscalReferenceContextLabel('Empresa', '11111111-1111-1111-1111-111111111111')).toBe('Empresa vinculada');
        expect(fiscalReferenceContextLabel('Filial', null)).toBe('-');
        expect(fiscalOrigemContextLabel(OrigemNotaFiscal.PedidoVenda, '22222222-2222-2222-2222-222222222222')).toBe('Pedido de venda com vínculo operacional');
        expect(fiscalOrigemContextLabel(OrigemNotaFiscal.Manual, null)).toBe('Manual');
    });

    it('bloqueia ação fiscal quando workflow retorna motivo de bloqueio', () => {
        const workflow = {
            notaFiscalId: baseNota.id,
            empresaId: baseNota.empresaId,
            filialId: null,
            tipoDocumento: baseNota.tipoDocumento,
            statusFiscal: StatusNotaFiscal.Transmitida,
            etapaAtual: 'Transmitida',
            ordemEtapaAtual: 5,
            percentualConcluido: 50,
            resumo: null,
            etapas: [],
            proximasAcoes: [
                {
                    codigo: 'CONSULTAR_PROTOCOLO',
                    nome: 'Consultar protocolo',
                    habilitada: false,
                    motivoBloqueio: 'Aguardando retorno do autorizador.'
                }
            ],
            bloqueios: [],
            alertas: []
        };
        const transmitida = { ...baseNota, statusFiscal: StatusNotaFiscal.Transmitida };
        const state = resolveFiscalWorkflowActionState(workflow, ['CONSULTAR_PROTOCOLO'], true);

        expect(state.habilitada).toBe(false);
        expect(state.motivoBloqueio).toBe('Aguardando retorno do autorizador.');
        expect(fiscalActionDisabledReason(false, state)).toBe('Aguardando retorno do autorizador.');
        expect(notaPodeConsultarProtocolo(transmitida, workflow)).toBe(false);
    });

    it('limita registro de rejeição técnica ao workflow ou status transmitido', () => {
        expect(notaPodeRegistrarRejeicao(baseNota)).toBe(false);
        expect(notaPodeRegistrarRejeicao({ ...baseNota, statusFiscal: StatusNotaFiscal.Transmitida })).toBe(true);
    });

    it('rotula documentos auxiliares e contingência sem expor enums crus', () => {
        expect(tipoDocumentoAuxiliarFiscalLabel(TipoDocumentoAuxiliarFiscal.Danfe)).toBe('DANFE');
        expect(formatoDocumentoAuxiliarFiscalLabel(FormatoDocumentoAuxiliarFiscal.Html)).toBe('HTML');
        expect(tipoContingenciaFiscalLabel(TipoContingenciaFiscal.OperacionalInterna)).toBe('Operacional interna');
    });

    it('gera correlationId fiscal padronizado com tentativa única e referência opcional', () => {
        const correlationId = createFiscalCorrelationId('Transmitir SEFAZ', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

        expect(correlationId).toMatch(/^front-transmitir-sefaz-aaaaaaaa-\d{14}-[a-z0-9]{6}$/);
    });

    it('mascara payload fiscal sensível na observabilidade', () => {
        expect(maskFiscalSensitiveText('token=abc123; senha=segredo; <NFe><infNFe /></NFe>')).toBe('token=[MASKED]; senha=[MASKED]; [XML_MASKED]');
        expect(maskFiscalSensitiveText(null)).toBe('-');
    });

    it('mascara bloco XML fiscal completo sem vazar tags internas ou dados fiscais', () => {
        const masked = maskFiscalSensitiveText('payload=<NFe><emit><CNPJ>12345678000199</CNPJ></emit><total>999</total></NFe>; status=erro');

        expect(masked).toBe('payload=[XML_MASKED]; status=erro');
        expect(masked).not.toContain('<emit>');
        expect(masked).not.toContain('CNPJ');
        expect(masked).not.toContain('12345678000199');
        expect(masked).not.toContain('<total>');
    });
});

// Reabertura (fatia v1.11.0a8b76, AC-4): o botão "Reabrir nota" só habilita quando o backend manda `acoes.podeReabrir === true`.
// A tela não calcula nada localmente; ausência do campo (aditivo opcional) ou resumo ausente contam como bloqueio.
const MOTIVO_REABERTURA_INDISPONIVEL = 'A reabertura não está disponível para esta nota conforme o resumo operacional retornado pelo backend.';
const MOTIVO_REABERTURA_AGUARDANDO = 'Aguardando o resumo operacional da nota para liberar a reabertura.';

const resumoComAcoes = (acoesExtras: { podeReabrir?: boolean } = {}): ResumoOperacionalNotaFiscalResponse => ({
    notaFiscalId: baseNota.id,
    empresaId: baseNota.empresaId,
    filialId: null,
    tipoDocumento: TipoDocumentoFiscal.NFe,
    serie: '1',
    numero: '1001',
    statusFiscal: StatusNotaFiscal.Validada,
    origem: OrigemNotaFiscal.Manual,
    origemId: null,
    possuiXmlEnvio: false,
    possuiXmlAutorizado: false,
    possuiDanfe: false,
    acoes: {
        podeValidar: false,
        podeGerarXmlEnvio: false,
        podeAssinarXmlEnvio: false,
        podeTransmitirSefaz: false,
        podeGerarDanfe: false,
        podeBaixarEstoque: false,
        podeGerarContaReceber: false,
        podeCancelar: false,
        podeEmitirCartaCorrecao: false,
        ...acoesExtras
    }
});

describe('AC-4 (v1.11.0a8b76): reabertura de nota depende só de acoes.podeReabrir do resumo operacional', () => {
    it('habilita a reabertura quando o backend devolve podeReabrir = true', () => {
        const state = resolveReabrirNotaActionState(resumoComAcoes({ podeReabrir: true }));

        expect(state.habilitada).toBe(true);
        expect(state.acao).toBeNull();
        expect(state.fonte).toBe('fallback');
    });

    it('desabilita a reabertura com o motivo do resumo quando podeReabrir = false', () => {
        const state = resolveReabrirNotaActionState(resumoComAcoes({ podeReabrir: false }));

        expect(state.habilitada).toBe(false);
        expect(state.motivoBloqueio).toBe(MOTIVO_REABERTURA_INDISPONIVEL);
        expect(fiscalActionDisabledReason(false, state)).toBe(MOTIVO_REABERTURA_INDISPONIVEL);
    });

    it('desabilita a reabertura quando o campo podeReabrir está ausente no resumo (aditivo opcional)', () => {
        const state = resolveReabrirNotaActionState(resumoComAcoes());

        expect(state.habilitada).toBe(false);
        expect(state.motivoBloqueio).toBe(MOTIVO_REABERTURA_INDISPONIVEL);
    });

    it('desabilita a reabertura quando o resumo é undefined ou null, com motivo de espera', () => {
        for (const resumo of [undefined, null]) {
            const state = resolveReabrirNotaActionState(resumo);

            expect(state.habilitada).toBe(false);
            expect(state.motivoBloqueio).toBe(MOTIVO_REABERTURA_AGUARDANDO);
            expect(fiscalActionDisabledReason(false, state)).toBe(MOTIVO_REABERTURA_AGUARDANDO);
        }
    });
});

describe('R2 (v1.11.0a8b76): motivo de bloqueio da edição de itens e impostos', () => {
    it('informa a permissão exigida quando a sessão não tem FISCAL_GERENCIAR, mesmo com nota Validada', () => {
        const validada = { ...baseNota, statusFiscal: StatusNotaFiscal.Validada };

        expect(notaEditarItensDisabledReason(true, validada, 'FISCAL_GERENCIAR')).toBe('Permissão necessária: FISCAL_GERENCIAR.');
        expect(notaEditarItensDisabledReason(true, baseNota, 'FISCAL_GERENCIAR')).toBe('Permissão necessária: FISCAL_GERENCIAR.');
    });

    it('devolve o motivo de Rascunho quando a nota está Validada e a sessão tem permissão', () => {
        const validada = { ...baseNota, statusFiscal: StatusNotaFiscal.Validada };

        expect(notaEditarItensDisabledReason(false, validada, 'FISCAL_GERENCIAR')).toBe(MOTIVO_EDICAO_ITENS_INDISPONIVEL);
    });

    it('não devolve motivo quando a nota está em Rascunho e a sessão tem permissão', () => {
        expect(notaEditarItensDisabledReason(false, baseNota, 'FISCAL_GERENCIAR')).toBeUndefined();
    });
});
