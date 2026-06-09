import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const evidenceFile = process.env.LOGOSOFT_INTEGRATED_E2E_EVIDENCE_FILE || 'tests/evidence/integrated-e2e.assisted-evidence.example.json';
const outputFile = process.env.LOGOSOFT_INTEGRATED_E2E_ASSISTED_REPORT_OUTPUT || 'artifacts/integrated-e2e-assisted-report.md';
const secretPatterns = [
    /Bearer\s+[A-Za-z0-9._-]+/i,
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    /sk-[A-Za-z0-9]/i,
    /password\s*[:=]\s*['\"]?[^'\"\s]+/i,
    /token\s*[:=]\s*['\"]?[A-Za-z0-9._-]{16,}/i
];

const readEvidence = () => {
    const raw = readFileSync(join(root, evidenceFile), 'utf8');
    if (secretPatterns.some((pattern) => pattern.test(raw))) {
        throw new Error(`${evidenceFile}: evidência contém possível token, JWT, chave ou senha. Remova antes de gerar relatório.`);
    }
    return JSON.parse(raw);
};

const bool = (value) => (value ? 'sim' : 'não');
const list = (items) => {
    if (!Array.isArray(items) || items.length === 0) return '- nenhum item registrado';
    return items.map((item) => `- ${item}`).join('\n');
};
const entries = (record) => Object.entries(record || {}).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') || 'nenhum' : value ?? 'não informado'}`).join('\n');

const evidence = readEvidence();
const report = `# Relatório assistido — E2E integrado

## Identificação

- Versão: ${evidence.version ?? 'não informada'}
- Seed run id: ${evidence.seedRunId ?? 'não informado'}
- Ambiente: ${evidence.environment?.type ?? 'não informado'}
- Base URL: ${evidence.environment?.baseUrl ?? 'não informada'}

## Checklist pré-run

${entries(evidence.preRunChecklist)}

## Execução

- Comando: ${evidence.execution?.command ?? 'não informado'}
- Início: ${evidence.execution?.startedAt ?? 'não executado'}
- Fim: ${evidence.execution?.finishedAt ?? 'não executado'}
- Status: ${evidence.execution?.status ?? 'não informado'}

## Efeitos esperados

${entries(evidence.expectedSideEffects)}

## Efeitos observados

${entries(evidence.observedSideEffects)}

## Checklist pós-run

${entries(evidence.postRunChecklist)}

## Decisão

- Aprovado: ${bool(evidence.decision?.approved)}

### Bloqueadores

${list(evidence.decision?.blockers)}

### Avisos não bloqueantes

${list(evidence.decision?.nonBlockingWarnings)}
`;

const outputPath = join(root, outputFile);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, report);
process.stdout.write(`Relatório assistido gerado em ${outputFile}.\n`);
