// Dublê do `Dropdown` do PrimeReact para testes de componente (b72). O painel real abre em portal e não é
// operável por papel no jsdom; aqui ele vira um `<select>` nativo com o mesmo contrato de props que o
// código de produção usa: `inputId`/`id`, `aria-label`, `value`, `options` (`label`/`value`), `placeholder`,
// `disabled`, `onChange({ value })`, e -- quando há `onFilter` -- um campo de busca que chama
// `onFilter({ filter })`, como o filtro do painel real faz. O valor da opção é o índice na lista, para que
// valores numéricos e `null` ("Qualquer item") voltem ao `onChange` com o tipo original.
//
// NOME FALSO (decisão B, c3): o PrimeReact real NÃO dá nome ao campo focável de um SearchSelect sem ariaLabel
// (o placeholder vai só para o gatilho). Para não quebrar os testes de CFOP e município, este dublê usa o
// placeholder como nome do `<select>` SOMENTE quando não há `aria-label` nem `<label for>` apontando para o
// campo (o rótulo vence, como no DOM real). Dívida registrada da c3: CFOP (features/fiscal, CadastroFiscalSelects)
// e município (features/pessoas) devem ganhar ariaLabel no ponto de chamada; remover este fallback quando isso for feito.
//
// Uso: `vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));`

import { useLayoutEffect, useRef } from 'react';

type Opcao = Record<string, unknown>;

type DropdownDubleProps = {
    id?: string;
    inputId?: string;
    value?: unknown;
    options?: Opcao[];
    optionLabel?: string;
    optionValue?: string;
    placeholder?: string;
    filterPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    'aria-label'?: string;
    onChange?: (event: { value: unknown }) => void;
    onFilter?: (event: { filter: string }) => void;
};

export const Dropdown = ({ id, inputId, value, options = [], optionLabel = 'label', optionValue = 'value', placeholder, filterPlaceholder, emptyMessage, disabled, onChange, onFilter, ...rest }: DropdownDubleProps) => {
    const valorDe = (opcao: Opcao) => (opcao[optionValue] === undefined ? null : opcao[optionValue]);
    const indice = options.findIndex((opcao) => Object.is(valorDe(opcao), value === undefined ? null : value));
    const selectRef = useRef<HTMLSelectElement>(null);
    const ariaLabelExplicito = rest['aria-label'];

    // Como no PrimeReact real: `id` fica na raiz (não rotulável); só `inputId` vai para o elemento focável.
    // Um `<label for>` só nomeia o campo quando aponta para o `inputId`; apontar para o `id` da raiz não nomeia nada.
    // Fallback de nome (ver comentário no topo): aplicado depois do commit, se não houver rótulo para o `inputId`.
    useLayoutEffect(() => {
        const select = selectRef.current;
        if (!select || ariaLabelExplicito !== undefined || !placeholder) return;
        const temRotulo = Boolean(inputId) && Array.from(document.querySelectorAll('label[for]')).some((label) => label.getAttribute('for') === inputId);
        if (!temRotulo) select.setAttribute('aria-label', placeholder);
    });

    return (
        <span id={id}>
            <select
                ref={selectRef}
                id={inputId}
                aria-label={ariaLabelExplicito}
                disabled={disabled}
                value={indice >= 0 ? String(indice) : ''}
                onChange={(event) => onChange?.({ value: event.target.value === '' ? null : valorDe(options[Number(event.target.value)]) })}
            >
                <option value="">{placeholder ?? ''}</option>
                {options.map((opcao, posicao) => (
                    <option key={posicao} value={String(posicao)}>
                        {String(opcao[optionLabel])}
                    </option>
                ))}
            </select>
            {onFilter ? <input type="search" aria-label={filterPlaceholder ?? 'Buscar'} disabled={disabled} onChange={(event) => onFilter({ filter: event.target.value })} /> : null}
            {options.length === 0 && emptyMessage ? <small>{emptyMessage}</small> : null}
        </span>
    );
};
