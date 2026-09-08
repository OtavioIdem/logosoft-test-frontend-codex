import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildSnapshot, readPermissionInputs } from './lib/backend-permissions.mjs';

// Gera scripts/backend-permissions.snapshot.json a partir das duas fontes
// documentais (contrato v1.23 + catálogo §12 do documento canônico). Nunca
// entra em ci:gates — escreve arquivo. O gate que roda em CI é
// validate-backend-permissions.mjs, que apenas re-deriva e compara.
//
// Idempotência: `generatedAt` é derivado deterministicamente de `sourceDate`
// (não de `Date.now()`), então duas execuções seguidas sem mudança de fonte
// produzem o arquivo byte-a-byte idêntico — não há timestamp de relógio para
// gerar diff espúrio.
const root = process.cwd();
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = packageJson.logosoftVersion;
// Data de corte das duas fontes documentais (ver cabeçalho de
// docs/backend-v1.23/CONTRATO-API-v1.23.md, "Gerado em 2026-09-08").
const sourceDate = '2026-09-08';

const { contract, catalogSection } = readPermissionInputs(root);
const snapshot = buildSnapshot({ contract, catalogSection, version, sourceDate });

const outputPath = join(root, 'scripts/backend-permissions.snapshot.json');
writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 4)}\n`, 'utf8');

process.stdout.write(`scripts/backend-permissions.snapshot.json gerado: ${snapshot.count} permissões (${snapshot.permissions.length - snapshot.sentinels.length} nomeadas + ${snapshot.sentinels.length} sentinelas).\n`);
