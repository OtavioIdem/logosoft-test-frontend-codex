import { describe, expect, it } from 'vitest';
import { OrigemNotaFiscal, StatusNotaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal } from '@/types/erp';
import {
    fiscalOrigemContextLabel,
    fiscalReferenceContextLabel,
    maskFiscalSensitiveText,
    notaFiscalBloqueiosVisuais,
    notaPodeCancelar,
    notaPodeEditarItens,
    notaPodeGerarDanfe,
    notaPodeTransmitir,
    notaPodeValidar,
    origemNotaFiscalLabel,
    resetFiltrosFiscaisPorEmpresa,
    resetFiltrosFiscaisPorFilial,
    statusNotaFiscalLabel
} from '@/features/fiscal/components/fiscalUiUtils';
import { NotaFiscalResponse } from '@/features/fiscal/types/fiscal.types';

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
