// Funções puras da aba "Dados fiscais" (v1.11.0a8b75, D104). Sem React: o que o componente decide a partir do registro.

import { PessoaFiscalFormValues, PessoaResponse } from '@/features/pessoas/types/pessoas.types';

/**
 * As 8 chaves do bloco fiscal que a aba CARREGA do registro (as 6 editáveis, mais `municipioIbgeId` e `paisId`, que a
 * tela não edita mas precisa conhecer). O backend sempre as devolve, nulas incluídas (`PessoaResponse.cs:17-28`).
 */
const CHAVES_FISCAIS_DO_REGISTRO = ['indicadorContribuinteIcms', 'inscricaoEstadualSt', 'suframa', 'regimeTributarioParceiro', 'municipioIbgeId', 'paisId', 'contribuinteIpi', 'tomadorOrgaoPublico'] as const;

/**
 * PF-1: o PATCH substitui o bloco inteiro. Se alguma chave fiscal NÃO veio no registro (`undefined`, diferente de `null`),
 * a tela não sabe o que está gravado: enviar os 8 campos apagaria o bloco. Registro assim não é gravável.
 */
export const registroTemDadosFiscais = (record: PessoaResponse): boolean => CHAVES_FISCAIS_DO_REGISTRO.every((chave) => record[chave] !== undefined);

/**
 * Emenda da D104: `PessoaResponse` devolve `municipioIbgeId`/`paisId` como Guid, o PATCH recebe CÓDIGOS, e nenhuma busca
 * filtra por Id (B-44). A tela não consegue reenviá-los; com qualquer um preenchido, salvar os apagaria.
 */
export const municipioOuPaisPreenchido = (record: PessoaResponse): boolean => Boolean(record.municipioIbgeId) || Boolean(record.paisId);

/** Valores iniciais da aba, carregados do registro (PF-1: o que não é editado volta como estava). */
export const fiscalFormFromRecord = (record: PessoaResponse): PessoaFiscalFormValues => ({
    indicadorContribuinteIcms: record.indicadorContribuinteIcms ?? null,
    inscricaoEstadualSt: record.inscricaoEstadualSt ?? '',
    suframa: record.suframa ?? '',
    regimeTributarioParceiro: record.regimeTributarioParceiro ?? null,
    contribuinteIpi: record.contribuinteIpi ?? null,
    tomadorOrgaoPublico: record.tomadorOrgaoPublico ?? null
});

export const fiscalFormAlterado = (atual: PessoaFiscalFormValues, base: PessoaFiscalFormValues): boolean =>
    atual.indicadorContribuinteIcms !== base.indicadorContribuinteIcms ||
    atual.inscricaoEstadualSt.trim() !== base.inscricaoEstadualSt.trim() ||
    atual.suframa.trim() !== base.suframa.trim() ||
    atual.regimeTributarioParceiro !== base.regimeTributarioParceiro ||
    atual.contribuinteIpi !== base.contribuinteIpi ||
    atual.tomadorOrgaoPublico !== base.tomadorOrgaoPublico;

/**
 * Os 8 campos do request. `municipioIbgeCodigo` e `paisCodigoBacen` vão nulos: só é chamado quando o registro também os
 * tem nulos (`municipioOuPaisPreenchido` bloqueia o resto). O schema do request valida e normaliza.
 */
export const montarDadosFiscaisRequest = (values: PessoaFiscalFormValues) => ({
    indicadorContribuinteIcms: values.indicadorContribuinteIcms,
    inscricaoEstadualSt: values.inscricaoEstadualSt,
    suframa: values.suframa,
    regimeTributarioParceiro: values.regimeTributarioParceiro,
    municipioIbgeCodigo: null,
    paisCodigoBacen: null,
    contribuinteIpi: values.contribuinteIpi,
    tomadorOrgaoPublico: values.tomadorOrgaoPublico
});

/** Tudo em branco: o servidor limpa o bloco (`PessoaDadosFiscaisResolver.cs:31-36`). */
export const fiscalFormEstaEmBranco = (values: PessoaFiscalFormValues): boolean =>
    values.indicadorContribuinteIcms === null && !values.inscricaoEstadualSt.trim() && !values.suframa.trim() && values.regimeTributarioParceiro === null && values.contribuinteIpi === null && values.tomadorOrgaoPublico === null;
