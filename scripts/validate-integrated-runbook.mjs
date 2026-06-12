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
    ['docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md', 'runbook de backend descartável obrigatório ausente'],
    ['docs/IMPLEMENTACAO_V1_11_0A8B34.md', 'markdown de implementação da B34 obrigatório ausente'],
    ['docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B34.md', 'levantamento atualizado da B34 obrigatório ausente'],
    ['scripts/validate-integrated-runbook.mjs', 'gate do runbook integrado obrigatório ausente'],
    ['tests/unit/integratedRunbook.test.ts', 'teste unitário de regressão do runbook obrigatório ausente'],
    ['tests/e2e/integrated-backend.spec.ts', 'spec integrado obrigatório ausente'],
    ['.env.backend-controlled.example', 'template de ambiente controlado obrigatório ausente']
];

for (const [path, reason] of requiredFiles) {
    requireFile(path, reason);
}

if (existsSync(join(root, 'docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md'))) {
    const runbook = read('docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md');
    const requiredRunbookFragments = [
        'Backend descartável',
        'LOGOSOFT_INTEGRATED_E2E_RUN=true',
        'LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK=true',
        'LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true',
        'docker compose -f docker-compose.test.yml down -v',
        'docker compose -f docker-compose.test.yml up -d postgres redis api',
        'dotnet ef database update',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID',
        'npm run validate:integrated-runbook',
        'npm run test:contract:fiscal',
        'npm run test:contract:operational',
        'npm run test:e2e:integrated:backend',
        'Evidências obrigatórias',
        'Limpeza do ambiente',
        'Critérios de bloqueio',
        'Rollback operacional',
        'Não registrar token, senha, certificado, refresh token, XML completo autorizado ou payload sensível'
    ];

    for (const fragment of requiredRunbookFragments) {
        if (!runbook.includes(fragment)) failures.push(`docs/RUNBOOK_BACKEND_DESCARTAVEL_E2E_INTEGRADO.md: deve conter ${fragment}`);
    }
}

if (existsSync(join(root, 'tests/e2e/integrated-backend.spec.ts'))) {
    const spec = read('tests/e2e/integrated-backend.spec.ts');
    const requiredSpecFragments = [
        "LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK === 'true'",
        'runbookAck',
        'seedResetAppliedAck',
        'disposableEnvironmentAck && runbookAck',
        'runbookAck && seedResetAppliedAck',
        'LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true',
        'LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true'
    ];
    for (const fragment of requiredSpecFragments) {
        if (!spec.includes(fragment)) failures.push(`tests/e2e/integrated-backend.spec.ts: deve conter ${fragment}`);
    }
}

if (existsSync(join(root, '.env.backend-controlled.example'))) {
    const envExample = read('.env.backend-controlled.example');
    if (!envExample.includes('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false')) {
        failures.push('.env.backend-controlled.example: deve manter LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=false no template versionado');
    }
    if (envExample.includes('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true')) {
        failures.push('.env.backend-controlled.example: não deve habilitar RUNBOOK_ACK=true no arquivo versionado');
    }
    if (/Bearer\s+[A-Za-z0-9._-]+/i.test(envExample) || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(envExample) || /sk-[A-Za-z0-9]/i.test(envExample)) {
        failures.push('.env.backend-controlled.example: não deve conter token, JWT ou segredo real');
    }
}

for (const envPath of ['.env.example', '.env.test']) {
    if (existsSync(join(root, envPath))) {
        const envContent = read(envPath);
        if (envContent.includes('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK=true')) {
            failures.push(`${envPath}: não deve habilitar RUNBOOK_ACK=true em arquivo versionado`);
        }
    }
}

if (existsSync(join(root, 'package.json'))) {
    const packageJson = JSON.parse(read('package.json'));
    const scripts = packageJson.scripts ?? {};
    if (scripts['validate:integrated-runbook'] !== 'node scripts/validate-integrated-runbook.mjs') {
        failures.push('package.json: script validate:integrated-runbook obrigatório ausente ou incorreto');
    }
    const ciGates = scripts['ci:gates'] ?? '';
    if (!ciGates.includes('npm run validate:integrated-runbook')) {
        failures.push('package.json: ci:gates deve validar o runbook integrado');
    }
    if (ciGates.includes('npm run test:e2e:integrated:backend')) {
        failures.push('package.json: ci:gates não deve executar E2E integrado mutável');
    }
}

if (existsSync(join(root, '.github/workflows/frontend-ci.yml'))) {
    const workflow = read('.github/workflows/frontend-ci.yml');
    if (!workflow.includes('npm run validate:integrated-runbook')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow deve validar o runbook integrado');
    }
    if (workflow.includes('npm run test:e2e:integrated:backend')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow padrão não deve executar E2E integrado mutável');
    }
    if (/LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK:\s*true/i.test(workflow)) {
        failures.push('.github/workflows/frontend-ci.yml: workflow padrão não deve habilitar RUNBOOK_ACK=true');
    }
}

requireIncludes('scripts/validate-source.mjs', 'scripts/validate-integrated-runbook.mjs', 'validate:source deve executar validate-integrated-runbook');
requireIncludes('scripts/validate-ci-gates.mjs', 'validate:integrated-runbook', 'validate:ci deve exigir validate:integrated-runbook');

if (failures.length > 0) {
    process.stderr.write(`Validação do runbook de E2E integrado falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação do runbook de E2E integrado concluída sem pendências obrigatórias.\n');
