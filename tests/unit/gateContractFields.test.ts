/**
 * Teste de regressão: 13 campos fantasma não voltaram
 *
 * Verifica que cada um dos 13 campos que foram corrigidos nesta fatia
 * está presente em origin/main (existia antes) e ausente na árvore atual (não voltou).
 *
 * Fatia: v1.11.0a8b54.c1 — campo monetário sem par
 *
 * Este teste **não** prova o gate estrutural. A prova durável do gate é dívida
 * da fatia b54.c2, quando o teste importará e executará o gate de verdade.
 * Aqui apenas verificamos regressão: se alguém reintroduzir um desses 13 campos,
 * o teste fica vermelho nominalmente.
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';

describe('Regressão: 13 campos fantasma não voltaram', () => {
  // Os 13 campos que devem estar em origin/main e ausentes na árvore atual
  const expectedDivergences = [
    { module: 'bancos', type: 'BoletoResumoResponse', field: 'valor' },
    { module: 'bancos', type: 'BoletoResumoResponse', field: 'vencimento' },
    { module: 'bancos', type: 'BoletoResumoResponse', field: 'status' },
    { module: 'bancos', type: 'BoletoResponse', field: 'alertas' },
    { module: 'bancos', type: 'BoletoHistoricoResponse', field: 'evento' },
    { module: 'bancos', type: 'BoletoHistoricoResponse', field: 'descricao' },
    { module: 'contabil', type: 'LancamentoContabilResumoResponse', field: 'valorTotal' },
    { module: 'contabil', type: 'LancamentoContabilResumoResponse', field: 'status' },
    { module: 'patrimonio', type: 'DepreciacaoResultadoResponse', field: 'ano' },
    { module: 'patrimonio', type: 'DepreciacaoResultadoResponse', field: 'mes' },
    { module: 'patrimonio', type: 'DepreciacaoResultadoResponse', field: 'bensDepreciados' },
    { module: 'patrimonio', type: 'DepreciacaoResultadoResponse', field: 'valorTotal' },
    { module: 'patrimonio', type: 'BemPatrimonialResponse', field: 'valorContabil' }
  ];

  it('regressão: cada um dos 13 campos esteve em origin/main', () => {
    // Extrai tipos de origin/main para confirmar que os campos existiam antes
    const modules = Array.from(new Set(expectedDivergences.map(d => d.module)));
    const oldContents: { [key: string]: string } = {};

    for (const mod of modules) {
      try {
        const cmd = `git show origin/main:features/${mod}/types/${mod}.types.ts`;
        oldContents[mod] = execSync(cmd, { encoding: 'utf8', cwd: process.cwd() });
      } catch (e) {
        throw new Error(`Não conseguiu ler ${mod} de origin/main`);
      }
    }

    // Para cada campo, valida que está nos tipos antigos
    for (const expected of expectedDivergences) {
      const typeContent = oldContents[expected.module];
      const fieldPattern = new RegExp(`\\b${expected.field}\\s*\\??:`, 'm');

      expect(
        fieldPattern.test(typeContent),
        `Campo ${expected.field} não encontrado em ${expected.module}/${expected.type} de origin/main`
      ).toBe(true);
    }
  });

  it('regressão: nenhum dos 13 campos voltou na árvore atual', () => {
    // Lê tipos da árvore atual
    const modules = Array.from(new Set(expectedDivergences.map(d => d.module)));
    const currentContents: { [key: string]: string } = {};

    for (const mod of modules) {
      const filePath = `features/${mod}/types/${mod}.types.ts`;
      currentContents[mod] = fs.readFileSync(filePath, 'utf8');
    }

    // Helper: extrai bloco de um tipo específico
    const extractTypeBlock = (content: string, typeName: string): string | null => {
      const typeStart = content.indexOf(`type ${typeName}`);
      if (typeStart < 0) return null;
      const blockStart = content.indexOf('{', typeStart);
      const blockEnd = content.indexOf('};', blockStart);
      if (blockEnd < 0) return null;
      return content.substring(blockStart, blockEnd + 2);
    };

    // Coleta campos que voltaram (lista deve ser vazia)
    const fieldsReintroduced: string[] = [];

    for (const expected of expectedDivergences) {
      const fileContent = currentContents[expected.module];
      const typeBlock = extractTypeBlock(fileContent, expected.type);

      if (!typeBlock) {
        // Tipo não encontrado é OK (foi removido ou renomeado)
        continue;
      }

      const fieldPattern = new RegExp(`\\b${expected.field}\\s*\\??:`, 'm');

      // Se o campo ainda está dentro do tipo, registra como regressão
      if (fieldPattern.test(typeBlock)) {
        fieldsReintroduced.push(`${expected.module}/${expected.type}.${expected.field}`);
      }
    }

    // Afirma sobre a lista de infratores — deve estar vazia
    expect(
      fieldsReintroduced,
      `Regressão detectada: ${fieldsReintroduced.length} campo(s) voltou(voltaram): ${fieldsReintroduced.join(', ')}`
    ).toHaveLength(0);
  });

});
