import { CategoriaBem, StatusBem, StatusInventarioPatrimonio } from '@/features/patrimonio/types/patrimonio.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const categoriaMap: Record<number, string> = {
    [CategoriaBem.Movel]: 'Móvel',
    [CategoriaBem.Imovel]: 'Imóvel',
    [CategoriaBem.Veiculo]: 'Veículo',
    [CategoriaBem.Equipamento]: 'Equipamento',
    [CategoriaBem.Informatica]: 'Informática',
    [CategoriaBem.Outro]: 'Outro'
};

const statusBemMap: Record<number, string> = {
    [StatusBem.Ativo]: 'Ativo',
    [StatusBem.Bloqueado]: 'Bloqueado',
    [StatusBem.Baixado]: 'Baixado'
};

const statusInventarioMap: Record<number, string> = {
    [StatusInventarioPatrimonio.Aberto]: 'Aberto',
    [StatusInventarioPatrimonio.Encerrado]: 'Encerrado'
};

export const categoriaBemLabel = (value: number) => labelFromMap(categoriaMap, value);
export const statusBemLabel = (value: number) => labelFromMap(statusBemMap, value);
export const statusInventarioPatrimonioLabel = (value: number) => labelFromMap(statusInventarioMap, value);

export const categoriaBemOptions = optionsFromMap(categoriaMap);
export const categoriaBemFilterOptions = [{ label: 'Todas as categorias', value: null }, ...optionsFromMap(categoriaMap)];
export const statusBemFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusBemMap)];
export const statusInventarioFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusInventarioMap)];

export const statusBemSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusBem.Ativo:
            return 'success';
        case StatusBem.Bloqueado:
            return 'warning';
        default:
            return 'danger';
    }
};

export const statusInventarioPatrimonioSeverity = (value: number): Severity => (n(value) === StatusInventarioPatrimonio.Encerrado ? 'success' : 'warning');

// Regras de transição de estado (UI). O backend é a autoridade final.
export const bemPodeTransferir = (status: number) => n(status) === StatusBem.Ativo;
export const bemPodeBloquear = (status: number) => n(status) === StatusBem.Ativo;
export const bemPodeDesbloquear = (status: number) => n(status) === StatusBem.Bloqueado;
export const bemPodeBaixar = (status: number) => [StatusBem.Ativo, StatusBem.Bloqueado].includes(n(status));
export const inventarioPatrimonioAberto = (status: number) => n(status) === StatusInventarioPatrimonio.Aberto;
