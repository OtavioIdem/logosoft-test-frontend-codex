import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResultadoTributacaoItemPanel } from '@/features/tributacao/components/ResultadoTributacaoPanel';
import { ResultadoTributacaoItemDocumento, SituacaoRetencao, TipoSituacaoTributariaIcms, TratamentoIcmsProprio } from '@/features/tributacao/types/tributacao.types';

const valoresUtilizados = {
    quantidade: 2,
    valorUnitario: 500,
    valorProduto: 1000,
    valorFreteRateado: 3.34,
    valorSeguroRateado: 0,
    valorOutrasDespesasRateado: 0,
    valorDescontoRateado: 0,
    baseBruta: 1003.34
};

const itemMercadoria: ResultadoTributacaoItemDocumento = {
    indice: 0,
    identificadorItem: '1',
    valoresUtilizados,
    resultado: {
        icms: {
            situacao: { origem: '0', codigoSituacao: '00', tipo: TipoSituacaoTributariaIcms.Cst, regime: 2, crtEmitente: null, campoXmlCodigoSituacao: 'CST', usaCsosn: false, codigoIcmsTresDigitos: '000' },
            tratamento: TratamentoIcmsProprio.Tributado,
            baseIntegral: 1003.34,
            baseCalculo: 1003.34,
            percentualReducaoBase: 0,
            aliquota: 18,
            valorIntegral: 180.6,
            valorDiferido: 0,
            valor: 180.6,
            baseFcp: 0,
            percentualFcp: 0,
            valorFcp: 0,
            percentualCreditoSimplesNacional: 0,
            valorCreditoSimplesNacional: 0,
            retidoAnteriormente: false,
            comportaSubstituicaoTributaria: false,
            codigoBeneficioFiscal: null,
            totalComFcp: 180.6
        },
        icmsSt: null,
        difal: null,
        ipi: null,
        pis: null,
        cofins: null,
        iss: null,
        retencoes: null,
        regraAplicadaId: '44444444-4444-4444-4444-444444444444',
        excecaoAplicadaId: null
    }
};

describe('ResultadoTributacaoPanel', () => {
    it('não renderiza bloco nulo como zero: lista os tributos não calculados em vez de mostrar 0,00', () => {
        render(<ResultadoTributacaoItemPanel item={itemMercadoria} />);

        const aviso = screen.getByText(/Não aplicável a este item/);
        expect(aviso).toHaveTextContent('ICMS-ST');
        expect(aviso).toHaveTextContent('DIFAL');
        expect(aviso).toHaveTextContent('IPI');
        expect(aviso).toHaveTextContent('ISS');
        expect(aviso).toHaveTextContent('Retenções na fonte');
        expect(aviso).toHaveTextContent('não é "tributo zero"');

        expect(screen.queryByText('ICMS-ST')).toBeNull();
        expect(screen.queryByText('DIFAL')).toBeNull();
    });

    it('diz por que cada bloco nulo não foi calculado, em vez de só listar o nome do tributo', () => {
        render(<ResultadoTributacaoItemPanel item={itemMercadoria} />);

        const aviso = screen.getByText(/Não aplicável a este item/);
        // O motivo do ST vem do próprio resultado (`comportaSubstituicaoTributaria: false`), não de dedução.
        expect(aviso).toHaveTextContent('ICMS-ST (a situação tributária não comporta ST)');
        expect(aviso).toHaveTextContent('IPI (emitente não é contribuinte do IPI)');
        expect(aviso).toHaveTextContent('Retenções na fonte (item de mercadoria)');

        expect(screen.getByText('Comporta ICMS-ST')).toBeInTheDocument();
        expect(screen.getByText('ST retida anteriormente')).toBeInTheDocument();
    });

    it('exibe o bloco preenchido com seus fatores e o rateio já feito pelo backend', () => {
        render(<ResultadoTributacaoItemPanel item={itemMercadoria} />);

        expect(screen.getByText('ICMS próprio')).toBeInTheDocument();
        expect(screen.getByText('Frete rateado')).toBeInTheDocument();
        expect(screen.getByText(/Como este imposto foi calculado/)).toBeInTheDocument();
    });

    it('mostra o estado de cada retenção junto do valor, porque zero dispensado não é zero apurado', () => {
        const itemServico: ResultadoTributacaoItemDocumento = {
            indice: 1,
            identificadorItem: '2',
            valoresUtilizados,
            resultado: {
                icms: null,
                icmsSt: null,
                difal: null,
                ipi: null,
                pis: null,
                cofins: null,
                iss: null,
                retencoes: {
                    irrf: { situacao: SituacaoRetencao.Dispensado, base: 1000, aliquota: 1.5, baseMinima: 0, valorMinimoRecolhimento: 10, valorBruto: 15, valor: 0 },
                    inss: { situacao: SituacaoRetencao.NaoAplicavel, base: 0, baseAposTeto: 0, teto: 0, aliquota: 0, valor: 0 },
                    pcc: { situacao: SituacaoRetencao.Retido, base: 1000, aliquotaCsll: 1, aliquotaPis: 0.65, aliquotaCofins: 3, valorCsll: 10, valorPis: 6.5, valorCofins: 30, valorTotal: 46.5, valorTotalBruto: 46.5, minimoDispensa: 10 },
                    issRetido: false,
                    valorIssRetido: 0,
                    valorTotalRetido: 46.5
                },
                regraAplicadaId: null,
                excecaoAplicadaId: null
            }
        };

        render(<ResultadoTributacaoItemPanel item={itemServico} />);

        expect(screen.getByText('Dispensado')).toBeInTheDocument();
        expect(screen.getByText('Não aplicável')).toBeInTheDocument();
        expect(screen.getByText('Retido')).toBeInTheDocument();

        // Sem o limiar na tela, o zero do IRRF dispensado fica sem justificativa para quem confere.
        expect(screen.getByText('IRRF · mínimos')).toBeInTheDocument();
        expect(screen.getByText('IRRF · valor apurado antes do mínimo')).toBeInTheDocument();
        expect(screen.getByText('PCC · mínimo de dispensa')).toBeInTheDocument();
    });
});
