'use client';

import { useMemo, useState } from 'react';
import { SearchSelect } from '@/components/forms/SearchSelect';
import { useCfopOptions, useNcmOptions } from '@/features/tributacao/hooks/useTributacao';
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

const mensagemSemPermissao = 'Consulta de cadastros fiscais indisponível: seu usuário não possui FISCAL_CADASTROS_CONSULTAR.';

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
            emptyMessage={consulta.permitido ? 'Nenhum NCM encontrado.' : mensagemSemPermissao}
            loading={consulta.isFetching}
            disabled={disabled || !consulta.permitido}
            maxLabelLength={60}
        />
    );
};

export const CfopSelect = ({
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
    const consulta = useCfopOptions(termo || null);
    const options = useMemo(() => comSelecionado(consulta.options, selecionado), [consulta.options, selecionado]);

    return (
        <SearchSelect
            id={id}
            value={value ?? null}
            options={options}
            onChange={(next) => {
                const item = consulta.itens.find((candidato) => candidato.id === next);
                onChange(next, item ? { codigo: item.codigo } : null);
            }}
            onSearch={setTermo}
            placeholder="Buscar CFOP"
            filterPlaceholder="Código ou descrição do CFOP"
            emptyMessage={consulta.permitido ? 'Nenhum CFOP encontrado.' : mensagemSemPermissao}
            loading={consulta.isFetching}
            disabled={disabled || !consulta.permitido}
            maxLabelLength={60}
        />
    );
};
