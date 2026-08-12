import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options']);
const IGNORED_DIRECTORIES = new Set(['node_modules', '.next', 'coverage', 'test-results', 'playwright-report']);

const displayName = (node) => {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
    if (ts.isPropertyAccessExpression(node)) return `${displayName(node.expression)}.${node.name.text}`;
    return '';
};

export const normalizePath = (path) => {
    let normalized = String(path ?? '').trim();
    normalized = normalized.replace(/^https?:\/\/[^/]+/i, '');
    normalized = normalized.split('?')[0].split('#')[0];
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    normalized = normalized.replace(/\/+/g, '/');
    normalized = normalized.replace(/\{[^}]+\}/g, '{param}');
    normalized = normalized.replace(/\/$/, '');
    return normalized || '/';
};

export const routeKey = (method, path) => `${String(method).toUpperCase()} ${normalizePath(path)}`;

export const parseBackendCatalog = (markdown) => {
    const routes = [];
    let base = '';
    const lines = String(markdown ?? '').split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const heading = lines[index].match(/^###\s+`([^`]+)`/);
        if (heading) {
            base = heading[1].trim();
            continue;
        }
        const row = lines[index].match(/^\|\s*`(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)`\s*\|\s*`([^`]+)`/i);
        if (!row || !base) continue;
        const method = row[1].toUpperCase();
        const relativePath = row[2].trim();
        const fullPath = relativePath === '/' ? base : `${base.replace(/\/$/, '')}/${relativePath.replace(/^\//, '')}`;
        routes.push({ method, path: normalizePath(fullPath), key: routeKey(method, fullPath), source: `catalog:${index + 1}` });
    }
    return routes;
};

const collectFiles = (directory) => {
    const files = [];
    if (!existsSync(directory)) return files;
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            if (!IGNORED_DIRECTORIES.has(entry)) files.push(...collectFiles(path));
        } else if (stat.isFile() && (extname(entry) === '.ts' || extname(entry) === '.tsx')) {
            files.push(path);
        }
    }
    return files;
};

const getPropertyName = (name) => ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : '';

const createResolver = (sourceFiles) => {
    const declarations = new Map();
    const objects = new Map();
    for (const source of sourceFiles) {
        const visit = (node) => {
            if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
                const values = declarations.get(node.name.text) ?? [];
                values.push({ initializer: node.initializer, fileName: source.fileName });
                declarations.set(node.name.text, values);
            }
            if (ts.isPropertyAssignment(node)) {
                const name = getPropertyName(node.name);
                if (name === 'endpoint' && node.initializer) {
                    objects.set(node, node.initializer);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }

    const resolve = (node, seen = new Set(), contextFile = node?.getSourceFile?.().fileName) => {
        if (!node) return { value: '', unresolved: true, expressions: [] };
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { value: node.text, unresolved: false, expressions: [] };
        if (ts.isIdentifier(node)) {
            if (seen.has(node.text) || !declarations.has(node.text)) {
                const isRouteParameter = /id$/i.test(node.text);
                return { value: '{param}', unresolved: !isRouteParameter, expressions: [node.text] };
            }
            const nextSeen = new Set(seen);
            nextSeen.add(node.text);
            const candidates = declarations.get(node.text);
            const declaration = candidates.find((item) => item.fileName === contextFile);
            if (!declaration) {
                const isRouteParameter = /id$/i.test(node.text);
                return { value: '{param}', unresolved: !isRouteParameter, expressions: [node.text] };
            }
            return resolve(declaration.initializer, nextSeen, declaration.fileName);
        }
        if (ts.isTemplateExpression(node)) {
            let result = node.head.text;
            let unresolved = false;
            const expressions = [];
            for (const span of node.templateSpans) {
                const resolved = resolve(span.expression, seen, contextFile);
                result += resolved.unresolved ? resolved.value : resolved.value;
                result += span.literal.text;
                unresolved ||= resolved.unresolved;
                expressions.push(...resolved.expressions);
            }
            return { value: result, unresolved, expressions };
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind !== ts.SyntaxKind.PlusToken) {
            return { value: '{param}', unresolved: /acao|action|status/i.test(node.getText()), expressions: [node.getText()] };
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
            const left = resolve(node.left, seen, contextFile);
            const right = resolve(node.right, seen, contextFile);
            return { value: `${left.value}${right.value}`, unresolved: left.unresolved || right.unresolved, expressions: [...left.expressions, ...right.expressions] };
        }
        if (ts.isParenthesizedExpression(node)) return resolve(node.expression, seen, contextFile);
        if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node)) return resolve(node.expression, seen, contextFile);
        if (ts.isCallExpression(node)) return { value: '{param}', unresolved: false, expressions: [node.getText()] };
        if (ts.isPropertyAccessExpression(node)) {
            const objectName = displayName(node.expression);
            const objectDeclarations = declarations.get(objectName) ?? [];
            const objectDeclaration = objectDeclarations.find((item) => item.fileName === contextFile)?.initializer ?? objectDeclarations[0]?.initializer;
            if (objectDeclaration && ts.isObjectLiteralExpression(objectDeclaration)) {
                const property = objectDeclaration.properties.find((item) => ts.isPropertyAssignment(item) && getPropertyName(item.name) === node.name.text);
                if (property) return resolve(property.initializer, seen, contextFile);
            }
            if (/Id$/i.test(node.name.text)) return { value: '{param}', unresolved: false, expressions: [node.getText()] };
            return { value: '{param}', unresolved: true, expressions: [node.getText()] };
        }
        return { value: '{param}', unresolved: true, expressions: [node.getText()] };
    };
    return { resolve, declarations, objects };
};

const addEndpoint = (endpoints, method, resolution, file, node, kind = 'http') => {
    const path = resolution.value;
    if (!path.includes('/api/')) return;
    endpoints.push({ method: method.toUpperCase(), path: normalizePath(path), key: routeKey(method, path), file, line: node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1, unresolved: resolution.unresolved, expressions: resolution.expressions, kind });
};

const scanResourceDefinitions = (source, resolver, endpoints, file) => {
    const visit = (node) => {
        if (ts.isPropertyAssignment(node) && getPropertyName(node.name) === 'endpoint') {
            const endpoint = resolver.resolve(node.initializer);
            if (endpoint.value.includes('/api/')) {
                addEndpoint(endpoints, 'GET', endpoint, file, node, 'resource-definition');
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
};

export const scanFrontendRoutes = (root) => {
    const sourcePaths = [...collectFiles(join(root, 'features')), ...collectFiles(join(root, 'lib'))];
    const sourceFiles = sourcePaths.map((path) => ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS));
    const resolver = createResolver(sourceFiles);
    const endpoints = [];
    for (const source of sourceFiles) {
        const file = relative(root, source.fileName).replaceAll('\\', '/');
        const visit = (node) => {
            if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'safeGet' && node.arguments.length >= 2) {
                addEndpoint(endpoints, 'GET', resolver.resolve(node.arguments[1]), file, node, 'safeGet-wrapper');
            }
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
                const method = node.expression.name.text.toLowerCase();
                const receiver = displayName(node.expression.expression);
                if (HTTP_METHODS.has(method) && (receiver === 'httpClient' || receiver === 'rawHttpClient')) {
                    const resolution = resolver.resolve(node.arguments[0]);
                    addEndpoint(endpoints, method, resolution, file, node);
                }
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
        if (file.includes('features/shared/config/erpFeatureCatalog.')) scanResourceDefinitions(source, resolver, endpoints, file);
    }
    return endpoints;
};

export const compareContractMap = (frontendRoutes, backendRoutes) => {
    const backendKeys = new Set(backendRoutes.map((route) => route.key ?? routeKey(route.method, route.path)));
    const backendPaths = new Map();
    for (const route of backendRoutes) {
        const path = normalizePath(route.path);
        const methods = backendPaths.get(path) ?? new Set();
        methods.add(String(route.method).toUpperCase());
        backendPaths.set(path, methods);
    }
    const grouped = new Map();
    for (const route of frontendRoutes) {
        const key = route.key ?? routeKey(route.method, route.path);
        if (!grouped.has(key)) grouped.set(key, { ...route, key, occurrences: [] });
        grouped.get(key).occurrences.push(route);
    }
    const unresolved = frontendRoutes.filter((route) => route.unresolved);
    const incompatible = [...grouped.values()].filter((route) => !backendKeys.has(route.key));
    const methodMismatch = incompatible
        .filter((route) => backendPaths.has(route.path))
        .map((route) => ({ ...route, backendMethods: [...backendPaths.get(route.path)] }));
    const missing = incompatible.filter((route) => !backendPaths.has(route.path));
    const indirectMissing = incompatible.filter((route) => route.kind === 'resource-definition');
    const matched = [...grouped.values()].filter((route) => backendKeys.has(route.key));
    return { incompatible, missing, methodMismatch, indirectMissing, matched, unresolved, backendOnly: backendRoutes.filter((route) => !new Set(frontendRoutes.map((item) => item.key)).has(route.key)) };
};

export const validateAuditAllowlist = (allowlist, { version, contractDocument, now = new Date() }) => {
    const failures = [];
    if (!allowlist || typeof allowlist !== 'object') return ['allowlist ausente ou inválida'];
    if (allowlist.schemaVersion !== 1) failures.push('schemaVersion deve ser 1');
    if (allowlist.version !== version) failures.push(`version deve ser ${version}`);
    if (allowlist.contractDocument !== contractDocument) failures.push(`contractDocument deve apontar para ${contractDocument}`);
    for (const field of ['owner', 'expiresAt', 'sourceContract']) {
        if (!allowlist.auditPolicy?.[field]) failures.push(`auditPolicy sem campo obrigatório ${field}`);
    }
    const expiresAt = Date.parse(allowlist.auditPolicy?.expiresAt ?? '');
    if (Number.isNaN(expiresAt)) failures.push('auditPolicy.expiresAt inválido');
    else if (expiresAt < now.getTime()) failures.push(`auditPolicy expirado em ${allowlist.auditPolicy.expiresAt}`);
    if (!Array.isArray(allowlist.suppressions) || allowlist.suppressions.length !== 0) failures.push('divergências produtivas não podem ser suprimidas');
    if (!Array.isArray(allowlist.documentedDivergences)) failures.push('documentedDivergences deve ser uma lista');
    const ids = new Set();
    const keys = new Set();
    for (const item of allowlist.documentedDivergences ?? []) {
        for (const field of ['id', 'method', 'path', 'source', 'backend', 'status', 'decision', 'target']) {
            if (!item[field]) failures.push(`divergência sem campo obrigatório ${field}`);
        }
        const key = routeKey(item.method, item.path);
        if (ids.has(item.id)) failures.push(`id duplicado ${item.id}`);
        if (keys.has(key)) failures.push(`rota duplicada ${key}`);
        ids.add(item.id);
        keys.add(key);
        if (item.suppress === true || item.allow === true || item.ignore === true) failures.push(`item ${item.id} tenta suprimir incompatibilidade`);
    }
    return failures;
};

export const readContractMapInputs = (root, document = 'docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md') => {
    const backendRoutes = parseBackendCatalog(readFileSync(join(root, document), 'utf8'));
    const frontendRoutes = scanFrontendRoutes(root);
    return { backendRoutes, frontendRoutes, comparison: compareContractMap(frontendRoutes, backendRoutes) };
};
