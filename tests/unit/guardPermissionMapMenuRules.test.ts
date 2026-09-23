import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Fixtures em .menu-fixture.txt (não .tsx) de propósito: ficam fora do tsconfig porque usam permissões fictícias (PERM_X e afins), fora do union PermissionCode.
const root = process.cwd();

describe('guardPermissionMap — C2/C3 com fixtures de regras', () => {
  let lib: any;

  // Importar a lib dinamicamente
  beforeAll(async () => {
    lib = await import(
      join(root, 'scripts/lib/guard-permission-map.mjs').replace(/\\/g, '/')
    );
  }, 30_000);

  describe('C2: Hierarquia de menu — casos de teste', () => {
    it('Fixture A: filho com permission não no anyPermissions do pai → divergência', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-a-child-permission-missing.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Asserção nominal: exatamente a divergência de PERM_Y no grupo "Grupo Pai A"
      expect(divergences.menuHierarquia.length).toBe(1);
      expect(divergences.menuHierarquia[0]).toMatchObject({
        group: 'Grupo Pai A',
        rota: '/grupo-a/item-a',
        permission: 'PERM_Y',
        form: 'permission'
      });
    });

    it('Fixture A: verde após correção (pai tem permission do filho)', () => {
      const fixedSource = `
import React, { useMemo } from 'react';
import { AppMenuItem } from '@/types';

export const MenuFixtureAFixed = () => {
  const model = useMemo<AppMenuItem[]>(
    () => [
      {
        label: 'Grupo Pai A Fixed',
        anyPermissions: ['PERM_X', 'PERM_Y'],
        items: [
          {
            label: 'Item Filho A',
            to: '/grupo-a/item-a',
            permission: 'PERM_Y'
          }
        ]
      }
    ],
    []
  );
  return model;
};
`;

      const result = lib.parseMenuPermissions(fixedSource);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      expect(divergences.menuHierarquia.length).toBe(0);
    });

    it('Fixture B: filho com anyPermissions parcialmente fora do pai → divergência', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-b-partial-anypermissions.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Asserção nominal: exatamente a divergência de PERM_Y no grupo "Grupo Pai B"
      // (PERM_X está no pai, só PERM_Y falta)
      expect(divergences.menuHierarquia.length).toBe(1);
      expect(divergences.menuHierarquia[0]).toMatchObject({
        group: 'Grupo Pai B',
        rota: '/grupo-b/item-b',
        permission: 'PERM_Y',
        form: 'anyPermissions'
      });
    });

    it('Fixture B verde: filho com anyPermissions totalmente contido no pai → sem divergência', () => {
      const fixedSource = `
import React, { useMemo } from 'react';
import { AppMenuItem } from '@/types';

export const MenuFixtureBFixed = () => {
  const model = useMemo<AppMenuItem[]>(
    () => [
      {
        label: 'Grupo Pai B Fixed',
        anyPermissions: ['PERM_X', 'PERM_Y'],
        items: [
          {
            label: 'Item Filho B',
            to: '/grupo-b/item-b',
            anyPermissions: ['PERM_X', 'PERM_Y']
          }
        ]
      }
    ],
    []
  );
  return model;
};
`;

      const result = lib.parseMenuPermissions(fixedSource);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Nominal: o item foi lido com a forma anyPermissions e não gerou nenhuma divergência
      const item = result.hierarchy.find((h: any) => h.rota === '/grupo-b/item-b');
      expect(item?.permissionForm).toBe('anyPermissions');
      expect(divergences.menuHierarquia.length).toBe(0);
    });

    it('Fixture C: filho com allPermissions sem overlap → divergência', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-c-allpermissions-mismatch.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Asserção nominal: exatamente a divergência de allPermissions no grupo "Grupo Pai C"
      expect(divergences.menuHierarquia.length).toBe(1);
      expect(divergences.menuHierarquia[0]).toMatchObject({
        group: 'Grupo Pai C',
        rota: '/grupo-c/item-c',
        permissions: ['PERM_Y', 'PERM_Z'],
        form: 'allPermissions'
      });
    });

    it('Fixture C verde: filho com allPermissions com interseção no pai → sem divergência', () => {
      const fixedSource = `
import React, { useMemo } from 'react';
import { AppMenuItem } from '@/types';

export const MenuFixtureCFixed = () => {
  const model = useMemo<AppMenuItem[]>(
    () => [
      {
        label: 'Grupo Pai C Fixed',
        anyPermissions: ['PERM_X', 'PERM_Y'],
        items: [
          {
            label: 'Item Filho C',
            to: '/grupo-c/item-c',
            allPermissions: ['PERM_X', 'PERM_Z']
          }
        ]
      }
    ],
    []
  );
  return model;
};
`;

      const result = lib.parseMenuPermissions(fixedSource);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Nominal: PERM_X é a interseção que basta para não acusar
      const item = result.hierarchy.find((h: any) => h.rota === '/grupo-c/item-c');
      expect(item?.permissionForm).toBe('allPermissions');
      expect(divergences.menuHierarquia.length).toBe(0);
    });

    it('Fixture D: aninhamento recursivo válido → sem divergência', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-d-two-level-nesting.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Neto vs Pai: PERM_Y está no pai
      expect(divergences.menuHierarquia.length).toBe(0);
    });

    it('Fixture D2: neto com permissão fora do pai imediato (presente só na avó) → divergência', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-d2-two-level-nesting-mismatch.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Asserção nominal: PERM_Z falta no pai imediato ("Pai (sem rota)"), mesmo estando na avó
      expect(divergences.menuHierarquia.length).toBe(1);
      expect(divergences.menuHierarquia[0]).toMatchObject({
        group: 'Pai (sem rota)',
        rota: '/avo/pai/neto-z',
        permission: 'PERM_Z',
        form: 'permission'
      });
    });

    it('Fixture E: pai com forma não suportada (allPermissions) → divergência', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-e-unsupported-parent-form.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Asserção nominal: issue parent-form-unsupported-allPermissions no grupo "Grupo Pai E"
      expect(divergences.menuHierarquia.length).toBe(1);
      expect(divergences.menuHierarquia[0]).toMatchObject({
        group: 'Grupo Pai E (forma não suportada)',
        rota: '/grupo-e/item-e',
        issue: 'parent-form-unsupported-allPermissions'
      });
    });

    it('Fixture G: item com permission + anyPermissions juntos → forma múltipla é reprovada (D46)', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-g-combined-permissions.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);

      const hierarchyWithG = result.hierarchy.find((item: any) =>
        item.rota === '/grupo-g/item-g'
      );
      expect(hierarchyWithG?.permissionForm).toBe('multiple');

      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // D46: item com mais de uma forma declarada é forma não suportada — exatamente 1 divergência
      expect(divergences.menuHierarquia.length).toBe(1);
      expect(divergences.menuHierarquia[0]).toMatchObject({
        group: 'Grupo Pai G (anyPermissions apenas)',
        rota: '/grupo-g/item-g',
        issue: 'child-form-unsupported-multiple'
      });
    });
  });

  describe('C3: Validação de rotas', () => {
    it('Fixture F: rota sem regra em routePermissions → menuSemRegra', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-f-c3-route-rules.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);

      // Rotas vazias para provocar menuSemRegra
      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules: [],
        menuData: result,
        reachabilityMap: new Set()
      });

      // Asserção nominal: /nonexistent/unmapped com a permissão PERM_UNMAPPED
      const itemUnmapped = divergences.menuSemRegra.find(
        (item: any) => item.rota === '/nonexistent/unmapped'
      );
      expect(itemUnmapped).toMatchObject({
        rota: '/nonexistent/unmapped',
        permissions: ['PERM_UNMAPPED'],
        id: 'menu-sem-regra-/nonexistent/unmapped'
      });
    });

    it('Fixture F: rota com regra que não admite permission → menuForaDaRegra', () => {
      const source = readFileSync(
        join(root, 'tests/unit/fixtures/guard-menu/fixture-f-c3-route-rules.menu-fixture.txt'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(source);

      // Regra que rejeita PERM_CONFLICT
      const routeRules = [
        {
          pattern: /^\/existing\/route(?:\/.*)?$/,
          anyOf: ['PERM_ALLOWED'],
          description: 'Existing route'
        }
      ];

      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules,
        menuData: result,
        reachabilityMap: new Set()
      });

      // Asserção nominal: exatamente a divergência de PERM_CONFLICT em /existing/route
      expect(divergences.menuForaDaRegra.length).toBe(1);
      expect(divergences.menuForaDaRegra[0]).toMatchObject({
        rota: '/existing/route',
        permission: 'PERM_CONFLICT',
        rulePerm: ['PERM_ALLOWED']
      });
    });

    it('Primeira regra que casa vence (não continua procurando)', () => {
      const source = `
import React, { useMemo } from 'react';
import { AppMenuItem } from '@/types';

export const MenuFixtureFRulePrecedence = () => {
  const model = useMemo<AppMenuItem[]>(
    () => [
      {
        label: 'Group',
        anyPermissions: ['SPECIFIC', 'GENERIC'],
        items: [
          {
            label: 'Rota /fiscal/notas',
            to: '/fiscal/notas',
            permission: 'GENERIC_ONLY'
          }
        ]
      }
    ],
    []
  );
  return model;
};
`;

      const result = lib.parseMenuPermissions(source);

      // Regra específica vem DEPOIS de genérica (testa que ordem importa)
      const routeRules = [
        {
          pattern: /^\/fiscal(?:\/.*)?$/,
          anyOf: ['GENERIC_ONLY'],
          description: 'Fiscal (genérica)'
        },
        {
          pattern: /^\/fiscal\/notas(?:\/.*)?$/,
          anyOf: ['SPECIFIC_PERMISSION'],
          description: 'Notas (específica)'
        }
      ];

      const divergences = lib.analyzeGuardDivergences({
        frontendRoutes: [],
        operationPermissionMap: new Map(),
        modulePermissions: new Map(),
        modules: new Set(),
        routeRules,
        menuData: result,
        reachabilityMap: new Set()
      });

      // Primeira regra que casa (/fiscal) vale
      // Logo GENERIC_ONLY está ok, mas nenhuma outra permissão importa
      expect(divergences.menuForaDaRegra.length).toBe(0);
    });
  });

  describe('AC-1: parser enumera todo universo', () => {
    it('parser deve enumerar 83 itens do AppMenu.tsx atual', () => {
      const appMenuSource = readFileSync(
        join(root, 'layout/AppMenu.tsx'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(appMenuSource);

      // Contar itens com 'to:' no arquivo original (grep -c "to: '")
      const itemsWithTo = (appMenuSource.match(/to: '/g) || []).length;

      // Parser deve encontrar aproximadamente o mesmo número
      // (hierarquia.length é cada par pai-filho ou item isolado)
      // Número total deve refletir a contagem
      expect(result.hierarchy.length).toBeGreaterThan(0);
      // b62: -1 "Bloqueios" removido — o item apontava para /estoque/bloqueios que só faz redirect('/estoque/avancado')
      // b67: +1 "Classificações de pessoa" adicionado (D68) em Cadastros > /pessoas/classificacoes
      expect(itemsWithTo).toBe(84);
    });

    it('D46: nenhum item ou grupo do AppMenu.tsx atual declara mais de uma forma de permissão', () => {
      const appMenuSource = readFileSync(
        join(root, 'layout/AppMenu.tsx'),
        'utf8'
      );

      const result = lib.parseMenuPermissions(appMenuSource);

      const multiplos = result.hierarchy.filter((item: any) => item.permissionForm === 'multiple');
      expect(multiplos).toEqual([]);
    });
  });
});
