import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

/**
 * Prova durável do gate de campos em request — fatia v1.11.0a8b58.c3 (D19).
 *
 * POR QUE ESTE ARQUIVO EXISTE: o gate valida que schemas Zod de request do frontend não enviam
 * campos que o record C# do backend não declara, e que não omitem campos obrigatórios (não-anuláveis)
 * que o backend espera.
 *
 * Este teste automatiza essa prova com três sondas:
 *   - Sonda A: árvore de 9fcda80 (contém os 15 defeitos) — deve acusar 8 DESCARTE + 7 DEFAULT_SILENCIOSO
 *   - Sonda B: árvore de hoje (sem os 15) — deve sair 0, imprimindo 11 LACUNA
 *   - Sonda C: injeta um campo fake num schema — deve acusar e sair 1
 *
 * Os 15 críticos (8 + 7) compõem a prova vermelha. Os 11 LACUNA permanecem para a Sonda B.
 */

const raizDoProjeto = process.cwd();
const REF_ANTIGA_C1 = '9fcda80'; // feat: release frontend v1.11.0a8b58

/**
 * Os 15 críticos que DEVEM aparecer na árvore de 9fcda80.
 * Estes são os defeitos que a fatia corrige (Bloco B).
 * Separados por severidade: 8 DESCARTE + 7 DEFAULT_SILENCIOSO.
 */
const CRITICOS_ESPERADOS_EM_9FCDA80 = [
  // DESCARTE: 8
  'AtualizarDadosFiscaisProdutoRequest.ncm',
  'AtualizarDadosFiscaisProdutoRequest.cest',
  'AtualizarDadosFiscaisProdutoRequest.unidadeTributavelId',
  'VincularProdutoFornecedorRequest.codigoProdutoFornecedor',
  'TransferirEstoqueRequest.localOrigemId',
  'TransferirEstoqueRequest.localDestinoId',
  'CriarUsuarioRequest.login',
  'CriarUsuarioRequest.gruposAcessoIds',
  // DEFAULT_SILENCIOSO: 7
  'VincularProdutoFornecedorRequest.codigoFornecedor',
  'TransferirEstoqueRequest.localEstoqueOrigemId',
  'TransferirEstoqueRequest.localEstoqueDestinoId',
  'TransferirEstoqueRequest.origemModulo',
  'CriarEmpresaRequest.regimeTributario',
  'CriarEmpresaRequest.contribuinteIpi',
  'AtualizarEmpresaRequest.regimeTributario'
] as const;

const DESCARTE_ESPERADOS = [
  'AtualizarDadosFiscaisProdutoRequest.ncm',
  'AtualizarDadosFiscaisProdutoRequest.cest',
  'AtualizarDadosFiscaisProdutoRequest.unidadeTributavelId',
  'VincularProdutoFornecedorRequest.codigoProdutoFornecedor',
  'TransferirEstoqueRequest.localOrigemId',
  'TransferirEstoqueRequest.localDestinoId',
  'CriarUsuarioRequest.login',
  'CriarUsuarioRequest.gruposAcessoIds'
] as const;

const DEFAULT_SILENCIOSO_ESPERADOS = [
  'VincularProdutoFornecedorRequest.codigoFornecedor',
  'TransferirEstoqueRequest.localEstoqueOrigemId',
  'TransferirEstoqueRequest.localEstoqueDestinoId',
  'TransferirEstoqueRequest.origemModulo',
  'CriarEmpresaRequest.regimeTributario',
  'CriarEmpresaRequest.contribuinteIpi',
  'AtualizarEmpresaRequest.regimeTributario'
] as const;

/**
 * Todos os 14 LACUNA na árvore antiga (9fcda80).
 * Após o Bloco B, os 3 primeiros (pares dos DESCARTE 1-3) são preenchidos e saem dessa lista.
 * Restam 11 na árvore de hoje.
 */
const LACUNA_TODOS_9FCDA80 = [
  'AtualizarDadosFiscaisProdutoRequest.ncmCodigo',
  'AtualizarDadosFiscaisProdutoRequest.cestCodigo',
  'AtualizarDadosFiscaisProdutoRequest.unidadeMedidaTributavelId',
  'AtualizarDadosFiscaisProdutoRequest.unidadeTributavelSigla',
  'AtualizarDadosFiscaisProdutoRequest.exTipi',
  'AtualizarDadosFiscaisProdutoRequest.codigoBeneficioFiscalPadrao',
  'AtualizarDadosFiscaisProdutoRequest.tipoItemSped',
  'VincularProdutoFornecedorRequest.descricaoFornecedor',
  'TransferirEstoqueRequest.origemId',
  'TransferirEstoqueRequest.documento',
  'CriarEmpresaRequest.crt',
  'AtualizarEmpresaRequest.crt',
  'AtualizarEmpresaRequest.contribuinteIpi',
  'AdmitirColaboradorRequest.pessoaId'
] as const;

/**
 * Os 11 LACUNA que permanecem na árvore de hoje (após Bloco B).
 * Os 3 primeiros foram preenchidos: ncmCodigo, cestCodigo, unidadeMedidaTributavelId.
 */
const LACUNA_ESPERADOS_HOJE = [
  'AtualizarDadosFiscaisProdutoRequest.unidadeTributavelSigla',
  'AtualizarDadosFiscaisProdutoRequest.exTipi',
  'AtualizarDadosFiscaisProdutoRequest.codigoBeneficioFiscalPadrao',
  'AtualizarDadosFiscaisProdutoRequest.tipoItemSped',
  'VincularProdutoFornecedorRequest.descricaoFornecedor',
  'TransferirEstoqueRequest.origemId',
  'TransferirEstoqueRequest.documento',
  'CriarEmpresaRequest.crt',
  'AtualizarEmpresaRequest.crt',
  'AtualizarEmpresaRequest.contribuinteIpi',
  'AdmitirColaboradorRequest.pessoaId'
] as const;

/**
 * Monta um espelho temporário com o gate de request, allowlist, contrato e schemas.
 * Se refSchemas === 'HEAD-WORKING', usa os arquivos do disco (working directory).
 * Caso contrário, usa git show para trazer a versão específica dos schemas.
 */
function montarEspelho(refSchemas: string): string {
  const espelho = mkdtempSync(path.join(tmpdir(), 'gate-prova-request-'));

  // Estrutura mínima
  const dirs = [
    'scripts',
    'docs',
    'features/produtos/schemas',
    'features/estoque/schemas',
    'features/administracao/schemas',
    'features/seguranca/schemas',
    'features/rh/schemas'
  ];
  for (const dir of dirs) {
    const fullPath = path.join(espelho, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }

  // Copia gate de request da árvore atual (sempre)
  const gateSource = path.join(raizDoProjeto, 'scripts', 'gate-contract-request-fields.mjs');
  const gateDest = path.join(espelho, 'scripts', 'gate-contract-request-fields.mjs');
  writeFileSync(gateDest, readFileSync(gateSource, 'utf8'));

  // Cria allowlist vazio
  const allowlistDest = path.join(espelho, 'scripts', 'gate-contract-request-fields.allowlist.json');
  writeFileSync(allowlistDest, JSON.stringify({ description: 'Prova', exceptions: [], teto: 0 }, null, 2));

  // Copia contrato da árvore atual
  const contratoSource = path.join(raizDoProjeto, 'docs', 'BACKEND-ESTADO-ATUAL-E-CONTRATO.md');
  const contratoDest = path.join(espelho, 'docs', 'BACKEND-ESTADO-ATUAL-E-CONTRATO.md');
  writeFileSync(contratoDest, readFileSync(contratoSource, 'utf8'));

  // Copia schemas (da árvore especificada)
  const modulos = ['produtos', 'estoque', 'administracao', 'seguranca', 'rh'];
  for (const modulo of modulos) {
    let conteudo: string;

    if (refSchemas === 'HEAD-WORKING') {
      // Lê do disco (working directory)
      const source = path.join(raizDoProjeto, 'features', modulo, 'schemas', `${modulo}Schemas.ts`);
      conteudo = readFileSync(source, 'utf8');
    } else {
      // Usa git show para trazer versão específica
      const output = spawnSync('git', ['show', `${refSchemas}:features/${modulo}/schemas/${modulo}Schemas.ts`], {
        cwd: raizDoProjeto,
        encoding: 'utf8'
      });
      if (output.status !== 0) {
        throw new Error(`Falha ao extrair schemas de ${refSchemas}: ${output.stderr}`);
      }
      conteudo = output.stdout;
    }

    const dest = path.join(espelho, 'features', modulo, 'schemas', `${modulo}Schemas.ts`);
    writeFileSync(dest, conteudo);
  }

  return espelho;
}

/**
 * Executa o gate num espelho e retorna { exitCode, stdout, stderr, nomesDivergencias }
 */
function executarGate(espelho: string): {
  exitCode: number;
  stdout: string;
  stderr: string;
  nomesDivergencias: Set<string>;
} {
  const result = spawnSync('node', ['scripts/gate-contract-request-fields.mjs'], {
    cwd: espelho,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const saida = stdout + stderr;

  // Extrai nomes: padrão é "❌ Record.field"
  const nomesDivergencias = new Set<string>();
  const linhas = saida.split('\n');
  for (const linha of linhas) {
    // Procura por "❌ Record.field"
    const match = linha.match(/❌\s+(\w+\.\w+)/);
    if (match) {
      nomesDivergencias.add(match[1]);
    }
  }

  return {
    exitCode: result.status ?? 0,
    stdout,
    stderr,
    nomesDivergencias
  };
}

/**
 * Injeta um campo fantasma num arquivo de schema.
 * Localiza o schema alvo, encontra a última `}` antes do `.refine`, e insere o campo antes.
 */
function injetarCampoFantasma(conteudo: string, nomeSchema: string): string {
  const schemaDecl = `export const ${nomeSchema} = z.object({`;
  const startIdx = conteudo.indexOf(schemaDecl);
  if (startIdx < 0) {
    throw new Error(`Schema ${nomeSchema} não encontrado`);
  }

  // Encontra a chave de fechamento `})`
  const blockStart = conteudo.indexOf('{', startIdx + schemaDecl.length - 1);
  if (blockStart < 0) {
    throw new Error(`Bloco de ${nomeSchema} não encontrado`);
  }

  let braceCount = 0;
  let idx = blockStart;
  while (idx < conteudo.length) {
    if (conteudo[idx] === '{') braceCount++;
    if (conteudo[idx] === '}') {
      braceCount--;
      if (braceCount === 0) {
        // Encontrou o `}` que fecha. Injeta o campo antes dele.
        const injecao = `\n    campoFantasmaTesteSonda: z.string().optional()\n`;
        return conteudo.substring(0, idx) + injecao + conteudo.substring(idx);
      }
    }
    idx++;
  }

  throw new Error(`Não conseguiu encontrar fechamento de ${nomeSchema}`);
}

describe('Gate de campos em request — prova durável (v1.11.0a8b58.c3, D19)', () => {
  let espelhoAntigo = '';
  let espelhoHoje = '';
  let espelhoComFantasma = '';

  let resultadoAntigo: Awaited<ReturnType<typeof executarGate>>;
  let resultadoHoje: Awaited<ReturnType<typeof executarGate>>;
  let resultadoFantasma: Awaited<ReturnType<typeof executarGate>>;

  beforeAll(() => {
    // Sonda A: árvore de 9fcda80 (contém os 15 defeitos)
    espelhoAntigo = montarEspelho(REF_ANTIGA_C1);
    resultadoAntigo = executarGate(espelhoAntigo);

    // Sonda B: árvore de hoje (sem os 15 defeitos)
    espelhoHoje = montarEspelho('HEAD-WORKING');
    resultadoHoje = executarGate(espelhoHoje);

    // Sonda C: árvore de hoje + campo fake injetado
    espelhoComFantasma = montarEspelho('HEAD-WORKING');
    const arquivoProdutos = path.join(espelhoComFantasma, 'features', 'produtos', 'schemas', 'produtosSchemas.ts');
    let conteudo = readFileSync(arquivoProdutos, 'utf8');
    conteudo = injetarCampoFantasma(conteudo, 'atualizarDadosFiscaisProdutoSchema');
    writeFileSync(arquivoProdutos, conteudo);
    resultadoFantasma = executarGate(espelhoComFantasma);
  }, 120_000);

  afterAll(() => {
    // Limpa espelhos
    for (const espelho of [espelhoAntigo, espelhoHoje, espelhoComFantasma]) {
      if (espelho && existsSync(espelho)) {
        try {
          rmSync(espelho, { recursive: true });
        } catch (e) {
          // Ignora falha de limpeza
        }
      }
    }
  });

  describe('Sonda A: árvore 9fcda80 (contém os 15 defeitos)', () => {
    it('gate sai com código de erro 1', () => {
      expect(resultadoAntigo.exitCode).toBe(1);
    });

    it('acusa 8 DESCARTE', () => {
      const descartes = Array.from(resultadoAntigo.nomesDivergencias).filter(n =>
        DESCARTE_ESPERADOS.includes(n as any)
      );
      expect(descartes).toHaveLength(DESCARTE_ESPERADOS.length);
    });

    it('acusa 7 DEFAULT_SILENCIOSO', () => {
      const silenciosos = Array.from(resultadoAntigo.nomesDivergencias).filter(n =>
        DEFAULT_SILENCIOSO_ESPERADOS.includes(n as any)
      );
      expect(silenciosos).toHaveLength(DEFAULT_SILENCIOSO_ESPERADOS.length);
    });

    // Um `it` por nome crítico (15 ao total)
    CRITICOS_ESPERADOS_EM_9FCDA80.forEach((nome) => {
      it(`acusa crítico: ${nome}`, () => {
        expect(resultadoAntigo.nomesDivergencias.has(nome)).toBe(true);
      });
    });
  });

  describe('Sonda B: árvore de hoje (sem os 15 defeitos)', () => {
    it('gate sai com código de sucesso 0', () => {
      expect(resultadoHoje.exitCode).toBe(0);
    });

    it('não acusa nenhum dos 15 críticos', () => {
      for (const nome of CRITICOS_ESPERADOS_EM_9FCDA80) {
        expect(resultadoHoje.nomesDivergencias.has(nome)).toBe(false);
      }
    });

    it('imprime 11 LACUNA com destino', () => {
      // Verifica que a saída contém "11" e "anuláveis sem destino"
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).toContain('11');
      expect(saida).toContain('anuláveis sem destino');
      expect(saida).toMatch(/→/); // Destino deve estar presente
    });

    // Um `it` por nome de LACUNA (verifica que não desapareceu)
    LACUNA_ESPERADOS_HOJE.forEach((nome) => {
      it(`imprime LACUNA: ${nome}`, () => {
        const saida = resultadoHoje.stdout + resultadoHoje.stderr;
        expect(saida).toContain(nome);
      });
    });

    // Verifica que os 3 pares (preenchidos no Bloco B) NÃO aparecem mais
    it('não imprime os 3 pares preenchidos (ncmCodigo, cestCodigo, unidadeMedidaTributavelId)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.ncmCodigo');
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.cestCodigo');
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.unidadeMedidaTributavelId');
    });
  });

  describe('Sonda C: injeção de campo fake (prova que o gate detecta)', () => {
    it('gate sai com código de erro ao injetar campo fake', () => {
      expect(resultadoFantasma.exitCode).toBe(1);
    });

    it('acusa o campo injetado (campoFantasmaTesteSonda)', () => {
      const saida = resultadoFantasma.stdout + resultadoFantasma.stderr;
      expect(saida).toContain('campoFantasmaTesteSonda');
    });

    it('não acusa nenhum dos 15 críticos (árvore é limpa)', () => {
      for (const nome of CRITICOS_ESPERADOS_EM_9FCDA80) {
        expect(resultadoFantasma.nomesDivergencias.has(nome)).toBe(false);
      }
    });
  });
});
