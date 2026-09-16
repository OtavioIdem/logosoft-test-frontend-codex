import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotaFiscalRetornoOperacionalPanel } from '@/features/fiscal/components/NotaFiscalRetornoOperacionalPanel';
import { StatusNotaFiscal, TipoServicoTransmissaoFiscal, TipoXmlFiscal } from '@/types/erp';

// AC-4 (v1.11.0a8b57): um Message severity="warn" por alerta, precedido do texto de abertura fixo; chave por
// índice (dois alertas iguais aparecem duas vezes); sem alertas ou sem a chave `alertas`, nada aparece.
const ALERTAS_INTRO = 'A operação foi concluída e o backend registrou alerta(s) que exigem ação:';

const transmissaoBase = {
    notaFiscalId: '11111111-1111-1111-1111-111111111111',
    statusFiscal: StatusNotaFiscal.Autorizada,
    comunicacaoOk: true,
    autorizada: true,
    codigoStatus: '100',
    motivo: 'Autorizado o uso da NF-e',
    protocolo: '135260000000001',
    chaveAcesso: '35260600000000000000550010000000011000000015',
    deveReprocessar: false
};

const consultaBase = {
    notaFiscalId: '11111111-1111-1111-1111-111111111111',
    statusFiscalAntes: StatusNotaFiscal.Transmitida,
    statusFiscalDepois: StatusNotaFiscal.Autorizada,
    servico: TipoServicoTransmissaoFiscal.Autorizacao,
    comunicacaoOk: true,
    autorizadaNoAmbiente: true,
    reconciliacaoAplicada: true,
    codigoStatus: '100',
    motivo: 'Autorizado o uso da NF-e',
    protocolo: '135260000000001',
    chaveAcesso: '35260600000000000000550010000000011000000015',
    deveReprocessar: false
};

describe('NotaFiscalRetornoOperacionalPanel — AC-4', () => {
    it('sem alertas (array vazio) não mostra o texto de abertura nem nenhum Message de alerta', () => {
        render(<NotaFiscalRetornoOperacionalPanel transmissao={{ ...transmissaoBase, alertas: [] }} />);

        expect(screen.queryByText(ALERTAS_INTRO)).not.toBeInTheDocument();
    });

    it('sem a chave `alertas` (ausente do objeto) não mostra o texto de abertura', () => {
        render(<NotaFiscalRetornoOperacionalPanel transmissao={transmissaoBase} />);

        expect(screen.queryByText(ALERTAS_INTRO)).not.toBeInTheDocument();
    });

    it('um alerta: mostra o texto de abertura e um Message warn com o texto exato', () => {
        render(
            <NotaFiscalRetornoOperacionalPanel
                transmissao={{ ...transmissaoBase, alertas: ['Nota fiscal autorizada, mas o pedido de venda não pôde ser faturado.'] }}
            />
        );

        expect(screen.getByText(ALERTAS_INTRO)).toBeInTheDocument();
        expect(screen.getByText('Nota fiscal autorizada, mas o pedido de venda não pôde ser faturado.')).toBeInTheDocument();
    });

    it('dois alertas iguais (chave por índice): aparecem duas vezes, não deduplicados', () => {
        render(<NotaFiscalRetornoOperacionalPanel transmissao={{ ...transmissaoBase, alertas: ['Alerta repetido.', 'Alerta repetido.'] }} />);

        expect(screen.getAllByText('Alerta repetido.')).toHaveLength(2);
    });

    it('consulta de protocolo também mostra alertas no mesmo painel', () => {
        render(<NotaFiscalRetornoOperacionalPanel consulta={{ ...consultaBase, alertas: ['Reconciliação aplicou divergência de status.'] }} />);

        expect(screen.getByText(ALERTAS_INTRO)).toBeInTheDocument();
        expect(screen.getByText('Reconciliação aplicou divergência de status.')).toBeInTheDocument();
    });

    it('reprocessamento (mesmo prop `transmissao`) mostra o alerta do reprocessamento', () => {
        render(<NotaFiscalRetornoOperacionalPanel transmissao={{ ...transmissaoBase, deveReprocessar: false, alertas: ['Reprocessamento concluiu com pendência.'] }} />);

        expect(screen.getByText('Reprocessamento concluiu com pendência.')).toBeInTheDocument();
    });

    it('status, motivo e sufixo de reprocessamento recomendado seguem como hoje', () => {
        render(<NotaFiscalRetornoOperacionalPanel transmissao={{ ...transmissaoBase, autorizada: false, deveReprocessar: true, codigoStatus: '539', motivo: 'Duplicidade de NF-e' }} />);

        expect(screen.getByText('539 • Duplicidade de NF-e • Reprocessamento recomendado.')).toBeInTheDocument();
    });

    it('XML e documento seguem sem mudança de conteúdo', () => {
        render(
            <NotaFiscalRetornoOperacionalPanel
                xml={{
                    notaFiscalId: '11111111-1111-1111-1111-111111111111',
                    tipoDocumento: 1,
                    statusFiscal: StatusNotaFiscal.Rascunho,
                    tipoXml: TipoXmlFiscal.Envio,
                    conteudoXml: '<NFe />',
                    schemaValidado: true,
                    armazenado: true
                }}
                documento={{
                    id: '22222222-2222-2222-2222-222222222222',
                    notaFiscalId: '11111111-1111-1111-1111-111111111111',
                    tipo: 1,
                    formato: 1,
                    nomeArquivo: 'danfe.html',
                    contentType: 'text/html',
                    hashSha256: 'ABCDEF',
                    tamanhoBytes: 100,
                    geradoEm: '2026-05-25T14:00:00+00:00',
                    geradoPor: '33333333-3333-3333-3333-333333333333'
                }}
            />
        );

        expect(screen.getByText(/XML .* gerado\. Schema validado: sim\. Armazenado: sim\./)).toBeInTheDocument();
        expect(screen.getByText('Documento danfe.html gerado com hash ABCDEF.')).toBeInTheDocument();
    });

    it('sem xml, transmissao, consulta e documento, o painel não renderiza nada', () => {
        const { container } = render(<NotaFiscalRetornoOperacionalPanel />);
        expect(container).toBeEmptyDOMElement();
    });
});
