import { describe, expect, it } from 'vitest';
import { OrigemNotaFiscal, StatusNotaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal } from '@/types/erp';
import { maskFiscalSensitiveText, notaFiscalBloqueiosVisuais, notaPodeCancelar, notaPodeEditarItens, notaPodeGerarDanfe, notaPodeTransmitir, notaPodeValidar, statusNotaFiscalLabel } from '@/features/fiscal/components/fiscalUiUtils';
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
