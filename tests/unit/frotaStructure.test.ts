import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Frota (Onda 2) — estrutura e scaffold', () => {
    it('client expõe os endpoints reais de Frota', () => {
        const api = read('features/frota/api/frotaApi.ts');
        expect(api).toContain("const VEICULOS = '/api/frota/veiculos'");
        expect(api).toContain("const MOTORISTAS = '/api/frota/motoristas'");
        expect(api).toContain("const VIAGENS = '/api/frota/viagens'");
        expect(api).toContain('${VEICULOS}/${id}/status');
        expect(api).toContain('${VEICULOS}/abastecimentos');
        expect(api).toContain('${VEICULOS}/manutencoes');
        expect(api).toContain('${VEICULOS}/manutencoes/${id}/concluir');
        expect(api).toContain('${VEICULOS}/manutencoes/${id}/cancelar');
        expect(api).toContain('${VEICULOS}/despesas');
        expect(api).toContain('${VEICULOS}/documentos');
        expect(api).toContain('${VIAGENS}/${id}/encerrar');
        expect(api).toContain('${VIAGENS}/${id}/cancelar');
    });

    it('registra as 2 permissões de Frota no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'FROTA_CONSULTAR'");
        expect(erp).toContain("'FROTA_GERENCIAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/frota');
        expect(rotas).toContain('FROTA_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/frota/veiculos'");
        expect(menu).toContain("to: '/frota/motoristas'");
        expect(menu).toContain("to: '/frota/viagens'");
        const pageList = read('app/(main)/frota/veiculos/page.tsx');
        expect(pageList).toContain('VeiculosPage');
        expect(pageList).not.toContain('ModulePlaceholderPage');
        const pageDetail = read('app/(main)/frota/veiculos/[id]/page.tsx');
        expect(pageDetail).toContain('VeiculoDetalhePage');
    });

    it('lista e detalhe gateiam por permissão e usam o padrão corrigido (SearchInput/useMutationWithToast)', () => {
        const lista = read('features/frota/components/VeiculosPage.tsx');
        expect(lista).toContain("hasPermission('FROTA_CONSULTAR')");
        expect(lista).toContain('SearchInput');
        expect(lista).toContain('useMutationWithToast');
        const detalhe = read('features/frota/components/VeiculoDetalhePage.tsx');
        expect(detalhe).toContain('permission="FROTA_GERENCIAR"');
    });

    it('detalhe do veículo faz dogfooding do widget de Anexos (Onda 0)', () => {
        const detalhe = read('features/frota/components/VeiculoDetalhePage.tsx');
        expect(detalhe).toContain('AnexosPanel');
        expect(detalhe).toContain('modulo="Frota"');
        expect(detalhe).toContain('entidade="Veiculo"');
    });
});
