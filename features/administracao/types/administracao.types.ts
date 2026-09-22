import { BaseOperationalRecord, CentroCusto, Cargo, Empresa, Filial, Guid, Setor } from '@/types/erp';

// RegimeTributario( SimplesNacional, LucroPresumido, LucroReal ) — o JSON trafega
// número: src/Erp.Api/Program.cs não registra JsonStringEnumConverter e o enum em
// src/Erp.Domain/Administration/RegimeTributario.cs não tem [JsonConverter], então
// System.Text.Json serializa/desserializa pela numeração default do C# (0, 1, 2).
// A coluna character varying de erp.empresas."RegimeTributario" é HasConversion<string>()
// do EF em EmpresaConfiguration.cs — conversor de persistência, não forma de wire.
export enum RegimeTributario {
    SimplesNacional = 0,
    LucroPresumido = 1,
    LucroReal = 2
}

// Crt( SimplesNacional = 1, SimplesNacionalExcessoSublimite = 2, RegimeNormal = 3 ) — contrato
// docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3364. Ao contrário de RegimeTributario, NÃO começa em
// zero: não usar índice de option/array como valor. Anulável (`Crt?`) em Criar/AtualizarEmpresaRequest
// e trafega como número no wire, pela mesma ausência de JsonStringEnumConverter no backend
// (armadilha 4 do plano v1.11.0a8b64).
export enum Crt {
    SimplesNacional = 1,
    SimplesNacionalExcessoSublimite = 2,
    RegimeNormal = 3
}

export type AdministracaoListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
};

export type AdministracaoRecord = BaseOperationalRecord & Record<string, unknown>;

// EnderecoFiscalResponse( string Logradouro, string Numero, string? Complemento, string Bairro,
// string Cidade, string Uf, string Cep, Guid? MunicipioIbgeId, bool EstaCompleto ) — contrato
// docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:2308. `municipioIbgeId` é o Id do catálogo (Guid), não o
// `codigoMunicipioIbge` (string) que o PUT espera — resolver um a partir do outro é responsabilidade
// de quem consome (armadilha 2 do plano v1.11.0a8b64).
export type EnderecoFiscalResponse = {
    logradouro: string;
    numero: string;
    complemento?: string | null;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    municipioIbgeId?: Guid | null;
    estaCompleto: boolean;
};

export type EmpresaResponse = Empresa & {
    regimeTributario: RegimeTributario;
    crt?: Crt | null;
    contribuinteIpi: boolean;
    enderecoFiscal?: EnderecoFiscalResponse | null;
};
export type FilialResponse = Filial & { enderecoFiscal?: EnderecoFiscalResponse | null };
export type SetorResponse = Setor;
export type CargoResponse = Cargo;
export type CentroCustoResponse = CentroCusto;

export type CriarEmpresaRequest = { razaoSocial: string; nomeFantasia?: string | null; documento: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null; regimeTributario: RegimeTributario; crt?: Crt | null; contribuinteIpi: boolean };
export type AtualizarEmpresaRequest = { razaoSocial: string; nomeFantasia?: string | null; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null; regimeTributario: RegimeTributario; crt?: Crt | null; contribuinteIpi?: boolean };

// DefinirEnderecoFiscalRequest( string Logradouro, string Numero, string? Complemento, string Bairro,
// string Cidade, string Uf, string Cep, string? CodigoMunicipioIbge = null ) — fonte C#, não o
// Swagger, que erra a anulabilidade dos oito campos (armadilha 1 do plano v1.11.0a8b64). Seis
// obrigatórios, dois anuláveis.
export type DefinirEnderecoFiscalRequest = {
    logradouro: string;
    numero: string;
    complemento?: string | null;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    codigoMunicipioIbge?: string | null;
};

// UfResponse( Guid Id, string Sigla, string Nome, string CodigoIbge, decimal? AliquotaInternaPadraoReferencia,
// bool Ativo, string? MotivoInativacao ) — GET /api/fiscal/cadastros/uf não pagina (devolve a lista
// inteira; D52 não se aplica aqui, o contrato mede "sem paginação").
export type UfCadastro = {
    id: Guid;
    sigla: string;
    nome: string;
    codigoIbge: string;
    aliquotaInternaPadraoReferencia?: number | null;
    ativo: boolean;
    motivoInativacao?: string | null;
};

// MunicipioIbgeResponse( Guid Id, string CodigoIbge, string Nome, Guid UfId, string UfSigla,
// string? CodigoSiafi, bool Ativo, string? MotivoInativacao ) — GET /api/fiscal/cadastros/municipios
// pagina (D52). Se `Nome` traz sufixo de UF não está medido aqui: o cadastro nasce por importação de
// arquivo (docs/arquitetura/debate/04-inventario-cadastros-fiscais.md), então o formato depende da
// carga, não do contrato. `semSufixoUf` em useEnderecoFiscalCatalogos.ts trata isso na origem.
export type MunicipioCadastro = {
    id: Guid;
    codigoIbge: string;
    nome: string;
    ufId: Guid;
    ufSigla: string;
    codigoSiafi?: string | null;
    ativo: boolean;
    motivoInativacao?: string | null;
};

export type MunicipioCadastroQuery = {
    ufSigla?: string | null;
    termo?: string | null;
    codigoIbge?: string | null;
    pagina?: number;
    tamanhoPagina?: number;
};

export type CriarFilialRequest = { empresaId: Guid; nome: string; documento: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null };
export type AtualizarFilialRequest = { nome: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null };
export type CriarSetorRequest = { empresaId: Guid; filialId?: Guid | null; nome: string; descricao?: string | null };
export type AtualizarSetorRequest = { nome: string; descricao?: string | null };
export type CriarCargoRequest = { empresaId: Guid; filialId?: Guid | null; setorId?: Guid | null; nome: string; descricao?: string | null; nivelHierarquico: number };
export type AtualizarCargoRequest = { setorId?: Guid | null; nome: string; descricao?: string | null; nivelHierarquico: number };
export type CriarCentroCustoRequest = { empresaId: Guid; filialId?: Guid | null; codigo: string; nome: string; descricao?: string | null };
export type AtualizarCentroCustoRequest = { nome: string; descricao?: string | null };
export type InativarAdministracaoRequest = { motivo: string };
export type AdministracaoFormValues = Record<string, unknown> & { id?: Guid };
