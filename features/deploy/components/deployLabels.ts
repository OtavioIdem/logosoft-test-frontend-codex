import { StatusDeploy, StatusItemChecklist } from '@/features/deploy/types/deploy.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const statusDeployMap: Record<number, string> = {
    [StatusDeploy.EmAndamento]: 'Em andamento',
    [StatusDeploy.Concluido]: 'Concluído',
    [StatusDeploy.Falhou]: 'Falhou',
    [StatusDeploy.Revertido]: 'Revertido'
};

const statusItemMap: Record<number, string> = {
    [StatusItemChecklist.Pendente]: 'Pendente',
    [StatusItemChecklist.Aprovado]: 'Aprovado',
    [StatusItemChecklist.Reprovado]: 'Reprovado'
};

export const statusDeployLabel = (value: number) => labelFromMap(statusDeployMap, value);
export const statusItemChecklistLabel = (value: number) => labelFromMap(statusItemMap, value);

export const statusDeployFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusDeployMap)];

export const statusDeploySeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusDeploy.Concluido:
            return 'success';
        case StatusDeploy.Falhou:
            return 'danger';
        case StatusDeploy.Revertido:
            return 'warning';
        default:
            return 'info';
    }
};

export const statusItemChecklistSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusItemChecklist.Aprovado:
            return 'success';
        case StatusItemChecklist.Reprovado:
            return 'danger';
        default:
            return 'warning';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const deployEmAndamento = (status: number) => n(status) === StatusDeploy.EmAndamento;
export const deployPodeReverter = (status: number) => n(status) === StatusDeploy.Concluido;
export const itemChecklistPendente = (status: number) => n(status) === StatusItemChecklist.Pendente;
