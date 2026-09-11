import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import {
    readGuardPermissionMapInputs,
    analyzeGuardDivergences,
    checkMissingModuleOwnership
} from './lib/guard-permission-map.mjs';

/**
 * Validador do mapa de permissões em rotas — gate de cobertura de F1.6.b.
 *
 * LIMITAÇÃO CRÍTICA: Este validador é uma condição NECESSÁRIA, mas NÃO SUFICIENTE.
 *
 * O que o gate FAZ detectar:
 * - Chamada HTTP sem guard (módulo órfão ou tela que ainda não guardou)
 * - Permissão do guard não declara a permissão real do contrato
 * - Hierar‌quia de menu desalinhada com contrato
 *
 * O que o gate NÃO detecta:
 * - Permissão em EXCESSO: um guard que aceita `TABELAS_PRECO_GERENCIAR | VENDAS_GERENCIAR`
 *   quando o contrato só exige `TABELAS_PRECO_GERENCIAR`. Essa classe de erro foi coberta por
 *   varredura manual durante `b52` — a remoção de permissão redundante é responsabilidade de F5.4/F5.5.
 * - Catálogo genérico que não foi mapeado (fixture sintética adicionada em `b53`).
 *
 * Consulte `docs/arquitetura/DECISOES.md` D2 e D3, e a seção "Limitações" do `README.md`.
 */

const root = process.cwd();
const failures = [];
const reportOnly = process.argv.includes('--report');
const baseRef = process.argv.find(arg => arg.startsWith('--base='))?.split('=')[1];

const read = (path) => readFileSync(join(root, path), 'utf8');
const fail = (message) => failures.push(message);

const allowlistPath = 'scripts/guard-permission-map.allowlist.json';
const packagePath = 'package.json';

// Validações estruturais iniciais
if (!existsSync(join(root, allowlistPath))) fail(`${allowlistPath}: allowlist auditável ausente`);
if (!existsSync(join(root, packagePath))) fail(`${packagePath}: package.json ausente`);

const packageJson = JSON.parse(read(packagePath));
const logosoftVersion = packageJson.logosoftVersion;

let allowlist = null;
if (existsSync(join(root, allowlistPath))) {
    try {
        allowlist = JSON.parse(read(allowlistPath));
    } catch (error) {
        fail(`${allowlistPath}: JSON inválido (${error.message})`);
    }
}

// Validar estrutura da allowlist
if (allowlist) {
    if (allowlist.schemaVersion !== 1) fail(`${allowlistPath}: schemaVersion deve ser 1`);
    if (allowlist.version !== logosoftVersion) fail(`${allowlistPath}: version deve ser ${logosoftVersion}`);
    if (allowlist.status !== 'registro-fechado-monotonico') fail(`${allowlistPath}: status deve ser "registro-fechado-monotonico"`);

    for (const field of ['owner', 'expiresAt', 'sourceContract', 'target']) {
        if (!allowlist.auditPolicy?.[field]) fail(`${allowlistPath}: auditPolicy sem campo obrigatório ${field}`);
    }

    const expiresAt = Date.parse(allowlist.auditPolicy?.expiresAt ?? '');
    if (Number.isNaN(expiresAt)) fail(`${allowlistPath}: auditPolicy.expiresAt inválido`);
    else if (expiresAt < Date.now()) fail(`${allowlistPath}: auditPolicy expirado em ${allowlist.auditPolicy.expiresAt}`);

    if (!Array.isArray(allowlist.suppressions) || allowlist.suppressions.length !== 0) {
        fail(`${allowlistPath}: suppressions deve estar vazio (divergências não podem ser suprimidas)`);
    }

    // Validar teto
    if (!allowlist.teto || typeof allowlist.teto !== 'object') {
        fail(`${allowlistPath}: teto não está definido`);
    } else {
        for (const field of ['chamadaSemGuard', 'menuHierarquia', 'menuSemRegra', 'catalogoGenerico']) {
            if (typeof allowlist.teto[field] !== 'number') {
                fail(`${allowlistPath}: teto.${field} deve ser numérico`);
            }
        }
    }
}

// Se houver base ref, rodar contra histórico usando worktree temporária
let analysisResult = null;
let baseRefDivergences = null;
try {
    if (baseRef) {
        // Criar worktree temporária para análise histórica
        const tempDir = mkdtempSync(join(tmpdir(), 'guard-analysis-'));
        try {
            // Adicionar worktree apontada ao baseRef
            execSync(`git worktree add "${tempDir}" ${baseRef}`, { cwd: root, stdio: 'pipe' });
            // Rodar análise na worktree
            const baseAnalysis = readGuardPermissionMapInputs(tempDir);
            baseRefDivergences = analyzeGuardDivergences(baseAnalysis);
        } finally {
            // Remover worktree (sempre, mesmo em erro)
            try {
                execSync(`git worktree remove "${tempDir}" --force`, { cwd: root, stdio: 'pipe' });
            } catch (cleanupErr) {
                // Log mas não falha
                process.stderr.write(`Aviso: falha ao remover worktree temporária: ${cleanupErr.message}\n`);
            }
            // Remover diretório temporário
            try {
                rmSync(tempDir, { recursive: true, force: true });
            } catch (rmErr) {
                // Log mas não falha
                process.stderr.write(`Aviso: falha ao remover diretório temporário: ${rmErr.message}\n`);
            }
        }
    }
    // Analisar HEAD independentemente
    analysisResult = readGuardPermissionMapInputs(root);
} catch (error) {
    fail(`Falha ao ler insumos de análise: ${error.message}`);
}

let divergences = null;
let missingOwnership = [];

if (analysisResult) {
    divergences = analyzeGuardDivergences(analysisResult);
    missingOwnership = checkMissingModuleOwnership(root);

    // AC9: Anti-apodrecimento — entrada registrada que não corresponde mais reprova
    if (allowlist) {
        const allowlistedIds = new Set([
            ...(allowlist.chamadaSemGuard ?? []).map(item => item.id),
            ...(allowlist.menuHierarquia ?? []).map(item => item.id),
            ...(allowlist.menuSemRegra ?? []).map(item => item.id),
            ...(allowlist.menuForaDaRegra ?? []).map(item => item.id),
            ...(allowlist.catalogoGenerico ?? []).map(item => item.id)
        ]);

        const observedIds = new Set([
            ...divergences.chamadaSemGuard.map(item => item.id || `chamada-${item.file}-${item.method}-${item.path}`),
            ...divergences.menuHierarquia.map(item => item.id),
            ...divergences.menuSemRegra.map(item => item.id),
            ...divergences.menuForaDaRegra.map(item => item.id),
            ...divergences.catalogoGenerico.map(item => item.id)
        ]);

        for (const id of allowlistedIds) {
            if (!observedIds.has(id)) {
                fail(`${allowlistPath}: entrada ${id} não corresponde a divergência observada — remova`);
            }
        }
    }

    // Verificar se chamadaSemGuard excedeu o teto
    const tetoC1 = allowlist?.teto?.chamadaSemGuard ?? 0;
    if (divergences.chamadaSemGuard.length > tetoC1) {
        // Apenas falhar as NOVAS divergências (acima do teto)
        const excess = divergences.chamadaSemGuard.slice(0, Math.min(5, divergences.chamadaSemGuard.length - tetoC1));
        for (const div of excess) {
            fail(`${div.file}:${div.line}: ${div.method} ${div.path} exige ${div.requiredPermission} mas módulo ${div.module} não o declara`);
        }
    }

    // C1: Verificar teto.chamadaSemGuard
    if (allowlist && divergences) {
        const observed = divergences.chamadaSemGuard.length;
        const teto = allowlist.teto.chamadaSemGuard;
        if (observed > teto) {
            fail(`${allowlistPath}: teto.chamadaSemGuard (${teto}) excedido — observado ${observed}`);
        }
        if (teto !== (allowlist.chamadaSemGuard ?? []).length) {
            fail(`${allowlistPath}: teto.chamadaSemGuard (${teto}) deve ser igual ao número de entradas em chamadaSemGuard (${(allowlist.chamadaSemGuard ?? []).length}) — o registro só encolhe`);
        }
    }

    // AC5: Verificar tetoHierarquiaMenu
    if (allowlist && divergences) {
        const observed = divergences.menuHierarquia.length;
        const teto = allowlist.teto.menuHierarquia;
        if (observed > teto) {
            fail(`${allowlistPath}: teto.menuHierarquia (${teto}) excedido — observado ${observed}`);
        }
        if (teto !== (allowlist.menuHierarquia ?? []).length) {
            fail(`${allowlistPath}: teto.menuHierarquia (${teto}) deve ser igual ao número de entradas em menuHierarquia (${(allowlist.menuHierarquia ?? []).length}) — o registro só encolhe`);
        }
    }

    // AC6: Verificar menuSemRegra e menuForaDaRegra
    if (allowlist) {
        const observedSemRegra = divergences.menuSemRegra.length;
        const tetoSemRegra = allowlist.teto.menuSemRegra;
        if (observedSemRegra > tetoSemRegra) {
            fail(`${allowlistPath}: teto.menuSemRegra (${tetoSemRegra}) excedido — observado ${observedSemRegra}`);
        }
        if (tetoSemRegra !== (allowlist.menuSemRegra ?? []).length) {
            fail(`${allowlistPath}: teto.menuSemRegra (${tetoSemRegra}) deve ser igual ao número de entradas (${(allowlist.menuSemRegra ?? []).length}) — o registro só encolhe`);
        }

        const observedForaDaRegra = divergences.menuForaDaRegra.length;
        if (observedForaDaRegra > 0) {
            fail(`${allowlistPath}: menuForaDaRegra não deve ter entradas (observado ${observedForaDaRegra})`);
        }
    }

    // AC7: Verificar catalogoGenerico
    if (allowlist) {
        const observed = divergences.catalogoGenerico.length;
        const teto = allowlist.teto.catalogoGenerico;
        if (observed > teto) {
            fail(`${allowlistPath}: teto.catalogoGenerico (${teto}) excedido — observado ${observed}`);
        }
        if (teto !== (allowlist.catalogoGenerico ?? []).length) {
            fail(`${allowlistPath}: teto.catalogoGenerico (${teto}) deve ser igual ao número de entradas (${(allowlist.catalogoGenerico ?? []).length}) — o registro só encolhe`);
        }
    }

    // A5: Verificar módulos órfãos
    for (const issue of missingOwnership) {
        fail(`${issue.file}: ${issue.reason}`);
    }
}

// Construir summary e relatório C1'
const summary = analysisResult ? {
    chamadasCobertas: analysisResult.frontendRoutes.length,
    modulosCobertos: analysisResult.modules.size,
    operacoesContrato: analysisResult.contractOperations.length,
    faltando: divergences?.chamadaSemGuard.length ?? 0,
    menuHierarquiaIssues: divergences?.menuHierarquia.length ?? 0,
    menuSemRegraIssues: divergences?.menuSemRegra.length ?? 0,
    catalogoGenericoIssues: divergences?.catalogoGenerico.length ?? 0,
    ...(baseRefDivergences ? {
        historicAnalysisRef: baseRef,
        historicChamadaSemGuard: baseRefDivergences.chamadaSemGuard.length,
        historicMenuHierarquia: baseRefDivergences.menuHierarquia.length,
        historicMenuSemRegra: baseRefDivergences.menuSemRegra.length,
        historicCatalogoGenerico: baseRefDivergences.catalogoGenerico.length
    } : {})
} : null;

// C1': Relatório de cobertura (sempre 5 itens sem falhar)
const coverage = analysisResult ? {
    ok: (divergences?.chamadaSemGuard?.length ?? 0) === 0,
    total: analysisResult.frontendRoutes.length,
    covered: (analysisResult.frontendRoutes.length - (divergences?.chamadaSemGuard?.length ?? 0)),
    uncovered: divergences?.chamadaSemGuard ?? [],
    percentual: Math.round(((analysisResult.frontendRoutes.length - (divergences?.chamadaSemGuard?.length ?? 0)) / analysisResult.frontendRoutes.length) * 100)
} : null;

if (reportOnly) {
    const report = {
        ok: failures.length === 0,
        failures,
        summary,
        coverage,
        divergences: divergences ? {
            chamadaSemGuard: (divergences.chamadaSemGuard ?? []).slice(0, 100),
            menuHierarquia: divergences.menuHierarquia ?? [],
            menuSemRegra: divergences.menuSemRegra ?? [],
            menuForaDaRegra: divergences.menuForaDaRegra ?? [],
            catalogoGenerico: divergences.catalogoGenerico ?? []
        } : null,
        ...(baseRefDivergences ? {
            historicDivergences: {
                ref: baseRef,
                chamadaSemGuard: (baseRefDivergences.chamadaSemGuard ?? []).map(item => ({
                    id: item.id || `chamada-${item.file}-${item.method}-${item.path}`,
                    file: item.file,
                    line: item.line,
                    method: item.method,
                    path: item.path,
                    module: item.module,
                    requiredPermission: item.requiredPermission
                })),
                menuHierarquia: baseRefDivergences.menuHierarquia ?? [],
                menuSemRegra: baseRefDivergences.menuSemRegra ?? [],
                menuForaDaRegra: baseRefDivergences.menuForaDaRegra ?? [],
                catalogoGenerico: baseRefDivergences.catalogoGenerico ?? []
            }
        } : {}),
        timestamp: new Date().toISOString()
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exit(0);
}

// Relatório em modo normal (sempre imprime as exceções registradas)
if (divergences && allowlist) {
    process.stdout.write('Divergências registradas na allowlist:\n');
    for (const item of (allowlist.menuSemRegra ?? [])) {
        process.stdout.write(`  - menuSemRegra ${item.id}: ${item.rota} (alvo ${item.target})\n`);
    }
    for (const item of (allowlist.catalogoGenerico ?? [])) {
        process.stdout.write(`  - catalogoGenerico ${item.id}: ${item.resource} (alvo ${item.target})\n`);
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação de guard de permissão falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

if (summary) {
    process.stdout.write(`Validação de guard de permissão concluída: ${summary.chamadasCobertas} chamadas em ${summary.modulosCobertos} módulos, ${summary.faltando} falta(s) registrada(s) em ${allowlistPath}.\n`);
}

process.exit(0);
