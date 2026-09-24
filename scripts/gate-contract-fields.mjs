#!/usr/bin/env node

/**
 * Gate estrutural: valida que tipos TypeScript do frontend não declaram
 * campos que o record C# do backend não entrega.
 *
 * Fatia: v1.11.0a8b54.c1 — campo monetário sem par
 * Scopo: cinco records em três módulos
 *   - bancos: BoletoResponse, BoletoHistoricoResponse
 *   - contabil: LancamentoContabilResumoResponse
 *   - patrimonio: DepreciacaoResultadoResponse, BemPatrimonialResponse
 *
 * Modo de falha: asserção nominal por campo, jamais por total.
 * Prova vermelha: contra origin/main deve acusar 13 campos específicos.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Mapeia tipos TS para os records C# que precisam ser validados.
 * Chave: tipo TS, Valor: nome do record C# a procurar no contrato.
 * Se o record aparecer em várias operações, todos os blocos são validados como idênticos.
 * Se o registro aparecer como IReadOnlyCollection<T> ou IReadOnlyList<T>, a busca tenta resolver isso automaticamente.
 */
const BACKEND_TYPE_MAP = {
  bancos: {
    BoletoResumoResponse: 'BoletoResponse',
    BoletoResponse: 'BoletoResponse',
    BoletoHistoricoResponse: 'BoletoHistoricoResponse'  // Aparece como IReadOnlyCollection<BoletoHistoricoResponse>
  },
  contabil: {
    LancamentoContabilResumoResponse: 'LancamentoContabilResponse',
    LancamentoContabilResponse: 'LancamentoContabilResponse'
  },
  patrimonio: {
    DepreciacaoResultadoResponse: 'ProcessarDepreciacaoPeriodoResponse',  // Nome diferente no contrato
    BemPatrimonialResponse: 'BemPatrimonialResponse'
  },
  estoque: {
    MovimentoEstoque: 'MovimentoEstoqueResponse'  // D71, v1.11.0a8b68: nomes de campo tipo/dataMovimento
  }
};

/**
 * Extrai campos de um bloco C# do contrato.
 * Procura por padrão `TypeName Nomecampo` ou `TypeName? Nomecampo` ou `IReadOnlyXxx<Type> Nomecampo`.
 * Retorna array de nomes em camelCase.
 */
function extractCSharpFields(csharpBlock) {
  // Remove comentários e quebras de linha extras
  let block = csharpBlock.replace(/\/\/.*$/gm, '').trim();

  // Extrai campos: padrão é `TipoQualquerCoisa NomeField` ou `TipoQualquerCoisa? NomeField`
  // Captura até a primeira letra maiúscula seguida de minúsculas como início do nome do campo
  const fieldPattern = /(?:Guid\??|string\??|decimal\??|int\??|bool\??|DateTimeOffset\??|IReadOnlyList<[\w.]+>\??|IReadOnlyCollection<[\w.]+>\??|[\w.]+\??)\s+([A-Z][a-zA-Z0-9]*)/g;

  const fields = [];
  let match;
  while ((match = fieldPattern.exec(block)) !== null) {
    // Captura nome do campo e converte PascalCase → camelCase
    const fieldName = match[1];
    const camelCased = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
    fields.push(camelCased);
  }

  return [...new Set(fields)]; // Remove duplicatas
}

/**
 * Lê o documento de contrato e extrai campos de cada record C#.
 * Procura por blocos `**Response** (C#, \`RecordName\`)` seguidos de bloco ```csharp...```.
 * Valida que blocos repetidos de um mesmo record têm campos idênticos.
 */
function loadContractFromDocument(contractPath) {
  if (!fs.existsSync(contractPath)) {
    console.error(`❌ Arquivo de contrato não encontrado: ${contractPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(contractPath, 'utf8');
  const contracts = {};

  // Padrão: **Response** (C#, `RecordName`) seguido de ```csharp
  // Usa \s+ para capturar qualquer tipo de espaço/newline (LF ou CRLF)
  const responseBlockPattern = /\*\*Response\*\*\s*\(C#,\s*`([^`]+)`\)\s+```csharp/g;

  let match;
  while ((match = responseBlockPattern.exec(content)) !== null) {
    const recordName = match[1];

    // Procura pelo fechamento ```
    const startPos = match.index + match[0].length;
    const csharpEndPattern = /```/;
    const csharpEndMatch = csharpEndPattern.exec(content.substring(startPos));

    if (!csharpEndMatch) continue; // Bloco não foi fechado

    const blockEnd = startPos + csharpEndMatch.index;
    const csharpBlock = content.substring(startPos, blockEnd);

    const fields = extractCSharpFields(csharpBlock);

    // Valida que blocos repetidos têm campos idênticos
    if (contracts[recordName]) {
      const existing = contracts[recordName];
      const existingSet = new Set(existing);
      const fieldsSet = new Set(fields);

      if (existing.length !== fields.length || !fields.every(f => existingSet.has(f))) {
        console.error(`❌ Record ${recordName} aparece com campos diferentes:`);
        console.error(`   Primeira vez: ${existing.join(', ')}`);
        console.error(`   Agora:        ${fields.join(', ')}`);
        process.exit(1);
      }
    } else {
      contracts[recordName] = fields;
    }
  }

  return contracts;
}

/**
 * Constrói o mapa de contrato resolvendo a ligação TS → C#.
 * Se o record esperado não existir, tenta resolver a partir de IReadOnlyCollection<Record>.
 */
function buildBackendContracts(contractPath) {
  const contractRecords = loadContractFromDocument(contractPath);
  const result = {};

  for (const [module, typeMap] of Object.entries(BACKEND_TYPE_MAP)) {
    result[module] = {};
    for (const [tsType, csharpRecord] of Object.entries(typeMap)) {
      let found = contractRecords[csharpRecord];

      // Se não encontrou direto, tenta procurar por IReadOnlyCollection<Record>
      if (!found) {
        const collectionKey = `IReadOnlyCollection<${csharpRecord}>`;
        found = contractRecords[collectionKey];
      }

      // Se ainda não encontrou, tenta IReadOnlyList<Record>
      if (!found) {
        const listKey = `IReadOnlyList<${csharpRecord}>`;
        found = contractRecords[listKey];
      }

      if (!found) {
        console.warn(`⚠️  Record ${csharpRecord} (esperado por ${tsType}) não encontrado no contrato`);
        result[module][tsType] = [];
      } else {
        result[module][tsType] = found;
      }
    }
  }

  return result;
}

/**
 * Lê e parseia um arquivo TypeScript para extrair tipos object.
 * Estratégia: procura por `type NomeType = ` e extrai até o `};`
 */
function extractTypeFields(content, typeName) {
  // Procura pela declaração do tipo
  const typeDecl = `type ${typeName} = `;
  const startIdx = content.indexOf(typeDecl);
  if (startIdx < 0) return null;

  // Encontra o final da definição (o `};` que fecha)
  const blockStart = content.indexOf('{', startIdx);
  if (blockStart < 0) return null;

  let braceCount = 0;
  let idx = blockStart;
  while (idx < content.length) {
    if (content[idx] === '{') braceCount++;
    if (content[idx] === '}') {
      braceCount--;
      if (braceCount === 0) break;
    }
    idx++;
  }

  if (braceCount !== 0) return null; // Não encontrou fechamento

  const block = content.substring(blockStart, idx + 1);

  // Extrai campos da forma `nomeCampo: tipo;` ou `nomeCampo?: tipo;`
  const fieldPattern = /(\w+)\s*\??:/g;
  const fields = [];
  let fieldMatch;
  while ((fieldMatch = fieldPattern.exec(block)) !== null) {
    fields.push(fieldMatch[1]);
  }
  return fields;
}

/**
 * Lê tipos que herdam via `&` (extensão de tipo).
 * Ex: `type BoletoResponse = BoletoResumoResponse & { ... }`
 * Retorna { baseType: 'BoletoResumoResponse', ownFields: [...] } ou []
 */
function extractTypeWithBase(content, typeName) {
  // Procura pela declaração do tipo
  const typeDecl = `type ${typeName} = `;
  const startIdx = content.indexOf(typeDecl);
  if (startIdx < 0) return null;

  // Lê até o `;` que fecha a definição
  const defStart = startIdx + typeDecl.length;
  let idx = defStart;
  let braceCount = 0;
  let foundFirstBrace = false;

  while (idx < content.length) {
    const char = content[idx];
    if (char === '{') {
      braceCount++;
      foundFirstBrace = true;
    } else if (char === '}') {
      braceCount--;
    } else if (char === ';' && braceCount === 0 && foundFirstBrace) {
      break;
    }
    idx++;
  }

  if (!foundFirstBrace) return null;

  const definition = content.substring(defStart, idx).trim();

  // Procura por herança: `BaseType & { ... }`
  // Padrão mais flexível para capturar tipos com espaçamento variável
  const ampIdx = definition.indexOf('&');
  if (ampIdx > 0) {
    // Tem herança
    const baseType = definition.substring(0, ampIdx).trim();
    const braceStart = definition.indexOf('{');
    const braceEnd = definition.lastIndexOf('}');
    if (braceStart > 0 && braceEnd > braceStart) {
      const ownBlock = definition.substring(braceStart + 1, braceEnd);
      const fieldPattern = /(\w+)\s*\??:/g;
      const ownFields = [];
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(ownBlock)) !== null) {
        ownFields.push(fieldMatch[1]);
      }
      return { baseType, ownFields };
    }
  }

  // Sem herança, parseia os campos diretos
  const braceStart = definition.indexOf('{');
  const braceEnd = definition.lastIndexOf('}');
  if (braceStart >= 0 && braceEnd > braceStart) {
    const block = definition.substring(braceStart + 1, braceEnd);
    const fieldPattern = /(\w+)\s*\??:/g;
    const fields = [];
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(block)) !== null) {
      fields.push(fieldMatch[1]);
    }
    return fields.length > 0 ? fields : null;
  }

  return null;
}

/**
 * Resolve o conjunto de campos de um tipo, incluindo herança.
 * Se tipo herda de outro via `&`, resolve recursivamente.
 */
function resolveTypeFields(moduleName, typeName, fileContent, cache = {}) {
  const key = `${moduleName}:${typeName}`;
  if (cache[key]) return cache[key];

  const definition = extractTypeWithBase(fileContent, typeName);
  if (!definition) {
    cache[key] = [];
    return [];
  }

  if (Array.isArray(definition)) {
    // Sem herança
    cache[key] = definition;
    return definition;
  }

  // Com herança: merge baseType + ownFields
  const baseFields = resolveTypeFields(moduleName, definition.baseType, fileContent, cache);
  const allFields = [...new Set([...baseFields, ...definition.ownFields])];
  cache[key] = allFields;
  return allFields;
}

/**
 * Compara campos do TS contra o contrato C#.
 * Retorna array de divergências: { module, type, field, reason }
 */
function validateModule(moduleName, fileContent, backendContracts) {
  const divergences = [];
  const contracts = backendContracts[moduleName];

  if (!contracts) {
    console.warn(`⚠️  Módulo ${moduleName} não configurado no gate.`);
    return divergences;
  }

  for (const [tsTypeName, expectedBackendFields] of Object.entries(contracts)) {
    // Resolve campos do tipo TS (incluindo herança)
    const tsFields = resolveTypeFields(moduleName, tsTypeName, fileContent);

    if (tsFields.length === 0) {
      console.warn(
        `⚠️  Tipo ${moduleName}/${tsTypeName} não encontrado ou vazio no TS.`
      );
      continue;
    }

    // Compara cada campo do TS com o contrato
    for (const field of tsFields) {
      if (!expectedBackendFields.includes(field)) {
        divergences.push({
          module: moduleName,
          type: tsTypeName,
          field,
          reason: `Campo não existe em ${tsTypeName} do backend`
        });
      }
    }
  }

  return divergences;
}

/**
 * Valida módulo com fallback para tipos importados.
 * Se o tipo não for encontrado no arquivo de módulo, tenta em types/erp.ts.
 * Se mesmo assim não encontrar, registra como tipo faltante (falha dura).
 */
function validateModuleWithFallback(moduleName, fileContent, globalTypesContent, backendContracts) {
  const divergences = [];
  const missingTypes = [];
  const contracts = backendContracts[moduleName];

  if (!contracts) {
    return { divergences, missingTypes };
  }

  for (const [tsTypeName, expectedBackendFields] of Object.entries(contracts)) {
    // Tenta resolver no arquivo do módulo primeiro
    let tsFields = resolveTypeFields(moduleName, tsTypeName, fileContent);

    // Se não encontrar no módulo, tenta em types/erp.ts
    if (tsFields.length === 0 && globalTypesContent) {
      tsFields = resolveTypeFields('', tsTypeName, globalTypesContent);
    }

    if (tsFields.length === 0) {
      // Falha dura: tipo mapeado não foi encontrado em nenhum lugar
      missingTypes.push({
        module: moduleName,
        type: tsTypeName,
        csharpRecord: expectedBackendFields[0] ? expectedBackendFields[0].split('.')[0] : 'Unknown',
        file: `features/${moduleName}/types/${moduleName}.types.ts (ou types/erp.ts)`
      });
      continue;
    }

    // Compara cada campo do TS com o contrato
    for (const field of tsFields) {
      if (!expectedBackendFields.includes(field)) {
        divergences.push({
          module: moduleName,
          type: tsTypeName,
          field,
          reason: `Campo não existe em ${tsTypeName} do backend`
        });
      }
    }
  }

  return { divergences, missingTypes };
}

/**
 * Carrega o arquivo de exceções (allowlist) se existir.
 */
function loadAllowlist() {
  const allowlistPath = path.join(ROOT, 'scripts', 'gate-contract-fields.allowlist.json');
  if (!fs.existsSync(allowlistPath)) {
    return { exceptions: [] };
  }

  try {
    const content = fs.readFileSync(allowlistPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.warn(`⚠️  Aviso: não conseguiu ler allowlist: ${e.message}`);
    return { exceptions: [] };
  }
}

/**
 * Valida teto de exceções: deve estar presente e ser exatamente igual ao tamanho da lista.
 * Catraca de sentido único: teto não pode ser apagado, e folga futura é proibida.
 */
function validateExceptionsCeiling(allowlist) {
  if (!allowlist.hasOwnProperty('teto') || allowlist.teto === null || allowlist.teto === undefined) {
    console.error(`❌ Campo 'teto' ausente no allowlist. Catraca de sentido único: teto é obrigatório.`);
    console.error(`   Registre teto: ${allowlist.exceptions.length} no allowlist.`);
    process.exit(1);
  }

  if (!Number.isInteger(allowlist.teto)) {
    console.error(`❌ Campo 'teto' não é inteiro: ${allowlist.teto}`);
    process.exit(1);
  }

  if (allowlist.exceptions.length !== allowlist.teto) {
    console.error(`❌ Divergência no teto de exceções:`);
    console.error(`   Esperado (exceptions.length): ${allowlist.exceptions.length}`);
    console.error(`   Registrado (teto): ${allowlist.teto}`);
    console.error(`   Catraca de sentido único: teto deve ser exato, sem folga.`);
    process.exit(1);
  }

  return true;
}

/**
 * Filtra divergências: remove as que estão no allowlist.
 * Também valida que cada exceção correspondente a uma divergência real.
 */
function filterAllowlisted(divergences, allowlist) {
  const allowlistedSet = new Set();
  const exceptionSet = new Set();

  for (const ex of allowlist.exceptions) {
    const key = `${ex.module}/${ex.type}/${ex.field}`;
    allowlistedSet.add(key);
    exceptionSet.add(key);
  }

  // Valida que cada exceção corresponde a uma divergência real (catraca de sentido único)
  const orphanExceptions = [];
  for (const exKey of exceptionSet) {
    const hasMatch = divergences.some(div => {
      const divKey = `${div.module}/${div.type}/${div.field}`;
      return divKey === exKey;
    });

    if (!hasMatch) {
      orphanExceptions.push(exKey);
    }
  }

  if (orphanExceptions.length > 0) {
    console.error(`❌ Exceções orfãs no allowlist (sem divergência correspondente):`);
    for (const ex of orphanExceptions) {
      console.error(`   ${ex}`);
    }
    console.error('Catraca de sentido único: exceção sem divergência real deve ser removida do allowlist.');
    process.exit(1);
  }

  const filtered = [];
  for (const div of divergences) {
    const key = `${div.module}/${div.type}/${div.field}`;
    if (!allowlistedSet.has(key)) {
      filtered.push(div);
    }
  }

  return filtered;
}

/**
 * Ponto de entrada: valida os quatro módulos e emite relatório.
 */
function main() {
  const modules = ['bancos', 'contabil', 'patrimonio', 'estoque'];
  const allDivergences = [];
  const allMissingTypes = [];
  const allowlist = loadAllowlist();

  // Carrega contrato do documento
  const contractPath = path.join(ROOT, 'docs', 'backend-v1.23', 'CONTRATO-API-v1.23.md');
  const BACKEND_CONTRACTS = buildBackendContracts(contractPath);

  // Carrega tipos global (types/erp.ts) para resolução de tipos importados
  const globalTypesPath = path.join(ROOT, 'types', 'erp.ts');
  let globalTypesContent = '';
  if (fs.existsSync(globalTypesPath)) {
    globalTypesContent = fs.readFileSync(globalTypesPath, 'utf8');
  }

  // Valida teto de exceções (chama process.exit(1) internamente se houver erro)
  validateExceptionsCeiling(allowlist);

  for (const moduleName of modules) {
    const typesFile = path.join(
      ROOT,
      'features',
      moduleName,
      'types',
      `${moduleName}.types.ts`
    );

    if (!fs.existsSync(typesFile)) {
      console.error(`❌ Arquivo não encontrado: ${typesFile}`);
      process.exit(1);
    }

    const content = fs.readFileSync(typesFile, 'utf8');
    const result = validateModuleWithFallback(moduleName, content, globalTypesContent, BACKEND_CONTRACTS);
    allDivergences.push(...result.divergences);
    allMissingTypes.push(...result.missingTypes);
  }

  // Valida tipos mapeados mas não encontrados (falha dura)
  if (allMissingTypes.length > 0) {
    console.error('❌ FALHA ESTRUTURAL — tipos mapeados não encontrados:');
    console.error('');
    for (const missing of allMissingTypes) {
      console.error(`   ❌ ${missing.module}/${missing.type} — mapeado a ${missing.csharpRecord}, não encontrado em ${missing.file}`);
    }
    console.error('');
    console.error(`📊 ${allMissingTypes.length} tipo(s) estruturalmente quebrado(s).`);
    process.exit(1);
  }

  // Filtra divergências permitidas
  const filteredDivergences = filterAllowlisted(allDivergences, allowlist);

  // Relatório
  if (filteredDivergences.length === 0) {
    console.log('✅ Nenhuma divergência detectada.');
    console.log('   Todos os campos do TS têm correspondência no contrato C#.');
    if (allowlist.exceptions && allowlist.exceptions.length > 0) {
      console.log(`   (${allowlist.exceptions.length} exceções registradas no allowlist)`);
    }
    process.exit(0);
  }

  console.error('❌ Divergências detectadas:');
  console.error('');

  // Agrupa por módulo para legibilidade
  const byModule = {};
  for (const div of filteredDivergences) {
    if (!byModule[div.module]) byModule[div.module] = [];
    byModule[div.module].push(div);
  }

  let exitCode = 0;
  for (const [module, divs] of Object.entries(byModule)) {
    console.error(`📦 ${module}`);
    for (const div of divs) {
      console.error(
        `   ❌ ${div.type}.${div.field} — ${div.reason}`
      );
      exitCode = 1;
    }
    console.error('');
  }

  console.error(`\n📊 Total: ${filteredDivergences.length} divergência(s)`);
  if (allowlist.exceptions && allowlist.exceptions.length > 0) {
    console.error(`   (${allowlist.exceptions.length} exceções no allowlist)\n`);
  }
  process.exit(exitCode);
}

main();
