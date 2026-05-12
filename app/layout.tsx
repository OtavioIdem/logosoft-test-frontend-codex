'use client';

import { LayoutProvider } from '../layout/context/layoutcontext';
import { PrimeReactProvider } from 'primereact/api';
import { AppProviders } from '@/providers/AppProviders';
import 'primereact/resources/primereact.css';
import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
import '../styles/layout/layout.scss';

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <head>
                <title>logosoft</title>
                <meta name="description" content="Frontend ERP logosoft com Next.js e PrimeReact" />
                {/* eslint-disable-next-line @next/next/no-css-tags -- PrimeReact Sakai troca o tema dinamicamente pelo id theme-css. */}
                <link id="theme-css" href="/themes/lara-light-indigo/theme.css" rel="stylesheet" />
            </head>
            <body>
                <PrimeReactProvider>
                    <LayoutProvider>
                        <AppProviders>{children}</AppProviders>
                    </LayoutProvider>
                </PrimeReactProvider>
            </body>
        </html>
    );
}
