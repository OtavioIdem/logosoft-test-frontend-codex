// Schemas Zod do combo de natureza de operação (v1.11.0a8b71, D91). Só leitura: `.strict()` fica na query
// (montada pelo próprio frontend) e nunca na resposta -- campo aditivo do backend não pode quebrar a tela.

import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';

export const NATUREZAS_OPERACAO_TAMANHO_PAGINA_MAXIMO = 200;

export const naturezaOperacaoListQuerySchema = z
    .object({
        empresaId: z.string().trim().refine(isValidGuid, 'Selecione uma empresa válida.'),
        termo: z.string().trim().max(100).nullable().optional(),
        pagina: z.number().int().positive().default(1),
        tamanhoPagina: z.number().int().positive().max(NATUREZAS_OPERACAO_TAMANHO_PAGINA_MAXIMO).default(NATUREZAS_OPERACAO_TAMANHO_PAGINA_MAXIMO)
    })
    .strict();

// Resposta: sem `.strict()`. O record tem 15 campos (`NaturezaOperacaoContracts.cs:53-68`); o combo lê 6.
export const naturezaOperacaoResponseSchema = z.object({
    id: z.string(),
    empresaId: z.string(),
    filialId: z.string().nullable().optional(),
    codigo: z.string(),
    descricao: z.string(),
    ativa: z.boolean()
});
