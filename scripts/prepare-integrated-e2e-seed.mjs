import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const env = process.env;
const run = env.LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN === 'true';

const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const buildUrl = () => {
    const apiUrl = (env.LOGOSOFT_INTEGRATED_E2E_SEED_RESET_API_URL || env.LOGOSOFT_INTEGRATED_E2E_API_URL || '').replace(/\/+$/, '');
    const path = env.LOGOSOFT_INTEGRATED_E2E_SEED_RESET_PATH || '/api/test/integrated-e2e/reset';
    if (!apiUrl) throw new Error('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_API_URL ou LOGOSOFT_INTEGRATED_E2E_API_URL deve ser informado.');
    return `${apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
};
const requireEnv = (name) => {
    const value = env[name];
    if (!value) throw new Error(`${name} deve ser informado para preparar seed/reset integrado.`);
    return value;
};
const assertTrue = (name) => {
    if (env[name] !== 'true') throw new Error(`${name}=true é obrigatório para chamar seed/reset do backend.`);
};
const shortText = async (response) => {
    try {
        return (await response.text()).slice(0, 1200);
    } catch {
        return '<sem corpo de resposta>';
    }
};

if (!run) {
    process.stdout.write('Seed/reset integrado não executado: LOGOSOFT_INTEGRATED_E2E_SEED_RESET_RUN não está true.\n');
    process.exit(0);
}

assertTrue('LOGOSOFT_INTEGRATED_E2E_DISPOSABLE_ENVIRONMENT_ACK');
assertTrue('LOGOSOFT_INTEGRATED_E2E_RUNBOOK_ACK');
assertTrue('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACK');

const seedRunId = requireEnv('LOGOSOFT_INTEGRATED_E2E_SEED_RUN_ID');
const token = env.LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACCESS_TOKEN || env.LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN;
if (!token) throw new Error('LOGOSOFT_INTEGRATED_E2E_SEED_RESET_ACCESS_TOKEN ou LOGOSOFT_INTEGRATED_E2E_ACCESS_TOKEN deve ser informado.');

const seedFile = env.LOGOSOFT_INTEGRATED_E2E_SEED_FILE || 'tests/seeds/integrated-e2e.controlled-seed.example.json';
if (!existsSync(join(root, seedFile))) throw new Error(`${seedFile}: arquivo de seed controlada não encontrado.`);

const method = env.LOGOSOFT_INTEGRATED_E2E_SEED_RESET_METHOD || 'POST';
if (method !== 'POST') throw new Error('Por segurança, LOGOSOFT_INTEGRATED_E2E_SEED_RESET_METHOD deve ser POST.');

const body = {
    ...readJson(seedFile),
    seedRunId,
    empresaId: env.LOGOSOFT_INTEGRATED_E2E_EMPRESA_ID,
    filialId: env.LOGOSOFT_INTEGRATED_E2E_FILIAL_ID || null,
    pedidoVendaId: env.LOGOSOFT_INTEGRATED_E2E_PEDIDO_VENDA_ID || null,
    requestedBy: 'logosoft-frontend-e2e-integrated-seed-reset'
};

const response = await fetch(buildUrl(), {
    method,
    headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Logosoft-E2E-Seed-Run-Id': seedRunId,
        'X-Logosoft-Disposable-Environment': 'true'
    },
    body: JSON.stringify(body)
});

const expectedStatus = Number(env.LOGOSOFT_INTEGRATED_E2E_SEED_RESET_EXPECTED_STATUS || '200');
if (response.status !== expectedStatus) {
    throw new Error(`Seed/reset backend retornou HTTP ${response.status}; esperado ${expectedStatus}. Corpo: ${await shortText(response)}`);
}

let responseBody = {};
try {
    responseBody = await response.json();
} catch {
    responseBody = {};
}

const responseSeedRunId = responseBody.seedRunId || responseBody.runId || responseBody.id;
if (responseSeedRunId && responseSeedRunId !== seedRunId) {
    throw new Error(`Seed/reset retornou run id ${responseSeedRunId}, mas o esperado era ${seedRunId}.`);
}

process.stdout.write('Seed/reset integrado executado com sucesso. Defina LOGOSOFT_INTEGRATED_E2E_SEED_RESET_APPLIED_ACK=true antes do E2E integrado.\n');
