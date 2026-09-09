import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    SENTINELAS,
    buildSnapshot,
    comparePermissions,
    readPermissionInputs,
    validatePermissionsAllowlist
} from './lib/backend-permissions.mjs';

const root = process.cwd();
const failures = [];
const reportOnly = process.argv.includes('--report');
const read = (path) => readFileSync(join(root, path), 'utf8');
const fail = (message) => failures.push(message);

const snapshotPath = 'scripts/backend-permissions.snapshot.json';
const allowlistPath = 'scripts/backend-permissions.allowlist.json';
const erpTypesPath = 'types/erp.ts';
const catalogPath = 'features/seguranca/permissoesCatalogo.ts';

if (!existsSync(join(root, snapshotPath))) fail(`${snapshotPath}: snapshot auditável ausente`);
if (!existsSync(join(root, allowlistPath))) fail(`${allowlistPath}: allowlist auditável ausente`);

const packageJson = JSON.parse(read('package.json'));
const logosoftVersion = packageJson.logosoftVersion;

let snapshot = null;
if (existsSync(join(root, snapshotPath))) {
    try {
        snapshot = JSON.parse(read(snapshotPath));
    } catch (error) {
        fail(`${snapshotPath}: JSON inválido (${error.message})`);
    }
}

let allowlist = null;
if (existsSync(join(root, allowlistPath))) {
    try {
        allowlist = JSON.parse(read(allowlistPath));
    } catch (error) {
        fail(`${allowlistPath}: JSON inválido (${error.message})`);
    }
}

// 1) Estrutura do snapshot: schemaVersion, version, count coerente, ordenado
// e sem duplicata.
if (snapshot) {
    if (snapshot.schemaVersion !== 2) fail(`${snapshotPath}: schemaVersion deve ser 2`);
    if (snapshot.version !== logosoftVersion) fail(`${snapshotPath}: version deve ser ${logosoftVersion}`);
    if (!Array.isArray(snapshot.permissions)) fail(`${snapshotPath}: permissions deve ser uma lista`);
    else {
        if (snapshot.count !== snapshot.permissions.length) fail(`${snapshotPath}: count (${snapshot.count}) deve ser igual a permissions.length (${snapshot.permissions.length})`);
        const sorted = [...snapshot.permissions].sort();
        if (JSON.stringify(sorted) !== JSON.stringify(snapshot.permissions)) fail(`${snapshotPath}: permissions deve estar ordenado alfabeticamente — o script não pode ser editado à mão`);
        const unique = new Set(snapshot.permissions);
        if (unique.size !== snapshot.permissions.length) fail(`${snapshotPath}: permissions contém duplicata`);
    }
}

// 2) Snapshot honesto: re-derivar das duas fontes documentais e reprovar se
// divergir do arquivo commitado — o snapshot não pode ser editado à mão.
let inputs = null;
if (existsSync(join(root, erpTypesPath)) && existsSync(join(root, catalogPath))) {
    try {
        inputs = readPermissionInputs(root);
    } catch (error) {
        fail(`falha ao ler as fontes documentais de permissões: ${error.message}`);
    }
}

if (snapshot && inputs) {
    const rebuilt = buildSnapshot({ contract: inputs.contract, catalogSection: inputs.catalogSection, version: snapshot.version, sourceDate: snapshot.sourceDate });
    if (JSON.stringify(rebuilt) !== JSON.stringify(snapshot)) {
        fail(`${snapshotPath}: divergente das fontes documentais (docs/backend-v1.23/CONTRATO-API-v1.23.md + docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md §12) — rode "npm run generate:backend-permissions-snapshot" e commite o resultado`);
    }
}

// 3) Sentinelas presentes no snapshot e ausentes do union e do catálogo do
// frontend. Sentinela vazando para o union é fantasma.
if (snapshot) {
    for (const sentinela of SENTINELAS) {
        if (!snapshot.permissions?.includes(sentinela)) fail(`${snapshotPath}: sentinela ${sentinela} ausente do snapshot`);
    }
}

if (inputs) {
    const sentinelaNoUnion = [...SENTINELAS].filter((sentinela) => inputs.union.includes(sentinela));
    for (const sentinela of sentinelaNoUnion) fail(`types/erp.ts: sentinela ${sentinela} não pode estar no union PermissionCode (é bypass, não permissão guardável — ver lib/permissions/permissions.ts)`);
    const sentinelaNoCatalogo = [...SENTINELAS].filter((sentinela) => inputs.catalog.includes(sentinela));
    for (const sentinela of sentinelaNoCatalogo) fail(`features/seguranca/permissoesCatalogo.ts: sentinela ${sentinela} não pode estar catalogada (é bypass, não permissão guardável)`);
}

// 4) Union ≡ catálogo do frontend, nas duas direções.
let comparison = null;
if (inputs && snapshot) {
    comparison = comparePermissions({ unionCodes: inputs.union, catalogCodes: inputs.catalog, snapshotPermissions: snapshot.permissions });
    for (const code of comparison.catalogoSemUnion) fail(`features/seguranca/permissoesCatalogo.ts: ${code} catalogado sem estar no union PermissionCode (types/erp.ts)`);
    for (const code of comparison.unionSemCatalogo) fail(`types/erp.ts: ${code} no union PermissionCode sem entrada em features/seguranca/permissoesCatalogo.ts`);
}

// 5-6) Fantasma e cobertura pendente não registradas na allowlist —
// reprovam mostrando arquivo:linha de cada uso (fantasma) ou o código
// (cobertura pendente).
const allowlistedFantasmas = new Map((allowlist?.fantasmasConhecidos ?? []).map((item) => [item.code, item]));
const allowlistedCobertura = new Map((allowlist?.coberturaPendente ?? []).map((item) => [item.code, item]));

if (comparison) {
    for (const code of comparison.fantasmas) {
        const registro = allowlistedFantasmas.get(code);
        if (!registro) fail(`${code}: permissão fantasma (está no union PermissionCode, não está no snapshot documental) sem registro em ${allowlistPath}.fantasmasConhecidos`);
    }
    for (const code of comparison.coberturaPendente) {
        const registro = allowlistedCobertura.get(code);
        if (!registro) fail(`${code}: cobertura pendente (está no snapshot documental, não está no union PermissionCode) sem registro em ${allowlistPath}.coberturaPendente`);
    }

    // Anti-apodrecimento: entrada registrada que não corresponde a
    // divergência observada reprova — impede que a allowlist fique
    // desatualizada quando o union for corrigido.
    const observedFantasmas = new Set(comparison.fantasmas);
    for (const item of allowlist?.fantasmasConhecidos ?? []) {
        if (!observedFantasmas.has(item.code)) fail(`${allowlistPath}: fantasma ${item.id} (${item.code}) não corresponde a uma divergência observada — remova a entrada`);
    }
    const observedCobertura = new Set(comparison.coberturaPendente);
    for (const item of allowlist?.coberturaPendente ?? []) {
        if (!observedCobertura.has(item.code)) fail(`${allowlistPath}: cobertura pendente ${item.id} (${item.code}) não corresponde a uma divergência observada — remova a entrada`);
    }
}

// 7) Teto monotônico + expiresAt + suppressions vazias + estrutura da
// allowlist.
if (allowlist) {
    for (const issue of validatePermissionsAllowlist(allowlist, { version: logosoftVersion, snapshotDocument: snapshotPath })) {
        fail(`${allowlistPath}: ${issue}`);
    }
    if (comparison) {
        const teto = allowlist.teto ?? {};
        const fantasmasCount = comparison.fantasmas.length;
        const coberturaCount = comparison.coberturaPendente.length;
        if (typeof teto.fantasmas === 'number') {
            if (fantasmasCount > teto.fantasmas) fail(`${allowlistPath}: teto.fantasmas (${teto.fantasmas}) excedido — observado ${fantasmasCount}`);
            if (teto.fantasmas !== (allowlist.fantasmasConhecidos ?? []).length) fail(`${allowlistPath}: teto.fantasmas (${teto.fantasmas}) deve ser igual ao número de entradas em fantasmasConhecidos (${(allowlist.fantasmasConhecidos ?? []).length}) — o registro só encolhe`);
        }
        if (typeof teto.coberturaPendente === 'number') {
            if (coberturaCount > teto.coberturaPendente) fail(`${allowlistPath}: teto.coberturaPendente (${teto.coberturaPendente}) excedido — observado ${coberturaCount}`);
            if (teto.coberturaPendente !== (allowlist.coberturaPendente ?? []).length) fail(`${allowlistPath}: teto.coberturaPendente (${teto.coberturaPendente}) deve ser igual ao número de entradas em coberturaPendente (${(allowlist.coberturaPendente ?? []).length}) — o registro só encolhe`);
        }
    }
}

const summary = comparison ? {
    unionCount: inputs.union.length,
    catalogCount: inputs.catalog.length,
    snapshotCount: snapshot?.count ?? null,
    fantasmas: comparison.fantasmas.length,
    coberturaPendente: comparison.coberturaPendente.length,
    sentinelaNoUnion: comparison.sentinelaNoUnion.length,
    catalogoSemUnion: comparison.catalogoSemUnion.length,
    unionSemCatalogo: comparison.unionSemCatalogo.length
} : null;

if (reportOnly) {
    // Lista completa a cada execução — anti-supressão: o gate declara, não
    // silencia. Cada item mostra o alvo (F1.2/F1.3) planejado.
    const report = {
        ok: failures.length === 0,
        failures,
        summary,
        fantasmasConhecidos: comparison ? comparison.fantasmas.map((code) => ({ code, target: allowlistedFantasmas.get(code)?.target ?? null })) : [],
        coberturaPendente: comparison ? comparison.coberturaPendente.map((code) => ({ code, target: allowlistedCobertura.get(code)?.target ?? null })) : []
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exit(0);
}

if (comparison) {
    process.stdout.write('Divergências registradas entre union PermissionCode e snapshot documental de permissões:\n');
    for (const code of comparison.fantasmas) {
        process.stdout.write(`  - fantasma: ${code} (alvo ${allowlistedFantasmas.get(code)?.target ?? '?'})\n`);
    }
    for (const code of comparison.coberturaPendente) {
        process.stdout.write(`  - cobertura pendente: ${code} (alvo ${allowlistedCobertura.get(code)?.target ?? '?'})\n`);
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação de permissões frontend/backend falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write(`Validação de permissões frontend/backend concluída: union com ${summary?.unionCount ?? 0} códigos, ${summary?.fantasmas ?? 0} fantasma(s) e ${summary?.coberturaPendente ?? 0} pendência(s) registrados em ${allowlistPath}.\n`);
