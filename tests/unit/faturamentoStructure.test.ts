import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Faturamento — estrutura e scaffold', () => {
    it('client expõe endpoints reais (lista, detalhe, histórico, ocorrências, wizard, retomar-reversao)', () => {
        const api = read('features/faturamento/api/faturamentoApi.ts');
        expect(api).toContain("'/api/faturamento'");
        expect(api).toContain('/api/faturamento/${id}/historico');
        expect(api).toContain('/api/faturamento/${id}/ocorrencias');
        expect(api).toContain("'/api/faturamento/preparar'");
        expect(api).toContain('/api/faturamento/${id}/confirmar');
        expect(api).toContain('/api/faturamento/${id}/cancelar');
        expect(api).toContain('/api/faturamento/${id}/retomar-reversao');
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

    it('AC-13: FaturamentoPage.tsx não contém legs, possuiLeg ou etapaDivergeDosLegs', () => {
        const page = read('features/faturamento/components/FaturamentoPage.tsx');
        expect(page).not.toContain('legs');
        expect(page).not.toContain('possuiLeg');
        expect(page).not.toContain('etapaDivergeDosLegs');
    });

    it('AC-14: detalhe registra permission FATURAMENTO_RETOMAR_REVERSAO', () => {
        const detalhe = read('features/faturamento/components/FaturamentoDetalhePage.tsx');
        expect(detalhe).toContain('permission="FATURAMENTO_RETOMAR_REVERSAO"');
    });

    it('AC-14: routePermissions.ts e AppMenu.tsx ficam sem diff na lista anyOf de Faturamento', () => {
        const routePermissions = read('lib/security/routePermissions.ts');
        expect(routePermissions).toContain(
            "anyOf: ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_PREPARAR', 'FATURAMENTO_CONFIRMAR', 'FATURAMENTO_CANCELAR'], description: 'Faturamento'"
        );

        const appMenu = read('layout/AppMenu.tsx');
        expect(appMenu).toContain(
            "anyPermissions: ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_PREPARAR', 'FATURAMENTO_CONFIRMAR', 'FATURAMENTO_CANCELAR'],"
        );
        expect(appMenu).toContain(
            "to: '/faturamento', anyPermissions: ['FATURAMENTO_CONSULTAR', 'FATURAMENTO_PREPARAR'] }"
        );
    });

    it('confirmar, cancelar e retomar usam onSettled', () => {
        const hooks = read('features/faturamento/hooks/useFaturamentoResources.ts');
        // Deve conter onSettled em todas as mutações
        expect(hooks).toContain('confirmarMutation = useMutation({ mutationFn:');
        expect(hooks).toContain('onSettled: invalidate');
        expect(hooks).toContain('cancelarMutation = useMutation({ mutationFn:');
        expect(hooks).toContain('retomarReversaoMutation = useMutation({ mutationFn:');
        // Verificar que todas as mutações têm onSettled (contando quantas vezes aparece)
        const onSettledCount = (hooks.match(/onSettled: invalidate/g) || []).length;
        expect(onSettledCount).toBeGreaterThanOrEqual(3);
    });
});
