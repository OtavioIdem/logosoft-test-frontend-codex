'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { unidadesTributaveisApi } from '@/features/produtos/api/produtosApi';
import { SelectOption } from '@/types/erp';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

const CADASTROS_PERMISSAO = 'FISCAL_CADASTROS_CONSULTAR';

export const unidadesTributaveisQueryKey = (termo?: string | null) => ['produtos', 'unidade-tributavel', termo ?? null] as const;

/**
 * Catálogo oficial global de unidade tributável (Mód.04, `GET /api/fiscal/cadastros/unidades-tributaveis`),
 * resolvido pela sigla — o `value` do select é sempre a sigla (`string`), nunca um Id: o backend resolve
 * `UnidadeTributavelOficialId` no servidor a partir da sigla enviada (D60). Guarda escopada ao próprio
 * campo (D61) — quem chama este hook decide o `disabled`/aviso a partir de `permitido`, não este hook.
 * Mesma forma de `useUfCatalogo`/`useMunicipioCatalogo` (b64): busca no servidor com debounce de 350ms,
 * nunca o catálogo inteiro numa dropdown (D52).
 */
export const useUnidadesTributaveis = (habilitado = true) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(CADASTROS_PERMISSAO);
    const [termo, setTermo] = useState('');
    const debouncedTermo = useDebouncedValue(termo, 350);
    const query = useQuery({
        queryKey: unidadesTributaveisQueryKey(debouncedTermo || null),
        queryFn: () => unidadesTributaveisApi.listar({ termo: debouncedTermo || null, tamanhoPagina: 20 }),
        enabled: permitido && habilitado,
        staleTime: 5 * 60 * 1000
    });
    const options = useMemo<SelectOption<string>[]>(() => (query.data?.items ?? []).map((item) => ({ label: `${item.sigla} — ${item.descricao}`, value: item.sigla })), [query.data]);

    return { ...query, options, permitido, itens: query.data?.items ?? [], buscar: setTermo };
};
