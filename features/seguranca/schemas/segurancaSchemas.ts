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

export const grupoAcessoSchema = z.object({
    nome: z.string().trim().min(3, 'Informe o nome do grupo com pelo menos 3 caracteres.'),
    descricao: z.string().trim().optional().nullable(),
    permissoesTexto: z.string().trim().min(3, 'Informe ao menos uma permissão.')
});
