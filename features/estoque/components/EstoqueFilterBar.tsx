'use client';

import { InputText } from 'primereact/inputtext';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EstoqueListQuery, LocalEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { localOptions, produtoOptions } from '@/features/estoque/components/estoqueUiUtils';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';

export const EstoqueFilterBar = ({ filters, produtos, locais, showProduto = false, showLocal = false, search, onSearchChange, onFilterChange }: { filters: EstoqueListQuery; produtos?: ProdutoResponse[]; locais?: LocalEstoqueResponse[]; showProduto?: boolean; showLocal?: boolean; search: string; onSearchChange: (value: string) => void; onFilterChange: (name: keyof EstoqueListQuery, value: string | null) => void }) => (
    <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
        <EmpresaFilialFilter empresaId={filters.empresaId ?? null} filialId={filters.filialId ?? null} onEmpresaChange={(value) => onFilterChange('empresaId', value)} onFilialChange={(value) => onFilterChange('filialId', value)} />
        {showProduto ? <div className="min-w-18rem"><EntitySelect entityName="produto" value={filters.produtoId ?? null} options={produtoOptions(produtos ?? [])} onChange={(value) => onFilterChange('produtoId', value)} /></div> : null}
        {showLocal ? <div className="min-w-18rem"><EntitySelect entityName="local" value={filters.localEstoqueId ?? null} options={localOptions(locais ?? [])} onChange={(value) => onFilterChange('localEstoqueId', value)} /></div> : null}
        <span className="p-input-icon-left">
            <i className="pi pi-search" />
            <InputText placeholder="Buscar" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </span>
    </div>
);
