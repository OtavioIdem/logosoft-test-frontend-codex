import { SelectOption } from '@/types/erp';
import {
    Crt,
    FinalidadeNaturezaOperacao,
    IndicadorContribuinteIcms,
    ModalidadeBaseCalculoIcms,
    ModalidadeBaseCalculoIcmsSt,
    MunicipioIncidenciaIss,
    NaturezaTomadorServico,
    RegimePisCofins,
    RegimeTributario,
    SituacaoRetencao,
    TipoCalculoIpi,
    TipoCalculoPisCofins,
    TipoCfop,
    TipoItemSped,
    TratamentoIcmsProprio,
    TratamentoIpi,
    TratamentoPisCofins
} from '@/features/tributacao/types/tributacao.types';

/**
 * Tabelas de apoio das telas de tributação. Enums e códigos aqui são **tabelas legais fixas** (Tabela A de
 * origem, Tabela B de CST, CSOSN, 4.3.2 do IPI, CST de PIS/COFINS) e os enums numéricos do contrato — por
 * isso ficam locais, sem depender de carga de cadastro nem da permissão `FISCAL_CADASTROS_CONSULTAR`.
 * NCM e CFOP, que são cadastro de verdade, vêm da API (ver `useNcmOptions` / `useCfopOptions`).
 */

export const tipoOperacaoOptions: SelectOption<number>[] = [
    { label: 'Entrada', value: TipoCfop.Entrada },
    { label: 'Saída', value: TipoCfop.Saida }
];

export const regimeTributarioOptions: SelectOption<number>[] = [
    { label: 'Simples Nacional', value: RegimeTributario.SimplesNacional },
    { label: 'Lucro Presumido', value: RegimeTributario.LucroPresumido },
    { label: 'Lucro Real', value: RegimeTributario.LucroReal }
];

export const crtOptions: SelectOption<number>[] = [
    { label: '1 — Simples Nacional', value: Crt.SimplesNacional },
    { label: '2 — Simples Nacional, excesso de sublimite', value: Crt.SimplesNacionalExcessoSublimite },
    { label: '3 — Regime normal', value: Crt.RegimeNormal }
];

export const indicadorContribuinteOptions: SelectOption<number>[] = [
    { label: 'Contribuinte do ICMS', value: IndicadorContribuinteIcms.Contribuinte },
    { label: 'Contribuinte isento', value: IndicadorContribuinteIcms.Isento },
    { label: 'Não contribuinte', value: IndicadorContribuinteIcms.NaoContribuinte }
];

export const finalidadeOptions: SelectOption<number>[] = [
    { label: 'Normal', value: FinalidadeNaturezaOperacao.Normal },
    { label: 'Complementar', value: FinalidadeNaturezaOperacao.Complementar },
    { label: 'Ajuste', value: FinalidadeNaturezaOperacao.Ajuste },
    { label: 'Devolução', value: FinalidadeNaturezaOperacao.Devolucao }
];

export const naturezaTomadorOptions: SelectOption<number>[] = [
    { label: 'Não aplicável', value: NaturezaTomadorServico.NaoAplicavel },
    { label: 'Pessoa física', value: NaturezaTomadorServico.PessoaFisica },
    { label: 'Pessoa jurídica', value: NaturezaTomadorServico.PessoaJuridica },
    { label: 'Órgão público', value: NaturezaTomadorServico.OrgaoPublico }
];

export const tipoItemSpedOptions: SelectOption<number>[] = [
    { label: '00 — Mercadoria para revenda', value: TipoItemSped.MercadoriaParaRevenda },
    { label: '01 — Matéria-prima', value: TipoItemSped.MateriaPrima },
    { label: '02 — Embalagem', value: TipoItemSped.Embalagem },
    { label: '03 — Produto em processo', value: TipoItemSped.ProdutoEmProcesso },
    { label: '04 — Produto acabado', value: TipoItemSped.ProdutoAcabado },
    { label: '05 — Subproduto', value: TipoItemSped.Subproduto },
    { label: '06 — Produto intermediário', value: TipoItemSped.ProdutoIntermediario },
    { label: '07 — Material de uso e consumo', value: TipoItemSped.MaterialDeUsoEConsumo },
    { label: '08 — Ativo imobilizado', value: TipoItemSped.AtivoImobilizado },
    { label: '09 — Serviços', value: TipoItemSped.Servicos },
    { label: '10 — Outros insumos', value: TipoItemSped.OutrosInsumos },
    { label: '99 — Outras', value: TipoItemSped.Outras }
];

/** Tabela A da NF-e (origem da mercadoria) — decide a alíquota de 4% no interestadual. */
export const origemMercadoriaOptions: SelectOption<string>[] = [
    { label: '0 — Nacional', value: '0' },
    { label: '1 — Estrangeira, importação direta', value: '1' },
    { label: '2 — Estrangeira, adquirida no mercado interno', value: '2' },
    { label: '3 — Nacional, conteúdo de importação entre 40% e 70%', value: '3' },
    { label: '4 — Nacional, processos produtivos básicos', value: '4' },
    { label: '5 — Nacional, conteúdo de importação até 40%', value: '5' },
    { label: '6 — Estrangeira, importação direta sem similar nacional', value: '6' },
    { label: '7 — Estrangeira, mercado interno sem similar nacional', value: '7' },
    { label: '8 — Nacional, conteúdo de importação acima de 70%', value: '8' }
];

/** Tabela B da NF-e — os códigos que o motor reconhece para o ICMS próprio. */
export const cstIcmsOptions: SelectOption<string>[] = [
    { label: '00 — Tributada integralmente', value: '00' },
    { label: '10 — Tributada com cobrança do ICMS por ST', value: '10' },
    { label: '20 — Com redução de base de cálculo', value: '20' },
    { label: '30 — Isenta ou não tributada com ICMS por ST', value: '30' },
    { label: '40 — Isenta', value: '40' },
    { label: '41 — Não tributada', value: '41' },
    { label: '50 — Suspensão', value: '50' },
    { label: '51 — Diferimento', value: '51' },
    { label: '60 — ICMS cobrado anteriormente por ST', value: '60' },
    { label: '70 — Com redução de base e cobrança do ICMS por ST', value: '70' },
    { label: '90 — Outras', value: '90' }
];

export const csosnOptions: SelectOption<string>[] = [
    { label: '101 — Tributada com permissão de crédito', value: '101' },
    { label: '102 — Tributada sem permissão de crédito', value: '102' },
    { label: '103 — Isenção do ICMS para faixa de receita bruta', value: '103' },
    { label: '201 — Tributada com permissão de crédito e ST', value: '201' },
    { label: '202 — Tributada sem permissão de crédito e ST', value: '202' },
    { label: '203 — Isenção do ICMS para faixa de receita bruta e ST', value: '203' },
    { label: '300 — Imune', value: '300' },
    { label: '400 — Não tributada', value: '400' },
    { label: '500 — ICMS cobrado anteriormente por ST ou por antecipação', value: '500' },
    { label: '900 — Outros', value: '900' }
];

/** Tabela 4.3.2 do IPI — 00 a 05 e 49 são de entrada; 50 a 55 e 99 são de saída. */
export const cstIpiOptions: SelectOption<string>[] = [
    { label: '00 — Entrada com recuperação de crédito', value: '00' },
    { label: '01 — Entrada tributada com alíquota zero', value: '01' },
    { label: '02 — Entrada isenta', value: '02' },
    { label: '03 — Entrada não tributada', value: '03' },
    { label: '04 — Entrada imune', value: '04' },
    { label: '05 — Entrada com suspensão', value: '05' },
    { label: '49 — Outras entradas', value: '49' },
    { label: '50 — Saída tributada', value: '50' },
    { label: '51 — Saída tributada com alíquota zero', value: '51' },
    { label: '52 — Saída isenta', value: '52' },
    { label: '53 — Saída não tributada', value: '53' },
    { label: '54 — Saída imune', value: '54' },
    { label: '55 — Saída com suspensão', value: '55' },
    { label: '99 — Outras saídas', value: '99' }
];

export const cstPisCofinsOptions: SelectOption<string>[] = [
    { label: '01 — Operação tributável, alíquota básica', value: '01' },
    { label: '02 — Operação tributável, alíquota diferenciada', value: '02' },
    { label: '03 — Operação tributável, alíquota por unidade', value: '03' },
    { label: '04 — Operação tributável monofásica, alíquota zero', value: '04' },
    { label: '05 — Operação tributável por substituição tributária', value: '05' },
    { label: '06 — Operação tributável, alíquota zero', value: '06' },
    { label: '07 — Operação isenta da contribuição', value: '07' },
    { label: '08 — Operação sem incidência da contribuição', value: '08' },
    { label: '09 — Operação com suspensão da contribuição', value: '09' },
    { label: '49 — Outras operações de saída', value: '49' },
    { label: '50 — Crédito vinculado à receita tributada no mercado interno', value: '50' },
    { label: '51 — Crédito vinculado à receita não tributada no mercado interno', value: '51' },
    { label: '52 — Crédito vinculado à receita de exportação', value: '52' },
    { label: '53 — Crédito vinculado a receitas tributadas e não tributadas', value: '53' },
    { label: '54 — Crédito vinculado a receitas tributadas e de exportação', value: '54' },
    { label: '55 — Crédito vinculado a receitas não tributadas e de exportação', value: '55' },
    { label: '56 — Crédito vinculado a receitas tributadas, não tributadas e de exportação', value: '56' },
    { label: '60 — Crédito presumido sobre receita tributada no mercado interno', value: '60' },
    { label: '61 — Crédito presumido sobre receita não tributada no mercado interno', value: '61' },
    { label: '62 — Crédito presumido sobre receita de exportação', value: '62' },
    { label: '63 — Crédito presumido sobre receitas tributadas e não tributadas', value: '63' },
    { label: '64 — Crédito presumido sobre receitas tributadas e de exportação', value: '64' },
    { label: '65 — Crédito presumido sobre receitas não tributadas e de exportação', value: '65' },
    { label: '66 — Crédito presumido sobre receitas tributadas, não tributadas e de exportação', value: '66' },
    { label: '67 — Crédito presumido, outras operações', value: '67' },
    { label: '70 — Operação de aquisição sem direito a crédito', value: '70' },
    { label: '71 — Operação de aquisição com isenção', value: '71' },
    { label: '72 — Operação de aquisição com suspensão', value: '72' },
    { label: '73 — Operação de aquisição a alíquota zero', value: '73' },
    { label: '74 — Operação de aquisição sem incidência da contribuição', value: '74' },
    { label: '75 — Operação de aquisição por substituição tributária', value: '75' },
    { label: '98 — Outras operações de entrada', value: '98' },
    { label: '99 — Outras operações', value: '99' }
];

export const modalidadeBaseIcmsOptions: SelectOption<number>[] = [
    { label: 'Margem de valor agregado', value: ModalidadeBaseCalculoIcms.MargemValorAgregado },
    { label: 'Pauta', value: ModalidadeBaseCalculoIcms.Pauta },
    { label: 'Preço tabelado', value: ModalidadeBaseCalculoIcms.PrecoTabelado },
    { label: 'Valor da operação', value: ModalidadeBaseCalculoIcms.ValorOperacao }
];

export const modalidadeBaseIcmsStOptions: SelectOption<number>[] = [
    { label: 'Margem de valor agregado', value: ModalidadeBaseCalculoIcmsSt.MargemValorAgregado },
    { label: 'Pauta', value: ModalidadeBaseCalculoIcmsSt.Pauta },
    { label: 'Preço tabelado', value: ModalidadeBaseCalculoIcmsSt.PrecoTabelado },
    { label: 'Lista negativa', value: ModalidadeBaseCalculoIcmsSt.ListaNegativa },
    { label: 'Lista positiva', value: ModalidadeBaseCalculoIcmsSt.ListaPositiva },
    { label: 'Lista neutra', value: ModalidadeBaseCalculoIcmsSt.ListaNeutra }
];

export const regimePisCofinsOptions: SelectOption<number>[] = [
    { label: 'Cumulativo', value: RegimePisCofins.Cumulativo },
    { label: 'Não cumulativo', value: RegimePisCofins.NaoCumulativo }
];

export const tipoCalculoIpiOptions: SelectOption<number>[] = [
    { label: 'Alíquota', value: TipoCalculoIpi.Aliquota },
    { label: 'Valor por unidade', value: TipoCalculoIpi.ValorPorUnidade }
];

export const tipoCalculoPisCofinsOptions: SelectOption<number>[] = [
    { label: 'Percentual', value: TipoCalculoPisCofins.Percentual },
    { label: 'Valor por unidade', value: TipoCalculoPisCofins.ValorPorUnidade }
];

export const municipioIncidenciaIssOptions: SelectOption<number>[] = [
    { label: 'Município do prestador', value: MunicipioIncidenciaIss.Prestador },
    { label: 'Município do tomador', value: MunicipioIncidenciaIss.Tomador }
];

/** Opções de chave de resolução: `null` é **curinga**, não "vazio". Ver comentário em `tributacao.types.ts`. */
export const comCuringa = <T>(options: SelectOption<T>[]): SelectOption<T | null>[] => [{ label: '(qualquer)', value: null }, ...options];

export const consumidorFinalCuringaOptions: SelectOption<boolean | null>[] = [
    { label: '(qualquer)', value: null },
    { label: 'Sim', value: true },
    { label: 'Não', value: false }
];

const labelDe = <T extends string | number>(options: SelectOption<T>[], value: T | null | undefined, fallback = '-') => {
    if (value === null || value === undefined) return fallback;
    return options.find((option) => option.value === value)?.label ?? String(value);
};

export const tipoOperacaoLabel = (value?: number | null) => labelDe(tipoOperacaoOptions, value ?? null);
export const regimeTributarioLabel = (value?: number | null) => labelDe(regimeTributarioOptions, value ?? null, '(qualquer)');
export const indicadorContribuinteLabel = (value?: number | null) => labelDe(indicadorContribuinteOptions, value ?? null, '(qualquer)');
export const tipoItemLabel = (value?: number | null) => labelDe(tipoItemSpedOptions, value ?? null);
export const municipioIncidenciaIssLabel = (value?: number | null) => labelDe(municipioIncidenciaIssOptions, value ?? null);

const tratamentoIcmsLabels: Record<number, string> = {
    [TratamentoIcmsProprio.Tributado]: 'Tributado',
    [TratamentoIcmsProprio.TributadoComReducao]: 'Tributado com redução de base',
    [TratamentoIcmsProprio.Isento]: 'Isento',
    [TratamentoIcmsProprio.Diferido]: 'Diferido',
    [TratamentoIcmsProprio.SubstituidoAnteriormente]: 'Substituído anteriormente',
    [TratamentoIcmsProprio.SimplesNacional]: 'Simples Nacional'
};

const tratamentoIpiLabels: Record<number, string> = {
    [TratamentoIpi.Tributado]: 'Tributado',
    [TratamentoIpi.TributadoComAliquotaZero]: 'Tributado com alíquota zero',
    [TratamentoIpi.Isento]: 'Isento',
    [TratamentoIpi.NaoTributado]: 'Não tributado',
    [TratamentoIpi.Imune]: 'Imune',
    [TratamentoIpi.Suspenso]: 'Suspenso'
};

const tratamentoPisCofinsLabels: Record<number, string> = {
    [TratamentoPisCofins.Tributado]: 'Tributado',
    [TratamentoPisCofins.Monofasico]: 'Monofásico',
    [TratamentoPisCofins.SubstituicaoTributaria]: 'Substituição tributária',
    [TratamentoPisCofins.AliquotaZero]: 'Alíquota zero',
    [TratamentoPisCofins.Isento]: 'Isento',
    [TratamentoPisCofins.SemIncidencia]: 'Sem incidência',
    [TratamentoPisCofins.Suspenso]: 'Suspenso',
    [TratamentoPisCofins.SemDireitoACredito]: 'Sem direito a crédito'
};

const situacaoRetencaoLabels: Record<number, string> = {
    [SituacaoRetencao.NaoAplicavel]: 'Não aplicável',
    [SituacaoRetencao.Dispensado]: 'Dispensado',
    [SituacaoRetencao.Retido]: 'Retido'
};

export const tratamentoIcmsLabel = (value?: number | null) => (value === null || value === undefined ? '-' : tratamentoIcmsLabels[value] ?? String(value));
export const tratamentoIpiLabel = (value?: number | null) => (value === null || value === undefined ? '-' : tratamentoIpiLabels[value] ?? String(value));
export const tratamentoPisCofinsLabel = (value?: number | null) => (value === null || value === undefined ? '-' : tratamentoPisCofinsLabels[value] ?? String(value));
export const situacaoRetencaoLabel = (value?: number | null) => (value === null || value === undefined ? '-' : situacaoRetencaoLabels[value] ?? String(value));

/**
 * `Dispensado` e `NaoAplicavel` explicam um zero que **não** foi calculado como zero devido. A tela precisa
 * mostrar o estado junto do número — número solto seria indistinguível de "retenção de R$ 0,00 apurada".
 */
export const situacaoRetencaoSeveridade = (value?: number | null): 'success' | 'info' | 'warning' => {
    if (value === SituacaoRetencao.Retido) return 'success';
    if (value === SituacaoRetencao.Dispensado) return 'warning';
    return 'info';
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const quantityFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 6 });

export const formatMoeda = (value?: number | null) => (typeof value === 'number' ? currencyFormatter.format(value) : '-');
export const formatPercentual = (value?: number | null) => (typeof value === 'number' ? `${percentFormatter.format(value)} %` : '-');
export const formatQuantidade = (value?: number | null) => (typeof value === 'number' ? quantityFormatter.format(value) : '-');

export const formatDataVigencia = (value?: string | null) => {
    if (!value) return '-';
    const [year, month, day] = value.slice(0, 10).split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
};

/** Rótulo de curinga na listagem de regras: campo nulo da chave vale para qualquer valor, não é "vazio". */
export const curingaLabel = (value?: string | null) => (value && value.trim() ? value : '(qualquer)');
