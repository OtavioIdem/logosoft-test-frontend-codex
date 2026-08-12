import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { compareContractMap, normalizePath, parseBackendCatalog, readContractMapInputs, validateAuditAllowlist } from '../../scripts/lib/backend-contract-map.mjs';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('backend contract map v1.11.0a8b45.c1', () => {
    it('mantém gate, allowlist e contrato canônico versionados', () => {
        const packageJson = JSON.parse(read('package.json'));
        const allowlist = JSON.parse(read('scripts/backend-contract-map.allowlist.json'));
        const permissionsSnapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));
        const canonicalDoc = read('docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md');
        const legacyDoc = read('docs/CONTRATO_FRONTEND_BACKEND_B38.md');

        expect(packageJson.scripts['validate:backend-contract-map']).toBe('node scripts/validate-backend-contract-map.mjs');
        expect(packageJson.scripts['report:backend-contract-map']).toBe('node scripts/validate-backend-contract-map.mjs --report');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:backend-contract-map');
        expect(allowlist.version).toBe(packageJson.logosoftVersion);
        expect(allowlist.documentedDivergences).toEqual([]);
        expect(allowlist.suppressions).toEqual([]);
        expect(permissionsSnapshot.version).toBe(packageJson.logosoftVersion);
        expect(permissionsSnapshot.count).toBe(177);
        expect(permissionsSnapshot.permissions).toHaveLength(177);
        expect(canonicalDoc).toContain('## 9. Catálogo de rotas');
        expect(legacyDoc).toContain('Documento histórico');
    });

    it('preserva a correção B37 do contrato produto x fornecedor', () => {
        const types = read('features/produtos/types/produtos.types.ts');
        const schema = read('features/produtos/schemas/produtosSchemas.ts');
        const dialog = read('features/produtos/components/ProdutoComplementoDialogs.tsx');
        const tests = read('tests/unit/produtosPayload.test.ts');

        expect(types).toContain('codigoProdutoFornecedor?: string | null');
        expect(schema).toContain('codigoProdutoFornecedor: nullableText');
        expect(dialog).toContain('Código do produto no fornecedor');
        expect(dialog).toContain('Number(item.status) === EntityStatus.Ativo');
        expect(tests).toContain('codigoProdutoFornecedor');

        const requestType = types.match(/VincularFornecedorProdutoRequest\s*=\s*{[\s\S]*?};/)?.[0] ?? '';
        expect(requestType).not.toContain('descricaoFornecedor');
    });

    it('normaliza placeholders, constraints e query string para comparar METHOD + path', () => {
        expect(normalizePath('/api/vendas/pedidos/{id:guid}?empresaId=x')).toBe('/api/vendas/pedidos/{param}');
        const routes = parseBackendCatalog('### `api/vendas/pedidos`\n| Método | Caminho | Permissão | Assinatura |\n| --- | --- | --- | --- |\n| `GET` | `/{id:guid}` | — | — |');
        expect(routes[0].key).toBe('GET /api/vendas/pedidos/{param}');
    });

    it('separa rota ausente de método divergente', () => {
        const backend = [
            { method: 'POST', path: '/api/bancos', key: 'POST /api/bancos' },
            { method: 'GET', path: '/api/rh/ferias', key: 'GET /api/rh/ferias' }
        ];
        const frontend = [
            { method: 'GET', path: '/api/bancos', key: 'GET /api/bancos', file: 'fixture.ts', line: 1, unresolved: false },
            { method: 'GET', path: '/api/inexistente', key: 'GET /api/inexistente', file: 'fixture.ts', line: 2, unresolved: false }
        ];
        const comparison = compareContractMap(frontend, backend);

        expect(comparison.methodMismatch).toHaveLength(1);
        expect(comparison.methodMismatch[0].backendMethods).toEqual(['POST']);
        expect(comparison.missing).toHaveLength(1);
        expect(comparison.incompatible).toHaveLength(2);
    });

    it('resolve constantes, templates e clients indiretos sem divergências do contrato canônico', () => {
        const result = readContractMapInputs(root);
        expect(result.backendRoutes).toHaveLength(576);
        expect(new Set(result.frontendRoutes.map((route: { key: string }) => route.key)).size).toBeGreaterThanOrEqual(450);
        expect(result.comparison.incompatible).toEqual([]);
        expect(result.comparison.methodMismatch).toEqual([]);
        expect(result.comparison.indirectMissing).toEqual([]);
        expect(result.comparison.unresolved).toEqual([]);
    });

    it('não trata allowlist como supressão silenciosa', () => {
        const allowlist = JSON.parse(read('scripts/backend-contract-map.allowlist.json'));
        const result = readContractMapInputs(root);
        const comparison = compareContractMap(result.frontendRoutes, result.backendRoutes);
        expect(allowlist.suppressions).toEqual([]);
        expect(allowlist.documentedDivergences).toEqual([]);
        expect(new Set(allowlist.documentedDivergences.map((item: { method: string; path: string }) => `${item.method} ${normalizePath(item.path)}`))).toEqual(new Set(comparison.incompatible.map((item: { key: string }) => item.key)));
    });

    it('rejeita allowlist duplicada, expirada ou supressora', () => {
        const base = JSON.parse(read('scripts/backend-contract-map.allowlist.json'));
        const invalid = {
            ...base,
            auditPolicy: { ...base.auditPolicy, expiresAt: '2026-01-01T00:00:00-03:00' },
            suppressions: [{ id: 'nao-permitido' }],
        documentedDivergences: [
            { id: 'rota-duplicada', method: 'GET', path: '/api/exemplo' },
            { id: 'rota-duplicada', method: 'GET', path: '/api/exemplo' }
        ]
        };
        const issues = validateAuditAllowlist(invalid, {
            version: '1.11.0a8b45.c1',
            contractDocument: 'docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md',
            now: new Date('2026-08-12T12:00:00-03:00')
        });

        expect(issues.some((issue: string) => issue.includes('expirado'))).toBe(true);
        expect(issues.some((issue: string) => issue.includes('suprimidas'))).toBe(true);
        expect(issues.some((issue: string) => issue.includes('id duplicado'))).toBe(true);
        expect(issues.some((issue: string) => issue.includes('rota duplicada'))).toBe(true);
    });
});
