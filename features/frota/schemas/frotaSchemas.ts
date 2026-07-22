import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { StatusVeiculo, TipoCombustivel, TipoDespesaVeiculo, TipoDocumentoVeiculo, TipoManutencao, TipoVeiculo } from '@/features/frota/types/frota.types';

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
const optionalNumber = z.union([z.coerce.number(), z.null(), z.undefined()]).transform((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
const optionalDate = z.union([z.date(), z.null(), z.undefined()]).transform((value) => (value instanceof Date ? value.toISOString() : null));
const requiredDate = (message: string) => z.union([z.date(), z.null(), z.undefined()]).refine((value) => value instanceof Date, message).transform((value) => (value as Date).toISOString());

export const criarVeiculoSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    placa: textRequired('Informe a placa.'),
    modelo: textRequired('Informe o modelo.'),
    marca: nullableText,
    ano: optionalNumber,
    tipo: z.nativeEnum(TipoVeiculo),
    combustivel: z.nativeEnum(TipoCombustivel),
    odometroInicial: money('Odômetro inicial'),
    renavam: nullableText
});

export const atualizarVeiculoSchema = z.object({
    modelo: textRequired('Informe o modelo.'),
    marca: nullableText,
    ano: optionalNumber,
    renavam: nullableText
});

export const alterarStatusVeiculoSchema = z.object({ status: z.nativeEnum(StatusVeiculo) });

export const registrarAbastecimentoSchema = z.object({
    veiculoId: requiredGuid('Veículo'),
    motoristaId: optionalGuid,
    data: optionalDate,
    odometro: money('Odômetro'),
    litros: positive('Litros'),
    valorLitro: positive('Valor por litro'),
    combustivel: z.nativeEnum(TipoCombustivel),
    tanqueCheio: z.boolean(),
    posto: nullableText
});

export const registrarManutencaoSchema = z.object({
    veiculoId: requiredGuid('Veículo'),
    tipo: z.nativeEnum(TipoManutencao),
    descricao: textRequired('Informe a descrição.'),
    fornecedorId: optionalGuid,
    data: optionalDate,
    odometro: optionalNumber,
    valor: money('Valor')
});

export const registrarDespesaVeiculoSchema = z.object({
    veiculoId: requiredGuid('Veículo'),
    tipo: z.nativeEnum(TipoDespesaVeiculo),
    descricao: textRequired('Informe a descrição.'),
    fornecedorId: optionalGuid,
    data: optionalDate,
    valor: money('Valor')
});

export const registrarDocumentoVeiculoSchema = z.object({
    veiculoId: requiredGuid('Veículo'),
    tipo: z.nativeEnum(TipoDocumentoVeiculo),
    numero: nullableText,
    orgaoEmissor: nullableText,
    dataEmissao: optionalDate,
    dataValidade: requiredDate('Informe a data de validade.'),
    observacao: nullableText
});

export const criarMotoristaSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    nome: textRequired('Informe o nome.'),
    cpf: textRequired('Informe o CPF.'),
    cnhNumero: textRequired('Informe o número da CNH.'),
    cnhCategoria: textRequired('Informe a categoria da CNH.'),
    cnhValidade: requiredDate('Informe a validade da CNH.'),
    telefone: nullableText
});

export const iniciarViagemSchema = z.object({
    empresaId: requiredGuid('Empresa'),
    filialId: optionalGuid,
    veiculoId: requiredGuid('Veículo'),
    motoristaId: requiredGuid('Motorista'),
    origem: textRequired('Informe a origem.'),
    destino: textRequired('Informe o destino.'),
    dataSaida: optionalDate,
    odometroSaida: money('Odômetro de saída')
});

export const encerrarViagemSchema = z.object({
    dataChegada: optionalDate,
    odometroChegada: money('Odômetro de chegada'),
    observacao: nullableText
});

export const motivoSchema = z.object({ motivo: textRequired('Informe o motivo.') });
