// Prontidão do faturamento (v1.11.0a8b82, D113): mapa fechado `recurso -> rota`, agrupamento por etapa e a regra
// que libera o Confirmar. Funções puras, sem React, para o teste de unidade provar cada decisão.

import {
    PRONTIDAO_AVALIACAO_RETOMADA,
    PRONTIDAO_ETAPAS,
    ProntidaoFaturamentoResponse,
    ProntidaoPendencia,
    ProntidaoRecursoConhecido
} from '@/features/faturamento/types/faturamento.types';

// Rota de cada recurso que o backend conhece (`ProntidaoRecursos`, 12 valores). Todas apontam para telas que já
// existem em `app/(main)`. `recursoId` NÃO monta URL: as telas de destino não abrem registro por query (D113).
// Estoque aponta para Entradas: a pendência típica é saldo insuficiente, que se resolve dando entrada.
export const PRONTIDAO_RECURSO_ROTA: Record<ProntidaoRecursoConhecido, string> = {
    Empresas: '/administracao/empresas',
    ConfiguracaoFiscal: '/fiscal/configuracao',
    Certificados: '/fiscal/configuracao',
    SeriesFiscais: '/fiscal/series',
    NaturezasOperacao: '/fiscal/naturezas-operacao',
    Produtos: '/produtos',
    Pessoas: '/pessoas',
    RegrasFiscais: '/fiscal/regras',
    Estoque: '/estoque/entradas',
    CondicoesPagamento: '/financeiro/condicoes-pagamento',
    PedidoVenda: '/vendas/pedidos',
    Faturamento: '/faturamento'
};

/** Rota do recurso, ou `null` para recurso desconhecido (a pendência aparece sem link, nunca quebra). */
export const rotaDoRecurso = (recurso: string): string | null =>
    Object.prototype.hasOwnProperty.call(PRONTIDAO_RECURSO_ROTA, recurso) ? PRONTIDAO_RECURSO_ROTA[recurso as ProntidaoRecursoConhecido] : null;

export type GrupoProntidao = { etapa: string; pendencias: ProntidaoPendencia[] };

/**
 * Agrupa por `etapa` na ordem do tipo (a ordem dos legs). Etapa que o frontend ainda não conhece vai depois das
 * conhecidas, na ordem em que apareceu; dentro do grupo vale a ordem da resposta.
 */
export const agruparPendenciasPorEtapa = (pendencias: readonly ProntidaoPendencia[]): GrupoProntidao[] => {
    const porEtapa = new Map<string, ProntidaoPendencia[]>();
    pendencias.forEach((pendencia) => {
        const lista = porEtapa.get(pendencia.etapa) ?? [];
        lista.push(pendencia);
        porEtapa.set(pendencia.etapa, lista);
    });

    const conhecidas = (PRONTIDAO_ETAPAS as readonly string[]).filter((etapa) => porEtapa.has(etapa));
    const desconhecidas = Array.from(porEtapa.keys()).filter((etapa) => !(PRONTIDAO_ETAPAS as readonly string[]).includes(etapa));
    return [...conhecidas, ...desconhecidas].map((etapa) => ({ etapa, pendencias: porEtapa.get(etapa) ?? [] }));
};

export const prontidaoEhRetomada = (resposta?: Pick<ProntidaoFaturamentoResponse, 'avaliacao'> | null) => resposta?.avaliacao === PRONTIDAO_AVALIACAO_RETOMADA;

export type EstadoProntidao = 'sem-pedido' | 'aguardando' | 'consultando' | 'erro' | 'pendente' | 'pronto';

/**
 * Estado que governa o Confirmar. `pronto` exige TUDO: resposta bem-sucedida da consulta dos parâmetros atuais
 * (a query não usa placeholderData, então `data` é sempre da chave corrente), nenhuma consulta em voo, nenhuma
 * mudança de formulário ainda esperando o debounce e `pronto === true` vindo do backend.
 */
export const estadoProntidao = (entrada: {
    temPedido: boolean;
    aguardandoDigitacao: boolean;
    isFetching: boolean;
    isError: boolean;
    isSuccess: boolean;
    data?: Pick<ProntidaoFaturamentoResponse, 'pronto'> | null;
}): EstadoProntidao => {
    if (!entrada.temPedido) return 'sem-pedido';
    if (entrada.aguardandoDigitacao) return 'aguardando';
    if (entrada.isFetching) return 'consultando';
    if (entrada.isError || !entrada.isSuccess || !entrada.data) return 'erro';
    return entrada.data.pronto === true ? 'pronto' : 'pendente';
};

export const confirmarLiberadoPelaProntidao = (estado: EstadoProntidao) => estado === 'pronto';

// Etapas cujas pendências, na consulta só com o pedido (painel do detalhe), existem por falta de parâmetro.
const ETAPAS_QUE_DEPENDEM_DO_CONFIRMAR: readonly string[] = ['Natureza', 'RegraFiscal'];
export const pendenciaDependeDoConfirmar = (pendencia: ProntidaoPendencia) => ETAPAS_QUE_DEPENDEM_DO_CONFIRMAR.includes(pendencia.etapa);
