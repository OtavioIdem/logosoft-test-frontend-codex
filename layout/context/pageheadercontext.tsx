'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ChildContainerProps } from '@/types';

export type PaginaAtual = {
    /** Rota que registrou o cabeçalho. É o que evita exibir o título da tela anterior durante a navegação. */
    pathname: string;
    titulo: string;
    descricao?: string;
};

type PageHeaderContextValue = {
    registrar: (pagina: PaginaAtual) => void;
    pagina: PaginaAtual | null;
};

const PageHeaderContext = createContext<PageHeaderContextValue>({ registrar: () => undefined, pagina: null });

/**
 * Guarda o título/descrição da tela ativa para o topbar exibir. O `PageHeader` de cada tela registra aqui em
 * vez de desenhar o próprio cabeçalho — assim as 80+ telas continuam declarando título e descrição do mesmo
 * jeito, e quem decide onde isso aparece é o layout.
 *
 * O `pathname` viaja junto de propósito: durante uma navegação o componente novo monta antes de o antigo
 * desmontar, e comparar a rota é o que impede o topbar de piscar o título da tela anterior. Não há limpeza no
 * unmount justamente porque ela criaria a corrida oposta.
 */
export const PageHeaderProvider = ({ children }: ChildContainerProps) => {
    const [pagina, setPagina] = useState<PaginaAtual | null>(null);

    const registrar = useCallback((proxima: PaginaAtual) => {
        setPagina((atual) => (atual?.pathname === proxima.pathname && atual.titulo === proxima.titulo && atual.descricao === proxima.descricao ? atual : proxima));
    }, []);

    const value = useMemo(() => ({ registrar, pagina }), [registrar, pagina]);

    return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
};

export const useRegistrarPagina = () => useContext(PageHeaderContext).registrar;

/** Devolve o cabeçalho apenas quando ele pertence à rota atual. */
export const usePaginaAtual = (): PaginaAtual | null => {
    const { pagina } = useContext(PageHeaderContext);
    const pathname = usePathname();
    return pagina && pagina.pathname === pathname ? pagina : null;
};
