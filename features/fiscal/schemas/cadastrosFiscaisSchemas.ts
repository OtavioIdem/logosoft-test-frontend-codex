// Schemas Zod das buscas de NCM e CFOP (v1.11.0a8b72, D99, D51 item 4). Só RESPOSTA, e SEM `.strict()`: o
// backend entrega 12 campos de CFOP e o select lê 6; campo aditivo não pode quebrar a busca.

import { z } from 'zod';

export const ncmResumoResponseSchema = z.object({
    id: z.string(),
    codigo: z.string(),
    descricao: z.string(),
    ativo: z.boolean()
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
