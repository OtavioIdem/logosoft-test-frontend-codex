'use client';

import { useQuery } from '@tanstack/react-query';
import { relatoriosApi } from '@/features/relatorios/api/relatoriosApi';
import { RelatorioPeriodoQuery } from '@/features/relatorios/types/relatorios.types';

const enabled = (query: RelatorioPeriodoQuery) => Boolean(query.dataInicial && query.dataFinal);

export const relatoriosQueryKeys = {
    operacional: (query: RelatorioPeriodoQuery) => ['relatorios', 'operacional', query] as const,
    vendas: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'vendas', query] as const,
    compras: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'compras', query] as const,
    financeiro: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'financeiro', query] as const,
    estoque: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'estoque', query] as const,
    fiscal: (query: RelatorioPeriodoQuery) => ['relatorios', 'gerenciais', 'fiscal', query] as const
};

export const useRelatorioOperacional = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.operacional(query), queryFn: () => relatoriosApi.operacional(query), enabled: enabled(query) });
export const useRelatorioGerencialVendas = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.vendas(query), queryFn: () => relatoriosApi.gerencialVendas(query), enabled: enabled(query) });
export const useRelatorioGerencialCompras = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.compras(query), queryFn: () => relatoriosApi.gerencialCompras(query), enabled: enabled(query) });
export const useRelatorioGerencialFinanceiro = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.financeiro(query), queryFn: () => relatoriosApi.gerencialFinanceiro(query), enabled: enabled(query) });
export const useRelatorioGerencialEstoque = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.estoque(query), queryFn: () => relatoriosApi.gerencialEstoque(query), enabled: enabled(query) });
export const useRelatorioGerencialFiscal = (query: RelatorioPeriodoQuery) => useQuery({ queryKey: relatoriosQueryKeys.fiscal(query), queryFn: () => relatoriosApi.gerencialFiscal(query), enabled: enabled(query) });
