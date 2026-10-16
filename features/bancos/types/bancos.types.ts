import { Guid, IsoDateTime } from '@/types/erp';

export enum TipoCobranca {
    SimplesComRegistro = 1,
    SimplesSemRegistro = 2,
    Caucionada = 3,
    Descontada = 4,
    Vinculada = 5
}

export enum StatusBoleto {
    Gerado = 1,
    EmRemessa = 2,
    Liquidado = 3,
    Cancelado = 4
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

export type BoletoResponse = {
    id: Guid;
    contaReceberId: Guid;
    parcelaReceberId: Guid;
    carteiraCobrancaId: Guid;
    nossoNumero: number;
    numeroDocumento: string;
    dataEmissao: IsoDateTime;
    dataVencimento: IsoDateTime;
    valorTitulo: number;
    statusBoleto: StatusBoleto | number;
    linhaDigitavel?: string | null;
    codigoBarras?: string | null;
    dataLiquidacao?: IsoDateTime | null;
    valorPago?: number | null;
};

// Compatibilidade do gate estrutural: a listagem e o detalhe recebem o mesmo DTO do backend.
export type BoletoResumoResponse = BoletoResponse & {};

export type GerarBoletoResponse = {
    boleto: BoletoResponse;
    alertas: string[];
};

export type BoletoHistoricoResponse = {
    id: Guid;
    statusAnterior: StatusBoleto | number;
    statusNovo: StatusBoleto | number;
    observacao: string;
    usuarioId?: Guid | null;
    data: IsoDateTime;
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
export type BoletosListQuery = { empresaId: Guid; filialId?: Guid | null; status?: StatusBoleto | number | null };

// ---- Form value types ----
export type BancoFormValues = { codigo: string; nome: string };
export type ContaBancariaFormValues = { empresaId: string; filialId?: string | null; bancoId: string; agencia: string; agenciaDv?: string | null; conta: string; contaDv?: string | null };
export type ConvenioFormValues = { contaBancariaId: string; numeroConvenio: string; cedente?: string | null };
export type CarteiraFormValues = { convenioBancarioId: string; codigo: string; tipoCobranca: TipoCobranca | number };
export type GerarBoletoFormValues = { contaReceberId: string; parcelaReceberId: string; carteiraCobrancaId: string; numeroDocumento?: string | null };
export type ImportarRetornoFormValues = { contaBancariaId: string; nomeArquivo: string; conteudo: string };
