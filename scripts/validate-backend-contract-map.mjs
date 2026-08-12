import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readContractMapInputs, routeKey, validateAuditAllowlist } from './lib/backend-contract-map.mjs';

const root = process.cwd();
const failures = [];
const reportOnly = process.argv.includes('--report');
const read = (path) => readFileSync(join(root, path), 'utf8');
const fail = (message) => failures.push(message);

const contractPath = 'docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md';
const allowlistPath = 'scripts/backend-contract-map.allowlist.json';
if (!existsSync(join(root, contractPath))) fail(`${contractPath}: contrato canônico ausente`);
if (!existsSync(join(root, allowlistPath))) fail(`${allowlistPath}: allowlist auditável ausente`);

let inputs;
if (existsSync(join(root, contractPath))) inputs = readContractMapInputs(root, contractPath);

let allowlist;
if (existsSync(join(root, allowlistPath))) {
    try {
        allowlist = JSON.parse(read(allowlistPath));
    } catch (error) {
        fail(`${allowlistPath}: JSON inválido (${error.message})`);
    }
}

const packageJson = JSON.parse(read('package.json'));
if (allowlist) {
    for (const issue of validateAuditAllowlist(allowlist, { version: packageJson.logosoftVersion, contractDocument: contractPath })) {
        fail(`${allowlistPath}: ${issue}`);
    }
    if (!Array.isArray(allowlist.documentedDivergences) || allowlist.documentedDivergences.length !== 0) fail(`${allowlistPath}: não pode manter divergências auditáveis enquanto o mapa canônico não aponta incompatibilidades`);
}

if (inputs) {
    if (inputs.backendRoutes.length < 500) fail(`${contractPath}: catálogo de rotas incompleto (${inputs.backendRoutes.length})`);
    const incompatible = inputs.comparison.incompatible;
    const allowlistedKeys = new Set((allowlist?.documentedDivergences ?? []).map((item) => routeKey(item.method, item.path)));
    const incompatibleKeys = new Set(incompatible.map((item) => item.key));
    for (const item of incompatible) {
        if (!allowlistedKeys.has(item.key)) fail(`rota frontend sem correspondência no backend e sem registro auditável: ${item.key} (${item.file}:${item.line})`);
        else fail(`rota frontend incompatível com o catálogo backend: ${item.key} (${item.file}:${item.line})`);
    }
    for (const item of allowlist?.documentedDivergences ?? []) {
        const key = routeKey(item.method, item.path);
        if (!incompatibleKeys.has(key)) fail(`${allowlistPath}: divergência ${item.id} não corresponde a uma incompatibilidade observada (${key})`);
    }
    if (inputs.comparison.unresolved.length > 0) {
        const unclassified = inputs.comparison.unresolved.filter((item) => !allowlistedKeys.has(item.key));
        for (const item of unclassified) fail(`rota dinâmica não classificada: ${item.key} (${item.file}:${item.line})`);
    }

    const swaggerFile = process.env.LOGOSOFT_BACKEND_SWAGGER_FILE;
    if (swaggerFile) {
        const fullSwaggerPath = join(root, swaggerFile);
        if (!existsSync(fullSwaggerPath)) fail(`Swagger informado não existe: ${swaggerFile}`);
        else {
            let swagger;
            try { swagger = JSON.parse(readFileSync(fullSwaggerPath, 'utf8')); } catch (error) { fail(`Swagger inválido: ${error.message}`); }
            const paths = new Set(Object.keys(swagger?.paths ?? {}));
            if (paths.size === 0) fail(`${swaggerFile}: Swagger sem paths`);
            for (const route of inputs.backendRoutes) if (!paths.has(route.path)) fail(`${swaggerFile}: rota do catálogo ausente: ${route.path}`);
        }
    }
}

const summary = inputs ? {
    backendRoutes: inputs.backendRoutes.length,
    frontendCalls: inputs.frontendRoutes.length,
    frontendUniqueRoutes: new Set(inputs.frontendRoutes.map((item) => item.key)).size,
    matchedRoutes: inputs.comparison.matched.length,
    incompatibleRoutes: inputs.comparison.incompatible.length,
    missingRoutes: inputs.comparison.missing.length,
    methodMismatches: inputs.comparison.methodMismatch.length,
    indirectResourceRoutes: inputs.comparison.indirectMissing.length,
    unresolvedRoutes: inputs.comparison.unresolved.length,
    allowlistedForAuditOnly: allowlist?.documentedDivergences?.length ?? 0
} : null;

if (reportOnly) {
    const issues = inputs ? {
        incompatible: inputs.comparison.incompatible.map(({ key, file, line, kind }) => ({ key, file, line, kind })),
        methodMismatch: inputs.comparison.methodMismatch.map(({ key, file, line, backendMethods }) => ({ key, file, line, backendMethods })),
        unresolved: inputs.comparison.unresolved.map(({ key, file, line, expressions }) => ({ key, file, line, expressions })),
        indirectMissing: inputs.comparison.indirectMissing.map(({ key, file, line }) => ({ key, file, line }))
    } : null;
    process.stdout.write(`${JSON.stringify({ ok: failures.length === 0, failures, summary, issues }, null, 2)}\n`);
    process.exit(0);
}
if (failures.length > 0) {
    process.stderr.write(`Validação do mapa de contratos frontend/backend falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}
process.stdout.write(`Validação do mapa de contratos frontend/backend concluída: ${summary.frontendUniqueRoutes} rotas frontend únicas e compatíveis.\n`);
