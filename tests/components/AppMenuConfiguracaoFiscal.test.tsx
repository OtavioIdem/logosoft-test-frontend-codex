import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppMenu from '@/layout/AppMenu';
import type { AppMenuItem } from '@/types';

// v1.11.0a8b81 (AC-1). Menu filtrado pelo AppMenu real, com o filtro real de permissões. Só o item visual
// (AppMenuitem, que depende do layout) vira lista com rótulo e link, como em AppMenuNaturezasOperacao.test.tsx.

const { estado } = vi.hoisted(() => ({ estado: { perms: [] as string[] } }));

vi.mock('@/features/auth/hooks/usePermissions', () => {
    const has = (code?: string) => !code || estado.perms.includes(code);
    return {
        usePermissions: () => ({
            hasPermission: has,
            hasAnyPermission: (codes?: string[]) => !codes || codes.length === 0 || codes.some(has),
            hasAllPermissions: (codes?: string[]) => !codes || codes.length === 0 || codes.every(has)
        })
    };
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

const ROTULO_ITEM = 'Configuração de emissão';

describe('AC-1: item "Configuração de emissão" no grupo Fiscal, por sessão nominal', () => {
    it('sessão só com FISCAL_CONFIGURACAO_CONSULTAR vê o item, com o link da rota', () => {
        estado.perms = ['FISCAL_CONFIGURACAO_CONSULTAR'];
        render(<AppMenu />);

        const grupo = screen.getByRole('list', { name: 'Fiscal' });
        expect(within(grupo).getByRole('link', { name: ROTULO_ITEM })).toHaveAttribute('href', '/fiscal/configuracao');
    });

    it('sessão só com FISCAL_CONFIGURACAO_GERENCIAR também vê o item', () => {
        estado.perms = ['FISCAL_CONFIGURACAO_GERENCIAR'];
        render(<AppMenu />);

        const grupo = screen.getByRole('list', { name: 'Fiscal' });
        expect(within(grupo).getByRole('link', { name: ROTULO_ITEM })).toHaveAttribute('href', '/fiscal/configuracao');
    });

    it('o pai Fiscal fica visível para a sessão que só tem CONSULTAR (o pai carrega a união dos filhos, D109)', () => {
        estado.perms = ['FISCAL_CONFIGURACAO_CONSULTAR'];
        render(<AppMenu />);

        expect(screen.getByRole('list', { name: 'Fiscal' })).toBeInTheDocument();
    });

    it('sessão com outro item fiscal, mas sem nenhuma das duas permissões, não vê o item novo', () => {
        estado.perms = ['FISCAL_CONSULTAR'];
        render(<AppMenu />);

        const grupo = screen.getByRole('list', { name: 'Fiscal' });
        expect(within(grupo).getByRole('link', { name: 'Notas fiscais' })).toBeInTheDocument();
        expect(within(grupo).queryByRole('link', { name: ROTULO_ITEM })).not.toBeInTheDocument();
    });

    it('sessão sem nenhuma permissão fiscal não vê o grupo Fiscal nem o item', () => {
        estado.perms = [];
        render(<AppMenu />);

        expect(screen.queryByRole('list', { name: 'Fiscal' })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: ROTULO_ITEM })).not.toBeInTheDocument();
    });
});
