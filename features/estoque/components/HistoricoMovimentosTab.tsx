'use client';

import { useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { DataTableServer } from '@/components/data/DataTableServer';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EstoqueFilterBar } from '@/features/estoque/components/EstoqueFilterBar';
import { filterLocalRecords, formatDateTime, formatQuantity } from '@/features/estoque/components/estoqueUiUtils';
import { calcularResumoMovimentos, movimentoEstoqueLabel, movimentoEstoqueSeverity, movimentoImpactoLabel } from '@/features/estoque/components/estoqueUxUtils';
import { useLocaisEstoque, useMovimentosEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { EstoqueListQuery, MovimentoEstoqueResponse } from '@/features/estoque/types/estoque.types';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { mapApiError } from '@/lib/http/apiError';

// `GET /api/estoque/movimentos` não pagina no servidor (D75) — o período é a mitigação real de
// volume, por isso o filtro nasce com 30 dias em vez de aberto.
const TRINTA_DIAS_EM_MS = 30 * 24 * 60 * 60 * 1000;
const periodoPadrao = (): { inicio: string; fim: string } => {
    const fim = new Date();
    const inicio = new Date(fim.getTime() - TRINTA_DIAS_EM_MS);
    return { inicio: inicio.toISOString(), fim: fim.toISOString() };
};

// Conteúdo da aba Histórico dentro de `EstoqueMovimentosPage` (D72). A guarda fica dentro do
// `TabPanel`, não bloqueando a página inteira — quem só tem ESTOQUE_MOVIMENTAR vê Entrada/Saída e
// esta aba com `UnauthorizedState`.
export const HistoricoMovimentosTab = () => {
    const { hasPermission } = usePermissions();
    const [filters, setFilters] = useState<EstoqueListQuery>(() => periodoPadrao());
    const [localSearch, setLocalSearch] = useState('');
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const movimentosQuery = useMovimentosEstoque(filters);
    const produtosQuery = useProdutos({ empresaId: filters.empresaId, filialId: filters.filialId });
    const locaisQuery = useLocaisEstoque({ empresaId: filters.empresaId, filialId: filters.filialId });
    const records = useMemo(() => filterLocalRecords(movimentosQuery.data ?? [], localSearch), [movimentosQuery.data, localSearch]);
    const visibleRecords = useMemo(() => records.slice(first, first + rows), [records, first, rows]);
    const produtoLabelMap = useMemo(() => new Map((produtosQuery.data ?? []).map((produto) => [produto.id, `${produto.codigo} • ${produto.descricao}`])), [produtosQuery.data]);
    const localLabelMap = useMemo(() => new Map((locaisQuery.data ?? []).map((local) => [local.id, `${local.codigo} • ${local.nome}`])), [locaisQuery.data]);
    const resumo = useMemo(() => calcularResumoMovimentos(records), [records]);

    if (!hasPermission('ESTOQUE_CONSULTAR')) return <UnauthorizedState description="Histórico de movimentos exige ESTOQUE_CONSULTAR." />;

    const updateFilter = (name: keyof EstoqueListQuery, value: string | null) => { setFirst(0); setFilters((current) => ({ ...current, [name]: value || null })); };
    const semPeriodo = !filters.inicio || !filters.fim;

    return (
        <>
            <EstoqueFilterBar filters={filters} produtos={produtosQuery.data ?? []} locais={locaisQuery.data ?? []} showProduto showLocal showPeriodo search={localSearch} onSearchChange={(value) => { setFirst(0); setLocalSearch(value); }} onFilterChange={updateFilter} />
            {semPeriodo ? <Message className="w-full mt-3" severity="warn" text="Sem início e fim definidos, a consulta traz todo o histórico de movimentos — o endpoint não pagina no servidor e a lista pode ficar grande." /> : null}
            <div className="grid my-3">
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Movimentos</span><strong className="text-2xl">{resumo.totalMovimentos}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Entradas/Ajustes +</span><strong className="text-2xl">{resumo.entradas}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Saídas/Baixas</span><strong className="text-2xl">{resumo.saidas}</strong></Card></div>
                <div className="col-12 md:col-3"><Card><span className="block text-color-secondary mb-2">Quantidade movimentada</span><strong className="text-2xl">{formatQuantity(resumo.quantidadeMovimentada)}</strong><small className="block text-color-secondary mt-2">{resumo.reservas} movimento(s) de reserva</small></Card></div>
            </div>
            <Card>
                {movimentosQuery.error ? <ApiErrorPanel error={mapApiError(movimentosQuery.error)} /> : null}
                <DataTableServer<MovimentoEstoqueResponse> value={visibleRecords} totalRecords={records.length} loading={movimentosQuery.isFetching} first={first} rows={rows} onPage={(event) => { setFirst(event.first); setRows(event.rows); }}>
                    <Column header="Produto" body={(row) => produtoLabelMap.get(row.produtoId) ?? 'Produto não carregado'} />
                    <Column header="Local" body={(row) => localLabelMap.get(row.localEstoqueId) ?? 'Local não carregado'} />
                    <Column header="Tipo" body={(row: MovimentoEstoqueResponse) => <Tag value={movimentoEstoqueLabel(row.tipo)} severity={movimentoEstoqueSeverity(row.tipo)} />} />
                    <Column header="Quantidade" body={(row: MovimentoEstoqueResponse) => formatQuantity(row.quantidade)} />
                    <Column field="origemModulo" header="Origem" />
                    <Column header="Impacto" body={(row: MovimentoEstoqueResponse) => movimentoImpactoLabel(row.tipo)} />
                    <Column field="documento" header="Documento" />
                    <Column field="motivo" header="Motivo" />
                    <Column header="Data" body={(row: MovimentoEstoqueResponse) => formatDateTime(row.dataMovimento)} />
                </DataTableServer>
                {!movimentosQuery.isLoading && records.length === 0 ? <EmptyState title="Nenhum movimento" description="Registre uma entrada, saída, ajuste ou reserva, ou amplie o período do filtro." /> : null}
            </Card>
        </>
    );
};
