import { Guid, IsoDateTime } from '@/types/erp';

export enum TipoDocumentoAcesso {
    Rg = 1,
    Cpf = 2,
    Cnh = 3,
    Passaporte = 4,
    Outro = 5
}

export enum TipoAcesso {
    Visitante = 1,
    Prestador = 2,
    Fornecedor = 3,
    Funcionario = 4,
    Veiculo = 5,
    Outro = 6
}

export enum StatusPreAutorizacao {
    Ativa = 1,
    Utilizada = 2,
    Expirada = 3,
    Cancelada = 4
}

export enum StatusRegistroAcesso {
    AguardandoValidacao = 1,
    EmPermanencia = 2,
    Negado = 3,
    Encerrado = 4,
    Cancelado = 5
}

export enum TipoOcorrenciaAcesso {
    Seguranca = 1,
    Comportamento = 2,
    Documentacao = 3,
    Dano = 4,
    Outro = 5
}

export enum GravidadeOcorrencia {
    Baixa = 1,
    Media = 2,
    Alta = 3,
    Critica = 4
}

export enum StatusOcorrenciaAcesso {
    Aberta = 1,
    Resolvida = 2
}

// ---- Response types ----
export type PreAutorizacaoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    nomeVisitante: string;
    documentoTipo: TipoDocumentoAcesso | number;
    documentoNumero: string;
    tipoAcesso: TipoAcesso | number;
    destino: string;
    validadeInicio: IsoDateTime;
    validadeFim: IsoDateTime;
    placaVeiculo?: string | null;
    motivo?: string | null;
    status: StatusPreAutorizacao | number;
};

export type RegistroAcessoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    preAutorizacaoId?: Guid | null;
    nomeVisitante: string;
    documentoTipo: TipoDocumentoAcesso | number;
    documentoNumero: string;
    tipoAcesso: TipoAcesso | number;
    destino: string;
    motivo?: string | null;
    placaVeiculo?: string | null;
    dataEntrada: IsoDateTime;
    dataSaida?: IsoDateTime | null;
    permanenciaMinutos?: number | null;
    documentoAprovado?: boolean | null;
    status: StatusRegistroAcesso | number;
};

export type OcorrenciaAcessoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    registroAcessoId?: Guid | null;
    tipo: TipoOcorrenciaAcesso | number;
    gravidade: GravidadeOcorrencia | number;
    descricao: string;
    resolucao?: string | null;
    status: StatusOcorrenciaAcesso | number;
    registradoEm: IsoDateTime;
};

// ---- List queries ----
export type PreAutorizacoesListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusPreAutorizacao | number | null;
    termo?: string | null;
};

export type RegistrosAcessoListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusRegistroAcesso | number | null;
    termo?: string | null;
};

export type OcorrenciasListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusOcorrenciaAcesso | number | null;
    gravidade?: GravidadeOcorrencia | number | null;
};

// ---- Form value types ----
export type PreAutorizacaoFormValues = {
    empresaId: string;
    filialId?: string | null;
    nomeVisitante: string;
    documentoTipo: TipoDocumentoAcesso | number;
    documentoNumero: string;
    tipoAcesso: TipoAcesso | number;
    destino: string;
    validadeInicio?: Date | null;
    validadeFim?: Date | null;
    placaVeiculo?: string | null;
    motivo?: string | null;
};

export type RegistrarEntradaFormValues = {
    empresaId: string;
    filialId?: string | null;
    preAutorizacaoId?: string | null;
    nomeVisitante: string;
    documentoTipo: TipoDocumentoAcesso | number;
    documentoNumero: string;
    tipoAcesso: TipoAcesso | number;
    destino: string;
    motivo?: string | null;
    placaVeiculo?: string | null;
    dataEntrada?: Date | null;
};

export type ValidarDocumentoFormValues = { aprovado: boolean; observacao?: string | null };
export type RegistrarSaidaFormValues = { dataSaida?: Date | null; observacao?: string | null };
export type OcorrenciaFormValues = {
    empresaId: string;
    filialId?: string | null;
    registroAcessoId?: string | null;
    tipo: TipoOcorrenciaAcesso | number;
    gravidade: GravidadeOcorrencia | number;
    descricao: string;
};
