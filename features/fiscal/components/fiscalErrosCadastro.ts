// Mapa D50 (v1.11.0a8b58, F3.1; ampliado na v1.11.0a8b72, D101): erro de código -> cadastro que resolve. Indexado
// só pelo `Error.Code` (nunca por texto de mensagem, que muda com o parâmetro). Hoje fecham a série fiscal e a
// natureza de operação sem CFOP mapeado (`Fiscal.CfopSemMapeamentoParaAmbito`); as quatro `DestinatarioSem*`
// continuam fora até a `b74`.
//
// O link de `CfopSemMapeamentoParaAmbito` leva à LISTA de naturezas, sem `id`: a nota não expõe a natureza
// (`NotaFiscalResponse` sem `NaturezaOperacaoId`, NO-14, pergunta B-34).

import { NATUREZA_OPERACAO_LINK } from '@/features/fiscal/components/naturezasOperacaoLabels';
import { SERIE_FISCAL_NAO_CADASTRADA_PANEL } from '@/features/fiscal/components/seriesFiscaisLabels';
import { PermissionCode } from '@/types/erp';

export type FiscalErroCadastroLink = {
    /** rota do cadastro que resolve o erro. */
    href: string;
    /** qualquer uma habilita o link -- sem nenhuma, o painel mostra o texto sem link (AC-16). */
    anyOf: PermissionCode[];
    /** título do painel (o texto do backend segue visível junto). */
    titulo: string;
    /** rótulo do link, só para quem tem alguma das permissões de `anyOf`. */
    rotuloLink: string;
    /** texto no lugar do link quando a sessão não tem nenhuma das permissões: nunca orienta a digitar ID. */
    semPermissaoTexto: string;
};

export const FISCAL_ERRO_CADASTRO_SERIE_CODE = 'Fiscal.SerieFiscalNaoCadastradaParaContexto';
export const FISCAL_ERRO_CADASTRO_CFOP_CODE = 'Fiscal.CfopSemMapeamentoParaAmbito';

export const fiscalErrosCadastroMap: Record<string, FiscalErroCadastroLink> = {
    [FISCAL_ERRO_CADASTRO_SERIE_CODE]: {
        href: '/fiscal/series',
        anyOf: ['FISCAL_SERIES_CONSULTAR', 'FISCAL_SERIES_GERENCIAR'],
        titulo: SERIE_FISCAL_NAO_CADASTRADA_PANEL.titulo,
        rotuloLink: SERIE_FISCAL_NAO_CADASTRADA_PANEL.linkCadastrarSerie,
        semPermissaoTexto: SERIE_FISCAL_NAO_CADASTRADA_PANEL.semPermissaoTexto
    },
    [FISCAL_ERRO_CADASTRO_CFOP_CODE]: {
        href: '/fiscal/naturezas-operacao',
        anyOf: ['FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'],
        titulo: NATUREZA_OPERACAO_LINK.tituloCfopSemMapeamento,
        rotuloLink: NATUREZA_OPERACAO_LINK.cadastrar,
        semPermissaoTexto: NATUREZA_OPERACAO_LINK.semPermissaoTexto
    }
};

export const resolveFiscalErroCadastroLink = (code?: string | null): FiscalErroCadastroLink | null => (code && fiscalErrosCadastroMap[code] ? fiscalErrosCadastroMap[code] : null);
