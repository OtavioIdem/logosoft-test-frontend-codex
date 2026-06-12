import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
const scripts = packageJson.scripts ?? {};
const requiredScripts = [
    'validate:source',
    'validate:fiscal:production',
    'test:e2e:fiscal',
    'test:contract:fiscal',
    'test:e2e:fiscal:backend'
];

requiredScripts.forEach((script) => {
    if (!scripts[script]) failures.push(`package.json: script obrigatório ausente: ${script}`);
});

[
    'docs/CONTRATO_FISCAL_OFICIAL.md',
    'docs/DIRETRIZES_UX_REFERENCIAS.md',
    'docs/FISCAL_FRONTEND_PRODUCTION_REVIEW.md',
    'features/fiscal/api/fiscalApi.ts',
    'features/fiscal/components/FiscalActionDialogs.tsx',
    'features/fiscal/components/FiscalOperationalPanels.tsx',
    'features/fiscal/components/NotaFiscalConsultaPage.tsx',
    'features/fiscal/components/NotaFiscalDetalhePage.tsx',
    'features/fiscal/components/ObservabilidadeFiscalPage.tsx',
    'features/fiscal/components/InutilizacoesFiscaisPage.tsx',
    'features/fiscal/components/fiscalUiUtils.ts',
    'playwright.config.ts',
    'playwright.contract.config.ts',
    'playwright.backend-e2e.config.ts',
    'tests/unit/fiscalContract.test.ts',
    'tests/e2e/fiscal.spec.ts',
    'tests/e2e/fiscal-backend.spec.ts',
    'tests/contract/fiscal-backend.contract.spec.ts'
].forEach((path) => requireFile(path, 'arquivo obrigatório para revisão de produção fiscal'));

requireIncludes('docs/CONTRATO_FISCAL_OFICIAL.md', '1.11.0a8b25', 'contrato fiscal deve registrar a versão da revisão de produção');
requireIncludes('features/fiscal/components/fiscalUiUtils.ts', '[XML_MASKED]', 'mascaramento fiscal deve substituir XML por marcador seguro');
requireIncludes('features/fiscal/components/fiscalUiUtils.ts', 'createFiscalCorrelationId', 'ações críticas devem usar helper fiscal de correlationId');
requireIncludes('features/fiscal/components/NotaFiscalDetalhePage.tsx', 'resolveFiscalWorkflowActionState', 'detalhe deve centralizar ações por workflow/resumo');
requireIncludes('features/fiscal/components/FiscalOperationalPanels.tsx', 'maskFiscalSensitiveText', 'painéis operacionais devem mascarar payload de integração');
requireIncludes('features/fiscal/components/FiscalOperationalPanels.tsx', 'FiscalPayloadResumo', 'payload de integração deve passar por componente sanitizador');
requireIncludes('features/fiscal/components/InutilizacoesFiscaisPage.tsx', 'createFiscalCorrelationId', 'inutilização deve gerar correlationId por tentativa');
requireIncludes('tests/e2e/fiscal.spec.ts', 'Governança fiscal', 'E2E fiscal deve escopar status em seção operacional, evitando texto global ambíguo');
requireIncludes('tests/e2e/fiscal-backend.spec.ts', 'LOGOSOFT_E2E_RUN_BACKEND_FISCAL', 'E2E backend deve ser opt-in para evitar mutações acidentais');
requireIncludes('tests/contract/fiscal-backend.contract.spec.ts', 'LOGOSOFT_CONTRACT_API_URL', 'contrato backend deve exigir URL explícita');
requireIncludes('tests/contract/fiscal-backend.contract.spec.ts', 'LOGOSOFT_CONTRACT_ACCESS_TOKEN', 'contrato backend deve exigir token explícito');

const backendE2e = read('tests/e2e/fiscal-backend.spec.ts');
if (/locator\(['"]input['"]\)\.nth\(/.test(backendE2e)) {
    failures.push('tests/e2e/fiscal-backend.spec.ts: não usar locator(input).nth(...) em formulários com PrimeReact');
}
if (/filialId=\$\{/.test(backendE2e)) {
    failures.push('tests/e2e/fiscal-backend.spec.ts: filialId opcional não deve ser enviado vazio');
}

const fiscalComponents = [
    'features/fiscal/components/NotaFiscalConsultaPage.tsx',
    'features/fiscal/components/NotaFiscalDetalhePage.tsx',
    'features/fiscal/components/ObservabilidadeFiscalPage.tsx',
    'features/fiscal/components/FiscalOperationalPanels.tsx'
].map(read).join('\n');
if (/payloadResumo}\s*<|<pre[^>]*>\s*\{?[^\n]*payloadResumo/.test(fiscalComponents)) {
    failures.push('features/fiscal: payloadResumo não deve ser renderizado diretamente sem mascaramento');
}

if (failures.length > 0) {
    process.stderr.write(`Validação fiscal de produção falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação fiscal de produção concluída sem pendências obrigatórias.\n');
