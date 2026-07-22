'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { relatoriosApi } from '@/features/relatorios/api/relatoriosApi';
import { RelatorioAreaExportavel, RelatorioFormatoExportacao, RelatorioPeriodoQuery } from '@/features/relatorios/types/relatorios.types';

const enabled = (query: RelatorioPeriodoQuery) => Boolean(query.dataInicial && query.dataFinal);

export const relatoriosQueryKeys = {
    operacional: (query: RelatorioPeriodoQuery) => ['relatorios', 'operacional', query] as const,
    vendas: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'vendas', query] as const,
    compras: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'compras', query] as const,
    financeiro: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'financeiro', query] as const,
    estoque: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'estoque', query] as const,
    fiscal: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'fiscal', query] as const,
    producao: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'producao', query] as const,
    dashboard: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'dashboard', query] as const
};

export const useRelatorioOperacional = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.operacional(query), queryFn: () => relatoriosApi.operacional(query), enabled: enabled(query) });
export const useRelatorioGerencialVendas = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.vendas(query), queryFn: () => relatoriosApi.gerencialVendas(query), enabled: enabled(query) });
export const useRelatorioGerencialCompras = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.compras(query), queryFn: () => relatoriosApi.gerencialCompras(query), enabled: enabled(query) });
export const useRelatorioGerencialFinanceiro = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.financeiro(query), queryFn: () => relatoriosApi.gerencialFinanceiro(query), enabled: enabled(query) });
export const useRelatorioGerencialEstoque = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.estoque(query), queryFn: () => relatoriosApi.gerencialEstoque(query), enabled: enabled(query) });
export const useRelatorioGerencialFiscal = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.fiscal(query), queryFn: () => relatoriosApi.gerencialFiscal(query), enabled: enabled(query) });
export const useRelatorioGerencialProducao = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.producao(query), queryFn: () => relatoriosApi.gerencialProducao(query), enabled: enabled(query) });
export const useRelatorioDashboardConsolidado = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.dashboard(query), queryFn: () => relatoriosApi.dashboardConsolidado(query), enabled: enabled(query) });

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
