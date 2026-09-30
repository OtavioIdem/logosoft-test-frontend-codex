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
 *
 * Lado backend: os records são lidos do catálogo de payloads de
 * docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md (§10). Record mapeado e não encontrado lá reprova.
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
    inativarClassificacaoPessoaSchema: 'InativarClassificacaoPessoaRequest'
  },
  faturamento: {
    confirmarFaturamentoSchema: 'ConfirmarFaturamentoRequest'
  },
  vendas: {
    faturarPedidoVendaSchema: 'FaturarPedidoVendaRequest'
  }
};

/**
 * D97 (AC-10): records em que todo campo do contrato tem de ser enviado pela UI. Campo anulável
 * ausente do schema reprova como NAO_ENVIADO (não é LACUNA informativa).
 *   - ConfirmarFaturamentoRequest: naturezaOperacaoId é exigido no leg 1 com validação fiscal
 *     (GerarNotaFiscalPedidoVendaUseCase.cs:165-167, FT-2) e correlationId na transmissão
 *     (NotaFiscalValidators.cs:236-238, FT-1), embora os dois sejam anuláveis no record.
 *   - FaturarPedidoVendaRequest: três campos, todos oferecidos no diálogo.
 */
const RECORDS_ENVIO_INTEGRAL = new Set(['ConfirmarFaturamentoRequest', 'FaturarPedidoVendaRequest']);

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
    'FaturarPedidoVendaRequest'
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

  const schemaBlock = fileContent.substring(blockStart + 1, idx);

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
  const BACKEND_CONTRACTS = loadRequestContractFromDocument(contractPath);

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
    const schemaFile = path.join(
      ROOT,
      'features',
      moduleName,
      'schemas',
      `${moduleName}Schemas.ts`
    );

    if (!fs.existsSync(schemaFile)) {
      console.error(`❌ Arquivo não encontrado: ${schemaFile}`);
      process.exit(1);
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
      } else {
        console.error(`   ❌ ${missing.recordName} → mapeado mas não encontrado no contrato (docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md)`);
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
