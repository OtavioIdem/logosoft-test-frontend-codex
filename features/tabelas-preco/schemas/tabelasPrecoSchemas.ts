import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';

const optionalGuidSchema = z.string().optional().nullable().refine((value) => !value || isValidGuid(value), 'Selecione uma opção válida ou deixe em branco.');
const dateSchema = z.date({ required_error: 'Informe uma data válida.' });

export const tabelaPrecoSchema = z.object({
    empresaId: z.string().refine((value) => isValidGuid(value), 'Selecione uma empresa válida.'),
    filialId: optionalGuidSchema,
    nome: z.string().trim().min(3, 'Informe o nome da tabela.'),
    dataInicioVigencia: dateSchema,
    dataFimVigencia: z.date().optional().nullable(),
    padrao: z.boolean()
}).refine((values) => !values.dataFimVigencia || values.dataFimVigencia >= values.dataInicioVigencia, { path: ['dataFimVigencia'], message: 'A data final não pode ser anterior à data inicial.' });

export const tabelaPrecoItemSchema = z.object({
    produtoId: z.string().refine((value) => isValidGuid(value), 'Selecione um produto válido.'),
    precoVenda: z.number({ required_error: 'Informe o preço de venda.' }).positive('O preço de venda deve ser maior que zero.'),
    precoMinimo: z.number({ required_error: 'Informe o preço mínimo.' }).nonnegative('O preço mínimo não pode ser negativo.'),
    margemPercentual: z.number({ required_error: 'Informe a margem.' }).min(0, 'A margem não pode ser negativa.').max(1000, 'Margem muito alta.')
}).refine((values) => values.precoMinimo <= values.precoVenda, { path: ['precoMinimo'], message: 'O preço mínimo não pode ser maior que o preço de venda.' });

export const tabelaPrecoMotivoSchema = z.object({ motivo: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.') });
