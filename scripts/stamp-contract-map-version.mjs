import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Carimba o campo `version` de scripts/backend-contract-map.allowlist.json
// com o valor de `logosoftVersion` de package.json. Nenhum outro campo é
// modificado — a lista de rotas, política de auditoria, timestamp de origem
// e data da fonte permanecem byte a byte.
//
// D7 (decisões de fechamento de schema) estabeleceu que o allowlist precisa
// acompanhar a versão de release para auditoria temporal — cada versão carimbada
// marca quais rotas estavam no contrato quando ela entrou.

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = packageJson.logosoftVersion;

const allowlistPath = join(root, 'scripts/backend-contract-map.allowlist.json');
const content = readFileSync(allowlistPath, 'utf8');

// Extrair versão atual para reportar
const allowlist = JSON.parse(content);
const oldVersion = allowlist.version;

// Substituir apenas a linha "version": "x.y.z" por "version": "novo"
// Mantém o formato original byte-a-byte
const updated = content.replace(
    `"version": "${oldVersion}"`,
    `"version": "${version}"`
);

if (!updated.includes(`"version": "${version}"`)) {
    process.stderr.write(`ERRO: falha ao substituir versão no allowlist\n`);
    process.exit(1);
}

writeFileSync(allowlistPath, updated, 'utf8');

process.stdout.write(`scripts/backend-contract-map.allowlist.json: ${oldVersion} → ${version}\n`);
