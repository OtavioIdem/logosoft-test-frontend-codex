import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Onda 0 — transversais (Notificações + Anexos)', () => {
    it('registra as permissões novas no union PermissionCode', () => {
        const erp = read('types/erp.ts');
        expect(erp).toContain("'NOTIFICACOES_CONSULTAR'");
        expect(erp).toContain("'NOTIFICACOES_GERENCIAR'");
        expect(erp).toContain("'ANEXOS_CONSULTAR'");
        expect(erp).toContain("'ANEXOS_BAIXAR'");
        expect(erp).toContain("'ANEXOS_GERENCIAR'");
    });

    it('expõe client de notificações com todos os endpoints reais', () => {
        const api = read('features/notificacoes/api/notificacoesApi.ts');
        expect(api).toContain("'/api/notificacoes'");
        expect(api).toContain("'/api/notificacoes/nao-lidas/contagem'");
        expect(api).toContain('/api/notificacoes/${id}/marcar-lida');
        expect(api).toContain("'/api/notificacoes/marcar-todas-lidas'");
        expect(api).toContain('/api/notificacoes/${id}/arquivar');
    });

    it('sino de notificações faz polling, gateia por permissão e navega pela acaoUrl', () => {
        const bell = read('features/notificacoes/components/NotificacoesBell.tsx');
        expect(bell).toContain("hasPermission('NOTIFICACOES_CONSULTAR')");
        expect(bell).toContain('if (!podeConsultar) return null;');
        expect(bell).toContain('acaoUrl');
        expect(bell).toContain('router.push');
        const hooks = read('features/notificacoes/hooks/useNotificacoesResources.ts');
        expect(hooks).toContain('refetchInterval');
    });

    it('integra o sino no cabeçalho global', () => {
        const topbar = read('layout/AppTopbar.tsx');
        expect(topbar).toContain('NotificacoesBell');
    });

    it('expõe client de anexos com endpoints reais e upload multipart', () => {
        const api = read('features/anexos/api/anexosApi.ts');
        expect(api).toContain("'/api/anexos'");
        expect(api).toContain('/api/anexos/${id}/download');
        expect(api).toContain('/api/anexos/${id}/inativar');
        expect(api).toContain('new FormData()');
        expect(api).toContain("form.append('Arquivo'");
        expect(api).toContain("responseType: 'blob'");
    });

    it('AnexosPanel gateia por permissão, valida limite de 25MB e usa ReasonDialog para inativar', () => {
        const panel = read('features/anexos/components/AnexosPanel.tsx');
        expect(panel).toContain("hasPermission('ANEXOS_CONSULTAR')");
        expect(panel).toContain("hasPermission('ANEXOS_GERENCIAR')");
        expect(panel).toContain("hasPermission('ANEXOS_BAIXAR')");
        expect(panel).toContain('ANEXO_MAX_BYTES');
        expect(panel).toContain('ReasonDialog');
        const types = read('features/anexos/types/anexos.types.ts');
        expect(types).toContain('25 * 1024 * 1024');
    });
});
