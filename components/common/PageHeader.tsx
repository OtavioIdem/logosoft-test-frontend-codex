'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRegistrarPagina } from '@/layout/context/pageheadercontext';

/**
 * Declara o cabeçalho da tela. O título vai para o topbar (centralizado) e a descrição vira a dica de contexto
 * ao lado dele — o corpo da página fica só com as ações, que continuam sendo responsabilidade de cada tela.
 *
 * A assinatura não mudou de propósito: as telas continuam passando `title`/`description`/`actions` como antes,
 * e quem decide onde isso aparece é o layout. Em telas estreitas o título reaparece aqui no corpo, porque no
 * topbar ele competiria por espaço com o logo e os botões.
 */
export const PageHeader = ({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) => {
    const registrar = useRegistrarPagina();
    const pathname = usePathname();

    useEffect(() => {
        registrar({ pathname, titulo: title, descricao: description });
    }, [registrar, pathname, title, description]);

    return (
        <div className="page-header flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3 mb-4">
            <div className="page-header-compact-title">
                <h1 className="m-0 text-2xl font-semibold">{title}</h1>
                {description ? <p className="mt-2 mb-0 text-color-secondary line-height-3">{description}</p> : null}
            </div>
            {actions ? <div className="flex gap-2 flex-wrap page-header-actions">{actions}</div> : null}
        </div>
    );
};
