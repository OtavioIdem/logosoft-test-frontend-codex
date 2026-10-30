import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cadastroItens, cadastrosAnyPermissions } from '@/features/cadastros/cadastrosCatalogo';
import { findRoutePermissionRule, routePermissionRules } from '@/lib/security/routePermissions';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

// ---------------------------------------------------------------------------------------------
// Por que este arquivo existe
//
// `validate:guard-permission-map` lê o menu pela AST, mas conhece apenas `permission`,
// `anyPermissions` e `allPermissions` (scripts/lib/guard-permission-map.mjs, parseMenuPermissions).
// `masterOnly` (D109) é invisível para ele: marcar o item de menu e esquecer a regra de rota — ou
// o contrário — não reprova em gate nenhum. A classe de defeito é essa dessincronia, e o sintoma
// em produção é a tela sumir do menu mas a URL digitada continuar entrando.
//
// A asserção é por item NOMINAL nos dois sentidos, e a função que confere é exportada no próprio
// arquivo para que a prova de que ela sabe ficar VERMELHA rode contra modelos com o defeito
// injetado — não contra o registro de uma lista.
// ---------------------------------------------------------------------------------------------

type ItemMenu = { label: string; to: string; permissoes: string[]; masterOnly: boolean };
type GrupoMenu = { label: string; masterOnly: boolean; anyPermissions: string[]; itens: ItemMenu[] };

const listaDeStrings = (trecho: string | undefined) => (trecho ? [...trecho.matchAll(/'([A-Z][A-Z0-9_]*)'/g)].map((m) => m[1]) : []);

export const lerGruposDoMenu = (fonte: string): GrupoMenu[] => {
    // O repositório grava AppMenu.tsx com CRLF; sem normalizar, todo recorte por '\n' falha.
    const source = fonte.replace(/\r\n/g, '\n');
    const inicio = source.indexOf('const model = useMemo<AppMenuItem[]>(');
    const fim = source.indexOf('\n        []\n    );', inicio);
    if (inicio < 0 || fim < 0) throw new Error('modelo do menu não localizado em AppMenu.tsx');

    return source
        .slice(inicio, fim)
        .split(/\n {12}\{\n/)
        .slice(1)
        .map((bloco) => {
            const corte = bloco.indexOf('items:');
            const cabecalho = corte >= 0 ? bloco.slice(0, corte) : bloco;
            const corpo = corte >= 0 ? bloco.slice(corte) : '';
            const grupoMasterOnly = /masterOnly:\s*true/.test(cabecalho);

            return {
                label: cabecalho.match(/label: '([^']+)'/)?.[1] ?? '',
                masterOnly: grupoMasterOnly,
                anyPermissions: listaDeStrings(cabecalho.match(/anyPermissions: \[([^\]]*)\]/)?.[1]),
                itens: [...corpo.matchAll(/\{ label: '([^']+)'[^\n]*?to: '([^']+)'([^\n]*)/g)].map(([, label, to, resto]) => ({
                    label,
                    to,
                    permissoes: listaDeStrings(resto),
                    // O filtro de `AppMenu` avalia pai e filho de forma independente, então um filho
                    // dentro de grupo marcado está restrito na prática: para esta conferência o
                    // item herda a marca do grupo.
                    masterOnly: grupoMasterOnly || /masterOnly:\s*true/.test(resto)
                }))
            };
        });
};

type Regra = { pattern: RegExp; description: string; masterOnly?: boolean };
type Divergencia = { id: string; tipo: 'menu-sem-rota' | 'rota-sem-menu'; rota: string };

export const conferirParMasterOnly = (grupos: GrupoMenu[], regras: readonly Regra[]): Divergencia[] => {
    const regraDe = (rota: string) => regras.find((regra) => regra.pattern.test(rota));
    const divergencias: Divergencia[] = [];

    for (const grupo of grupos) {
        for (const item of grupo.itens) {
            const regra = regraDe(item.to);
            if (!regra) continue;
            if (item.masterOnly && regra.masterOnly !== true) {
                divergencias.push({ id: `menu-sem-rota-${item.to}`, tipo: 'menu-sem-rota', rota: item.to });
            }
            if (!item.masterOnly && regra.masterOnly === true) {
                divergencias.push({ id: `rota-sem-menu-${item.to}`, tipo: 'rota-sem-menu', rota: item.to });
            }
        }
    }

    return divergencias;
};

// Os onze destinos do grupo, nominalmente. Lista total não serve de asserção: o que se quer é
// saber QUAL destino entrou ou saiu sem decisão.
const DESTINOS_DESENVOLVIMENTO = [
    '/estoque/transferencias',
    '/estoque/ajustes',
    '/estoque/avancado',
    '/qualidade/inspecoes',
    '/qualidade/nao-conformidades',
    '/crm/leads',
    '/crm/oportunidades',
    '/crm/propostas',
    '/atividades',
    '/patrimonio/depreciacao',
    '/patrimonio/inventarios'
] as const;

// As oito regras de rota marcadas. `/estoque/bloqueios` não tem item de menu (a b62 o removeu
// porque a página só redireciona para /estoque/avancado) e está aqui de propósito: sem a marca,
// o não-master seria redirecionado de uma rota liberada para uma negação.
const ROTAS_MASTER_ONLY = [
    'Ajustes de estoque',
    'Transferências de estoque',
    'Bloqueios de estoque',
    'Estoque avançado',
    'Qualidade (inspeções e não-conformidades)',
    'CRM (leads, oportunidades e propostas)',
    'Patrimônio (bens, depreciação e inventário)',
    'Atividades'
] as const;

const UNIAO_DESENVOLVIMENTO = [
    'ESTOQUE_MOVIMENTAR',
    'ESTOQUE_CONSULTAR',
    'ESTOQUE_INVENTARIO_GERENCIAR',
    'ESTOQUE_AJUSTAR',
    'ESTOQUE_BLOQUEIO_GERENCIAR',
    'QUALIDADE_CONSULTAR',
    'QUALIDADE_INSPECIONAR',
    'QUALIDADE_NAO_CONFORMIDADE_GERENCIAR',
    'CRM_CONSULTAR',
    'CRM_LEADS_GERENCIAR',
    'CRM_OPORTUNIDADES_GERENCIAR',
    'CRM_PROPOSTAS_GERENCIAR',
    'ATIVIDADES_CONSULTAR',
    'ATIVIDADES_CRIAR',
    'ATIVIDADES_ATUALIZAR',
    'ATIVIDADES_CANCELAR',
    'ATIVIDADES_COMENTAR',
    'ATIVIDADES_ATRIBUIR',
    'PATRIMONIO_CONSULTAR',
    'PATRIMONIO_DEPRECIAR',
    'PATRIMONIO_INVENTARIO_GERENCIAR'
] as const;

describe('v1.11.0a8b79 — grupo Desenvolvimento restrito ao usuário master (D109)', () => {
    const grupos = lerGruposDoMenu(read('layout/AppMenu.tsx'));
    const desenvolvimento = grupos.find((grupo) => grupo.label === 'Desenvolvimento');

    it('o grupo existe, é o único marcado masterOnly e reúne os onze destinos', () => {
        expect(desenvolvimento, 'grupo Desenvolvimento ausente do menu').toBeDefined();
        expect(desenvolvimento?.masterOnly).toBe(true);
        expect(grupos.filter((grupo) => grupo.masterOnly).map((grupo) => grupo.label)).toEqual(['Desenvolvimento']);

        const destinos = desenvolvimento?.itens.map((item) => item.to) ?? [];
        for (const destino of DESTINOS_DESENVOLVIMENTO) {
            expect(destinos, `destino ${destino} fora do grupo Desenvolvimento`).toContain(destino);
        }
        expect(destinos).toHaveLength(DESTINOS_DESENVOLVIMENTO.length);
    });

    it('os quatro grupos de origem deixaram de existir e Estoque conserva as quatro telas operacionais', () => {
        for (const rotulo of ['Qualidade', 'CRM', 'Atividades', 'Patrimônio']) {
            expect(
                grupos.map((grupo) => grupo.label),
                `grupo ${rotulo} voltou ao menu`
            ).not.toContain(rotulo);
        }

        const estoque = grupos.find((grupo) => grupo.label === 'Estoque');
        expect(estoque?.itens.map((item) => item.to)).toEqual(['/estoque/saldos', '/estoque/movimentos', '/estoque/reservas', '/estoque/inventarios']);
        expect(estoque?.anyPermissions).toEqual(['ESTOQUE_CONSULTAR', 'ESTOQUE_RESERVAR', 'ESTOQUE_INVENTARIO_GERENCIAR']);
    });

    it('anyPermissions do grupo é a união EXATA das permissões dos filhos (C2 do gate exige o pai admitir toda sessão do filho)', () => {
        const uniaoDosFilhos = [...new Set((desenvolvimento?.itens ?? []).flatMap((item) => item.permissoes))];

        for (const permissao of uniaoDosFilhos) {
            expect(desenvolvimento?.anyPermissions, `filho declara ${permissao} e o grupo não`).toContain(permissao);
        }
        for (const permissao of desenvolvimento?.anyPermissions ?? []) {
            expect(uniaoDosFilhos, `grupo declara ${permissao} que nenhum filho usa`).toContain(permissao);
        }
        expect([...(desenvolvimento?.anyPermissions ?? [])].sort()).toEqual([...UNIAO_DESENVOLVIMENTO].sort());
    });

    it('cada uma das oito regras de rota marcadas está nomeada, e nenhuma outra está', () => {
        const marcadas = routePermissionRules.filter((regra) => regra.masterOnly === true).map((regra) => regra.description);
        for (const descricao of ROTAS_MASTER_ONLY) {
            expect(marcadas, `regra "${descricao}" sem masterOnly`).toContain(descricao);
        }
        expect(marcadas).toHaveLength(ROTAS_MASTER_ONLY.length);
    });

    it('cada destino do grupo resolve para uma regra de rota marcada — item por item', () => {
        for (const destino of DESTINOS_DESENVOLVIMENTO) {
            const regra = findRoutePermissionRule(destino);
            expect(regra, `nenhuma regra casa ${destino}`).toBeDefined();
            expect(regra?.masterOnly, `${destino} aparece só para master no menu mas a URL não recusa`).toBe(true);
        }
    });

    it('nenhum item fora do grupo Desenvolvimento aponta para rota marcada (ilusão inversa: item visível que a URL nega)', () => {
        expect(conferirParMasterOnly(grupos, routePermissionRules)).toEqual([]);
    });

    it('o card Bens sai da Central para quem não é master, sem mexer no guard de /cadastros', () => {
        const bens = cadastroItens.find((item) => item.id === 'bens');
        expect(bens?.to).toBe('/patrimonio/bens');
        expect(bens?.masterOnly, 'card Bens sem masterOnly: Patrimônio teria porta lateral') .toBe(true);
        expect(findRoutePermissionRule('/patrimonio/bens')?.masterOnly).toBe(true);
        expect(cadastroItens.filter((item) => item.masterOnly).map((item) => item.id)).toEqual(['bens']);
        // A união do catálogo continua sendo o anyOf de /cadastros: `masterOnly` não altera
        // `anyPermissions`, então a regra de rota não muda e ninguém perde a Central.
        expect(findRoutePermissionRule('/cadastros')?.anyOf).toEqual(cadastrosAnyPermissions);
        expect(cadastrosAnyPermissions).toContain('PATRIMONIO_CONSULTAR');
    });

    it('o filtro do menu e o guard de rota leem masterOnly do mesmo fato de sessão', () => {
        expect(read('features/auth/hooks/usePermissions.ts')).toContain('isMaster: user?.isMaster === true');
        expect(read('layout/AppMenu.tsx')).toContain('(!item.masterOnly || permissions.isMaster)');
        expect(read('components/security/RoutePermissionGate.tsx')).toContain('rule.masterOnly && !permissions.isMaster');
        // A ordem importa: masterOnly tem de ser checado ANTES de hasAnyPermission, senão a sessão
        // com a permissão do módulo — exatamente a que a marca quer recusar — passa pelo guard.
        const guard = read('components/security/RoutePermissionGate.tsx');
        expect(guard.indexOf('rule.masterOnly')).toBeLessThan(guard.indexOf('hasAnyPermission(rule.anyOf)'));
    });

    it('lib/permissions/permissions.ts NÃO mudou: masterOnly é eixo separado, nenhuma permissão entrou no union', () => {
        const permissoes = read('lib/permissions/permissions.ts');
        expect(permissoes).not.toContain('masterOnly');
        expect(permissoes).toContain("const NON_BYPASS_PERMISSION_CODES = new Set<string>(['MASTER_GOD', '*']);");
        expect(read('types/erp.ts')).not.toContain('DESENVOLVIMENTO');
    });
});

describe('a conferência sabe ficar VERMELHA (gate aceito por reprovar, nunca por passar)', () => {
    const regras: Regra[] = [
        { pattern: /^\/crm(?:\/.*)?$/, description: 'CRM', masterOnly: true },
        { pattern: /^\/vendas(?:\/.*)?$/, description: 'Vendas' }
    ];
    const grupo = (label: string, masterOnly: boolean, itens: ItemMenu[]): GrupoMenu => ({ label, masterOnly, anyPermissions: [], itens });
    const item = (to: string, masterOnly: boolean): ItemMenu => ({ label: to, to, permissoes: [], masterOnly });

    it('árvore coerente não acusa nada', () => {
        expect(conferirParMasterOnly([grupo('Desenvolvimento', true, [item('/crm/leads', true)]), grupo('Vendas', false, [item('/vendas/pedidos', false)])], regras)).toEqual([]);
    });

    it('acusa NOMINALMENTE o item restrito no menu cuja rota não recusa', () => {
        const regrasSemMarca: Regra[] = [{ pattern: /^\/crm(?:\/.*)?$/, description: 'CRM' }];
        expect(conferirParMasterOnly([grupo('Desenvolvimento', true, [item('/crm/leads', true), item('/crm/propostas', true)])], regrasSemMarca)).toEqual([
            { id: 'menu-sem-rota-/crm/leads', tipo: 'menu-sem-rota', rota: '/crm/leads' },
            { id: 'menu-sem-rota-/crm/propostas', tipo: 'menu-sem-rota', rota: '/crm/propostas' }
        ]);
    });

    it('acusa NOMINALMENTE o item oferecido fora do grupo cuja rota recusa', () => {
        expect(conferirParMasterOnly([grupo('CRM', false, [item('/crm/leads', false)])], regras)).toEqual([{ id: 'rota-sem-menu-/crm/leads', tipo: 'rota-sem-menu', rota: '/crm/leads' }]);
    });

    it('o leitor do menu enxerga masterOnly no grupo e no item, e herda do grupo para o filho', () => {
        const fonte = `const model = useMemo<AppMenuItem[]>(
        () => [
            {
                label: 'Vendas',
                anyPermissions: ['VENDAS_CONSULTAR'],
                items: [{ label: 'Pedidos', icon: 'pi pi-fw pi-cart', to: '/vendas/pedidos', anyPermissions: ['VENDAS_CONSULTAR'] }]
            },
            {
                label: 'Desenvolvimento',
                masterOnly: true,
                anyPermissions: ['CRM_CONSULTAR'],
                items: [{ label: 'CRM · Leads', icon: 'pi pi-fw pi-filter', to: '/crm/leads', anyPermissions: ['CRM_CONSULTAR'] }]
            }
        ],
        []
    );`;
        const lidos = lerGruposDoMenu(fonte);
        expect(lidos.map((g) => g.label)).toEqual(['Vendas', 'Desenvolvimento']);
        expect(lidos[0].masterOnly).toBe(false);
        expect(lidos[0].itens[0]).toEqual({ label: 'Pedidos', to: '/vendas/pedidos', permissoes: ['VENDAS_CONSULTAR'], masterOnly: false });
        expect(lidos[1].masterOnly).toBe(true);
        expect(lidos[1].anyPermissions).toEqual(['CRM_CONSULTAR']);
        expect(lidos[1].itens[0].masterOnly).toBe(true);
    });
});
