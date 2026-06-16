import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('segurança B39', () => {
    it('substitui placeholder de grupos por página real e preserva permissões', () => {
        const gruposPage = read('app/(main)/seguranca/grupos-acesso/page.tsx');
        const gruposComponent = read('features/seguranca/components/GruposAcessoPage.tsx');
        const api = read('features/seguranca/api/segurancaApi.ts');

        expect(gruposPage).toContain('GruposAcessoPage');
        expect(gruposPage).not.toContain('ModulePlaceholderPage');
        expect(gruposComponent).toContain('SEGURANCA_PERMISSOES_GERENCIAR');
        expect(api).toContain('/api/seguranca/grupos-acesso');
    });

    it('cobre ações críticas de usuários com endpoints auditáveis', () => {
        const segurancaApi = read('features/seguranca/api/segurancaApi.ts');
        const authApi = read('features/auth/api/authApi.ts');
        const usuariosPage = read('features/seguranca/components/UsuariosPage.tsx');

        expect(segurancaApi).toContain('/api/seguranca/usuarios/${id}/inativar');
        expect(segurancaApi).toContain('/api/seguranca/usuarios/${id}/reativar');
        expect(segurancaApi).toContain('/api/seguranca/usuarios/${id}/reset-senha');
        expect(segurancaApi).toContain('/api/seguranca/usuarios/${id}/grupos-acesso');
        expect(authApi).toContain('/api/auth/me');
        expect(usuariosPage).toContain('ResetSenhaUsuarioDialog');
        expect(usuariosPage).toContain('VincularGrupoUsuarioDialog');
        expect(usuariosPage).toContain('ReasonDialog');
    });
});
