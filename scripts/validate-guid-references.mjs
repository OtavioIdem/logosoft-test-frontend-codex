import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const scanDirs = ['app', 'components', 'features', 'hooks', 'layout', 'lib', 'providers'];
const ignoredDirs = new Set(['node_modules', '.next', 'coverage', '.git', 'dist', 'build', 'playwright-report', 'test-results']);
const referenceFields = new Set([
    'empresaId',
    'filialId',
    'pessoaId',
    'clienteId',
    'fornecedorId',
    'funcionarioId',
    'usuarioId',
    'grupoAcessoId',
    'setorId',
    'cargoId',
    'centroCustoId',
    'produtoId',
    'localEstoqueId',
    'unidadeMedidaId',
    'unidadeTributavelId',
    'categoriaProdutoId',
    'marcaId',
    'pedidoVendaId',
    'pedidoCompraId',
    'condicaoPagamentoId',
    'formaPagamentoId',
    'naturezaOperacaoId',
    'regraTributariaId',
    'certificadoDigitalId',
    'origemId',
    'contaReceberId',
    'contaPagarId',
    'reservaEstoqueId',
    'itemNotaFiscalId',
    'notaFiscalId',
    'documentoAuxiliarId'
]);
const allowedTechnicalFields = new Set([
    'correlationId',
    'correlationIdOriginal',
    'traceId',
    'schemaSetName',
    'certificateThumbprint'
]);
const controlledExceptions = new Map([
    [
        'features/auth/components/LoginForm.tsx::empresaId',
        'Campo legado do contrato de login. A UI solicita código autorizado da empresa, não seleção operacional de empresa já autenticada.'
    ]
]);

const files = [];
const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            if (ignoredDirs.has(entry)) continue;
            walk(path);
            continue;
        }
        if (['.ts', '.tsx'].includes(extname(entry))) files.push(path);
    }
};

scanDirs.forEach((dir) => {
    try {
        walk(join(root, dir));
    } catch {
        // Diretórios opcionais em algumas cópias do frontend.
    }
});

const getLiteralAttribute = (tag, attrName) => {
    const match = tag.match(new RegExp(`${attrName}\\s*=\\s*(["'])([^"']+)\\1`));
    return match?.[2] ?? null;
};

const isNonEditableTechnicalField = (tag) => /\b(readOnly|disabled)\b/.test(tag) || /type\s*=\s*(["'])hidden\1/.test(tag) || /aria-hidden\s*=\s*\{?true\}?/.test(tag);
const isReferenceField = (value) => Boolean(value) && referenceFields.has(value) && !allowedTechnicalFields.has(value);
const exceptionKey = (file, field) => `${relative(root, file).replace(/\\/g, '/')}::${field}`;
const isControlledException = (file, field) => controlledExceptions.has(exceptionKey(file, field));
const formatException = (file, field) => `${exceptionKey(file, field)} — ${controlledExceptions.get(exceptionKey(file, field))}`;

const findEditableInputReference = (file, tag) => {
    if (isNonEditableTechnicalField(tag)) return null;
    const id = getLiteralAttribute(tag, 'id');
    const name = getLiteralAttribute(tag, 'name');
    const field = [id, name].find(isReferenceField);
    if (!field || isControlledException(file, field)) return null;
    return field;
};

const findControllerSpreadReferences = (file, content) => {
    const failures = [];
    const controllerPattern = /<Controller\b[\s\S]*?name\s*=\s*(["'])([^"']+)\1[\s\S]{0,1800}?<Input(?:Text|Textarea)\b[\s\S]{0,900}?\{\.\.\.field\}/g;
    for (const match of content.matchAll(controllerPattern)) {
        const field = match[2];
        if (!isReferenceField(field) || isControlledException(file, field)) continue;
        failures.push(`${relative(root, file)}: Controller name '${field}' repassado para InputText/InputTextarea por {...field}; use select/dropdown/search por API`);
    }
    return failures;
};

const failures = [];
const exceptionsFound = [];
for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const inputTags = content.match(/<Input(?:Text|Textarea)\b[^>]*>/g) ?? [];
    for (const tag of inputTags) {
        const id = getLiteralAttribute(tag, 'id');
        const name = getLiteralAttribute(tag, 'name');
        for (const field of [id, name].filter(isReferenceField)) {
            if (isControlledException(file, field)) {
                exceptionsFound.push(formatException(file, field));
            }
        }
        const field = findEditableInputReference(file, tag);
        if (!field) continue;
        failures.push(`${relative(root, file)}: campo de referência '${field}' não deve usar InputText/InputTextarea editável; use select/dropdown/search por API`);
    }

    for (const failure of findControllerSpreadReferences(file, content)) {
        failures.push(failure);
    }
}

if (failures.length > 0) {
    process.stderr.write(`Validação de referências por GUID falhou:\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
    process.exit(1);
}

process.stdout.write('Validação de referências por GUID concluída sem campos manuais indevidos.\n');
if (exceptionsFound.length > 0) {
    process.stdout.write(`Exceções controladas aplicadas:\n${[...new Set(exceptionsFound)].map((item) => `- ${item}`).join('\n')}\n`);
}
