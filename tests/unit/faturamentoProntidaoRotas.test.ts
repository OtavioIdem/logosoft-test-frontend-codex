import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { agruparPendenciasPorEtapa, PRONTIDAO_RECURSO_ROTA, rotaDoRecurso } from '@/features/faturamento/components/prontidaoRecursos';
import { prontidaoEtapaRotulo } from '@/features/faturamento/components/faturamentoLabels';
import { PRONTIDAO_RECURSOS, ProntidaoPendencia } from '@/features/faturamento/types/faturamento.types';

// AC-7 (D113): cada `recurso` conhecido vira link para a rota da tela; o mapa é fechado e cada rota aponta para
// uma página que existe em `app/(main)`. Recurso desconhecido aparece sem link (null), nunca quebra.

const APP_MAIN = resolve(process.cwd(), 'app', '(main)');

// Uma linha por recurso do backend (`ProntidaoRecursos`, 12 valores). Asserção nominal: se a rota mudar, o teste
// mostra qual recurso mudou.
const ROTAS_ESPERADAS: Record<(typeof PRONTIDAO_RECURSOS)[number], string> = {
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

const pendencia = (etapa: string, codigo: string, recurso = 'Produtos'): ProntidaoPendencia => ({ etapa, codigo, mensagem: `mensagem ${codigo}`, recurso, recursoId: null });

describe('prontidão — mapa recurso -> rota (AC-7)', () => {
    it('cobre exatamente os 12 recursos do backend, com a rota nominal de cada um', () => {
        expect(PRONTIDAO_RECURSO_ROTA).toEqual(ROTAS_ESPERADAS);
        expect(Object.keys(PRONTIDAO_RECURSO_ROTA).sort()).toEqual([...PRONTIDAO_RECURSOS].sort());
    });

    it.each(Object.entries(ROTAS_ESPERADAS))('%s resolve para %s', (recurso, rota) => {
        expect(rotaDoRecurso(recurso)).toBe(rota);
    });

    it('toda rota do mapa aponta para uma página que existe em app/(main)', () => {
        const ausentes = Object.entries(ROTAS_ESPERADAS)
            .filter(([, rota]) => !existsSync(join(APP_MAIN, ...rota.split('/').filter(Boolean), 'page.tsx')))
            .map(([recurso, rota]) => `${recurso} -> ${rota}`);
        expect(ausentes).toEqual([]);
    });

    it('recurso desconhecido devolve null (a pendência aparece sem link)', () => {
        expect(rotaDoRecurso('RecursoDoFuturo')).toBeNull();
        expect(rotaDoRecurso('')).toBeNull();
    });

    it.each(['toString', 'constructor', '__proto__', 'hasOwnProperty'])('propriedade herdada %s NÃO vira rota', (recurso) => {
        expect(rotaDoRecurso(recurso)).toBeNull();
    });
});

describe('prontidão — agrupamento por etapa (D113)', () => {
    it('agrupa na ordem dos legs e põe etapa desconhecida no fim, na ordem em que apareceu', () => {
        const entrada = [
            pendencia('Financeiro', 'f1', 'CondicoesPagamento'),
            pendencia('Zeta', 'z1', 'Inventado'),
            pendencia('Produto', 'p1'),
            pendencia('Pedido', 'd1', 'PedidoVenda'),
            pendencia('Produto', 'p2'),
            pendencia('Alfa', 'a1', 'Inventado'),
            pendencia('Emitente', 'e1', 'Empresas')
        ];

        const grupos = agruparPendenciasPorEtapa(entrada);

        expect(grupos.map((grupo) => grupo.etapa)).toEqual(['Pedido', 'Emitente', 'Produto', 'Financeiro', 'Zeta', 'Alfa']);
        expect(grupos.map((grupo) => grupo.pendencias.map((item) => item.codigo))).toEqual([['d1'], ['e1'], ['p1', 'p2'], ['f1'], ['z1'], ['a1']]);
    });

    it('dentro de uma etapa, preserva a ordem da resposta', () => {
        const grupos = agruparPendenciasPorEtapa([pendencia('Produto', 'p2'), pendencia('Produto', 'p1'), pendencia('Produto', 'p3')]);
        expect(grupos).toHaveLength(1);
        expect(grupos[0].pendencias.map((item) => item.codigo)).toEqual(['p2', 'p1', 'p3']);
    });

    it('sem pendências, não há grupo', () => {
        expect(agruparPendenciasPorEtapa([])).toEqual([]);
    });

    it('rótulo de etapa desconhecida é o próprio código; etapa conhecida tem rótulo amigável', () => {
        expect(prontidaoEtapaRotulo('Zeta')).toBe('Zeta');
        expect(prontidaoEtapaRotulo('Produto')).toBe('Produtos');
    });
});
