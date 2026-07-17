import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('PDV — estrutura e scaffold', () => {
    it('client expõe endpoints reais de caixas e vendas', () => {
        const api = read('features/pdv/api/pdvApi.ts');
        expect(api).toContain("'/api/pdv/caixas'");
        expect(api).toContain("'/api/pdv/caixas/abrir'");
        expect(api).toContain('/api/pdv/caixas/${id}/suprimento');
        expect(api).toContain('/api/pdv/caixas/${id}/sangria');
        expect(api).toContain('/api/pdv/caixas/${id}/fechar');
        expect(api).toContain("'/api/pdv/vendas'");
    });

    it('registra as 3 permissões de PDV no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'PDV_CONSULTAR'");
        expect(erp).toContain("'PDV_CAIXA_GERENCIAR'");
        expect(erp).toContain("'PDV_VENDER'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/pdv');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/pdv/caixas'");
        expect(menu).toContain("to: '/pdv/vendas'");
        expect(read('app/(main)/pdv/caixas/page.tsx')).toContain('CaixasPdvPage');
        expect(read('app/(main)/pdv/vendas/page.tsx')).toContain('VendaPdvPage');
    });

    it('tela de venda calcula troco, exige caixa aberto e total pago >= líquido', () => {
        const venda = read('features/pdv/components/VendaPdvPage.tsx');
        expect(venda).toContain('const troco = Math.max(0, pago - liquido)');
        expect(venda).toContain('pago >= liquido');
        expect(venda).toContain("permission=\"PDV_VENDER\"");
        expect(venda).toContain('StatusCaixa.Aberto');
    });

    it('fechamento de caixa faz conferência (esperado × informado × diferença)', () => {
        const dialogs = read('features/pdv/components/CaixaDialogs.tsx');
        expect(dialogs).toContain('saldoDinheiroEsperado');
        expect(dialogs).toContain('const diferenca = valorInformado - esperado');
    });
});
