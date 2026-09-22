import { z } from 'zod';
import { isValidGuid } from '@/lib/http/requestUtils';
import { Crt, RegimeTributario } from '@/features/administracao/types/administracao.types';

const nullableText = z.string().trim().optional().nullable().transform((value) => (value && value.length > 0 ? value : null));
const requiredText = (label: string, min = 2) => z.string().trim().min(min, `${label} é obrigatório.`);
const optionalGuid = z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))
    .refine((value) => value === null || isValidGuid(value), 'Selecione um registro válido ou deixe em branco.');
const requiredGuid = (label: string) => z.string().trim().refine((value) => isValidGuid(value), `${label} deve ser selecionado corretamente.`);
const documentoEmpresa = z.string().trim().min(11, 'Informe CPF/CNPJ válido para o backend validar.').max(32, 'Documento deve ter no máximo 32 caracteres.');

const regimeTributarioSchema = z.nativeEnum(RegimeTributario, { errorMap: () => ({ message: 'Selecione o regime tributário.' }) });

// `Crt?` é anulável (D55: LACUNA fechado pela b64) — o formulário nasce sem CRT selecionado
// (sentinel `''` do Dropdown) e o valor vira `null`, nunca `0` (Crt não tem zero).
const crtSchema = z
    .union([z.nativeEnum(Crt), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value === undefined || value === null ? null : value));

export const criarEmpresaSchema = z.object({ razaoSocial: requiredText('Razão social', 3), nomeFantasia: nullableText, documento: documentoEmpresa, inscricaoEstadual: nullableText, inscricaoMunicipal: nullableText, regimeTributario: regimeTributarioSchema, crt: crtSchema, contribuinteIpi: z.boolean().default(false) });
// `contribuinteIpi` do PUT (`bool?`, `null` = mantém) fica fora deste schema de propósito: entra pelo
// campo `contribuinteIpiPatch` (passthrough) de administracaoPageConfig.ts, resolvido em
// administracaoApi.ts — nunca por aqui, para não nascer com `false` e resetar o indicador em
// silêncio (D55, o mesmo defeito que a c3 fechou em `regimeTributario`).
export const atualizarEmpresaSchema = z.object({ razaoSocial: requiredText('Razão social', 3), nomeFantasia: nullableText, inscricaoEstadual: nullableText, inscricaoMunicipal: nullableText, regimeTributario: regimeTributarioSchema, crt: crtSchema });

// DefinirEnderecoFiscalRequest — seis obrigatórios, dois anuláveis (armadilha 1 do plano
// v1.11.0a8b64; fonte C#, o Swagger declara os oito como `string | null` e está errado).
export const definirEnderecoFiscalSchema = z.object({
    logradouro: requiredText('Logradouro', 3),
    numero: requiredText('Número', 1),
    complemento: nullableText,
    bairro: requiredText('Bairro', 2),
    cidade: requiredText('Cidade', 2),
    uf: z
        .string()
        .trim()
        .length(2, 'Selecione a UF.')
        .transform((value) => value.toUpperCase()),
    cep: z
        .string()
        .trim()
        .min(8, 'Informe um CEP válido.')
        .max(9, 'CEP deve ter no máximo 9 caracteres.'),
    codigoMunicipioIbge: nullableText
});
export const criarFilialSchema = z.object({ empresaId: requiredGuid('Empresa'), nome: requiredText('Nome da filial', 2), documento: documentoEmpresa, inscricaoEstadual: nullableText, inscricaoMunicipal: nullableText });
export const atualizarFilialSchema = z.object({ nome: requiredText('Nome da filial', 2), inscricaoEstadual: nullableText, inscricaoMunicipal: nullableText });
export const criarSetorSchema = z.object({ empresaId: requiredGuid('Empresa'), filialId: optionalGuid, nome: requiredText('Nome do setor', 2), descricao: nullableText });
export const atualizarSetorSchema = z.object({ nome: requiredText('Nome do setor', 2), descricao: nullableText });
export const criarCargoSchema = z.object({ empresaId: requiredGuid('Empresa'), filialId: optionalGuid, setorId: optionalGuid, nome: requiredText('Nome do cargo', 2), descricao: nullableText, nivelHierarquico: z.coerce.number().int('Informe um número inteiro.').min(0, 'O nível hierárquico não pode ser negativo.') });
export const atualizarCargoSchema = z.object({ setorId: optionalGuid, nome: requiredText('Nome do cargo', 2), descricao: nullableText, nivelHierarquico: z.coerce.number().int('Informe um número inteiro.').min(0, 'O nível hierárquico não pode ser negativo.') });
export const criarCentroCustoSchema = z.object({ empresaId: requiredGuid('Empresa'), filialId: optionalGuid, codigo: requiredText('Código', 1).max(30, 'Código deve ter no máximo 30 caracteres.'), nome: requiredText('Nome', 2), descricao: nullableText });
export const atualizarCentroCustoSchema = z.object({ nome: requiredText('Nome', 2), descricao: nullableText });
export const motivoAdministracaoSchema = z.object({ motivo: z.string().trim().min(5, 'Informe um motivo com pelo menos 5 caracteres.') });
