'use client';

import { useEffect, useRef, useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

type SearchInputProps = {
    /** Termo inicial. O componente é dono do texto digitado; use `resetKey` para forçar limpeza externa. */
    defaultValue?: string;
    /** Recebe o termo já com debounce aplicado. */
    onChange: (term: string) => void;
    debounceMs?: number;
    placeholder?: string;
    /** Rótulo acessível (leitores de tela). Cai para `placeholder` quando ausente. */
    ariaLabel?: string;
    id?: string;
    className?: string;
    disabled?: boolean;
    /** Ao mudar, reseta o texto para `defaultValue` (ex.: botão "limpar filtros"). */
    resetKey?: unknown;
};

/**
 * Campo de busca padrão das toolbars: debounce embutido + rótulo acessível.
 * Resolve os achados B#2 (busca sem debounce), B#6 (UI duplicada) e B#7 (input sem label) da auditoria.
 */
export const SearchInput = ({ defaultValue = '', onChange, debounceMs = 350, placeholder = 'Buscar', ariaLabel, id, className, disabled, resetKey }: SearchInputProps) => {
    const [text, setText] = useState(defaultValue);
    const debounced = useDebouncedValue(text, debounceMs);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        setText(defaultValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetKey]);

    useEffect(() => {
        onChangeRef.current(debounced);
    }, [debounced]);

    return (
        <span className="p-input-icon-left">
            <i className="pi pi-search" aria-hidden="true" />
            <InputText id={id} value={text} onChange={(event) => setText(event.target.value)} placeholder={placeholder} aria-label={ariaLabel ?? placeholder} className={className} disabled={disabled} />
        </span>
    );
};
