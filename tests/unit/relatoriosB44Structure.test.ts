import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { metricEntries } from '@/features/relatorios/components/relatoriosMetricUtils';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('relatórios B44 structure', () => {
    it('expõe página real no menu e no guard de rotas', () => {
        const page = read('app/(main)/relatorios/page.tsx');
        const component = read('features/relatorios/components/RelatoriosPage.tsx');
        const menu = read('layout/AppMenu.tsx');
        const routes = read('lib/security/routePermissions.ts');
        const erpTypes = read('types/erp.ts');

        expect(page).toContain('RelatoriosPage');
        expect(page).not.toContain('ModulePlaceholderPage');
        expect(component).toContain('RELATORIOS_OPERACIONAIS_CONSULTAR');
        expect(menu).toContain('/relatorios');
        expect(menu).toContain('RELATORIOS_OPERACIONAIS_CONSULTAR');
        expect(routes).toContain('^\\/relatorios');
        expect(erpTypes).toContain("'RELATORIOS_OPERACIONAIS_CONSULTAR'");
    });

    it('cobre endpoints operacionais e gerenciais por módulo', () => {
        const api = read('features/relatorios/api/relatoriosApi.ts');

        expect(api).toContain('/api/relatorios/operacional/geral');
        expect(api).toContain('/api/relatorios/gerenciais/vendas');
        expect(api).toContain('/api/relatorios/gerenciais/compras');
        expect(api).toContain('/api/relatorios/gerenciais/financeiro');
        expect(api).toContain('/api/relatorios/gerenciais/estoque');
        expect(api).toContain('/api/relatorios/gerenciais/fiscal');
    });

    it('mantém filtros e KPIs sem recálculo ou exposição visual de GUID bruto', () => {
        const component = read('features/relatorios/components/RelatoriosPage.tsx');
        const utils = read('features/relatorios/components/relatoriosMetricUtils.ts');

        expect(component).toContain('EmpresaFilialFilter');
        expect(component).toContain('relatorioDataInicial');
        expect(component).toContain('relatorioDataFinal');
        expect(component).toContain('frontend não recalcula indicadores');
        expect(component).toContain('não expõe IDs técnicos');
        expect(utils).toContain('isTechnicalKey');
        expect(utils).toContain('isUuidString');
        expect(component).not.toContain('empresaId}</');
        expect(component).not.toContain('filialId}</');
    });



    it('bloqueia GUID bruto mesmo quando vier em chave textual não técnica', () => {
        const entries = metricEntries({
            titulo: 'Resumo mensal',
            nomeOrigem: '33333333-3333-3333-3333-333333333333',
            totalPedidos: 12,
            pedidoVendaId: '44444444-4444-4444-4444-444444444444'
        });

        expect(entries).toContainEqual({ label: 'Titulo', value: 'Resumo mensal' });
        expect(entries).toContainEqual({ label: 'Total Pedidos', value: '12' });
        expect(entries.some((entry) => entry.value === '33333333-3333-3333-3333-333333333333')).toBe(false);
        expect(entries.some((entry) => entry.value === '44444444-4444-4444-4444-444444444444')).toBe(false);
    });

    it('mantém relatórios sem exceções no mapa de contrato', () => {
        const allowlist = read('scripts/backend-contract-map.allowlist.json');
        const contractDoc = read('docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md');

        expect(JSON.parse(allowlist).documentedDivergences).toEqual([]);
        expect(contractDoc).toContain('### `api/relatorios/operacional`');
        expect(contractDoc).toContain('| `GET` | `/geral`');
        expect(contractDoc).toContain('### `api/relatorios/gerenciais`');
        expect(contractDoc).toContain('| `GET` | `/exportar`');
    });
});
