// Schema Zod do combo de modelo de documento fiscal (v1.11.0a8b58, F3.5 -- só combo, D53). Cadastro
// global, só leitura nesta fatia: nenhum request de escrita, então nenhum schema `.strict()` de request.

import { z } from 'zod';

// Resposta: sem `.strict()` -- campo aditivo do backend não pode quebrar a tela.
export const modeloDocumentoFiscalResponseSchema = z.object({
    id: z.string(),
    codigo: z.string(),
    descricao: z.string(),
    sigla: z.string(),
    ativo: z.boolean(),
    motivoInativacao: z.string().nullable().optional()
});
