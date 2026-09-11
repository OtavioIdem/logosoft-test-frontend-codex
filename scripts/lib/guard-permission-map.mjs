import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { scanFrontendRoutes, normalizePath, routeKey } from './backend-contract-map.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Módulos que não são segmentos de rota. Mapeiam para o seu módulo dono.
const MODULE_OWNER = {
    'compras-avancado': 'compras',
    'estoque-avancado': 'estoque',
    'financeiro-avancado': 'financeiro',
    'tributacao': 'fiscal',
    'deploy': 'administracao'
};

// Módulos sem página de rota própria e sem proprietário: não entram em C1
// (componentes transversais ou parcialmente cobertos por C4)
const NO_ANALYSIS = new Set(['anexos', 'notificacoes', 'shared']);

// Extrai as operações HTTP do contrato markdown com suas permissões.
// Formato: linhas com `| Permissão | \`X\` |` dentro de blocos de endpoint
export const parseContractOperations = (markdown) => {
    const lines = String(markdown ?? '').split(/\r?\n/);
    const operations = [];
    let currentMethod = null;
    let currentPath = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match endpoint header: ### `GET /api/path`
        const headerMatch = line.match(/^### `(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+([^`]+)`/i);
        if (headerMatch) {
            currentMethod = headerMatch[1].toUpperCase();
            currentPath = normalizePath(headerMatch[2]);

            // Look for permission in following lines (usually next 10 lines)
            let permissionFound = false;
            for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
                const permMatch = lines[j].match(/^\| Permiss[aã]o \| `([^`]+)` \|/);
                if (permMatch) {
                    const permission = permMatch[1];
                    if (permission !== '(sem RequiredPermission)') {
                        operations.push({
                            method: currentMethod,
                            path: currentPath,
                            key: routeKey(currentMethod, currentPath),
                            permission,
                            source: 'contract'
                        });
                    }
                    permissionFound = true;
                    break;
                }
            }
        }
    }

    return operations;
};

// Mapeia operação (method + path) para permissão exigida
export const buildOperationPermissionMap = (contractOperations) => {
    const map = new Map();
    for (const op of contractOperations) {
        map.set(op.key, op.permission);
    }
    return map;
};

// Extrai todos os literais de permissão mencionados em um source
export const extractPermissionLiterals = (source) => {
    const literals = new Set();
    const sourceStr = String(source ?? '');

    // Padrão 1: 'PERMISSAO_CODIGO' ou "PERMISSAO_CODIGO" (em strings literais)
    const stringMatches = [...sourceStr.matchAll(/['"]([A-Z][A-Z0-9_]*(?:_[A-Z0-9]+)*)['\"]/g)];
    for (const match of stringMatches) {
        if (/^[A-Z][A-Z0-9_]*$/.test(match[1]) && match[1].includes('_')) {
            // Filtra falso-positivos comuns que não são PermissionCode
            if (!/^(REACT|TYPESCRIPT|JAVASCRIPT|HTTP|HTML|CSS|JSON|XML|API|URL|REST|GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|REQUEST|RESPONSE|SUCCESS|ERROR|PENDING|ACTIVE|INACTIVE|DRAFT|PUBLISHED|OPEN|CLOSED)/.test(match[1])) {
                literals.add(match[1]);
            }
        }
    }

    // Padrão 2: backtick também para template literals
    const backtickMatches = [...sourceStr.matchAll(/`([A-Z][A-Z0-9_]*(?:_[A-Z0-9]+)*)`/g)];
    for (const match of backtickMatches) {
        if (match[1].includes('_') && !/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/.test(match[1])) {
            literals.add(match[1]);
        }
    }

    // Padrão 3: Em contextos de função como hasPermission(...), PermissionGuard, permission=...
    // Mais específico: busca dentro de parênteses ou após =
    const functionMatches = [...sourceStr.matchAll(/(?:hasPermission|PermissionGuard|permission\s*[:=]|RequiredPermission)\s*\(\s*['"`]?([A-Z][A-Z0-9_]*(?:_[A-Z0-9]+)*)['"`]?\s*\)/g)];
    for (const match of functionMatches) {
        if (match[1] && match[1].includes('_')) literals.add(match[1]);
    }

    // Padrão 4: Em arrays anyOf: ['PERM1', 'PERM2'] ou ["PERM1", "PERM2"]
    const arrayMatches = [...sourceStr.matchAll(/anyOf\s*:\s*\[([^\]]+)\]/g)];
    for (const match of arrayMatches) {
        const itemMatches = [...match[1].matchAll(/['"`]([A-Z][A-Z0-9_]*)['"`]/g)];
        for (const item of itemMatches) {
            if (item[1].includes('_')) literals.add(item[1]);
        }
    }

    // Padrão 5: Permission = 'VALUE' ou "VALUE" (atribuição direta, incluindo JSX)
    const assignMatches = [...sourceStr.matchAll(/Permission\s*[:=]\s*['"`]?([A-Z][A-Z0-9_]*)['"`]?/g)];
    for (const match of assignMatches) {
        if (match[1] && match[1].includes('_')) literals.add(match[1]);
    }

    return literals;
};

// Extrai permissões mencionadas em cada MÓDULO (diretório de feature)
export const buildModulePermissionMap = (root) => {
    const moduleMap = new Map();
    const IGNORED = new Set(['node_modules', '.next', 'coverage', 'test-results', '.git', 'shared', 'notificacoes', 'anexos']);

    const collectFilesInModule = (directory) => {
        if (!existsSync(directory)) return [];
        const files = [];
        try {
            for (const entry of readdirSync(directory)) {
                const path = join(directory, entry);
                const stat = statSync(path);
                if (stat.isDirectory()) {
                    if (!IGNORED.has(entry)) {
                        files.push(...collectFilesInModule(path));
                    }
                } else if (stat.isFile() && (extname(entry) === '.ts' || extname(entry) === '.tsx')) {
                    files.push(path);
                }
            }
        } catch (e) {
            // Permission denied, skip
        }
        return files;
    };

    const featuresPath = join(root, 'features');
    if (existsSync(featuresPath)) {
        try {
            for (const entry of readdirSync(featuresPath)) {
                if (IGNORED.has(entry)) continue;

                const modulePath = join(featuresPath, entry);
                const stat = statSync(modulePath);

                if (!stat.isDirectory()) continue;

                // Coletar todos os arquivos do módulo
                const files = collectFilesInModule(modulePath);
                const allLiterals = new Set();

                for (const file of files) {
                    try {
                        const content = readFileSync(file, 'utf8');
                        const literals = extractPermissionLiterals(content);
                        for (const lit of literals) {
                            allLiterals.add(lit);
                        }
                    } catch (e) {
                        // Skip unreadable files
                    }
                }

                if (allLiterals.size > 0) {
                    // Aplicar MODULE_OWNER: se o módulo tem dono, salvar sob o dono
                    const moduleKey = MODULE_OWNER[entry] || entry;
                    const existing = moduleMap.get(moduleKey) || [];
                    moduleMap.set(moduleKey, [...new Set([...existing, ...allLiterals])].sort());
                }
            }
        } catch (e) {
            // Skip if can't read features
        }
    }

    return moduleMap;
};

// Extrai permissões de cada rota em routePermissions.ts
export const parseRoutePermissions = (source) => {
    const rules = [];
    const lines = String(source ?? '').split(/\r?\n/);

    for (const line of lines) {
        // Match: { pattern: /^\/path(?:\/.*)?$/, anyOf: ['PERM1', 'PERM2'], description: 'desc' }
        const patternMatch = line.match(/pattern:\s*\/\^([^$]+)\$\//);
        const anyOfMatch = line.match(/anyOf:\s*\[(.*?)\]/);
        const descMatch = line.match(/description:\s*'([^']+)'/);

        if (patternMatch && anyOfMatch && descMatch) {
            const pattern = patternMatch[1];
            const permissionsStr = anyOfMatch[1];
            const description = descMatch[1];
            const permissions = [...permissionsStr.matchAll(/'([^']+)'/g)].map(m => m[1]);

            rules.push({
                pattern,
                permissions,
                description
            });
        }
    }

    return rules;
};

// Extrai permissões do menu em AppMenu.tsx
export const parseMenuPermissions = (source) => {
    const result = {
        permissions: new Map(), // rota → permissões
        hierarchy: [] // estrutura de pai-filho
    };

    const lines = String(source ?? '').split(/\r?\n/);
    let currentGroup = null;
    let currentGroupPermissions = [];
    let indentStack = [];

    for (const line of lines) {
        // Match group definition: label: 'Cadastros', anyPermissions: [...]
        const groupMatch = line.match(/label:\s*'([^']+)'[^}]*?anyPermissions:\s*\[(.*?)\]/);
        if (groupMatch) {
            const groupLabel = groupMatch[1];
            const permsStr = groupMatch[2];
            const perms = [...permsStr.matchAll(/'([^']+)'/g)].map(m => m[1]);
            currentGroup = { label: groupLabel, permissions: perms };
            currentGroupPermissions = perms;
            continue;
        }

        // Match item: to: '/rota', anyPermissions: [...]
        const itemMatch = line.match(/to:\s*'([^']+)'[^}]*?anyPermissions:\s*\[(.*?)\]/);
        if (itemMatch) {
            const itemRota = itemMatch[1];
            const permsStr = itemMatch[2];
            const perms = [...permsStr.matchAll(/'([^']+)'/g)].map(m => m[1]);

            if (currentGroup) {
                result.hierarchy.push({
                    type: 'item-in-group',
                    group: currentGroup.label,
                    rota: itemRota,
                    permissions: perms,
                    parentPermissions: currentGroupPermissions
                });
                result.permissions.set(itemRota, perms);
            }
        }
    }

    return result;
};

// Determina o módulo dono de um arquivo
export const determineModuleOwner = (filepath) => {
    // Extrai features/<modulo> ou lib/<modulo>
    const match = filepath.match(/features\/([\w-]+)/) || filepath.match(/lib\/([\w-]+)/);
    if (!match) return null;

    const module = match[1];
    return MODULE_OWNER[module] || module;
};

// Calibração 1: Enriquece as permissões do módulo com as da regra de rota
export const enrichModulePermissionsWithRouteRules = (modulePermissions, routeRules) => {
    const enriched = new Map(modulePermissions);

    for (const rule of routeRules) {
        // rule.pattern é uma string como '/auditoria(?:/.*)?'
        // Extrair o módulo removendo a barra inicial da rota
        let pattern = rule.pattern;
        if (pattern.startsWith('/')) pattern = pattern.slice(1);

        const moduleMatch = pattern.match(/^([a-z0-9-]+)/);
        if (!moduleMatch) continue;

        let moduleName = moduleMatch[1];
        // Aplicar MODULE_OWNER se necessário
        moduleName = MODULE_OWNER[moduleName] || moduleName;

        // Adicionar as permissões da regra apenas ao seu próprio módulo
        const existing = enriched.get(moduleName) || [];
        const merged = [...new Set([...existing, ...rule.permissions])].sort();
        enriched.set(moduleName, merged);
    }

    return enriched;
};

// Calibração 2: Constrói mapa de alcançabilidade (I4)
// Retorna um Set de arquivos alcançáveis a partir das páginas
export const buildReachabilityMap = (root, frontendRoutes) => {
    const ts = require('typescript');
    const reachable = new Set();

    // Encontrar todas as páginas sob app/(main)
    const appPath = join(root, 'app', '(main)');
    const allFiles = new Set();

    const collectFiles = (dir) => {
        if (!existsSync(dir)) return;
        try {
            for (const entry of readdirSync(dir)) {
                const path = join(dir, entry);
                const stat = statSync(path);
                if (stat.isDirectory()) {
                    collectFiles(path);
                } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
                    allFiles.add(relative(root, path).replace(/\\/g, '/'));
                }
            }
        } catch (e) {
            // Skip
        }
    };

    collectFiles(appPath);

    // Construir mapa de importações completo (inclui transitivos de features/)
    const importsOf = new Map();
    const processed = new Set();

    const processFile = (file) => {
        if (processed.has(file)) return;
        processed.add(file);

        const fullPath = join(root, file);
        if (!existsSync(fullPath)) return;

        try {
            const content = readFileSync(fullPath, 'utf8');
            const sf = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true,
                file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

            const imports = new Set();

            const visit = (n) => {
                if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) &&
                    n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
                    const spec = n.moduleSpecifier.text;
                    const resolved = resolveImport(root, file, spec);
                    if (resolved) {
                        imports.add(resolved);
                        // Processar transitivamente
                        processFile(resolved);
                    }
                }
                if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword &&
                    n.arguments[0] && ts.isStringLiteral(n.arguments[0])) {
                    const spec = n.arguments[0].text;
                    const resolved = resolveImport(root, file, spec);
                    if (resolved) {
                        imports.add(resolved);
                        // Processar transitivamente
                        processFile(resolved);
                    }
                }
                ts.forEachChild(n, visit);
            };
            visit(sf);
            importsOf.set(file, imports);
        } catch (e) {
            // Skip
        }
    };

    // Processar todas as páginas e suas importações transitivas
    for (const file of allFiles) {
        processFile(file);
    }

    // Calcular closure transitivo a partir de cada página
    const closure = (entry) => {
        const seen = new Set([entry]);
        const stack = [entry];
        while (stack.length) {
            const current = stack.pop();
            for (const imported of importsOf.get(current) ?? []) {
                if (!seen.has(imported)) {
                    seen.add(imported);
                    stack.push(imported);
                }
            }
        }
        return seen;
    };

    // Encontrar todas as páginas do roteador (incluindo aninhadas)
    const pages = [...allFiles].filter(f => f.includes('(main)') && f.endsWith('page.tsx'));

    // Para cada página, adicionar seus arquivos alcançáveis ao set de alcançáveis
    for (const page of pages) {
        const reachableFromPage = closure(page);
        for (const file of reachableFromPage) {
            reachable.add(file);
        }
    }

    // Também adicionar features/shared pois é transversal (L4)
    const sharedPath = join(root, 'features', 'shared');
    const collectSharedFiles = (dir) => {
        if (!existsSync(dir)) return;
        try {
            for (const entry of readdirSync(dir)) {
                const path = join(dir, entry);
                const stat = statSync(path);
                if (stat.isDirectory()) {
                    collectSharedFiles(path);
                } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
                    reachable.add(relative(root, path).replace(/\\/g, '/'));
                }
            }
        } catch (e) {
            // Skip
        }
    };
    collectSharedFiles(sharedPath);

    return reachable;
};

// Helper para resolver import
const resolveImport = (root, fromFile, spec) => {
    let base;
    const fromDir = relative(root, join(dirname(join(root, fromFile))));

    if (spec.startsWith('@/')) {
        base = spec.slice(2);
    } else if (spec.startsWith('.')) {
        base = relative(root, join(dirname(join(root, fromFile)), spec)).replace(/\\/g, '/');
    } else {
        return null;
    }

    const candidates = [
        base + '.ts',
        base + '.tsx',
        base + '/index.ts',
        base + '/index.tsx'
    ];

    for (const c of candidates) {
        if (existsSync(join(root, c))) {
            // IMPORTANTE: normalizar para barras simples para consistência com allFiles
            return c.replace(/\\/g, '/');
        }
    }

    return null;
};

// Lê e processa todos os insumos (I1-I4)
export const readGuardPermissionMapInputs = (root) => {
    const contractPath = join(root, 'docs/backend-v1.23/CONTRATO-API-v1.23.md');
    const routePermissionsPath = join(root, 'lib/security/routePermissions.ts');
    const appMenuPath = join(root, 'layout/AppMenu.tsx');

    let contractOperations = [];
    if (existsSync(contractPath)) {
        try {
            const contractMd = readFileSync(contractPath, 'utf8');
            contractOperations = parseContractOperations(contractMd);
        } catch (e) {
            throw new Error(`Falha ao ler contrato: ${e.message}`);
        }
    } else {
        throw new Error(`Contrato não encontrado: ${contractPath}`);
    }

    // I1: scanFrontendRoutes (já reutilizado)
    const frontendRoutes = scanFrontendRoutes(root);

    // I2: Mapa de operação → permissão
    const operationPermissionMap = buildOperationPermissionMap(contractOperations);

    // I3: Literais de permissão por MÓDULO (não por arquivo)
    let modulePermissions = buildModulePermissionMap(root);

    // I4: Grafo de módulos (simplificado - verificar features que chamam HTTP)
    const modules = new Set();
    for (const route of frontendRoutes) {
        const module = determineModuleOwner(route.file);
        if (module) modules.add(module);
    }

    // Ler routePermissions e AppMenu
    let routeRules = [];
    let menuData = { permissions: new Map(), hierarchy: [] };

    if (existsSync(routePermissionsPath)) {
        try {
            const routeContent = readFileSync(routePermissionsPath, 'utf8');
            routeRules = parseRoutePermissions(routeContent);
        } catch (e) {
            throw new Error(`Falha ao ler routePermissions: ${e.message}`);
        }
    }

    if (existsSync(appMenuPath)) {
        try {
            const menuContent = readFileSync(appMenuPath, 'utf8');
            menuData = parseMenuPermissions(menuContent);
        } catch (e) {
            throw new Error(`Falha ao ler AppMenu: ${e.message}`);
        }
    }

    // Calibração 1: Enriquecer permissões dos módulos com permissões das regras de rota
    modulePermissions = enrichModulePermissionsWithRouteRules(modulePermissions, routeRules);

    // Calibração 2: Construir mapa de alcançabilidade (I4)
    const reachabilityMap = buildReachabilityMap(root, frontendRoutes);

    return {
        frontendRoutes, // I1
        operationPermissionMap, // I2
        modulePermissions, // I3 (enriquecido com regras de rota)
        modules, // I4
        routeRules,
        menuData,
        contractOperations,
        reachabilityMap // Para filtro de alcançabilidade
    };
};

// Analisa divergências: chamada HTTP que o módulo faz mas não declara a permissão
export const analyzeGuardDivergences = ({ frontendRoutes, operationPermissionMap, modulePermissions, modules, routeRules, menuData, reachabilityMap }) => {
    const divergences = {
        chamadaSemGuard: [], // Módulo chama HTTP mas não declara permissão
        menuHierarquia: [], // Pai de menu sem permissão de filho
        menuSemRegra: [], // Menu oferece rota que routePermissions não cobre
        menuForaDaRegra: [], // Menu oferece rota que routePermissions cobre mas com permissão diferente
        catalogoGenerico: [] // erpFeatureCatalog com divergência de permissão
    };

    // C1: Chamadas HTTP sem guard
    for (const route of frontendRoutes) {
        const key = route.key;
        const requiredPermission = operationPermissionMap.get(key);

        if (!requiredPermission) continue; // Operação sem RequiredPermission no contrato

        const moduleOwner = determineModuleOwner(route.file);
        if (!moduleOwner) continue;

        // Ignorar módulos sem página de rota própria que não têm proprietário (L4)
        if (NO_ANALYSIS.has(moduleOwner)) continue;

        // Calibração 2: Filtro de alcançabilidade DESABILITADO
        // Motivo: o filtro estava eliminando divergências legítimas junto com órfãs.
        // As órfãs serão registradas nominalmente na allowlist com teto específico.
        // if (reachabilityMap && !reachabilityMap.has(route.file.replace(/\\/g, '/'))) {
        //     continue; // Arquivo órfã, não alcançável
        // }

        const moduleDeclares = modulePermissions.get(moduleOwner) || [];
        if (!moduleDeclares.includes(requiredPermission)) {
            divergences.chamadaSemGuard.push({
                file: route.file,
                method: route.method,
                path: route.path,
                line: route.line,
                requiredPermission,
                module: moduleOwner
            });
        }
    }

    // C2: Hierarquia de menu (pai sem permissão de filho)
    for (const item of menuData.hierarchy) {
        if (item.type === 'item-in-group') {
            const parentPerms = new Set(item.parentPermissions);
            for (const itemPerm of item.permissions) {
                if (!parentPerms.has(itemPerm)) {
                    divergences.menuHierarquia.push({
                        group: item.group,
                        rota: item.rota,
                        permission: itemPerm,
                        id: `menu-${item.group}-${itemPerm}`
                    });
                }
            }
        }
    }

    // C3: Menu vs Route Rules
    for (const [rota, perms] of menuData.permissions) {
        let foundRule = false;
        let rulePerms = null;

        for (const rule of routeRules) {
            // Simple pattern match (não é perfeito, mas suficiente para análise)
            if (rota.startsWith(rule.pattern.split('(?')[0] + '/')) {
                foundRule = true;
                rulePerms = new Set(rule.permissions);
                break;
            }
        }

        if (!foundRule && rota !== '/dashboard') {
            divergences.menuSemRegra.push({
                rota,
                permissions: perms,
                id: `menu-sem-regra-${rota}`
            });
        } else if (foundRule && rulePerms) {
            for (const perm of perms) {
                if (!rulePerms.has(perm)) {
                    divergences.menuForaDaRegra.push({
                        rota,
                        permission: perm,
                        rulePerm: [...rulePerms],
                        id: `menu-fora-regra-${rota}-${perm}`
                    });
                }
            }
        }
    }

    // C4: Catálogo genérico (erpFeatureCatalog)
    // Verificar divergências conhecidas
    const catalogPath = join(process.cwd(), 'features/shared/config/erpFeatureCatalog.ts');
    if (existsSync(catalogPath)) {
        try {
            const catalogContent = readFileSync(catalogPath, 'utf8');
            // Verificar 'seguranca-grupos' em específico
            if (catalogContent.includes("'seguranca-grupos'")) {
                const match = catalogContent.match(/'seguranca-grupos'[^}]*?viewPermission:\s*'([^']+)'[^}]*?managePermission:\s*'([^']+)'/);
                if (match) {
                    const viewPerm = match[1];
                    const managePerm = match[2];
                    // O contrato espera SEGURANCA_GRUPOS_ACESSO_*, mas o catálogo tem SEGURANCA_PERMISSOES_*
                    if (viewPerm === 'SEGURANCA_PERMISSOES_GERENCIAR' || managePerm === 'SEGURANCA_PERMISSOES_GERENCIAR') {
                        divergences.catalogoGenerico.push({
                            resource: 'seguranca-grupos',
                            endpoint: '/api/seguranca/grupos-acesso',
                            declaredPermission: 'SEGURANCA_PERMISSOES_GERENCIAR',
                            contractPermission: 'SEGURANCA_GRUPOS_ACESSO_CONSULTAR / SEGURANCA_GRUPOS_ACESSO_GERENCIAR',
                            id: 'GC-01'
                        });
                    }
                }
            }
        } catch (e) {
            // Skip if can't read
        }
    }

    return divergences;
};

// Verifica se existe um módulo novo sem proprietário declarado
export const checkMissingModuleOwnership = (root) => {
    const featuresPath = join(root, 'features');
    const issues = [];

    if (!existsSync(featuresPath)) return issues;

    try {
        for (const entry of readdirSync(featuresPath)) {
            const path = join(featuresPath, entry);
            const stat = statSync(path);

            if (!stat.isDirectory()) continue;

            // Verificar se é segmento de rota ou tem dono
            const isRouteSegment = entry.match(/^(pessoas|clientes|fornecedores|produtos|estoque|vendas|financeiro|compras|fiscal|administracao|seguranca|auditoria|etc|pdv|faturamento|servicos|frota|portaria|alimentar|rh|qualidade|producao|contratos|crm|contabil|patrimonio|bancos|atividades|relatorios|notificacoes|anexos|shared)/) !== null;
            const hasOwner = MODULE_OWNER.hasOwnProperty(entry);

            if (!isRouteSegment && !hasOwner) {
                // Verificar se tem chamadas HTTP
                const dirPath = join(path);
                const files = readdirSync(dirPath).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

                for (const file of files) {
                    try {
                        const content = readFileSync(join(dirPath, file), 'utf8');
                        if (content.includes('/api/')) {
                            issues.push({
                                module: entry,
                                file,
                                reason: 'features/' + entry + ' não é segmento de rota nem tem dono declarado'
                            });
                            break;
                        }
                    } catch (e) {
                        // Skip
                    }
                }
            }
        }
    } catch (e) {
        // Skip if can't read
    }

    return issues;
};
