#!/usr/bin/env node

/**
 * Gate estrutural: valida que schemas Zod de request do frontend não enviam
 * campos que o record C# do backend não declara, e que não omitem campos
 * obrigatórios (não-anuláveis) que o backend espera.
 *
 * Fatia: v1.11.0a8b58.c3 — contratos de request sem par
 * Escopo: seis records em cinco módulos
 *   - produtos: AtualizarDadosFiscaisProdutoRequest, VincularProdutoFornecedorRequest
 *   - estoque: TransferirEstoqueRequest
 *   - administracao: CriarEmpresaRequest, AtualizarEmpresaRequest
 *   - seguranca: CriarUsuarioRequest
 *   - rh: AdmitirColaboradorRequest
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
    atualizarEmpresaSchema: 'AtualizarEmpresaRequest'
  },
  seguranca: {
    criarUsuarioSegurancaSchema: 'CriarUsuarioRequest'
  },
  rh: {
    admitirColaboradorSchema: 'AdmitirColaboradorRequest'
  }
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
    'CriarUsuarioRequest',
    'AdmitirColaboradorRequest'
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
function extractZodSchemaFields(fileContent, schemaName) {
  // Procura pela declaração do schema
  const schemaDecl = `export const ${schemaName} = z.object({`;
  const startIdx = fileContent.indexOf(schemaDecl);
  if (startIdx < 0) {
    return null;
  }

  // Encontra o `})` que fecha
  const blockStart = fileContent.indexOf('{', startIdx + schemaDecl.length - 1);
  if (blockStart < 0) return null;

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

  return [...fields];
}

/**
 * Compara campos de request do schema Zod contra o contrato C#.
 * Retorna array de divergências com severidade (DESCARTE, DEFAULT_SILENCIOSO, LACUNA).
 */
function validateRequestModule(moduleName, fileContent, backendContracts) {
  const divergences = [];
  const schemasMap = SCHEMA_TO_REQUEST_MAP[moduleName];

  if (!schemasMap) {
    console.warn(`⚠️  Módulo ${moduleName} não configurado no gate.`);
    return divergences;
  }

  for (const [schemaName, recordName] of Object.entries(schemasMap)) {
    const schemaFields = extractZodSchemaFields(fileContent, schemaName);
    const contractRecord = backendContracts[recordName];

    if (!schemaFields) {
      console.warn(`⚠️  Schema ${moduleName}/${schemaName} não encontrado no TS.`);
      continue;
    }

    if (!contractRecord) {
      console.warn(`⚠️  Record ${recordName} não encontrado no contrato.`);
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
        if (nullable) {
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

  return divergences;
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
  'AtualizarDadosFiscaisProdutoRequest.ncmCodigo': 'b58.c3 · Bloco B',
  'AtualizarDadosFiscaisProdutoRequest.cestCodigo': 'b58.c3 · Bloco B',
  'AtualizarDadosFiscaisProdutoRequest.unidadeMedidaTributavelId': 'b58.c3 · Bloco B',
  'AtualizarDadosFiscaisProdutoRequest.unidadeTributavelSigla': 'b65',
  'AtualizarDadosFiscaisProdutoRequest.exTipi': 'b65',
  'AtualizarDadosFiscaisProdutoRequest.codigoBeneficioFiscalPadrao': 'b65',
  'AtualizarDadosFiscaisProdutoRequest.tipoItemSped': 'b65',
  'VincularProdutoFornecedorRequest.descricaoFornecedor': 'b65',
  'TransferirEstoqueRequest.origemId': 'b66',
  'TransferirEstoqueRequest.documento': 'b66',
  'CriarEmpresaRequest.crt': 'b64',
  'AtualizarEmpresaRequest.crt': 'b64',
  'AtualizarEmpresaRequest.contribuinteIpi': 'b64',
  'AdmitirColaboradorRequest.pessoaId': 'b63'
};

/**
 * Ponto de entrada.
 */
function main() {
  const modules = ['produtos', 'estoque', 'administracao', 'seguranca', 'rh'];
  const allDivergences = [];
  const allowlist = loadAllowlist();

  // Carrega contrato
  const contractPath = path.join(ROOT, 'docs', 'BACKEND-ESTADO-ATUAL-E-CONTRATO.md');
  const BACKEND_CONTRACTS = loadRequestContractFromDocument(contractPath);

  validateExceptionsCeiling(allowlist);

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
    const divergences = validateRequestModule(moduleName, content, BACKEND_CONTRACTS);
    allDivergences.push(...divergences);
  }

  // Filtra
  const filteredDivergences = filterAllowlisted(allDivergences, allowlist);

  // Separa por severidade
  const descarte = filteredDivergences.filter(d => d.severity === 'DESCARTE');
  const defaultSilencioso = filteredDivergences.filter(d => d.severity === 'DEFAULT_SILENCIOSO');
  const lacuna = filteredDivergences.filter(d => d.severity === 'LACUNA');

  // Relatório
  if (descarte.length === 0 && defaultSilencioso.length === 0) {
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

  console.error(`📊 Total: ${descarte.length} DESCARTE + ${defaultSilencioso.length} DEFAULT_SILENCIOSO + ${lacuna.length} LACUNA`);
  process.exit(1);
}

main();
