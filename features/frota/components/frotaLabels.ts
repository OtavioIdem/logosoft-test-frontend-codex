import {
    StatusManutencao,
    StatusVeiculo,
    StatusViagem,
    TipoCombustivel,
    TipoDespesaVeiculo,
    TipoDocumentoVeiculo,
    TipoManutencao,
    TipoVeiculo
} from '@/features/frota/types/frota.types';

type Severity = 'info' | 'success' | 'warning' | 'danger' | null;
const n = (v: unknown) => Number(v);

const labelFromMap = (map: Record<number, string>, value: number) => map[n(value)] ?? String(value);
const optionsFromMap = (map: Record<number, string>) => Object.entries(map).map(([value, label]) => ({ label, value: Number(value) }));

const tipoVeiculoMap: Record<number, string> = {
    [TipoVeiculo.Carro]: 'Carro',
    [TipoVeiculo.Moto]: 'Moto',
    [TipoVeiculo.Caminhao]: 'Caminhão',
    [TipoVeiculo.Van]: 'Van',
    [TipoVeiculo.Onibus]: 'Ônibus',
    [TipoVeiculo.Maquina]: 'Máquina',
    [TipoVeiculo.Outro]: 'Outro'
};

const combustivelMap: Record<number, string> = {
    [TipoCombustivel.Gasolina]: 'Gasolina',
    [TipoCombustivel.Etanol]: 'Etanol',
    [TipoCombustivel.Diesel]: 'Diesel',
    [TipoCombustivel.Flex]: 'Flex',
    [TipoCombustivel.Gnv]: 'GNV',
    [TipoCombustivel.Eletrico]: 'Elétrico',
    [TipoCombustivel.Hibrido]: 'Híbrido'
};

const statusVeiculoMap: Record<number, string> = {
    [StatusVeiculo.Ativo]: 'Ativo',
    [StatusVeiculo.EmManutencao]: 'Em manutenção',
    [StatusVeiculo.Inativo]: 'Inativo',
    [StatusVeiculo.Vendido]: 'Vendido'
};

const tipoManutencaoMap: Record<number, string> = {
    [TipoManutencao.Preventiva]: 'Preventiva',
    [TipoManutencao.Corretiva]: 'Corretiva',
    [TipoManutencao.Preditiva]: 'Preditiva'
};

const statusManutencaoMap: Record<number, string> = {
    [StatusManutencao.Aberta]: 'Aberta',
    [StatusManutencao.EmAndamento]: 'Em andamento',
    [StatusManutencao.Concluida]: 'Concluída',
    [StatusManutencao.Cancelada]: 'Cancelada'
};

const tipoDespesaMap: Record<number, string> = {
    [TipoDespesaVeiculo.Pedagio]: 'Pedágio',
    [TipoDespesaVeiculo.Multa]: 'Multa',
    [TipoDespesaVeiculo.Lavagem]: 'Lavagem',
    [TipoDespesaVeiculo.Estacionamento]: 'Estacionamento',
    [TipoDespesaVeiculo.Seguro]: 'Seguro',
    [TipoDespesaVeiculo.Ipva]: 'IPVA',
    [TipoDespesaVeiculo.Licenciamento]: 'Licenciamento',
    [TipoDespesaVeiculo.Outro]: 'Outro'
};

const tipoDocumentoMap: Record<number, string> = {
    [TipoDocumentoVeiculo.Crlv]: 'CRLV',
    [TipoDocumentoVeiculo.Seguro]: 'Seguro',
    [TipoDocumentoVeiculo.Ipva]: 'IPVA',
    [TipoDocumentoVeiculo.Licenciamento]: 'Licenciamento',
    [TipoDocumentoVeiculo.Outro]: 'Outro'
};

const statusViagemMap: Record<number, string> = {
    [StatusViagem.EmAndamento]: 'Em andamento',
    [StatusViagem.Encerrada]: 'Encerrada',
    [StatusViagem.Cancelada]: 'Cancelada'
};

export const tipoVeiculoLabel = (value: number) => labelFromMap(tipoVeiculoMap, value);
export const combustivelLabel = (value: number) => labelFromMap(combustivelMap, value);
export const statusVeiculoLabel = (value: number) => labelFromMap(statusVeiculoMap, value);
export const tipoManutencaoLabel = (value: number) => labelFromMap(tipoManutencaoMap, value);
export const statusManutencaoLabel = (value: number) => labelFromMap(statusManutencaoMap, value);
export const tipoDespesaLabel = (value: number) => labelFromMap(tipoDespesaMap, value);
export const tipoDocumentoLabel = (value: number) => labelFromMap(tipoDocumentoMap, value);
export const statusViagemLabel = (value: number) => labelFromMap(statusViagemMap, value);

export const tipoVeiculoOptions = optionsFromMap(tipoVeiculoMap);
export const combustivelOptions = optionsFromMap(combustivelMap);
export const statusVeiculoOptions = optionsFromMap(statusVeiculoMap);
export const tipoManutencaoOptions = optionsFromMap(tipoManutencaoMap);
export const tipoDespesaOptions = optionsFromMap(tipoDespesaMap);
export const tipoDocumentoOptions = optionsFromMap(tipoDocumentoMap);

export const statusVeiculoFilterOptions = [{ label: 'Todos os status', value: null }, ...statusVeiculoOptions];
export const tipoVeiculoFilterOptions = [{ label: 'Todos os tipos', value: null }, ...tipoVeiculoOptions];
export const statusViagemFilterOptions = [{ label: 'Todos os status', value: null }, ...optionsFromMap(statusViagemMap)];

export const statusVeiculoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusVeiculo.Ativo:
            return 'success';
        case StatusVeiculo.EmManutencao:
            return 'warning';
        case StatusVeiculo.Vendido:
            return 'danger';
        default:
            return 'info';
    }
};

export const statusManutencaoSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusManutencao.Concluida:
            return 'success';
        case StatusManutencao.EmAndamento:
            return 'warning';
        case StatusManutencao.Cancelada:
            return 'danger';
        default:
            return 'info';
    }
};

export const statusViagemSeverity = (value: number): Severity => {
    switch (n(value)) {
        case StatusViagem.Encerrada:
            return 'success';
        case StatusViagem.Cancelada:
            return 'danger';
        default:
            return 'warning';
    }
};

// Regras de transição de estado (UI). O backend é a autoridade final.
export const manutencaoPodeConcluir = (status: number) => [StatusManutencao.Aberta, StatusManutencao.EmAndamento].includes(n(status));
export const manutencaoPodeCancelar = (status: number) => [StatusManutencao.Aberta, StatusManutencao.EmAndamento].includes(n(status));
export const viagemEmAndamento = (status: number) => n(status) === StatusViagem.EmAndamento;
export const veiculoPodeStatus = (status: number) => n(status) !== StatusVeiculo.Vendido;
