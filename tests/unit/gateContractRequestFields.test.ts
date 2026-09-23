import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

/**
 * Prova durável do gate de campos em request — fatia v1.11.0a8b58.c3 (D19) + b64 (Bloco C).
 *
 * POR QUE ESTE ARQUIVO EXISTE: o gate valida que schemas Zod de request do frontend não enviam
 * campos que o record C# do backend não declara, e que não omitem campos obrigatórios (não-anuláveis)
 * que o backend espera.
 *
 * Este teste automatiza essa prova com múltiplas sondas:
 *   - Sonda A: árvore de 9fcda80 (contém os 15 defeitos) — deve acusar 8 DESCARTE + 7 DEFAULT_SILENCIOSO
 *   - Sonda B: árvore de hoje (sem os 15) — deve sair 0, imprimindo 8 LACUNA
 *   - Sonda C: injeta um campo fake em recorte antigo — deve acusar e sair 1
 *   - Sonda D: injeita um campo fake em DefinirEnderecoFiscalRequest (DESCARTE) — deve acusar e sair 1
 *   - Sonda E: remove um campo obrigatório de DefinirEnderecoFiscalRequest (DEFAULT_SILENCIOSO) — deve acusar e sair 1
 *   - Sonda G: remove descricao anulável de criarClassificacaoPessoaSchema (LACUNA) — AC-11
 *   - Sonda H: remove motivo obrigatório de inativarClassificacaoPessoaSchema (DEFAULT_SILENCIOSO) — AC-11
 *
 * Os 15 críticos (8 + 7) compõem a prova vermelha de 9fcda80 (Sonda A). Os 8 LACUNA permanecem para a Sonda B.
 * As Sondas D e E comprovam que o novo recorte DefinirEnderecoFiscalRequest é detectado em ambas direções.
 * AC-13 (v1.11.0a8b66): ConfigurarComercialClienteRequest e ConfigurarCompraFornecedorRequest entram no
 * universo; campo removido do schema no espelho é acusado pelo nome (DEFAULT_SILENCIOSO ou LACUNA).
 * AC-11 (v1.11.0a8b67): CriarClassificacaoPessoaRequest, AtualizarClassificacaoPessoaRequest,
 * InativarClassificacaoPessoaRequest entram no universo com prova vermelha nominal (Sondas G e H).
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
 * Os 3 LACUNA que permanecem na árvore de hoje (após Bloco B, b65 e b64).
 * Foram removidos (preenchidos nos schemas):
 *   - ncmCodigo, cestCodigo, unidadeMedidaTributavelId (Bloco B)
 *   - tipoItemSped, unidadeTributavelSigla, exTipi, codigoBeneficioFiscalPadrao (b65)
 *   - descricaoFornecedor (b65)
 *   - CriarEmpresaRequest.crt, AtualizarEmpresaRequest.crt (b64)
 *   - AdmitirColaboradorRequest.pessoaId (b63)
 * DefinirEnderecoFiscalRequest não gera LACUNA porque seus 2 campos anuláveis foram adicionados ao schema na b64.
 */
const LACUNA_ESPERADOS_HOJE = [
  'TransferirEstoqueRequest.origemId',
  'TransferirEstoqueRequest.documento',
  'AtualizarEmpresaRequest.contribuinteIpi'
] as const;

/**
 * Monta um espelho temporário com o gate de request, allowlist, contrato e schemas.
 * Se refSchemas === 'HEAD-WORKING', usa os arquivos do disco (working directory).
 * Caso contrário, usa git show para trazer a versão específica dos schemas.
 * Se stripNewMapping === true, remove DefinirEnderecoFiscalRequest do gate (para Sonda A em 9fcda80).
 */
function montarEspelho(refSchemas: string, stripNewMapping?: boolean): string {
  const espelho = mkdtempSync(path.join(tmpdir(), 'gate-prova-request-'));

  // Estrutura mínima
  const dirs = [
    'scripts',
    'docs',
    'features/produtos/schemas',
    'features/estoque/schemas',
    'features/administracao/schemas',
    'features/seguranca/schemas',
    'features/rh/schemas',
    'features/clientes/schemas',
    'features/fornecedores/schemas',
    'features/pessoas/schemas'
  ];
  for (const dir of dirs) {
    const fullPath = path.join(espelho, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }

  // Copia gate de request da árvore atual (sempre)
  const gateSource = path.join(raizDoProjeto, 'scripts', 'gate-contract-request-fields.mjs');
  let gateContent = readFileSync(gateSource, 'utf8');

  // Para Sonda A, remove DefinirEnderecoFiscalRequest do mapa (não existia em 9fcda80)
  if (stripNewMapping) {
    // Remove do docstring
    gateContent = gateContent.replace(/   - administracao: CriarEmpresaRequest, AtualizarEmpresaRequest, DefinirEnderecoFiscalRequest/, '   - administracao: CriarEmpresaRequest, AtualizarEmpresaRequest');
    // Remove do SCHEMA_TO_REQUEST_MAP
    gateContent = gateContent.replace(/    definirEnderecoFiscalSchema: 'DefinirEnderecoFiscalRequest',\n/, '');
    // Remove da lista recordNames
    gateContent = gateContent.replace(/    'DefinirEnderecoFiscalRequest',\n/, '');
  }

  const gateDest = path.join(espelho, 'scripts', 'gate-contract-request-fields.mjs');
  writeFileSync(gateDest, gateContent);

  // Cria allowlist vazio
  const allowlistDest = path.join(espelho, 'scripts', 'gate-contract-request-fields.allowlist.json');
  writeFileSync(allowlistDest, JSON.stringify({ description: 'Prova', exceptions: [], teto: 0 }, null, 2));

  // Copia contrato da árvore atual
  const contratoSource = path.join(raizDoProjeto, 'docs', 'BACKEND-ESTADO-ATUAL-E-CONTRATO.md');
  const contratoDest = path.join(espelho, 'docs', 'BACKEND-ESTADO-ATUAL-E-CONTRATO.md');
  writeFileSync(contratoDest, readFileSync(contratoSource, 'utf8'));

  // Copia schemas (da árvore especificada)
  const modulos = ['produtos', 'estoque', 'administracao', 'seguranca', 'rh', 'clientes', 'fornecedores', 'pessoas'];
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
function executarGate(espelho: string, env?: Record<string, string>): {
  exitCode: number;
  stdout: string;
  stderr: string;
  nomesDivergencias: Set<string>;
} {
  const result = spawnSync('node', ['scripts/gate-contract-request-fields.mjs'], {
    cwd: espelho,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: env ? { ...process.env, ...env } : process.env
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

/**
 * Remove a linha `campo: ...` de dentro do bloco `export const <schema> = z.object({ ... });`
 * de um arquivo de schema do espelho. Lança se a linha não existir, para que a sonda nunca
 * fique verde por não ter removido nada.
 */
function removerCampoDoSchemaNoEspelho(espelho: string, modulo: string, nomeSchema: string, campo: string): void {
  const arquivo = path.join(espelho, 'features', modulo, 'schemas', `${modulo}Schemas.ts`);
  const conteudo = readFileSync(arquivo, 'utf8');
  const inicio = conteudo.indexOf(`export const ${nomeSchema} = z.object({`);
  if (inicio < 0) {
    throw new Error(`Schema ${nomeSchema} não encontrado em ${modulo}Schemas.ts`);
  }
  const fim = conteudo.indexOf('});', inicio);
  const bloco = conteudo.substring(inicio, fim);
  const linhaDoCampo = new RegExp(`\\r?\\n[ \\t]*${campo}\\s*:[^\\r\\n]*`);
  if (!linhaDoCampo.test(bloco)) {
    throw new Error(`Campo ${campo} não encontrado em ${nomeSchema}`);
  }
  const blocoSemCampo = bloco.replace(linhaDoCampo, '');
  writeFileSync(arquivo, conteudo.substring(0, inicio) + blocoSemCampo + conteudo.substring(fim));
}

describe('Gate de campos em request — prova durável (v1.11.0a8b58.c3, D19)', () => {
  let espelhoAntigo = '';
  let espelhoHoje = '';
  let espelhoComFantasma = '';
  let espelhoDefinirEnderecoFiscalComFantasma = '';
  let espelhoDefinirEnderecoFiscalSemObrigatorio = '';
  let espelhoComMapeamentoFake = '';
  let espelhoClienteSemObrigatorio = '';
  let espelhoClienteSemAnulavel = '';
  let espelhoFornecedorSemAnulavel = '';
  let espelhoClassificacaoPessoaSemAnulavel = '';
  let espelhoClassificacaoPessoaSemObrigatorio = '';

  let resultadoAntigo: Awaited<ReturnType<typeof executarGate>>;
  let resultadoHoje: Awaited<ReturnType<typeof executarGate>>;
  let resultadoFantasma: Awaited<ReturnType<typeof executarGate>>;
  let resultadoDefinirEnderecoFiscalComFantasma: Awaited<ReturnType<typeof executarGate>>;
  let resultadoDefinirEnderecoFiscalSemObrigatorio: Awaited<ReturnType<typeof executarGate>>;
  let resultadoMapeamentoFake: Awaited<ReturnType<typeof executarGate>>;
  let resultadoClienteSemObrigatorio: Awaited<ReturnType<typeof executarGate>>;
  let resultadoClienteSemAnulavel: Awaited<ReturnType<typeof executarGate>>;
  let resultadoFornecedorSemAnulavel: Awaited<ReturnType<typeof executarGate>>;
  let resultadoClassificacaoPessoaSemAnulavel: Awaited<ReturnType<typeof executarGate>>;
  let resultadoClassificacaoPessoaSemObrigatorio: Awaited<ReturnType<typeof executarGate>>;

  beforeAll(() => {
    // Sonda A: árvore de 9fcda80 (contém os 15 defeitos)
    // Passa GATE_RECORTES_IGNORADOS para ignorar recortes posteriores à revisão testada
    espelhoAntigo = montarEspelho(REF_ANTIGA_C1, true);
    // DefinirEnderecoFiscalRequest (b64), ConfigurarComercialClienteRequest e ConfigurarCompraFornecedorRequest (b66),
    // CriarClassificacaoPessoaRequest, AtualizarClassificacaoPessoaRequest, InativarClassificacaoPessoaRequest (b67) não existiam em 9fcda80.
    resultadoAntigo = executarGate(espelhoAntigo, {
      GATE_RECORTES_IGNORADOS: 'DefinirEnderecoFiscalRequest,ConfigurarComercialClienteRequest,ConfigurarCompraFornecedorRequest,CriarClassificacaoPessoaRequest,AtualizarClassificacaoPessoaRequest,InativarClassificacaoPessoaRequest'
    });

    // Sonda B: árvore de hoje (sem os 15 defeitos)
    espelhoHoje = montarEspelho('HEAD-WORKING');
    resultadoHoje = executarGate(espelhoHoje);

    // Sonda C: árvore de hoje + campo fake injetado em recorte antigo
    espelhoComFantasma = montarEspelho('HEAD-WORKING');
    const arquivoProdutos = path.join(espelhoComFantasma, 'features', 'produtos', 'schemas', 'produtosSchemas.ts');
    let conteudo = readFileSync(arquivoProdutos, 'utf8');
    conteudo = injetarCampoFantasma(conteudo, 'atualizarDadosFiscaisProdutoSchema');
    writeFileSync(arquivoProdutos, conteudo);
    resultadoFantasma = executarGate(espelhoComFantasma);

    // Sonda D: DefinirEnderecoFiscalRequest + campo fake injetado (DESCARTE)
    espelhoDefinirEnderecoFiscalComFantasma = montarEspelho('HEAD-WORKING');
    const arquivoAdministracao = path.join(espelhoDefinirEnderecoFiscalComFantasma, 'features', 'administracao', 'schemas', 'administracaoSchemas.ts');
    conteudo = readFileSync(arquivoAdministracao, 'utf8');
    conteudo = injetarCampoFantasma(conteudo, 'definirEnderecoFiscalSchema');
    writeFileSync(arquivoAdministracao, conteudo);
    resultadoDefinirEnderecoFiscalComFantasma = executarGate(espelhoDefinirEnderecoFiscalComFantasma);

    // Sonda E: DefinirEnderecoFiscalRequest com um obrigatório removido (DEFAULT_SILENCIOSO)
    espelhoDefinirEnderecoFiscalSemObrigatorio = montarEspelho('HEAD-WORKING');
    const arquivoAdministracaoE = path.join(espelhoDefinirEnderecoFiscalSemObrigatorio, 'features', 'administracao', 'schemas', 'administracaoSchemas.ts');
    conteudo = readFileSync(arquivoAdministracaoE, 'utf8');
    // Remove o campo `bairro` do schema de DefinirEnderecoFiscalRequest
    conteudo = conteudo.replace(/    bairro: requiredText\('Bairro', 2\),[\n\r]*/g, '');
    writeFileSync(arquivoAdministracaoE, conteudo);
    resultadoDefinirEnderecoFiscalSemObrigatorio = executarGate(espelhoDefinirEnderecoFiscalSemObrigatorio);

    // Sonda F: Prova vermelha da falha dura — mapeamento fake na árvore corrente
    espelhoComMapeamentoFake = montarEspelho('HEAD-WORKING');
    const arquivoGateFake = path.join(espelhoComMapeamentoFake, 'scripts', 'gate-contract-request-fields.mjs');
    let gateContentFake = readFileSync(arquivoGateFake, 'utf8');
    // Injeta um mapeamento fake: schema inexistente → record que nunca existirá
    gateContentFake = gateContentFake.replace(
      /administracao: \{[\s\S]*?atualizarEmpresaSchema: 'AtualizarEmpresaRequest'/,
      (match) => match + ",\n    fakeSchemaForProva: 'FakeNeverExistsRequest'"
    );
    writeFileSync(arquivoGateFake, gateContentFake);
    resultadoMapeamentoFake = executarGate(espelhoComMapeamentoFake);

    // AC-13 (b66): árvore de hoje sem `permiteVendaAPrazo` (bool obrigatório) → DEFAULT_SILENCIOSO
    espelhoClienteSemObrigatorio = montarEspelho('HEAD-WORKING');
    removerCampoDoSchemaNoEspelho(espelhoClienteSemObrigatorio, 'clientes', 'configurarComercialClienteSchema', 'permiteVendaAPrazo');
    resultadoClienteSemObrigatorio = executarGate(espelhoClienteSemObrigatorio);

    // AC-13 (b66): árvore de hoje sem `classificacaoId` (Guid? anulável) → LACUNA nominal
    espelhoClienteSemAnulavel = montarEspelho('HEAD-WORKING');
    removerCampoDoSchemaNoEspelho(espelhoClienteSemAnulavel, 'clientes', 'configurarComercialClienteSchema', 'classificacaoId');
    resultadoClienteSemAnulavel = executarGate(espelhoClienteSemAnulavel);

    // AC-13 (b66): árvore de hoje sem `categoriaFornecimento` (string? anulável) → LACUNA nominal
    espelhoFornecedorSemAnulavel = montarEspelho('HEAD-WORKING');
    removerCampoDoSchemaNoEspelho(espelhoFornecedorSemAnulavel, 'fornecedores', 'configurarCompraFornecedorSchema', 'categoriaFornecimento');
    resultadoFornecedorSemAnulavel = executarGate(espelhoFornecedorSemAnulavel);

    // AC-11 (b67): árvore de hoje sem `descricao` (string? anulável) → LACUNA nominal de criarClassificacaoPessoaSchema
    espelhoClassificacaoPessoaSemAnulavel = montarEspelho('HEAD-WORKING');
    removerCampoDoSchemaNoEspelho(espelhoClassificacaoPessoaSemAnulavel, 'pessoas', 'criarClassificacaoPessoaSchema', 'descricao');
    resultadoClassificacaoPessoaSemAnulavel = executarGate(espelhoClassificacaoPessoaSemAnulavel);

    // AC-11 (b67): árvore de hoje sem `motivo` (string obrigatório) → DEFAULT_SILENCIOSO nominal de inativarClassificacaoPessoaSchema
    espelhoClassificacaoPessoaSemObrigatorio = montarEspelho('HEAD-WORKING');
    removerCampoDoSchemaNoEspelho(espelhoClassificacaoPessoaSemObrigatorio, 'pessoas', 'inativarClassificacaoPessoaSchema', 'motivo');
    resultadoClassificacaoPessoaSemObrigatorio = executarGate(espelhoClassificacaoPessoaSemObrigatorio);
  }, 120_000);

  afterAll(() => {
    // Limpa espelhos
    for (const espelho of [espelhoAntigo, espelhoHoje, espelhoComFantasma, espelhoDefinirEnderecoFiscalComFantasma, espelhoDefinirEnderecoFiscalSemObrigatorio, espelhoComMapeamentoFake, espelhoClienteSemObrigatorio, espelhoClienteSemAnulavel, espelhoFornecedorSemAnulavel, espelhoClassificacaoPessoaSemAnulavel, espelhoClassificacaoPessoaSemObrigatorio]) {
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

    it('imprime 3 LACUNA com destino (após b65 preencher os campos novos)', () => {
      // Verifica que a saída contém "3" e "anuláveis sem destino"
      // Foram preenchidos:
      //   - ncmCodigo, cestCodigo, unidadeMedidaTributavelId (Bloco B)
      //   - tipoItemSped, unidadeTributavelSigla, exTipi, codigoBeneficioFiscalPadrao, descricaoFornecedor (b65)
      //   - CriarEmpresaRequest.crt, AtualizarEmpresaRequest.crt (b64)
      //   - AdmitirColaboradorRequest.pessoaId (b63)
      // Restam apenas 3:
      //   - TransferirEstoqueRequest.origemId → b66
      //   - TransferirEstoqueRequest.documento → b66
      //   - AtualizarEmpresaRequest.contribuinteIpi → b64
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).toContain('3');
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

    // Itens que foram removidos da lista de LACUNA (adicionados aos schemas)
    it('não imprime LACUNA: AtualizarDadosFiscaisProdutoRequest.tipoItemSped (adicionado na b65)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.tipoItemSped');
    });

    it('não imprime LACUNA: AtualizarDadosFiscaisProdutoRequest.unidadeTributavelSigla (adicionado na b65)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.unidadeTributavelSigla');
    });

    it('não imprime LACUNA: AtualizarDadosFiscaisProdutoRequest.exTipi (adicionado na b65)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.exTipi');
    });

    it('não imprime LACUNA: AtualizarDadosFiscaisProdutoRequest.codigoBeneficioFiscalPadrao (adicionado na b65)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.codigoBeneficioFiscalPadrao');
    });

    it('não imprime LACUNA: VincularProdutoFornecedorRequest.descricaoFornecedor (adicionado na b65)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('VincularProdutoFornecedorRequest.descricaoFornecedor');
    });

    it('não imprime LACUNA: CriarEmpresaRequest.crt (adicionado na b64)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('CriarEmpresaRequest.crt');
    });

    it('não imprime LACUNA: AtualizarEmpresaRequest.crt (adicionado na b64)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('AtualizarEmpresaRequest.crt');
    });

    it('não imprime LACUNA: AdmitirColaboradorRequest.pessoaId (adicionado na b63)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('AdmitirColaboradorRequest.pessoaId');
    });

    // Verifica que os campos preenchidos nos schemas NÃO aparecem mais
    it('não imprime os campos preenchidos (ncmCodigo, cestCodigo, unidadeMedidaTributavelId, crt, pessoaId)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.ncmCodigo');
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.cestCodigo');
      expect(saida).not.toContain('AtualizarDadosFiscaisProdutoRequest.unidadeMedidaTributavelId');
      expect(saida).not.toContain('CriarEmpresaRequest.crt');
      expect(saida).not.toContain('AtualizarEmpresaRequest.crt');
      expect(saida).not.toContain('AdmitirColaboradorRequest.pessoaId');
    });

    // Verifica que DefinirEnderecoFiscalRequest foi adicionado sem gerar LACUNA
    it('não imprime LACUNA para DefinirEnderecoFiscalRequest (campos anuláveis no schema)', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('DefinirEnderecoFiscalRequest.complemento');
      expect(saida).not.toContain('DefinirEnderecoFiscalRequest.codigoMunicipioIbge');
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

  describe('Sonda D: DefinirEnderecoFiscalRequest com campo fake (DESCARTE)', () => {
    it('gate sai com código de erro ao injetar campo fake no novo recorte', () => {
      expect(resultadoDefinirEnderecoFiscalComFantasma.exitCode).toBe(1);
    });

    it('acusa o campo injetado nomeando DefinirEnderecoFiscalRequest.campoFantasmaTesteSonda (DESCARTE)', () => {
      const saida = resultadoDefinirEnderecoFiscalComFantasma.stdout + resultadoDefinirEnderecoFiscalComFantasma.stderr;
      expect(saida).toContain('DefinirEnderecoFiscalRequest.campoFantasmaTesteSonda');
      expect(saida).toContain('DESCARTE');
    });

    it('não acusa nenhum dos 15 críticos da árvore antiga', () => {
      for (const nome of CRITICOS_ESPERADOS_EM_9FCDA80) {
        expect(resultadoDefinirEnderecoFiscalComFantasma.nomesDivergencias.has(nome)).toBe(false);
      }
    });
  });

  describe('Sonda E: DefinirEnderecoFiscalRequest sem campo obrigatório (DEFAULT_SILENCIOSO)', () => {
    it('gate sai com código de erro ao remover obrigatório do novo recorte', () => {
      expect(resultadoDefinirEnderecoFiscalSemObrigatorio.exitCode).toBe(1);
    });

    it('acusa o campo obrigatório faltante nomeando DefinirEnderecoFiscalRequest.bairro (DEFAULT_SILENCIOSO)', () => {
      const saida = resultadoDefinirEnderecoFiscalSemObrigatorio.stdout + resultadoDefinirEnderecoFiscalSemObrigatorio.stderr;
      expect(saida).toContain('DefinirEnderecoFiscalRequest.bairro');
      expect(saida).toContain('DEFAULT_SILENCIOSO');
    });

    it('não acusa nenhum dos 15 críticos da árvore antiga', () => {
      for (const nome of CRITICOS_ESPERADOS_EM_9FCDA80) {
        expect(resultadoDefinirEnderecoFiscalSemObrigatorio.nomesDivergencias.has(nome)).toBe(false);
      }
    });
  });

  describe('Sonda F: mapeamento fake (prova vermelha da falha dura)', () => {
    it('gate sai com código de erro ao detectar schema mapeado inexistente', () => {
      expect(resultadoMapeamentoFake.exitCode).toBe(1);
    });

    it('acusa FakeNeverExistsRequest como esquema estruturalmente quebrado', () => {
      const saida = resultadoMapeamentoFake.stdout + resultadoMapeamentoFake.stderr;
      expect(saida).toContain('FakeNeverExistsRequest');
      expect(saida).toContain('FALHA ESTRUTURAL');
    });

    it('não acusa nenhum dos 15 críticos (árvore é limpa)', () => {
      for (const nome of CRITICOS_ESPERADOS_EM_9FCDA80) {
        expect(resultadoMapeamentoFake.nomesDivergencias.has(nome)).toBe(false);
      }
    });
  });

  describe('AC-11: LACUNA_DESTINO sem entradas órfãs', () => {
    /**
     * Valida que LACUNA_DESTINO não contém entradas para campos que já saíram de
     * LACUNA_ESPERADOS_HOJE. Prova vermelha: comentário da entrada órfã de tipoItemSped
     * em 00e8316 (v1.11.0a8b64.c2) avisa que "mantê-los aqui é a entrada órfã".
     * Mantê-los após a fatia b65 preenchê-los é o defeito que esta asserção detecta.
     */

    function extrairLacunaDestinoDoArquivo(conteudo: string): Set<string> {
      // Procura pelo objeto LACUNA_DESTINO
      const match = conteudo.match(/const\s+LACUNA_DESTINO\s*=\s*\{([\s\S]*?)\};/);
      if (!match) {
        throw new Error('LACUNA_DESTINO não encontrado no arquivo');
      }

      const lagunasEncontradas = new Set<string>();
      const bloco = match[1];

      // Extrai cada entrada: 'Chave.campo': 'destino'
      const linhas = bloco.split('\n');
      for (const linha of linhas) {
        // Ignora comentários e linhas vazias
        const trimmed = linha.trim();
        if (trimmed.startsWith('//') || trimmed === '') continue;

        // Padrão: 'FullyQualifiedFieldName': 'destino',
        const fieldMatch = trimmed.match(/^'([^']+)':/);
        if (fieldMatch) {
          lagunasEncontradas.add(fieldMatch[1]);
        }
      }

      return lagunasEncontradas;
    }

    it('LACUNA_DESTINO não contém entradas que já foram removidas de LACUNA_ESPERADOS_HOJE', () => {
      const gateFilePath = path.join(raizDoProjeto, 'scripts', 'gate-contract-request-fields.mjs');
      const gateContent = readFileSync(gateFilePath, 'utf8');
      const lagunasDestino = extrairLacunaDestinoDoArquivo(gateContent);

      // LACUNA_ESPERADOS_HOJE = os campos que ainda são anuláveis sem cobertura de schema
      const lagunasEsperados = new Set(LACUNA_ESPERADOS_HOJE);

      // Valida que toda entrada de LACUNA_DESTINO está em LACUNA_ESPERADOS_HOJE
      const entradasOrfas = Array.from(lagunasDestino).filter(
        campo => !lagunasEsperados.has(campo as any)
      );

      if (entradasOrfas.length > 0) {
        const detalhe = entradasOrfas
          .map(campo => `${campo} (foi removido de LACUNA_ESPERADOS_HOJE)`)
          .join('\n   ');
        throw new Error(
          `LACUNA_DESTINO contém ${entradasOrfas.length} entrada(s) órfã(s):\n   ${detalhe}\n\n` +
          `Isso ocorre quando um campo é adicionado ao schema e sai de LACUNA_ESPERADOS_HOJE, ` +
          `mas sua entrada em LACUNA_DESTINO não é removida. Remova as chaves correspondentes ` +
          `de scripts/gate-contract-request-fields.mjs:LACUNA_DESTINO.`
        );
      }

      expect(entradasOrfas).toHaveLength(0);
    });
  });

  describe('AC-13: v1.11.0a8b66 — ConfigurarComercialClienteRequest e ConfigurarCompraFornecedorRequest no universo', () => {
    /** Trecho da saída entre o cabeçalho da categoria e o próximo cabeçalho (ou o fim). */
    function secao(saida: string, cabecalho: 'DESCARTE' | 'DEFAULT_SILENCIOSO' | 'LACUNA'): string {
      const linhas = saida.split('\n');
      const inicio = linhas.findIndex((l) =>
        cabecalho === 'LACUNA' ? /anuláveis sem destino/.test(l) : l.includes(`${cabecalho} —`)
      );
      if (inicio < 0) return '';
      const resto = linhas.slice(inicio + 1);
      const fim = resto.findIndex((l) => /^(❌|📋|📊|✅)/.test(l.trim()) && !/^❌\s+\w+\.\w+/.test(l.trim()));
      return (fim < 0 ? resto : resto.slice(0, fim)).join('\n');
    }

    it('o gate mapeia os dois records novos (schema → record)', () => {
      const gate = readFileSync(path.join(raizDoProjeto, 'scripts', 'gate-contract-request-fields.mjs'), 'utf8');
      expect(gate).toMatch(/configurarComercialClienteSchema:\s*'ConfigurarComercialClienteRequest'/);
      expect(gate).toMatch(/configurarCompraFornecedorSchema:\s*'ConfigurarCompraFornecedorRequest'/);
    });

    it('Sonda B: resolve os dois records sem falha estrutural nem recorte ignorado', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('FALHA ESTRUTURAL');
      expect(saida).not.toContain('Recortes ignorados');
      expect(saida).not.toMatch(/ConfigurarComercialClienteRequest\.|ConfigurarCompraFornecedorRequest\./);
    });

    it('Sonda B: imprime exatamente 3 LACUNA', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).toMatch(/anuláveis sem destino na UI \(3\)/);
    });

    it('sem permiteVendaAPrazo: sai 1 e acusa DEFAULT_SILENCIOSO ConfigurarComercialClienteRequest.permiteVendaAPrazo', () => {
      const saida = resultadoClienteSemObrigatorio.stdout + resultadoClienteSemObrigatorio.stderr;
      expect(resultadoClienteSemObrigatorio.exitCode).toBe(1);
      expect(resultadoClienteSemObrigatorio.nomesDivergencias.has('ConfigurarComercialClienteRequest.permiteVendaAPrazo')).toBe(true);
      expect(secao(saida, 'DEFAULT_SILENCIOSO')).toContain('ConfigurarComercialClienteRequest.permiteVendaAPrazo');
      expect(secao(saida, 'DESCARTE')).not.toContain('ConfigurarComercialClienteRequest');
    });

    it('sem classificacaoId: acusa LACUNA ConfigurarComercialClienteRequest.classificacaoId (4 LACUNA)', () => {
      const saida = resultadoClienteSemAnulavel.stdout + resultadoClienteSemAnulavel.stderr;
      expect(secao(saida, 'LACUNA')).toContain('ConfigurarComercialClienteRequest.classificacaoId');
      expect(saida).toMatch(/anuláveis sem destino na UI \(4\)/);
      expect(resultadoClienteSemAnulavel.nomesDivergencias.size).toBe(0);
    });

    it('sem categoriaFornecimento: acusa LACUNA ConfigurarCompraFornecedorRequest.categoriaFornecimento (4 LACUNA)', () => {
      const saida = resultadoFornecedorSemAnulavel.stdout + resultadoFornecedorSemAnulavel.stderr;
      expect(secao(saida, 'LACUNA')).toContain('ConfigurarCompraFornecedorRequest.categoriaFornecimento');
      expect(saida).toMatch(/anuláveis sem destino na UI \(4\)/);
      expect(resultadoFornecedorSemAnulavel.nomesDivergencias.size).toBe(0);
    });
  });

  describe('AC-11: v1.11.0a8b67 — CriarClassificacaoPessoaRequest, AtualizarClassificacaoPessoaRequest, InativarClassificacaoPessoaRequest no universo', () => {
    /** Trecho da saída entre o cabeçalho da categoria e o próximo cabeçalho (ou o fim). */
    function secao(saida: string, cabecalho: 'DESCARTE' | 'DEFAULT_SILENCIOSO' | 'LACUNA'): string {
      const linhas = saida.split('\n');
      const inicio = linhas.findIndex((l) =>
        cabecalho === 'LACUNA' ? /anuláveis sem destino/.test(l) : l.includes(`${cabecalho} —`)
      );
      if (inicio < 0) return '';
      const resto = linhas.slice(inicio + 1);
      const fim = resto.findIndex((l) => /^(❌|📋|📊|✅)/.test(l.trim()) && !/^❌\s+\w+\.\w+/.test(l.trim()));
      return (fim < 0 ? resto : resto.slice(0, fim)).join('\n');
    }

    it('o gate mapeia os três records novos (schema → record)', () => {
      const gate = readFileSync(path.join(raizDoProjeto, 'scripts', 'gate-contract-request-fields.mjs'), 'utf8');
      expect(gate).toMatch(/criarClassificacaoPessoaSchema:\s*'CriarClassificacaoPessoaRequest'/);
      expect(gate).toMatch(/atualizarClassificacaoPessoaSchema:\s*'AtualizarClassificacaoPessoaRequest'/);
      expect(gate).toMatch(/inativarClassificacaoPessoaSchema:\s*'InativarClassificacaoPessoaRequest'/);
    });

    it('Sonda B: resolve os três records sem falha estrutural', () => {
      const saida = resultadoHoje.stdout + resultadoHoje.stderr;
      expect(saida).not.toContain('FALHA ESTRUTURAL');
      expect(saida).not.toMatch(/CriarClassificacaoPessoaRequest\.|AtualizarClassificacaoPessoaRequest\.|InativarClassificacaoPessoaRequest\./);
    });

    it('Sonda G: sem descricao anulável em criarClassificacaoPessoaSchema — acusa LACUNA (4 LACUNA)', () => {
      const saida = resultadoClassificacaoPessoaSemAnulavel.stdout + resultadoClassificacaoPessoaSemAnulavel.stderr;
      expect(secao(saida, 'LACUNA')).toContain('CriarClassificacaoPessoaRequest.descricao');
      expect(saida).toMatch(/anuláveis sem destino na UI \(4\)/);
      expect(resultadoClassificacaoPessoaSemAnulavel.nomesDivergencias.size).toBe(0);
    });

    it('Sonda H: sem motivo obrigatório em inativarClassificacaoPessoaSchema — acusa DEFAULT_SILENCIOSO', () => {
      const saida = resultadoClassificacaoPessoaSemObrigatorio.stdout + resultadoClassificacaoPessoaSemObrigatorio.stderr;
      expect(resultadoClassificacaoPessoaSemObrigatorio.exitCode).toBe(1);
      expect(resultadoClassificacaoPessoaSemObrigatorio.nomesDivergencias.has('InativarClassificacaoPessoaRequest.motivo')).toBe(true);
      expect(secao(saida, 'DEFAULT_SILENCIOSO')).toContain('InativarClassificacaoPessoaRequest.motivo');
    });
  });
});
