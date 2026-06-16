import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const requireFile = (path, reason) => {
    if (!existsSync(join(root, path))) failures.push(`${path}: ${reason}`);
};
const requireIncludes = (path, fragment, reason) => {
    if (!read(path).includes(fragment)) failures.push(`${path}: ${reason}`);
};

const packageJson = JSON.parse(read('package.json'));
const expectedVersion = packageJson.logosoftVersion ?? '1.11.0a8b38.c1';
const allowlistPath = 'scripts/backend-contract-map.allowlist.json';
const docPath = 'docs/CONTRATO_FRONTEND_BACKEND_B38.md';

requireFile(allowlistPath, 'allowlist de divergências controladas obrigatório ausente');
requireFile(docPath, 'documentação de contrato frontend/backend B38 obrigatória ausente');
requireFile('docs/IMPLEMENTACAO_V1_11_0A8B38.md', 'documentação de implementação B38 obrigatória ausente');

const allowlist = existsSync(join(root, allowlistPath)) ? JSON.parse(read(allowlistPath)) : { documentedDivergences: [] };
if (allowlist.version !== expectedVersion) failures.push(`${allowlistPath}: version deve ser ${expectedVersion}`);
if (!Array.isArray(allowlist.documentedDivergences) || allowlist.documentedDivergences.length < 10) {
    failures.push(`${allowlistPath}: deve classificar as divergências críticas conhecidas`);
}

const ids = new Set();
for (const item of allowlist.documentedDivergences ?? []) {
    for (const field of ['id', 'status', 'frontend', 'backendInventario', 'decisao', 'target']) {
        if (!item[field]) failures.push(`${allowlistPath}: divergência sem campo obrigatório ${field}`);
    }
    if (ids.has(item.id)) failures.push(`${allowlistPath}: id duplicado ${item.id}`);
    ids.add(item.id);

    if (existsSync(join(root, docPath)) && !read(docPath).includes(item.id)) {
        failures.push(`${docPath}: divergência ${item.id} deve estar documentada`);
    }
}

const apiFiles = [];
const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            if (['node_modules', '.next', 'coverage', 'test-results', 'playwright-report'].includes(entry)) continue;
            walk(path);
            continue;
        }
        if (extname(entry) === '.ts' && /(?:^|[/\\])api[/\\].+Api\.ts$/.test(path)) apiFiles.push(path);
    }
};
walk(join(root, 'features'));
walk(join(root, 'lib'));

const endpointPattern = /(?:httpClient|rawHttpClient)\.(get|post|put|patch|delete)(?:<[^>]+>)?\((`[^`]+`|'[^']+'|"[^"]+")/g;
const endpoints = [];
for (const file of apiFiles) {
    const content = readFileSync(file, 'utf8');
    let match;
    while ((match = endpointPattern.exec(content))) {
        const literal = match[2].slice(1, -1);
        if (literal.includes('/api/')) {
            endpoints.push({ method: match[1].toUpperCase(), path: literal, file: relative(root, file) });
        }
    }
}

if (endpoints.length < 80) failures.push('Mapa de contratos: foram encontrados poucos endpoints frontend; verifique varredura de features/*/api');

const productTypes = read('features/produtos/types/produtos.types.ts');
const productSchema = read('features/produtos/schemas/produtosSchemas.ts');
const productDialog = read('features/produtos/components/ProdutoComplementoDialogs.tsx');
const productTests = read('tests/unit/produtosPayload.test.ts');
if (!productTypes.includes('codigoProdutoFornecedor?: string | null')) failures.push('Produtos: request/response deve conhecer codigoProdutoFornecedor');
if (!productSchema.includes('codigoProdutoFornecedor: nullableText')) failures.push('Produtos: schema de vínculo deve validar codigoProdutoFornecedor');
if (!productDialog.includes('Código do produto no fornecedor')) failures.push('Produtos: modal deve exibir label de código do produto no fornecedor');
if (!productDialog.includes('Number(item.status) === EntityStatus.Ativo')) failures.push('Produtos: modal deve listar apenas fornecedores ativos');
if (!productTests.includes('codigoProdutoFornecedor')) failures.push('Produtos: teste de regressão deve validar codigoProdutoFornecedor');
const vincularFornecedorRequestType = productTypes.match(/VincularFornecedorProdutoRequest\s*=\s*{[\s\S]*?};/)?.[0] ?? '';
if (vincularFornecedorRequestType.includes('descricaoFornecedor')) {
    failures.push('Produtos: VincularFornecedorProdutoRequest não deve enviar descricaoFornecedor no payload produtivo');
}

const swaggerFile = process.env.LOGOSOFT_BACKEND_SWAGGER_FILE;
if (swaggerFile) {
    const fullSwaggerPath = join(root, swaggerFile);
    if (!existsSync(fullSwaggerPath)) {
        failures.push(`LOGOSOFT_BACKEND_SWAGGER_FILE aponta para arquivo inexistente: ${swaggerFile}`);
    } else {
        const swagger = JSON.parse(readFileSync(fullSwaggerPath, 'utf8'));
        const swaggerPaths = new Set(Object.keys(swagger.paths ?? {}));
        if (swaggerPaths.size === 0) failures.push(`${swaggerFile}: Swagger sem paths`);
        const literalFrontendPaths = endpoints
            .map((endpoint) => endpoint.path.replace(/\$\{[^}]+\}/g, '{id}'))
            .filter((path) => !path.includes('${definition.endpoint}'));
        const missing = literalFrontendPaths.filter((path) => !swaggerPaths.has(path));
        if (missing.length > 0) {
            failures.push(`${swaggerFile}: ${missing.length} rotas frontend não aparecem no Swagger informado. Primeiras: ${missing.slice(0, 10).join(', ')}`);
        }
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação do mapa de contratos frontend/backend falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

const swaggerMessage = swaggerFile ? `Swagger conferido via ${swaggerFile}` : 'Swagger real não informado; validação executada em modo estrutural/documental.';
process.stdout.write(`Validação do mapa de contratos frontend/backend concluída: ${endpoints.length} endpoints frontend mapeados. ${swaggerMessage}\n`);
