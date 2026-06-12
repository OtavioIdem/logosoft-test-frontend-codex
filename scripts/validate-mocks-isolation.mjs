import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const productionDirs = ['app', 'components', 'config', 'features', 'hooks', 'layout', 'lib', 'providers', 'types'];
const allowedMockDirs = ['tests', 'skills', 'docs'];
const failures = [];

const ignoredDirs = new Set(['node_modules', '.next', 'coverage', '.git', 'dist', 'build', 'playwright-report', 'test-results']);

const walkFiles = (dir, result = []) => {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            if (ignoredDirs.has(entry)) continue;
            walkFiles(path, result);
            continue;
        }
        result.push(path);
    }
    return result;
};

const exists = (path) => {
    try {
        statSync(join(root, path));
        return true;
    } catch {
        return false;
    }
};

const assertExists = (path, reason) => {
    if (!exists(path)) failures.push(`${path}: ${reason}`);
};

const productionFiles = productionDirs.flatMap((dir) => (exists(dir) ? walkFiles(join(root, dir)) : []));

for (const file of productionFiles) {
    const rel = relative(root, file);
    const fileName = rel.split(sep).pop() ?? rel;
    const content = readFileSync(file, 'utf8');

    if (/mock|fixture|fake/i.test(fileName)) {
        failures.push(`${rel}: arquivos de mock/fixture/fake não podem ficar em diretórios produtivos`);
    }

    if (/from\s+['"][^'"]*(?:mock|fixture|fake)[^'"]*['"]|import\(['"][^'"]*(?:mock|fixture|fake)[^'"]*['"]\)/i.test(content)) {
        failures.push(`${rel}: código produtivo não pode importar mock/fixture/fake`);
    }

    if (/NEXT_PUBLIC_USE_MOCK_(AUTH|API)/.test(content)) {
        failures.push(`${rel}: código produtivo não pode depender de flag NEXT_PUBLIC_USE_MOCK_*`);
    }

    if (/mockAuthClient|mockErpStore|createMockResourceClient|resourceMockClient/.test(content)) {
        failures.push(`${rel}: código produtivo não pode referenciar clientes ou stores mockados`);
    }
}

for (const dir of allowedMockDirs) {
    if (!exists(dir)) continue;
    const files = walkFiles(join(root, dir));
    for (const file of files) {
        const rel = relative(root, file);
        const content = readFileSync(file, 'utf8');
        if (/from\s+['"]@\/features\/(?:auth|shared)\/api\/(?:mockAuthClient|mockErpStore|resourceMockClient)['"]/.test(content)) {
            failures.push(`${rel}: teste/documentação deve apontar para tests/mocks, não para mocks em features`);
        }
    }
}

assertExists('tests/mocks/auth/mockAuthClient.ts', 'mock de autenticação deve ficar isolado em tests/mocks');
assertExists('tests/mocks/resources/mockErpStore.ts', 'store mockado deve ficar isolado em tests/mocks');
assertExists('tests/mocks/resources/resourceMockClient.ts', 'client mockado de recurso deve ficar isolado em tests/mocks');
assertExists('tests/e2e/fixtures/logosoft.ts', 'E2E mockado deve continuar isolado em fixture do Playwright');
assertExists('tests/unit/mockErpStore.test.ts', 'store mockado deve manter teste unitário próprio');

const forbiddenLegacyPaths = [
    'features/auth/api/mockAuthClient.ts',
    'features/shared/api/mockErpStore.ts',
    'features/shared/api/resourceMockClient.ts'
];
for (const legacyPath of forbiddenLegacyPaths) {
    if (exists(legacyPath)) {
        failures.push(`${legacyPath}: mock não pode permanecer em features/api após isolamento B29`);
    }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const scripts = packageJson.scripts ?? {};
if (!scripts['validate:mocks-isolation']) {
    failures.push('package.json: script validate:mocks-isolation obrigatório');
}
if (!scripts['ci:gates']?.includes('validate:mocks-isolation')) {
    failures.push('package.json: ci:gates deve executar validate:mocks-isolation explicitamente');
}

const validateSource = readFileSync(join(root, 'scripts', 'validate-source.mjs'), 'utf8');
if (!validateSource.includes('scripts/validate-mocks-isolation.mjs')) {
    failures.push('scripts/validate-source.mjs: deve executar validate-mocks-isolation.mjs');
}

if (failures.length > 0) {
    process.stderr.write(`Validação de isolamento de mocks falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de isolamento de mocks concluída sem regressões conhecidas.\n');
