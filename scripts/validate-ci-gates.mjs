import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const root = process.cwd();
const failures = [];
const workflowPath = '.github/workflows/frontend-ci.yml';
const packagePath = 'package.json';
const currentVersionFiles = [
    '.env.example',
    '.env.test',
    '.env.backend-controlled.example',
    'scripts/backend-contract-map.allowlist.json',
    'scripts/backend-permissions.snapshot.json',
    'scripts/backend-permissions.allowlist.json',
    'tests/evidence/integrated-e2e.assisted-evidence.example.json',
    'README.md',
    'CHANGELOG.md'
];
const read = (path) => readFileSync(join(root, path), 'utf8');
const requireFile = (path, reason) => {
    if (!existsSync(join(root, path))) failures.push(`${path}: ${reason}`);
};
const requireIncludes = (path, fragment, reason) => {
    if (!read(path).includes(fragment)) failures.push(`${path}: ${reason}`);
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const requireSingleMatch = (path, pattern, reason) => {
    const matches = read(path).match(pattern) ?? [];
    if (matches.length !== 1) failures.push(`${path}: ${reason}`);
};
const readJson = (path) => {
    try {
        return JSON.parse(read(path));
    } catch (error) {
        failures.push(`${path}: JSON inválido (${error instanceof Error ? error.message : 'erro desconhecido'})`);
        return null;
    }
};

requireFile(workflowPath, 'pipeline CI obrigatório ausente');
requireFile(packagePath, 'package.json obrigatório ausente');
for (const path of currentVersionFiles) {
    requireFile(path, 'artefato corrente de versão ausente');
}

// O workflow é a fonte de verdade do pipeline: precisa ser carregado como
// documento YAML de verdade (não como texto cru), senão indentação quebrada
// (ou qualquer outro erro de sintaxe) passa despercebida por checagens
// baseadas em regex/includes sobre o texto do arquivo.
const FRONTEND_GATES_JOB = 'frontend-gates';
// Jobs permitidos no workflow sem revisão adicional. Para adicionar um novo
// job, revise-o e inclua o nome aqui.
const allowedWorkflowJobs = [FRONTEND_GATES_JOB];
// Chaves de env permitidas no job frontend-gates. Para adicionar uma nova
// variável de ambiente ao job, inclua a chave aqui.
const allowedFrontendGatesEnvKeys = [
    'CI',
    'NEXT_TELEMETRY_DISABLED',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_APP_ENV',
    'NEXT_PUBLIC_APP_VERSION'
];
let workflowDoc = null;
if (existsSync(join(root, workflowPath))) {
    try {
        workflowDoc = yaml.load(read(workflowPath));
    } catch (error) {
        failures.push(`${workflowPath}: YAML inválido (${error instanceof Error ? error.message : 'erro desconhecido'}) — corrija a sintaxe/indentação do arquivo antes de prosseguir`);
    }
}
const frontendGatesJob = workflowDoc?.jobs?.[FRONTEND_GATES_JOB] ?? null;
if (workflowDoc && !frontendGatesJob) {
    failures.push(`${workflowPath}: jobs.${FRONTEND_GATES_JOB} ausente — o gate obrigatório precisa existir com esse nome`);
}
if (workflowDoc) {
    const declaredJobs = Object.keys(workflowDoc.jobs ?? {});
    for (const jobName of declaredJobs) {
        if (!allowedWorkflowJobs.includes(jobName)) {
            failures.push(`${workflowPath}: job '${jobName}' não está na lista de jobs revisados (${allowedWorkflowJobs.join(', ')}) — revise o job e adicione-o a allowedWorkflowJobs em scripts/validate-ci-gates.mjs`);
        }
    }
}
if (frontendGatesJob) {
    const envKeys = Object.keys(frontendGatesJob.env ?? {});
    for (const key of envKeys) {
        if (!allowedFrontendGatesEnvKeys.includes(key)) {
            failures.push(`${workflowPath}: jobs.${FRONTEND_GATES_JOB}.env declara a chave não permitida '${key}' — remova-a ou adicione-a a allowedFrontendGatesEnvKeys em scripts/validate-ci-gates.mjs`);
        }
    }
}
// Linhas de comando (steps[].run) do job frontend-gates, uma por linha,
// já normalizadas — usadas para validar que um comando obrigatório é de
// fato executado (e não apenas citado num comentário do workflow).
const frontendGatesRunLines = new Set();
if (frontendGatesJob) {
    const steps = Array.isArray(frontendGatesJob.steps) ? frontendGatesJob.steps : [];
    for (const step of steps) {
        if (typeof step?.run === 'string') {
            for (const line of step.run.split('\n')) {
                const trimmed = line.trim();
                if (trimmed) frontendGatesRunLines.add(trimmed);
            }
        }
    }
}
const isRunCommandFragment = (fragment) => fragment.startsWith('npm run ') || fragment.startsWith('npx ');

const packageJson = JSON.parse(read(packagePath));
const currentVersion = packageJson.logosoftVersion;
const scripts = packageJson.scripts ?? {};

if (typeof currentVersion !== 'string' || currentVersion.length === 0) {
    failures.push('package.json: logosoftVersion obrigatória ausente');
} else {
    for (const envPath of ['.env.example', '.env.test', '.env.backend-controlled.example']) {
        if (existsSync(join(root, envPath))) {
            requireSingleMatch(envPath, new RegExp(`^NEXT_PUBLIC_APP_VERSION=${escapeRegExp(currentVersion)}$`, 'gm'), `deve haver uma única declaração ativa de NEXT_PUBLIC_APP_VERSION=${currentVersion}`);
        }
    }

    if (frontendGatesJob) {
        const workflowVersion = frontendGatesJob.env?.NEXT_PUBLIC_APP_VERSION;
        if (workflowVersion !== currentVersion) {
            failures.push(`${workflowPath}: jobs.${FRONTEND_GATES_JOB}.env.NEXT_PUBLIC_APP_VERSION deve ser '${currentVersion}' (encontrado: ${JSON.stringify(workflowVersion ?? null)}) — ajuste a chave no bloco env do job`);
        }
    } else if (existsSync(join(root, workflowPath)) && workflowDoc) {
        failures.push(`${workflowPath}: não foi possível localizar jobs.${FRONTEND_GATES_JOB}.env.NEXT_PUBLIC_APP_VERSION para validar a versão`);
    }

    for (const jsonPath of ['scripts/backend-contract-map.allowlist.json', 'scripts/backend-permissions.snapshot.json', 'scripts/backend-permissions.allowlist.json', 'tests/evidence/integrated-e2e.assisted-evidence.example.json']) {
        if (!existsSync(join(root, jsonPath))) continue;
        const artifact = readJson(jsonPath);
        if (artifact && artifact.version !== currentVersion) {
            failures.push(`${jsonPath}: version deve acompanhar ${currentVersion}`);
        }
    }

    if (existsSync(join(root, 'README.md')) && !read('README.md').startsWith(`# logosoft Frontend v${currentVersion}`)) {
        failures.push(`README.md: título deve declarar v${currentVersion}`);
    }
    if (existsSync(join(root, 'CHANGELOG.md')) && !read('CHANGELOG.md').startsWith(`# v${currentVersion}`)) {
        failures.push(`CHANGELOG.md: primeira entrada deve declarar v${currentVersion}`);
    }
}
const requiredPackageScripts = [
    'validate:source',
    'validate:ci',
    'validate:guid-references',
    'validate:fiscal:production',
    'validate:backend-controlled',
    'validate:controlled-seeds',
    'validate:integrated-runbook',
    'validate:backend-seed-reset',
    'validate:assisted-e2e',
    'validate:integrated-e2e',
    'validate:operational-contracts',
    'validate:backend-contract-map',
    'validate:backend-permissions',
    'report:backend-permissions',
    'typecheck',
    'lint',
    'test:unit',
    'build',
    'test:e2e',
    'test:e2e:fiscal',
    'test:contract:fiscal',
    'test:contract:operational',
    'test:e2e:fiscal:backend',
    'test:e2e:integrated:backend',
    'prepare:e2e:integrated:seed',
    'report:e2e:integrated:assisted',
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
const ciGatesScript = scripts['ci:gates'] ?? '';
/**
 * Comparacao exata por segmento, e nao `includes`: `npm run test:e2e` e substring de
 * `npm run test:e2e:fiscal:backend`, entao a verificacao por substring daria verde sem que
 * a suite mockada estivesse na cadeia. E a mesma classe de defeito que deixou este workflow
 * quebrado por duas versoes.
 */
const ciGatesCommands = ciGatesScript.split('&&').map((command) => command.trim());
for (const fragment of requiredCiGatesFragments) {
    if (!ciGatesCommands.includes(fragment)) {
        failures.push(`package.json: script ci:gates deve conter o comando ${fragment}`);
    }
}
const playwrightInstallIndex = ciGatesCommands.indexOf('npx playwright install chromium');
const mockedE2eIndex = ciGatesCommands.indexOf('npm run test:e2e');
if (playwrightInstallIndex < 0 || mockedE2eIndex < 0 || playwrightInstallIndex > mockedE2eIndex) {
    failures.push('package.json: script ci:gates deve instalar Chromium do Playwright antes da suite E2E mockada');
}

if (ciGatesScript.includes('npm run test:e2e:integrated:backend')) {
    failures.push('package.json: ci:gates não deve executar fluxo mutável integrado automaticamente');
}
if (ciGatesScript.includes('npm run prepare:e2e:integrated:seed')) {
    failures.push('package.json: ci:gates não deve executar seed/reset mutável integrado automaticamente');
}

if (ciGatesScript.includes('npm run report:e2e:integrated:assisted')) {
    failures.push('package.json: ci:gates não deve gerar relatório assistido automaticamente');
}

if (existsSync(join(root, workflowPath))) {
    const requiredWorkflowFragments = [
        'pull_request:',
        'push:',
        'workflow_dispatch:',
        'actions/checkout@v4',
        'actions/setup-node@v4',
        'node-version-file: .node-version',
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

    for (const fragment of requiredWorkflowFragments) {
        if (isRunCommandFragment(fragment)) {
            // Fragmentos de comando precisam ser o valor real de um step
            // run: do job frontend-gates — não basta aparecer em qualquer
            // lugar do arquivo (ex.: dentro de um comentário).
            if (frontendGatesJob) {
                if (!frontendGatesRunLines.has(fragment)) {
                    failures.push(`${workflowPath}: jobs.${FRONTEND_GATES_JOB} deve ter um step cujo run seja (ou contenha na própria linha) '${fragment}' — adicione o step ou corrija o step existente`);
                }
            } else if (workflowDoc) {
                failures.push(`${workflowPath}: jobs.${FRONTEND_GATES_JOB}.steps ausente ou inválido — não foi possível validar o comando '${fragment}'`);
            }
            // Se o YAML não parseou, a falha já foi registrada acima; evita duplicar.
        } else {
            requireIncludes(workflowPath, fragment, `workflow deve conter ${fragment}`);
        }
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
    if (workflow.includes('npm run prepare:e2e:integrated:seed')) {
        failures.push(`${workflowPath}: workflow padrão não deve executar seed/reset mutável integrado automaticamente`);
    }
    if (workflow.includes('npm run report:e2e:integrated:assisted')) {
        failures.push(`${workflowPath}: workflow padrão não deve gerar relatório assistido automaticamente`);
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
    if (/LOGOSOFT_INTEGRATED_E2E_SEED_RESET_(RUN|ACK|APPLIED_ACK):\s*true/i.test(workflow)) {
        failures.push(`${workflowPath}: CI não deve habilitar seed/reset integrado mutável`);
    }
    if (/LOGOSOFT_INTEGRATED_E2E_ASSISTED_VALIDATION_ACK:\s*true/i.test(workflow)) {
        failures.push(`${workflowPath}: CI não deve habilitar validação assistida mutável`);
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação de CI/gates falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de CI/gates concluída sem pendências obrigatórias.\n');
