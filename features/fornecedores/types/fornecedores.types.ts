import { EntityStatus, Guid } from '@/types/erp';

export type FornecedorListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
};

export type FornecedorResponse = {
    id: Guid;
    empresaId: Guid;
    filialId: Guid | null;
    pessoaId: Guid;
    codigo: string;
    observacao: string | null;
    condicaoPagamentoPadraoId: Guid | null;
    prazoEntregaMedio: number | null;
    homologado: boolean;
    categoriaFornecimento: string | null;
    status: EntityStatus;
};

export type CriarFornecedorRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    pessoaId: Guid;
    codigo: string;
    observacao?: string | null;
};

export type AtualizarFornecedorRequest = {
    observacao?: string | null;
};

export type FornecedorMotivoRequest = {
    motivo: string;
};

// PUT /api/fornecedores/{id}/configuracao-compra substitui o bloco inteiro (D62), mesma trava
// estrutural do Cliente: os três campos vão sempre, nunca `undefined` (omitir apaga/zera no backend).
export type ConfigurarCompraFornecedorRequest = {
    condicaoPagamentoPadraoId: Guid | null;
    prazoEntregaMedio: number | null;
    categoriaFornecimento: string | null;
};

// POST /api/fornecedores/{id}/revogar-homologacao — homologar não tem request (POST sem corpo, D63).
export type RevogarHomologacaoFornecedorRequest = {
    motivo: string;
};

export type FornecedorFormValues = Partial<CriarFornecedorRequest & AtualizarFornecedorRequest & ConfigurarCompraFornecedorRequest> & { id?: Guid };
