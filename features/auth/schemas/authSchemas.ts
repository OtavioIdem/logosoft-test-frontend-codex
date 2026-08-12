import { z } from 'zod';

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const authGuidSchema = z.string().trim().regex(guidPattern, 'Identificador de autenticação inválido.');

export const permissionCodeSchema = z.string().trim().min(1, 'Permissão inválida.');

export const meResponseSchema = z.object({
    usuarioId: authGuidSchema,
    nome: z.string().trim().min(1),
    email: z.string().trim().email(),
    empresaId: authGuidSchema,
    filialId: authGuidSchema.nullable(),
    isMaster: z.boolean(),
    permissoes: z.array(permissionCodeSchema)
});

export type MeResponse = z.infer<typeof meResponseSchema>;
