import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Faturamento — estrutura e scaffold', () => {
    it('client expõe endpoints reais (lista, detalhe, histórico, ocorrências, wizard)', () => {
        const api = read('features/faturamento/api/faturamentoApi.ts');
        expect(api).toContain("'/api/faturamento'");
        expect(api).toContain('/api/faturamento/${id}/historico');
        expect(api).toContain('/api/faturamento/${id}/ocorrencias');
        expect(api).toContain("'/api/faturamento/preparar'");
        expect(api).toContain('/api/faturamento/${id}/confirmar');
        expect(api).toContain('/api/faturamento/${id}/cancelar');
    });

    it('registra as 4 permissões de Faturamento no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'FATURAMENTO_CONSULTAR'");
        expect(erp).toContain("'FATURAMENTO_PREPARAR'");
        expect(erp).toContain("'FATURAMENTO_CONFIRMAR'");
        expect(erp).toContain("'FATURAMENTO_CANCELAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        expect(read('lib/security/routePermissions.ts')).toContain('/^\\/faturamento');
        expect(read('layout/AppMenu.tsx')).toContain("to: '/faturamento'");
        expect(read('app/(main)/faturamento/page.tsx')).toContain('FaturamentoPage');
        expect(read('app/(main)/faturamento/[id]/page.tsx')).toContain('FaturamentoDetalhePage');
    });

    it('lista usa paginação server-side e wizard Preparar exibe alertas/já existia', () => {
        const lista = read('features/faturamento/components/FaturamentoPage.tsx');
        expect(lista).toContain('pageSize: rows');
        expect(lista).toContain('totalRecords={totalRecords}');
        expect(lista).toContain('result.jaExistia');
        expect(lista).toContain('result.alertas');
        expect(lista).toContain('PrepararFaturamentoDialog');
    });

    it('detalhe confirma com dados fiscais, exibe alertas e faz dogfooding de Anexos', () => {
        const detalhe = read('features/faturamento/components/FaturamentoDetalhePage.tsx');
        expect(detalhe).toContain("permission=\"FATURAMENTO_CONFIRMAR\"");
        expect(detalhe).toContain('ConfirmarFaturamentoDialog');
        expect(detalhe).toContain('result.alertas');
        expect(detalhe).toContain('AnexosPanel');
        const dialogs = read('features/faturamento/components/FaturamentoDialogs.tsx');
        expect(dialogs).toContain('ufAutorizadora');
        expect(dialogs).toContain('primeiraDataVencimentoContaReceber');
    });
});
