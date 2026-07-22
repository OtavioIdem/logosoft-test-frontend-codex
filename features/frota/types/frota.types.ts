import { Guid, IsoDateTime } from '@/types/erp';

export enum TipoVeiculo {
    Carro = 1,
    Moto = 2,
    Caminhao = 3,
    Van = 4,
    Onibus = 5,
    Maquina = 6,
    Outro = 7
}

export enum TipoCombustivel {
    Gasolina = 1,
    Etanol = 2,
    Diesel = 3,
    Flex = 4,
    Gnv = 5,
    Eletrico = 6,
    Hibrido = 7
}

export enum StatusVeiculo {
    Ativo = 1,
    EmManutencao = 2,
    Inativo = 3,
    Vendido = 4
}

export enum TipoManutencao {
    Preventiva = 1,
    Corretiva = 2,
    Preditiva = 3
}

export enum StatusManutencao {
    Aberta = 1,
    EmAndamento = 2,
    Concluida = 3,
    Cancelada = 4
}

export enum TipoDespesaVeiculo {
    Pedagio = 1,
    Multa = 2,
    Lavagem = 3,
    Estacionamento = 4,
    Seguro = 5,
    Ipva = 6,
    Licenciamento = 7,
    Outro = 8
}

export enum TipoDocumentoVeiculo {
    Crlv = 1,
    Seguro = 2,
    Ipva = 3,
    Licenciamento = 4,
    Outro = 5
}

export enum StatusViagem {
    EmAndamento = 1,
    Encerrada = 2,
    Cancelada = 3
}

// ---- Response types ----
export type VeiculoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    placa: string;
    modelo: string;
    marca?: string | null;
    ano?: number | null;
    tipo: TipoVeiculo | number;
    combustivel: TipoCombustivel | number;
    odometroInicial: number;
    odometroAtual: number;
    renavam?: string | null;
    status: StatusVeiculo | number;
};

export type AbastecimentoResponse = {
    id: Guid;
    veiculoId: Guid;
    motoristaId?: Guid | null;
    data: IsoDateTime;
    odometro: number;
    litros: number;
    valorLitro: number;
    valorTotal: number;
    combustivel: TipoCombustivel | number;
    tanqueCheio: boolean;
    posto?: string | null;
};

export type ManutencaoResponse = {
    id: Guid;
    veiculoId: Guid;
    tipo: TipoManutencao | number;
    descricao: string;
    fornecedorId?: Guid | null;
    data: IsoDateTime;
    odometro?: number | null;
    valor: number;
    status: StatusManutencao | number;
    contaPagarId?: Guid | null;
    dataConclusao?: IsoDateTime | null;
};

export type DespesaVeiculoResponse = {
    id: Guid;
    veiculoId: Guid;
    tipo: TipoDespesaVeiculo | number;
    descricao: string;
    fornecedorId?: Guid | null;
    data: IsoDateTime;
    valor: number;
    contaPagarId?: Guid | null;
};

export type DocumentoVeiculoResponse = {
    id: Guid;
    veiculoId: Guid;
    tipo: TipoDocumentoVeiculo | number;
    numero?: string | null;
    orgaoEmissor?: string | null;
    dataEmissao?: IsoDateTime | null;
    dataValidade: IsoDateTime;
    vencido: boolean;
    observacao?: string | null;
};

export type MotoristaResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    cpf: string;
    cnhNumero: string;
    cnhCategoria: string;
    cnhValidade: IsoDateTime;
    cnhVencida: boolean;
    telefone?: string | null;
    status: StatusVeiculo | number;
};

export type ViagemResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    veiculoId: Guid;
    motoristaId: Guid;
    origem: string;
    destino: string;
    dataSaida: IsoDateTime;
    odometroSaida: number;
    dataChegada?: IsoDateTime | null;
    odometroChegada?: number | null;
    distancia?: number | null;
    status: StatusViagem | number;
    observacao?: string | null;
};

// ---- List queries ----
export type VeiculosListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    tipo?: TipoVeiculo | number | null;
    status?: StatusVeiculo | number | null;
    termo?: string | null;
};

export type VeiculoSubRecursoQuery = {
    veiculoId?: Guid | null;
    empresaId?: Guid | null;
    filialId?: Guid | null;
};

export type MotoristasListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
};

export type ViagensListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    veiculoId?: Guid | null;
    motoristaId?: Guid | null;
    status?: StatusViagem | number | null;
};

// ---- Form value types ----
export type VeiculoFormValues = {
    empresaId: string;
    filialId?: string | null;
    placa: string;
    modelo: string;
    marca?: string | null;
    ano?: number | null;
    tipo: TipoVeiculo | number;
    combustivel: TipoCombustivel | number;
    odometroInicial: number;
    renavam?: string | null;
};

export type AbastecimentoFormValues = {
    veiculoId: string;
    motoristaId?: string | null;
    data?: Date | null;
    odometro: number;
    litros: number;
    valorLitro: number;
    combustivel: TipoCombustivel | number;
    tanqueCheio: boolean;
    posto?: string | null;
};

export type ManutencaoFormValues = {
    veiculoId: string;
    tipo: TipoManutencao | number;
    descricao: string;
    fornecedorId?: string | null;
    data?: Date | null;
    odometro?: number | null;
    valor: number;
};

export type DespesaVeiculoFormValues = {
    veiculoId: string;
    tipo: TipoDespesaVeiculo | number;
    descricao: string;
    fornecedorId?: string | null;
    data?: Date | null;
    valor: number;
};

export type DocumentoVeiculoFormValues = {
    veiculoId: string;
    tipo: TipoDocumentoVeiculo | number;
    numero?: string | null;
    orgaoEmissor?: string | null;
    dataEmissao?: Date | null;
    dataValidade?: Date | null;
    observacao?: string | null;
};

export type MotoristaFormValues = {
    empresaId: string;
    filialId?: string | null;
    nome: string;
    cpf: string;
    cnhNumero: string;
    cnhCategoria: string;
    cnhValidade?: Date | null;
    telefone?: string | null;
};

export type ViagemFormValues = {
    empresaId: string;
    filialId?: string | null;
    veiculoId: string;
    motoristaId: string;
    origem: string;
    destino: string;
    dataSaida?: Date | null;
    odometroSaida: number;
};

export type EncerrarViagemFormValues = {
    dataChegada?: Date | null;
    odometroChegada: number;
    observacao?: string | null;
};
