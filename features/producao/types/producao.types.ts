import { Guid, IsoDateTime } from '@/types/erp';

export enum StatusFichaTecnica {
    Rascunho = 1,
    Ativa = 2,
    Inativa = 3
}

export enum StatusOrdemProducao {
    Rascunho = 1,
    Liberada = 2,
    EmProducao = 3,
    Encerrada = 4,
    Cancelada = 5
}

export enum TipoApontamentoProducao {
    Consumo = 1,
    Horas = 2,
    Perda = 3,
    Produzido = 4
}

// ---- Response types ----
export type ComponenteFichaTecnicaResponse = {
    id: Guid;
    produtoId: Guid;
    quantidade: number;
    perdaPercentual?: number | null;
    observacao?: string | null;
};

export type FichaTecnicaResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    codigo: string;
    produtoId: Guid;
    descricao: string;
    quantidadeBase: number;
    versao?: string | null;
    status: StatusFichaTecnica | number;
};

export type FichaTecnicaResponse = FichaTecnicaResumoResponse & {
    componentes: ComponenteFichaTecnicaResponse[];
};

export type ApontamentoProducaoResponse = {
    id: Guid;
    tipo: TipoApontamentoProducao | number;
    produtoId?: Guid | null;
    quantidade: number;
    data: IsoDateTime;
    observacao?: string | null;
};

export type OrdemProducaoResumoResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    numero: string;
    produtoId: Guid;
    quantidadePlanejada: number;
    quantidadeProduzida?: number | null;
    dataPlanejada: IsoDateTime;
    localEstoqueId?: Guid | null;
    status: StatusOrdemProducao | number;
    custoConsolidado?: number | null;
    observacao?: string | null;
};

export type OrdemProducaoResponse = OrdemProducaoResumoResponse & {
    apontamentos: ApontamentoProducaoResponse[];
};

export type NecessidadeComponenteResponse = {
    produtoId: Guid;
    quantidadeNecessaria: number;
    quantidadeDisponivel: number;
    faltante: number;
};

// ---- List queries ----
export type FichasTecnicasListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusFichaTecnica | number | null;
    termo?: string | null;
};

export type OrdensProducaoListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusOrdemProducao | number | null;
    termo?: string | null;
};

// ---- Form value types ----
export type FichaTecnicaFormValues = {
    empresaId: string;
    filialId?: string | null;
    codigo: string;
    produtoId: string;
    descricao: string;
    quantidadeBase: number;
    versao?: string | null;
};

export type ComponenteFichaTecnicaFormValues = { produtoId: string; quantidade: number; perdaPercentual?: number | null; observacao?: string | null };

export type OrdemProducaoFormValues = {
    empresaId: string;
    filialId?: string | null;
    numero: string;
    produtoId: string;
    quantidadePlanejada: number;
    dataPlanejada?: Date | null;
    localEstoqueId?: string | null;
    observacao?: string | null;
};

export type ApontamentoProducaoFormValues = { tipo: TipoApontamentoProducao | number; produtoId?: string | null; quantidade: number; observacao?: string | null };
