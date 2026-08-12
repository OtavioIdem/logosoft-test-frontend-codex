import { Guid, IsoDateTime } from '@/types/erp';

export enum RegimeTrabalho {
    Clt = 1,
    Pj = 2,
    Estagio = 3,
    Temporario = 4,
    Autonomo = 5,
    Aprendiz = 6
}

export enum StatusColaborador {
    Ativo = 1,
    Ferias = 2,
    Afastado = 3,
    Desligado = 4
}

export enum TipoMarcacaoPonto {
    Entrada = 1,
    SaidaIntervalo = 2,
    RetornoIntervalo = 3,
    Saida = 4
}

export enum OrigemPonto {
    Manual = 1,
    Biometria = 2,
    Aplicativo = 3,
    Importacao = 4
}

export enum StatusFerias {
    Solicitada = 1,
    Aprovada = 2,
    Rejeitada = 3,
    EmGozo = 4,
    Concluida = 5,
    Cancelada = 6
}

export enum TipoAfastamento {
    Doenca = 1,
    AcidenteTrabalho = 2,
    Maternidade = 3,
    Paternidade = 4,
    Licenca = 5,
    Outro = 6
}

export enum StatusAfastamento {
    Ativo = 1,
    Encerrado = 2
}

export enum TipoBeneficio {
    ValeTransporte = 1,
    ValeRefeicao = 2,
    ValeAlimentacao = 3,
    PlanoSaude = 4,
    PlanoOdontologico = 5,
    Outro = 6
}

export enum StatusColaboradorBeneficio {
    Ativo = 1,
    Encerrado = 2
}

export enum TipoEventoRh {
    Provento = 1,
    Desconto = 2,
    Informativo = 3
}

export enum OrigemEventoRh {
    Manual = 1,
    Ponto = 2,
    Beneficio = 3,
    Ferias = 4,
    Importacao = 5
}

// ---- Response types ----
export type ColaboradorResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    matricula: string;
    nome: string;
    cpf: string;
    cargoId: Guid;
    setorId?: Guid | null;
    pessoaId?: Guid | null;
    jornadaId?: Guid | null;
    regime: RegimeTrabalho | number;
    salarioBase: number;
    dataAdmissao: IsoDateTime;
    dataNascimento?: IsoDateTime | null;
    dataDemissao?: IsoDateTime | null;
    email?: string | null;
    telefone?: string | null;
    status: StatusColaborador | number;
};

export type JornadaResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    descricao?: string | null;
    cargaHorariaSemanal: number;
    toleranciaMinutos?: number | null;
    ativo: boolean;
};

export type PontoResponse = {
    id: Guid;
    colaboradorId: Guid;
    data: IsoDateTime;
    tipo: TipoMarcacaoPonto | number;
    origem: OrigemPonto | number;
    observacao?: string | null;
};

export type FeriasResponse = {
    id: Guid;
    colaboradorId: Guid;
    dataInicio: IsoDateTime;
    dataFim: IsoDateTime;
    dias: number;
    status: StatusFerias | number;
    observacao?: string | null;
};

export type AfastamentoResponse = {
    id: Guid;
    colaboradorId: Guid;
    tipo: TipoAfastamento | number;
    dataInicio: IsoDateTime;
    dataFimPrevista?: IsoDateTime | null;
    dataFimReal?: IsoDateTime | null;
    motivo?: string | null;
    status: StatusAfastamento | number;
};

export type BeneficioResponse = {
    id: Guid;
    empresaId: Guid;
    filialId?: Guid | null;
    nome: string;
    tipo: TipoBeneficio | number;
    valor?: number | null;
    descricao?: string | null;
    ativo: boolean;
};

export type ConcessaoBeneficioResponse = {
    id: Guid;
    colaboradorId: Guid;
    beneficioId: Guid;
    dataInicio: IsoDateTime;
    dataFim?: IsoDateTime | null;
    valor?: number | null;
    status: StatusColaboradorBeneficio | number;
};

export type EventoRhResponse = {
    id: Guid;
    colaboradorId: Guid;
    competencia: string;
    tipo: TipoEventoRh | number;
    codigo: string;
    descricao: string;
    valor: number;
    referencia?: string | null;
    origem: OrigemEventoRh | number;
    registradoEm: IsoDateTime;
};

// ---- List queries ----
export type ColaboradoresListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    status?: StatusColaborador | number | null;
    termo?: string | null;
};

export type JornadasListQuery = { empresaId?: Guid | null; filialId?: Guid | null };
export type PontoListQuery = { empresaId?: Guid | null; filialId?: Guid | null; colaboradorId?: Guid | null };
export type FeriasListQuery = { empresaId?: Guid | null; colaboradorId?: Guid | null; status?: StatusFerias | number | null };
export type AfastamentosListQuery = { empresaId?: Guid | null; colaboradorId?: Guid | null; status?: StatusAfastamento | number | null };
export type BeneficiosListQuery = { empresaId?: Guid | null; filialId?: Guid | null };
export type ConcessoesListQuery = { empresaId?: Guid | null; filialId?: Guid | null; colaboradorId?: Guid | null };
export type EventosListQuery = { empresaId?: Guid | null; filialId?: Guid | null; colaboradorId?: Guid | null; competencia?: string | null };

// ---- Form value types ----
export type ColaboradorFormValues = {
    empresaId: string;
    filialId?: string | null;
    matricula: string;
    nome: string;
    cpf: string;
    cargoId: string;
    setorId?: string | null;
    jornadaId?: string | null;
    regime: RegimeTrabalho | number;
    salarioBase: number;
    dataAdmissao?: Date | null;
    dataNascimento?: Date | null;
    email?: string | null;
    telefone?: string | null;
};

export type DesligarColaboradorFormValues = { dataDemissao?: Date | null; motivo: string };

export type JornadaFormValues = {
    empresaId: string;
    filialId?: string | null;
    nome: string;
    descricao?: string | null;
    cargaHorariaSemanal: number;
    toleranciaMinutos?: number | null;
};

export type PontoFormValues = {
    colaboradorId: string;
    data?: Date | null;
    tipo: TipoMarcacaoPonto | number;
    origem: OrigemPonto | number;
    observacao?: string | null;
};

export type FeriasFormValues = {
    colaboradorId: string;
    dataInicio?: Date | null;
    dataFim?: Date | null;
    observacao?: string | null;
};

export type AfastamentoFormValues = {
    colaboradorId: string;
    tipo: TipoAfastamento | number;
    dataInicio?: Date | null;
    dataFimPrevista?: Date | null;
    motivo?: string | null;
};

export type BeneficioFormValues = {
    empresaId: string;
    filialId?: string | null;
    nome: string;
    tipo: TipoBeneficio | number;
    valor?: number | null;
    descricao?: string | null;
};

export type ConcessaoFormValues = {
    colaboradorId: string;
    beneficioId: string;
    dataInicio?: Date | null;
    valor?: number | null;
};

export type EventoRhFormValues = {
    colaboradorId: string;
    competencia: string;
    tipo: TipoEventoRh | number;
    codigo: string;
    descricao: string;
    valor: number;
    referencia?: string | null;
    origem: OrigemEventoRh | number;
};
