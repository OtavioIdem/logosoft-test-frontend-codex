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
    ['docs/BACKEND_OPERATIONAL_CONTRACTS.md', 'documentação dos contratos operacionais obrigatória ausente'],
    ['docs/IMPLEMENTACAO_V1_11_0A8B31.md', 'documentação da versão B31 obrigatória ausente'],
    ['docs/IMPLEMENTACAO_V1_11_0A8B31_C1.md', 'documentação da correção B31.c1 obrigatória ausente'],
    ['tests/contract/operational-backend.contract.spec.ts', 'contrato operacional backend controlado obrigatório ausente'],
    ['playwright.operational-contract.config.ts', 'config Playwright de contrato operacional obrigatório ausente'],
    ['playwright.contract.config.ts', 'config Playwright de contrato fiscal obrigatório ausente'],
    ['tests/unit/operationalBackendContract.test.ts', 'teste unitário do contrato operacional obrigatório ausente'],
    ['scripts/validate-operational-contracts.mjs', 'gate validate-operational-contracts obrigatório ausente']
];

for (const [path, reason] of requiredFiles) {
    requireFile(path, reason);
}

if (existsSync(join(root, '.env.backend-controlled.example'))) {
    const envExample = read('.env.backend-controlled.example');
    const requiredEnvKeys = [
        'LOGOSOFT_OPERATIONAL_CONTRACT_API_URL=',
        'LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN=',
        'LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID=',
        'LOGOSOFT_OPERATIONAL_CONTRACT_FILIAL_ID=',
        'LOGOSOFT_OPERATIONAL_CONTRACT_PEDIDO_VENDA_ID=',
        'LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_RECEBER_ID=',
        'LOGOSOFT_OPERATIONAL_CONTRACT_CONTA_PAGAR_ID=',
        'LOGOSOFT_OPERATIONAL_CONTRACT_ORIGEM_ID='
    ];

    for (const key of requiredEnvKeys) {
        if (!envExample.includes(key)) failures.push(`.env.backend-controlled.example: chave operacional obrigatória ausente: ${key}`);
    }

    const forbiddenSecretSamples = [/Bearer\s+[A-Za-z0-9._-]+/i, /sk-[A-Za-z0-9]/i, /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/];
    for (const pattern of forbiddenSecretSamples) {
        if (pattern.test(envExample)) failures.push('.env.backend-controlled.example: não deve conter token, segredo ou JWT real');
    }
}

if (existsSync(join(root, 'tests/contract/operational-backend.contract.spec.ts'))) {
    const contractPath = 'tests/contract/operational-backend.contract.spec.ts';
    const requiredFragments = [
        'test.skip(!shouldRun',
        'LOGOSOFT_OPERATIONAL_CONTRACT_API_URL',
        'LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN',
        'LOGOSOFT_OPERATIONAL_CONTRACT_EMPRESA_ID',
        '/api/vendas/pedidos',
        '/api/estoque/saldos',
        '/api/estoque/movimentos',
        '/api/estoque/reservas',
        '/api/financeiro/contas-receber',
        '/api/financeiro/contas-pagar',
        '/api/auditoria/eventos'
    ];

    for (const fragment of requiredFragments) {
        requireIncludes(contractPath, fragment, `contrato operacional deve conter ${fragment}`);
    }

    const forbiddenMutations = ['api.post(', 'api.put(', 'api.patch(', 'api.delete(', '/aprovar', '/faturar', '/receber', '/pagar', '/baixar', '/cancelar', '/estornar'];
    for (const fragment of forbiddenMutations) {
        requireNoIncludes(contractPath, fragment, `contrato operacional B31 deve permanecer read-only e não conter ${fragment}`);
    }

    requireNoIncludes(contractPath, 'LOGOSOFT_CONTRACT_', 'contrato operacional deve exigir opt-in próprio e não pode depender de variáveis fiscais LOGOSOFT_CONTRACT_*');
}

if (existsSync(join(root, 'playwright.operational-contract.config.ts'))) {
    requireIncludes('playwright.operational-contract.config.ts', 'operational-backend\\.contract\\.spec\\.ts', 'config deve executar apenas o contrato operacional');
    requireNoIncludes('playwright.operational-contract.config.ts', '.*\\.contract\\.spec\\.ts', 'config operacional não deve capturar todos os specs de contrato');
}

if (existsSync(join(root, 'playwright.contract.config.ts'))) {
    requireIncludes('playwright.contract.config.ts', 'fiscal-backend\\.contract\\.spec\\.ts', 'config fiscal deve executar apenas o contrato fiscal');
    requireNoIncludes('playwright.contract.config.ts', '.*\\.contract\\.spec\\.ts', 'config fiscal não deve capturar o contrato operacional');
    requireNoIncludes('playwright.contract.config.ts', 'operational-backend\\.contract\\.spec\\.ts', 'config fiscal não deve executar o contrato operacional');
}

if (existsSync(join(root, 'package.json'))) {
    const packageJson = JSON.parse(read('package.json'));
    const scripts = packageJson.scripts ?? {};
    if (scripts['validate:operational-contracts'] !== 'node scripts/validate-operational-contracts.mjs') {
        failures.push('package.json: script validate:operational-contracts deve executar node scripts/validate-operational-contracts.mjs');
    }
    if (scripts['test:contract:operational'] !== 'playwright test --config=playwright.operational-contract.config.ts') {
        failures.push('package.json: script test:contract:operational deve usar playwright.operational-contract.config.ts');
    }
    if (scripts['test:contract:fiscal'] !== 'playwright test --config=playwright.contract.config.ts') {
        failures.push('package.json: script test:contract:fiscal deve usar playwright.contract.config.ts dedicado ao fiscal');
    }

    const ciGates = scripts['ci:gates'] ?? '';
    if (!ciGates.includes('npm run validate:operational-contracts')) {
        failures.push('package.json: ci:gates deve executar validate:operational-contracts');
    }
    if (!ciGates.includes('npm run test:contract:operational')) {
        failures.push('package.json: ci:gates deve executar test:contract:operational');
    }
    if (ciGates.indexOf('npm run validate:operational-contracts') > ciGates.indexOf('npm run test:contract:operational')) {
        failures.push('package.json: validate:operational-contracts deve rodar antes do contrato operacional');
    }
}

if (existsSync(join(root, 'scripts/validate-source.mjs'))) {
    requireIncludes('scripts/validate-source.mjs', 'scripts/validate-operational-contracts.mjs', 'validate-source deve executar validate-operational-contracts como gate estrutural');
}

if (existsSync(join(root, 'scripts/validate-ci-gates.mjs'))) {
    requireIncludes('scripts/validate-ci-gates.mjs', 'validate:operational-contracts', 'validate-ci-gates deve exigir o gate operacional');
    requireIncludes('scripts/validate-ci-gates.mjs', 'test:contract:operational', 'validate-ci-gates deve exigir o contrato operacional');
}

if (existsSync(join(root, '.github/workflows/frontend-ci.yml'))) {
    requireIncludes('.github/workflows/frontend-ci.yml', 'npm run validate:operational-contracts', 'workflow deve validar estrutura dos contratos operacionais');
    requireIncludes('.github/workflows/frontend-ci.yml', 'npm run test:contract:operational', 'workflow deve executar contrato operacional opt-in');
    requireNoIncludes('.github/workflows/frontend-ci.yml', 'LOGOSOFT_OPERATIONAL_CONTRACT_ACCESS_TOKEN', 'workflow padrão não deve declarar token operacional');
}

if (existsSync(join(root, 'docs/BACKEND_OPERATIONAL_CONTRACTS.md'))) {
    const requiredFragments = [
        'Contratos operacionais read-only',
        'Vendas',
        'Estoque',
        'Financeiro',
        'Auditoria',
        'LOGOSOFT_OPERATIONAL_CONTRACT_API_URL',
        'npm run test:contract:operational',
        'read-only',
        'não deve apontar para produção'
    ];

    for (const fragment of requiredFragments) {
        requireIncludes('docs/BACKEND_OPERATIONAL_CONTRACTS.md', fragment, `documentação operacional deve conter ${fragment}`);
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação de contratos operacionais falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de contratos operacionais concluída sem pendências estruturais.\n');
