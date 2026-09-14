import {
    BemPatrimonialResponse,
    CategoriaBemPatrimonial,
    MotivoBaixaPatrimonial,
    StatusBemPatrimonial,
    StatusInventarioPatrimonio
} from '@/features/patrimonio/types/patrimonio.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const categoriaMap: Record<number, string> = {
    [CategoriaBemPatrimonial.Movel]: 'Móvel',
    [CategoriaBemPatrimonial.Imovel]: 'Imóvel',
    [CategoriaBemPatrimonial.Veiculo]: 'Veículo',
    [CategoriaBemPatrimonial.Maquina]: 'Máquina',
    [CategoriaBemPatrimonial.Equipamento]: 'Equipamento',
    [CategoriaBemPatrimonial.Ferramenta]: 'Ferramenta',
    [CategoriaBemPatrimonial.Software]: 'Software',
    [CategoriaBemPatrimonial.Outro]: 'Outro'
};

const statusBemMap: Record<number, string> = {
    [StatusBemPatrimonial.Ativo]: 'Ativo',
    [StatusBemPatrimonial.Baixado]: 'Baixado'
};

const motivoBaixaMap: Record<number, string> = {
    [MotivoBaixaPatrimonial.Venda]: 'Venda',
    [MotivoBaixaPatrimonial.Obsolescencia]: 'Obsolescência',
    [MotivoBaixaPatrimonial.Perda]: 'Perda',
    [MotivoBaixaPatrimonial.Doacao]: 'Doação',
    [MotivoBaixaPatrimonial.Sinistro]: 'Sinistro',
    [MotivoBaixaPatrimonial.Transferencia]: 'Transferência',
    [MotivoBaixaPatrimonial.Outro]: 'Outro'
};

const statusInventarioMap: Record<number, string> = {
    [StatusInventarioPatrimonio.Aberto]: 'Aberto',
    [StatusInventarioPatrimonio.Encerrado]: 'Encerrado'
};

export const categoriaBemLabel = (value: number) => labelFromMap(categoriaMap, value);
export const statusInventarioPatrimonioLabel = (value: number) => labelFromMap(statusInventarioMap, value);

export const categoriaBemOptions = optionsFromMap(categoriaMap);
export const categoriaBemFilterOptions = [{ label: 'Todas as categorias', value: null }, ...optionsFromMap(categoriaMap)];
export const statusBemFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusBemMap)];
export const motivoBaixaOptions = optionsFromMap(motivoBaixaMap);
export const statusInventarioFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusInventarioMap)];

export const statusInventarioPatrimonioSeverity = (value: number): Severity => (n(value) === StatusInventarioPatrimonio.Encerrado ? 'success' : 'warning');

// Situação derivada do bem: o backend guarda status e bloqueio como dois campos independentes
// (BemPatrimonial.cs), então "Bloqueado" nunca é um valor de statusBem — é bloqueado=true com
// statusBem ainda Ativo.
export const situacaoBem = (bem: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'>): { label: string; severity: Severity } => {
    if (n(bem.statusBem) === StatusBemPatrimonial.Baixado) return { label: 'Baixado', severity: 'danger' };
    if (bem.bloqueado) return { label: 'Bloqueado', severity: 'warning' };
    return { label: 'Ativo', severity: 'success' };
};

// Regras de transição de estado (UI), espelhando BemPatrimonial.cs (GarantirAlteravel e os
// métodos de ação). O backend é a autoridade final.
const ativoLivre = (bem: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'>) => n(bem.statusBem) === StatusBemPatrimonial.Ativo && !bem.bloqueado;

export const bemPodeTransferir = ativoLivre;
export const bemPodeBloquear = ativoLivre;
export const bemPodeBaixar = ativoLivre;
export const bemPodeDesbloquear = (bem: Pick<BemPatrimonialResponse, 'statusBem' | 'bloqueado'>) => bem.bloqueado === true;
export const inventarioPatrimonioAberto = (status: number) => n(status) === StatusInventarioPatrimonio.Aberto;
