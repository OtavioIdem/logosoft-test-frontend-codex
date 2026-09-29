#!/usr/bin/env node

/**
 * Gerador de snapshot: extrai records C# e persiste em JSON versionado.
 *
 * D83, v1.11.0a8b69: o gate de campos lê este snapshot em vez de `../New project 3`
 * em tempo de execução. Garante que o CI não precisa do backend presente.
 *
 * Uso: node scripts/generate-backend-response-records-snapshot.mjs
 * Saída: scripts/backend-response-records.snapshot.json (versionado, commitado)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND_ROOT = path.resolve(path.dirname(ROOT), 'New project 3');

/**
 * Tipos que o gate precisa validar contra o C#.
 * Chave: tipo TS, Valor: { csharpRecord, module }
 */
const TYPES_TO_EXTRACT = {
  TabelaPrecoResponse: { csharpRecord: 'TabelaPrecoResponse', module: 'tabelas-preco' },
  TabelaPrecoItemResponse: { csharpRecord: 'TabelaPrecoItemResponse', module: 'tabelas-preco' },
  PrecoVigenteResponse: { csharpRecord: 'PrecoProdutoVigenteResponse', module: 'tabelas-preco' },
  PedidoVendaResponse: { csharpRecord: 'PedidoVendaResponse', module: 'vendas' },
  ItemPedidoVendaResponse: { csharpRecord: 'ItemPedidoVendaResponse', module: 'vendas' },
  MovimentoEstoque: { csharpRecord: 'MovimentoEstoqueResponse', module: 'estoque' },
  ContaPagarResponse: { csharpRecord: 'ContaPagarResponse', module: 'financeiro' },
  ContaReceberResponse: { csharpRecord: 'ContaReceberResponse', module: 'financeiro' },
  PedidoCompraResponse: { csharpRecord: 'PedidoCompraResponse', module: 'compras' },
  ItemPedidoCompraResponse: { csharpRecord: 'ItemPedidoCompraResponse', module: 'compras' }
};

/**
 * Extrai campos de um record C#.
 * Retorna array de nomes em camelCase.
 */
function extractFieldsFromCSharpRecord(recordName, csharpContent, filePath, lineNumber) {
  // Procura pelo início da declaração do record
  const recordStart = csharpContent.indexOf(`record ${recordName}(`);
  if (recordStart === -1) {
    return null;
  }

  // Acha o parêntese de abertura
  const openParen = csharpContent.indexOf('(', recordStart);
  let closeParen = openParen + 1;
  let parenCount = 1;

  // Procura pelo parêntese de fechamento, contando aninhamento
  while (closeParen < csharpContent.length && parenCount > 0) {
    if (csharpContent[closeParen] === '(') parenCount++;
    else if (csharpContent[closeParen] === ')') parenCount--;
    if (parenCount > 0) closeParen++;
  }

  const paramBlock = csharpContent.substring(openParen + 1, closeParen);

  // Processa cada linha para encontrar campos
  const lines = paramBlock.split('\n');
  const fields = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Padrão: `Tipo Nome,` ou `Tipo Nome` — com flag global para capturar TODOS os campos de uma linha
    // Suporta uma linha com múltiplos campos: "Guid TabelaPrecoId, Guid ItemId, Guid ProdutoId, ..."
    const fieldPattern = /(?:Guid|string|decimal|int|bool|DateTimeOffset|DateOnly|IReadOnlyList<[^>]+>|IReadOnlyCollection<[^>]+>|[\w.]+)\??(?:<[^>]+>)?\s+([A-Z][a-zA-Z0-9]*)/g;
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(trimmed)) !== null) {
      const fieldName = fieldMatch[1];
      // Converte PascalCase → camelCase
      const camelCased = fieldName.charAt(0).toLowerCase() + fieldName.slice(1);
      fields.push(camelCased);
    }
  }

  return fields.length > 0 ? fields : null;
}

/**
 * Busca um record C# e extrai campos, registrando origem.
 */
function extractRecordFromBackend(recordName) {
  const possibleDirs = [
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Comercial', 'TabelasPreco'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Vendas', 'Pedidos'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Vendas'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Estoque', 'Movimentos'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Estoque'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Financeiro', 'ContasPagar'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Financeiro', 'ContasReceber'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Financeiro'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Compras', 'Pedidos'),
    path.join(BACKEND_ROOT, 'src', 'Erp.Application', 'Compras')
  ];

  for (const dir of possibleDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.cs')) continue;
      const fullPath = path.join(dir, file);
      try {
        const text = fs.readFileSync(fullPath, 'utf8');
        if (text.includes(`record ${recordName}`)) {
          // Conta linhas até encontrar o record
          const beforeRecord = text.substring(0, text.indexOf(`record ${recordName}`));
          const lineNumber = beforeRecord.split('\n').length;

          const fields = extractFieldsFromCSharpRecord(recordName, text, fullPath, lineNumber);
          if (fields) {
            return {
              found: true,
              fields,
              origin: {
                file: fullPath.replace(BACKEND_ROOT, '..'),
                line: lineNumber
              }
            };
          }
        }
      } catch {
        continue;
      }
    }
  }

  return { found: false, fields: null, origin: null };
}

/**
 * Gera o snapshot com todos os records.
 */
function generateSnapshot() {
  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: 'Generated by scripts/generate-backend-response-records-snapshot.mjs',
    backendRoot: BACKEND_ROOT,
    records: {}
  };

  const results = {
    success: [],
    failed: []
  };

  for (const [tsType, { csharpRecord, module }] of Object.entries(TYPES_TO_EXTRACT)) {
    const result = extractRecordFromBackend(csharpRecord);

    if (result.found && result.fields) {
      snapshot.records[csharpRecord] = {
        module,
        fields: result.fields,
        origin: result.origin
      };
      results.success.push(csharpRecord);
      console.log(`✅ ${csharpRecord}: ${result.fields.length} campos de ${result.origin.file}:${result.origin.line}`);
    } else {
      results.failed.push(csharpRecord);
      console.warn(`⚠️  ${csharpRecord}: não encontrado`);
    }
  }

  // Valida que nenhum falhou
  if (results.failed.length > 0) {
    console.error(`\n❌ ${results.failed.length} record(s) não encontrado(s):`);
    for (const name of results.failed) {
      console.error(`   - ${name}`);
    }
    console.error('\nNão é possível gerar snapshot incompleto.');
    process.exit(1);
  }

  // D83: Valida que nenhum record perdeu campos sem explicação (regressão mascarada)
  // Compara os fields do novo snapshot com os do HEAD
  const snapshotPath = path.join(ROOT, 'scripts', 'backend-response-records.snapshot.json');
  const headSnapshotExists = fs.existsSync(snapshotPath);
  if (headSnapshotExists) {
    try {
      const headSnapshotText = fs.readFileSync(snapshotPath, 'utf8');
      const headSnapshot = JSON.parse(headSnapshotText);
      const regressions = [];

      for (const [recordName, newData] of Object.entries(snapshot.records)) {
        const headData = headSnapshot.records?.[recordName];
        if (headData && headData.fields && newData.fields) {
          const headFieldCount = headData.fields.length;
          const newFieldCount = newData.fields.length;
          if (newFieldCount < headFieldCount) {
            const missingFields = headData.fields.filter(f => !newData.fields.includes(f));
            regressions.push({
              record: recordName,
              headCount: headFieldCount,
              newCount: newFieldCount,
              missingFields
            });
          }
        }
      }

      if (regressions.length > 0) {
        console.error('\n❌ REGRESSÃO DETECTADA — campos perdidos em records existentes:');
        for (const reg of regressions) {
          console.error(`   ${reg.record}: ${reg.headCount} → ${reg.newCount} campos`);
          console.error(`      Faltam: ${reg.missingFields.join(', ')}`);
        }
        console.error('\nSe a perda de campos é intencional, documente no allowlist com justificativa por campo.');
        process.exit(1);
      }
    } catch (e) {
      console.warn(`⚠️  Não conseguiu validar regressão (snapshot anterior ilegível): ${e.message}`);
    }
  }

  // Escreve o snapshot
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

  console.log(`\n✅ Snapshot gerado: ${snapshotPath}`);
  console.log(`   ${results.success.length} records extraídos`);
  console.log(`   Data: ${snapshot.generatedAt}`);
}

// Executa
try {
  generateSnapshot();
  process.exit(0);
} catch (e) {
  console.error('❌ Erro ao gerar snapshot:', e.message);
  process.exit(1);
}
