'use client';

import { DateInput } from '@/components/forms/DateInput';
import { SearchInput } from '@/components/forms/SearchInput';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EstoqueListQuery, LocalEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { localOptions, produtoOptions } from '@/features/estoque/components/estoqueUiUtils';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';

const toDateOrNull = (value?: string | null) => (value ? new Date(value) : null);

// `showPeriodo` é opt-in (D75): os demais consumidores (Saldos, Reservas) não declaram período e
// continuam exatamente como antes.
export const EstoqueFilterBar = ({ filters, produtos, locais, showProduto = false, showLocal = false, showPeriodo = false, search, onSearchChange, onFilterChange }: { filters: EstoqueListQuery; produtos?: ProdutoResponse[]; locais?: LocalEstoqueResponse[]; showProduto?: boolean; showLocal?: boolean; showPeriodo?: boolean; search: string; onSearchChange: (value: string) => void; onFilterChange: (name: keyof EstoqueListQuery, value: string | null) => void }) => (
    <div className="flex flex-column md:flex-row flex-wrap gap-2 md:align-items-center">
        <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => onFilterChange('empresaId', value)} onFilialChange={(value) => onFilterChange('filialId', value)} />
        {showProduto ? <div className="min-w-18rem"><EntitySelect entityName="produto" value={filters.produtoId ?? null} options={produtoOptions(produtos ?? [])} onChange={(value) => onFilterChange('produtoId', value)} /></div> : null}
        {showLocal ? <div className="min-w-18rem"><EntitySelect entityName="local" value={filters.localEstoqueId ?? null} options={localOptions(locais ?? [])} onChange={(value) => onFilterChange('localEstoqueId', value)} /></div> : null}
        {showPeriodo ? (
            <>
                <DateInput id="estoqueFiltroInicio" value={toDateOrNull(filters.inicio)} onChange={(value) => onFilterChange('inicio', value ? value.toISOString() : null)} />
                <DateInput id="estoqueFiltroFim" value={toDateOrNull(filters.fim)} onChange={(value) => onFilterChange('fim', value ? value.toISOString() : null)} />
            </>
        ) : null}
        <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <SearchInput ariaLabel="Buscar" defaultValue={search} onChange={onSearchChange} />
        </span>
    </div>
);
