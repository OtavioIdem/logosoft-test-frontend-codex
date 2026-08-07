import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().trim().email('Informe um e-mail válido.'),
    senha: z.string().min(1, 'Informe a senha.')
});

export type LoginFormValues = z.infer<typeof loginSchema>;
