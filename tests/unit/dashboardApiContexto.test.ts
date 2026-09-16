import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import { httpClient, rawHttpClient } from '@/lib/http/httpClient';

/**
 * DEF-3 / D42 (docs/arquitetura/DECISOES.md): os 5 controllers exigem `[FromQuery] Guid empresaId`
 * obrigatório — `ContasReceberController.cs:22`, `ContasPagarController.cs:22`,
 * `PedidosVendaController.cs:25`, `PedidosCompraController.cs:25`, `EstoqueController.cs:24`.
 * `AuditoriaController.cs:24` (eventos) não recebe empresa. `OrganizationalContextGuard.cs:14-18`
 * recusa `Guid.Empty` com "Empresa é obrigatória para operação multiempresa." — é essa mensagem que
 * o card repetia antes da correção, e que o aviso único desta fatia substitui.
 */

const SELECIONE_EMPRESA_WARNING = 'Selecione a empresa em "Selecionar contexto" para carregar os indicadores.';
const empresaId = '11111111-1111-1111-1111-111111111111';
const filialId = '22222222-2222-2222-2222-222222222222';

const ROTAS_POR_EMPRESA = ['/api/vendas/pedidos', '/api/financeiro/contas-receber', '/api/financeiro/contas-pagar', '/api/estoque/saldos', '/api/compras/pedidos'] as const;

type Chamada = { url: string; params?: Record<string, unknown> };

const instalarAdapters = () => {
    const chamadas: Chamada[] = [];
    httpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        chamadas.push({ url: config.url as string, params: config.params as Record<string, unknown> | undefined });
        return { data: [], status: 200, statusText: 'OK', headers: {}, config };
    });
    rawHttpClient.defaults.adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
        chamadas.push({ url: config.url as string, params: config.params as Record<string, unknown> | undefined });
        return { data: { status: 'ok' }, status: 200, statusText: 'OK', headers: {}, config };
    });
    return { chamadas, porRota: (url: string) => chamadas.find((chamada) => chamada.url === url) };
};

describe('dashboardApi.carregar — contexto organizacional (D42)', () => {
    const originalHttpAdapter = httpClient.defaults.adapter;
    const originalRawAdapter = rawHttpClient.defaults.adapter;

    afterEach(() => {
        httpClient.defaults.adapter = originalHttpAdapter;
        rawHttpClient.defaults.adapter = originalRawAdapter;
        vi.restoreAllMocks();
    });

    it('AC-1: com empresa e filial, as 5 rotas por empresa levam params { empresaId, filialId }', async () => {
        const { porRota } = instalarAdapters();

        await dashboardApi.carregar({ empresaId, filialId });

        expect(porRota('/api/vendas/pedidos')?.params).toEqual({ empresaId, filialId });
        expect(porRota('/api/financeiro/contas-receber')?.params).toEqual({ empresaId, filialId });
        expect(porRota('/api/financeiro/contas-pagar')?.params).toEqual({ empresaId, filialId });
        expect(porRota('/api/estoque/saldos')?.params).toEqual({ empresaId, filialId });
        expect(porRota('/api/compras/pedidos')?.params).toEqual({ empresaId, filialId });
    });

    it('AC-1: auditoria e health não levam empresaId', async () => {
        const { porRota } = instalarAdapters();

        await dashboardApi.carregar({ empresaId, filialId });

        expect(porRota('/api/auditoria/eventos')?.params).toBeUndefined();
        expect(porRota('/api/health')?.params).toBeUndefined();
    });

    it('AC-1: com empresa e sem filial, filialId fica ausente nos params das 5 rotas', async () => {
        const { porRota } = instalarAdapters();

        await dashboardApi.carregar({ empresaId, filialId: null });

        expect(porRota('/api/vendas/pedidos')?.params).toEqual({ empresaId });
        expect(porRota('/api/financeiro/contas-receber')?.params).toEqual({ empresaId });
        expect(porRota('/api/financeiro/contas-pagar')?.params).toEqual({ empresaId });
        expect(porRota('/api/estoque/saldos')?.params).toEqual({ empresaId });
        expect(porRota('/api/compras/pedidos')?.params).toEqual({ empresaId });
        ROTAS_POR_EMPRESA.forEach((rota) => expect(porRota(rota)?.params).not.toHaveProperty('filialId'));
    });

    it('AC-2: sem empresa, nenhuma das 5 rotas por empresa é chamada; auditoria continua chamada', async () => {
        const { chamadas } = instalarAdapters();

        await dashboardApi.carregar({ empresaId: null, filialId: null });

        ROTAS_POR_EMPRESA.forEach((rota) => expect(chamadas.some((chamada) => chamada.url === rota)).toBe(false));
        expect(chamadas.some((chamada) => chamada.url === '/api/auditoria/eventos')).toBe(true);
        expect(chamadas.some((chamada) => chamada.url === '/api/health')).toBe(true);
    });

    it('AC-2: sem empresa, os 5 cards por empresa ficam unavailable (auditoria não)', async () => {
        instalarAdapters();

        const resultado = await dashboardApi.carregar({ empresaId: null, filialId: null });

        const chaveDeRota: Record<(typeof ROTAS_POR_EMPRESA)[number], string> = {
            '/api/vendas/pedidos': 'vendas',
            '/api/financeiro/contas-receber': 'receber',
            '/api/financeiro/contas-pagar': 'pagar',
            '/api/estoque/saldos': 'estoque',
            '/api/compras/pedidos': 'compras'
        };
        Object.values(chaveDeRota).forEach((key) => {
            const metric = resultado.metrics.find((item) => item.key === key);
            expect(metric?.unavailable).toBe(true);
        });
        expect(resultado.metrics.find((item) => item.key === 'auditoria')?.unavailable).toBe(false);
    });

    it('AC-2: aviso de empresa aparece exatamente uma vez, e o aviso do backend não aparece', async () => {
        instalarAdapters();

        const resultado = await dashboardApi.carregar({ empresaId: null, filialId: null });

        expect(resultado.warnings.filter((warning) => warning === SELECIONE_EMPRESA_WARNING)).toHaveLength(1);
        expect(resultado.warnings.some((warning) => warning.includes('Empresa é obrigatória'))).toBe(false);
    });
});
