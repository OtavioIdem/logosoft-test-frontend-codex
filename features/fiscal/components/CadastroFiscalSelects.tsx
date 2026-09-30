'use client';

// Selects de NCM e CFOP (v1.11.0a8b72, D99). Antes em `features/tributacao/components/CadastroFiscalSelects.tsx`;
// a D47 item 3 manda ficarem em `features/fiscal`, e Tributação importa daqui (sem terceira busca).
//
// Busca NO SERVIDOR com debounce (D52), erro da busca VISÍVEL com nova tentativa (antes o select só mostrava lista
// vazia) e, no CFOP, filtro de `ambito` e `tipo` (guia de busca: o backend não impõe o tipo, B-32). O `value` do
// select é o id do cadastro; o código sai no 2º argumento de `onChange({ codigo })` (o mapeamento de natureza
// envia o CÓDIGO do CFOP).

import { useMemo, useState } from 'react';
import { SearchSelect } from '@/components/forms/SearchSelect';
import { CadastroFiscalSelectBuscaErro } from '@/features/fiscal/components/CadastroFiscalSelectBuscaErro';
import { useCfopOptions, useNcmOptions } from '@/features/fiscal/hooks/useCadastrosFiscais';
import { SelectOption } from '@/types/erp';

type CadastroSelecionado = { id: string; codigo?: string | null; descricao?: string | null };

/**
 * A busca traz só a primeira página do cadastro. Ao editar um registro já salvo, o item selecionado pode não
 * estar nessa página — sem este merge o campo apareceria vazio e o usuário salvaria por cima de um vínculo
 * que continuava lá.
 */
const comSelecionado = (options: SelectOption<string>[], selecionado?: CadastroSelecionado | null) => {
    if (!selecionado?.id || options.some((option) => option.value === selecionado.id)) return options;
    const descricao = [selecionado.codigo, selecionado.descricao].filter(Boolean).join(' — ');
    return [{ label: descricao || 'Registro selecionado', value: selecionado.id }, ...options];
};

export const CADASTRO_FISCAL_SEM_PERMISSAO = 'Consulta de cadastros fiscais indisponível: seu usuário não possui FISCAL_CADASTROS_CONSULTAR.';

export const NcmSelect = ({
    id,
    value,
    selecionado,
    onChange,
    disabled
}: {
    id?: string;
    value?: string | null;
    selecionado?: CadastroSelecionado | null;
    onChange: (value: string | null, item?: { codigo: string } | null) => void;
    disabled?: boolean;
}) => {
    const [termo, setTermo] = useState('');
    const consulta = useNcmOptions(termo || null);
    const options = useMemo(() => comSelecionado(consulta.options, selecionado), [consulta.options, selecionado]);

    return (
        <>
            <SearchSelect
                id={id}
                value={value ?? null}
                options={options}
                onChange={(next) => {
                    const item = consulta.itens.find((candidato) => candidato.id === next);
                    onChange(next, item ? { codigo: item.codigo } : null);
                }}
                onSearch={setTermo}
                placeholder="Buscar NCM"
                filterPlaceholder="Código ou descrição do NCM"
                emptyMessage={consulta.permitido ? 'Nenhum NCM encontrado.' : CADASTRO_FISCAL_SEM_PERMISSAO}
                loading={consulta.isBuscando}
                disabled={disabled || !consulta.permitido}
                maxLabelLength={60}
            />
            <CadastroFiscalSelectBuscaErro error={consulta.error} mensagem="Não foi possível buscar os NCMs. Tente novamente." fetching={consulta.isFetching} onRetry={() => void consulta.refetch()} />
        </>
    );
};

export const CfopSelect = ({
    id,
    value,
    selecionado,
    onChange,
    disabled,
    ambito,
    tipo,
    emptyMessage,
    semPermissaoMessage,
    erroMessage,
    placeholder
}: {
    id?: string;
    value?: string | null;
    selecionado?: CadastroSelecionado | null;
    onChange: (value: string | null, item?: { codigo: string } | null) => void;
    disabled?: boolean;
    /** `AmbitoCfop` (1 Interno, 2 Interestadual, 3 Exterior): filtra a busca no servidor. */
    ambito?: number | null;
    /** `TipoCfop` (1 Entrada, 2 Saída): filtra a busca no servidor, como guia (B-32). */
    tipo?: number | null;
    emptyMessage?: string;
    semPermissaoMessage?: string;
    erroMessage?: string;
    placeholder?: string;
}) => {
    const [termo, setTermo] = useState('');
    const consulta = useCfopOptions(termo || null, { ambito, tipo });
    const options = useMemo(() => comSelecionado(consulta.options, selecionado), [consulta.options, selecionado]);

    return (
        <>
            <SearchSelect
                id={id}
                value={value ?? null}
                options={options}
                onChange={(next) => {
                    const item = consulta.itens.find((candidato) => candidato.id === next);
                    onChange(next, item ? { codigo: item.codigo } : null);
                }}
                onSearch={setTermo}
                placeholder={placeholder ?? 'Buscar CFOP'}
                filterPlaceholder="Código ou descrição do CFOP"
                emptyMessage={consulta.permitido ? emptyMessage ?? 'Nenhum CFOP encontrado.' : semPermissaoMessage ?? CADASTRO_FISCAL_SEM_PERMISSAO}
                loading={consulta.isBuscando}
                disabled={disabled || !consulta.permitido}
                maxLabelLength={60}
            />
            <CadastroFiscalSelectBuscaErro error={consulta.error} mensagem={erroMessage ?? 'Não foi possível buscar os CFOPs. Tente novamente.'} fetching={consulta.isFetching} onRetry={() => void consulta.refetch()} />
        </>
    );
};
