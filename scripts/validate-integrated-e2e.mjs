import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const requireFile = (path, reason) => {
    if (!existsSync(join(root, path))) failures.push(`${path}: ${reason}`);
};
const requireIncludes = (path, fragment, reason) => {
    if (!read(path).includes(fragment)) failures.push(`${path}: ${reason}`);
};

const requiredFiles = [
    ['playwright.integrated-e2e.config.ts', 'configuração Playwright dedicada ao E2E integrado obrigatória ausente'],
    ['tests/e2e/integrated-backend.spec.ts', 'spec E2E integrado backend controlado obrigatório ausente'],
    ['tests/unit/integratedBackendE2e.test.ts', 'teste unitário de regressão do E2E integrado obrigatório ausente'],
    ['docs/BACKEND_INTEGRATED_E2E.md', 'documentação do E2E integrado controlado obrigatória ausente'],
    ['docs/IMPLEMENTACAO_V1_11_0A8B32.md', 'markdown de implementação da B32 obrigatório ausente'],
    ['docs/CONTROLLED_SEEDS_INTEGRATED_E2E.md', 'documentação de seeds controladas obrigatória ausente'],
    ['docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md', 'runbook do backend descartável obrigatório ausente'],
    ['tests/seeds/integrated-e2e.controlled-seed.example.json', 'template de seed controlado obrigatório ausente'],
    ['.env.backend-controlled.example', 'template de ambiente controlado obrigatório ausente']
];

for (const [path, reason] of requiredFiles) {
    requireFile(path, reason);
}

if (existsSync(join(root, 'tests/e2e/integrated-backend.spec.ts'))) {
    const spec = read('tests/e2e/integrated-backend.spec.ts');
    const requiredSpecFragments = [
        "LOGOSOFT_INTEGRATED_E2E_RUN === 'true'",
        'LOGOSOFT_INTEGRATED_E2E_API_URL',
        'LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN',
        'LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID',
        'LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID',
        "LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK === 'true'",
        "LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK === 'true'",
        "LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK === 'true'",
        'seedResetAppliedAck',
        'test.skip(!shouldRun',
        'runbookAck',
        '/api/vendas/pedidos',
        '/api/fiscal/notas-fiscais/gerar-de-pedido-venda',
        '/api/estoque/movimentos',
        '/api/financeiro/contas-receber',
        '/api/auditoria/eventos'
    ];

    for (const fragment of requiredSpecFragments) {
        if (!spec.includes(fragment)) failures.push(`tests/e2e/integrated-backend.spec.ts: deve conter ${fragment}`);
    }

    const forbiddenFallbacks = [
        'process.env.LOGOSOFT_E2E_',
        'process.env.LOGOSOFT_CONTRACT_',
        'process.env.LOGOSOFT_OPERATIONAL_CONTRACT_'
    ];
    for (const fragment of forbiddenFallbacks) {
        if (spec.includes(fragment)) failures.push(`tests/e2e/integrated-backend.spec.ts: não deve depender de fallback ${fragment}`);
    }
}

if (existsSync(join(root, 'playwright.integrated-e2e.config.ts'))) {
    const config = read('playwright.integrated-e2e.config.ts');
    if (!/testMatch:\s*\/integrated-backend\\\.spec\\\.ts\//.test(config)) {
        failures.push('playwright.integrated-e2e.config.ts: deve descobrir somente integrated-backend.spec.ts');
    }
    if (/fiscal-backend|operational-backend|\.contract\.spec/.test(config)) {
        failures.push('playwright.integrated-e2e.config.ts: não deve capturar suítes fiscal, operacional ou contrato');
    }
}

if (existsSync(join(root, 'package.json'))) {
    const packageJson = JSON.parse(read('package.json'));
    const scripts = packageJson.scripts ?? {};
    if (scripts['validate:integrated-e2e'] !== 'node scripts/validate-integrated-e2e.mjs') {
        failures.push('package.json: script validate:integrated-e2e obrigatório ausente ou incorreto');
    }
    if (scripts['test:e2e:integrated:backend'] !== 'playwright test --config=playwright.integrated-e2e.config.ts') {
        failures.push('package.json: script test:e2e:integrated:backend obrigatório ausente ou incorreto');
    }
    const ciGates = scripts['ci:gates'] ?? '';
    if (!ciGates.includes('npm run validate:integrated-e2e')) {
        failures.push('package.json: ci:gates deve validar estrutura do E2E integrado');
    }
    if (ciGates.includes('npm run test:e2e:integrated:backend')) {
        failures.push('package.json: ci:gates não deve executar fluxo mutável integrado automaticamente');
    }
}

if (existsSync(join(root, '.github/workflows/frontend-ci.yml'))) {
    const workflow = read('.github/workflows/frontend-ci.yml');
    if (!workflow.includes('npm run validate:integrated-e2e')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow deve validar estrutura do E2E integrado');
    }
    if (workflow.includes('npm run test:e2e:integrated:backend')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow padrão não deve executar fluxo mutável integrado');
    }
    if (/LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN|LOGOSOFT_INTEGRATED_E2E_RUN:\s*true/i.test(workflow)) {
        failures.push('.github/workflows/frontend-ci.yml: CI padrão não deve declarar token nem ativar E2E integrado mutável');
    }
}

if (existsSync(join(root, '.env.backend-controlled.example'))) {
    const envExample = read('.env.backend-controlled.example');
    const requiredEnvFragments = [
        'LOGOSOFT_INTEGRATED_E2E_RUN=false',
        'LOGOSOFT_INTEGRATED_E2E_API_URL=http://localhost:8080',
        'LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN=',
        'LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID=',
        'LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID=',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID=LOGOSOFT-E2E-CONTROLADO-EXEMPLO',
        'LOGOSOFT_INTEGRATED_E2E_SEED_FILE=tests/seeds/integrated-e2e.controlled-seed.example.json',
        'LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=false',
        'LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=false'
    ];

    for (const fragment of requiredEnvFragments) {
        if (!envExample.includes(fragment)) failures.push(`.env.backend-controlled.example: deve conter ${fragment}`);
    }
    if (/Bearer\s+[A-Za-z0-9._-]+/i.test(envExample) || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(envExample) || /sk-[A-Za-z0-9]/i.test(envExample)) {
        failures.push('.env.backend-controlled.example: não deve conter token, JWT ou segredo real');
    }
}

requireIncludes('scripts/validate-source.mjs', 'scripts/validate-integrated-e2e.mjs', 'validate:source deve executar validate-integrated-e2e');
requireIncludes('scripts/validate-source.mjs', 'scripts/validate-controlled-seeds.mjs', 'validate:source deve executar validate-controlled-seeds');
requireIncludes('scripts/validate-source.mjs', 'scripts/validate-backend-seed-reset.mjs', 'validate:source deve executar validate-backend-seed-reset');

if (failures.length > 0) {
    process.stderr.write(`Validação do E2E integrado controlado falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação do E2E integrado controlado concluída sem pendências obrigatórias.\n');
