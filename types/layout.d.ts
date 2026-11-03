import React, { Dispatch, HTMLAttributeAnchorTarget, MutableRefObject, ReactNode, SetStateAction } from 'react';
import { PermissionCode } from './erp';

export type ChildContainerProps = {
    children: ReactNode;
};


export type LayoutState = {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    profileSidebarVisible: boolean;
    staticMenuMobileActive: boolean;
    menuHoverActive: boolean;
};

export type LayoutConfig = {
    ripple: boolean;
    inputStyle: string;
    menuMode: string;
    colorScheme: string;
    theme: string;
    scale: number;
};

export interface LayoutContextProps {
    layoutConfig: LayoutConfig;
    setLayoutConfig: Dispatch<SetStateAction<LayoutConfig>>;
    layoutState: LayoutState;
    setLayoutState: Dispatch<SetStateAction<LayoutState>>;
    onMenuToggle: () => void;
    showProfileSidebar: () => void;
}

export interface MenuContextProps {
    activeMenu: string;
    setActiveMenu: Dispatch<SetStateAction<string>>;
}

export type NodeRef = MutableRefObject<ReactNode>;

export interface AppTopbarRef {
    menubutton?: HTMLButtonElement | null;
    topbarmenu?: HTMLDivElement | null;
    topbarmenubutton?: HTMLButtonElement | null;
}

export type MenuModelItem = AppMenuItem;

export interface MenuModel {
    label: string;
    icon?: string;
    items?: MenuModel[];
    to?: string;
    url?: string;
    target?: HTMLAttributeAnchorTarget;
    seperator?: boolean;
}

export interface AppMenuItem extends Omit<MenuModel, 'items'> {
    items?: AppMenuItem[];
    badge?: 'UPDATED' | 'NEW';
    badgeClass?: string;
    class?: string;
    preventExact?: boolean;
    visible?: boolean;
    disabled?: boolean;
    replaceUrl?: boolean;
    permission?: PermissionCode;
    anyPermissions?: PermissionCode[];
    allPermissions?: PermissionCode[];
    // Eixo próprio, separado de permissão: a tela existe e o backend a autoriza para quem tem a
    // permissão do módulo, mas o frontend só a oferece ao usuário master enquanto o módulo não
    // tiver fluxo que a sustente (D109). Não é `allPermissions` nem permissão sentinela —
    // nenhuma permissão entra ou sai do union por causa disto.
    masterOnly?: boolean;
    command?: ({ originalEvent, item }: { originalEvent: React.MouseEvent<HTMLAnchorElement, MouseEvent>; item: MenuModelItem }) => void;
}

export interface AppMenuItemProps {
    item?: AppMenuItem;
    parentKey?: string;
    index?: number;
    root?: boolean;
    className?: string;
}
