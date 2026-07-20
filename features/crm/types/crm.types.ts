import { Guid, IsoDateTime, TipoPedidoVenda } from '@/types/erp';

export enum OrigemLead {
    Site = 1,
    Indicacao = 2,
    Evento = 3,
    RedeSocial = 4,
    Telefone = 5,
    Outro = 6
}

export enum StatusLead {
    Novo = 1,
    Qualificado = 2,
    Descartado = 3
}

export enum EstagioOportunidade {
    Qualificacao = 1,
    Proposta = 2,
    Negociacao = 3
}

export enum StatusOportunidade {
    Aberta = 1,
    Ganha = 2,
    Perdida = 3,
    Convertida = 4
}

export enum MotivoPerdaOportunidade {
    Preco = 1,
    Concorrencia = 2,
    SemOrcamento = 3,
    SemInteresse = 4,
    Prazo = 5,
    Outro = 6
}

export enum StatusProposta {
    Enviada = 1,
    Aceita = 2,
    Recusada = 3
}

// ---- Response types ----
export type LeadResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    empresa?: string | null;
    email?: string | null;
    telefone?: string | null;
    origem: OrigemLead | number;
    responsavelId?: Guid | null;
    status: StatusLead | number;
    oportunidadeId?: Guid | null;
};

export type OportunidadeResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    clienteId: Guid;
    titulo: string;
    valorEstimado: number;
    estagio: EstagioOportunidade | number;
    status: StatusOportunidade | number;
    responsavelId?: Guid | null;
    dataPrevisaoFechamento?: IsoDateTime | null;
    propostaVencedoraId?: Guid | null;
    pedidoVendaId?: Guid | null;
    motivoPerda?: MotivoPerdaOportunidade | number | null;
};

export type ItemPropostaResponse = {
    id: Guid;
    produtoId: Guid;
    quantidade: number;
    valorUnitario: number;
    valorDesconto: number;
    valorTotal: number;
    observacao?: string | null;
};

export type PropostaResponse = {
    id: Guid;
    oportunidadeId: Guid;
    numero?: string | null;
    dataValidade?: IsoDateTime | null;
    observacao?: string | null;
    valorTotal: number;
    status: StatusProposta | number;
    itens: ItemPropostaResponse[];
};

export type ConverterOportunidadeResponse = {
    pedidoVendaId: Guid;
    numeroPedido: string;
    valorTotal: number;
};

// ---- List queries ----
export type LeadsListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusLead | number | null;
    termo?: string | null;
};

export type OportunidadesListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    estagio?: EstagioOportunidade | number | null;
    status?: StatusOportunidade | number | null;
    termo?: string | null;
};

export type PropostasListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    oportunidadeId?: Guid | null;
    status?: StatusProposta | number | null;
};

// ---- Form value types ----
export type LeadFormValues = {
    empresaId: string;
    filialId?: string | null;
    nome: string;
    empresa?: string | null;
    email?: string | null;
    telefone?: string | null;
    origem: OrigemLead | number;
    responsavelId?: string | null;
};

export type QualificarLeadFormValues = {
    clienteId: string;
    titulo: string;
    valorEstimado: number;
    responsavelId?: string | null;
    dataPrevisaoFechamento?: Date | null;
};

export type PerderOportunidadeFormValues = { motivo: MotivoPerdaOportunidade | number; justificativa: string };

export type ConverterOportunidadeFormValues = {
    numeroPedido: string;
    tipo: TipoPedidoVenda | number;
    dataEmissao?: Date | null;
    dataPrevisaoEntrega?: Date | null;
    observacao?: string | null;
};

export type ItemPropostaFormValues = { produtoId: string; quantidade: number; valorUnitario: number; valorDesconto: number; observacao?: string | null };

export type PropostaFormValues = {
    oportunidadeId: string;
    dataValidade?: Date | null;
    observacao?: string | null;
    itens: ItemPropostaFormValues[];
};
