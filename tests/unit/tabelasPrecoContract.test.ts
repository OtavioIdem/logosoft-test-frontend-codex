import { describe, expect, it, vi } from 'vitest';
import { tabelasPrecoApi } from '@/features/tabelas-preco/api/tabelasPrecoApi';
import { httpClient } from '@/lib/http/httpClient';

/**
 * AC-1: Com `GET /api/tabelas-preco` respondendo `{ resultado: { items, ... } }` no formato de
 * `TabelaPrecoPagedResponse`, a tela lista as tabelas e a paginação mostra o total.
 *
 * O backend (TabelasPrecoResponses.cs:44) envolve PagedResult em um envelope `resultado`.
 * O client deve desembrulhar e normalizar isso para trabalhar corretamente (D77).
 */

vi.mock('@/lib/http/httpClient');

describe('tabelas-preco — AC-1: contract com envelope resultado', () => {
    it('desembrulha { resultado: PagedResult } do backend e retorna PagedResult normalizado', async () => {
        const mockResponse = {
            resultado: {
                items: [
                    {
                        id: '11111111-1111-1111-1111-111111111111',
                        empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                        nome: 'Tabela A',
                        dataInicioVigencia: '2026-01-01',
                        dataFimVigencia: null,
                        padrao: false,
                        status: 2
                    },
                    {
                        id: '22222222-2222-2222-2222-222222222222',
                        empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                        nome: 'Tabela B',
                        dataInicioVigencia: '2026-01-01',
                        dataFimVigencia: null,
                        padrao: true,
                        status: 3
                    }
                ],
                page: 1,
                pageSize: 10,
                totalItems: 2,
                totalPages: 1
            }
        };

        vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockResponse } as never);

        const result = await tabelasPrecoApi.listar({ page: 1, pageSize: 10 });

        expect(result.items).toHaveLength(2);
        expect(result.items[0].nome).toBe('Tabela A');
        expect(result.items[1].nome).toBe('Tabela B');
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(result.totalItems).toBe(2);
        expect(result.totalPages).toBe(1);
    });

    it('normaliza array puro em PagedResult com totalItems = length', async () => {
        const mockArray = [
            {
                id: '11111111-1111-1111-1111-111111111111',
                empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                nome: 'Tabela A',
                dataInicioVigencia: '2026-01-01',
                padrao: false,
                status: 2
            }
        ];

        vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockArray } as never);

        const result = await tabelasPrecoApi.listar({ page: 1, pageSize: 10 });

        expect(result.items).toHaveLength(1);
        expect(result.totalItems).toBe(1);
    });

    it('normaliza PagedResult na raiz diretamente', async () => {
        const mockPaged = {
            items: [{ id: '11111111-1111-1111-1111-111111111111', empresaId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', nome: 'Tabela A', dataInicioVigencia: '2026-01-01', padrao: false, status: 2 }],
            page: 1,
            pageSize: 10,
            totalItems: 1,
            totalPages: 1
        };

        vi.mocked(httpClient.get).mockResolvedValueOnce({ data: mockPaged } as never);

        const result = await tabelasPrecoApi.listar({ page: 1, pageSize: 10 });

        expect(result.items).toHaveLength(1);
        expect(result.totalItems).toBe(1);
    });
});
