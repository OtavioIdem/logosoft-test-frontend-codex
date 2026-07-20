import { Guid, IsoDateTime } from '@/types/erp';

export enum OrigemInspecao {
    RecebimentoCompra = 1,
    OrdemProducao = 2,
    Devolucao = 3,
    Avulsa = 4
}

export enum StatusInspecao {
    Aberta = 1,
    Aprovada = 2,
    Reprovada = 3,
    Encerrada = 4
}

export enum ResultadoCriterio {
    Pendente = 1,
    Conforme = 2,
    NaoConforme = 3
}

export enum StatusNaoConformidade {
    Aberta = 1,
    EmTratamento = 2,
    Encerrada = 3,
    Cancelada = 4
}

export enum StatusAcaoCorretiva {
    Pendente = 1,
    EmAndamento = 2,
    Concluida = 3,
    Cancelada = 4
}

// ---- Response types ----
export type CriterioInspecaoResponse = {
    id: Guid;
    descricao: string;
    critico: boolean;
    valorEsperado?: string | null;
    resultado: ResultadoCriterio | number;
    valorMedido?: string | null;
    observacao?: string | null;
};

export type InspecaoResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero?: string | null;
    origem: OrigemInspecao | number;
    origemId?: Guid | null;
    produtoId: Guid;
    quantidade: number;
    localEstoqueId?: Guid | null;
    responsavelId?: Guid | null;
    dataInspecao: IsoDateTime;
    observacao?: string | null;
    status: StatusInspecao | number;
    naoConformidadeId?: Guid | null;
};

export type InspecaoResponse = InspecaoResumoResponse & {
    criterios: CriterioInspecaoResponse[];
};

export type AcaoCorretivaResponse = {
    id: Guid;
    descricao: string;
    responsavelId?: Guid | null;
    prazo?: IsoDateTime | null;
    status: StatusAcaoCorretiva | number;
};

export type NaoConformidadeResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    inspecaoId?: Guid | null;
    produtoId?: Guid | null;
    descricao: string;
    critico: boolean;
    status: StatusNaoConformidade | number;
    bloqueioEstoqueId?: Guid | null;
    abertaEm: IsoDateTime;
};

export type NaoConformidadeResponse = NaoConformidadeResumoResponse & {
    acoes: AcaoCorretivaResponse[];
};

// ---- List queries ----
export type InspecoesListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    origem?: OrigemInspecao | number | null;
    status?: StatusInspecao | number | null;
    termo?: string | null;
};

export type NaoConformidadesListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusNaoConformidade | number | null;
};

// ---- Form value types ----
export type CriterioFormValues = { descricao: string; critico: boolean; valorEsperado?: string | null };

export type InspecaoFormValues = {
    empresaId: string;
    filialId?: string | null;
    origem: OrigemInspecao | number;
    produtoId: string;
    quantidade: number;
    localEstoqueId?: string | null;
    responsavelId?: string | null;
    dataInspecao?: Date | null;
    observacao?: string | null;
};

export type ResultadoCriterioFormValues = { criterioId: string; conforme: boolean; valorMedido?: string | null; observacao?: string | null };
export type AcaoCorretivaFormValues = { descricao: string; responsavelId?: string | null; prazo?: Date | null };
