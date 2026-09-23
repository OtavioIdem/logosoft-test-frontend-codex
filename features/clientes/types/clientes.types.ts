import { EntityStatus, Guid } from '@/types/erp';

export type ClienteListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
};

export type ClienteResponse = {
    id: Guid;
    empresaId: Guid;
    filialId: Guid | null;
    pessoaId: Guid;
    codigo: string;
    limiteCredito: number;
    creditoBloqueado: boolean;
    motivoBloqueioCredito: string | null;
    observacao: string | null;
    tabelaPrecoPadraoId: Guid | null;
    condicaoPagamentoPadraoId: Guid | null;
    classificacaoId: Guid | null;
    diaVencimentoPreferencial: number | null;
    permiteVendaAPrazo: boolean;
    status: EntityStatus;
};

export type CriarClienteRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    pessoaId: Guid;
    codigo: string;
    limiteCredito: number;
    observacao?: string | null;
};

export type AtualizarClienteRequest = {
    limiteCredito: number;
    observacao?: string | null;
};

export type ClienteMotivoRequest = {
    motivo: string;
};

// PUT /api/clientes/{id}/configuracao-comercial substitui o bloco inteiro (D62): os três Ids e o
// número são `Guid?`/`int?` no C# (sempre anuláveis, nunca ausentes) e `permiteVendaAPrazo` é `bool`
// não anulável — omitir qualquer chave apaga o vínculo gravado ou vira `false` sem erro no backend.
export type ConfigurarComercialClienteRequest = {
    tabelaPrecoPadraoId: Guid | null;
    condicaoPagamentoPadraoId: Guid | null;
    classificacaoId: Guid | null;
    diaVencimentoPreferencial: number | null;
    permiteVendaAPrazo: boolean;
};

export type ClienteFormValues = Partial<CriarClienteRequest & AtualizarClienteRequest & ConfigurarComercialClienteRequest> & { id?: Guid };
