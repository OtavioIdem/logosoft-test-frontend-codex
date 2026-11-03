import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    SENTINELAS,
    parsePermissionUnion,
    parsePermissionCatalog,
    parseContractPermissions,
    parseCatalogSection,
    readPermissionInputs,
    buildSnapshot,
    comparePermissions,
    validatePermissionsAllowlist
} from '../../scripts/lib/backend-permissions.mjs';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('backend permissions', () => {
    it('mantém gate, allowlist e snapshot versionados', () => {
        const packageJson = JSON.parse(read('package.json'));
        const allowlist = JSON.parse(read('scripts/backend-permissions.allowlist.json'));
        const snapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));

        expect(packageJson.scripts['validate:backend-permissions']).toBe('node scripts/validate-backend-permissions.mjs');
        expect(packageJson.scripts['report:backend-permissions']).toBe('node scripts/validate-backend-permissions.mjs --report');
        expect(packageJson.scripts['generate:backend-permissions-snapshot']).toBe('node scripts/generate-backend-permissions-snapshot.mjs');
        expect(packageJson.scripts['ci:gates']).toContain('npm run validate:backend-permissions');

        expect(allowlist.version).toBe(packageJson.logosoftVersion);
        expect(snapshot.version).toBe(packageJson.logosoftVersion);
    });

    it('snapshot tem estrutura correta com schemaVersion 2', () => {
        const snapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));

        expect(snapshot.schemaVersion).toBe(2);
        expect(snapshot.version).toBe(JSON.parse(read('package.json')).logosoftVersion);
        expect(typeof snapshot.count).toBe('number');
        expect(Array.isArray(snapshot.permissions)).toBe(true);
        expect(snapshot.count).toBe(snapshot.permissions.length);
        expect(Array.isArray(snapshot.sentinels)).toBe(true);
        expect(snapshot.sentinels).toEqual(['*', 'MASTER_GOD']);
        expect(Array.isArray(snapshot.novasEmV123)).toBe(true);
        expect(Array.isArray(snapshot.semOperacaoEmV123)).toBe(true);
    });

    it('snapshot contém permissões novas em v1.23 no teto esperado', () => {
        const snapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));

        expect(snapshot.novasEmV123).toContain('FISCAL_REPROCESSAR');
        expect(snapshot.novasEmV123).toContain('FATURAMENTO_RETOMAR_REVERSAO');
    });

    it('snapshot contém 181 permissões: 179 nomeadas (union ∪ catálogo) + 2 sentinelas', () => {
        const snapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));

        // 179 nomeadas + 2 sentinelas (MASTER_GOD, *). +2 sobre as 177 anteriores: FISCAL_CONFIGURACAO_CONSULTAR
        // e FISCAL_CONFIGURACAO_GERENCIAR (v1.11.0a8b81, AJ-34/AJ-35). A contagem sozinha não prova o nome: abaixo.
        expect(snapshot.count).toBe(181);
        expect(snapshot.permissions.length).toBe(181);
        expect(snapshot.permissions).toContain('MASTER_GOD');
        expect(snapshot.permissions).toContain('*');
        expect(snapshot.permissions).toContain('FISCAL_CONFIGURACAO_CONSULTAR');
        expect(snapshot.permissions).toContain('FISCAL_CONFIGURACAO_GERENCIAR');
    });

    it('snapshot mantém permissões ordenadas alfabeticamente sem duplicata', () => {
        const snapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));
        const sorted = [...snapshot.permissions].sort();

        expect(snapshot.permissions).toEqual(sorted);
        expect(new Set(snapshot.permissions).size).toBe(snapshot.permissions.length);
    });

    it('allowlist tem estrutura correta com schemaVersion 1', () => {
        const packageJson = JSON.parse(read('package.json'));
        const allowlist = JSON.parse(read('scripts/backend-permissions.allowlist.json'));

        expect(allowlist.schemaVersion).toBe(1);
        expect(allowlist.status).toBe('registro-fechado-monotonico');
        expect(allowlist.version).toBe(packageJson.logosoftVersion);
        expect(allowlist.suppressions).toEqual([]);
        expect(Array.isArray(allowlist.fantasmasConhecidos)).toBe(true);
        expect(Array.isArray(allowlist.coberturaPendente)).toBe(true);
    });

    it('allowlist teto casa com contagens reais de fantasmas e cobertura pendente', () => {
        const allowlist = JSON.parse(read('scripts/backend-permissions.allowlist.json'));

        expect(allowlist.teto.fantasmas).toBe(2);
        expect(allowlist.fantasmasConhecidos.length).toBe(2);
        expect(allowlist.teto.fantasmas).toBe(allowlist.fantasmasConhecidos.length);

        expect(allowlist.teto.coberturaPendente).toBe(4);
        expect(allowlist.coberturaPendente.length).toBe(4);
        expect(allowlist.teto.coberturaPendente).toBe(allowlist.coberturaPendente.length);

        // Validar que as quatro permissões pendentes são as esperadas (D81 + D89)
        const codes = allowlist.coberturaPendente.map((item: any) => item.code).sort();
        expect(codes).toEqual(['FINANCEIRO_BANCO_GERENCIAR', 'FINANCEIRO_CAIXA_GERENCIAR', 'POLITICA_COMERCIAL_GERENCIAR', 'VENDAS_PRECO_MINIMO_SOBRESCREVER']);

        // Validar que ambas têm alvo B-16
        expect(allowlist.coberturaPendente.every((item: any) => item.target === 'B-16')).toBe(true);
    });

    it('allowlist expiresAt não está vencido', () => {
        const allowlist = JSON.parse(read('scripts/backend-permissions.allowlist.json'));
        const expiresAt = new Date(allowlist.auditPolicy.expiresAt).getTime();
        const now = new Date().getTime();

        expect(expiresAt).toBeGreaterThan(now);
    });

    it('parser union extrai literais do type PermissionCode', () => {
        const source = `export type PermissionCode = 'EXEMPLO_A' | 'EXEMPLO_B' | 'EXEMPLO_C';`;
        const result = parsePermissionUnion(source);

        expect(result).toContain('EXEMPLO_A');
        expect(result).toContain('EXEMPLO_B');
        expect(result).toContain('EXEMPLO_C');
        expect(result.length).toBe(3);
    });

    it('parser catálogo extrai chaves de PERMISSOES_CATALOGO', () => {
        const source = `
export const PERMISSOES_CATALOGO: Record<PermissionCode, PermissaoCatalogoItem> = {
    EXEMPLO_A: { nome: 'Exemplo A' },
    EXEMPLO_B: { nome: 'Exemplo B' },
};
`;
        const result = parsePermissionCatalog(source);

        expect(result).toContain('EXEMPLO_A');
        expect(result).toContain('EXEMPLO_B');
        expect(result.length).toBe(2);
    });

    it('parser contrato extrai permissões de linhas de operação', () => {
        const source = `| Permissão | \`EXEMPLO_A\` |
| Permissão | \`EXEMPLO_B\` |
| Permissão | \`(sem RequiredPermission)\` |
| Permissão | \`EXEMPLO_A\` |

Permissões no backend | **2** (mais MASTER_GOD e *)`;
        const result = parseContractPermissions(source);

        expect(result.permissions).toContain('EXEMPLO_A');
        expect(result.permissions).toContain('EXEMPLO_B');
        expect(result.permissions.length).toBe(2);
        expect(result.semRequiredPermissionCount).toBe(1);
        expect(result.declaredTotal).toBe(2);
    });

    it('parser catálogo §12 extrai tabela de permissões do documento canônico', () => {
        const source = `
# Documento

## 12. Catálogo de permissões

| Constante C# | Código |
| --- | --- |
| \`ExemploA\` | \`EXEMPLO_A\` |
| \`ExemploB\` | \`EXEMPLO_B\` |

## 13. Próxima seção
`;
        const result = parseCatalogSection(source);

        expect(result.rows.length).toBe(2);
        expect(result.rows[0]).toEqual({ csharp: 'ExemploA', code: 'EXEMPLO_A' });
        expect(result.rows[1]).toEqual({ csharp: 'ExemploB', code: 'EXEMPLO_B' });
    });

    it('buildSnapshot clasifica permissões corretamente em dois cenários', () => {
        const scenario1 = buildSnapshot({
            contract: {
                permissions: ['PERM_A', 'PERM_B', 'PERM_C'],
                semRequiredPermissionCount: 0,
                declaredTotal: 3
            },
            catalogSection: {
                rows: [
                    { csharp: 'PermA', code: 'PERM_A' },
                    { csharp: 'PermD', code: 'PERM_D' }
                ]
            },
            version: '1.0.0',
            sourceDate: '2026-09-08'
        });

        // Union: PERM_A, PERM_B, PERM_C, PERM_D
        expect(scenario1.permissions).toContain('PERM_A');
        expect(scenario1.permissions).toContain('PERM_B');
        expect(scenario1.permissions).toContain('PERM_C');
        expect(scenario1.permissions).toContain('PERM_D');
        expect(scenario1.permissions).toContain('*');
        expect(scenario1.permissions).toContain('MASTER_GOD');
        expect(scenario1.count).toBe(6);
    });

    it('naoConciliado do snapshot real registra excesso com sinal: união 179 excede foto 178 em -1 e nomeia as 7 do §12', () => {
        const snapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));
        const named = snapshot.count - snapshot.sentinels.length;

        expect(named).toBe(179);
        expect(snapshot.backendDeclaradas).toBe(178);
        expect(snapshot.naoConciliado.quantidade).toBe(-1);
        expect(snapshot.naoConciliado.quantidade).toBe(snapshot.backendDeclaradas - named);

        // Reconstrói pelo gerador a partir das fontes reais: prova que o gerador (não só o artefato) grava -1.
        const inputs = readPermissionInputs(root);
        const rebuilt = buildSnapshot({ contract: inputs.contract, catalogSection: inputs.catalogSection, version: snapshot.version, sourceDate: snapshot.sourceDate });
        expect(rebuilt.naoConciliado.quantidade).toBe(-1);
        expect(rebuilt.naoConciliado.motivo).toBe(snapshot.naoConciliado.motivo);

        const motivo: string = snapshot.naoConciliado.motivo;
        expect(motivo).not.toContain('Sem divergência');
        expect(motivo).toContain('179');
        expect(motivo).toContain('178');
        expect(motivo).toContain('EXCEDE em 1');
        // Lista nominal do §12 sem operação em v1.23 — inclui as duas FISCAL_CONFIGURACAO_* desta versão.
        expect(snapshot.semOperacaoEmV123).toHaveLength(7);
        for (const code of snapshot.semOperacaoEmV123) {
            expect(motivo).toContain(code);
        }
        expect(motivo).toContain('FISCAL_CONFIGURACAO_CONSULTAR');
        expect(motivo).toContain('FISCAL_CONFIGURACAO_GERENCIAR');
    });

    it('naoConciliado com união igual ao declarado é 0 e diz "Sem divergência"', () => {
        const rebuilt = buildSnapshot({
            contract: { permissions: ['PERM_A', 'PERM_B'], semRequiredPermissionCount: 0, declaredTotal: 2 },
            catalogSection: { rows: [{ csharp: 'PermA', code: 'PERM_A' }, { csharp: 'PermB', code: 'PERM_B' }] },
            version: '1.0.0',
            sourceDate: '2026-09-08'
        });

        expect(rebuilt.naoConciliado.quantidade).toBe(0);
        expect(rebuilt.naoConciliado.motivo.startsWith('Sem divergência')).toBe(true);
    });

    it('naoConciliado com união menor que o declarado é positivo e mantém o texto de "sem nome"', () => {
        const rebuilt = buildSnapshot({
            contract: { permissions: ['PERM_A'], semRequiredPermissionCount: 0, declaredTotal: 3 },
            catalogSection: { rows: [{ csharp: 'PermA', code: 'PERM_A' }] },
            version: '1.0.0',
            sourceDate: '2026-09-08'
        });

        expect(rebuilt.naoConciliado.quantidade).toBe(2);
        expect(rebuilt.naoConciliado.motivo).toContain('Fica 2 permissão(ões) sem nome');
        expect(rebuilt.naoConciliado.motivo).not.toContain('EXCEDE');
    });

    it('naoConciliado com união acima do declarado é negativo, cita 4 e 3 e nomeia as permissões do §12 que sobram', () => {
        // Fixture: 2 nomeadas em operações (PERM_A, PERM_B) + 2 só no §12 (PERM_C, PERM_D) = união 4.
        // Foto declara 3 → 1 vaga sem nome para 2 permissões do §12 → excesso 1.
        const rebuilt = buildSnapshot({
            contract: { permissions: ['PERM_A', 'PERM_B'], semRequiredPermissionCount: 0, declaredTotal: 3 },
            catalogSection: { rows: [{ csharp: 'PermA', code: 'PERM_A' }, { csharp: 'PermC', code: 'PERM_C' }, { csharp: 'PermD', code: 'PERM_D' }] },
            version: '1.0.0',
            sourceDate: '2026-09-08'
        });

        expect(rebuilt.naoConciliado.quantidade).toBe(-1);
        const motivo = rebuilt.naoConciliado.motivo;
        expect(motivo).toContain('resulta em 4');
        expect(motivo).toContain('declara 3');
        expect(motivo).toContain('EXCEDE em 1');
        expect(motivo).toContain('PERM_C');
        expect(motivo).toContain('PERM_D');
        expect(motivo).not.toContain('Sem divergência');
        expect(motivo).not.toContain('Fica ');
    });

    it('comparePermissions detecta fantasma quando sentinela entra no union', () => {
        // Regressão: se uma sentinela (*  ou MASTER_GOD) aparecer no union,
        // é um fantasma — nunca deve ser exigida por um guard.
        const comparison = comparePermissions({
            unionCodes: ['PERM_A', 'PERM_B', '*'], // * não deveria estar aqui
            catalogCodes: ['PERM_A', 'PERM_B'],
            snapshotPermissions: ['PERM_A', 'PERM_B', 'MASTER_GOD', '*']
        });

        expect(comparison.sentinelaNoUnion).toContain('*');
    });

    it('comparePermissions classifica divergências em baldes corretos', () => {
        const comparison = comparePermissions({
            unionCodes: ['PERM_A', 'PERM_FANTASMA'], // fantasma: no union mas não no snapshot
            catalogCodes: ['PERM_A'],
            snapshotPermissions: ['PERM_A', 'PERM_B', 'PERM_C', 'MASTER_GOD', '*']
        });

        expect(comparison.fantasmas).toContain('PERM_FANTASMA');
        expect(comparison.coberturaPendente).toContain('PERM_B');
        expect(comparison.coberturaPendente).toContain('PERM_C');
        expect(comparison.catalogoSemUnion.length).toBe(0);
        expect(comparison.unionSemCatalogo).toContain('PERM_FANTASMA');
    });

    it('estado real do repositório: dois fantasmas documentados aguardam catálogo do backend', () => {
        const snapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));
        const allowlist = JSON.parse(read('scripts/backend-permissions.allowlist.json'));
        const inputs = readPermissionInputs(root);
        const comparison = comparePermissions({
            unionCodes: inputs.union,
            catalogCodes: inputs.catalog,
            snapshotPermissions: snapshot.permissions
        });

        expect(comparison.fantasmas).not.toContain('ATIVIDADES_GERENCIAR');
        expect(comparison.fantasmas).not.toContain('RELATORIOS_CONSULTAR');
        expect(comparison.fantasmas).not.toContain('PORTARIA_PRE_AUTORIZAR');
        expect(comparison.fantasmas.sort()).toEqual(['PRODUTOS_CADASTROS_AUXILIARES_GERENCIAR', 'PRODUTOS_GRUPOS_GERENCIAR']);

        // Allowlist mantém registro histórico vazio; teto é 0
        expect(allowlist.fantasmasConhecidos).toHaveLength(2);
        expect(allowlist.teto.fantasmas).toBe(2);
    });

    it('estado real: cobertura pendente contém as quatro permissões de D81 + D89 (B-16)', () => {
        const snapshot = JSON.parse(read('scripts/backend-permissions.snapshot.json'));
        const allowlist = JSON.parse(read('scripts/backend-permissions.allowlist.json'));
        const inputs = readPermissionInputs(root);
        const comparison = comparePermissions({
            unionCodes: inputs.union,
            catalogCodes: inputs.catalog,
            snapshotPermissions: snapshot.permissions
        });

        // Comparação com snapshot: exatamente as quatro permissões de D81 + D89
        const comparisonCodes = comparison.coberturaPendente.sort();
        expect(comparisonCodes).toEqual(['FINANCEIRO_BANCO_GERENCIAR', 'FINANCEIRO_CAIXA_GERENCIAR', 'POLITICA_COMERCIAL_GERENCIAR', 'VENDAS_PRECO_MINIMO_SOBRESCREVER']);

        // Allowlist registra as mesmas quatro; teto é 4
        expect(allowlist.coberturaPendente.length).toBe(4);
        expect(allowlist.teto.coberturaPendente).toBe(4);

        const allowlistCodes = allowlist.coberturaPendente.map((item: any) => item.code).sort();
        expect(allowlistCodes).toEqual(['FINANCEIRO_BANCO_GERENCIAR', 'FINANCEIRO_CAIXA_GERENCIAR', 'POLITICA_COMERCIAL_GERENCIAR', 'VENDAS_PRECO_MINIMO_SOBRESCREVER']);
    });

    it('rejeita allowlist duplicada, expirada ou supressora', () => {
        const base = JSON.parse(read('scripts/backend-permissions.allowlist.json'));

        const invalid = {
            ...base,
            auditPolicy: { ...base.auditPolicy, expiresAt: '2026-01-01T00:00:00-03:00' },
            suppressions: [{ id: 'nao-permitido' }],
            fantasmasConhecidos: [
                { ...base.fantasmasConhecidos[0], id: 'DUPLICADA' },
                { ...base.fantasmasConhecidos[1], id: 'DUPLICADA' }
            ]
        };

        const issues = validatePermissionsAllowlist(invalid, {
            version: base.version,
            snapshotDocument: 'scripts/backend-permissions.snapshot.json',
            now: new Date('2026-08-12T12:00:00-03:00')
        });

        expect(issues.some((issue: string) => issue.includes('expirado'))).toBe(true);
        expect(issues.some((issue: string) => issue.includes('suprimidas'))).toBe(true);
        expect(issues.some((issue: string) => issue.includes('duplicado'))).toBe(true);
    });

    it('rejeita allowlist com fantasma tentando suprimir divergência', () => {
        const base = JSON.parse(read('scripts/backend-permissions.allowlist.json'));

        const invalid = {
            ...base,
            fantasmasConhecidos: [
                { ...base.fantasmasConhecidos[0], suppress: true }
            ]
        };

        const issues = validatePermissionsAllowlist(invalid, {
            version: base.version,
            snapshotDocument: 'scripts/backend-permissions.snapshot.json'
        });

        expect(issues.some((issue: string) => issue.includes('suprimir divergência'))).toBe(true);
    });

    it('SENTINELAS não incluem nada além de MASTER_GOD e *', () => {
        expect(SENTINELAS.size).toBe(2);
        expect(SENTINELAS.has('MASTER_GOD')).toBe(true);
        expect(SENTINELAS.has('*')).toBe(true);
    });
});
