import { StatusTabelaPreco, TabelaPrecoResponse } from '@/features/tabelas-preco/types/tabelasPreco.types';

// O backend serializa `Status` como número (sem `JsonStringEnumConverter`,
// `StatusTabelaPreco.cs`); a tabela não tem campo `Ativo` (V2 do inventário da b69). O único
// jeito correto de saber se está ativa é comparar `status` com `StatusTabelaPreco.Ativa`.
export const isTabelaAtiva = (tabela?: Pick<TabelaPrecoResponse, 'status'> | null) =>
    Number(tabela?.status) === StatusTabelaPreco.Ativa;
