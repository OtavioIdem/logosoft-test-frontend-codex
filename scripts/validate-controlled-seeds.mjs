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
    ['tests/seeds/integrated-e2e.controlled-seed.example.json', 'template de seed controlado obrigatório ausente'],
    ['scripts/validate-controlled-seeds.mjs', 'gate de seeds controladas obrigatório ausente'],
    ['tests/unit/controlledSeeds.test.ts', 'teste unitário de regressão de seeds controladas obrigatório ausente'],
    ['docs/CONTROLLED_SEEDS_INTEGRATED_E2E.md', 'documentação de seeds controladas obrigatória ausente'],
    ['docs/IMPLEMENTACAO_V1_11_0A8B33.md', 'markdown de implementação da B33 obrigatório ausente'],
    ['.env.backend-controlled.example', 'template de ambiente backend controlado obrigatório ausente']
];

for (const [path, reason] of requiredFiles) {
    requireFile(path, reason);
}

if (existsSync(join(root, 'tests/seeds/integrated-e2e.controlled-seed.example.json'))) {
    const rawSeed = read('tests/seeds/integrated-e2e.controlled-seed.example.json');
    let seed;
    try {
        seed = JSON.parse(rawSeed);
    } catch (error) {
        failures.push(`tests/seeds/integrated-e2e.controlled-seed.example.json: JSON inválido (${error.message})`);
    }

    if (seed) {
        if (seed.schemaVersion !== '1.0') failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: schemaVersion deve ser 1.0');
        if (seed.environment?.disposable !== true) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: environment.disposable deve ser true');
        if (seed.environment?.productionForbidden !== true) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: environment.productionForbidden deve ser true');
        if (seed.execution?.requiresExplicitOptIn !== true) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: execution.requiresExplicitOptIn deve ser true');
        if (seed.execution?.requiresDisposableEnvironmentAck !== true) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: execution.requiresDisposableEnvironmentAck deve ser true');
        if (!seed.requiredIds?.empresaId || !seed.requiredIds?.pedidoVendaId) failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: requiredIds deve declarar empresaId e pedidoVendaId');
        if (!seed.requiredOperationalState?.pedidoVenda || !seed.requiredOperationalState?.estoque || !seed.requiredOperationalState?.financeiro || !seed.requiredOperationalState?.fiscal || !seed.requiredOperationalState?.auditoria) {
            failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: requiredOperationalState deve cobrir pedido, estoque, financeiro, fiscal e auditoria');
        }
        if (!Array.isArray(seed.forbiddenUse) || !seed.forbiddenUse.includes('produção')) {
            failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: forbiddenUse deve bloquear produção');
        }
    }

    if (/Bearer\s+[A-Za-z0-9._-]+/i.test(rawSeed) || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(rawSeed) || /sk-[A-Za-z0-9]/i.test(rawSeed)) {
        failures.push('tests/seeds/integrated-e2e.controlled-seed.example.json: não deve conter token, JWT ou segredo real');
    }
}

if (existsSync(join(root, '.env.backend-controlled.example'))) {
    const envExample = read('.env.backend-controlled.example');
    const requiredEnvFragments = [
        'LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID=LOGOSOFT-E2E-CONTROLADO-EXEMPLO',
        'LOGOSOFT_INTEGRATED_E2E_SEED_FILE=tests/seeds/integrated-e2e.controlled-seed.example.json',
        'LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=false'
    ];

    for (const fragment of requiredEnvFragments) {
        if (!envExample.includes(fragment)) failures.push(`.env.backend-controlled.example: deve conter ${fragment}`);
    }
    if (/LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true/.test(envExample)) {
        failures.push('.env.backend-controlled.example: acknowledgement descartável deve permanecer false no arquivo versionado');
    }
}

if (existsSync(join(root, 'tests/e2e/integrated-backend.spec.ts'))) {
    const spec = read('tests/e2e/integrated-backend.spec.ts');
    const requiredSpecFragments = [
        'LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID',
        "LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK === 'true'",
        'disposableEnvironmentAck',
        'seedRunId',
        'shouldRun = Boolean(runIntegratedFlow && apiUrl && accessToken && empresaId && pedidoVendaId && seedRunId && disposableEnvironmentAck && runbookAck && seedResetAppliedAck && assistedValidationAck)'
    ];

    for (const fragment of requiredSpecFragments) {
        if (!spec.includes(fragment)) failures.push(`tests/e2e/integrated-backend.spec.ts: deve conter ${fragment}`);
    }
    if (/process\.env\.LOGOSOFT_E2E_|process\.env\.LOGOSOFT_CONTRACT_|process\.env\.LOGOSOFT_OPERATIONAL_CONTRACT_/.test(spec)) {
        failures.push('tests/e2e/integrated-backend.spec.ts: não deve depender de fallback fiscal, operacional ou E2E fiscal');
    }
}

if (existsSync(join(root, 'package.json'))) {
    const packageJson = JSON.parse(read('package.json'));
    const scripts = packageJson.scripts ?? {};
    if (scripts['validate:controlled-seeds'] !== 'node scripts/validate-controlled-seeds.mjs') {
        failures.push('package.json: script validate:controlled-seeds obrigatório ausente ou incorreto');
    }
    const ciGates = scripts['ci:gates'] ?? '';
    if (!ciGates.includes('npm run validate:controlled-seeds')) {
        failures.push('package.json: ci:gates deve validar seeds controladas');
    }
    if (ciGates.includes('npm run test:e2e:integrated:backend')) {
        failures.push('package.json: ci:gates não deve executar E2E integrado mutável automaticamente');
    }
}

if (existsSync(join(root, '.github/workflows/frontend-ci.yml'))) {
    const workflow = read('.github/workflows/frontend-ci.yml');
    if (!workflow.includes('npm run validate:controlled-seeds')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow deve validar seeds controladas');
    }
    if (workflow.includes('npm run test:e2e:integrated:backend')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow padrão não deve executar E2E integrado mutável');
    }
    if (/LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK:\s*true/i.test(workflow)) {
        failures.push('.github/workflows/frontend-ci.yml: CI padrão não deve habilitar acknowledgement de ambiente descartável');
    }
}

requireIncludes('scripts/validate-source.mjs', 'scripts/validate-controlled-seeds.mjs', 'validate:source deve executar validate-controlled-seeds');
requireIncludes('scripts/validate-ci-gates.mjs', 'validate:controlled-seeds', 'validate-ci-gates deve exigir validate:controlled-seeds');
requireIncludes('scripts/validate-integrated-e2e.mjs', 'LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID', 'validate-integrated-e2e deve exigir rastreio de seed controlada');


if (existsSync(join(root, '.env.backend-controlled.example'))) {
    const envExample = read('.env.backend-controlled.example');
    if (!envExample.includes('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false')) {
        failures.push('.env.backend-controlled.example: deve manter LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false');
    }
    if (envExample.includes('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true')) {
        failures.push('.env.backend-controlled.example: não deve habilitar RUNBOOK_ACK=true em arquivo versionado');
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação de seeds controladas falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de seeds controladas concluída sem pendências obrigatórias.\n');
