import { Guid, IsoDateTime } from '@/types/erp';

export enum TipoCobranca {
    SimplesComRegistro = 1,
    SimplesSemRegistro = 2,
    Caucionada = 3,
    Descontada = 4,
    Vinculada = 5
}

export enum StatusBoleto {
    EmAberto = 1,
    Registrado = 2,
    Liquidado = 3,
    Baixado = 4,
    Cancelado = 5
}

// ---- Response types ----
export type BancoResponse = {
    id: Guid;
    codigo: string;
    nome: string;
};

export type ContaBancariaResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    bancoId: Guid;
    agencia: string;
    agenciaDv?: string | null;
    conta: string;
    contaDv?: string | null;
};

export type ConvenioBancarioResponse = {
    id: Guid;
    contaBancariaId: Guid;
    numeroConvenio: string;
    cedente?: string | null;
};

export type CarteiraCobrancaResponse = {
    id: Guid;
    convenioBancarioId: Guid;
    codigo: string;
    tipoCobranca: TipoCobranca | number;
};

export type BoletoResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    contaReceberId: Guid;
    parcelaReceberId: Guid;
    carteiraCobrancaId: Guid;
    numeroDocumento?: string | null;
    nossoNumero?: string | null;
    valor: number;
    vencimento?: IsoDateTime | null;
    status: StatusBoleto | number;
};

export type BoletoResponse = BoletoResumoResponse & {
    linhaDigitavel?: string | null;
    codigoBarras?: string | null;
    alertas?: string[] | null;
};

export type BoletoHistoricoResponse = {
    data: IsoDateTime;
    evento: string;
    descricao?: string | null;
};

export type RemessaCnabResponse = {
    id: Guid;
    nomeArquivo?: string | null;
    conteudo?: string | null;
    quantidadeBoletos: number;
    alertas?: string[] | null;
};

export type RetornoCnabResponse = {
    id: Guid;
    nomeArquivo: string;
    processadoEm?: IsoDateTime | null;
    quantidadeProcessada: number;
    alertas?: string[] | null;
};

// ---- List queries ----
export type ContasBancariasListQuery = { empresaId?: Guid | null; filialId?: Guid | null };
export type BoletosListQuery = { empresaId?: Guid | null; filialId?: Guid | null; status?: StatusBoleto | number | null; termo?: string | null };

// ---- Form value types ----
export type BancoFormValues = { codigo: string; nome: string };
export type ContaBancariaFormValues = { empresaId: string; filialId?: string | null; bancoId: string; agencia: string; agenciaDv?: string | null; conta: string; contaDv?: string | null };
export type ConvenioFormValues = { contaBancariaId: string; numeroConvenio: string; cedente?: string | null };
export type CarteiraFormValues = { convenioBancarioId: string; codigo: string; tipoCobranca: TipoCobranca | number };
export type GerarBoletoFormValues = { contaReceberId: string; parcelaReceberId: string; carteiraCobrancaId: string; numeroDocumento?: string | null };
export type ImportarRetornoFormValues = { contaBancariaId: string; nomeArquivo: string; conteudo: string };
