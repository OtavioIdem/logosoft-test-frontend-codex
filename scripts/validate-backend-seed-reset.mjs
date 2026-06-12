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
    ['scripts/prepare-integrated-e2e-seed.mjs', 'script operacional de seed/reset integrado ausente'],
    ['scripts/validate-backend-seed-reset.mjs', 'gate de seed/reset integrado ausente'],
    ['docs/BACKEND_SEED_RESET_INTEGRATION.md', 'documentação de integração seed/reset ausente'],
    ['docs/IMPLEMENTACAO_V1_11_0A8B35.md', 'markdown da B35 ausente'],
    ['docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B35.md', 'levantamento B35 ausente'],
    ['tests/unit/backendSeedResetIntegration.test.ts', 'teste unitário do seed/reset ausente'],
    ['tests/e2e/integrated-backend.spec.ts', 'spec integrado obrigatório ausente'],
    ['.env.backend-controlled.example', 'template de ambiente backend controlado ausente']
];

for (const [path, reason] of requiredFiles) {
    requireFile(path, reason);
}

if (existsSync(join(root, 'package.json'))) {
    const packageJson = JSON.parse(read('package.json'));
    const scripts = packageJson.scripts ?? {};
    if (scripts['validate:backend-seed-reset'] !== 'node scripts/validate-backend-seed-reset.mjs') {
        failures.push('package.json: script validate:backend-seed-reset obrigatório ausente ou incorreto');
    }
    if (scripts['prepare:e2e:integrated:seed'] !== 'node scripts/prepare-integrated-e2e-seed.mjs') {
        failures.push('package.json: script prepare:e2e:integrated:seed obrigatório ausente ou incorreto');
    }
    const ciGates = scripts['ci:gates'] ?? '';
    if (!ciGates.includes('npm run validate:backend-seed-reset')) {
        failures.push('package.json: ci:gates deve validar integração seed/reset backend');
    }
    if (ciGates.includes('npm run prepare:e2e:integrated:seed')) {
        failures.push('package.json: ci:gates não deve executar seed/reset mutável automaticamente');
    }
    if (ciGates.includes('npm run test:e2e:integrated:backend')) {
        failures.push('package.json: ci:gates não deve executar E2E integrado mutável automaticamente');
    }
}

if (existsSync(join(root, 'scripts/prepare-integrated-e2e-seed.mjs'))) {
    const prepareScript = read('scripts/prepare-integrated-e2e-seed.mjs');
    const requiredPrepareFragments = [
        "LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN === 'true'",
        "assertTrue('LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK')",
        "assertTrue('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK')",
        "assertTrue('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK')",
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACCESS_TOKEN',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_API_URL',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_PATH',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_EXPECTED_STATUS',
        'X-Logosoft-E2E-Seed-Run-Id',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true',
        'method !== \'POST\''
    ];
    for (const fragment of requiredPrepareFragments) {
        if (!prepareScript.includes(fragment)) failures.push(`scripts/prepare-integrated-e2e-seed.mjs: deve conter ${fragment}`);
    }
    if (/process\.env\.LOGOSOFT_(CONTRACT|OPERATIONAL_CONTRACT|E2E)_/.test(prepareScript)) {
        failures.push('scripts/prepare-integrated-e2e-seed.mjs: não deve depender de variáveis fiscais/operacionais antigas');
    }
}

if (existsSync(join(root, 'tests/e2e/integrated-backend.spec.ts'))) {
    const spec = read('tests/e2e/integrated-backend.spec.ts');
    const requiredSpecFragments = [
        "LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK === 'true'",
        'seedResetAppliedAck',
        'runbookAck && seedResetAppliedAck',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true'
    ];
    for (const fragment of requiredSpecFragments) {
        if (!spec.includes(fragment)) failures.push(`tests/e2e/integrated-backend.spec.ts: deve conter ${fragment}`);
    }
    if (/process\.env\.LOGOSOFT_(CONTRACT|OPERATIONAL_CONTRACT|E2E)_/.test(spec)) {
        failures.push('tests/e2e/integrated-backend.spec.ts: não deve depender de variáveis fiscais/operacionais antigas');
    }
}

for (const envPath of ['.env.backend-controlled.example', '.env.example', '.env.test']) {
    if (!existsSync(join(root, envPath))) continue;
    const envContent = read(envPath);
    const requiredEnvFragments = [
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN=false',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_API_URL=http://localhost:8080',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_PATH=/api/test/integrated-e2e/reset',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_METHOD=POST',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACCESS_TOKEN=',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK=false',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=false'
    ];
    for (const fragment of requiredEnvFragments) {
        if (!envContent.includes(fragment)) failures.push(`${envPath}: deve conter ${fragment}`);
    }
    if (/LOGOSOFT_INTEGRATED_E2E_SEED_RESET_(RUN|ACK|APPLIED_ACK)=true/i.test(envContent)) {
        failures.push(`${envPath}: não deve habilitar seed/reset em arquivo versionado`);
    }
    if (/Bearer\s+[A-Za-z0-9._-]+/i.test(envContent) || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(envContent) || /sk-[A-Za-z0-9]/i.test(envContent)) {
        failures.push(`${envPath}: não deve conter token, JWT ou segredo real`);
    }
}


if (existsSync(join(root, 'tests/seeds/integrated-e2e.controlled-seed.example.json'))) {
    const seed = JSON.parse(read('tests/seeds/integrated-e2e.controlled-seed.example.json'));
    const contract = seed.backendSeedResetContract ?? {};
    if (contract.endpoint !== '/api/test/integrated-e2e/reset') failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: backendSeedResetContract.endpoint obrigatório inválido');
    if (contract.method !== 'POST') failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: backendSeedResetContract.method deve ser POST');
    if (contract.requiresDisposableEnvironmentAck !== true) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: deve exigir ACK de ambiente descartável');
    if (contract.requiresRunbookAck !== true) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: deve exigir ACK de runbook');
    if (contract.requiresSeedResetAck !== true) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: deve exigir ACK de seed/reset');
    if (contract.requiresAppliedAckBeforeE2E !== true) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: deve exigir applied ACK antes do E2E');
}

if (existsSync(join(root, 'docs/BACKEND_SEED_RESET_INTEGRATION.md'))) {
    const doc = read('docs/BACKEND_SEED_RESET_INTEGRATION.md');
    const requiredDocFragments = [
        'Seed/reset real do backend',
        'npm run prepare:e2e:integrated:seed',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN=true',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK=true',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true',
        'LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true',
        'LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true',
        'não deve rodar no CI padrão',
        'ambiente descartável',
        'Critérios de bloqueio'
    ];
    for (const fragment of requiredDocFragments) {
        if (!doc.includes(fragment)) failures.push(`docs/BACKEND_SEED_RESET_INTEGRATION.md: deve conter ${fragment}`);
    }
}

if (existsSync(join(root, '.github/workflows/frontend-ci.yml'))) {
    const workflow = read('.github/workflows/frontend-ci.yml');
    if (!workflow.includes('npm run validate:backend-seed-reset')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow deve validar integração seed/reset');
    }
    if (workflow.includes('npm run prepare:e2e:integrated:seed')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow padrão não deve executar seed/reset mutável');
    }
    if (/LOGOSOFT_INTEGRATED_E2E_SEED_RESET_(RUN|ACK|APPLIED_ACK):\s*true/i.test(workflow)) {
        failures.push('.github/workflows/frontend-ci.yml: workflow padrão não deve habilitar seed/reset integrado');
    }
}

requireIncludes('scripts/validate-source.mjs', 'scripts/validate-backend-seed-reset.mjs', 'validate:source deve executar validate-backend-seed-reset');
requireIncludes('scripts/validate-ci-gates.mjs', 'validate:backend-seed-reset', 'validate:ci deve exigir validate:backend-seed-reset');

if (failures.length > 0) {
    process.stderr.write(`Validação de seed/reset backend falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de seed/reset backend concluída sem pendências obrigatórias.\n');
