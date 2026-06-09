import { readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const sourceDirs = ['app', 'components', 'config', 'features', 'hooks', 'layout', 'lib', 'providers', 'types'];
const files = [];
const formattingFiles = [];
const formattingAllowedExtensions = new Set([
    '.cjs',
    '.css',
    '.html',
    '.js',
    '.json',
    '.jsx',
    '.md',
    '.mjs',
    '.scss',
    '.ts',
    '.tsx',
    '.txt',
    '.yaml',
    '.yml'
]);
const formattingAllowedFilenames = new Set([
    '.dockerignore',
    '.editorconfig',
    '.env',
    '.env.example',
    '.env.test',
    '.eslintrc.json',
    '.gitignore',
    '.node-version',
    '.npmrc',
    '.nvmrc',
    '.prettierignore',
    '.prettierrc.json',
    'Dockerfile'
]);
const ignoredDirs = new Set(['node_modules', '.next', 'coverage', '.git', 'dist', 'build', 'playwright-report', 'test-results']);

const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            if (ignoredDirs.has(entry)) continue;
            walk(path);
            continue;
        }
        if (/\.(ts|tsx)$/.test(entry)) files.push(path);
    }
};

const walkFormattingFiles = (dir) => {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            if (ignoredDirs.has(entry)) continue;
            walkFormattingFiles(path);
            continue;
        }

        if (formattingAllowedExtensions.has(extname(entry)) || formattingAllowedFilenames.has(entry)) {
            formattingFiles.push(path);
        }
    }
};

sourceDirs.forEach((dir) => walk(join(root, dir)));
walkFormattingFiles(root);

const checks = [
    { name: 'console.* em código de aplicação', pattern: /\bconsole\s*\./ },
    { name: 'resíduo da engrenagem do template', pattern: /pi-cog|layout-config-button|<AppConfig\b|AppConfigProps|configSidebarVisible|from ['"].*AppConfig['"]/ },
    { name: 'identificador TypeScript corrompido por texto de interface', pattern: /referência técnica_|INVALID_referência|GUID referência|referência técnica_REGEX/ },
    { name: 'declaração TypeScript com identificador quebrado por espaço', pattern: /\b(?:const|let|var|function|class|interface|type)\s+[A-Za-z_$À-ÿ][\w$À-ÿ-]*(?:\s+[A-Za-z_$À-ÿ][\w$À-ÿ-]*)+\s*(?:=|\()/ },
    { name: 'mapeamento Zod inseguro', pattern: /messages\?\.\[0\]/ },
    { name: 'export default direto de client page', pattern: /export\s+default\s+[A-Za-z0-9_]+Page\s*;/ },
    { name: 'rótulo visível com identificador técnico', pattern: /<label[^>]*>[^<]*(?:OrigemId|GUID|ID técnico)[^<]*<\/label>/ },
    { name: 'texto de ajuda expondo referência técnica', pattern: new RegExp(String.raw`(?:text=|<small[^>]*>|helperText:)['"{\`][^\n]*(?:referência técnica|GUID cru|ID técnico|OrigemId)`) }
];

const failures = [];
for (const file of files) {
    const content = readFileSync(file, 'utf8');
    for (const check of checks) {
        if (check.pattern.test(content)) {
            failures.push(`${relative(root, file)}: ${check.name}`);
        }
    }
}

for (const file of formattingFiles) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    const firstTrailingWhitespaceLine = lines.findIndex((line) => /[ \t]+$/.test(line));

    if (firstTrailingWhitespaceLine >= 0) {
        failures.push(`${relative(root, file)}:${firstTrailingWhitespaceLine + 1}: trailing whitespace não permitido`);
    }

    if (content.endsWith('\n\n') || content.endsWith('\r\n\r\n')) {
        failures.push(`${relative(root, file)}: linha em branco extra no final do arquivo não permitida`);
    }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const logosoftVersion = packageJson.logosoftVersion ?? packageJson.version;
const appConfig = readFileSync(join(root, 'config', 'app.ts'), 'utf8');
if (!appConfig.includes(`version: '${logosoftVersion}'`)) {
    failures.push(`config/app.ts: versão do rodapé não confere com package.json/logosoftVersion (${logosoftVersion})`);
}

const dockerfile = readFileSync(join(root, 'Dockerfile'), 'utf8');
if (!dockerfile.includes('FROM node:24-alpine AS deps') || !dockerfile.includes('FROM node:24-alpine AS builder') || !dockerfile.includes('FROM node:24-alpine AS runner')) {
    failures.push('Dockerfile: deve fixar node:24-alpine em todos os stages');
}
if (!packageJson.engines || packageJson.engines.node !== '>=24 <25') {
    failures.push('package.json: engines.node deve ser >=24 <25');
}

const npmrc = readFileSync(join(root, '.npmrc'), 'utf8');
if (/^timeout\s*=/m.test(npmrc)) {
    failures.push('.npmrc: usar fetch-timeout em vez de timeout, pois npm 11 alerta configuração desconhecida');
}
if (!dockerfile.includes('COPY package*.json .npmrc ./')) {
    failures.push('Dockerfile: stage deps deve copiar .npmrc antes do npm install');
}
const requiredAppRoutes = [
    'app/(main)/vendas/pedidos/novo/page.tsx',
    'app/(main)/vendas/pedidos/[id]/page.tsx',
    'app/(main)/compras/pedidos/novo/page.tsx',
    'app/(main)/compras/pedidos/[id]/page.tsx'
];
for (const routeFile of requiredAppRoutes) {
    try {
        statSync(join(root, routeFile));
    } catch {
        failures.push(`${routeFile}: rota operacional obrigatória ausente`);
    }
}


const requiredE2eFiles = [
    'tests/e2e/fixtures/logosoft.ts',
    'tests/e2e/auth.spec.ts',
    'tests/e2e/permissions.spec.ts',
    'tests/e2e/cadastros.spec.ts',
    'tests/e2e/logosoft-critical-flows.spec.ts',
    'tests/e2e/financeiro-estoque.spec.ts',
    'tests/e2e/auditoria.spec.ts'
];
for (const e2eFile of requiredE2eFiles) {
    try {
        statSync(join(root, e2eFile));
    } catch {
        failures.push(`${e2eFile}: cobertura E2E obrigatória ausente`);
    }
}

const playwrightConfig = readFileSync(join(root, 'playwright.config.ts'), 'utf8');
if (/NEXT_PUBLIC_USE_MOCK_(AUTH|API)/.test(playwrightConfig)) {
    failures.push('playwright.config.ts: runtime mock flags não devem ser usadas; testes E2E devem interceptar rotas via Playwright.');
}
if (!JSON.stringify(packageJson.scripts ?? {}).includes('test:e2e:critical')) {
    failures.push('package.json: script test:e2e:critical obrigatório para smoke E2E rápido');
}

const finalReviewFiles = [
    'components/security/RoutePermissionGate.tsx',
    'lib/security/routePermissions.ts',
    'lib/formatters/privacy.ts',
    'tests/unit/routePermissions.test.ts',
    'tests/unit/privacyFormatter.test.ts',
    'docs/IMPLEMENTACAO_V10_0_15.md'
];
for (const finalReviewFile of finalReviewFiles) {
    try {
        statSync(join(root, finalReviewFile));
    } catch {
        failures.push(`${finalReviewFile}: revisão final de segurança/LGPD obrigatória ausente`);
    }
}

const loginUxFiles = [
    'features/auth/components/LoginPage.tsx',
    'features/auth/components/LoginForm.tsx',
    'features/auth/components/LoginBrandPanel.tsx',
    'features/auth/components/LoginEnvironmentBadge.tsx',
    'features/auth/schemas/loginSchema.ts',
    'features/auth/hooks/useLogin.ts',
    'docs/IMPLEMENTACAO_V1_10_15A1.md',
    'tests/components/LoginForm.test.tsx',
    'tests/unit/sessionPolicy.test.ts'
];
for (const loginUxFile of loginUxFiles) {
    try {
        statSync(join(root, loginUxFile));
    } catch {
        failures.push(`${loginUxFile}: Login UX v1.10.15a1 obrigatório ausente`);
    }
}

const authProvider = readFileSync(join(root, 'providers/AuthProvider.tsx'), 'utf8');
if (!authProvider.includes('touchSessionActivity') || !authProvider.includes('expireStoredSession')) {
    failures.push('providers/AuthProvider.tsx: sessão deve controlar inatividade e expiração visual');
}
const sessionStorage = readFileSync(join(root, 'lib/auth/sessionStorage.ts'), 'utf8');
if (!sessionStorage.includes('SESSION_MAX_AGE_MS = 5 * 60 * 60 * 1000') || !sessionStorage.includes('SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000')) {
    failures.push('lib/auth/sessionStorage.ts: política de sessão deve manter 5 horas máximas e 30 minutos de inatividade');
}


const fiscalProductionReviewFiles = [
    'docs/FISCAL_FRONTEND_PRODUCTION_REVIEW.md',
    'scripts/validate-fiscal-production.mjs',
    'tests/unit/fiscalProductionReadiness.test.ts'
];
for (const fiscalProductionReviewFile of fiscalProductionReviewFiles) {
    try {
        statSync(join(root, fiscalProductionReviewFile));
    } catch {
        failures.push(`${fiscalProductionReviewFile}: revisão final de produção fiscal obrigatória ausente`);
    }
}

const fiscalImplementationPaths = [
    'app/(main)/fiscal',
    'app/(main)/nota-fiscal',
    'app/(main)/notas-fiscais',
    'features/fiscal',
    'features/nota-fiscal',
    'features/notas-fiscais'
];
const fiscalImplementationFound = fiscalImplementationPaths.some((fiscalPath) => {
    try {
        statSync(join(root, fiscalPath));
        return true;
    } catch {
        return false;
    }
});
if (fiscalImplementationFound) {
    try {
        statSync(join(root, 'docs/CONTRATO_FISCAL_OFICIAL.md'));
    } catch {
        failures.push('Fiscal/Nota Fiscal: implementação fiscal exige docs/CONTRATO_FISCAL_OFICIAL.md antes de criar rotas, features ou chamadas de API');
    }
}

try {
    statSync(join(root, 'docs/IMPLEMENTACAO_V1_11_0.md'));
} catch {
    failures.push('docs/IMPLEMENTACAO_V1_11_0.md: documentação do gate Fiscal v1.11.0 obrigatória ausente');
}

const mainLayout = readFileSync(join(root, 'app/(main)/layout.tsx'), 'utf8');
if (!mainLayout.includes('<RoutePermissionGate>')) {
    failures.push('app/(main)/layout.tsx: rotas internas devem passar pelo RoutePermissionGate');
}
const pessoasPage = readFileSync(join(root, 'features/pessoas/components/PessoasPage.tsx'), 'utf8');
if (!pessoasPage.includes('maskDocument(row.documento)')) {
    failures.push('features/pessoas/components/PessoasPage.tsx: documento de pessoa deve ser mascarado na listagem');
}
const clienteDialog = readFileSync(join(root, 'features/clientes/components/ClienteFormDialog.tsx'), 'utf8');
const fornecedorDialog = readFileSync(join(root, 'features/fornecedores/components/FornecedorFormDialog.tsx'), 'utf8');
if (!clienteDialog.includes('buildPrivacySafeEntityLabel') || !fornecedorDialog.includes('buildPrivacySafeEntityLabel')) {
    failures.push('Cliente/Fornecedor: selects de pessoa devem usar label minimizado por LGPD');
}

try {
    statSync(join(root, 'scripts/validate-guid-references.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-guid-references.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-guid-references.mjs: varredura global contra GUID manual falhou ou está ausente');
}

try {
    statSync(join(root, 'scripts/validate-mocks-isolation.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-mocks-isolation.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-mocks-isolation.mjs: validação do isolamento de mocks falhou ou está ausente');
}

try {
    statSync(join(root, 'scripts/validate-ci-gates.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-ci-gates.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-ci-gates.mjs: validação dos gates de CI falhou ou está ausente');
}





try {
    statSync(join(root, 'scripts/validate-controlled-seeds.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-controlled-seeds.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-controlled-seeds.mjs: validação de seeds controladas falhou ou está ausente');
}


try {
    statSync(join(root, 'scripts/validate-integrated-runbook.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-integrated-runbook.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-integrated-runbook.mjs: validação do runbook de E2E integrado falhou ou está ausente');
}


try {
    statSync(join(root, 'scripts/validate-backend-seed-reset.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-backend-seed-reset.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-backend-seed-reset.mjs: validação de seed/reset backend falhou ou está ausente');
}

try {
    statSync(join(root, 'scripts/validate-integrated-e2e.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-integrated-e2e.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-integrated-e2e.mjs: validação do E2E integrado controlado falhou ou está ausente');
}

try {
    statSync(join(root, 'scripts/validate-operational-contracts.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-operational-contracts.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-operational-contracts.mjs: validação dos contratos operacionais falhou ou está ausente');
}

try {
    statSync(join(root, 'scripts/validate-backend-controlled.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-backend-controlled.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-backend-controlled.mjs: validação do ambiente backend controlado falhou ou está ausente');
}

try {
    statSync(join(root, 'scripts/validate-skills.mjs'));
    execFileSync(process.execPath, [join(root, 'scripts/validate-skills.mjs')], { stdio: 'inherit' });
} catch {
    failures.push('scripts/validate-skills.mjs: validação das skills operacionais falhou ou está ausente');
}

if (failures.length > 0) {
    process.stderr.write(`Validação de fonte falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de fonte concluída sem regressões conhecidas.\n');
