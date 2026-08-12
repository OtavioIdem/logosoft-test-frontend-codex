'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { relatoriosApi } from '@/features/relatorios/api/relatoriosApi';
import { RelatorioAreaExportavel, RelatorioFormatoExportacao, RelatorioPeriodoQuery } from '@/features/relatorios/types/relatorios.types';

type RelatorioQuery = RelatorioPeriodoQuery | null;
const enabled = (query: RelatorioQuery, allowed = true) => allowed && Boolean(query?.empresaId && query.dataInicial && query.dataFinal);

export const relatoriosQueryKeys = {
    operacional: (query: RelatorioQuery) => ['relatorios', 'operacional', query] as const,
    vendas: (query: RelatorioQuery) => ['relatorios', 'gerenciais', 'vendas', query] as const,
    compras: (query: RelatorioQuery) => ['relatorios', 'gerenciais', 'compras', query] as const,
    financeiro: (query: RelatorioQuery) => ['relatorios', 'gerenciais', 'financeiro', query] as const,
    estoque: (query: RelatorioQuery) => ['relatorios', 'gerenciais', 'estoque', query] as const,
    fiscal: (query: RelatorioQuery) => ['relatorios', 'gerenciais', 'fiscal', query] as const,
    producao: (query: RelatorioQuery) => ['relatorios', 'gerenciais', 'producao', query] as const,
    dashboard: (query: RelatorioQuery) => ['relatorios', 'gerenciais', 'dashboard', query] as const
};

const requireQuery = (query: RelatorioQuery): RelatorioPeriodoQuery => { if (!query) throw new Error('Selecione uma empresa para consultar relatórios.'); return query; };
export const useRelatorioOperacional = (query: RelatorioQuery, allowed = true) => useQuery({ queryKey: relatoriosQueryKeys.operacional(query), queryFn: () => relatoriosApi.operacional(requireQuery(query)), enabled: enabled(query, allowed) });
export const useRelatorioGerencialVendas = (query: RelatorioQuery, allowed = true) => useQuery({ queryKey: relatoriosQueryKeys.vendas(query), queryFn: () => relatoriosApi.gerencialVendas(requireQuery(query)), enabled: enabled(query, allowed) });
export const useRelatorioGerencialCompras = (query: RelatorioQuery, allowed = true) => useQuery({ queryKey: relatoriosQueryKeys.compras(query), queryFn: () => relatoriosApi.gerencialCompras(requireQuery(query)), enabled: enabled(query, allowed) });
export const useRelatorioGerencialFinanceiro = (query: RelatorioQuery, allowed = true) => useQuery({ queryKey: relatoriosQueryKeys.financeiro(query), queryFn: () => relatoriosApi.gerencialFinanceiro(requireQuery(query)), enabled: enabled(query, allowed) });
export const useRelatorioGerencialEstoque = (query: RelatorioQuery, allowed = true) => useQuery({ queryKey: relatoriosQueryKeys.estoque(query), queryFn: () => relatoriosApi.gerencialEstoque(requireQuery(query)), enabled: enabled(query, allowed) });
export const useRelatorioGerencialFiscal = (query: RelatorioQuery, allowed = true) => useQuery({ queryKey: relatoriosQueryKeys.fiscal(query), queryFn: () => relatoriosApi.gerencialFiscal(requireQuery(query)), enabled: enabled(query, allowed) });
export const useRelatorioGerencialProducao = (query: RelatorioQuery, allowed = true) => useQuery({ queryKey: relatoriosQueryKeys.producao(query), queryFn: () => relatoriosApi.gerencialProducao(requireQuery(query)), enabled: enabled(query, allowed) });
export const useRelatorioDashboardConsolidado = (query: RelatorioQuery) => useQuery({ queryKey: relatoriosQueryKeys.dashboard(query), queryFn: () => relatoriosApi.dashboardConsolidado(requireQuery(query)), enabled: enabled(query) });

const baixarBlob = (blob: Blob, nomeArquivo: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const useExportarRelatorio = () =>
    useMutation({
        mutationFn: async ({ area, formato, query }: { area: RelatorioAreaExportavel; formato: RelatorioFormatoExportacao; query: RelatorioPeriodoQuery }) => {
            const blob = await relatoriosApi.exportar(area, formato, query);
            baixarBlob(blob, `relatorio-${area}.${formato}`);
            return true;
        }
    });
