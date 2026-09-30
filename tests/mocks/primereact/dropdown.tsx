// Dublê do `Dropdown` do PrimeReact para testes de componente (b72). O painel real abre em portal e não é
// operável por papel no jsdom; aqui ele vira um `<select>` nativo com o mesmo contrato de props que o
// código de produção usa: `inputId`/`id`, `aria-label`, `value`, `options` (`label`/`value`), `placeholder`,
// `disabled`, `onChange({ value })`, e -- quando há `onFilter` -- um campo de busca que chama
// `onFilter({ filter })`, como o filtro do painel real faz. Sem `inputId` (caso do `SearchSelect`, cujo `id` vai no
// contêiner e não liga a `<label>`), o nome acessível é o `placeholder`, como o leitor de tela anuncia o real. O valor da opção é o índice na lista, para que
// valores numéricos e `null` ("Qualquer item") voltem ao `onChange` com o tipo original.
//
// Uso: `vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));`

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
    const idDoCampo = inputId ?? id;

    return (
        <span>
            <select
                id={idDoCampo}
                aria-label={rest['aria-label'] ?? (inputId ? undefined : placeholder)}
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
