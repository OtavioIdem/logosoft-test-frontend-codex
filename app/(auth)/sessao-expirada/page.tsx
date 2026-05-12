'use client';

import Link from 'next/link';
import { Button } from 'primereact/button';

export default function SessaoExpiradaPage() {
    return (
        <div className="min-h-screen flex align-items-center justify-content-center p-4 surface-ground">
            <div className="surface-card border-round p-5 text-center shadow-2 max-w-30rem">
                <i className="pi pi-clock text-6xl text-primary mb-4" />
                <h1 className="mt-0">Sessão expirada</h1>
                <p className="line-height-3 text-color-secondary">Faça login novamente para continuar usando a logosoft com segurança.</p>
                <Link href="/login">
                    <Button label="Entrar novamente" icon="pi pi-sign-in" />
                </Link>
            </div>
        </div>
    );
}
