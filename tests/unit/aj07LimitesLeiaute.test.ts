import { describe, expect, it } from 'vitest';
import { criarEmpresaSchema } from '@/features/administracao/schemas/administracaoSchemas';
import { mapeamentoCfopSchema } from '@/features/fiscal/schemas/naturezasOperacaoSchemas';
import { criarSerieFiscalSchema } from '@/features/fiscal/schemas/seriesFiscaisSchemas';
import { criarPessoaSchema } from '@/features/pessoas/schemas/pessoasSchemas';
import { atualizarDadosFiscaisProdutoSchema, criarUnidadeMedidaSchema } from '@/features/produtos/schemas/produtosSchemas';
import {
    isCestLeiauteValido,
    isCfopLeiauteValido,
    isInscricaoEstadualLeiauteValida,
    isInscricaoMunicipalLeiauteValida,
    isNcmLeiauteValido,
    isUnidadeLeiauteValida
} from '@/lib/validators/fiscalLayoutFormats';
import { RegimeTributario } from '@/features/administracao/types/administracao.types';
import { TipoPessoa } from '@/types/erp';

const empresaId = '11111111-1111-1111-1111-111111111111';
const modeloDocumentoFiscalId = '22222222-2222-2222-2222-222222222222';

describe('AJ-07: predicados de limites do leiaute fiscal', () => {
    it.each([
        ['NCM de oito dígitos', isNcmLeiauteValido, '84713012', true],
        ['NCM pontuado', isNcmLeiauteValido, '8471.30.12', true],
        ['NCM especial', isNcmLeiauteValido, '00', true],
        ['NCM curto', isNcmLeiauteValido, '8471301', false],
        ['NCM com letra', isNcmLeiauteValido, '8471301A', false],
        ['CEST pontuado', isCestLeiauteValido, '01.048.00', true],
        ['CEST curto', isCestLeiauteValido, '010480', false],
        ['CFOP pontuado', isCfopLeiauteValido, '5.102', true],
        ['CFOP com primeiro dígito aceito', isCfopLeiauteValido, '7102', true],
        ['CFOP com primeiro dígito inválido', isCfopLeiauteValido, '4102', false],
        ['Unidade no limite', isUnidadeLeiauteValida, 'CAIXA1', true],
        ['Unidade acima do limite', isUnidadeLeiauteValida, 'CAIXA12', false],
        ['IE pontuada', isInscricaoEstadualLeiauteValida, '110.042.490.114', true],
        ['IE isento', isInscricaoEstadualLeiauteValida, 'isento', true],
        ['IE curta', isInscricaoEstadualLeiauteValida, '1', false],
        ['IE com letra', isInscricaoEstadualLeiauteValida, '12A', false],
        ['IM com um caractere', isInscricaoMunicipalLeiauteValida, '1', true],
        ['IM com quinze caracteres', isInscricaoMunicipalLeiauteValida, '1'.repeat(15), true],
        ['IM com dezesseis caracteres', isInscricaoMunicipalLeiauteValida, '1'.repeat(16), false]
    ])('%s', (_nome, predicado, value, esperado) => {
        expect(predicado(value)).toBe(esperado);
    });
});

describe('AJ-07: schemas consumidores', () => {
    it('aceita a pontuação normalizável e preserva o valor do produto no payload', () => {
        const resultado = atualizarDadosFiscaisProdutoSchema.parse({
            ncmCodigo: '8471.30.12',
            cestCodigo: '01.048.00',
            origemMercadoriaCodigo: null,
            tipoItemFiscal: null,
            tipoItemSped: null,
            unidadeTributavelSigla: 'UN',
            unidadeMedidaTributavelId: null,
            exTipi: null,
            codigoBeneficioFiscalPadrao: null,
            codigoFiscalExterno: null
        });

        expect(resultado).toMatchObject({ ncmCodigo: '8471.30.12', cestCodigo: '01.048.00', unidadeTributavelSigla: 'UN' });
    });

    it('recusa NCM, CEST, unidade e CFOP fora do formato', () => {
        expect(atualizarDadosFiscaisProdutoSchema.safeParse({ ncmCodigo: '123', cestCodigo: '123', origemMercadoriaCodigo: null, tipoItemFiscal: null, tipoItemSped: null, unidadeTributavelSigla: 'UNIDADE7', unidadeMedidaTributavelId: null, exTipi: null, codigoBeneficioFiscalPadrao: null, codigoFiscalExterno: null }).success).toBe(false);
        expect(criarUnidadeMedidaSchema.safeParse({ empresaId, filialId: null, sigla: 'UNIDADE7', descricao: 'Unidade', casasDecimais: 0, permiteFracionado: false }).success).toBe(false);
        expect(mapeamentoCfopSchema.safeParse({ ambito: 1, cfopCodigo: '4102', tipoItem: null }).success).toBe(false);
    });

    it('aplica IE e IM nos cadastros de empresa e pessoa', () => {
        const empresa = { razaoSocial: 'Empresa Fiscal LTDA', nomeFantasia: '', documento: '12345678000195', inscricaoEstadual: 'ISENTO', inscricaoMunicipal: '1'.repeat(15), regimeTributario: RegimeTributario.SimplesNacional, crt: null, contribuinteIpi: false };
        expect(criarEmpresaSchema.safeParse(empresa).success).toBe(true);
        expect(criarEmpresaSchema.safeParse({ ...empresa, inscricaoEstadual: '1' }).success).toBe(false);
        expect(criarEmpresaSchema.safeParse({ ...empresa, inscricaoMunicipal: '1'.repeat(16) }).success).toBe(false);

        const pessoa = { empresaId, filialId: null, tipoPessoa: TipoPessoa.Juridica, nomeRazaoSocial: 'Pessoa Fiscal LTDA', nomeFantasia: '', documento: '12345678000195', inscricaoEstadual: '110.042.490.114', inscricaoMunicipal: 'MUNICIPAL', observacao: '' };
        expect(criarPessoaSchema.safeParse(pessoa).success).toBe(true);
        expect(criarPessoaSchema.safeParse({ ...pessoa, inscricaoEstadual: '12A' }).success).toBe(false);
    });

    it('mantém a série nos limites inclusivos de 0 a 999', () => {
        const comum = { empresaId, filialId: null, modeloDocumentoFiscalId, numeroInicial: 1, numeroFinal: 1, vigenciaInicio: '2026-01-01', vigenciaFim: null };
        expect(criarSerieFiscalSchema.safeParse({ ...comum, numero: 0 }).success).toBe(true);
        expect(criarSerieFiscalSchema.safeParse({ ...comum, numero: 999 }).success).toBe(true);
        expect(criarSerieFiscalSchema.safeParse({ ...comum, numero: 1000 }).success).toBe(false);
    });
});
