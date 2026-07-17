import { Guid, IsoDateTime } from '@/types/erp';

export enum StatusOrdemServico {
    Aberta = 1,
    Triagem = 2,
    Planejada = 3,
    EmExecucao = 4,
    EncerradaTecnicamente = 5,
    Faturada = 6,
    Cancelada = 7
}

export enum PrioridadeOrdemServico {
    Baixa = 1,
    Media = 2,
    Alta = 3,
    Urgente = 4
}

export enum TipoItemOrdemServico {
    MaoDeObra = 1,
    Material = 2,
    ServicoExterno = 3
}

export type ItemOrdemServicoResponse = {
    id: Guid;
    sequencia: number;
    tipo: TipoItemOrdemServico | number;
    descricao: string;
    produtoId?: Guid | null;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    estoqueBaixado: boolean;
};

export type OrdemServicoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    clienteId: Guid;
    descricao: string;
    prioridade: PrioridadeOrdemServico | number;
    tecnicoResponsavelId?: Guid | null;
    localEstoqueId?: Guid | null;
    dataAbertura: IsoDateTime;
    dataPrevisao?: IsoDateTime | null;
    dataEncerramento?: IsoDateTime | null;
    diagnostico?: string | null;
    planoExecucao?: string | null;
    laudoTecnico?: string | null;
    statusOS: StatusOrdemServico | number;
    valorMaoDeObra: number;
    valorMaterial: number;
    valorTotal: number;
    contaReceberId?: Guid | null;
    faturadoEm?: IsoDateTime | null;
    itens: ItemOrdemServicoResponse[];
};

export type FaturarOrdemServicoResponse = {
    ordemServicoId: Guid;
    contaReceberId: Guid;
    valorTotal: number;
};

export type OrdensServicoListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    clienteId?: Guid | null;
    status?: StatusOrdemServico | number | null;
    tecnicoResponsavelId?: Guid | null;
    termo?: string | null;
};

// ---- Form value types ----
export type OrdemServicoFormValues = {
    empresaId: string;
    filialId?: string | null;
    numero: string;
    clienteId: string;
    descricao: string;
    prioridade: PrioridadeOrdemServico | number;
    tecnicoResponsavelId?: string | null;
    localEstoqueId?: string | null;
    dataAbertura?: Date | null;
    dataPrevisao?: Date | null;
};

export type TriarOrdemServicoFormValues = { diagnostico: string; tecnicoResponsavelId?: string | null };
export type PlanejarOrdemServicoFormValues = { planoExecucao: string };
export type ItemOrdemServicoFormValues = { tipo: TipoItemOrdemServico | number; descricao: string; produtoId?: string | null; quantidade: number; valorUnitario: number };
export type EncerrarOrdemServicoFormValues = { laudoTecnico: string };
export type FaturarOrdemServicoFormValues = { numeroDocumento?: string | null; dataVencimento?: Date | null; observacao?: string | null };
