'use client';

import React, { useEffect, useState, createContext } from 'react';
import { LayoutState, ChildContainerProps, LayoutConfig, LayoutContextProps } from '@/types';

export const LayoutContext = createContext({} as LayoutContextProps);

const THEME_STORAGE_KEY = 'logosoft.theme';

const defaultLayoutConfig: LayoutConfig = {
    ripple: false,
    inputStyle: 'outlined',
    menuMode: 'static',
    colorScheme: 'light',
    theme: 'lara-light-indigo',
    scale: 14
};

const readStoredLayout = (): LayoutConfig => {
    if (typeof window === 'undefined') return defaultLayoutConfig;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) return defaultLayoutConfig;

    try {
        return { ...defaultLayoutConfig, ...(JSON.parse(stored) as Partial<LayoutConfig>) };
    } catch {
        return defaultLayoutConfig;
    }
};

const applyThemeLink = (theme: string) => {
    if (typeof document === 'undefined') return;
    const themeLink = document.getElementById('theme-css') as HTMLLinkElement | null;
    if (themeLink) themeLink.href = `/themes/${theme}/theme.css`;
};

export const LayoutProvider = ({ children }: ChildContainerProps) => {
    const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(defaultLayoutConfig);

    const [layoutState, setLayoutState] = useState<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        profileSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false
    });

    useEffect(() => {
        const storedConfig = readStoredLayout();
        setLayoutConfig(storedConfig);
        applyThemeLink(storedConfig.theme);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(layoutConfig));
        applyThemeLink(layoutConfig.theme);
        document.documentElement.style.fontSize = layoutConfig.scale + 'px';
    }, [layoutConfig]);

    const onMenuToggle = () => {
        if (isOverlay()) {
            setLayoutState((prevLayoutState) => ({ ...prevLayoutState, overlayMenuActive: !prevLayoutState.overlayMenuActive }));
        }

        if (isDesktop()) {
            setLayoutState((prevLayoutState) => ({ ...prevLayoutState, staticMenuDesktopInactive: !prevLayoutState.staticMenuDesktopInactive }));
        } else {
            setLayoutState((prevLayoutState) => ({ ...prevLayoutState, staticMenuMobileActive: !prevLayoutState.staticMenuMobileActive }));
        }
    };

    const showProfileSidebar = () => {
        setLayoutState((prevLayoutState) => ({ ...prevLayoutState, profileSidebarVisible: !prevLayoutState.profileSidebarVisible }));
    };

    const isOverlay = () => layoutConfig.menuMode === 'overlay';

    const isDesktop = () => typeof window !== 'undefined' && window.innerWidth > 991;

    const value: LayoutContextProps = {
        layoutConfig,
        setLayoutConfig,
        layoutState,
        setLayoutState,
        onMenuToggle,
        showProfileSidebar
    };

    return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};
