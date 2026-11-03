// Schemas Zod das buscas de NCM e CFOP (v1.11.0a8b72, D99, D51 item 4). Só RESPOSTA, e SEM `.strict()`: o
// backend entrega 12 campos de CFOP e o select lê 6; campo aditivo não pode quebrar a busca.

import { z } from 'zod';

export const ncmResumoResponseSchema = z.object({
    id: z.string(),
    codigo: z.string(),
    descricao: z.string(),
    ativo: z.boolean()
});

export const cestResumoResponseSchema = z.object({
    id: z.string(),
    codigo: z.string(),
    descricao: z.string(),
    segmento: z.string().nullish(),
    ativo: z.boolean()
});

export const ncmCestVinculoResponseSchema = z.object({
    id: z.string(),
    ncmId: z.string(),
    ncmCodigo: z.string(),
    cestId: z.string(),
    cestCodigo: z.string(),
    ativo: z.boolean()
});

export const origemMercadoriaResponseSchema = z.object({
    id: z.string(),
    codigo: z.string(),
    descricao: z.string(),
    ehEstrangeira: z.boolean().optional(),
    ativo: z.boolean(),
    motivoInativacao: z.string().nullish()
});

export const cfopResumoResponseSchema = z.object({
    id: z.string(),
    codigo: z.string(),
    descricao: z.string(),
    tipo: z.number(),
    ambito: z.number(),
    ativo: z.boolean()
});

const pagedSchema = <T extends z.ZodTypeAny>(item: T) =>
    z.object({
        items: z.array(item),
        page: z.number(),
        pageSize: z.number(),
        totalItems: z.number(),
        totalPages: z.number()
    });

export const ncmResumoPagedSchema = pagedSchema(ncmResumoResponseSchema);
export const cfopResumoPagedSchema = pagedSchema(cfopResumoResponseSchema);
export const cestResumoPagedSchema = pagedSchema(cestResumoResponseSchema);
export const ncmCestVinculoPagedSchema = pagedSchema(ncmCestVinculoResponseSchema);
export const origemMercadoriaPagedSchema = pagedSchema(origemMercadoriaResponseSchema);

// Sugestão por GTIN (v1.11.0a8b80, D110). Só RESPOSTA e SEM `.strict()`: campo aditivo do backend não pode quebrar o painel.
export const gtinClassificacaoItemSchema = z.object({
    anexo: z.string(),
    itemAnexo: z.string(),
    descricaoItemAnexo: z.string().nullish(),
    ncmCodigo: z.string(),
    descricao: z.string().nullish(),
    cstIbsCbs: z.string(),
    classificacaoTributaria: z.string(),
    percentualReducaoIbs: z.number(),
    percentualReducaoCbs: z.number(),
    vigenciaInicio: z.string(),
    vigenciaFim: z.string().nullish(),
    alternativas: z.string().nullish()
});

export const gtinClassificacaoResponseSchema = z.object({
    gtin: z.string(),
    encontrado: z.boolean(),
    classificacao: gtinClassificacaoItemSchema.nullable()
});
