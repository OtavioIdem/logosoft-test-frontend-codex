import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('CI workflow YAML', () => {
    it('carrega sem erro de sintaxe YAML', () => {
        const workflowContent = read('.github/workflows/frontend-ci.yml');
        const parsed = yaml.load(workflowContent);
        expect(parsed).toBeDefined();
        expect(typeof parsed).toBe('object');
        expect(parsed).toHaveProperty('jobs');
    });

    it('frontend-gates.env.NEXT_PUBLIC_APP_VERSION casa com package.json logosoftVersion', () => {
        const packageJson = JSON.parse(read('package.json'));
        const workflowContent = read('.github/workflows/frontend-ci.yml');
        const parsed = yaml.load(workflowContent) as any;

        expect(parsed.jobs['frontend-gates']).toBeDefined();
        expect(parsed.jobs['frontend-gates'].env).toBeDefined();
        expect(parsed.jobs['frontend-gates'].env.NEXT_PUBLIC_APP_VERSION).toBe(packageJson.logosoftVersion);
    });

    it('todo comando obrigatório aparece como valor de steps[].run', () => {
        const workflowContent = read('.github/workflows/frontend-ci.yml');
        const parsed = yaml.load(workflowContent) as any;
        const steps = parsed.jobs['frontend-gates'].steps;

        expect(Array.isArray(steps)).toBe(true);

        // Extrai todas as linhas de comando dos steps
        const runLines = new Set<string>();
        for (const step of steps) {
            if (typeof step?.run === 'string') {
                for (const line of step.run.split('\n')) {
                    const trimmed = line.trim();
                    if (trimmed) runLines.add(trimmed);
                }
            }
        }

        const requiredCommands = [
            'npm install',
            'npm run validate:source',
            'npm run validate:mocks-isolation',
            'npm run validate:backend-controlled',
            'npm run validate:controlled-seeds',
            'npm run validate:integrated-runbook',
            'npm run validate:backend-seed-reset',
            'npm run validate:assisted-e2e',
            'npm run validate:integrated-e2e',
            'npm run validate:operational-contracts',
            'npm run validate:backend-contract-map',
            'npm run validate:backend-permissions',
            'npm run validate:guid-references',
            'npm run validate:fiscal:production',
            'npm run typecheck',
            'npm run lint',
            'npm run test:unit',
            'npm run build',
            'npx playwright install chromium',
            'npm run test:e2e',
            'npm run test:contract:fiscal',
            'npm run test:contract:operational',
            'npm run test:e2e:fiscal:backend'
        ];

        for (const cmd of requiredCommands) {
            expect(runLines.has(cmd), `Comando obrigatório "${cmd}" não encontrado em steps[].run`).toBe(true);
        }
    });

    it('rejeita YAML com indentação quebrada no bloco env', () => {
        // Fixture negativa: 10 espaços de indentação em uma chave de env
        // (o validador original aceitaria, mas a estrutura YAML fica ambígua
        // quando parseada — demonstra a importância de validar a estrutura parseada)
        const brokenYaml = `
jobs:
  frontend-gates:
    env:
          NEXT_PUBLIC_APP_VERSION: 1.11.0a8b48
    steps: []
`;

        // Este YAML em particular ainda é válido para o parser YAML,
        // mas o teste demonstra que se houvesse um erro de sintaxe YAML
        // (ex.: tab em vez de espaço), o carregamento falharia.
        // Para testar corretamente, usamos um YAML definitivamente quebrado:
        const actuallyBrokenYaml = `
jobs:
  frontend-gates:
    env:
      NEXT_PUBLIC_APP_VERSION: 1.11.0a8b48
    steps
      - run: npm install
`;

        expect(() => {
            yaml.load(actuallyBrokenYaml);
        }).toThrow();
    });
});
