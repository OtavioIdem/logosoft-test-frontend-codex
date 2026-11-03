import { describe, expect, it } from 'vitest';
import { PERMISSOES_CATALOGO } from '@/features/seguranca/permissoesCatalogo';
import { findRoutePermissionRule } from '@/lib/security/routePermissions';

// v1.11.0a8b81 (AC-1). Regra de rota e catálogo de permissão, por sessão nominal. A regra é a real de routePermissions;
// nada é mockado. Menu e botões ficam no teste de componente, porque dependem do AppMenu e dos componentes.

const CONSULTAR = 'FISCAL_CONFIGURACAO_CONSULTAR';
const GERENCIAR = 'FISCAL_CONFIGURACAO_GERENCIAR';

const sessaoSemNada: string[] = [];
const sessaoSoConsultar = [CONSULTAR];
const sessaoSoGerenciar = [GERENCIAR];
const sessaoSoFiscalGenerico = ['FISCAL_CONSULTAR'];

const rotaLiberada = (rota: string, permissoes: string[]) => {
    const regra = findRoutePermissionRule(rota);
    return Boolean(regra) && regra!.anyOf.some((codigo) => permissoes.includes(codigo));
};

describe('regra de rota /fiscal/configuracao', () => {
    it('a regra própria pede CONSULTAR ou GERENCIAR, nominalmente', () => {
        expect(findRoutePermissionRule('/fiscal/configuracao')?.anyOf).toEqual([CONSULTAR, GERENCIAR]);
    });

    it('vale também para subrotas', () => {
        expect(findRoutePermissionRule('/fiscal/configuracao/empresa')?.anyOf).toEqual([CONSULTAR, GERENCIAR]);
    });

    it('a regra é ancorada: /fiscal/configuracao-antiga não herda a permissão nova', () => {
        expect(findRoutePermissionRule('/fiscal/configuracao-antiga')?.anyOf).not.toContain(CONSULTAR);
    });

    it('a mensagem de negação nomeia a rota pela descrição da regra', () => {
        expect(findRoutePermissionRule('/fiscal/configuracao')?.description).toBe('Configuração de emissão fiscal');
    });
});

describe('acesso à rota por sessão (AC-1)', () => {
    it.each([
        ['sem nenhuma permissão', sessaoSemNada, false],
        ['só FISCAL_CONSULTAR (genérica, não dá acesso à configuração)', sessaoSoFiscalGenerico, false],
        ['só CONSULTAR', sessaoSoConsultar, true],
        ['só GERENCIAR', sessaoSoGerenciar, true]
    ])('%s: rota liberada = %s', (_nome, permissoes, esperado) => {
        expect(rotaLiberada('/fiscal/configuracao', permissoes)).toBe(esperado);
    });

    it('sessão com só CONSULTAR continua alcançando as rotas fiscais que já tinha (nenhum acesso perdido)', () => {
        expect(rotaLiberada('/fiscal/notas', sessaoSoFiscalGenerico)).toBe(true);
        expect(rotaLiberada('/fiscal/series', sessaoSoConsultar)).toBe(false);
    });
});

describe('catálogo de permissões (features/seguranca/permissoesCatalogo)', () => {
    it('as duas permissões novas estão no catálogo, no grupo Fiscal', () => {
        expect(PERMISSOES_CATALOGO[CONSULTAR]).toMatchObject({ grupo: 'Fiscal' });
        expect(PERMISSOES_CATALOGO[GERENCIAR]).toMatchObject({ grupo: 'Fiscal' });
    });

    it('os rótulos separam consultar de gerenciar (o operador enxerga a diferença no cadastro de perfil)', () => {
        expect(PERMISSOES_CATALOGO[CONSULTAR].label).toMatch(/Consultar$/);
        expect(PERMISSOES_CATALOGO[GERENCIAR].label).toMatch(/Gerenciar$/);
    });
});
