import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const requiredFiles = [
    'skills/README.md',
    'skills/desenvolvimento/README.md',
    'skills/desenvolvimento/00_normas_gerais.md',
    'skills/desenvolvimento/01_fluxo_versionamento.md',
    'skills/desenvolvimento/02_workflow_implementacao.md',
    'skills/desenvolvimento/03_frontend_erp_real.md',
    'skills/desenvolvimento/04_modulos_especializados.md',
    'skills/desenvolvimento/05_fiscal_frontend.md',
    'skills/desenvolvimento/06_integracao_api_sem_mocks.md',
    'skills/desenvolvimento/07_testes_gates_qualidade.md',
    'skills/desenvolvimento/08_entrega_pacote_documentacao.md',
    'skills/review/README.md',
    'skills/review/00_papel_do_reviewer.md',
    'skills/review/01_procedimento_review.md',
    'skills/review/02_validacoes_obrigatorias.md',
    'skills/review/03_review_git_escopo.md',
    'skills/review/04_review_funcional_tela_fluxo.md',
    'skills/review/05_review_mocks_guid_fiscal.md',
    'skills/review/06_criterios_commit_bloqueio.md',
    'skills/review/07_modelo_relatorio_bloqueio.md'
];

const requiredPhrases = new Map([
    ['skills/desenvolvimento/00_normas_gerais.md', ['Não inventar', 'Não criar mock produtivo', 'Não permitir digitação manual de GUID']],
    ['skills/desenvolvimento/01_fluxo_versionamento.md', ['Análise negativa ou bloqueada', 'Versão corretiva', 'Versão funcional']],
    ['skills/desenvolvimento/05_fiscal_frontend.md', ['Não inventar regra fiscal', 'resumo.acoes', 'workflow.proximasAcoes']],
    ['skills/desenvolvimento/06_integracao_api_sem_mocks.md', ['Mocks podem existir somente', 'fallback automático', 'Playwright']],
    ['skills/review/00_papel_do_reviewer.md', ['Commitar somente', 'relatório técnico', 'repositório principal']],
    ['skills/review/02_validacoes_obrigatorias.md', ['npm run validate:source', 'npm run validate:guid-references', 'npm run build']],
    ['skills/review/05_review_mocks_guid_fiscal.md', ['mockAuthClient', 'validate:guid-references', 'validate:fiscal:production']],
    ['skills/review/07_modelo_relatorio_bloqueio.md', ['Resultado: bloqueado para commit', 'Correção indicada', 'Decisão']]
]);

const failures = [];

for (const file of requiredFiles) {
    const path = join(root, file);
    try {
        statSync(path);
    } catch {
        failures.push(`${file}: skill obrigatória ausente`);
        continue;
    }

    const content = readFileSync(path, 'utf8');
    if (!content.trim().startsWith('# ')) {
        failures.push(`${file}: deve iniciar com título markdown H1`);
    }

    if (content.endsWith('\n\n') || content.endsWith('\r\n\r\n')) {
        failures.push(`${file}: linha em branco extra no final do arquivo não permitida`);
    }

    const phrases = requiredPhrases.get(file) ?? [];
    for (const phrase of phrases) {
        if (!content.includes(phrase)) {
            failures.push(`${file}: frase obrigatória ausente: ${phrase}`);
        }
    }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const scripts = packageJson.scripts ?? {};
if (scripts['validate:skills'] !== 'node scripts/validate-skills.mjs') {
    failures.push('package.json: script validate:skills deve executar node scripts/validate-skills.mjs');
}

const validateSource = readFileSync(join(root, 'scripts', 'validate-source.mjs'), 'utf8');
if (!validateSource.includes('scripts/validate-skills.mjs')) {
    failures.push('scripts/validate-source.mjs: deve executar validate-skills como gate estrutural');
}

if (failures.length > 0) {
    process.stderr.write(`Validação de skills falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write(`Validação de skills concluída sem regressões (${requiredFiles.length} arquivos).\n`);
