// Tipos das buscas de NCM e CFOP dos selects (v1.11.0a8b72, D99). Antes moravam em `features/tributacao`;
// a D47 item 3 manda ficarem em `features/fiscal`, e Tributação importa daqui.
// Origem: `CadastrosFiscaisController.cs:165-180` e `CadastrosFiscaisResponses.cs:121-133` (`../New project 3/src`).

import { Guid } from '@/types/erp';

/** `NcmResponse` reduzido ao que os selects leem (o backend entrega mais campos; o schema não é estrito). */
export type NcmResumoResponse = {
    id: Guid;
    codigo: string;
    descricao: string;
    ativo: boolean;
};

/**
 * `CfopResponse` (`CadastrosFiscaisResponses.cs:121-133`, 12 campos), reduzido ao que os selects leem.
 * `tipo` é `TipoCfop` (1 Entrada, 2 Saída) e `ambito` é `AmbitoCfop` (1 Interno, 2 Interestadual, 3 Exterior),
 * ambos numéricos na API (NO-11).
 */
export type CfopResumoResponse = {
    id: Guid;
    codigo: string;
    descricao: string;
    tipo: number;
    ambito: number;
    ativo: boolean;
};

/**
 * Filtros da busca de CFOP: `ambito` e `tipo` são aceitos pelo endpoint (`CadastrosFiscaisController.cs:170-171`).
 * São guia de busca: o backend não impõe o tipo do CFOP contra a natureza (B-32).
 */
export type CfopBuscaFiltros = {
    ambito?: number | null;
    tipo?: number | null;
};
