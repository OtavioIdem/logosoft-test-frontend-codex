'use client';

import Link from 'next/link';
import { Button } from 'primereact/button';

export default function AcessoNegadoPage() {
    return (
        <div className="min-h-screen flex align-items-center justify-content-center p-4 surface-ground">
            <div className="surface-card border-round p-5 text-center shadow-2 max-w-30rem">
                <i className="pi pi-lock text-6xl text-orange-500 mb-4" />
                <h1 className="mt-0">Acesso negado</h1>
                <p className="line-height-3 text-color-secondary">Seu usuário não possui permissão para acessar esta área da logosoft.</p>
                <Link href="/dashboard">
                    <Button label="Voltar ao dashboard" icon="pi pi-arrow-left" />
                </Link>
            </div>
        </div>
    );
}
