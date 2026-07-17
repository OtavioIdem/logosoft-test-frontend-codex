import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { MeioPagamento } from '@/features/pdv/types/pdv.types';

const requiredGuid = (label: string) => z.string().trim().refine(isValidGuid, `${label} deve ser selecionado corretamente.`);
const optionalGuid = z
    .union([z.string().trim().refine((value) => value === '' || isValidGuid(value), 'Selecione um registro válido.'), z.null(), z.undefined()])
    .transform((value) => (typeof value === 'string' && value.trim() === '' ? null : value ?? null));
const textRequired = (message: string) => z.string().trim().min(1, message);
const money = (label: string) => z.coerce.number({ invalid_type_error: `${label} deve ser numérico.` }).min(0, `${label} não pode ser negativo.`);
const quantidade = z.coerce.number({ invalid_type_error: 'Quantidade deve ser numérica.' }).positive('Quantidade deve ser maior que zero.');

export const abrirCaixaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    codigo: textRequired('Informe o código do caixa.'),
    terminal: textRequired('Informe o terminal.'),
    valorAbertura: money('Valor de abertura')
});

export const movimentoCaixaSchema = z.object({
    valor: z.coerce.number({ invalid_type_error: 'Valor deve ser numérico.' }).positive('Valor deve ser maior que zero.'),
    descricao: textRequired('Informe a descrição.')
});

export const fecharCaixaSchema = z.object({
    valorInformado: money('Valor informado')
});

export const itemVendaPdvSchema = z.object({
    produtoId: requiredGuid('Produto'),
    quantidade,
    valorUnitario: money('Valor unitário'),
    valorDesconto: money('Desconto')
});

export const pagamentoVendaPdvSchema = z.object({
    formaPagamentoId: requiredGuid('Forma de pagamento'),
    meio: z.nativeEnum(MeioPagamento),
    valor: z.coerce.number({ invalid_type_error: 'Valor deve ser numérico.' }).positive('Valor deve ser maior que zero.')
});

export const registrarVendaPdvSchema = z.object({
    caixaId: requiredGuid('Caixa'),
    localEstoqueId: requiredGuid('Local de estoque'),
    clienteId: optionalGuid,
    itens: z.array(itemVendaPdvSchema).min(1, 'Inclua ao menos um item.'),
    pagamentos: z.array(pagamentoVendaPdvSchema).min(1, 'Inclua ao menos um pagamento.')
});
