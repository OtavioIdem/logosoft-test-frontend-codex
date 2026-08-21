/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { PrimeReactContext } from 'primereact/api';
import { Tooltip } from 'primereact/tooltip';
import { classNames } from 'primereact/utils';
import React, { forwardRef, useContext, useImperativeHandle, useRef } from 'react';
import { AppTopbarRef } from '@/types';
import { LayoutContext } from './context/layoutcontext';
import { usePaginaAtual } from './context/pageheadercontext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { NotificacoesBell } from '@/features/notificacoes/components/NotificacoesBell';
import { OrganizationalContextSelector } from '@/components/organizational/OrganizationalContextSelector';

const AppTopbar = forwardRef<AppTopbarRef>((_, ref) => {
    const { layoutConfig, layoutState, setLayoutConfig, onMenuToggle, showProfileSidebar } = useContext(LayoutContext);
    const { changeTheme } = useContext(PrimeReactContext);
    const pagina = usePaginaAtual();
    const { user, logout } = useAuth();
    const menubuttonRef = useRef<HTMLButtonElement>(null);
    const topbarmenuRef = useRef<HTMLDivElement>(null);
    const topbarmenubuttonRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(ref, () => ({
        menubutton: menubuttonRef.current,
        topbarmenu: topbarmenuRef.current,
        topbarmenubutton: topbarmenubuttonRef.current
    }));

    const toggleTheme = () => {
        const nextTheme = layoutConfig.colorScheme === 'light' ? 'lara-dark-indigo' : 'lara-light-indigo';
        const nextScheme = layoutConfig.colorScheme === 'light' ? 'dark' : 'light';
        changeTheme?.(layoutConfig.theme, nextTheme, 'theme-css', () => {
            setLayoutConfig((prev) => ({ ...prev, theme: nextTheme, colorScheme: nextScheme }));
        });
    };

    return (
        <div className="layout-topbar">
            <Link href="/dashboard" className="layout-topbar-logo">
                <img src={`/layout/images/logo-${layoutConfig.colorScheme !== 'light' ? 'white' : 'dark'}.svg`} width="47.22px" height="35px" alt="logosoft" />
                <span>logosoft</span>
            </Link>

            <button ref={menubuttonRef} type="button" className="p-link layout-menu-button layout-topbar-button" onClick={onMenuToggle} aria-label="Abrir menu">
                <i className="pi pi-bars" />
            </button>

            {pagina ? (
                <div className="layout-topbar-title">
                    <h1 className="layout-topbar-title-text">{pagina.titulo}</h1>
                    {pagina.descricao ? (
                        <>
                            {/* A descrição saiu do corpo da página e virou dica: fica acessível sem ocupar a
                                primeira dobra de toda tela. `data-pr-tooltip` é lido pelo Tooltip abaixo. */}
                            <Tooltip target=".layout-topbar-title-help" position="bottom" className="layout-topbar-title-tooltip" />
                            <button
                                type="button"
                                className="p-link layout-topbar-title-help"
                                data-pr-tooltip={pagina.descricao}
                                aria-label={`Sobre a tela ${pagina.titulo}: ${pagina.descricao}`}
                            >
                                <i className="pi pi-info-circle" aria-hidden="true" />
                            </button>
                        </>
                    ) : null}
                </div>
            ) : null}

            <button ref={topbarmenubuttonRef} type="button" className="p-link layout-topbar-menu-button layout-topbar-button" onClick={showProfileSidebar} aria-label="Abrir ações rápidas">
                <i className="pi pi-ellipsis-v" />
            </button>

            <div ref={topbarmenuRef} className={classNames('layout-topbar-menu', { 'layout-topbar-menu-mobile-active': layoutState.profileSidebarVisible })}>
                <OrganizationalContextSelector />
                <NotificacoesBell />
                <button type="button" className="p-link layout-topbar-button" onClick={toggleTheme} aria-label="Alternar tema claro e escuro">
                    <i className={layoutConfig.colorScheme === 'light' ? 'pi pi-moon' : 'pi pi-sun'}></i>
                    <span className="layout-topbar-button-label">{layoutConfig.colorScheme === 'light' ? 'Tema escuro' : 'Tema claro'}</span>
                </button>
                <button type="button" className="p-link layout-topbar-button" aria-label="Perfil do usuário">
                    <i className="pi pi-user"></i>
                    <span className="layout-topbar-button-label">{user?.nome ?? 'Perfil'}</span>
                </button>
                <button type="button" className="p-link layout-topbar-button" onClick={logout} aria-label="Sair da aplicação">
                    <i className="pi pi-sign-out"></i>
                    <span className="layout-topbar-button-label">Sair</span>
                </button>
            </div>
        </div>
    );
});

AppTopbar.displayName = 'AppTopbar';

export default AppTopbar;
