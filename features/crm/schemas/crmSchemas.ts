import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { TipoPedidoVenda } from '@/types/erp';
import { EstagioOportunidade, MotivoPerdaOportunidade, OrigemLead } from '@/features/crm/types/crm.types';

const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado corretamente.`);
const optionalGuid = z
    .union([z.string().trim().refine((value) => value === '' || isValidGuid(value), 'Selecione um registro válido.'), z.null(), z.undefined()])
    .transform((value) => (typeof value === 'string' && value.trim() === '' ? null : value ?? null));
const textRequired = (message: string) => z.string().trim().min(1, message);
const nullableText = z.union([z.string(), z.null(), z.undefined()]).transform((value) => {
    if (value === null || value === undefined) return null;
    const normalized = value.trim();
    return normalized.length ? normalized : null;
});
const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).min(0, `${label} não pode ser negativo.`);
const positive = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).positive(`${label} deve ser maior que zero.`);
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));

export const criarLeadSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    nome: textRequired('Informe o nome.'),
    empresa: nullableText,
    email: nullableText,
    telefone: nullableText,
    origem: z.nativeEnum(OrigemLead),
    responsavelId: optionalGuid
});

export const qualificarLeadSchema = z.object({
    clienteId: requiredGuid('Cliente'),
    titulo: textRequired('Informe o título da oportunidade.'),
    valorEstimado: money('Valor estimado'),
    responsavelId: optionalGuid,
    dataPrevisaoFechamento: optionalDate
});

export const moverEstagioSchema = z.object({ estagio: z.nativeEnum(EstagioOportunidade) });

export const perderOportunidadeSchema = z.object({
    motivo: z.nativeEnum(MotivoPerdaOportunidade),
    justificativa: textRequired('Informe a justificativa.')
});

export const converterOportunidadeSchema = z.object({
    numeroPedido: textRequired('Informe o número do pedido.'),
    tipo: z.nativeEnum(TipoPedidoVenda),
    dataEmissao: optionalDate,
    dataPrevisaoEntrega: optionalDate,
    observacao: nullableText
});

export const itemPropostaSchema = z.object({
    produtoId: requiredGuid('Produto'),
    quantidade: positive('Quantidade'),
    valorUnitario: money('Valor unitário'),
    valorDesconto: money('Desconto'),
    observacao: nullableText
});

export const criarPropostaSchema = z.object({
    oportunidadeId: requiredGuid('Oportunidade'),
    dataValidade: optionalDate,
    observacao: nullableText,
    itens: z.array(itemPropostaSchema).min(1, 'Adicione ao menos um item.')
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
export const ganharOportunidadeSchema = z.object({ propostaVencedoraId: optionalGuid });
