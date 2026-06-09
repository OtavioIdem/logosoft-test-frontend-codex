import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const workflowPath = '.github/workflows/frontend-ci.yml';
const packagePath = 'package.json';
const read = (path) => readFileSync(join(root, path), 'utf8');
const requireFile = (path, reason) => {
    if (!existsSync(join(root, path))) failures.push(`${path}: ${reason}`);
};
const requireIncludes = (path, fragment, reason) => {
    if (!read(path).includes(fragment)) failures.push(`${path}: ${reason}`);
};

requireFile(workflowPath, 'pipeline CI obrigatório ausente');
requireFile(packagePath, 'package.json obrigatório ausente');

const packageJson = JSON.parse(read(packagePath));
const scripts = packageJson.scripts ?? {};
const requiredPackageScripts = [
    'validate:source',
    'validate:ci',
    'validate:guid-references',
    'validate:fiscal:production',
    'validate:backend-controlled',
    'validate:controlled-seeds',
    'validate:integrated-runbook',
    'validate:integrated-e2e',
    'validate:operational-contracts',
    'typecheck',
    'lint',
    'test:unit',
    'build',
    'test:e2e:fiscal',
    'test:contract:fiscal',
    'test:contract:operational',
    'test:e2e:fiscal:backend',
    'test:e2e:integrated:backend',
    'ci:gates'
];

for (const scriptName of requiredPackageScripts) {
    if (!scripts[scriptName]) failures.push(`package.json: script obrigatório ausente: ${scriptName}`);
}

const requiredCiGatesFragments = [
    'npm run validate:source',
    'npm run validate:skills',
    'npm run validate:mocks-isolation',
    'npm run validate:backend-controlled',
    'npm run validate:controlled-seeds',
    'npm run validate:integrated-runbook',
    'npm run validate:integrated-e2e',
    'npm run validate:operational-contracts',
    'npm run validate:guid-references',
    'npm run validate:fiscal:production',
    'npm run typecheck',
    'npm run lint',
    'npm run test:unit',
    'npm run build',
    'npx playwright install chromium',
    'npm run test:e2e:fiscal',
    'npm run test:contract:fiscal',
    'npm run test:contract:operational',
    'npm run test:e2e:fiscal:backend'
];
const ciGatesScript = scripts['ci:gates'] ?? '';
for (const fragment of requiredCiGatesFragments) {
    if (!ciGatesScript.includes(fragment)) {
        failures.push(`package.json: script ci:gates deve conter ${fragment}`);
    }
}
const playwrightInstallIndex = ciGatesScript.indexOf('npx playwright install chromium');
const fiscalE2eIndex = ciGatesScript.indexOf('npm run test:e2e:fiscal');
if (playwrightInstallIndex < 0 || fiscalE2eIndex < 0 || playwrightInstallIndex > fiscalE2eIndex) {
    failures.push('package.json: script ci:gates deve instalar Chromium do Playwright antes do E2E fiscal');
}

if (ciGatesScript.includes('npm run test:e2e:integrated:backend')) {
    failures.push('package.json: ci:gates não deve executar fluxo mutável integrado automaticamente');
}

if (existsSync(join(root, workflowPath))) {
    const requiredWorkflowFragments = [
        'pull_request:',
        'push:',
        'workflow_dispatch:',
        'actions/checkout@v4',
        'actions/setup-node@v4',
        'node-version-file: .node-version',
        'cache: npm',
        'npm install',
        'npm run validate:source',
        'npm run validate:mocks-isolation',
        'npm run validate:backend-controlled',
    'npm run validate:controlled-seeds',
    'npm run validate:integrated-runbook',
    'npm run validate:integrated-e2e',
    'npm run validate:operational-contracts',
        'npm run validate:guid-references',
        'npm run validate:fiscal:production',
        'npm run typecheck',
        'npm run lint',
        'npm run test:unit',
        'npm run build',
        'npx playwright install chromium',
        'npm run test:e2e:fiscal',
        'npm run test:contract:fiscal',
    'npm run test:contract:operational',
        'npm run test:e2e:fiscal:backend'
    ];

    for (const fragment of requiredWorkflowFragments) {
        requireIncludes(workflowPath, fragment, `workflow deve conter ${fragment}`);
    }

    const workflow = read(workflowPath);
    if (/NEXT_PUBLIC_USE_MOCK_(AUTH|API)/i.test(workflow)) {
        failures.push(`${workflowPath}: CI não deve declarar variáveis NEXT_PUBLIC_USE_MOCK_* após isolamento definitivo de mocks`);
    }
    if (!/node-version-file:\s*\.node-version/.test(workflow)) {
        failures.push(`${workflowPath}: CI deve usar a versão Node controlada pelo repositório`);
    }

    if (workflow.includes('npm run test:e2e:integrated:backend')) {
        failures.push(`${workflowPath}: workflow padrão não deve executar fluxo mutável integrado automaticamente`);
    }
    if (/LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN|LOGOSOFT_INTEGRATED_E2E_RUN:\s*true/i.test(workflow)) {
        failures.push(`${workflowPath}: CI não deve declarar token nem ativar E2E integrado mutável`);
    }
    if (/LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK:\s*true/i.test(workflow)) {
        failures.push(`${workflowPath}: CI não deve habilitar acknowledgement de ambiente descartável`);
    }
    if (/LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK:\s*true/i.test(workflow)) {
        failures.push(`${workflowPath}: CI não deve habilitar acknowledgement de leitura do runbook`);
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação de CI/gates falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de CI/gates concluída sem pendências obrigatórias.\n');
