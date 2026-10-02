import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppMenu from '@/layout/AppMenu';
import { findRoutePermissionRule } from '@/lib/security/routePermissions';
import type { AppMenuItem } from '@/types';

// b72 (D98, D49, AC-3) — rota e menu de naturezas pelas sessões S1–S4. A regra de rota é a real
// (`routePermissions`), e o menu é o `AppMenu` real com o filtro real de permissões; só o item de menu
// visual (`AppMenuitem`, que depende do layout) vira uma lista com rótulo e link.

const { estado } = vi.hoisted(() => ({ estado: { perms: [] as string[] } }));

vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || estado.perms.includes(code);
    return { usePermissions: () => ({ hasPermission: has, hasAnyPermission: (codes?: string[]) => !codes || codes.length === 0 || codes.some(has), hasAllPermissions: (codes?: string[]) => !codes || codes.length === 0 || codes.every(has) }) };
});
vi.mock('@/layout/AppMenuitem', () => {
    const Item = ({ item }: { item: AppMenuItem }) => (
        <li>
            {item.to ? <a href={item.to}>{item.label}</a> : <span>{item.label}</span>}
            {item.items ? (
                <ul aria-label={item.label}>
                    {item.items.map((filho) => (
                        <Item key={filho.label} item={filho} />
                    ))}
                </ul>
            ) : null}
        </li>
    );
    return { default: Item };
});

const S1 = ['FISCAL_CADASTROS_CONSULTAR'];
const S2 = ['FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR'];
const S3 = ['FISCAL_CADASTROS_GERENCIAR'];
const S4 = ['FISCAL_CONSULTAR'];

const permitidaPela = (rota: string, perms: string[]) => {
    const regra = findRoutePermissionRule(rota);
    return Boolean(regra) && regra!.anyOf.some((codigo) => perms.includes(codigo));
};

describe('AC-3: regra de rota /fiscal/naturezas-operacao', () => {
    it('a regra própria vem antes do catch-all /fiscal e pede FISCAL_CADASTROS_CONSULTAR ou _GERENCIAR', () => {
        expect(findRoutePermissionRule('/fiscal/naturezas-operacao')?.anyOf).toEqual(['FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR']);
        expect(findRoutePermissionRule('/fiscal/naturezas-operacao/qualquer')?.anyOf).toEqual(['FISCAL_CADASTROS_CONSULTAR', 'FISCAL_CADASTROS_GERENCIAR']);
    });

    it.each([
        ['S1', S1, true],
        ['S2', S2, true],
        ['S3', S3, true],
        ['S4', S4, false]
    ])('%s alcança a rota: %s', (_sessao, perms, esperado) => {
        expect(permitidaPela('/fiscal/naturezas-operacao', perms)).toBe(esperado);
    });

    it('S4 continua alcançando /fiscal/notas (nenhum acesso perdido, accessRisk NENHUM)', () => {
        expect(permitidaPela('/fiscal/notas', S4)).toBe(true);
    });
});

describe('AC-3: item "Naturezas de operação" no menu filtrado', () => {
    it.each([
        ['S1', S1],
        ['S2', S2],
        ['S3', S3]
    ])('%s vê o grupo Fiscal e o item, com link para a rota', (_sessao, perms) => {
        estado.perms = perms;
        render(<AppMenu />);
        const grupo = screen.getByRole('list', { name: 'Fiscal' });
        expect(within(grupo).getByRole('link', { name: 'Naturezas de operação' })).toHaveAttribute('href', '/fiscal/naturezas-operacao');
    });

    it('S4 vê o grupo Fiscal pelas notas, mas não o item de naturezas', () => {
        estado.perms = S4;
        render(<AppMenu />);
        const grupo = screen.getByRole('list', { name: 'Fiscal' });
        expect(within(grupo).getByRole('link', { name: 'Notas fiscais' })).toBeInTheDocument();
        expect(within(grupo).queryByRole('link', { name: 'Naturezas de operação' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Naturezas de operação' })).not.toBeInTheDocument();
    });
});
