import { describe, expect, it } from 'vitest';
import { isTabelaAtiva } from '@/features/tabelas-preco/components/tabelasPrecoUiUtils';
import { StatusTabelaPreco, TabelaPrecoResponse } from '@/features/tabelas-preco/types/tabelasPreco.types';

/**
 * AC-2: O status ativa/inativa de uma tabela vem do campo que o record entrega, não de `ativo` (V2).
 * AC-3: Item de tabela com `precoMinimo` e `margemPercentual` nulos renderiza sem erro e mostra "—".
 */

describe('tabelas-preco — AC-2: isTabelaAtiva com StatusTabelaPreco', () => {
    it('retorna true quando status é Ativa (2)', () => {
        const tabela: Pick<TabelaPrecoResponse, 'status'> = { status: StatusTabelaPreco.Ativa };
        expect(isTabelaAtiva(tabela)).toBe(true);
    });

    it('retorna false quando status é Rascunho (1)', () => {
        const tabela: Pick<TabelaPrecoResponse, 'status'> = { status: StatusTabelaPreco.Rascunho };
        expect(isTabelaAtiva(tabela)).toBe(false);
    });

    it('retorna false quando status é Inativa (3)', () => {
        const tabela: Pick<TabelaPrecoResponse, 'status'> = { status: StatusTabelaPreco.Inativa };
        expect(isTabelaAtiva(tabela)).toBe(false);
    });

    it('retorna false quando status é Expirada (4)', () => {
        const tabela: Pick<TabelaPrecoResponse, 'status'> = { status: StatusTabelaPreco.Expirada };
        expect(isTabelaAtiva(tabela)).toBe(false);
    });

    it('retorna false quando status é null', () => {
        const tabela: Pick<TabelaPrecoResponse, 'status'> = { status: null };
        expect(isTabelaAtiva(tabela)).toBe(false);
    });

    it('retorna false quando tabela é null ou undefined', () => {
        expect(isTabelaAtiva(null)).toBe(false);
        expect(isTabelaAtiva(undefined)).toBe(false);
    });

    it('aceita valor numérico direto (não apenas enum)', () => {
        const tabela: Pick<TabelaPrecoResponse, 'status'> = { status: 2 };
        expect(isTabelaAtiva(tabela)).toBe(true);
    });

    it('converte string numérica para comparação', () => {
        const tabela: Pick<TabelaPrecoResponse, 'status'> = { status: '2' as unknown as number };
        expect(isTabelaAtiva(tabela)).toBe(true);
    });
});
