import { z } from 'zod';
import { createResourceSchema } from '@/features/shared/schemas/createResourceSchema';
import { getResourceDefinition } from '@/features/shared/config/erpFeatureCatalog';
import { isValidGuid } from '@/lib/http/requestUtils';

export const usuariosSchema = createResourceSchema(getResourceDefinition('seguranca-usuarios'));
export const gruposSchema = createResourceSchema(getResourceDefinition('seguranca-grupos'));

const optionalGuidSchema = z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || isValidGuid(value), 'Selecione uma opção válida ou deixe em branco.');

export const criarUsuarioSegurancaSchema = z.object({
    nome: z.string().trim().min(3, 'Informe o nome com pelo menos 3 caracteres.'),
    email: z.string().trim().email('Informe um e-mail válido.'),
    login: z.string().trim().optional().nullable(),
    senha: z.string().min(8, 'Informe uma senha com pelo menos 8 caracteres.'),
    empresaId: z.string().refine((value) => isValidGuid(value), 'Selecione uma empresa válida.'),
    filialId: optionalGuidSchema,
    gruposAcessoIds: z.array(z.string().refine((value) => isValidGuid(value), 'Grupo de acesso inválido.')).optional()
});

export const motivoSegurancaSchema = z.object({
    motivo: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.')
});

export const resetSenhaUsuarioSchema = z
    .object({
        novaSenha: z.string().min(8, 'Informe uma senha com pelo menos 8 caracteres.'),
        confirmarSenha: z.string().min(8, 'Confirme a senha.'),
        motivo: z.string().trim().min(5, 'Informe o motivo da troca de senha.')
    })
    .refine((values) => values.novaSenha === values.confirmarSenha, { path: ['confirmarSenha'], message: 'A confirmação deve ser igual à nova senha.' });

export const vincularGrupoUsuarioSchema = z.object({
    grupoAcessoId: z.string().refine((value) => isValidGuid(value), 'Selecione um grupo de acesso válido.'),
    motivo: z.string().trim().min(5, 'Informe o motivo do vínculo.')
});

const origemPermissaoEfetivaSchema = z.object({
    escopo: z.union([z.literal(1), z.literal(2)]).catch(1),
    cargoAcessoId: z.string(),
    grupoAcessoId: z.string(),
    permissionCode: z.string(),
    permitido: z.boolean().catch(true)
});

// Schema de leitura: tolerante de propósito. O backend pode omitir `origens` — nesse caso a tela
// mostra o estado "origem indisponível" em vez de quebrar.
export const permissoesEfetivasUsuarioSchema = z.object({
    usuarioId: z.string(),
    empresaId: z.string(),
    filialId: z.string().nullable().optional().transform((value) => value ?? null),
    permissoes: z.array(z.string()).optional().transform((value) => value ?? []),
    origens: z.array(origemPermissaoEfetivaSchema).optional().transform((value) => value ?? [])
});

export const grupoAcessoSchema = z.object({
    empresaId: z.string().refine((value) => isValidGuid(value), 'Selecione uma empresa válida.'),
    filialId: optionalGuidSchema,
    nome: z.string().trim().min(3, 'Informe o nome do grupo com pelo menos 3 caracteres.'),
    descricao: z.string().trim().optional().nullable(),
    permissoes: z.array(z.string()).min(1, 'Selecione ao menos uma permissão.')
});
