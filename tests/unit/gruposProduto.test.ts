import { describe, expect, it } from 'vitest';
import { buildGrupoProdutoTreeRows } from '@/features/produtos/components/GruposProdutoPage';
import { GrupoProdutoResponse } from '@/features/produtos/types/produtos.types';

const grupo = (id: string, codigo: string, grupoPaiId: string | null = null): GrupoProdutoResponse => ({
    id, empresaId: '11111111-1111-1111-1111-111111111111', codigo, descricao: codigo, grupoPaiId, nivel: grupoPaiId ? 2 : 1,
    exigeNcm: true, descontoMaximoPercentual: 0, controlaEstoque: false, controlaEstoqueContabil: true, status: 1
});

describe('buildGrupoProdutoTreeRows', () => {
    it('monta a árvore pelo grupoPaiId e ordena irmãos pelo código', () => {
        const rows = buildGrupoProdutoTreeRows([grupo('filho-b', 'B', 'raiz'), grupo('raiz', 'R'), grupo('filho-a', 'A', 'raiz')]);
        expect(rows.map(({ id, depth }) => [id, depth])).toEqual([['raiz', 0], ['filho-a', 1], ['filho-b', 1]]);
    });

    it('mantém grupo cujo pai não veio na página visível para operação', () => {
        const rows = buildGrupoProdutoTreeRows([grupo('orfao', 'O', 'ausente')]);
        expect(rows).toHaveLength(1);
        expect(rows[0].depth).toBe(0);
    });
});
