import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Sentinelas de bypass: não são PermissionCode do union (types/erp.ts) por
// desenho — ver lib/permissions/permissions.ts (NON_BYPASS_PERMISSION_CODES
// e o cast `'*' as PermissionCode`). Vazar para o union é fantasma, não
// cobertura: um guard nunca pode exigir a sentinela.
export const SENTINELAS = new Set(['MASTER_GOD', '*']);

// Extrai os literais do union `export type PermissionCode = 'A' | 'B' | ...;`
// de types/erp.ts. Preserva a ordem de declaração; não deduplica (duplicata é
// responsabilidade de quem valida, não de quem lê).
export const parsePermissionUnion = (source) => {
    const match = String(source ?? '').match(/export type PermissionCode =([\s\S]*?);/);
    if (!match) return [];
    return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
};

// Extrai as chaves de nível superior de
// `export const PERMISSOES_CATALOGO: Record<PermissionCode, PermissaoCatalogoItem> = { ... };`
// em features/seguranca/permissoesCatalogo.ts.
export const parsePermissionCatalog = (source) => {
    const match = String(source ?? '').match(/PERMISSOES_CATALOGO[^=]*=\s*\{([\s\S]*?)\n\};/);
    if (!match) return [];
    return [...match[1].matchAll(/^\s*([A-Z][A-Z0-9_]*):\s*\{/gm)].map((item) => item[1]);
};

// Extrai as permissões nomeadas anexadas a cada operação HTTP de
// docs/backend-v1.23/CONTRATO-API-v1.23.md (linhas `| Permissão | \`X\` |`)
// e o total declarado na tabela "Números" do próprio documento
// (`| Permissões no backend | **178** (mais MASTER_GOD e *) |`).
export const parseContractPermissions = (markdown) => {
    const lines = String(markdown ?? '').split(/\r?\n/);
    const permissions = new Set();
    let semRequiredPermissionCount = 0;
    for (const line of lines) {
        const match = line.match(/^\| Permiss[aã]o \| `([^`]+)` \|/);
        if (!match) continue;
        if (match[1] === '(sem RequiredPermission)') {
            semRequiredPermissionCount += 1;
            continue;
        }
        permissions.add(match[1]);
    }
    const declaredMatch = String(markdown ?? '').match(/no backend \| \*\*(\d+)\*\*/);
    const declaredTotal = declaredMatch ? Number(declaredMatch[1]) : null;
    return { permissions: [...permissions].sort(), semRequiredPermissionCount, declaredTotal };
};

// Extrai a tabela `Constante C# → Código` da seção "## 12. Catálogo de
// permissões" de docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md — o catálogo real,
// que o contrato v1.23 não tem (só permissões anexadas a operações).
export const parseCatalogSection = (markdown) => {
    const lines = String(markdown ?? '').split(/\r?\n/);
    const startIndex = lines.findIndex((line) => line.startsWith('## 12. Catálogo de permissões'));
    if (startIndex < 0) return { rows: [] };
    let endIndex = lines.findIndex((line, index) => index > startIndex && /^## \d+\./.test(line));
    if (endIndex < 0) endIndex = lines.length;
    const rows = [];
    for (const line of lines.slice(startIndex, endIndex)) {
        const match = line.match(/^\| `([^`]+)` \| `([^`]+)` \|/);
        if (match) rows.push({ csharp: match[1], code: match[2] });
    }
    return { rows };
};

// Lê as quatro fontes documentais/fonte-de-verdade usadas por gerador, gate
// e testes — um único lugar que sabe onde cada arquivo mora.
export const readPermissionInputs = (root, overrides = {}) => {
    const erpTypesPath = overrides.erpTypesPath ?? join(root, 'types/erp.ts');
    const catalogPath = overrides.catalogPath ?? join(root, 'features/seguranca/permissoesCatalogo.ts');
    const contractPath = overrides.contractPath ?? join(root, 'docs/backend-v1.23/CONTRATO-API-v1.23.md');
    const canonicalPath = overrides.canonicalPath ?? join(root, 'docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md');
    const union = parsePermissionUnion(readFileSync(erpTypesPath, 'utf8'));
    const catalog = parsePermissionCatalog(readFileSync(catalogPath, 'utf8'));
    const contract = parseContractPermissions(readFileSync(contractPath, 'utf8'));
    const catalogSection = parseCatalogSection(readFileSync(canonicalPath, 'utf8'));
    return { union, catalog, contract, catalogSection };
};

// Constrói o snapshot auditável (schemaVersion 2): a união nomeada das duas
// fontes documentais, mais as sentinelas. `generatedAt` é derivado
// deterministicamente de `sourceDate` (não do relógio da máquina) para que a
// geração seja idempotente: rodar duas vezes sem mudança de fonte produz
// bytes idênticos, sem diff espúrio de timestamp.
export const buildSnapshot = ({ contract, catalogSection, version, sourceDate }) => {
    const catalogNamed = [...new Set(catalogSection.rows.map((row) => row.code).filter((code) => !SENTINELAS.has(code)))];
    const contractNamed = [...new Set(contract.permissions.filter((code) => !SENTINELAS.has(code)))];
    const namedUnion = [...new Set([...catalogNamed, ...contractNamed])];
    const novasEmV123 = contractNamed.filter((code) => !catalogNamed.includes(code)).sort();
    const semOperacaoEmV123 = catalogNamed.filter((code) => !contractNamed.includes(code)).sort();
    const sentinelsList = [...SENTINELAS].sort();
    const permissions = [...namedUnion, ...sentinelsList].sort();
    const backendDeclaradas = contract.declaredTotal;
    // Diferença com sinal: declarado − união nomeada.
    //   > 0  o backend declara mais permissões do que as nomeadas (sobram sem nome);
    //   = 0  bate;
    //   < 0  a união nomeada EXCEDE a foto do contrato v1.23 (o catálogo §12 recebeu
    //        permissões depois da foto). Antes isso era truncado em 0 por Math.max e
    //        o snapshot mentia "Sem divergência".
    const naoConciliadoQuantidade = typeof backendDeclaradas === 'number' ? backendDeclaradas - namedUnion.length : 0;
    const motivoNaoConciliado = (() => {
        if (naoConciliadoQuantidade === 0) {
            return 'Sem divergência: o total declarado pelo backend bate com a união nomeada medida entre as duas fontes documentais.';
        }
        if (naoConciliadoQuantidade > 0) {
            return `O contrato declara ${backendDeclaradas} permissões nomeadas (docs/backend-v1.23/CONTRATO-API-v1.23.md, seção "Números"), mas a união nomeada medida entre as ${contractNamed.length} nomeadas em operações do contrato v1.23 e as ${catalogNamed.length} nomeadas no catálogo §12 de docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md resulta em ${namedUnion.length}. Fica ${naoConciliadoQuantidade} permissão(ões) sem nome: não aparece(m) em nenhuma operação do contrato v1.23 nem no catálogo §12, e não há fonte documental para nomeá-la(s) — não foi(ram) inventada(s).`;
        }
        // União excede o declarado: N = contractNamed + |semOperacaoEmV123| e a foto
        // tem (declarado − contractNamed) vagas sem nome. As permissões do §12 sem
        // operação em v1.23 ocupam essas vagas e sobra o excesso. A foto não diz
        // QUAL delas sobra, então a lista é nominal e não se atribui sobra a nenhuma.
        const excesso = -naoConciliadoQuantidade;
        const vagasNaFoto = backendDeclaradas - contractNamed.length;
        return `O contrato declara ${backendDeclaradas} permissões nomeadas (docs/backend-v1.23/CONTRATO-API-v1.23.md, seção "Números"), mas a união nomeada medida resulta em ${namedUnion.length}: ${contractNamed.length} nomeadas em operações do contrato v1.23 mais ${semOperacaoEmV123.length} nomeadas só no catálogo §12 de docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md. A união EXCEDE em ${excesso} o total declarado pela foto do contrato v1.23 (${backendDeclaradas}), porque o catálogo §12 recebeu permissões depois dessa foto. A foto deixa ${vagasNaFoto} vaga(s) sem nome; as ${semOperacaoEmV123.length} permissões do §12 ausentes das operações do v1.23 (${semOperacaoEmV123.join(', ')}) ocupam essas vagas e sobram ${excesso}. Quantidade negativa (${naoConciliadoQuantidade}) registra o excesso; nenhuma permissão foi removida nem inventada.`;
    })();
    const naoConciliado = {
        quantidade: naoConciliadoQuantidade,
        motivo: motivoNaoConciliado
    };
    return {
        schemaVersion: 2,
        version,
        sources: [
            { document: 'docs/backend-v1.23/CONTRATO-API-v1.23.md', section: 'linhas `| Permissão | `X` |` de cada uma das 579 operações' },
            { document: 'docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md', section: '## 12. Catálogo de permissões' }
        ],
        sourceDate,
        generatedAt: `${sourceDate}T00:00:00-03:00`,
        count: permissions.length,
        sentinels: sentinelsList,
        novasEmV123,
        semOperacaoEmV123,
        backendDeclaradas,
        naoConciliado,
        permissions
    };
};

// Compara o union `PermissionCode` (types/erp.ts) contra o snapshot
// auditável, nas duas direções, mais o cruzamento union × catálogo do
// frontend (features/seguranca/permissoesCatalogo.ts).
export const comparePermissions = ({ unionCodes, catalogCodes, snapshotPermissions, sentinels = SENTINELAS }) => {
    const unionSet = new Set(unionCodes);
    const catalogSet = new Set(catalogCodes);
    const snapshotSet = new Set(snapshotPermissions);
    const unionNamed = unionCodes.filter((code) => !sentinels.has(code));
    const fantasmas = [...new Set(unionNamed.filter((code) => !snapshotSet.has(code)))].sort();
    const coberturaPendente = [...new Set(snapshotPermissions.filter((code) => !sentinels.has(code) && !unionSet.has(code)))].sort();
    const sentinelaNoUnion = [...sentinels].filter((sentinela) => unionSet.has(sentinela)).sort();
    const catalogoSemUnion = catalogCodes.filter((code) => !unionSet.has(code)).sort();
    const unionSemCatalogo = unionNamed.filter((code) => !catalogSet.has(code)).sort();
    return { fantasmas, coberturaPendente, sentinelaNoUnion, catalogoSemUnion, unionSemCatalogo };
};

// Validação estrutural da allowlist (scripts/backend-permissions.allowlist.json)
// — mesmo espírito de validateAuditAllowlist em backend-contract-map.mjs,
// adaptado ao formato de registro fechado e monotônico desta allowlist.
export const validatePermissionsAllowlist = (allowlist, { version, snapshotDocument, now = new Date() }) => {
    const failures = [];
    if (!allowlist || typeof allowlist !== 'object') return ['allowlist ausente ou inválida'];
    if (allowlist.schemaVersion !== 1) failures.push('schemaVersion deve ser 1');
    if (allowlist.version !== version) failures.push(`version deve ser ${version}`);
    if (allowlist.status !== 'registro-fechado-monotonico') failures.push('status deve ser "registro-fechado-monotonico"');
    if (allowlist.snapshotDocument !== snapshotDocument) failures.push(`snapshotDocument deve apontar para ${snapshotDocument}`);
    for (const field of ['owner', 'expiresAt', 'sourceContract', 'target']) {
        if (!allowlist.auditPolicy?.[field]) failures.push(`auditPolicy sem campo obrigatório ${field}`);
    }
    const expiresAt = Date.parse(allowlist.auditPolicy?.expiresAt ?? '');
    if (Number.isNaN(expiresAt)) failures.push('auditPolicy.expiresAt inválido');
    else if (expiresAt < now.getTime()) failures.push(`auditPolicy expirado em ${allowlist.auditPolicy.expiresAt}`);
    if (!Array.isArray(allowlist.suppressions) || allowlist.suppressions.length !== 0) failures.push('divergências de permissão não podem ser suprimidas');
    if (!allowlist.teto || typeof allowlist.teto.fantasmas !== 'number' || typeof allowlist.teto.coberturaPendente !== 'number') {
        failures.push('teto deve declarar fantasmas e coberturaPendente numéricos');
    }
    if (!Array.isArray(allowlist.fantasmasConhecidos)) failures.push('fantasmasConhecidos deve ser uma lista');
    if (!Array.isArray(allowlist.coberturaPendente)) failures.push('coberturaPendente deve ser uma lista');
    const ids = new Set();
    for (const item of allowlist.fantasmasConhecidos ?? []) {
        for (const field of ['id', 'code', 'usos', 'backend', 'impacto', 'decision', 'target']) {
            if (!item[field] || (Array.isArray(item[field]) && item[field].length === 0)) failures.push(`fantasma sem campo obrigatório ${field}: ${item.id ?? item.code ?? '(sem id)'}`);
        }
        if (ids.has(item.id)) failures.push(`id duplicado em fantasmasConhecidos: ${item.id}`);
        ids.add(item.id);
        if (item.suppress === true || item.allow === true || item.ignore === true) failures.push(`fantasma ${item.id} tenta suprimir divergência`);
    }
    const coberturaIds = new Set();
    for (const item of allowlist.coberturaPendente ?? []) {
        for (const field of ['id', 'code', 'backendOperacoes', 'decision', 'target']) {
            if (!item[field] || (Array.isArray(item[field]) && item[field].length === 0)) failures.push(`cobertura pendente sem campo obrigatório ${field}: ${item.id ?? item.code ?? '(sem id)'}`);
        }
        if (coberturaIds.has(item.id)) failures.push(`id duplicado em coberturaPendente: ${item.id}`);
        coberturaIds.add(item.id);
        if (item.suppress === true || item.allow === true || item.ignore === true) failures.push(`cobertura pendente ${item.id} tenta suprimir divergência`);
    }
    return failures;
};
