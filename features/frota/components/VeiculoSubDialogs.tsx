'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { DateInput } from '@/components/forms/DateInput';
import { SelectOption } from '@/types/erp';
import {
    AbastecimentoFormValues,
    DespesaVeiculoFormValues,
    DocumentoVeiculoFormValues,
    ManutencaoFormValues,
    TipoCombustivel,
    TipoDespesaVeiculo,
    TipoDocumentoVeiculo,
    TipoManutencao
} from '@/features/frota/types/frota.types';
import { combustivelOptions, tipoDespesaOptions, tipoDocumentoOptions, tipoManutencaoOptions } from '@/features/frota/components/frotaLabels';

type BaseProps = { visible: boolean; loading?: boolean; veiculoId: string; onHide: () => void };

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} onClick={onConfirm} />
    </div>
);

export const AbastecimentoDialog = ({ visible, loading, veiculoId, onHide, onSubmit, motoristaOptions, combustivelPadrao }: BaseProps & { motoristaOptions: SelectOption<string>[]; combustivelPadrao?: number; onSubmit: (values: AbastecimentoFormValues) => Promise<void> }) => {
    const [motoristaId, setMotoristaId] = useState<string | null>(null);
    const [data, setData] = useState<Date | null>(null);
    const [odometro, setOdometro] = useState<number | null>(0);
    const [litros, setLitros] = useState<number | null>(0);
    const [valorLitro, setValorLitro] = useState<number | null>(0);
    const [combustivel, setCombustivel] = useState<number>(combustivelPadrao ?? TipoCombustivel.Flex);
    const [tanqueCheio, setTanqueCheio] = useState(false);
    const [posto, setPosto] = useState('');
    const [erros, setErros] = useState<{ odometro?: string; litros?: string; valorLitro?: string }>({});

    useEffect(() => {
        if (visible) {
            setMotoristaId(null);
            setData(null);
            setOdometro(0);
            setLitros(0);
            setValorLitro(0);
            setCombustivel(combustivelPadrao ?? TipoCombustivel.Flex);
            setTanqueCheio(false);
            setPosto('');
            setErros({});
        }
    }, [visible, combustivelPadrao]);

    const confirmar = async () => {
        const next: typeof erros = {};
        if (odometro == null || odometro < 0) next.odometro = 'Informe o odômetro.';
        if (!litros || litros <= 0) next.litros = 'Litros deve ser maior que zero.';
        if (!valorLitro || valorLitro <= 0) next.valorLitro = 'Valor por litro deve ser maior que zero.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ veiculoId, motoristaId, data, odometro: odometro ?? 0, litros: litros ?? 0, valorLitro: valorLitro ?? 0, combustivel, tanqueCheio, posto: posto.trim() || null });
    };

    return (
        <Dialog header="Registrar abastecimento" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Registrar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="abastMotorista" className="font-medium">Motorista</label>
                    <EntitySelect id="abastMotorista" entityName="motorista" value={motoristaId} options={motoristaOptions} onChange={setMotoristaId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="abastData" className="font-medium">Data</label>
                    <DateInput id="abastData" value={data} onChange={setData} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="abastOdometro" className="font-medium">Odômetro *</label>
                    <QuantityInput id="abastOdometro" value={odometro} onChange={(value) => { setOdometro(value); setErros((c) => ({ ...c, odometro: undefined })); }} />
                    <FieldError message={erros.odometro} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="abastLitros" className="font-medium">Litros *</label>
                    <QuantityInput id="abastLitros" value={litros} onChange={(value) => { setLitros(value); setErros((c) => ({ ...c, litros: undefined })); }} />
                    <FieldError message={erros.litros} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="abastValorLitro" className="font-medium">Valor por litro *</label>
                    <MoneyInput id="abastValorLitro" value={valorLitro} onChange={(value) => { setValorLitro(value); setErros((c) => ({ ...c, valorLitro: undefined })); }} />
                    <FieldError message={erros.valorLitro} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="abastCombustivel" className="font-medium">Combustível *</label>
                    <Dropdown inputId="abastCombustivel" value={combustivel} options={combustivelOptions} onChange={(event) => setCombustivel(event.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="abastPosto" className="font-medium">Posto</label>
                    <InputText id="abastPosto" value={posto} onChange={(event) => setPosto(event.target.value)} />
                </div>
                <div className="field col-12 md:col-4 flex align-items-end">
                    <div className="flex align-items-center gap-2 mb-2">
                        <Checkbox inputId="abastTanque" checked={tanqueCheio} onChange={(event) => setTanqueCheio(Boolean(event.checked))} />
                        <label htmlFor="abastTanque">Tanque cheio</label>
                    </div>
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ManutencaoDialog = ({ visible, loading, veiculoId, onHide, onSubmit, fornecedorOptions, fornecedorLoading }: BaseProps & { fornecedorOptions: SelectOption<string>[]; fornecedorLoading?: boolean; onSubmit: (values: ManutencaoFormValues) => Promise<void> }) => {
    const [tipo, setTipo] = useState<number>(TipoManutencao.Preventiva);
    const [descricao, setDescricao] = useState('');
    const [fornecedorId, setFornecedorId] = useState<string | null>(null);
    const [data, setData] = useState<Date | null>(null);
    const [odometro, setOdometro] = useState<number | null>(null);
    const [valor, setValor] = useState<number | null>(0);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setTipo(TipoManutencao.Preventiva);
            setDescricao('');
            setFornecedorId(null);
            setData(null);
            setOdometro(null);
            setValor(0);
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!descricao.trim()) {
            setErro('Informe a descrição.');
            return;
        }
        await onSubmit({ veiculoId, tipo, descricao, fornecedorId, data, odometro, valor: valor ?? 0 });
    };

    return (
        <Dialog header="Registrar manutenção" visible={visible} modal style={{ width: 'min(50rem, 96vw)' }} footer={footer('Registrar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-4">
                    <label htmlFor="manutTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="manutTipo" value={tipo} options={tipoManutencaoOptions} onChange={(event) => setTipo(event.value)} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="manutDescricao" className="font-medium">Descrição *</label>
                    <InputText id="manutDescricao" value={descricao} onChange={(event) => { setDescricao(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="manutFornecedor" className="font-medium">Fornecedor (gera Conta a Pagar)</label>
                    <EntitySelect id="manutFornecedor" entityName="fornecedor" value={fornecedorId} options={fornecedorOptions} loading={fornecedorLoading} onChange={setFornecedorId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="manutData" className="font-medium">Data</label>
                    <DateInput id="manutData" value={data} onChange={setData} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="manutOdometro" className="font-medium">Odômetro</label>
                    <QuantityInput id="manutOdometro" value={odometro} onChange={setOdometro} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="manutValor" className="font-medium">Valor</label>
                    <MoneyInput id="manutValor" value={valor} onChange={setValor} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const DespesaDialog = ({ visible, loading, veiculoId, onHide, onSubmit, fornecedorOptions, fornecedorLoading }: BaseProps & { fornecedorOptions: SelectOption<string>[]; fornecedorLoading?: boolean; onSubmit: (values: DespesaVeiculoFormValues) => Promise<void> }) => {
    const [tipo, setTipo] = useState<number>(TipoDespesaVeiculo.Pedagio);
    const [descricao, setDescricao] = useState('');
    const [fornecedorId, setFornecedorId] = useState<string | null>(null);
    const [data, setData] = useState<Date | null>(null);
    const [valor, setValor] = useState<number | null>(0);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setTipo(TipoDespesaVeiculo.Pedagio);
            setDescricao('');
            setFornecedorId(null);
            setData(null);
            setValor(0);
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!descricao.trim()) {
            setErro('Informe a descrição.');
            return;
        }
        await onSubmit({ veiculoId, tipo, descricao, fornecedorId, data, valor: valor ?? 0 });
    };

    return (
        <Dialog header="Registrar despesa" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Registrar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-4">
                    <label htmlFor="despTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="despTipo" value={tipo} options={tipoDespesaOptions} onChange={(event) => setTipo(event.value)} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="despDescricao" className="font-medium">Descrição *</label>
                    <InputText id="despDescricao" value={descricao} onChange={(event) => { setDescricao(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="despFornecedor" className="font-medium">Fornecedor (gera Conta a Pagar)</label>
                    <EntitySelect id="despFornecedor" entityName="fornecedor" value={fornecedorId} options={fornecedorOptions} loading={fornecedorLoading} onChange={setFornecedorId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="despData" className="font-medium">Data</label>
                    <DateInput id="despData" value={data} onChange={setData} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="despValor" className="font-medium">Valor</label>
                    <MoneyInput id="despValor" value={valor} onChange={setValor} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const DocumentoDialog = ({ visible, loading, veiculoId, onHide, onSubmit }: BaseProps & { onSubmit: (values: DocumentoVeiculoFormValues) => Promise<void> }) => {
    const [tipo, setTipo] = useState<number>(TipoDocumentoVeiculo.Crlv);
    const [numero, setNumero] = useState('');
    const [orgaoEmissor, setOrgaoEmissor] = useState('');
    const [dataEmissao, setDataEmissao] = useState<Date | null>(null);
    const [dataValidade, setDataValidade] = useState<Date | null>(null);
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setTipo(TipoDocumentoVeiculo.Crlv);
            setNumero('');
            setOrgaoEmissor('');
            setDataEmissao(null);
            setDataValidade(null);
            setObservacao('');
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!dataValidade) {
            setErro('Informe a data de validade.');
            return;
        }
        await onSubmit({ veiculoId, tipo, numero: numero.trim() || null, orgaoEmissor: orgaoEmissor.trim() || null, dataEmissao, dataValidade, observacao: observacao.trim() || null });
    };

    return (
        <Dialog header="Registrar documento" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Registrar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-4">
                    <label htmlFor="docTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="docTipo" value={tipo} options={tipoDocumentoOptions} onChange={(event) => setTipo(event.value)} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="docNumero" className="font-medium">Número</label>
                    <InputText id="docNumero" value={numero} onChange={(event) => setNumero(event.target.value)} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="docOrgao" className="font-medium">Órgão emissor</label>
                    <InputText id="docOrgao" value={orgaoEmissor} onChange={(event) => setOrgaoEmissor(event.target.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="docEmissao" className="font-medium">Data de emissão</label>
                    <DateInput id="docEmissao" value={dataEmissao} onChange={setDataEmissao} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="docValidade" className="font-medium">Data de validade *</label>
                    <DateInput id="docValidade" value={dataValidade} onChange={(value) => { setDataValidade(value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12">
                    <label htmlFor="docObservacao" className="font-medium">Observação</label>
                    <InputTextarea id="docObservacao" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
