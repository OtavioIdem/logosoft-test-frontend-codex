import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const requiredFiles = [
    'skills/README.md',
    'skills/agentes/README.md',
    'skills/agentes/00_padrao_de_execucao.md',
    'skills/agentes/inventariante-contrato-tela.md',
    'skills/agentes/arquiteto-operacao-erp.md',
    'skills/agentes/arquiteto-plataforma-frontend.md',
    'skills/agentes/arquiteto-escopo-entrega.md',
    'skills/agentes/arquiteto-design-system.md',
    'skills/agentes/arquiteto-frontend.md',
    'skills/agentes/dev-senior-react.md',
    'skills/agentes/designer-ux-erp.md',
    'skills/agentes/engenheiro-testes.md',
    'skills/agentes/qa-revisor.md',
    'skills/agentes/devops-frontend.md',
    'skills/projeto/README.md',
    'skills/projeto/00_regime_projeto.md',
    'skills/projeto/01_fontes_de_verdade.md',
    'skills/projeto/02_formato_da_posicao.md',
    'skills/projeto/03_contrato_de_saida.md',
    'skills/projeto/04_regua_de_fatiamento.md',
    'skills/projeto/05_decisoes_e_prospeccao.md',
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
    ['skills/agentes/00_padrao_de_execucao.md', ['Briefing mínimo', 'não verificado', 'Quando parar e escalar']],
    ['skills/agentes/dev-senior-react.md', ['sanitizePayload', 'queryKey', 'Nenhum mock no caminho produtivo']],
    ['skills/agentes/engenheiro-testes.md', ['gate estrutural', 'Não rode a suíte completa', 'qual asserção falha']],
    ['skills/agentes/qa-revisor.md', ['Escopo por diff', 'não verificado', 'APROVADO ou BLOQUEADO']],
    ['skills/agentes/devops-frontend.md', ['Docker só sob pedido explícito', 'preview_start', 'do mais barato para o mais caro']],
    ['skills/projeto/00_regime_projeto.md', ['Rodada com integrante faltando', 'Nenhum arquiteto decide', 'layout, UI, UX ou template']],
    ['skills/projeto/01_fontes_de_verdade.md', ['Hierarquia', 'O que nunca é fonte', 'Fonte omissa']],
    ['skills/projeto/02_formato_da_posicao.md', ['O que eu abro mão', 'Como discordar', 'docs/arquitetura/debate/']],
    ['skills/projeto/03_contrato_de_saida.md', ['Estados válidos', 'CONTRACT_MISMATCH', 'DECISOES.md']],
    ['skills/projeto/04_regua_de_fatiamento.md', ['Motor sem chamador', 'Reversível', 'custo de provar']],
    ['skills/projeto/05_decisoes_e_prospeccao.md', ['Gatilho de revisita', 'Prospecção', 'gate']],
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
