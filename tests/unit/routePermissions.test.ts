import { describe, expect, it } from 'vitest';
import { findRoutePermissionRule } from '@/lib/security/routePermissions';

describe('route permission rules', () => {
    it('protege rotas de vendas por permissões do módulo', () => {
        const rule = findRoutePermissionRule('/vendas/pedidos/novo');
        expect(rule?.anyOf).toContain('VENDAS_GERENCIAR');
        expect(rule?.anyOf).toContain('VENDAS_CONSULTAR');
    });

    it('protege auditoria por permissão específica', () => {
        expect(findRoutePermissionRule('/auditoria/eventos')?.anyOf).toEqual(['AUDITORIA_CONSULTAR', 'AUDITORIA_OPERACIONAL_CONSULTAR']);
        expect(findRoutePermissionRule('/auditoria/operacional')?.anyOf).toEqual(['AUDITORIA_CONSULTAR', 'AUDITORIA_OPERACIONAL_CONSULTAR']);
    });

    it('protege fluxo de caixa por consulta financeira', () => {
        expect(findRoutePermissionRule('/financeiro/fluxo-caixa')?.anyOf).toEqual(['FINANCEIRO_CONSULTAR']);
    });




    it('protege relatórios por ao menos uma permissão granular do backend', () => {
        const rule = findRoutePermissionRule('/relatorios');
        expect(rule?.anyOf).toContain('RELATORIOS_OPERACIONAIS_CONSULTAR');
        expect(rule?.anyOf).toContain('RELATORIOS_EXPORTAR');
    });

    it('protege atividades por permissões granulares do workflow operacional', () => {
        const rule = findRoutePermissionRule('/atividades');
        expect(rule?.anyOf).toContain('ATIVIDADES_CONSULTAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_CRIAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_ATUALIZAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_CANCELAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_COMENTAR');
        expect(rule?.anyOf).toContain('ATIVIDADES_ATRIBUIR');
    });

    it('protege inutilizações fiscais por permissão específica', () => {
        expect(findRoutePermissionRule('/fiscal/inutilizacoes')?.anyOf).toEqual(['FISCAL_INUTILIZAR']);
    });

    // AC-7 (v1.11.0a8b57): FISCAL_REPROCESSAR entra no fim das listas atuais de /fiscal/notas e /fiscal;
    // as demais regras fiscais (inclusive inutilizações, já coberta acima) ficam intactas.
    it('acrescenta FISCAL_REPROCESSAR no fim de /fiscal/notas, preservando a lista atual', () => {
        expect(findRoutePermissionRule('/fiscal/notas/x')?.anyOf).toEqual([
            'FISCAL_CONSULTAR',
            'FISCAL_EXPORTAR',
            'FISCAL_GERENCIAR',
            'FISCAL_EMITIR',
            'FISCAL_CANCELAR',
            'FISCAL_CARTA_CORRECAO',
            'FISCAL_REPROCESSAR'
        ]);
    });

    it('acrescenta FISCAL_REPROCESSAR no fim de /fiscal, preservando a lista atual', () => {
        expect(findRoutePermissionRule('/fiscal')?.anyOf).toEqual([
            'FISCAL_CONSULTAR',
            'FISCAL_EXPORTAR',
            'FISCAL_GERENCIAR',
            'FISCAL_EMITIR',
            'FISCAL_CANCELAR',
            'FISCAL_INUTILIZAR',
            'FISCAL_CARTA_CORRECAO',
            'FISCAL_REPROCESSAR'
        ]);
    });

    it('não altera as demais regras fiscais (observabilidade, simulador, regras, exceções)', () => {
        expect(findRoutePermissionRule('/fiscal/observabilidade')?.anyOf).toEqual(['FISCAL_CONSULTAR']);
        expect(findRoutePermissionRule('/fiscal/simulador')?.anyOf).toEqual(['FISCAL_REGRAS_CONSULTAR']);
        expect(findRoutePermissionRule('/fiscal/regras')?.anyOf).toEqual(['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR']);
        expect(findRoutePermissionRule('/fiscal/excecoes-ncm')?.anyOf).toEqual(['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR']);
        expect(findRoutePermissionRule('/fiscal/excecoes')?.anyOf).toEqual(['FISCAL_REGRAS_CONSULTAR', 'FISCAL_REGRAS_GERENCIAR']);
    });

    it('não exige permissão granular para dashboard autenticado', () => {
        expect(findRoutePermissionRule('/dashboard')).toBeUndefined();
    });
});
