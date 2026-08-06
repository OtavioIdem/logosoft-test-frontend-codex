import { describe, expect, it } from 'vitest';
import { buildAtualizarRegraFiscalPayload, buildCriarExcecaoFiscalNcmPayload, buildCriarExcecaoFiscalPayload, buildCriarRegraFiscalPayload, buildSimularTributacaoPayload } from '@/features/tributacao/api/tributacaoApi';
import { criarExcecaoFiscalSchema, simularTributacaoSchema, toDateOnly } from '@/features/tributacao/schemas/tributacaoSchemas';
import { IndicadorContribuinteIcms, ModalidadeBaseCalculoIcms, ModalidadeBaseCalculoIcmsSt, RegimeTributario, TipoCalculoPisCofins, TipoCfop, TipoItemSped } from '@/features/tributacao/types/tributacao.types';

const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';
const ncmId = '33333333-3333-3333-3333-333333333333';

const documentoBase = {
    empresaId,
    filialId: '',
    tipoOperacao: TipoCfop.Saida,
    regimeEmpresa: RegimeTributario.LucroReal,
    crtEmitente: null,
    ufOrigem: 'sp',
    ufDestino: 'mg',
    codigoMunicipioOrigem: '',
    codigoMunicipioDestino: '',
    indicadorContribuinteDestinatario: IndicadorContribuinteIcms.Contribuinte,
    consumidorFinal: false,
    dataOperacao: '2026-08-06',
    destinatarioContribuinteIpi: false,
    emitenteContribuinteIpi: true,
    finalidade: 1,
    naturezaTomadorServico: 0,
    valorFreteTotal: 10,
    valorSeguroTotal: 0,
    valorOutrasDespesasTotal: 0,
    valorDescontoTotal: 0,
    itens: [
        {
            identificadorItem: '1',
            origemMercadoria: '0',
            tipoItem: TipoItemSped.MercadoriaParaRevenda,
            ncmId: '',
            cfopId: '',
            ncmCodigo: '',
            cestCodigo: '',
            cfopCodigo: '',
            quantidade: 2,
            valorUnitario: 500,
            valorProduto: 1000
        }
    ]
};

const blocoIcms = {
    cstIcmsCodigo: '00',
    csosnCodigo: '',
    modalidadeBaseCalculo: ModalidadeBaseCalculoIcms.ValorOperacao,
    aliquota: 18,
    percentualReducaoBase: 0,
    aliquotaInternaDestino: 18,
    modalidadeBaseCalculoSt: ModalidadeBaseCalculoIcmsSt.MargemValorAgregado,
    mva: 0,
    mvaAjustada: 0,
    percentualReducaoBaseSt: 0,
    percentualFcp: '',
    percentualFcpSt: 0,
    percentualDiferimento: 0,
    percentualCreditoSimplesNacional: 0,
    codigoBeneficioFiscal: '',
    baseDuplaDifal: false
};

const regraBase = {
    descricao: 'Venda interna tributada',
    tipoOperacao: TipoCfop.Saida,
    ufOrigem: '',
    ufDestino: 'sp',
    regimeEmpresa: null,
    indicadorContribuinte: null,
    consumidorFinal: null,
    ncmId: '',
    grupoProdutoId: '',
    cfopId: '',
    prioridade: 10,
    vigenciaInicio: '2026-01-01',
    vigenciaFim: '',
    icms: blocoIcms,
    ipi: null,
    pisCofins: null,
    iss: null,
    retencao: null
};

describe('payload de simulação de tributação', () => {
    it('normaliza UF, mantém o valor do produto informado e envia acessórias como totais do documento', () => {
        const payload = buildSimularTributacaoPayload(documentoBase);

        expect(payload.ufOrigem).toBe('SP');
        expect(payload.ufDestino).toBe('MG');
        expect(payload.filialId).toBeNull();
        expect(payload.valorFreteTotal).toBe(10);
        // valorProduto é informado, não derivado de quantidade × unitário.
        expect(payload.itens[0].valorProduto).toBe(1000);
        expect(payload.itens[0].identificadorItem).toBe('1');
    });

    it('aceita EX como UF de destino para operação com o exterior', () => {
        expect(buildSimularTributacaoPayload({ ...documentoBase, ufDestino: 'ex' }).ufDestino).toBe('EX');
    });

    it('rejeita documento sem itens', () => {
        const resultado = simularTributacaoSchema.safeParse({ ...documentoBase, itens: [] });
        expect(resultado.success).toBe(false);
    });

    it('rejeita quantidade zero antes de gastar um round-trip com o motor', () => {
        const resultado = simularTributacaoSchema.safeParse({ ...documentoBase, itens: [{ ...documentoBase.itens[0], quantidade: 0 }] });
        expect(resultado.success).toBe(false);
    });

    it('rejeita desconto do documento maior que a soma dos produtos', () => {
        const resultado = simularTributacaoSchema.safeParse({ ...documentoBase, valorDescontoTotal: 1500 });
        expect(resultado.success).toBe(false);
        expect(resultado.success ? [] : resultado.error.issues.map((issue) => issue.path.join('.'))).toContain('valorDescontoTotal');
    });

    it('rejeita UF fora de duas letras', () => {
        expect(simularTributacaoSchema.safeParse({ ...documentoBase, ufOrigem: 'SPP' }).success).toBe(false);
    });

    it('exige os códigos de município quando há item de serviço, porque o ISS depende da incidência', () => {
        const documentoComServico = { ...documentoBase, itens: [{ ...documentoBase.itens[0], tipoItem: TipoItemSped.Servicos }] };

        const resultado = simularTributacaoSchema.safeParse(documentoComServico);
        expect(resultado.success).toBe(false);

        const campos = resultado.success ? [] : resultado.error.issues.map((issue) => issue.path.join('.'));
        expect(campos).toContain('codigoMunicipioOrigem');
        expect(campos).toContain('codigoMunicipioDestino');

        expect(simularTributacaoSchema.safeParse({ ...documentoComServico, codigoMunicipioOrigem: '3550308', codigoMunicipioDestino: '3106200' }).success).toBe(true);
    });

    it('não exige município quando todos os itens são mercadoria', () => {
        expect(simularTributacaoSchema.safeParse(documentoBase).success).toBe(true);
    });
});

describe('payload de regra fiscal', () => {
    it('preserva null como curinga na chave de resolução', () => {
        const payload = buildCriarRegraFiscalPayload({ ...regraBase, empresaId, filialId: '' });

        expect(payload.empresaId).toBe(empresaId);
        expect(payload.filialId).toBeNull();
        expect(payload.ufOrigem).toBeNull();
        expect(payload.ufDestino).toBe('SP');
        expect(payload.regimeEmpresa).toBeNull();
        expect(payload.indicadorContribuinte).toBeNull();
        expect(payload.consumidorFinal).toBeNull();
        expect(payload.vigenciaFim).toBeNull();
    });

    it('não confunde curinga com Simples Nacional, que é o enum de valor zero', () => {
        const curinga = buildCriarRegraFiscalPayload({ ...regraBase, empresaId, regimeEmpresa: null });
        const simples = buildCriarRegraFiscalPayload({ ...regraBase, empresaId, regimeEmpresa: RegimeTributario.SimplesNacional });

        expect(curinga.regimeEmpresa).toBeNull();
        expect(simples.regimeEmpresa).toBe(RegimeTributario.SimplesNacional);
    });

    it('distingue FCP não informado (null) de FCP zero deliberado', () => {
        const payload = buildCriarRegraFiscalPayload({ ...regraBase, empresaId });

        expect(payload.icms?.percentualFcp).toBeNull();
        expect(payload.icms?.percentualFcpSt).toBe(0);
    });

    it('mantém blocos ausentes como null no PUT, que é substituição total', () => {
        const payload = buildAtualizarRegraFiscalPayload(regraBase);

        expect(payload.icms).not.toBeNull();
        expect(payload.ipi).toBeNull();
        expect(payload.pisCofins).toBeNull();
        expect(payload.iss).toBeNull();
        expect(payload.retencao).toBeNull();
    });

    it('exige CST do ICMS ou CSOSN no bloco de ICMS', () => {
        expect(() => buildCriarRegraFiscalPayload({ ...regraBase, empresaId, icms: { ...blocoIcms, cstIcmsCodigo: '', csosnCodigo: '' } })).toThrow();
    });

    it('rejeita fim de vigência anterior ao início', () => {
        expect(() => buildCriarRegraFiscalPayload({ ...regraBase, empresaId, vigenciaInicio: '2026-06-01', vigenciaFim: '2026-01-01' })).toThrow();
    });
});

describe('payload de exceção fiscal', () => {
    const excecaoBase = {
        descricao: 'Cesta básica com redução',
        uf: 'sp',
        codigoBeneficio: '',
        vigenciaInicio: '2026-01-01',
        vigenciaFim: '',
        icms: { cstIcmsCodigo: '20', csosnCodigo: '', aliquota: 7, percentualReducaoBase: 61.11, percentualDiferimento: 0, percentualFcp: '', percentualCreditoSimplesNacional: 0 },
        pisCofins: null
    };

    it('normaliza UF e mantém código de benefício nulo quando vazio', () => {
        const payload = buildCriarExcecaoFiscalPayload({ ...excecaoBase, empresaId, filialId });

        expect(payload.uf).toBe('SP');
        expect(payload.codigoBeneficio).toBeNull();
        expect(payload.filialId).toBe(filialId);
        expect(payload.icms?.percentualFcp).toBeNull();
    });

    it('rejeita exceção sem nenhum bloco, que o backend trata como cadastro fantasma', () => {
        const resultado = criarExcecaoFiscalSchema.safeParse({ ...excecaoBase, empresaId, icms: null, pisCofins: null });
        expect(resultado.success).toBe(false);
    });

    it('aceita exceção só com o bloco de PIS/COFINS', () => {
        const payload = buildCriarExcecaoFiscalPayload({
            ...excecaoBase,
            empresaId,
            icms: null,
            pisCofins: {
                cstPisCodigo: '06',
                cstCofinsCodigo: '06',
                aliquotaPis: 0,
                aliquotaCofins: 0,
                tipoCalculo: TipoCalculoPisCofins.Percentual,
                valorPorUnidadePis: 0,
                valorPorUnidadeCofins: 0,
                indicadorCreditaEntrada: false,
                excluirIcmsDaBase: false
            }
        });

        expect(payload.icms).toBeNull();
        expect(payload.pisCofins?.cstPisCodigo).toBe('06');
    });

    it('exige NCM na variante por NCM', () => {
        expect(() => buildCriarExcecaoFiscalNcmPayload({ ...excecaoBase, empresaId, ncmId: '' })).toThrow();
        expect(buildCriarExcecaoFiscalNcmPayload({ ...excecaoBase, empresaId, ncmId }).ncmId).toBe(ncmId);
    });
});

describe('conversão de DateOnly', () => {
    it('usa o fuso local, sem deslocar a data como toISOString faria', () => {
        expect(toDateOnly(new Date(2026, 7, 6, 23, 30))).toBe('2026-08-06');
        expect(toDateOnly(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
    });
});
