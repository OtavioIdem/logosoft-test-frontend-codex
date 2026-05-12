import { BaseOperationalRecord, CentroCusto, Cargo, Empresa, Filial, Guid, Setor } from '@/types/erp';

export type AdministracaoListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
};

export type AdministracaoRecord = BaseOperationalRecord & Record<string, unknown>;

export type EmpresaResponse = Empresa;
export type FilialResponse = Filial;
export type SetorResponse = Setor;
export type CargoResponse = Cargo;
export type CentroCustoResponse = CentroCusto;

export type CriarEmpresaRequest = { razaoSocial: string; nomeFantasia?: string | null; documento: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null };
export type AtualizarEmpresaRequest = { razaoSocial: string; nomeFantasia?: string | null; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null };
export type CriarFilialRequest = { empresaId: Guid; nome: string; documento: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null };
export type AtualizarFilialRequest = { nome: string; inscricaoEstadual?: string | null; inscricaoMunicipal?: string | null };
export type CriarSetorRequest = { empresaId: Guid; filialId?: Guid | null; nome: string; descricao?: string | null };
export type AtualizarSetorRequest = { nome: string; descricao?: string | null };
export type CriarCargoRequest = { empresaId: Guid; filialId?: Guid | null; setorId?: Guid | null; nome: string; descricao?: string | null; nivelHierarquico: number };
export type AtualizarCargoRequest = { setorId?: Guid | null; nome: string; descricao?: string | null; nivelHierarquico: number };
export type CriarCentroCustoRequest = { empresaId: Guid; filialId?: Guid | null; codigo: string; nome: string; descricao?: string | null };
export type AtualizarCentroCustoRequest = { nome: string; descricao?: string | null };
export type InativarAdministracaoRequest = { motivo: string };
export type AdministracaoFormValues = Record<string, unknown> & { id?: Guid };
