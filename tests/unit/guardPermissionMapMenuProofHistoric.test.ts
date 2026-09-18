import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Prova histórica do gate de menu (C2 e C3).
 *
 * POR QUE ESTE ARQUIVO EXISTE: o gate C2 (hierarquia de menu) e C3 (rota vs regra)
 * foram entregues "verdes" porque o parser estava cego — não conseguia ler o menu
 * da AST (assumia rótulo e permissão na mesma linha, que não era o caso).
 *
 * Este teste executa a análise contra a árvore antiga (66a69b5~1) que contém os
 * defeitos conhecidos, e prova que eles são acusados (prova vermelha).
 * Também prova que a árvore atual está limpa.
 */

// No Windows, execSync roda via cmd.exe, onde '^' é caractere de escape — uma ref
// como '66a69b5^' não chega ao git como "pai de 66a69b5", e a worktree acaba criada
// na própria árvore corrigida. '~1' não usa caractere de escape do cmd.exe.
const REF_COM_DEFEITOS = '66a69b5~1';

/**
 * Os 16 pares de menu + 1 de rota que a b53 corrigiu, nominalmente.
 * Medidos pela sessão principal via análise em b53 e confirmados em git diff.
 */
const PARESLEGITIMOS = [
  // Cadastros (7)
  { grupo: 'Cadastros', permissao: 'CATEGORIAS_PRODUTO_GERENCIAR' },
  { grupo: 'Cadastros', permissao: 'CLIENTES_GERENCIAR' },
  { grupo: 'Cadastros', permissao: 'FORNECEDORES_GERENCIAR' },
  { grupo: 'Cadastros', permissao: 'MARCAS_GERENCIAR' },
  { grupo: 'Cadastros', permissao: 'PESSOAS_GERENCIAR' },
  { grupo: 'Cadastros', permissao: 'PRODUTOS_GERENCIAR' },
  { grupo: 'Cadastros', permissao: 'UNIDADES_MEDIDA_GERENCIAR' },
  // Compras (3)
  { grupo: 'Compras', permissao: 'COMPRAS_CONFERENCIA_FISCAL_REGISTRAR' },
  { grupo: 'Compras', permissao: 'COMPRAS_COTACOES_GERENCIAR' },
  { grupo: 'Compras', permissao: 'COMPRAS_SOLICITACOES_GERENCIAR' },
  // Estoque (3)
  { grupo: 'Estoque', permissao: 'ESTOQUE_AJUSTAR' },
  { grupo: 'Estoque', permissao: 'ESTOQUE_BLOQUEIO_GERENCIAR' },
  { grupo: 'Estoque', permissao: 'LOCAIS_ESTOQUE_GERENCIAR' },
  // Financeiro (3)
  { grupo: 'Financeiro', permissao: 'CONDICOES_PAGAMENTO_GERENCIAR' },
  { grupo: 'Financeiro', permissao: 'FINANCEIRO_FLUXO_CAIXA_CONSULTAR' },
  { grupo: 'Financeiro', permissao: 'FORMAS_PAGAMENTO_GERENCIAR' },
  // C3: rota fora da regra (menuForaDaRegra)
  { rota: '/estoque/locais', permissao: 'LOCAIS_ESTOQUE_GERENCIAR', tipo: 'c3' }
] as const;

const paresC2 = PARESLEGITIMOS.filter((par: any) => par.tipo !== 'c3') as ReadonlyArray<{
  grupo: string;
  permissao: string;
}>;

const paresC3 = PARESLEGITIMOS.filter((par: any) => par.tipo === 'c3') as ReadonlyArray<{
  rota: string;
  permissao: string;
  tipo: 'c3';
}>;

const raizDoProjeto = process.cwd();

// Sequência que só existe no array anyPermissions do pai "Cadastros" depois que a b53
// deu a ele todas as permissões dos filhos — antes da correção, PESSOAS_GERENCIAR e
// CLIENTES_CONSULTAR não apareciam lado a lado nessa ordem no AppMenu.tsx.
const SEQUENCIA_CORRIGIDA = "'PESSOAS_GERENCIAR', 'CLIENTES_CONSULTAR'";

/**
 * Divergências acusadas pela análise em uma árvore
 */
const divergenciasEm = async (raiz: string): Promise<{
  c2: Array<{ grupo: string; permissao: string }>;
  c3: Array<{ rota: string; permissao: string }>;
  hierarchy: number;
}> => {
  const lib = await import(
    path.join(raizDoProjeto, 'scripts/lib/guard-permission-map.mjs').replace(/\\/g, '/')
  );
  const inputs = lib.readGuardPermissionMapInputs(raiz);
  const divergencias = lib.analyzeGuardDivergences(inputs);

  return {
    c2: (divergencias.menuHierarquia ?? []).map((item: any) => ({
      grupo: item.group,
      permissao: item.permission
    })),
    c3: (divergencias.menuForaDaRegra ?? []).map((item: any) => ({
      rota: item.rota,
      permissao: item.permission
    })),
    hierarchy: inputs.menuData.hierarchy.length
  };
};

describe('Gate de menu (C2 e C3) — prova histórica da b53', () => {
  let arvoreAntiga = '';
  let divergenciasNaArvoreAntiga: Awaited<ReturnType<typeof divergenciasEm>> = { c2: [], c3: [], hierarchy: 0 };
  let divergenciasHoje: Awaited<ReturnType<typeof divergenciasEm>> = { c2: [], c3: [], hierarchy: 0 };
  let hierarchyCountAtuais = 0;

  beforeAll(async () => {
    const destino = path.join(mkdtempSync(path.join(tmpdir(), 'gate-prova-menu-')), 'b53');
    execSync(`git worktree add --detach "${destino}" ${REF_COM_DEFEITOS}`, {
      cwd: raizDoProjeto,
      stdio: 'pipe'
    });
    arvoreAntiga = destino;

    divergenciasNaArvoreAntiga = await divergenciasEm(arvoreAntiga);
    divergenciasHoje = await divergenciasEm(raizDoProjeto);
    hierarchyCountAtuais = divergenciasHoje.hierarchy;
  }, 120_000);

  afterAll(() => {
    if (!arvoreAntiga) return;
    try {
      execSync(`git worktree remove --force "${arvoreAntiga}"`, {
        cwd: raizDoProjeto,
        stdio: 'pipe'
      });
    } catch {
      if (existsSync(arvoreAntiga)) rmSync(arvoreAntiga, { recursive: true, force: true });
    }
  });

  it('a árvore de referência (66a69b5~1) é anterior à b53', () => {
    const appMenuAntigo = readFileSync(
      path.join(arvoreAntiga, 'layout/AppMenu.tsx'),
      'utf8'
    );
    const appMenuAtual = readFileSync(
      path.join(raizDoProjeto, 'layout/AppMenu.tsx'),
      'utf8'
    );

    // A árvore antiga ainda não tem a correção do pai "Cadastros": a sequência só
    // aparece depois que a b53 juntou as permissões dos filhos no anyPermissions do pai.
    expect(appMenuAntigo.includes(SEQUENCIA_CORRIGIDA)).toBe(false);
    expect(appMenuAtual.includes(SEQUENCIA_CORRIGIDA)).toBe(true);
  });

  describe('C2: Hierarquia de menu', () => {
    it.each(paresC2)('árvore antiga acusa $grupo — $permissao', ({ grupo, permissao }) => {
      const acusado = divergenciasNaArvoreAntiga.c2.some(
        (item) => item.grupo === grupo && item.permissao === permissao
      );
      expect(acusado).toBe(true);
    });

    it.each(paresC2)('árvore atual não acusa $grupo — $permissao', ({ grupo, permissao }) => {
      const acusado = divergenciasHoje.c2.some(
        (item) => item.grupo === grupo && item.permissao === permissao
      );
      expect(acusado).toBe(false);
    });
  });

  describe('C3: Validação de rota vs regra', () => {
    it.each(paresC3)('árvore antiga acusa $rota — $permissao (fora da regra)', ({ rota, permissao }) => {
      const acusado = divergenciasNaArvoreAntiga.c3.some(
        (item) => item.rota === rota && item.permissao === permissao
      );
      expect(acusado).toBe(true);
    });

    it.each(paresC3)('árvore atual não acusa $rota — $permissao (fora da regra)', ({ rota, permissao }) => {
      const acusado = divergenciasHoje.c3.some(
        (item) => item.rota === rota && item.permissao === permissao
      );
      expect(acusado).toBe(false);
    });
  });

  describe('Contagem de itens do menu', () => {
    it('parser enumera 84 itens na árvore atual', () => {
      expect(hierarchyCountAtuais).toBe(84); // b58: +1 "Séries fiscais"
    });
  });
});
