// Lógica da tela de naturezas de operação (v1.11.0a8b72, D98): grade de CFOP (âmbito × tipo de item), chave
// repetida, filtro de tipo do CFOP e conversão resposta -> formulário. Sem rótulo aqui (rótulos vivem em
// `naturezasOperacaoLabels.ts`) e sem chamada HTTP.

import { chaveMapeamentoCfop } from '@/features/fiscal/schemas/naturezasOperacaoSchemas';
import { AMBITO_CFOP_OPTIONS, TIPO_ITEM_CFOP_OPTIONS } from '@/features/fiscal/components/naturezasOperacaoLabels';
import { MapeamentoCfopRequest, NaturezaOperacaoResponse } from '@/features/fiscal/types/naturezasOperacao.types';

/** `TipoOperacaoFiscal` (`EnumsFiscal.cs:15-16`): Venda = 1, Compra = 2. */
const TIPO_OPERACAO_VENDA = 1;
const TIPO_OPERACAO_COMPRA = 2;
/** `TipoCfop` (`EnumsCadastrosFiscais.cs:28-29`): Entrada = 1, Saída = 2. */
const TIPO_CFOP_ENTRADA = 1;
const TIPO_CFOP_SAIDA = 2;

/**
 * Emenda da D98: a busca de CFOP da grade filtra o tipo só quando a operação deixa claro o lado. Venda -> Saída e
 * Compra -> Entrada; os outros 7 valores (devolução, remessa, transferência, bonificação, serviço, transporte,
 * outro) existem dos dois lados e NÃO filtram. Filtro errado esconde o CFOP certo; filtro ausente só mostra mais
 * opções. É guia de busca: o backend não impõe o tipo (B-32).
 */
export const tipoCfopDaOperacao = (tipoOperacao?: number | null): number | undefined => {
    if (tipoOperacao === TIPO_OPERACAO_VENDA) return TIPO_CFOP_SAIDA;
    if (tipoOperacao === TIPO_OPERACAO_COMPRA) return TIPO_CFOP_ENTRADA;
    return undefined;
};

/** Linha da grade no formulário. `chave` é só a identidade React da linha; não vai para o backend. */
export type LinhaMapeamentoCfop = {
    chave: string;
    ambito: number;
    tipoItem: number | null;
    cfopId: string | null;
    cfopCodigo: string | null;
};

let contadorLinha = 0;
export const novaChaveLinha = () => {
    contadorLinha += 1;
    return `linha-${contadorLinha}`;
};

/** Resposta -> linhas: carrega TODOS os mapeamentos, inclusive `tipoItem` nulo, para o PUT reenviar a lista inteira. */
export const linhasDaNatureza = (natureza?: NaturezaOperacaoResponse | null): LinhaMapeamentoCfop[] =>
    (natureza?.cfops ?? []).map((item) => ({ chave: novaChaveLinha(), ambito: item.ambito, tipoItem: item.tipoItem ?? null, cfopId: item.cfopId, cfopCodigo: item.cfopCodigo }));

/** Linhas -> `MapeamentoCfopRequest[]`: o CFOP vai pelo CÓDIGO; `tipoItem` nulo vai como `null`. */
export const cfopsDasLinhas = (linhas: LinhaMapeamentoCfop[]): MapeamentoCfopRequest[] => linhas.map((linha) => ({ ambito: linha.ambito, cfopCodigo: linha.cfopCodigo ?? '', tipoItem: linha.tipoItem }));

/** Chaves `(âmbito, tipoItem)` que aparecem em mais de uma linha. */
export const chavesRepetidas = (linhas: LinhaMapeamentoCfop[]): Set<string> => {
    const contagem = new Map<string, number>();
    linhas.forEach((linha) => contagem.set(chaveMapeamentoCfop(linha), (contagem.get(chaveMapeamentoCfop(linha)) ?? 0) + 1));
    return new Set(Array.from(contagem.entries()).filter(([, total]) => total > 1).map(([chave]) => chave));
};

/** Chave da linha repetida? Marca as DUAS (ou mais) linhas que colidem. */
export const linhaRepetida = (linha: LinhaMapeamentoCfop, repetidas: Set<string>) => repetidas.has(chaveMapeamentoCfop(linha));

/** Primeira combinação âmbito × tipo de item ainda livre, para a linha nova não nascer repetida. */
export const proximaCombinacaoLivre = (linhas: LinhaMapeamentoCfop[]): { ambito: number; tipoItem: number | null } => {
    const usadas = new Set(linhas.map(chaveMapeamentoCfop));
    const tipos = TIPO_ITEM_CFOP_OPTIONS.map((option) => option.value);
    for (const tipoItem of tipos) {
        for (const ambito of AMBITO_CFOP_OPTIONS.map((option) => option.value)) {
            if (!usadas.has(chaveMapeamentoCfop({ ambito, tipoItem }))) return { ambito, tipoItem };
        }
    }
    return { ambito: AMBITO_CFOP_OPTIONS[0].value, tipoItem: null };
};
