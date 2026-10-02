#!/usr/bin/env node

/**
 * Gate estrutural: valida que schemas Zod de request do frontend não enviam
 * campos que o record C# do backend não declara, e que não omitem campos
 * obrigatórios (não-anuláveis) que o backend espera.
 *
 * Fatia: v1.11.0a8b58.c3 (Bloco B, C) — contratos de request sem par
 * Escopo: oito records em cinco módulos
 *   - produtos: AtualizarDadosFiscaisProdutoRequest, VincularProdutoFornecedorRequest
 *   - estoque: TransferirEstoqueRequest
 *   - administracao: CriarEmpresaRequest, AtualizarEmpresaRequest, DefinirEnderecoFiscalRequest
 *   - seguranca: CriarUsuarioRequest
 *   - rh: AdmitirColaboradorRequest
 *   - clientes: ConfigurarComercialClienteRequest (v1.11.0a8b66, AC-13)
 *   - fornecedores: ConfigurarCompraFornecedorRequest (v1.11.0a8b66, AC-13)
 *   - faturamento: ConfirmarFaturamentoRequest (v1.11.0a8b71, D97, AC-10)
 *   - vendas: FaturarPedidoVendaRequest (v1.11.0a8b71, D97, AC-10)
 *   - naturezasOperacao: CriarNaturezaOperacaoRequest, AtualizarNaturezaOperacaoRequest,
 *     InativarNaturezaOperacaoRequest e o MapeamentoCfopRequest aninhado em `cfops`
 *     (v1.11.0a8b72, D98, AC-11, NO-17)
 *   - pessoas (endereço): AdicionarEnderecoPessoaRequest, AtualizarEnderecoPessoaRequest
 *     (v1.11.0a8b73, D102, AC-8), lidos do markdown: §10 traz os 9 campos com a mesma nulabilidade do C#
 *     (`EnderecoContatoRequests.cs:5-25`), e só `Complemento` é anulável. Não precisam do snapshot.
 *
 * Lado backend: os records são lidos do catálogo de payloads de
 * docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md (§10). Record mapeado e não encontrado lá reprova.
 * Exceção (D83 estendida, v1.11.0a8b72, NO-4): os records de RECORDS_DO_SNAPSHOT_CSHARP vêm do
 * snapshot gerado scripts/backend-request-records.snapshot.json, que tem precedência sobre o markdown.
 * O markdown traz `MapeamentoCfopRequest(Ambito, CfopCodigo)`, sem `TipoItem`; o C# tem os três. O gate
 * imprime a origem (arquivo:linha do C#) e a diferença para o markdown. Record desse conjunto ausente
 * do snapshot reprova.
 *
 * Severidade NAO_ENVIADO (D97): nos records de RECORDS_ENVIO_INTEGRAL, campo anulável que a UI não
 * envia reprova, em vez de virar LACUNA informativa. É a classe do FT-1/FT-2: o tipo C# é anulável,
 * mas o fluxo a jusante exige o valor, e a UI nunca o mandava.
 *
 * Modo de falha: asserção nominal por campo, jamais por total.
 * Prova vermelha: contra a árvore de hoje deve acusar 29 campos específicos em três categorias.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Mapeia schemas Zod de request aos records C# correspondentes.
 */
const SCHEMA_TO_REQUEST_MAP = {
  produtos: {
    atualizarDadosFiscaisProdutoSchema: 'AtualizarDadosFiscaisProdutoRequest',
    vincularFornecedorProdutoSchema: 'VincularProdutoFornecedorRequest'
  },
  estoque: {
    transferenciaEstoqueSchema: 'TransferirEstoqueRequest'
  },
  administracao: {
    criarEmpresaSchema: 'CriarEmpresaRequest',
    atualizarEmpresaSchema: 'AtualizarEmpresaRequest',
    definirEnderecoFiscalSchema: 'DefinirEnderecoFiscalRequest'
  },
  seguranca: {
    criarUsuarioSegurancaSchema: 'CriarUsuarioRequest'
  },
  rh: {
    admitirColaboradorSchema: 'AdmitirColaboradorRequest'
  },
  clientes: {
    configurarComercialClienteSchema: 'ConfigurarComercialClienteRequest'
  },
  fornecedores: {
    configurarCompraFornecedorSchema: 'ConfigurarCompraFornecedorRequest'
  },
  pessoas: {
    criarClassificacaoPessoaSchema: 'CriarClassificacaoPessoaRequest',
    atualizarClassificacaoPessoaSchema: 'AtualizarClassificacaoPessoaRequest',
    inativarClassificacaoPessoaSchema: 'InativarClassificacaoPessoaRequest',
    // v1.11.0a8b73 (D102, AC-8): endereços da Pessoa. O PATCH de município (`VincularMunicipioEnderecoPessoaRequest`)
    // é da b74 e não entra aqui.
    criarEnderecoPessoaSchema: 'AdicionarEnderecoPessoaRequest',
    atualizarEnderecoPessoaSchema: 'AtualizarEnderecoPessoaRequest'
  },
  faturamento: {
    confirmarFaturamentoSchema: 'ConfirmarFaturamentoRequest'
  },
  vendas: {
    faturarPedidoVendaSchema: 'FaturarPedidoVendaRequest'
  },
  naturezasOperacao: {
    criarNaturezaOperacaoSchema: 'CriarNaturezaOperacaoRequest',
    atualizarNaturezaOperacaoSchema: 'AtualizarNaturezaOperacaoRequest',
    inativarNaturezaOperacaoSchema: 'InativarNaturezaOperacaoRequest',
    // Item de `cfops` nos dois primeiros: o schema do item é comparado ao record aninhado.
    mapeamentoCfopSchema: 'MapeamentoCfopRequest'
  }
};

/**
 * Arquivo de schemas do módulo quando ele não segue `features/<modulo>/schemas/<modulo>Schemas.ts`.
 * v1.11.0a8b72: os schemas de natureza vivem em `features/fiscal` (D91, D98), num arquivo próprio.
 */
const ARQUIVO_DE_SCHEMAS_DO_MODULO = {
  naturezasOperacao: 'features/fiscal/schemas/naturezasOperacaoSchemas.ts'
};

function arquivoDeSchemas(moduleName) {
  return ARQUIVO_DE_SCHEMAS_DO_MODULO[moduleName] || `features/${moduleName}/schemas/${moduleName}Schemas.ts`;
}

/**
 * D83 estendida (v1.11.0a8b72, NO-4): records cujo lado backend vem do snapshot gerado a partir do C#,
 * e não do markdown. O markdown de 2026-08-12 não tem `TipoItem` em `MapeamentoCfopRequest`; os três
 * requests de natureza batem com o C# (13/13, 10/10, 1/1) e vêm do mesmo snapshot para que o conjunto
 * de natureza tenha uma única origem.
 */
const RECORDS_DO_SNAPSHOT_CSHARP = new Set([
  'CriarNaturezaOperacaoRequest',
  'AtualizarNaturezaOperacaoRequest',
  'InativarNaturezaOperacaoRequest',
  'MapeamentoCfopRequest'
]);
const SNAPSHOT_REQUEST_PATH = 'scripts/backend-request-records.snapshot.json';

/**
 * D97 (AC-10): records em que todo campo do contrato tem de ser enviado pela UI. Campo anulável
 * ausente do schema reprova como NAO_ENVIADO (não é LACUNA informativa).
 *   - ConfirmarFaturamentoRequest: naturezaOperacaoId é exigido no leg 1 com validação fiscal
 *     (GerarNotaFiscalPedidoVendaUseCase.cs:165-167, FT-2) e correlationId na transmissão
 *     (NotaFiscalValidators.cs:236-238, FT-1), embora os dois sejam anuláveis no record.
 *   - FaturarPedidoVendaRequest: três campos, todos oferecidos no diálogo.
 *   - Criar/AtualizarNaturezaOperacaoRequest (v1.11.0a8b72, D98): `cfops` é anulável no C#, e `null`
 *     preserva a lista no PUT enquanto `[]` apaga; omitir o campo é mandar `null` em silêncio, e a tela
 *     de edição deixaria de gravar a grade sem erro. `filialId` e `observacao` são oferecidos no diálogo.
 *   - MapeamentoCfopRequest (v1.11.0a8b72, NO-4): `tipoItem` é a 2ª dimensão da chave (âmbito × tipo
 *     de item); omitido, todo mapeamento vira "qualquer item" e o PUT substitui a lista com a chave
 *     achatada. É o campo que o markdown do contrato perdeu.
 *   - InativarNaturezaOperacaoRequest: o único campo (`motivo`) é obrigatório, então entrar no conjunto
 *     não muda o resultado de hoje; entra para que um campo anulável aditivo do backend neste request
 *     reprove como NAO_ENVIADO e force a decisão, em vez de passar como LACUNA.
 *   - Adicionar/AtualizarEnderecoPessoaRequest (v1.11.0a8b73, D102, AC-8): entram. O `principal` omitido
 *     muda o comportamento, mas ele é `bool` não anulável no C#, então a omissão reprova como
 *     DEFAULT_SILENCIOSO com ou sem este conjunto: o backend leria `false`, e o POST ignoraria o "principal"
 *     marcado na tela (`Pessoa.cs:128-142`). O conjunto protege o outro campo, `complemento`, o único anulável.
 *     O PUT grava `NormalizarOpcional(complemento)` (`EnderecoPessoa.cs:58`), então omiti-lo apaga em
 *     silêncio o complemento já cadastrado. Também faz um campo anulável aditivo do backend nestes
 *     records reprovar e forçar a decisão: o `municipioIbgeCodigo` é do PATCH da b74, e se ele aparecer
 *     aqui, alguém tem de decidir.
 */
const RECORDS_ENVIO_INTEGRAL = new Set([
  'ConfirmarFaturamentoRequest',
  'FaturarPedidoVendaRequest',
  'CriarNaturezaOperacaoRequest',
  'AtualizarNaturezaOperacaoRequest',
  'InativarNaturezaOperacaoRequest',
  'MapeamentoCfopRequest',
  'AdicionarEnderecoPessoaRequest',
  'AtualizarEnderecoPessoaRequest'
]);

/**
 * Campos que a UI deixa de enviar por decisão travada, nos records de RECORDS_ENVIO_INTEGRAL.
 * Não reprovam nem entram na contagem de LACUNA; são impressos com a decisão. Entrada cujo campo
 * não existe mais no record reprova (exclusão órfã).
 */
const FORA_DA_UI_POR_DECISAO = {
  'ConfirmarFaturamentoRequest.cfopPadrao': 'D94 (o CFOP vem da natureza de operação)',
  'ConfirmarFaturamentoRequest.certificateThumbprint': 'D97 (Faturamento sem campo de certificado; B-29)'
};

/**
 * Lê o documento de contrato e extrai campos de cada record C# de request.
 * Estratégia: procura por assinaturas que começam uma linha (multiline mode).
 */
function loadRequestContractFromDocument(contractPath) {
  if (!fs.existsSync(contractPath)) {
    console.error(`❌ Arquivo de contrato não encontrado: ${contractPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(contractPath, 'utf8');
  const contracts = {};

  const recordNames = [
    'AtualizarDadosFiscaisProdutoRequest',
    'VincularProdutoFornecedorRequest',
    'TransferirEstoqueRequest',
    'CriarEmpresaRequest',
    'AtualizarEmpresaRequest',
    'DefinirEnderecoFiscalRequest',
    'CriarUsuarioRequest',
    'AdmitirColaboradorRequest',
    'ConfigurarComercialClienteRequest',
    'ConfigurarCompraFornecedorRequest',
    'CriarClassificacaoPessoaRequest',
    'AtualizarClassificacaoPessoaRequest',
    'InativarClassificacaoPessoaRequest',
    'ConfirmarFaturamentoRequest',
    'FaturarPedidoVendaRequest',
    // v1.11.0a8b73 (D102): endereços da Pessoa, lidos do markdown (iguais ao C#, 9/9)
    'AdicionarEnderecoPessoaRequest',
    'AtualizarEnderecoPessoaRequest',
    // v1.11.0a8b72: lidos do markdown só para imprimir a diferença para o snapshot do C#
    'CriarNaturezaOperacaoRequest',
    'AtualizarNaturezaOperacaoRequest',
    'InativarNaturezaOperacaoRequest',
    'MapeamentoCfopRequest'
  ];

  for (const recordName of recordNames) {
    // Padrão: assinatura em linha nova, não em comentário
    const pattern = new RegExp(`^${recordName}\\s*\\(\\s*([^)]+)\\)`, 'm');
    const match = content.match(pattern);

    if (!match) continue;

    let fieldsString = match[1];

    // Remove comentários XML (blocos de /// entre os campos)
    // Padrão: ,/// ... bool? (remove tudo entre , e o campo seguinte)
    fieldsString = fieldsString.replace(/,\s*\/\/\/[\s\S]*?(bool\?)/g, ',$1');
    // Remove comentários de bloco /* ... */
    fieldsString = fieldsString.replace(/\/\*[\s\S]*?\*\//g, ' ');

    // Split por vírgula
    const fieldDefs = fieldsString
      .split(',')
      .map(s => s.trim())
      .map(s => s.replace(/\/\/.*$/, '').trim())
      .filter(s => s.length > 0);

    const fields = [];
    for (const fieldDef of fieldDefs) {
      // Remove valor default se existir
      const withoutDefault = fieldDef.replace(/\s*=\s*[^\s,]+.*$/, '').trim();

      // Split em tokens
      const tokens = withoutDefault.split(/\s+/).filter(t => t.length > 0);
      if (tokens.length < 2) continue;

      // Tipo é o penúltimo token, nome é o último
      const type = tokens[tokens.length - 2];
      let fieldName = tokens[tokens.length - 1];

      // Valida identificador (PascalCase)
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(fieldName)) {
        continue;
      }

      // Detecta nulabilidade do tipo ou nome
      const nullable = type.endsWith('?') || fieldName.endsWith('?');

      if (fieldName.endsWith('?')) {
        fieldName = fieldName.slice(0, -1);
      }

      const camelCased = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
      fields.push({
        name: camelCased,
        originalName: fieldName,
        nullable
      });
    }

    if (fields.length > 0) {
      contracts[recordName] = fields;
    }
  }

  return contracts;
}

/**
 * D83 estendida (v1.11.0a8b72): lê os records de RECORDS_DO_SNAPSHOT_CSHARP do snapshot gerado.
 * Snapshot ausente devolve {} e os records caem em RECORD_NOT_FOUND (reprova), nunca em lista vazia
 * com aviso. Snapshot ilegível reprova.
 */
function loadRequestContractFromSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) return { records: {}, backendCommit: null };
  let snapshot;
  try {
    snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  } catch (e) {
    console.error(`❌ Snapshot ilegível: ${snapshotPath} (${e.message})`);
    process.exit(1);
  }
  const records = {};
  for (const recordName of RECORDS_DO_SNAPSHOT_CSHARP) {
    const r = snapshot.records?.[recordName];
    if (!r || !Array.isArray(r.fields) || r.fields.length === 0) continue;
    records[recordName] = {
      fields: r.fields.map((f) => ({ name: f.name, nullable: f.nullable === true })),
      origin: r.origin ? `${r.origin.file}:${r.origin.line}` : '?'
    };
  }
  return { records, backendCommit: snapshot.backendCommit || null };
}

/**
 * Imprime a origem do lado backend lido do C#, com a diferença para o markdown (NO-4).
 */
function imprimirOrigemCsharp(snapshotCsharp, markdownContracts, recordsNoUniverso) {
  const linhas = [];
  for (const [recordName, r] of Object.entries(snapshotCsharp.records)) {
    if (!recordsNoUniverso.has(recordName)) continue;
    const md = markdownContracts[recordName];
    let diferenca;
    if (!md) {
      diferenca = 'ausente do markdown';
    } else {
      const nomesMd = new Set(md.map((f) => f.name));
      const nomesCs = r.fields.map((f) => f.name);
      const semNoMd = nomesCs.filter((n) => !nomesMd.has(n));
      const soNoMd = [...nomesMd].filter((n) => !nomesCs.includes(n));
      diferenca =
        semNoMd.length === 0 && soNoMd.length === 0
          ? `markdown igual, ${nomesCs.length}/${nomesCs.length}`
          : [semNoMd.length ? `markdown sem: ${semNoMd.join(', ')}` : '', soNoMd.length ? `só no markdown: ${soNoMd.join(', ')}` : '']
              .filter(Boolean)
              .join('; ');
    }
    linhas.push(`   ℹ️  ${recordName} ← ${r.origin} (${r.fields.length} campos; ${diferenca})`);
  }
  if (linhas.length === 0) return;
  console.log(`🔎 Lado backend lido do C# (${SNAPSHOT_REQUEST_PATH}, backend ${snapshotCsharp.backendCommit || '?'}):`);
  for (const linha of linhas) console.log(linha);
  console.log('');
}

/**
 * Devolve o texto com comentários, literais de string e todo conteúdo dentro de (), {} e [] trocados
 * por espaço (quebras de linha preservadas), deixando visíveis só as chaves de nível zero.
 */
function somenteNivelZero(texto) {
  let saida = '';
  let profundidade = 0;
  let i = 0;
  const branco = (s) => s.replace(/[^\n]/g, ' ');
  while (i < texto.length) {
    const ch = texto[i];
    const par = texto.substr(i, 2);
    if (par === '//') {
      const fim = texto.indexOf('\n', i);
      const ate = fim < 0 ? texto.length : fim;
      saida += branco(texto.substring(i, ate));
      i = ate;
      continue;
    }
    if (par === '/*') {
      const fim = texto.indexOf('*/', i + 2);
      const ate = fim < 0 ? texto.length : fim + 2;
      saida += branco(texto.substring(i, ate));
      i = ate;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < texto.length && texto[j] !== ch) j += texto[j] === '\\' ? 2 : 1;
      saida += branco(texto.substring(i, j + 1));
      i = j + 1;
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') {
      profundidade++;
      saida += ' ';
      i++;
      continue;
    }
    if (ch === ')' || ch === '}' || ch === ']') {
      profundidade = Math.max(0, profundidade - 1);
      saida += ' ';
      i++;
      continue;
    }
    saida += profundidade === 0 || ch === '\n' ? ch : ' ';
    i++;
  }
  return saida;
}

/**
 * Extrai campos de um schema Zod de um arquivo TypeScript.
 * Detecta `fieldName:` ou `fieldName,` em linhas indentadas do objeto.
 */
function extractZodSchemaFields(fileContent, schemaName, visitados = new Set()) {
  if (visitados.has(schemaName)) return null;
  visitados.add(schemaName);

  // Procura pela declaração: `[export] const X = z.object({` ou `[export] const X = Base.extend({`
  // (v1.11.0a8b71: o request do Confirmar é o schema de campos do formulário estendido com correlationId).
  const declPattern = new RegExp(`(?:^|\\n)(?:export\\s+)?const\\s+${schemaName}\\s*=\\s*`);
  const declMatch = declPattern.exec(fileContent);
  if (!declMatch) {
    return null;
  }
  const exprStart = declMatch.index + declMatch[0].length;
  const expr = fileContent.substring(exprStart);

  const objectMatch = /^z\s*\.\s*object\s*\(\s*\{/.exec(expr);
  const extendMatch = objectMatch ? null : /^(\w+)\s*\.\s*extend\s*\(\s*\{/.exec(expr);
  if (!objectMatch && !extendMatch) {
    return null;
  }

  let baseFields = [];
  if (extendMatch) {
    const base = extractZodSchemaFields(fileContent, extendMatch[1], visitados);
    if (!base) return null;
    baseFields = base;
  }

  // Encontra o `}` que fecha o objeto
  const blockStart = exprStart + (objectMatch || extendMatch)[0].length - 1;

  let braceCount = 0;
  let idx = blockStart;
  let foundFirstBrace = false;

  while (idx < fileContent.length) {
    const char = fileContent[idx];
    if (char === '{') {
      braceCount++;
      foundFirstBrace = true;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && foundFirstBrace) {
        break;
      }
    }
    idx++;
  }

  if (!foundFirstBrace || braceCount !== 0) return null;

  // v1.11.0a8b72: só as chaves de nível zero do objeto são campos do request. Conteúdo aninhado
  // (`z.string({ required_error: ... })`), strings e comentários viram espaço antes da busca; sem isso
  // `required_error`/`invalid_type_error` saíam como DESCARTE nos schemas de natureza.
  const schemaBlock = somenteNivelZero(fileContent.substring(blockStart + 1, idx));

  // Extrai campos: procura por `fieldName:` ou `fieldName,` (referência)
  // Padrão 1: `fieldName: ...` (declaração inline)
  // Padrão 2: `fieldName,` ou `fieldName\n` (referência a variável)
  const fieldPattern1 = /(\w+)\s*:/g;
  const fieldPattern2 = /[,\n]\s*(\w+)\s*(?:[,\n]|$|\.refine)/g;

  const fields = new Set();
  let match;

  // Padrão 1: fieldName:
  while ((match = fieldPattern1.exec(schemaBlock)) !== null) {
    const fieldName = match[1];
    if (!['refine', 'default', 'optional', 'nullable', 'transform', 'or', 'catch', 'path', 'message', 'values', 'property', 'error', 'type', 'parser'].includes(fieldName) && !/^\d+$/.test(fieldName)) {
      fields.add(fieldName);
    }
  }

  // Padrão 2: ,fieldName, ou similar (referência a variável)
  while ((match = fieldPattern2.exec(schemaBlock)) !== null) {
    const fieldName = match[1];
    if (!['refine', 'default', 'optional', 'nullable', 'transform', 'or', 'catch', 'path', 'message', 'values', 'property', 'error', 'type', 'parser'].includes(fieldName) && !/^\d+$/.test(fieldName)) {
      fields.add(fieldName);
    }
  }

  return [...new Set([...baseFields, ...fields])];
}

/**
 * Compara campos de request do schema Zod contra o contrato C#.
 * Retorna { divergences, missingSchemas } onde:
 *   - divergences: array de divergências com severidade (DESCARTE, DEFAULT_SILENCIOSO, LACUNA)
 *   - missingSchemas: array de schemas mapeados mas não encontrados (falha dura)
 */
function validateRequestModule(moduleName, fileContent, backendContracts) {
  const divergences = [];
  const missingSchemas = [];
  const schemasMap = SCHEMA_TO_REQUEST_MAP[moduleName];

  if (!schemasMap) {
    console.warn(`⚠️  Módulo ${moduleName} não configurado no gate.`);
    return { divergences, missingSchemas };
  }

  for (const [schemaName, recordName] of Object.entries(schemasMap)) {
    const schemaFields = extractZodSchemaFields(fileContent, schemaName);
    const contractRecord = backendContracts[recordName];

    if (!schemaFields) {
      // Schema foi mapeado mas não encontrado — falha dura
      missingSchemas.push({ moduleName, schemaName, recordName, type: 'SCHEMA_NOT_FOUND' });
      continue;
    }

    if (!contractRecord) {
      // Record foi mapeado mas não existe no contrato — falha dura
      missingSchemas.push({ moduleName, schemaName, recordName, type: 'RECORD_NOT_FOUND' });
      continue;
    }

    // Conjunto de campos esperados no C#
    const expectedFields = new Map();
    for (const field of contractRecord) {
      expectedFields.set(field.name, field.nullable);
    }

    // Verifica cada campo do schema
    for (const schemaField of schemaFields) {
      if (!expectedFields.has(schemaField)) {
        // Campo enviado mas não declarado no C#
        divergences.push({
          module: moduleName,
          schema: schemaName,
          record: recordName,
          field: schemaField,
          severity: 'DESCARTE',
          reason: `Campo não existe em ${recordName}`
        });
      }
    }

    // Verifica cada campo do C# que deveria ser enviado
    for (const [fieldName, nullable] of expectedFields.entries()) {
      if (!schemaFields.includes(fieldName)) {
        const chave = `${recordName}.${fieldName}`;
        if (nullable && RECORDS_ENVIO_INTEGRAL.has(recordName)) {
          if (FORA_DA_UI_POR_DECISAO[chave]) {
            divergences.push({
              module: moduleName,
              schema: schemaName,
              record: recordName,
              field: fieldName,
              severity: 'FORA_POR_DECISAO',
              reason: FORA_DA_UI_POR_DECISAO[chave]
            });
          } else {
            // D97: o backend aceita o campo e a UI não o envia (classe FT-1/FT-2)
            divergences.push({
              module: moduleName,
              schema: schemaName,
              record: recordName,
              field: fieldName,
              severity: 'NAO_ENVIADO',
              reason: `Campo aceito por ${recordName} e nunca enviado pela UI`
            });
          }
        } else if (nullable) {
          // Campo anulável sem destino na UI
          divergences.push({
            module: moduleName,
            schema: schemaName,
            record: recordName,
            field: fieldName,
            severity: 'LACUNA',
            reason: `Campo anulável não oferecido na UI`
          });
        } else {
          // Campo não-anulável não enviado
          divergences.push({
            module: moduleName,
            schema: schemaName,
            record: recordName,
            field: fieldName,
            severity: 'DEFAULT_SILENCIOSO',
            reason: `Campo obrigatório não enviado — backend grava o default`
          });
        }
      }
    }
  }

  return { divergences, missingSchemas };
}

/**
 * Carrega allowlist de exceções.
 */
function loadAllowlist() {
  const allowlistPath = path.join(ROOT, 'scripts', 'gate-contract-request-fields.allowlist.json');
  if (!fs.existsSync(allowlistPath)) {
    return { exceptions: [], teto: 0 };
  }

  try {
    const content = fs.readFileSync(allowlistPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn(`⚠️  Aviso: não conseguiu ler allowlist: ${e.message}`);
    return { exceptions: [], teto: 0 };
  }
}

/**
 * Valida teto de exceções.
 */
function validateExceptionsCeiling(allowlist) {
  if (!allowlist.hasOwnProperty('teto') || allowlist.teto === null || allowlist.teto === undefined) {
    if (allowlist.exceptions && allowlist.exceptions.length > 0) {
      console.error(`❌ Campo 'teto' ausente no allowlist.`);
      console.error(`   Registre teto: ${allowlist.exceptions.length} no allowlist.`);
      process.exit(1);
    }
    return true;
  }

  if (!Number.isInteger(allowlist.teto)) {
    console.error(`❌ Campo 'teto' não é inteiro: ${allowlist.teto}`);
    process.exit(1);
  }

  if (allowlist.exceptions && allowlist.exceptions.length !== allowlist.teto) {
    console.error(`❌ Divergência no teto de exceções:`);
    console.error(`   Esperado: ${allowlist.exceptions.length}, Registrado: ${allowlist.teto}`);
    process.exit(1);
  }

  return true;
}

/**
 * Filtra divergências permitidas pelo allowlist.
 */
function filterAllowlisted(divergences, allowlist) {
  const allowlistedSet = new Set();

  if (allowlist.exceptions) {
    for (const ex of allowlist.exceptions) {
      const key = `${ex.record}/${ex.field}`;
      allowlistedSet.add(key);
    }
  }

  return divergences.filter(div => {
    const key = `${div.record}/${div.field}`;
    return !allowlistedSet.has(key);
  });
}

/**
 * Mapa de destino para campos LACUNA (§8.1 do plano).
 * Indica em qual bloco cada campo será preenchido.
 */
const LACUNA_DESTINO = {
  // Campos LACUNA que ainda não têm cobertura de UI (próximas fatias)
  'TransferirEstoqueRequest.origemId': 'D73',
  'AtualizarEmpresaRequest.contribuinteIpi': 'b64'
};

/**
 * Ponto de entrada.
 */
function main() {
  const modules = Object.keys(SCHEMA_TO_REQUEST_MAP);
  const allDivergences = [];
  const allMissingSchemas = [];
  const ignoredRecords = new Set();
  const allowlist = loadAllowlist();

  // Lê recortes que devem ser ignorados (para sondagem histórica contra revisões antigas)
  // Formato: GATE_RECORTES_IGNORADOS="RecorteA,RecorteB"
  const ignoredEnv = process.env.GATE_RECORTES_IGNORADOS || '';
  if (ignoredEnv) {
    const ignored = ignoredEnv.split(',').map(s => s.trim()).filter(s => s.length > 0);
    ignored.forEach(r => ignoredRecords.add(r));
  }

  // Carrega contrato
  const contractPath = path.join(ROOT, 'docs', 'BACKEND-ESTADO-ATUAL-E-CONTRATO.md');
  const MARKDOWN_CONTRACTS = loadRequestContractFromDocument(contractPath);
  const BACKEND_CONTRACTS = { ...MARKDOWN_CONTRACTS };
  for (const recordName of RECORDS_DO_SNAPSHOT_CSHARP) delete BACKEND_CONTRACTS[recordName];
  const snapshotCsharp = loadRequestContractFromSnapshot(path.join(ROOT, SNAPSHOT_REQUEST_PATH));
  for (const [recordName, r] of Object.entries(snapshotCsharp.records)) {
    BACKEND_CONTRACTS[recordName] = r.fields;
  }
  const recordsNoUniverso = new Set(
    modules.flatMap((m) => Object.values(SCHEMA_TO_REQUEST_MAP[m])).filter((r) => !ignoredRecords.has(r))
  );
  imprimirOrigemCsharp(snapshotCsharp, MARKDOWN_CONTRACTS, recordsNoUniverso);

  validateExceptionsCeiling(allowlist);

  // Exclusão por decisão cujo campo não existe mais no record reprova (exclusão órfã)
  const exclusoesOrfas = Object.keys(FORA_DA_UI_POR_DECISAO).filter((chave) => {
    const [record, campo] = chave.split('.');
    const contrato = BACKEND_CONTRACTS[record];
    return contrato && !contrato.some((f) => f.name === campo);
  });
  if (exclusoesOrfas.length > 0) {
    console.error('❌ FALHA ESTRUTURAL — exclusões de FORA_DA_UI_POR_DECISAO sem campo no record:');
    for (const chave of exclusoesOrfas) {
      console.error(`   ❌ ${chave}`);
    }
    process.exit(1);
  }

  for (const moduleName of modules) {
    const schemaFile = path.join(ROOT, arquivoDeSchemas(moduleName));

    if (!fs.existsSync(schemaFile)) {
      // v1.11.0a8b72: arquivo ausente vira FILE_NOT_FOUND por schema do módulo. Continua falha dura,
      // salvo quando o record está em GATE_RECORTES_IGNORADOS (sondagem de revisão anterior ao módulo).
      for (const [schemaName, recordName] of Object.entries(SCHEMA_TO_REQUEST_MAP[moduleName])) {
        allMissingSchemas.push({ moduleName, schemaName, recordName, type: 'FILE_NOT_FOUND', arquivo: arquivoDeSchemas(moduleName) });
      }
      continue;
    }

    const content = fs.readFileSync(schemaFile, 'utf8');
    const result = validateRequestModule(moduleName, content, BACKEND_CONTRACTS);
    allDivergences.push(...result.divergences);
    allMissingSchemas.push(...result.missingSchemas);
  }

  // Filtra missing schemas: mantém apenas os que NÃO estão em ignoredRecords
  const criticalMissing = allMissingSchemas.filter(m => !ignoredRecords.has(m.recordName));
  const ignoredMissing = allMissingSchemas.filter(m => ignoredRecords.has(m.recordName));

  // Imprime quais foram ignorados (transparência)
  if (ignoredMissing.length > 0) {
    console.log(`ℹ️  Recortes ignorados por GATE_RECORTES_IGNORADOS (${ignoredMissing.length}):`);
    for (const missing of ignoredMissing) {
      console.log(`   ⊘  ${missing.recordName} (para sondagem histórica)`);
    }
    console.log('');
  }

  // Verifica se há schemas mapeados mas não encontrados (falha dura)
  // Excluindo aqueles deliberadamente ignorados para sondagem histórica
  if (criticalMissing.length > 0) {
    console.error('❌ FALHA ESTRUTURAL — schemas mapeados mas não encontrados:');
    console.error('');
    for (const missing of criticalMissing) {
      if (missing.type === 'SCHEMA_NOT_FOUND') {
        console.error(`   ❌ ${missing.moduleName}/${missing.schemaName} → mapeado a ${missing.recordName} mas não existe no arquivo TS`);
      } else if (missing.type === 'FILE_NOT_FOUND') {
        console.error(`   ❌ ${missing.moduleName}/${missing.schemaName} → mapeado a ${missing.recordName}, e o arquivo ${missing.arquivo} não existe`);
      } else {
        const fonte = RECORDS_DO_SNAPSHOT_CSHARP.has(missing.recordName)
          ? `${SNAPSHOT_REQUEST_PATH}; regenere com node scripts/generate-backend-request-records-snapshot.mjs`
          : 'docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md';
        console.error(`   ❌ ${missing.recordName} → mapeado mas não encontrado no contrato (${fonte})`);
      }
    }
    console.error('');
    console.error(`📊 ${criticalMissing.length} schema(s) estruturalmente quebrado(s).`);
    process.exit(1);
  }

  // Filtra
  const filteredDivergences = filterAllowlisted(allDivergences, allowlist);

  // Separa por severidade
  const descarte = filteredDivergences.filter(d => d.severity === 'DESCARTE');
  const defaultSilencioso = filteredDivergences.filter(d => d.severity === 'DEFAULT_SILENCIOSO');
  const lacuna = filteredDivergences.filter(d => d.severity === 'LACUNA');
  const naoEnviado = filteredDivergences.filter(d => d.severity === 'NAO_ENVIADO');
  const foraPorDecisao = filteredDivergences.filter(d => d.severity === 'FORA_POR_DECISAO');

  const imprimirForaPorDecisao = () => {
    if (foraPorDecisao.length === 0) return;
    console.log(`\n📌 Campos fora da UI por decisão travada (${foraPorDecisao.length}):`);
    for (const div of foraPorDecisao) {
      console.log(`   ℹ️  ${div.record}.${div.field} → ${div.reason}`);
    }
  };

  // Relatório
  if (descarte.length === 0 && defaultSilencioso.length === 0 && naoEnviado.length === 0) {
    console.log('✅ Nenhuma divergência crítica detectada.');
    console.log('   Schemas de request não enviam campos desconhecidos.');
    console.log('   Campos obrigatórios do contrato são enviados.');

    if (lacuna.length > 0) {
      console.log(`\n📋 Campos anuláveis sem destino na UI (${lacuna.length}):`);
      for (const div of lacuna) {
        const chave = `${div.record}.${div.field}`;
        const destino = LACUNA_DESTINO[chave] || '?';
        console.log(`   ℹ️  ${chave} → ${destino}`);
      }
    }

    imprimirForaPorDecisao();

    if (allowlist.exceptions && allowlist.exceptions.length > 0) {
      console.log(`\n   (${allowlist.exceptions.length} exceções no allowlist)`);
    }
    process.exit(0);
  }

  // Erro
  if (descarte.length > 0) {
    console.error('❌ DESCARTE — campos enviados mas não declarados:');
    console.error('');
    for (const div of descarte) {
      console.error(`   ❌ ${div.record}.${div.field}`);
    }
    console.error('');
  }

  if (defaultSilencioso.length > 0) {
    console.error('❌ DEFAULT_SILENCIOSO — campos obrigatórios não enviados:');
    console.error('');
    for (const div of defaultSilencioso) {
      console.error(`   ❌ ${div.record}.${div.field}`);
    }
    console.error('');
  }

  if (naoEnviado.length > 0) {
    console.error('❌ NAO_ENVIADO — campos que o backend aceita e a UI não envia (D97, classe FT-1/FT-2):');
    console.error('');
    for (const div of naoEnviado) {
      console.error(`   ❌ ${div.record}.${div.field}`);
    }
    console.error('');
  }

  // Imprime LACUNA (não reprova, mas monitora para AC-4)
  if (lacuna.length > 0) {
    console.log(`📋 LACUNA — campos anuláveis sem destino na UI (${lacuna.length}):`);
    console.log('');
    for (const div of lacuna) {
      const chave = `${div.record}.${div.field}`;
      const destino = LACUNA_DESTINO[chave] || '?';
      console.log(`   ℹ️  ${chave} → ${destino}`);
    }
    console.log('');
  }

  imprimirForaPorDecisao();

  console.error(`📊 Total: ${descarte.length} DESCARTE + ${defaultSilencioso.length} DEFAULT_SILENCIOSO + ${naoEnviado.length} NAO_ENVIADO + ${lacuna.length} LACUNA`);
  process.exit(1);
}

main();
