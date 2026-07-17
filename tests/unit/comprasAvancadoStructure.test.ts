import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Compras avançado — estrutura e scaffold', () => {
    it('client expõe endpoints reais de solicitações, cotações e recebimentos', () => {
        const api = read('features/compras-avancado/api/comprasAvancadoApi.ts');
        expect(api).toContain("'/api/compras/solicitacoes'");
        expect(api).toContain('/api/compras/solicitacoes/${id}/aprovar');
        expect(api).toContain("'/api/compras/cotacoes'");
        expect(api).toContain('/api/compras/cotacoes/${id}/aprovar');
        expect(api).toContain('/api/compras/cotacoes/${id}/recusar');
        expect(api).toContain("'/api/compras/recebimentos/divergencias'");
        expect(api).toContain('/api/compras/recebimentos/${id}/conferencia-fiscal');
    });

    it('registra as 7 permissões novas no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        for (const code of ['COMPRAS_SOLICITACOES_CONSULTAR', 'COMPRAS_SOLICITACOES_GERENCIAR', 'COMPRAS_SOLICITACOES_APROVAR', 'COMPRAS_COTACOES_CONSULTAR', 'COMPRAS_COTACOES_GERENCIAR', 'COMPRAS_COTACOES_APROVAR', 'COMPRAS_CONFERENCIA_FISCAL_REGISTRAR']) {
            expect(erp).toContain(`'${code}'`);
        }
    });

    it('regras de rota específicas vêm antes da genérica /compras', () => {
        const rotas = read('lib/security/routePermissions.ts');
        const idxSolic = rotas.indexOf('/compras\\/solicitacoes');
        const idxCot = rotas.indexOf('/compras\\/cotacoes');
        const idxReceb = rotas.indexOf('/compras\\/recebimentos');
        const idxGen = rotas.indexOf("pattern: /^\\/compras(?:");
        expect(idxSolic).toBeGreaterThan(-1);
        expect(idxSolic).toBeLessThan(idxGen);
        expect(idxCot).toBeLessThan(idxGen);
        expect(idxReceb).toBeLessThan(idxGen);
    });

    it('registra menu e rotas (registros centrais)', () => {
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/compras/solicitacoes'");
        expect(menu).toContain("to: '/compras/cotacoes'");
        expect(menu).toContain("to: '/compras/recebimentos'");
        expect(read('app/(main)/compras/solicitacoes/page.tsx')).toContain('SolicitacoesCompraPage');
        expect(read('app/(main)/compras/cotacoes/[id]/page.tsx')).toContain('CotacaoCompraDetalhePage');
        expect(read('app/(main)/compras/recebimentos/page.tsx')).toContain('RecebimentosCompraPage');
    });

    it('cotação aprovada sinaliza pedido gerado e recebimentos registram conferência fiscal', () => {
        const cotacao = read('features/compras-avancado/components/CotacaoCompraDetalhePage.tsx');
        expect(cotacao).toContain("permission=\"COMPRAS_COTACOES_APROVAR\"");
        expect(cotacao).toContain('pedido de compra gerado');
        const receb = read('features/compras-avancado/components/RecebimentosCompraPage.tsx');
        expect(receb).toContain("permission=\"COMPRAS_CONFERENCIA_FISCAL_REGISTRAR\"");
        expect(receb).toContain('ConferenciaFiscalDialog');
    });
});
