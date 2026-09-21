// Mapa D50 (v1.11.0a8b58, F3.1): erro de código -> cadastro que resolve. Indexado só pelo `Error.Code`
// (nunca por texto de mensagem, que muda com o parâmetro) -- hoje só a série fiscal fecha; os demais
// (`Fiscal.SerieNotaFiscalInvalidaParaNumeracao`, `Fiscal.CfopSemMapeamentoParaAmbito`, as quatro
// `DestinatarioSem*`) continuam fora até a `b61` (D53).

import { PermissionCode } from '@/types/erp';

export type FiscalErroCadastroLink = {
    /** rota do cadastro que resolve o erro. */
    href: string;
    /** qualquer uma habilita o link -- sem nenhuma, o painel mostra o texto sem link (AC-16). */
    anyOf: PermissionCode[];
};

export const FISCAL_ERRO_CADASTRO_SERIE_CODE = 'Fiscal.SerieFiscalNaoCadastradaParaContexto';

export const fiscalErrosCadastroMap: Record<string, FiscalErroCadastroLink> = {
    [FISCAL_ERRO_CADASTRO_SERIE_CODE]: { href: '/fiscal/series', anyOf: ['FISCAL_SERIES_CONSULTAR', 'FISCAL_SERIES_GERENCIAR'] }
};

export const resolveFiscalErroCadastroLink = (code?: string | null): FiscalErroCadastroLink | null => (code && fiscalErrosCadastroMap[code] ? fiscalErrosCadastroMap[code] : null);
