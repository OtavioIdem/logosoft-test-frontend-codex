import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('backend contract map B38', () => {
    it('mantem gate, allowlist e documentação de contrato versionados', () => {
        const packageJson = JSON.parse(read('package.json'));
        const allowlist = JSON.parse(read('scripts/backend-contract-map.allowlist.json'));
        const doc = read('docs/CONTRATO_FRONTEND_BACKEND_B38.md');

        expect(packageJson.scripts['validate:backend-contract-map']).toBe('node scripts/validate-backend-contract-map.mjs');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:backend-contract-map');
        expect(allowlist.version).toBe(packageJson.logosoftVersion);
        expect(allowlist.documentedDivergences.length).toBeGreaterThanOrEqual(10);
        expect(doc).toContain('PRODUTO_FORNECEDOR_ALINHADO_B37');
        expect(doc).toContain('FINANCEIRO_BAIXAR_VS_RECEBER_PAGAR');
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
});
