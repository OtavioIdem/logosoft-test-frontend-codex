import { describe, expect, it } from 'vitest';
import { administracaoPageConfigs } from '@/features/administracao/components/administracaoPageConfig';
import { criarCargoSchema } from '@/features/administracao/schemas/administracaoSchemas';

describe('Administração - referências relacionais amigáveis', () => {
    it('não expõe ID técnico nos rótulos de empresa, filial e setor', () => {
        const relationalLabels = Object.values(administracaoPageConfigs).flatMap((config) => config.fields.filter((field) => ['empresaId', 'filialId', 'setorId'].includes(field.name)).map((field) => field.label));

        expect(relationalLabels).toContain('Empresa');
        expect(relationalLabels).toContain('Filial');
        expect(relationalLabels).toContain('Setor');
        expect(relationalLabels.some((label) => label.toLowerCase().includes('id'))).toBe(false);
    });

    it('usa mensagem de validação orientada ao usuário final', () => {
        const result = criarCargoSchema.safeParse({ empresaId: 'valor-invalido', filialId: null, setorId: null, nome: 'Gerente', descricao: null, nivelHierarquico: 1 });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(JSON.stringify(result.error.flatten().fieldErrors)).not.toContain('GUID');
        }
    });
});
