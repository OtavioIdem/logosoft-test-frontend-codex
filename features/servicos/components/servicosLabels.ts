import { OrdemServicoResponse, PrioridadeOrdemServico, StatusOrdemServico, TipoItemOrdemServico } from '@/features/servicos/types/servicos.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;

const status = Number as unknown as (v: unknown) => number;

export const statusOrdemServicoLabel = (value: number): string => {
    const map: Record<number, string> = {
        [StatusOrdemServico.Aberta]: 'Aberta',
        [StatusOrdemServico.Triagem]: 'Triagem',
        [StatusOrdemServico.Planejada]: 'Planejada',
        [StatusOrdemServico.EmExecucao]: 'Em execução',
        [StatusOrdemServico.EncerradaTecnicamente]: 'Encerrada',
        [StatusOrdemServico.Faturada]: 'Faturada',
        [StatusOrdemServico.Cancelada]: 'Cancelada'
    };
    return map[status(value)] ?? String(value);
};

export const statusOrdemServicoSeverity = (value: number): Severity => {
    switch (status(value)) {
        case StatusOrdemServico.EmExecucao:
            return 'warning';
        case StatusOrdemServico.EncerradaTecnicamente:
        case StatusOrdemServico.Faturada:
            return 'success';
        case StatusOrdemServico.Cancelada:
            return 'danger';
        default:
            return 'info';
    }
};

export const prioridadeLabel = (value: number): string => {
    const map: Record<number, string> = {
        [PrioridadeOrdemServico.Baixa]: 'Baixa',
        [PrioridadeOrdemServico.Media]: 'Média',
        [PrioridadeOrdemServico.Alta]: 'Alta',
        [PrioridadeOrdemServico.Urgente]: 'Urgente'
    };
    return map[status(value)] ?? String(value);
};

export const prioridadeSeverity = (value: number): Severity => {
    switch (status(value)) {
        case PrioridadeOrdemServico.Urgente:
            return 'danger';
        case PrioridadeOrdemServico.Alta:
            return 'warning';
        case PrioridadeOrdemServico.Media:
            return 'info';
        default:
            return null;
    }
};

export const tipoItemLabel = (value: number): string => {
    const map: Record<number, string> = {
        [TipoItemOrdemServico.MaoDeObra]: 'Mão de obra',
        [TipoItemOrdemServico.Material]: 'Material',
        [TipoItemOrdemServico.ServicoExterno]: 'Serviço externo'
    };
    return map[status(value)] ?? String(value);
};

export const prioridadeOptions = [
    { label: 'Baixa', value: PrioridadeOrdemServico.Baixa },
    { label: 'Média', value: PrioridadeOrdemServico.Media },
    { label: 'Alta', value: PrioridadeOrdemServico.Alta },
    { label: 'Urgente', value: PrioridadeOrdemServico.Urgente }
];

export const tipoItemOptions = [
    { label: 'Mão de obra', value: TipoItemOrdemServico.MaoDeObra },
    { label: 'Material', value: TipoItemOrdemServico.Material },
    { label: 'Serviço externo', value: TipoItemOrdemServico.ServicoExterno }
];

// Regras de transição de estado (UI). O backend é a autoridade final.
const s = (os: OrdemServicoResponse) => status(os.statusOS);
export const podeTriar = (os: OrdemServicoResponse) => s(os) === StatusOrdemServico.Aberta;
export const podePlanejar = (os: OrdemServicoResponse) => s(os) === StatusOrdemServico.Triagem;
export const podeIniciar = (os: OrdemServicoResponse) => s(os) === StatusOrdemServico.Planejada;
export const podeAdicionarItem = (os: OrdemServicoResponse) => s(os) === StatusOrdemServico.EmExecucao;
export const podeEncerrar = (os: OrdemServicoResponse) => s(os) === StatusOrdemServico.EmExecucao;
export const podeFaturar = (os: OrdemServicoResponse) => s(os) === StatusOrdemServico.EncerradaTecnicamente && os.valorTotal > 0;
export const podeCancelar = (os: OrdemServicoResponse) => ![StatusOrdemServico.Faturada, StatusOrdemServico.Cancelada].includes(s(os));
