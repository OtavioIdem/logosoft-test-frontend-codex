import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { TipoCobranca } from '@/features/bancos/types/bancos.types';

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

export const criarBancoSchema = z.object({
    codigo: textRequired('Informe o código do banco.'),
    nome: textRequired('Informe o nome do banco.')
});

export const criarContaBancariaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    bancoId: requiredGuid('Banco'),
    agencia: textRequired('Informe a agência.'),
    agenciaDv: nullableText,
    conta: textRequired('Informe a conta.'),
    contaDv: nullableText
});

export const criarConvenioSchema = z.object({
    contaBancariaId: requiredGuid('Conta bancária'),
    numeroConvenio: textRequired('Informe o número do convênio.'),
    cedente: nullableText
});

export const criarCarteiraSchema = z.object({
    convenioBancarioId: requiredGuid('Convênio'),
    codigo: textRequired('Informe o código da carteira.'),
    tipoCobranca: z.nativeEnum(TipoCobranca)
});

export const gerarBoletoSchema = z.object({
    contaReceberId: requiredGuid('Conta a receber'),
    parcelaReceberId: requiredGuid('Parcela'),
    carteiraCobrancaId: requiredGuid('Carteira de cobrança'),
    numeroDocumento: nullableText
});

export const gerarRemessaSchema = z.object({
    carteiraCobrancaId: requiredGuid('Carteira de cobrança')
});

export const importarRetornoSchema = z.object({
    contaBancariaId: requiredGuid('Conta bancária'),
    nomeArquivo: textRequired('Selecione o arquivo de retorno.'),
    conteudo: textRequired('Conteúdo do arquivo vazio.')
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
