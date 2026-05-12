import { Guid, IsoDateTime, Inventario, ItemInventario, LocalEstoque, MovimentoEstoque, ReservaEstoque, EstoqueSaldo } from '@/types/erp';

export type EstoqueListQuery = {
    empresaId?: Guid | null;
    filialId?: Guid | null;
    termo?: string | null;
    produtoId?: Guid | null;
    localEstoqueId?: Guid | null;
    origemId?: Guid | null;
    inicio?: IsoDateTime | null;
    fim?: IsoDateTime | null;
};

export type LocalEstoqueResponse = LocalEstoque;
export type EstoqueSaldoResponse = EstoqueSaldo;
export type MovimentoEstoqueResponse = MovimentoEstoque;
export type ReservaEstoqueResponse = ReservaEstoque;
export type InventarioResponse = Inventario;
export type ItemInventarioResponse = ItemInventario;

export type CriarLocalEstoqueRequest = { empresaId: Guid; filialId?: Guid | null; codigo: string; nome: string; descricao?: string | null };
export type AtualizarLocalEstoqueRequest = { nome: string; descricao?: string | null };
export type MotivoRequest = { motivo: string };

export type MovimentoManualEstoqueRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    produtoId: Guid;
    localEstoqueId: Guid;
    quantidade: number;
    origemModulo: string;
    origemId?: Guid | null;
    documento?: string | null;
    motivo: string;
};

export type AjusteEstoqueRequest = Omit<MovimentoManualEstoqueRequest, 'quantidade'> & { quantidadeContada: number };

export type CriarReservaEstoqueRequest = {
    empresaId: Guid;
    filialId?: Guid | null;
    produtoId: Guid;
    localEstoqueId: Guid;
    quantidade: number;
    origemModulo: string;
    origemId?: Guid | null;
    observacao?: string | null;
};

export type BaixarReservaEstoqueRequest = {
    quantidade: number;
    origemModulo: string;
    origemId?: Guid | null;
    documento?: string | null;
    motivo: string;
};

export type CancelarReservaEstoqueRequest = { quantidade?: number | null; motivo: string };

export type AbrirInventarioRequest = { empresaId: Guid; filialId?: Guid | null; codigo: string; localEstoqueId: Guid; descricao?: string | null };
export type AdicionarItemInventarioRequest = { produtoId: Guid; quantidadeContada: number; observacao?: string | null };

export type LocalEstoqueFormValues = Partial<CriarLocalEstoqueRequest & AtualizarLocalEstoqueRequest> & { id?: Guid };
export type MovimentoEstoqueFormValues = Partial<MovimentoManualEstoqueRequest & AjusteEstoqueRequest>;
export type ReservaEstoqueFormValues = Partial<CriarReservaEstoqueRequest>;
export type BaixarReservaFormValues = Partial<BaixarReservaEstoqueRequest>;
export type CancelarReservaFormValues = Partial<CancelarReservaEstoqueRequest>;
export type InventarioFormValues = Partial<AbrirInventarioRequest>;
export type InventarioItemFormValues = Partial<AdicionarItemInventarioRequest>;
