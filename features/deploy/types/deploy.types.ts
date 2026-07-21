import { Guid, IsoDateTime } from '@/types/erp';

export enum StatusDeploy {
    EmAndamento = 1,
    Concluido = 2,
    Falhou = 3,
    Revertido = 4
}

export enum StatusItemChecklist {
    Pendente = 1,
    Aprovado = 2,
    Reprovado = 3
}

// ---- Response types ----
export type AmbienteResponse = {
    versaoAtual: string;
    ambiente?: string | null;
    runtime?: string | null;
    healthy?: boolean | null;
    atualizadoEm?: IsoDateTime | null;
};

export type MigracoesResponse = {
    total: number;
    aplicadas: number;
    pendentes: number;
    consistente: boolean;
    ultimaMigracao?: string | null;
};

export type ItemChecklistDeployResponse = {
    id: Guid;
    descricao: string;
    obrigatorio: boolean;
    status: StatusItemChecklist | number;
    observacao?: string | null;
};

export type DeployResumoResponse = {
    id: Guid;
    versao: string;
    descricao?: string | null;
    ambiente?: string | null;
    status: StatusDeploy | number;
    iniciadoEm: IsoDateTime;
    concluidoEm?: IsoDateTime | null;
};

export type DeployResponse = DeployResumoResponse & {
    checklist: ItemChecklistDeployResponse[];
    observacao?: string | null;
};

// ---- List queries ----
export type DeploysListQuery = {
    status?: StatusDeploy | number | null;
    ambiente?: string | null;
};

// ---- Form value types ----
export type CriarDeployFormValues = { versao: string; descricao?: string | null; ambiente?: string | null };
export type ItemChecklistFormValues = { deployId: string; descricao: string; obrigatorio: boolean };
export type ResultadoChecklistFormValues = { aprovado: boolean; observacao?: string | null };
