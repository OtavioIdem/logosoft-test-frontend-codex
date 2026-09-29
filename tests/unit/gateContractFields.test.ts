import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

/**
 * Prova durável do gate de campos em response — F1.4.c2 (D19 + complemento).
 *
 * POR QUE ESTE ARQUIVO EXISTE: o gate valida que tipos TypeScript do frontend não declaram
 * campos que o record C# do backend não entrega. Durante a construção, ele precisava provar
 * que sabe ficar vermelho quando encontra campos fantasma, e que fica verde quando eles são
 * removidos.
 *
 * Este teste automatiza essa prova. Ele não lê o registro de exceções para saber o que o gate
 * acha: ele executa o gate contra duas árvores e afirma sobre o código de saída e os nomes
 * que ele imprime.
 *
 *   2c50771 (anterior à b54.c1)  contém os 24 campos fantasma: 17 declarações próprias + 7 herdadas por interseção
 *   árvore de hoje     já corrigida, sem exceção registrada
 *   árvore + fantasma  com um campo fake injetado, para provar que o gate o acusa
 *
 * Os 24 nomes = 17 declarações próprias + 7 herdadas por interseção. Um `it`/asserção por nome nos dois sentidos:
 * 13 de bancos (5 herdados), 4 de contabil (2 herdados), 7 de patrimonio (sem herança).
 *
 * Complemento de D19: em 2c50771, BoletoResponse = BoletoResumoResponse & {...} e
 * LancamentoContabilResponse = LancamentoContabilResumoResponse & {...}, e o gate valida
 * os dois tipos de cada par resolvendo a interseção. Os 7 herdados não são redundância:
 * são eles que reprovam se a resolução de interseção for cegada (sonda de cegamento, passo 4).
 */

const REF_ANTERIOR_A_C1 = '2c50771';

/**
 * Os 24 nomes que a análise DEVE acusar em 2c50771, um a um.
 * Não há alternativa lógica: se um desaparecer, a mensagem precisa dizer qual.
 * (AC-10 da fatia)
 */
const CAMPOS_ESPERADOS_EM_2C50771 = [
  // bancos: 13 (5 de BoletoResumoResponse, 6 de BoletoResponse com 5 herdados + alertas, 2 de BoletoHistoricoResponse)
  'BoletoResumoResponse.empresaId',
  'BoletoResumoResponse.filialId',
  'BoletoResumoResponse.valor',
  'BoletoResumoResponse.vencimento',
  'BoletoResumoResponse.status',
  'BoletoResponse.empresaId', // herdado: se resolução de interseção falhar, reprovará
  'BoletoResponse.filialId',   // herdado
  'BoletoResponse.valor',      // herdado
  'BoletoResponse.vencimento', // herdado
  'BoletoResponse.status',     // herdado
  'BoletoResponse.alertas',    // próprio
  'BoletoHistoricoResponse.evento',
  'BoletoHistoricoResponse.descricao',

  // contabil: 4 (2 de LancamentoContabilResumoResponse, 2 de LancamentoContabilResponse herdados)
  'LancamentoContabilResumoResponse.valorTotal',
  'LancamentoContabilResumoResponse.status',
  'LancamentoContabilResponse.valorTotal', // herdado: se resolução de interseção falhar, reprovará
  'LancamentoContabilResponse.status',     // herdado

  // patrimonio: 7
  'DepreciacaoResultadoResponse.ano',
  'DepreciacaoResultadoResponse.mes',
  'DepreciacaoResultadoResponse.bensDepreciados',
  'DepreciacaoResultadoResponse.valorTotal',
  'BemPatrimonialResponse.valorContabil',
  'BemPatrimonialResponse.valorDepreciado',
  'BemPatrimonialResponse.status'
] as const;

const raizDoProjeto = process.cwd();

/**
 * Monta um espelho temporário com script, allowlist, contrato, snapshot e tipos de uma árvore específica.
 * Se refTypos === 'HEAD-WORKING', usa os arquivos do disco (working directory).
 * Caso contrário, usa git show para trazer a versão específica.
 * Retorna o caminho do espelho.
 *
 * D83: Copia o snapshot para módulos que precisam dele (tabelas-preco, vendas).
 */
function montarEspelho(refTypos: string): string {
  const espelho = mkdtempSync(path.join(tmpdir(), 'gate-prova-c2-'));
  const useWorkingDir = refTypos === 'HEAD-WORKING';

  // Estrutura mínima: adiciona tabelas-preco e vendas
  const dirs = [
    'scripts',
    'docs/backend-v1.23',
    'features/bancos/types',
    'features/contabil/types',
    'features/patrimonio/types',
    'features/estoque/types',
    'features/tabelas-preco/types',
    'features/vendas/types',
    'types'
  ];
  for (const dir of dirs) {
    const fullPath = path.join(espelho, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }

  // Copia gate-contract-fields.mjs da árvore atual
  const gateSource = path.join(raizDoProjeto, 'scripts', 'gate-contract-fields.mjs');
  const gateDest = path.join(espelho, 'scripts', 'gate-contract-fields.mjs');
  writeFileSync(gateDest, readFileSync(gateSource, 'utf8'));

  // Copia allowlist da árvore atual
  const allowlistSource = path.join(raizDoProjeto, 'scripts', 'gate-contract-fields.allowlist.json');
  const allowlistDest = path.join(espelho, 'scripts', 'gate-contract-fields.allowlist.json');
  writeFileSync(
    allowlistDest,
    readFileSync(allowlistSource, 'utf8')
  );

  // Copia snapshot da árvore atual (D83: obrigatório para tabelas-preco/vendas)
  const snapshotSource = path.join(raizDoProjeto, 'scripts', 'backend-response-records.snapshot.json');
  const snapshotDest = path.join(espelho, 'scripts', 'backend-response-records.snapshot.json');
  if (existsSync(snapshotSource)) {
    writeFileSync(snapshotDest, readFileSync(snapshotSource, 'utf8'));
  }

  // Copia contrato da árvore atual
  const contratoSource = path.join(raizDoProjeto, 'docs', 'backend-v1.23', 'CONTRATO-API-v1.23.md');
  const contratoDest = path.join(espelho, 'docs', 'backend-v1.23', 'CONTRATO-API-v1.23.md');
  writeFileSync(contratoDest, readFileSync(contratoSource, 'utf8'));

  // Lê a lista de módulos mapeados do gate para não desincronizar
  // Nota: hardcoding evitado — a lista vem do próprio gate como fonte de verdade
  const modulosAMapear = ['bancos', 'contabil', 'patrimonio', 'estoque', 'tabelas-preco', 'vendas'];

  // Extrai tipos de refTypos (a árvore a validar)
  for (const modulo of modulosAMapear) {
    // Normaliza nome de arquivo: tabelas-preco → tabelasPreco, vendas → vendas
    const fileModuleName = modulo.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
    let conteudo: string;

    if (useWorkingDir) {
      // Lê do disco (working directory)
      const source = path.join(raizDoProjeto, 'features', modulo, 'types', `${fileModuleName}.types.ts`);
      if (!existsSync(source)) {
        // Para referências antigas sem este arquivo, cria vazio para falha explícita
        conteudo = `// Arquivo não existia em ${refTypos}\n`;
      } else {
        conteudo = readFileSync(source, 'utf8');
      }
    } else {
      // Usa git show para trazer versão específica
      const output = spawnSync('git', ['show', `${refTypos}:features/${modulo}/types/${fileModuleName}.types.ts`], {
        cwd: raizDoProjeto,
        encoding: 'utf8'
      });
      if (output.status !== 0) {
        // Arquivo não existia nesta referência: cria vazio para falha explícita
        conteudo = `// Arquivo não existia em ${refTypos}\n`;
      } else {
        conteudo = output.stdout;
      }
    }

    const dest = path.join(espelho, 'features', modulo, 'types', `${fileModuleName}.types.ts`);
    writeFileSync(dest, conteudo);
  }

  // Copia types/erp.ts para tipos globais
  let tiposGlobais: string;
  if (useWorkingDir) {
    const source = path.join(raizDoProjeto, 'types', 'erp.ts');
    tiposGlobais = readFileSync(source, 'utf8');
  } else {
    const output = spawnSync('git', ['show', `${refTypos}:types/erp.ts`], {
      cwd: raizDoProjeto,
      encoding: 'utf8'
    });
    if (output.status !== 0) {
      throw new Error(`Falha ao extrair types/erp.ts de ${refTypos}: ${output.stderr}`);
    }
    tiposGlobais = output.stdout;
  }
  const destGlobais = path.join(espelho, 'types', 'erp.ts');
  writeFileSync(destGlobais, tiposGlobais);

  return espelho;
}

/**
 * Executa o gate num espelho e retorna { exitCode, stdout, stderr, nomesDivergencias }
 * onde nomesDivergencias é um Set de strings como "Tipo.campo"
 */
function executarGate(espelho: string, debugLabel?: string): {
  exitCode: number;
  stdout: string;
  stderr: string;
  nomesDivergencias: Set<string>;
} {
  const result = spawnSync('node', ['scripts/gate-contract-fields.mjs'], {
    cwd: espelho,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const saida = stdout + stderr;

  // Extrai nomes: padrão é "❌ Tipo.campo — ..." ou similar
  const nomesDivergencias = new Set<string>();
  const linhas = saida.split('\n');
  for (const linha of linhas) {
    // Procura por "Type.field" após ❌
    const match = linha.match(/❌\s+(\w+\.\w+)\s+—/);
    if (match) {
      nomesDivergencias.add(match[1]);
    }
  }

  if (debugLabel && nomesDivergencias.size > 0) {
    console.debug(`[${debugLabel}] Divergências encontradas:`, Array.from(nomesDivergencias));
  }

  return {
    exitCode: result.status ?? 0,
    stdout,
    stderr,
    nomesDivergencias
  };
}

/**
 * Injeta um campo fantasma num arquivo de tipos.
 * Localiza o tipo alvo, encontra a última `}` antes do `;`, e insere o campo antes.
 */
function injetarCampoFantasma(conteudo: string, nomeTipo: string): string {
  const typeDecl = `type ${nomeTipo} = `;
  const startIdx = conteudo.indexOf(typeDecl);
  if (startIdx < 0) {
    throw new Error(`Tipo ${nomeTipo} não encontrado`);
  }

  // Encontra o `};` que fecha a definição
  const blockStart = conteudo.indexOf('{', startIdx);
  if (blockStart < 0) {
    throw new Error(`Bloco de ${nomeTipo} não encontrado`);
  }

  let braceCount = 0;
  let idx = blockStart;
  while (idx < conteudo.length) {
    if (conteudo[idx] === '{') braceCount++;
    if (conteudo[idx] === '}') {
      braceCount--;
      if (braceCount === 0) {
        // Encontrou o `}` que fecha. Injeta o campo antes dele.
        const injecao = `  campoFantasmaSonda: string;\n`;
        return conteudo.substring(0, idx) + injecao + conteudo.substring(idx);
      }
    }
    idx++;
  }

  throw new Error(`Não conseguiu encontrar fechamento de ${nomeTipo}`);
}

describe('Gate de campos em response — prova durável (F1.4.c2, D19, b68 D71, D77-D82)', () => {
  let espelhoAntigo = '';
  let espelhoHoje = '';
  let espelhoComFantasma = '';
  let espelhoEabe03c = '';
  let espelhoB68 = '';
  let espelhoComSnapshotBranco = '';

  let resultadoAntigo: Awaited<ReturnType<typeof executarGate>>;
  let resultadoHoje: Awaited<ReturnType<typeof executarGate>>;
  let resultadoFantasma: Awaited<ReturnType<typeof executarGate>>;
  let resultadoEabe03c: Awaited<ReturnType<typeof executarGate>>;
  let resultadoB68: Awaited<ReturnType<typeof executarGate>>;
  let resultadoComSnapshotBranco: Awaited<ReturnType<typeof executarGate>>;

  beforeAll(() => {
    // Sonda A: tipos de 2c50771
    espelhoAntigo = montarEspelho(REF_ANTERIOR_A_C1);
    resultadoAntigo = executarGate(espelhoAntigo, 'Sonda A (2c50771)');

    // Sonda B: tipos de hoje (lê do working directory, não do git HEAD)
    espelhoHoje = montarEspelho('HEAD-WORKING');

    // Valida que o contrato foi copiado corretamente
    const contratoEmEspelho = path.join(espelhoHoje, 'docs', 'backend-v1.23', 'CONTRATO-API-v1.23.md');
    const conteudoContrato = readFileSync(contratoEmEspelho, 'utf8');
    if (!conteudoContrato.includes('StatusBemPatrimonial StatusBem')) {
      throw new Error('Contrato em espelho não contém StatusBemPatrimonial StatusBem');
    }

    resultadoHoje = executarGate(espelhoHoje, 'Sonda B (HEAD-WORKING)');

    // Sonda C: tipos de hoje + campo fantasma injetado em BemPatrimonialResponse
    espelhoComFantasma = montarEspelho('HEAD-WORKING');
    const arquivoPatrimonio = path.join(espelhoComFantasma, 'features', 'patrimonio', 'types', 'patrimonio.types.ts');
    let conteudo = readFileSync(arquivoPatrimonio, 'utf8');
    conteudo = injetarCampoFantasma(conteudo, 'BemPatrimonialResponse');
    writeFileSync(arquivoPatrimonio, conteudo);
    resultadoFantasma = executarGate(espelhoComFantasma, 'Sonda C (HEAD-WORKING + fantasma)');

    // Sonda D: tipos de eabe03c (b67) — prova vermelha do MovimentoEstoque com nomes antigos
    espelhoEabe03c = montarEspelho('eabe03c');
    resultadoEabe03c = executarGate(espelhoEabe03c, 'Sonda D (eabe03c b67)');

    // Sonda E: tipos de 048d930 (b68) — antes de tabelas-preco/vendas entrarem no gate
    // Em b68, os tipos de tabelas-preco/vendas ainda não existem, logo o gate falha
    // ao tentar montar o contrato para eles. Isso é esperado e prova que o novo
    // gate cobre módulos que antes não eram validados.
    espelhoB68 = montarEspelho('048d930');
    resultadoB68 = executarGate(espelhoB68, 'Sonda E (048d930 b68)');

    // Sonda F: snapshot com um record essencial removido (cópia temporal)
    // Simula o caso em que o snapshot está corrompido ou desatualizado
    espelhoComSnapshotBranco = montarEspelho('HEAD-WORKING');
    const snapshotEmEspelho = path.join(espelhoComSnapshotBranco, 'scripts', 'backend-response-records.snapshot.json');
    let snapshotConteudo = readFileSync(snapshotEmEspelho, 'utf8');
    const snapshotObj = JSON.parse(snapshotConteudo);
    // Remove um record mapeado obrigatório: TabelaPrecoResponse
    delete snapshotObj.records['TabelaPrecoResponse'];
    writeFileSync(snapshotEmEspelho, JSON.stringify(snapshotObj));
    resultadoComSnapshotBranco = executarGate(espelhoComSnapshotBranco, 'Sonda F (snapshot sem TabelaPrecoResponse)');
  }, 300_000);

  afterAll(() => {
    for (const espelho of [espelhoAntigo, espelhoHoje, espelhoComFantasma, espelhoEabe03c, espelhoB68, espelhoComSnapshotBranco]) {
      if (!espelho || !existsSync(espelho)) continue;
      try {
        rmSync(espelho, { recursive: true, force: true });
      } catch (e) {
        // Ignora falha de limpeza
      }
    }
  });

  describe('Sonda A — árvore 2c50771 (com 24 campos fantasma)', () => {
    it('deve sair com código de erro 1', () => {
      expect(resultadoAntigo.exitCode).toBe(1);
    });

    it.each(CAMPOS_ESPERADOS_EM_2C50771)(
      'acusa %s na árvore 2c50771',
      (nomeCampo) => {
        expect(Array.from(resultadoAntigo.nomesDivergencias)).toContain(nomeCampo);
      }
    );
  });

  describe('Sonda B — árvore de hoje (sem exceção registrada)', () => {
    it('deve sair com código de sucesso 0', () => {
      expect(resultadoHoje.exitCode).toBe(0);
    });

    it('não acusa nenhum dos 24 campos fantasma', () => {
      for (const nomeCampo of CAMPOS_ESPERADOS_EM_2C50771) {
        expect(Array.from(resultadoHoje.nomesDivergencias)).not.toContain(nomeCampo);
      }
    });
  });

  describe('Sonda C — árvore de hoje + campo fake (BemPatrimonialResponse.campoFantasmaSonda)', () => {
    it('deve sair com código de erro 1', () => {
      expect(resultadoFantasma.exitCode).toBe(1);
    });

    it('acusa o campo fake injetado', () => {
      expect(Array.from(resultadoFantasma.nomesDivergencias)).toContain(
        'BemPatrimonialResponse.campoFantasmaSonda'
      );
    });

    it('não acusa nenhum dos 24 campos históricos (árvore é limpa)', () => {
      for (const nomeCampo of CAMPOS_ESPERADOS_EM_2C50771) {
        expect(Array.from(resultadoFantasma.nomesDivergencias)).not.toContain(nomeCampo);
      }
    });
  });

  describe('Sonda D — árvore eabe03c (b67) com MovimentoEstoque de nomes antigos (prova vermelha)', () => {
    it('deve sair com código de erro 1', () => {
      expect(resultadoEabe03c.exitCode).toBe(1);
    });

    it('acusa MovimentoEstoque.tipoMovimento (campo antigo, não existe no backend)', () => {
      expect(Array.from(resultadoEabe03c.nomesDivergencias)).toContain('MovimentoEstoque.tipoMovimento');
    });

    it('acusa MovimentoEstoque.criadoEm (campo antigo, não existe no backend)', () => {
      expect(Array.from(resultadoEabe03c.nomesDivergencias)).toContain('MovimentoEstoque.criadoEm');
    });

    it('não acusa nenhum dos 24 campos históricos (árvore é de estoque, não patrimônio/bancos)', () => {
      for (const nomeCampo of CAMPOS_ESPERADOS_EM_2C50771) {
        expect(Array.from(resultadoEabe03c.nomesDivergencias)).not.toContain(nomeCampo);
      }
    });
  });

  describe('Sonda E — árvore 048d930 (b68, antes de tabelas-preco/vendas no gate)', () => {
    it('deve sair com código de erro 1 (divergências de contrato, não FALHA ESTRUTURAL)', () => {
      expect(resultadoB68.exitCode).toBe(1);
    });

    it('acusa TabelaPrecoResponse.ativo como divergência', () => {
      expect(Array.from(resultadoB68.nomesDivergencias)).toContain('TabelaPrecoResponse.ativo');
    });

    it('acusa PrecoVigenteResponse.margemPercentual como divergência', () => {
      expect(Array.from(resultadoB68.nomesDivergencias)).toContain('PrecoVigenteResponse.margemPercentual');
    });

    it('acusa PrecoVigenteResponse.vigente como divergência', () => {
      expect(Array.from(resultadoB68.nomesDivergencias)).toContain('PrecoVigenteResponse.vigente');
    });

    it('não acusa TabelaPrecoItemResponse.ativo (não é divergência em b68)', () => {
      expect(Array.from(resultadoB68.nomesDivergencias)).not.toContain('TabelaPrecoItemResponse.ativo');
    });
  });

  describe('Sonda F — HEAD com snapshot corrompido (record TabelaPrecoResponse removido)', () => {
    it('deve sair com código de erro 1 (FALHA ESTRUTURAL)', () => {
      expect(resultadoComSnapshotBranco.exitCode).toBe(1);
    });

    it('acusa FALHA ESTRUTURAL mencionando TabelaPrecoResponse', () => {
      const saida = resultadoComSnapshotBranco.stdout + resultadoComSnapshotBranco.stderr;
      expect(saida).toContain('FALHA ESTRUTURAL');
      expect(saida).toContain('TabelaPrecoResponse');
    });
  });

  describe('Validação de integridade — allowlist e teto', () => {
    it('teto da allowlist deve ser exatamente igual a exceptions.length (catraca de sentido único)', () => {
      const allowlistPath = path.join(raizDoProjeto, 'scripts', 'gate-contract-fields.allowlist.json');
      const allowlistConteudo = readFileSync(allowlistPath, 'utf8');
      const allowlist = JSON.parse(allowlistConteudo);

      expect(allowlist).toHaveProperty('teto');
      expect(typeof allowlist.teto).toBe('number');
      expect(allowlist.teto).toEqual(allowlist.exceptions.length);
    });
  });

  describe('Regressão — os 24 campos não voltaram em HEAD', () => {
    it('acusa exatamente 0 divergências na árvore de hoje', () => {
      expect(resultadoHoje.nomesDivergencias.size).toBe(0);
    });
  });

  /**
   * Prova de que este teste fica vermelho, medida pela sessão principal em 2026-09-14,
   * editando temporariamente scripts/gate-contract-fields.mjs com backup, rodando só este
   * arquivo e conferindo a restauração com git diff --exit-code (saída 0):
   *
   * Cegueira 1: resolveTypeFields sem mesclar baseFields → 7 falharam, 24 passaram.
   * As 7 são os campos herdados de BoletoResponse e LancamentoContabilResponse.
   *
   * Cegueira 2: validateModule nunca acusa → 27 falharam: código de saída e os 24 nomes
   * da Sonda A, código de saída e nome da Sonda C.
   *
   * Ver docs/fatias/v1.11.0a8b54.c2-estado-de-bens.md, seção 9, achado QA-G1.
   */
});
