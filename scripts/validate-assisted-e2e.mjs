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
    ['scripts/validate-assisted-e2e.mjs', 'gate de execução assistida ausente'],
    ['scripts/create-integrated-e2e-assisted-report.mjs', 'script de relatório assistido ausente'],
    ['tests/evidence/integrated-e2e.assisted-evidence.example.json', 'template de evidências assistidas ausente'],
    ['tests/unit/assistedIntegratedE2e.test.ts', 'teste unitário de validação assistida ausente'],
    ['docs/ASSISTED_INTEGRATED_E2E_VALIDATION.md', 'documentação de validação assistida ausente'],
    ['docs/IMPLEMENTACAO_V1_11_0A8B36.md', 'markdown da B36 ausente'],
    ['docs/LEVANTAMENTO_PENDENCIAS_FRONTEND_B36.md', 'levantamento B36 ausente'],
    ['tests/e2e/integrated-backend.spec.ts', 'spec integrado obrigatório ausente'],
    ['.env.backend-controlled.example', 'template de ambiente backend controlado ausente']
];

for (const [path, reason] of requiredFiles) {
    requireFile(path, reason);
}

if (existsSync(join(root, 'package.json'))) {
    const packageJson = JSON.parse(read('package.json'));
    const scripts = packageJson.scripts ?? {};
    if (packageJson.logosoftVersion !== '1.11.0a8b45') failures.push('package.json: logosoftVersion deve ser 1.11.0a8b45');
    if (scripts['validate:assisted-e2e'] !== 'node scripts/validate-assisted-e2e.mjs') {
        failures.push('package.json: script validate:assisted-e2e obrigatório ausente ou incorreto');
    }
    if (scripts['report:e2e:integrated:assisted'] !== 'node scripts/create-integrated-e2e-assisted-report.mjs') {
        failures.push('package.json: script report:e2e:integrated:assisted obrigatório ausente ou incorreto');
    }
    const ciGates = scripts['ci:gates'] ?? '';
    if (!ciGates.includes('npm run validate:assisted-e2e')) {
        failures.push('package.json: ci:gates deve validar execução assistida do E2E integrado');
    }
    if (ciGates.includes('npm run report:e2e:integrated:assisted')) {
        failures.push('package.json: ci:gates não deve gerar relatório assistido automaticamente');
    }
    if (ciGates.includes('npm run test:e2e:integrated:backend')) {
        failures.push('package.json: ci:gates não deve executar E2E integrado mutável automaticamente');
    }
    if (ciGates.includes('npm run prepare:e2e:integrated:seed')) {
        failures.push('package.json: ci:gates não deve executar seed/reset mutável automaticamente');
    }
}

if (existsSync(join(root, 'tests/e2e/integrated-backend.spec.ts'))) {
    const spec = read('tests/e2e/integrated-backend.spec.ts');
    const requiredSpecFragments = [
        "LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK === 'true'",
        'assistedValidationAck',
        'seedResetAppliedAck && assistedValidationAck',
        'LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=true',
        'integrated-e2e-assisted-context'
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

for (const envPath of ['.env.backend-controlled.example', '.env.example', '.env.test']) {
    if (!existsSync(join(root, envPath))) continue;
    const envContent = read(envPath);
    const requiredEnvFragments = [
        'LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=false',
        'LOGOSOFT_INTEGRATED_E2E_EVIDENCE_FILE=tests/evidence/integrated-e2e.assisted-evidence.example.json',
        'LOGOSOFT_INTEGRATED_E2E_ASSISTED_REPORT_OUTPUT=artifacts/integrated-e2e-assisted-report.md'
    ];
    for (const fragment of requiredEnvFragments) {
        if (!envContent.includes(fragment)) failures.push(`${envPath}: deve conter ${fragment}`);
    }
    if (/LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK=true/i.test(envContent)) {
        failures.push(`${envPath}: não deve habilitar validação assistida em arquivo versionado`);
    }
    if (/Bearer\s+[A-Za-z0-9._-]+/i.test(envContent) || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(envContent) || /sk-[A-Za-z0-9]/i.test(envContent)) {
        failures.push(`${envPath}: não deve conter token, JWT ou segredo real`);
    }
}

if (existsSync(join(root, 'tests/evidence/integrated-e2e.assisted-evidence.example.json'))) {
    const raw = read('tests/evidence/integrated-e2e.assisted-evidence.example.json');
    if (/Bearer\s+[A-Za-z0-9._-]+/i.test(raw) || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(raw) || /sk-[A-Za-z0-9]/i.test(raw)) {
        failures.push('tests/evidence/integrated-e2e.assisted-evidence.example.json: não deve conter token, JWT ou segredo real');
    }
    const evidence = JSON.parse(raw);
    if (evidence.version !== '1.11.0a8b45') failures.push('tests/evidence/integrated-e2e.assisted-evidence.example.json: version deve ser 1.11.0a8b45');
    if (evidence.environment?.assistedValidationAckRequired !== true) failures.push('tests/evidence/integrated-e2e.assisted-evidence.example.json: deve exigir assistedValidationAckRequired');
    if (evidence.preRunChecklist?.productionDataProtected !== true) failures.push('tests/evidence/integrated-e2e.assisted-evidence.example.json: deve proteger dados produtivos por padrão');
    if (evidence.postRunChecklist?.noSecretsInArtifacts !== true) failures.push('tests/evidence/integrated-e2e.assisted-evidence.example.json: deve exigir artefatos sem segredo');
}

if (existsSync(join(root, 'scripts/create-integrated-e2e-assisted-report.mjs'))) {
    const reportScript = read('scripts/create-integrated-e2e-assisted-report.mjs');
    const requiredScriptFragments = [
        'LOGOSOFT_INTEGRATED_E2E_EVIDENCE_FILE',
        'LOGOSOFT_INTEGRATED_E2E_ASSISTED_REPORT_OUTPUT',
        'integrated-e2e.assisted-evidence.example.json',
        'integrated-e2e-assisted-report.md',
        'Relatório assistido',
        'secretPatterns'
    ];
    for (const fragment of requiredScriptFragments) {
        if (!reportScript.includes(fragment)) failures.push(`scripts/create-integrated-e2e-assisted-report.mjs: deve conter ${fragment}`);
    }
    if (/fetch\(|axios|playwrightRequest|newContext\(/.test(reportScript)) {
        failures.push('scripts/create-integrated-e2e-assisted-report.mjs: não deve executar chamada de rede');
    }
}

if (existsSync(join(root, '.github/workflows/frontend-ci.yml'))) {
    const workflow = read('.github/workflows/frontend-ci.yml');
    if (!workflow.includes('npm run validate:assisted-e2e')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow deve validar execução assistida');
    }
    if (workflow.includes('npm run report:e2e:integrated:assisted') || workflow.includes('npm run test:e2e:integrated:backend')) {
        failures.push('.github/workflows/frontend-ci.yml: workflow padrão não deve gerar relatório assistido nem executar E2E integrado mutável');
    }
    if (/LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK:\s*true/i.test(workflow)) {
        failures.push('.github/workflows/frontend-ci.yml: CI padrão não deve habilitar ACK de validação assistida');
    }
}

requireIncludes('scripts/validate-source.mjs', 'scripts/validate-assisted-e2e.mjs', 'validate:source deve executar validate-assisted-e2e');
requireIncludes('scripts/validate-ci-gates.mjs', 'validate:assisted-e2e', 'validate-ci-gates deve conhecer validate:assisted-e2e');
requireIncludes('docs/ASSISTED_INTEGRATED_E2E_VALIDATION.md', 'Validação real assistida', 'documentação deve declarar validação real assistida');
requireIncludes('docs/ASSISTED_INTEGRATED_E2E_VALIDATION.md', 'npm run report:e2e:integrated:assisted', 'documentação deve declarar relatório assistido');

if (failures.length > 0) {
    process.stderr.write(`Validação assistida do E2E integrado falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação assistida do E2E integrado concluída sem pendências obrigatórias.\n');
