import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, symlinkSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

/**
 * Prova durável de que `validate:ci` cobra os dois gates de contrato no `ci:gates` e no
 * workflow — fatia v1.11.0a8b64.c1.
 *
 * POR QUE ESTE ARQUIVO EXISTE: `validate:contract-fields` e `validate:contract-request-fields`
 * existem desde a c3 (v1.11.0a8b58) e nunca estiveram em `ci:gates` nem no workflow — só a
 * prova durável deles (tests/unit/gateContractFields.test.ts e
 * tests/unit/gateContractRequestFields.test.ts) rodava, de carona no `test:unit`. A ligação
 * corretiva (v1.11.0a8b64.c1) usa o mecanismo que scripts/validate-ci-gates.mjs já tinha:
 * comparar as listas fixas `requiredCiGatesFragments`/`requiredWorkflowFragments` contra o
 * `ci:gates` real e os steps reais do job `frontend-gates`.
 *
 * Este teste prova que esse mecanismo sabe ficar vermelho para os dois gates novos,
 * nominalmente, um caso por fragmento — removendo o step do workflow (o `ci:gates` continua
 * com o comando) e exigindo que `validate:ci` saia 1 nomeando aquele `npm run <gate>`.
 */

const raizDoProjeto = process.cwd();

const REQUIRED_FILES = [
  'package.json',
  '.github/workflows/frontend-ci.yml',
  '.env.example',
  '.env.test',
  '.env.backend-controlled.example',
  'scripts/backend-contract-map.allowlist.json',
  'scripts/backend-permissions.snapshot.json',
  'scripts/backend-permissions.allowlist.json',
  'scripts/guard-permission-map.allowlist.json',
  'tests/evidence/integrated-e2e.assisted-evidence.example.json',
  'README.md',
  'CHANGELOG.md',
  'scripts/validate-ci-gates.mjs'
] as const;

const STEP_CONTRACT_FIELDS =
  '      - name: Validar campos de contrato (response)\n        run: npm run validate:contract-fields\n\n';
const STEP_CONTRACT_REQUEST_FIELDS =
  '      - name: Validar campos de contrato (request)\n        run: npm run validate:contract-request-fields\n\n';

/**
 * Monta um espelho mínimo da árvore de hoje (working directory) com só os arquivos que
 * scripts/validate-ci-gates.mjs lê, mais um link para node_modules (o script importa
 * 'js-yaml', e um diretório fora da árvore do projeto não o enxergaria de outra forma).
 */
function montarEspelho(): string {
  const espelho = mkdtempSync(path.join(tmpdir(), 'gate-prova-ci-gates-'));

  for (const relPath of REQUIRED_FILES) {
    const destino = path.join(espelho, relPath);
    mkdirSync(path.dirname(destino), { recursive: true });
    writeFileSync(destino, readFileSync(path.join(raizDoProjeto, relPath), 'utf8'));
  }

  const nodeModulesReal = path.join(raizDoProjeto, 'node_modules');
  const nodeModulesEspelho = path.join(espelho, 'node_modules');
  symlinkSync(nodeModulesReal, nodeModulesEspelho, process.platform === 'win32' ? 'junction' : 'dir');

  return espelho;
}

function lerWorkflow(espelho: string): string {
  return readFileSync(path.join(espelho, '.github/workflows/frontend-ci.yml'), 'utf8');
}

function escreverWorkflow(espelho: string, conteudo: string): void {
  writeFileSync(path.join(espelho, '.github/workflows/frontend-ci.yml'), conteudo);
}

function executarValidateCi(espelho: string): { exitCode: number; saida: string } {
  const result = spawnSync('node', ['scripts/validate-ci-gates.mjs'], {
    cwd: espelho,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return {
    exitCode: result.status ?? 0,
    saida: (result.stdout || '') + (result.stderr || '')
  };
}

describe('validate:ci — prova durável dos gates de contrato ligados (v1.11.0a8b64.c1)', () => {
  let espelho = '';

  beforeAll(() => {
    espelho = montarEspelho();
  }, 60_000);

  afterAll(() => {
    if (espelho && existsSync(espelho)) {
      try {
        rmSync(espelho, { recursive: true, force: true });
      } catch {
        // Ignora falha de limpeza
      }
    }
  });

  it('árvore de hoje (com os dois steps) sai com código de sucesso 0', () => {
    const resultado = executarValidateCi(espelho);
    expect(resultado.exitCode).toBe(0);
  });

  describe('fragmento npm run validate:contract-fields', () => {
    it('remover o step do workflow faz validate:ci sair 1 nomeando o fragmento', () => {
      const original = lerWorkflow(espelho);
      expect(original).toContain(STEP_CONTRACT_FIELDS);

      escreverWorkflow(espelho, original.replace(STEP_CONTRACT_FIELDS, ''));
      const resultado = executarValidateCi(espelho);

      // Restaura antes de qualquer asserção poder interromper o teste.
      escreverWorkflow(espelho, original);

      expect(resultado.exitCode).toBe(1);
      expect(resultado.saida).toContain("'npm run validate:contract-fields'");
      expect(resultado.saida).toContain('deve ter um step cujo run seja');
    });

    it('restaurado, validate:ci volta a sair 0', () => {
      const resultado = executarValidateCi(espelho);
      expect(resultado.exitCode).toBe(0);
    });
  });

  describe('fragmento npm run validate:contract-request-fields', () => {
    it('remover o step do workflow faz validate:ci sair 1 nomeando o fragmento', () => {
      const original = lerWorkflow(espelho);
      expect(original).toContain(STEP_CONTRACT_REQUEST_FIELDS);

      escreverWorkflow(espelho, original.replace(STEP_CONTRACT_REQUEST_FIELDS, ''));
      const resultado = executarValidateCi(espelho);

      // Restaura antes de qualquer asserção poder interromper o teste.
      escreverWorkflow(espelho, original);

      expect(resultado.exitCode).toBe(1);
      expect(resultado.saida).toContain("'npm run validate:contract-request-fields'");
      expect(resultado.saida).toContain('deve ter um step cujo run seja');
    });

    it('restaurado, validate:ci volta a sair 0', () => {
      const resultado = executarValidateCi(espelho);
      expect(resultado.exitCode).toBe(0);
    });
  });

  it('remover os dois steps acusa os dois fragmentos na mesma saída', () => {
    const original = lerWorkflow(espelho);
    const semNenhum = original.replace(STEP_CONTRACT_FIELDS, '').replace(STEP_CONTRACT_REQUEST_FIELDS, '');
    expect(semNenhum).not.toBe(original);

    escreverWorkflow(espelho, semNenhum);
    const resultado = executarValidateCi(espelho);
    escreverWorkflow(espelho, original);

    expect(resultado.exitCode).toBe(1);
    expect(resultado.saida).toContain("'npm run validate:contract-fields'");
    expect(resultado.saida).toContain("'npm run validate:contract-request-fields'");
  });
});
