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
const requireNoIncludes = (path, fragment, reason) => {
    if (existsSync(join(root, path)) && read(path).includes(fragment)) failures.push(`${path}: ${reason}`);
};

const requiredFiles = [
    ['docs/BACKEND_CONTROLLED_VALIDATION.md', 'documentação da validação backend controlada obrigatória ausente'],
    ['docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md', 'levantamento de pendências obrigatória ausente'],
    ['docs/IMPLEMENTACAO_V1_11_0A8B30.md', 'documentação da versão B30 obrigatória ausente'],
    ['.env.backend-controlled.example', 'template seguro de ambiente backend controlado obrigatório ausente'],
    ['tests/contract/fiscal-backend.contract.spec.ts', 'contrato fiscal backend controlado obrigatório ausente'],
    ['tests/e2e/fiscal-backend.spec.ts', 'E2E fiscal backend controlado obrigatório ausente'],
    ['playwright.contract.config.ts', 'config Playwright de contrato obrigatório ausente'],
    ['playwright.backend-e2e.config.ts', 'config Playwright de E2E backend obrigatório ausente']
];

for (const [path, reason] of requiredFiles) {
    requireFile(path, reason);
}

if (existsSync(join(root, '.env.backend-controlled.example'))) {
    const envExample = read('.env.backend-controlled.example');
    const requiredEnvKeys = [
        'NEXT_PUBLIC_API_URL=',
        'PLAYWRIGHT_BACKEND_BASE_URL=',
        'LOGOSOFT_CONTRACT_API_URL=',
        'LOGOSOFT_CONTRACT_ACCESS_TOKEN=',
        'LOGOSOFT_CONTRACT_EMPRESA_ID=',
        'LOGOSOFT_E2E_API_URL=',
        'LOGOSOFT_E2E_ACCESS_TOKEN=',
        'LOGOSOFT_E2E_EMPRESA_ID=',
        'LOGOSOFT_E2E_PEDIDO_VENDA_ID=',
        'LOGOSOFT_E2E_RUN_BACKEND_FISCAL=false'
    ];

    for (const key of requiredEnvKeys) {
        if (!envExample.includes(key)) failures.push(`.env.backend-controlled.example: chave obrigatória ausente: ${key}`);
    }

    const forbiddenSecretSamples = [/Bearer\s+[A-Za-z0-9._-]+/i, /sk-[A-Za-z0-9]/i, /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/];
    for (const pattern of forbiddenSecretSamples) {
        if (pattern.test(envExample)) failures.push('.env.backend-controlled.example: não deve conter token, segredo ou JWT real');
    }

    const lines = envExample.split(/\r?\n/);
    lines.forEach((line, index) => {
        if (/[ \t]+$/.test(line)) failures.push(`.env.backend-controlled.example:${index + 1}: trailing whitespace não permitido`);
    });
    if (envExample.endsWith('\n\n') || envExample.endsWith('\r\n\r\n')) {
        failures.push('.env.backend-controlled.example: linha em branco extra no final do arquivo não permitida');
    }
}

if (existsSync(join(root, 'tests/contract/fiscal-backend.contract.spec.ts'))) {
    requireIncludes('tests/contract/fiscal-backend.contract.spec.ts', 'test.skip(!shouldRun', 'contrato deve ser opt-in e pular sem variáveis controladas');
    requireIncludes('tests/contract/fiscal-backend.contract.spec.ts', 'LOGOSOFT_CONTRACT_API_URL', 'contrato deve depender de API controlada explícita');
    requireIncludes('tests/contract/fiscal-backend.contract.spec.ts', 'LOGOSOFT_CONTRACT_ACCESS_TOKEN', 'contrato deve depender de token controlado explícito');
    requireIncludes('tests/contract/fiscal-backend.contract.spec.ts', 'LOGOSOFT_CONTRACT_EMPRESA_ID', 'contrato deve depender de empresa controlada explícita');
    requireIncludes('tests/contract/fiscal-backend.contract.spec.ts', 'LOGOSOFT_CONTRACT_RUN_EXPORT_CSV', 'exportação CSV fiscal deve permanecer opt-in');
}

if (existsSync(join(root, 'tests/e2e/fiscal-backend.spec.ts'))) {
    requireIncludes('tests/e2e/fiscal-backend.spec.ts', 'LOGOSOFT_E2E_RUN_BACKEND_FISCAL === \'true\'', 'E2E mutável deve exigir opt-in explícito');
    requireIncludes('tests/e2e/fiscal-backend.spec.ts', 'LOGOSOFT_E2E_PEDIDO_VENDA_ID', 'E2E mutável deve exigir pedido de venda controlado');
    requireIncludes('tests/e2e/fiscal-backend.spec.ts', 'LOGOSOFT_E2E_ACCESS_TOKEN', 'E2E mutável deve exigir token controlado explícito');
    requireIncludes('tests/e2e/fiscal-backend.spec.ts', 'LOGOSOFT_E2E_EMPRESA_ID', 'E2E mutável deve exigir empresa controlada explícita');
}

if (existsSync(join(root, 'playwright.backend-e2e.config.ts'))) {
    requireIncludes('playwright.backend-e2e.config.ts', 'LOGOSOFT_E2E_USE_EXISTING_FRONTEND', 'config backend deve permitir frontend já iniciado em validação controlada');
    requireIncludes('playwright.backend-e2e.config.ts', 'NEXT_PUBLIC_API_URL: apiUrl', 'webServer deve apontar o frontend para a API controlada');
}

if (existsSync(join(root, 'package.json'))) {
    const packageJson = JSON.parse(read('package.json'));
    const scripts = packageJson.scripts ?? {};
    if (scripts['validate:backend-controlled'] !== 'node scripts/validate-backend-controlled.mjs') {
        failures.push('package.json: script validate:backend-controlled deve executar node scripts/validate-backend-controlled.mjs');
    }
    const ciGates = scripts['ci:gates'] ?? '';
    if (!ciGates.includes('npm run validate:backend-controlled')) {
        failures.push('package.json: ci:gates deve executar validate:backend-controlled');
    }
    if (ciGates.indexOf('npm run validate:backend-controlled') > ciGates.indexOf('npm run test:contract:fiscal')) {
        failures.push('package.json: validate:backend-controlled deve rodar antes das suítes opt-in contra backend');
    }
}

if (existsSync(join(root, 'scripts/validate-source.mjs'))) {
    requireIncludes('scripts/validate-source.mjs', 'scripts/validate-backend-controlled.mjs', 'validate-source deve executar validate-backend-controlled como gate estrutural');
}

if (existsSync(join(root, 'scripts/validate-ci-gates.mjs'))) {
    requireIncludes('scripts/validate-ci-gates.mjs', 'validate:backend-controlled', 'validate-ci-gates deve exigir o gate de backend controlado');
}

if (existsSync(join(root, '.github/workflows/frontend-ci.yml'))) {
    requireIncludes('.github/workflows/frontend-ci.yml', 'npm run validate:backend-controlled', 'workflow deve validar contrato estrutural do backend controlado');
    requireNoIncludes('.github/workflows/frontend-ci.yml', 'LOGOSOFT_CONTRACT_ACCESS_TOKEN', 'workflow padrão não deve declarar token de contrato backend');
    requireNoIncludes('.github/workflows/frontend-ci.yml', 'LOGOSOFT_E2E_ACCESS_TOKEN', 'workflow padrão não deve declarar token de E2E backend');
    requireNoIncludes('.github/workflows/frontend-ci.yml', 'LOGOSOFT_E2E_RUN_BACKEND_FISCAL: true', 'workflow padrão não deve executar fluxo mutável real por padrão');
}

if (existsSync(join(root, 'docs/BACKEND_CONTROLLED_VALIDATION.md'))) {
    const requiredFragments = [
        'Ambiente controlado',
        'LOGOSOFT_CONTRACT_API_URL',
        'LOGOSOFT_E2E_RUN_BACKEND_FISCAL=true',
        'não deve apontar para produção',
        'npx playwright install chromium',
        'npm run test:contract:fiscal',
        'npm run test:e2e:fiscal:backend'
    ];
    for (const fragment of requiredFragments) {
        requireIncludes('docs/BACKEND_CONTROLLED_VALIDATION.md', fragment, `documentação deve conter ${fragment}`);
    }
}

if (existsSync(join(root, 'docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md'))) {
    const requiredFragments = [
        'Pendências bloqueantes para validação real',
        'Pendências funcionais por módulo',
        'Fiscal',
        'Financeiro',
        'Estoque',
        'Vendas',
        'Compras',
        'Segurança',
        'Testes ainda necessários'
    ];
    for (const fragment of requiredFragments) {
        requireIncludes('docs/LEVANTAMENTO_PENDENCIAS_FRONTEND.md', fragment, `levantamento deve conter ${fragment}`);
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação de backend controlado falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de backend controlado concluída sem pendências estruturais.\n');
