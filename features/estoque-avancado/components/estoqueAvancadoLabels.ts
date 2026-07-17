import { StatusBloqueioEstoque, StatusInventarioEstoque, TipoAjusteEstoque } from '@/features/estoque-avancado/types/estoqueAvancado.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

export const statusInventarioLabel = (value: number) => {
    const map: Record<number, string> = {
        [StatusInventarioEstoque.Aberto]: 'Aberto',
        [StatusInventarioEstoque.EmContagem]: 'Em contagem',
        [StatusInventarioEstoque.Concluido]: 'Concluído',
        [StatusInventarioEstoque.Cancelado]: 'Cancelado'
    };
    return map[n(value)] ?? String(value);
};
export const statusInventarioSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusInventarioEstoque.Concluido:
            return 'success';
        case StatusInventarioEstoque.Cancelado:
            return 'danger';
        case StatusInventarioEstoque.EmContagem:
            return 'warning';
        default:
            return 'info';
    }
};

export const tipoAjusteOptions = [
    { label: 'Entrada', value: TipoAjusteEstoque.Entrada },
    { label: 'Saída', value: TipoAjusteEstoque.Saida }
];
export const tipoAjusteLabel = (value: number) => (n(value) === TipoAjusteEstoque.Entrada ? 'Entrada' : 'Saída');

export const statusBloqueioLabel = (value: number) => {
    const map: Record<number, string> = {
        [StatusBloqueioEstoque.Ativo]: 'Ativo',
        [StatusBloqueioEstoque.Liberado]: 'Liberado',
        [StatusBloqueioEstoque.Cancelado]: 'Cancelado'
    };
    return map[n(value)] ?? String(value);
};
export const statusBloqueioSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusBloqueioEstoque.Liberado:
            return 'success';
        case StatusBloqueioEstoque.Cancelado:
            return 'danger';
        default:
            return 'warning';
    }
};

export const statusInventarioOptions = [
    { label: 'Todos os status', value: null },
    { label: 'Aberto', value: StatusInventarioEstoque.Aberto },
    { label: 'Em contagem', value: StatusInventarioEstoque.EmContagem },
    { label: 'Concluído', value: StatusInventarioEstoque.Concluido },
    { label: 'Cancelado', value: StatusInventarioEstoque.Cancelado }
];

export const inventarioPodeItens = (status: number) => n(status) === StatusInventarioEstoque.Aberto;
export const inventarioPodeIniciar = (status: number) => n(status) === StatusInventarioEstoque.Aberto;
export const inventarioPodeConcluir = (status: number) => n(status) === StatusInventarioEstoque.EmContagem;
export const inventarioPodeCancelar = (status: number) => ![StatusInventarioEstoque.Concluido, StatusInventarioEstoque.Cancelado].includes(n(status));
