import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Serviços (piloto) — estrutura e scaffold', () => {
    it('client expõe todos os endpoints reais da OS', () => {
        const api = read('features/servicos/api/servicosApi.ts');
        expect(api).toContain("const BASE = '/api/servicos/ordens'");
        expect(api).toContain('${BASE}/${id}');
        expect(api).toContain('${BASE}/${id}/triar');
        expect(api).toContain('${BASE}/${id}/planejar');
        expect(api).toContain('${BASE}/${id}/iniciar-execucao');
        expect(api).toContain('${BASE}/${id}/itens');
        expect(api).toContain('${BASE}/${id}/encerrar');
        expect(api).toContain('${BASE}/${id}/faturar');
        expect(api).toContain('${BASE}/${id}/cancelar');
    });

    it('registra as 4 permissões de Serviços no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'SERVICOS_CONSULTAR'");
        expect(erp).toContain("'SERVICOS_GERENCIAR'");
        expect(erp).toContain("'SERVICOS_APONTAR'");
        expect(erp).toContain("'SERVICOS_FATURAR'");
    });

    it('registra rota e menu (registros centrais)', () => {
        const rotas = read('lib/security/routePermissions.ts');
        expect(rotas).toContain('/^\\/servicos');
        expect(rotas).toContain('SERVICOS_CONSULTAR');
        const menu = read('layout/AppMenu.tsx');
        expect(menu).toContain("to: '/servicos/ordens'");
        const pageList = read('app/(main)/servicos/ordens/page.tsx');
        expect(pageList).toContain('OrdensServicoPage');
        expect(pageList).not.toContain('ModulePlaceholderPage');
        const pageDetail = read('app/(main)/servicos/ordens/[id]/page.tsx');
        expect(pageDetail).toContain('OrdemServicoDetalhePage');
    });

    it('lista e detalhe gateiam por permissão e usam o padrão corrigido (SearchInput/useMutationWithToast)', () => {
        const lista = read('features/servicos/components/OrdensServicoPage.tsx');
        expect(lista).toContain("hasPermission('SERVICOS_CONSULTAR')");
        expect(lista).toContain('SearchInput');
        expect(lista).toContain('useMutationWithToast');
        const detalhe = read('features/servicos/components/OrdemServicoDetalhePage.tsx');
        expect(detalhe).toContain("permission=\"SERVICOS_APONTAR\"");
        expect(detalhe).toContain("permission=\"SERVICOS_FATURAR\"");
    });

    it('detalhe faz dogfooding do widget de Anexos (Onda 0)', () => {
        const detalhe = read('features/servicos/components/OrdemServicoDetalhePage.tsx');
        expect(detalhe).toContain('AnexosPanel');
        expect(detalhe).toContain('modulo="Servicos"');
        expect(detalhe).toContain('entidade="OrdemServico"');
    });
});
