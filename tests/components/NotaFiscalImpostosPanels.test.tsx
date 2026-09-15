import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ComposicaoTotalNotaFiscalCard, ImpostosNotaFiscalTabela } from '@/features/fiscal/components/NotaFiscalImpostosPanels';
import { ImpostoNotaFiscalResponse, NotaFiscalResponse, OrigemImpostoNotaFiscal } from '@/features/fiscal/types/fiscal.types';
import { OrigemNotaFiscal, StatusNotaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal } from '@/types/erp';

let seq = 0;
const imposto = (overrides: Partial<ImpostoNotaFiscalResponse> = {}): ImpostoNotaFiscalResponse => ({
    id: `imposto-${++seq}`,
    itemNotaFiscalId: null,
    nome: 'IPI',
    cstCsosn: '00',
    baseCalculo: 100,
    aliquota: 10,
    valor: 10,
    observacao: null,
    origem: OrigemImpostoNotaFiscal.Motor,
    regraFiscalAplicadaId: null,
    excecaoFiscalAplicadaId: null,
    ...overrides
});

const notaBase = (overrides: Partial<NotaFiscalResponse> = {}): NotaFiscalResponse => ({
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
    valorProdutos: 100,
    valorDesconto: 0,
    valorFrete: 0,
    valorSeguro: 0,
    valorOutrasDespesas: 0,
    valorTotal: 100,
    codigoRejeicao: null,
    mensagemRejeicao: null,
    motivoCancelamento: null,
    observacao: null,
    itens: [],
    impostos: [],
    xmls: [],
    eventos: [],
    ...overrides
});

// Linhas do corpo da tabela, na ordem em que aparecem (a linha 0 do cabeçalho fica de fora).
const linhasDaTabela = () => screen.getAllByRole('row').slice(1);
const celulasDaLinha = (linha: HTMLElement) => within(linha).getAllByRole('cell');

describe('ImpostosNotaFiscalTabela', () => {
    // AC-3: 1 -> Manual, 2 -> Motor, ausente -> Não informada, 7 -> Origem desconhecida (7). Coluna Origem é a 6ª (índice 5).
    it('AC-3: coluna Origem traduz o enum e a ausência, sem GUID de regra/exceção', () => {
        const nota = notaBase({
            impostos: [
                imposto({ id: 'l-manual', nome: 'IPI', origem: OrigemImpostoNotaFiscal.Manual, regraFiscalAplicadaId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' }),
                imposto({ id: 'l-motor', nome: 'ICMS', origem: OrigemImpostoNotaFiscal.Motor }),
                imposto({ id: 'l-ausente', nome: 'PIS', origem: undefined }),
                imposto({ id: 'l-desconhecida', nome: 'COFINS', origem: 7 })
            ]
        });

        render(<ImpostosNotaFiscalTabela nota={nota} />);

        const linhas = linhasDaTabela();
        expect(celulasDaLinha(linhas[0])[5]).toHaveTextContent('Manual');
        expect(celulasDaLinha(linhas[1])[5]).toHaveTextContent('Motor');
        expect(celulasDaLinha(linhas[2])[5]).toHaveTextContent('Não informada');
        expect(celulasDaLinha(linhas[3])[5]).toHaveTextContent('Origem desconhecida (7)');
    });

    // AC-5 (a): Manual vence Motor na mesma chave -> Compõe/Suprimida, com aviso de substituição.
    it('AC-5: linha Manual "compõe o total", Motor da mesma chave "suprimida", e aviso aparece', () => {
        const nota = notaBase({
            valorIpi: 12,
            impostos: [
                imposto({ id: 'motor-ipi', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 10, origem: OrigemImpostoNotaFiscal.Motor }),
                imposto({ id: 'manual-ipi', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 12, origem: OrigemImpostoNotaFiscal.Manual })
            ]
        });

        render(<ImpostosNotaFiscalTabela nota={nota} />);

        const linhas = linhasDaTabela();
        expect(celulasDaLinha(linhas[0])[6]).toHaveTextContent('Suprimida pelo lançamento manual');
        expect(celulasDaLinha(linhas[1])[6]).toHaveTextContent('Compõe o total');
        expect(screen.getByText('Existe lançamento manual substituindo, no total desta nota, o valor calculado pelo motor de tributação.')).toBeInTheDocument();
    });

    // AC-5 (b): ICMS não é um dos três nomes de D7, então nunca compõe o total, mesmo que "pareça" vencer.
    it('AC-5: ICMS de qualquer origem aparece como "Não compõe o total"', () => {
        const nota = notaBase({
            impostos: [imposto({ id: 'icms-manual', nome: 'ICMS', origem: OrigemImpostoNotaFiscal.Manual }), imposto({ id: 'icms-motor', nome: 'ICMS', origem: OrigemImpostoNotaFiscal.Motor })]
        });

        render(<ImpostosNotaFiscalTabela nota={nota} />);

        const linhas = linhasDaTabela();
        expect(celulasDaLinha(linhas[0])[6]).toHaveTextContent('Não compõe o total');
        expect(celulasDaLinha(linhas[1])[6]).toHaveTextContent('Não compõe o total');
    });

    // AC-5 (e): agregado do backend não bate com a soma das linhas vencedoras -> "Não conferida" e aviso nomeado.
    it('AC-5: agregado divergente marca "Não conferida" e nomeia o imposto no aviso', () => {
        const nota = notaBase({
            valorIpi: 999,
            impostos: [imposto({ id: 'motor-diverge', itemNotaFiscalId: 'item-1', nome: 'IPI', valor: 10, origem: OrigemImpostoNotaFiscal.Motor })]
        });

        render(<ImpostosNotaFiscalTabela nota={nota} />);

        const linhas = linhasDaTabela();
        expect(celulasDaLinha(linhas[0])[6]).toHaveTextContent('Não conferida');
        expect(screen.getByText('Não foi possível conferir a composição de IPI nesta nota. Vale o total retornado pelo servidor.')).toBeInTheDocument();
    });

    // AC-19 / D38: a coluna Observação (última, índice 7) mostra o motivo do lançamento manual, e "-" quando vazia.
    it('AC-19: coluna Observação mostra o motivo do Manual e "-" quando o Motor não tem observação', () => {
        const nota = notaBase({
            impostos: [
                imposto({ id: 'com-motivo', nome: 'IPI', origem: OrigemImpostoNotaFiscal.Manual, observacao: 'Ajuste conferido pelo fiscal.' }),
                imposto({ id: 'sem-motivo', nome: 'ICMS', origem: OrigemImpostoNotaFiscal.Motor, observacao: null })
            ]
        });

        render(<ImpostosNotaFiscalTabela nota={nota} />);

        const linhas = linhasDaTabela();
        expect(celulasDaLinha(linhas[0])[7]).toHaveTextContent('Ajuste conferido pelo fiscal.');
        expect(celulasDaLinha(linhas[1])[7]).toHaveTextContent('-');
    });

    // AC-17: nenhum GUID cru aparece no texto renderizado (ids das linhas e das regras/exceções ficam de fora).
    it('AC-17: nenhum GUID aparece no texto renderizado da tabela', () => {
        const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const nota = notaBase({
            impostos: [
                imposto({
                    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    itemNotaFiscalId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                    nome: 'IPI',
                    origem: OrigemImpostoNotaFiscal.Manual,
                    regraFiscalAplicadaId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                    excecaoFiscalAplicadaId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
                    observacao: 'Motivo sem identificador técnico.'
                })
            ]
        });

        const { container } = render(<ImpostosNotaFiscalTabela nota={nota} />);

        expect(container.textContent ?? '').not.toMatch(guidRegex);
    });
});

// Localiza a linha "rótulo: valor" do cartão pelo texto do rótulo (span), não por classe CSS.
const linhaComposicao = (rotulo: string) => {
    const rotuloEl = screen.getByText(rotulo);
    const linha = rotuloEl.closest('div');
    if (!linha) throw new Error(`Linha "${rotulo}" não encontrada no cartão de composição.`);
    return linha as HTMLElement;
};
const valorComposicao = (rotulo: string) => (linhaComposicao(rotulo).querySelector('strong')?.textContent ?? '').replace(/\s/g, ' ');

describe('ComposicaoTotalNotaFiscalCard', () => {
    // AC-6: as 9 linhas vêm da resposta, e o total nunca é somado no cliente -- mesmo quando a soma dos
    // componentes não fecha com valorTotal, o que aparece é o valorTotal do backend.
    it('AC-6: com soma que não fecha, o total exibido é o valorTotal do backend (999,00), não a soma local', () => {
        const nota = notaBase({
            valorProdutos: 100,
            valorDesconto: 10,
            valorFrete: 5,
            valorSeguro: 2,
            valorOutrasDespesas: 3,
            valorIpi: 8,
            valorIcmsSt: 1,
            valorFcpSt: 1,
            valorTotal: 999
        });
        // soma real dos componentes: 100 - 10 + 5 + 2 + 3 + 8 + 1 + 1 = 110, bem diferente de 999

        render(<ComposicaoTotalNotaFiscalCard nota={nota} />);

        expect(valorComposicao('Produtos')).toBe('R$ 100,00');
        expect(valorComposicao('Desconto')).toBe('- R$ 10,00');
        expect(valorComposicao('Frete')).toBe('R$ 5,00');
        expect(valorComposicao('Seguro')).toBe('R$ 2,00');
        expect(valorComposicao('Outras despesas')).toBe('R$ 3,00');
        expect(valorComposicao('IPI')).toBe('R$ 8,00');
        expect(valorComposicao('ICMS ST')).toBe('R$ 1,00');
        expect(valorComposicao('FCP ST')).toBe('R$ 1,00');
        expect(valorComposicao('Total')).toBe('R$ 999,00');
    });

    it('AC-6: agregados tributários ausentes aparecem como R$ 0,00', () => {
        const nota = notaBase({ valorIpi: undefined, valorIcmsSt: undefined, valorFcpSt: undefined });

        render(<ComposicaoTotalNotaFiscalCard nota={nota} />);

        expect(valorComposicao('IPI')).toBe('R$ 0,00');
        expect(valorComposicao('ICMS ST')).toBe('R$ 0,00');
        expect(valorComposicao('FCP ST')).toBe('R$ 0,00');
    });
});
