import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Estoque avançado — estrutura e scaffold', () => {
    it('client expõe endpoints reais de inventários, ajustes e bloqueios', () => {
        const api = read('features/estoque-avancado/api/estoqueAvancadoApi.ts');
        expect(api).toContain("'/api/estoque/avancado/inventarios'");
        expect(api).toContain('/api/estoque/avancado/inventarios/${id}/iniciar-contagem');
        expect(api).toContain('/api/estoque/avancado/inventarios/${id}/concluir');
        expect(api).toContain("'/api/estoque/avancado/ajustes'");
        expect(api).toContain("'/api/estoque/avancado/bloqueios'");
        expect(api).toContain('/api/estoque/avancado/bloqueios/${id}/liberar');
        expect(api).toContain('/api/estoque/avancado/bloqueios/${id}/cancelar');
    });

    it('normaliza lista paginada aninhada ({ resultado })', () => {
        const api = read('features/estoque-avancado/api/estoqueAvancadoApi.ts');
        expect(api).toContain("'resultado' in data");
    });

    it('registra as 2 permissões novas (ESTOQUE_AJUSTAR e ESTOQUE_BLOQUEIO_GERENCIAR)', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'ESTOQUE_AJUSTAR'");
        expect(erp).toContain("'ESTOQUE_BLOQUEIO_GERENCIAR'");
    });

    it('registra rota (antes da genérica /estoque) e menu', () => {
        const rotas = read('lib/security/routePermissions.ts');
        const idxAvancado = rotas.indexOf('/estoque\\/avancado');
        const idxGen = rotas.indexOf("pattern: /^\\/estoque(?:");
        expect(idxAvancado).toBeGreaterThan(-1);
        expect(idxAvancado).toBeLessThan(idxGen);
        expect(read('layout/AppMenu.tsx')).toContain("to: '/estoque/avancado'");
        expect(read('app/(main)/estoque/avancado/page.tsx')).toContain('EstoqueAvancadoPage');
    });

    it('bloqueios são o ponto de liberação de Qualidade/Alimentar', () => {
        const bloqueios = read('features/estoque-avancado/components/BloqueiosEstoqueTab.tsx');
        expect(bloqueios).toContain('Qualidade');
        expect(bloqueios).toContain("permission=\"ESTOQUE_BLOQUEIO_GERENCIAR\"");
        expect(bloqueios).toContain('Liberar bloqueio');
    });
});
