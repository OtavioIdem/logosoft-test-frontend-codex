import { EntityStatus, Guid } from '@/types/erp';

/**
 * `TipoEndereco`, `Erp.Domain/Pessoas/TipoEndereco.cs:3-10`. O backend serializa enum como número
 * (sem `JsonStringEnumConverter`, `Program.cs:28`), então a API fala os valores abaixo.
 */
export enum TipoEndereco {
    Comercial = 1,
    Residencial = 2,
    Entrega = 3,
    Cobranca = 4,
    Fiscal = 5,
    Outro = 99
}

/** `EnderecoPessoaResponse`, `EnderecoContatoResponse.cs:6-19` (13 campos). A lista só devolve endereços ativos. */
export type EnderecoPessoaResponse = {
    id: Guid;
    pessoaId: Guid;
    tipo: TipoEndereco;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    uf: string;
    /** só 8 dígitos (`EnderecoPessoa.cs:177-187`) */
    cep: string;
    principal: boolean;
    status: EntityStatus;
    /** nulo até o vínculo de município (b74); a tela só diz "vinculado" ou "não vinculado" */
    municipioIbgeId: Guid | null;
};

/** `AdicionarEnderecoPessoaRequest` e `AtualizarEnderecoPessoaRequest` (`EnderecoContatoRequests.cs:5-25`): os mesmos 9 campos. */
export type EnderecoPessoaRequest = {
    tipo: TipoEndereco;
    logradouro: string;
    numero: string;
    complemento?: string | null;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    principal: boolean;
};

export type CriarEnderecoPessoaRequest = EnderecoPessoaRequest;
export type AtualizarEnderecoPessoaRequest = EnderecoPessoaRequest;

/** Valores do formulário: tudo texto, exceto o tipo e o principal. O schema normaliza para o request. */
export type EnderecoPessoaFormValues = {
    tipo: number;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    principal: boolean;
};
