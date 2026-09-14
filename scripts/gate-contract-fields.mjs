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
 * Contratos C# dos records consumidos pelo frontend.
 * Fonte: docs/backend-v1.23/CONTRATO-API-v1.23.md
 * PascalCase → camelCase para comparação.
 *
 * Mapa de TS type → C# record esperado.
 * Nota: BoletoResponse e LancamentoContabilResponse herdam de *Response,
 * mas ambos mapeiam para o MESMO record C# (sem DTO de "resumo" no backend).
 */
const BACKEND_CONTRACTS = {
  bancos: {
    // BoletoResumoResponse e BoletoResponse apontam para o mesmo record C#
    BoletoResumoResponse: [
      'id',
      'contaReceberId',
      'parcelaReceberId',
      'carteiraCobrancaId',
      'nossoNumero',
      'numeroDocumento',
      'dataEmissao',
      'dataVencimento',
      'valorTitulo',
      'statusBoleto',
      'linhaDigitavel',
      'codigoBarras',
      'dataLiquidacao',
      'valorPago'
    ],
    BoletoResponse: [
      'id',
      'contaReceberId',
      'parcelaReceberId',
      'carteiraCobrancaId',
      'nossoNumero',
      'numeroDocumento',
      'dataEmissao',
      'dataVencimento',
      'valorTitulo',
      'statusBoleto',
      'linhaDigitavel',
      'codigoBarras',
      'dataLiquidacao',
      'valorPago'
    ],
    BoletoHistoricoResponse: [
      'id',
      'statusAnterior',
      'statusNovo',
      'observacao',
      'usuarioId',
      'data'
    ]
  },
  contabil: {
    // Ambos apontam para o mesmo record C# (não há DTO de "resumo")
    LancamentoContabilResumoResponse: [
      'id',
      'empresaId',
      'filialId',
      'numero',
      'data',
      'historico',
      'origem',
      'origemId',
      'statusLancamento',
      'lancamentoEstornoId',
      'totalDebito',
      'totalCredito',
      'partidas'
    ],
    LancamentoContabilResponse: [
      'id',
      'empresaId',
      'filialId',
      'numero',
      'data',
      'historico',
      'origem',
      'origemId',
      'statusLancamento',
      'lancamentoEstornoId',
      'totalDebito',
      'totalCredito',
      'partidas'
    ]
  },
  patrimonio: {
    DepreciacaoResultadoResponse: [
      'competencia',
      'totalBensDepreciados',
      'valorTotalDepreciado',
      'totalContabilizados',
      'bens'
    ],
    BemPatrimonialResponse: [
      'id',
      'empresaId',
      'filialId',
      'codigo',
      'descricao',
      'categoria',
      'dataAquisicao',
      'valorAquisicao',
      'valorResidual',
      'vidaUtilMeses',
      'metodo',
      'setorId',
      'responsavelId',
      'contaAtivoId',
      'contaDepreciacaoAcumuladaId',
      'contaDespesaDepreciacaoId',
      'depreciacaoAcumulada',
      'mesesDepreciados',
      'ultimaCompetenciaDepreciada',
      'valorContabilAtual',
      'statusBem',
      'bloqueado',
      'motivoBloqueio',
      'dataBaixa',
      'motivoBaixa',
      'justificativaBaixa',
      'valorBaixa',
      'movimentacoes',
      'depreciacoes'
    ]
  }
};

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
function validateModule(moduleName, fileContent) {
  const divergences = [];
  const contracts = BACKEND_CONTRACTS[moduleName];

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
 * Filtra divergências: remove as que estão no allowlist.
 */
function filterAllowlisted(divergences, allowlist) {
  const allowlistedSet = new Set();
  for (const ex of allowlist.exceptions) {
    const key = `${ex.module}/${ex.type}/${ex.field}`;
    allowlistedSet.add(key);
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
 * Ponto de entrada: valida os três módulos e emite relatório.
 */
function main() {
  const modules = ['bancos', 'contabil', 'patrimonio'];
  const allDivergences = [];
  const allowlist = loadAllowlist();

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
    const divergences = validateModule(moduleName, content);
    allDivergences.push(...divergences);
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
