// Mapa D50 (v1.11.0a8b58, F3.1; ampliado na v1.11.0a8b72, D101 e na v1.11.0a8b75, D104): erro de código -> cadastro que
// resolve. Indexado só pelo `Error.Code` (nunca por texto de mensagem, que muda com o parâmetro). Fecham a série fiscal,
// a natureza de operação sem CFOP mapeado (`Fiscal.CfopSemMapeamentoParaAmbito`) e, desde a `b75`, as quatro
// `Fiscal.DestinatarioSem*` que o cadastro de Pessoas resolve (endereço fiscal, endereço principal, município IBGE e
// indicador de contribuinte do ICMS). `DestinatarioSemPessoaVinculada` não é alcançável e fica de fora.
//
// O link de `CfopSemMapeamentoParaAmbito` leva à LISTA de naturezas, sem `id`: a nota não expõe a natureza
// (`NotaFiscalResponse` sem `NaturezaOperacaoId`, NO-14, pergunta B-34). Os das `DestinatarioSem*` levam à LISTA de
// Pessoas (`/pessoas`), sem id: a Pessoa não abre por id (B-38) e o id só viria do texto da mensagem, que a D50 proíbe.
// Só `PESSOAS_GERENCIAR` vê o link, porque só esse perfil abre o diálogo de edição.

import { NATUREZA_OPERACAO_LINK } from '@/features/fiscal/components/naturezasOperacaoLabels';
import { SERIE_FISCAL_NAO_CADASTRADA_PANEL } from '@/features/fiscal/components/seriesFiscaisLabels';
import {
    FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_FISCAL_CODE,
    FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_PRINCIPAL_CODE,
    FISCAL_ERRO_DESTINATARIO_SEM_INDICADOR_ICMS_CODE,
    FISCAL_ERRO_DESTINATARIO_SEM_MUNICIPIO_IBGE_CODE,
    PESSOA_DESTINATARIO_LINK
} from '@/features/pessoas/components/pessoaFiscalLabels';
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
    },
    [FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_FISCAL_CODE]: {
        href: '/pessoas',
        anyOf: ['PESSOAS_GERENCIAR'],
        titulo: PESSOA_DESTINATARIO_LINK.porCodigo[FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_FISCAL_CODE].titulo,
        rotuloLink: PESSOA_DESTINATARIO_LINK.rotuloLink,
        semPermissaoTexto: PESSOA_DESTINATARIO_LINK.semPermissaoTexto
    },
    [FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_PRINCIPAL_CODE]: {
        href: '/pessoas',
        anyOf: ['PESSOAS_GERENCIAR'],
        titulo: PESSOA_DESTINATARIO_LINK.porCodigo[FISCAL_ERRO_DESTINATARIO_SEM_ENDERECO_PRINCIPAL_CODE].titulo,
        rotuloLink: PESSOA_DESTINATARIO_LINK.rotuloLink,
        semPermissaoTexto: PESSOA_DESTINATARIO_LINK.semPermissaoTexto
    },
    [FISCAL_ERRO_DESTINATARIO_SEM_MUNICIPIO_IBGE_CODE]: {
        href: '/pessoas',
        anyOf: ['PESSOAS_GERENCIAR'],
        titulo: PESSOA_DESTINATARIO_LINK.porCodigo[FISCAL_ERRO_DESTINATARIO_SEM_MUNICIPIO_IBGE_CODE].titulo,
        rotuloLink: PESSOA_DESTINATARIO_LINK.rotuloLink,
        semPermissaoTexto: PESSOA_DESTINATARIO_LINK.semPermissaoTexto
    },
    [FISCAL_ERRO_DESTINATARIO_SEM_INDICADOR_ICMS_CODE]: {
        href: '/pessoas',
        anyOf: ['PESSOAS_GERENCIAR'],
        titulo: PESSOA_DESTINATARIO_LINK.porCodigo[FISCAL_ERRO_DESTINATARIO_SEM_INDICADOR_ICMS_CODE].titulo,
        rotuloLink: PESSOA_DESTINATARIO_LINK.rotuloLink,
        semPermissaoTexto: PESSOA_DESTINATARIO_LINK.semPermissaoTexto
    }
};

export const resolveFiscalErroCadastroLink = (code?: string | null): FiscalErroCadastroLink | null => (code && fiscalErrosCadastroMap[code] ? fiscalErrosCadastroMap[code] : null);
