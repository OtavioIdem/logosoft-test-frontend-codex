'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FormGrid } from '@/components/forms/FormGrid';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { useFinanceiroOriginOptions } from '@/features/financeiro/hooks/useFinanceiroOriginOptions';
import { ContaPagarFormValues, ContaReceberFormValues, ParcelaFinanceiraRequest } from '@/features/financeiro/types/financeiro.types';
import { defaultParcela, formatMoney, origemFinanceiraOptions, sumMoneyValues } from '@/features/financeiro/components/financeiroUiUtils';
import { OrigemFinanceira, SelectOption } from '@/types/erp';

type ContaFinanceiraFormDialogProps = {
    type: 'receber' | 'pagar';
    visible: boolean;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (values: ContaReceberFormValues | ContaPagarFormValues) => void;
};

type FormValues = {
    empresaId: string;
    filialId?: string | null;
    clienteId?: string;
    fornecedorId?: string;
    documento: string;
    origem: number;
    origemId?: string | null;
    dataEmissao: Date;
    observacao?: string | null;
    parcelas: ParcelaFinanceiraRequest[];
};

const initialValues = (type: 'receber' | 'pagar'): FormValues => ({
    empresaId: '',
    filialId: null,
    clienteId: type === 'receber' ? '' : undefined,
    fornecedorId: type === 'pagar' ? '' : undefined,
    documento: '',
    origem: OrigemFinanceira.Manual,
    origemId: null,
    dataEmissao: new Date(),
    observacao: '',
    parcelas: [defaultParcela()]
});

const financialOriginOptions = (type: 'receber' | 'pagar') =>
    origemFinanceiraOptions.filter((option) => {
        if (type === 'receber') {
            return option.value !== OrigemFinanceira.Compra;
        }

        return option.value !== OrigemFinanceira.PedidoVenda;
    });

export const ContaFinanceiraFormDialog = ({ type, visible, loading, onHide, onSubmit }: ContaFinanceiraFormDialogProps) => {
    const [values, setValues] = useState<FormValues>(initialValues(type));
    const queryBase = { empresaId: values.empresaId || null, filialId: values.filialId ?? null };
    const clienteQuery = useClientes(queryBase);
    const fornecedorQuery = useFornecedores(queryBase);
    const pessoasQuery = usePessoas(queryBase);
    const originQuery = useFinanceiroOriginOptions(values.origem, queryBase);

    useEffect(() => {
        if (visible) setValues(initialValues(type));
    }, [type, visible]);

    const pessoaLabelMap = useMemo(() => {
        return new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial]));
    }, [pessoasQuery.data]);

    const entityOptions = useMemo<SelectOption<string>[]>(() => {
        if (type === 'receber') {
            return (clienteQuery.data ?? []).map((cliente) => ({
                label: `${cliente.codigo} • ${pessoaLabelMap.get(cliente.pessoaId) ?? 'Pessoa não carregada'}`,
                value: cliente.id
            }));
        }

        return (fornecedorQuery.data ?? []).map((fornecedor) => ({
            label: `${fornecedor.codigo} • ${pessoaLabelMap.get(fornecedor.pessoaId) ?? 'Pessoa não carregada'}`,
            value: fornecedor.id
        }));
    }, [clienteQuery.data, fornecedorQuery.data, pessoaLabelMap, type]);

    const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
    const updateParcela = <K extends keyof ParcelaFinanceiraRequest>(index: number, key: K, value: ParcelaFinanceiraRequest[K]) => setValues((current) => ({ ...current, parcelas: current.parcelas.map((parcela, currentIndex) => (currentIndex === index ? { ...parcela, [key]: value } : parcela)) }));
    const addParcela = () => setValues((current) => ({ ...current, parcelas: [...current.parcelas, { numero: current.parcelas.length + 1, vencimento: new Date(), valor: 0 }] }));
    const removeParcela = (index: number) => setValues((current) => ({ ...current, parcelas: current.parcelas.filter((_, currentIndex) => currentIndex !== index).map((parcela, currentIndex) => ({ ...parcela, numero: currentIndex + 1 })) }));

    const changeOrigem = (origem: number) => {
        setValues((current) => ({ ...current, origem, origemId: null }));
    };

    const submit = () => {
        if (type === 'receber') {
            onSubmit({ empresaId: values.empresaId, filialId: values.filialId ?? null, clienteId: values.clienteId ?? '', documento: values.documento, origem: values.origem, origemId: values.origemId ?? null, dataEmissao: values.dataEmissao, observacao: values.observacao ?? null, parcelas: values.parcelas });
            return;
        }
        onSubmit({ empresaId: values.empresaId, filialId: values.filialId ?? null, fornecedorId: values.fornecedorId ?? '', documento: values.documento, origem: values.origem, origemId: values.origemId ?? null, dataEmissao: values.dataEmissao, observacao: values.observacao ?? null, parcelas: values.parcelas });
    };

    const needsOriginReference = values.origem === OrigemFinanceira.PedidoVenda || values.origem === OrigemFinanceira.Compra;
    const unsupportedOriginReference = values.origem !== OrigemFinanceira.Manual && !needsOriginReference;
    const parcelasTotal = useMemo(() => sumMoneyValues(values.parcelas.map((parcela) => parcela.valor)), [values.parcelas]);
    const selectedEntityMissing = type === 'receber' ? !values.clienteId : !values.fornecedorId;
    const canSubmit = Boolean(values.empresaId && !selectedEntityMissing && values.documento.trim() && values.parcelas.length > 0 && parcelasTotal > 0 && (!needsOriginReference || values.origemId));

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
            <Button label="Salvar" icon="pi pi-check" onClick={submit} loading={loading} disabled={!canSubmit} />
        </div>
    );

    return (
        <Dialog header={type === 'receber' ? 'Nova conta a receber' : 'Nova conta a pagar'} visible={visible} modal style={{ width: '64rem' }} onHide={onHide} footer={footer}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId} filialId={values.filialId ?? null} onEmpresaChange={(value) => { setValues((current) => ({ ...current, empresaId: value ?? '', filialId: null, clienteId: type === 'receber' ? '' : current.clienteId, fornecedorId: type === 'pagar' ? '' : current.fornecedorId, origemId: null })); }} onFilialChange={(value) => { setValues((current) => ({ ...current, filialId: value, origemId: null })); }} disabled={loading} />
                <div className="field col-12 md:col-6">
                    <label htmlFor="entidadeFinanceira" className="font-medium">{type === 'receber' ? 'Cliente' : 'Fornecedor'}</label>
                    <EntitySelect id="entidadeFinanceira" value={type === 'receber' ? values.clienteId ?? null : values.fornecedorId ?? null} options={entityOptions} onChange={(value) => { if (type === 'receber') update('clienteId', value ?? ''); else update('fornecedorId', value ?? ''); }} entityName={type === 'receber' ? 'cliente' : 'fornecedor'} disabled={loading || !values.empresaId} />
                    <small className="text-600">Selecione por código e nome. O vínculo correto será enviado automaticamente.</small>
                </div>
                <div className="field col-12 md:col-3"><label htmlFor="documentoFinanceiro" className="font-medium">Documento</label><InputText id="documentoFinanceiro" value={values.documento} onChange={(event) => update('documento', event.target.value)} disabled={loading} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="dataEmissao" className="font-medium">Data de emissão</label><DateTimeInput id="dataEmissao" value={values.dataEmissao} onChange={(value) => update('dataEmissao', value ?? new Date())} disabled={loading} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="origem" className="font-medium">Origem</label><Dropdown id="origem" value={values.origem} options={financialOriginOptions(type)} optionLabel="label" optionValue="value" onChange={(event) => changeOrigem(Number(event.value))} disabled={loading} /></div>
                {needsOriginReference ? <div className="field col-12 md:col-8"><label htmlFor="origemId" className="font-medium">Documento de origem</label><EntitySelect id="origemId" value={values.origemId ?? null} options={originQuery.options} onChange={(value) => update('origemId', value)} entityName={values.origem === OrigemFinanceira.PedidoVenda ? 'pedido de venda' : 'pedido de compra'} disabled={loading || !values.empresaId || originQuery.isLoading || originQuery.isFetching} /><small className="text-600">Selecione pelo número e descrição. O vínculo da origem será enviado automaticamente.</small></div> : null}
                {unsupportedOriginReference ? <div className="col-12 md:col-8 flex align-items-end"><Message className="w-full" severity="info" text="Esta origem ainda não possui busca de referência no frontend; a conta será enviada sem vínculo técnico de origem até o módulo correspondente expor seleção própria." /></div> : null}
                <div className="field col-12"><label htmlFor="observacaoFinanceira" className="font-medium">Observação</label><InputTextarea id="observacaoFinanceira" value={values.observacao ?? ''} onChange={(event) => update('observacao', event.target.value)} rows={2} disabled={loading} /></div>
                <div className="col-12 mt-3">
                    <div className="surface-card border-1 surface-border border-round p-3">
                        <div className="flex flex-column md:flex-row md:justify-content-between md:align-items-center gap-3">
                            <div>
                                <h5 className="m-0">Parcelas</h5>
                                <small className="text-600">Informe vencimento e valor de cada parcela da conta.</small>
                            </div>
                            <div className="flex flex-column md:flex-row gap-2 md:align-items-center">
                                <span className="text-600">{values.parcelas.length} parcela(s) • {formatMoney(parcelasTotal)}</span>
                                <Button label="Adicionar" icon="pi pi-plus" type="button" outlined className="p-button-sm w-full md:w-auto" onClick={addParcela} disabled={loading} />
                            </div>
                        </div>
                    </div>
                </div>
                {values.parcelas.map((parcela, index) => (
                    <div className="col-12 grid formgrid p-fluid mt-2 p-3 border-1 surface-border border-round" key={`${parcela.numero}-${index}`}>
                        <div className="field col-12 md:col-2"><label className="font-medium">Parcela</label><InputText value={String(parcela.numero)} disabled /></div>
                        <div className="field col-12 md:col-5"><label className="font-medium">Vencimento</label><DateTimeInput value={parcela.vencimento instanceof Date ? parcela.vencimento : new Date(parcela.vencimento)} onChange={(value) => updateParcela(index, 'vencimento', value ?? new Date())} disabled={loading} /></div>
                        <div className="field col-12 md:col-4"><label className="font-medium">Valor</label><MoneyInput value={parcela.valor} onChange={(value) => updateParcela(index, 'valor', value ?? 0)} disabled={loading} /></div>
                        <div className="field col-12 md:col-1 flex align-items-end"><Button icon="pi pi-trash" type="button" text severity="danger" onClick={() => removeParcela(index)} disabled={loading || values.parcelas.length === 1} /></div>
                    </div>
                ))}
            </FormGrid>
        </Dialog>
    );
};
