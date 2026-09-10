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
        expect(gruposComponent).toContain('SEGURANCA_GRUPOS_ACESSO_GERENCIAR');
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

    it('bloco de ações tem 5 guards com 4 códigos distintos de permissão', () => {
        const dialogs = read('features/seguranca/components/SegurancaActionDialogs.tsx');

        // Verificar que cada PermissionGuard para ação existe com seu código de permissão distinto
        // Resetar senha - 1º guard
        expect(dialogs).toContain('permission="SEGURANCA_USUARIOS_RESETAR_SENHA"');
        expect(dialogs).toContain('label="Resetar senha"');
        expect(dialogs).toContain("Permissão necessária: SEGURANCA_USUARIOS_RESETAR_SENHA.");

        // Vincular grupo - 2º guard
        expect(dialogs).toContain('label="Vincular grupo"');
        const vincularMatches = (dialogs.match(/permission="SEGURANCA_GRUPOS_ACESSO_GERENCIAR"/g) || []).length;
        expect(vincularMatches).toBeGreaterThanOrEqual(2);

        // Remover grupo - 3º guard (mesmo código que Vincular)
        expect(dialogs).toContain('label="Remover grupo"');
        expect(dialogs).toContain("Permissão necessária: SEGURANCA_GRUPOS_ACESSO_GERENCIAR.");

        // Inativar - 4º guard
        expect(dialogs).toContain('permission="SEGURANCA_USUARIOS_INATIVAR"');
        expect(dialogs).toContain('label="Inativar"');
        expect(dialogs).toContain("Permissão necessária: SEGURANCA_USUARIOS_INATIVAR.");

        // Reativar - 5º guard
        expect(dialogs).toContain('permission="SEGURANCA_USUARIOS_GERENCIAR"');
        expect(dialogs).toContain('label="Reativar"');

        // Confirmar que há exatamente 4 códigos de permissão distintos
        const codeMatches = [
            (dialogs.match(/permission="SEGURANCA_USUARIOS_RESETAR_SENHA"/g) || []).length,
            (dialogs.match(/permission="SEGURANCA_GRUPOS_ACESSO_GERENCIAR"/g) || []).length,
            (dialogs.match(/permission="SEGURANCA_USUARIOS_INATIVAR"/g) || []).length,
            (dialogs.match(/permission="SEGURANCA_USUARIOS_GERENCIAR"/g) || []).length
        ];
        expect(codeMatches.filter(count => count > 0)).toHaveLength(4);
    });
});
