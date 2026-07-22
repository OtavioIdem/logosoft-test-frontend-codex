'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { DateInput } from '@/components/forms/DateInput';
import { SelectOption } from '@/types/erp';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { adicionarComponenteSchema, criarFichaTecnicaSchema, criarOrdemProducaoSchema } from '@/features/producao/schemas/producaoSchemas';
import {
    ApontamentoProducaoFormValues,
    ComponenteFichaTecnicaFormValues,
    FichaTecnicaFormValues,
    OrdemProducaoFormValues,
    TipoApontamentoProducao
} from '@/features/producao/types/producao.types';
import { tipoApontamentoOptions } from '@/features/producao/components/producaoLabels';

const buildErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    }
    return map;
};

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} onClick={onConfirm} />
    </div>
);

const initialFicha = (): FichaTecnicaFormValues => ({ empresaId: '', filialId: null, codigo: '', produtoId: '', descricao: '', quantidadeBase: 1, versao: '' });

export const FichaTecnicaFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: FichaTecnicaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<FichaTecnicaFormValues>(initialFicha);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialFicha());
            setErrors({});
        }
    }, [visible]);

    const produtosQuery = useProdutos({ empresaId: values.empresaId || null, filialId: values.filialId || null });
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);

    const update = (name: keyof FichaTecnicaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarFichaTecnicaSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Nova ficha técnica" visible={visible} modal style={{ width: 'min(54rem, 98vw)' }} footer={footer('Criar ficha', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-6 md:col-3">
                    <label htmlFor="fichaCodigo" className="font-medium">Código *</label>
                    <InputText id="fichaCodigo" value={values.codigo} className={invalid('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                    <FieldError message={errors.codigo} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="fichaProduto" className="font-medium">Produto (acabado) *</label>
                    <EntitySelect id="fichaProduto" entityName="produto" value={values.produtoId || null} options={produtoOptions} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} />
                    <FieldError message={errors.produtoId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="fichaVersao" className="font-medium">Versão</label>
                    <InputText id="fichaVersao" value={values.versao ?? ''} onChange={(event) => update('versao', event.target.value)} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="fichaDescricao" className="font-medium">Descrição *</label>
                    <InputText id="fichaDescricao" value={values.descricao} className={invalid('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                    <FieldError message={errors.descricao} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="fichaQtdBase" className="font-medium">Quantidade base *</label>
                    <QuantityInput id="fichaQtdBase" value={values.quantidadeBase} onChange={(value) => update('quantidadeBase', value ?? 0)} />
                    <FieldError message={errors.quantidadeBase} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ComponenteDialog = ({ visible, loading, produtoOptions, produtoLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; produtoOptions: SelectOption<string>[]; produtoLoading?: boolean; onHide: () => void; onSubmit: (values: ComponenteFichaTecnicaFormValues) => Promise<void> }) => {
    const [produtoId, setProdutoId] = useState<string | null>(null);
    const [quantidade, setQuantidade] = useState<number | null>(1);
    const [perdaPercentual, setPerdaPercentual] = useState<number | null>(null);
    const [observacao, setObservacao] = useState('');
    const [erros, setErros] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setProdutoId(null);
            setQuantidade(1);
            setPerdaPercentual(null);
            setObservacao('');
            setErros({});
        }
    }, [visible]);

    const confirmar = async () => {
        const next: Record<string, string> = {};
        if (!produtoId) next.produtoId = 'Selecione o componente.';
        if (!quantidade || quantidade <= 0) next.quantidade = 'Quantidade deve ser maior que zero.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ produtoId: produtoId as string, quantidade: quantidade ?? 0, perdaPercentual, observacao: observacao.trim() || null });
    };

    return (
        <Dialog header="Adicionar componente" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Adicionar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="compProduto" className="font-medium">Componente *</label>
                    <EntitySelect id="compProduto" entityName="produto" value={produtoId} options={produtoOptions} loading={produtoLoading} onChange={(value) => { setProdutoId(value); setErros((c) => ({ ...c, produtoId: '' })); }} />
                    <FieldError message={erros.produtoId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="compQtd" className="font-medium">Quantidade *</label>
                    <QuantityInput id="compQtd" value={quantidade} onChange={(value) => { setQuantidade(value); setErros((c) => ({ ...c, quantidade: '' })); }} />
                    <FieldError message={erros.quantidade} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="compPerda" className="font-medium">Perda (%)</label>
                    <InputNumber inputId="compPerda" value={perdaPercentual ?? null} min={0} max={100} suffix="%" onValueChange={(event) => setPerdaPercentual(event.value ?? null)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="compObs" className="font-medium">Observação</label>
                    <InputTextarea id="compObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialOrdem = (): OrdemProducaoFormValues => ({ empresaId: '', filialId: null, numero: '', produtoId: '', quantidadePlanejada: 1, dataPlanejada: null, localEstoqueId: null, observacao: '' });

export const OrdemProducaoFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: OrdemProducaoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<OrdemProducaoFormValues>(initialOrdem);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialOrdem());
            setErrors({});
        }
    }, [visible]);

    const scope = { empresaId: values.empresaId || null, filialId: values.filialId || null };
    const produtosQuery = useProdutos(scope);
    const locaisQuery = useLocaisEstoque(scope);
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const localOptions = useMemo(() => (locaisQuery.data ?? []).map((local) => ({ label: `${local.codigo} - ${local.nome}`, value: local.id })), [locaisQuery.data]);

    const update = (name: keyof OrdemProducaoFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarOrdemProducaoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Nova ordem de produção" visible={visible} modal style={{ width: 'min(54rem, 98vw)' }} footer={footer('Criar OP', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-6 md:col-3">
                    <label htmlFor="opNumero" className="font-medium">Número *</label>
                    <InputText id="opNumero" value={values.numero} className={invalid('numero')} onChange={(event) => update('numero', event.target.value)} />
                    <FieldError message={errors.numero} />
                </div>
                <div className="field col-12 md:col-5">
                    <label htmlFor="opProduto" className="font-medium">Produto (acabado) *</label>
                    <EntitySelect id="opProduto" entityName="produto" value={values.produtoId || null} options={produtoOptions} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} />
                    <FieldError message={errors.produtoId} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="opQtd" className="font-medium">Quantidade planejada *</label>
                    <QuantityInput id="opQtd" value={values.quantidadePlanejada} onChange={(value) => update('quantidadePlanejada', value ?? 0)} />
                    <FieldError message={errors.quantidadePlanejada} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="opData" className="font-medium">Data planejada *</label>
                    <DateInput id="opData" value={values.dataPlanejada ?? null} onChange={(value) => update('dataPlanejada', value)} />
                    <FieldError message={errors.dataPlanejada} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="opLocal" className="font-medium">Local de estoque</label>
                    <EntitySelect id="opLocal" entityName="local" value={values.localEstoqueId ?? null} options={localOptions} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueId', value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="opObs" className="font-medium">Observação</label>
                    <InputTextarea id="opObs" value={values.observacao ?? ''} rows={2} autoResize onChange={(event) => update('observacao', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ApontamentoDialog = ({ visible, loading, produtoOptions, produtoLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; produtoOptions: SelectOption<string>[]; produtoLoading?: boolean; onHide: () => void; onSubmit: (values: ApontamentoProducaoFormValues) => Promise<void> }) => {
    const [tipo, setTipo] = useState<number>(TipoApontamentoProducao.Consumo);
    const [produtoId, setProdutoId] = useState<string | null>(null);
    const [quantidade, setQuantidade] = useState<number | null>(1);
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setTipo(TipoApontamentoProducao.Consumo);
            setProdutoId(null);
            setQuantidade(1);
            setObservacao('');
            setErro('');
        }
    }, [visible]);

    const exigeProduto = tipo === TipoApontamentoProducao.Consumo || tipo === TipoApontamentoProducao.Perda || tipo === TipoApontamentoProducao.Produzido;

    const confirmar = async () => {
        if (!quantidade || quantidade <= 0) {
            setErro('Quantidade deve ser maior que zero.');
            return;
        }
        await onSubmit({ tipo, produtoId: exigeProduto ? produtoId : null, quantidade: quantidade ?? 0, observacao: observacao.trim() || null });
    };

    return (
        <Dialog header="Registrar apontamento" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Registrar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-4">
                    <label htmlFor="apTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="apTipo" value={tipo} options={tipoApontamentoOptions} onChange={(event) => setTipo(event.value)} />
                </div>
                <div className="field col-12 md:col-5">
                    <label htmlFor="apProduto" className="font-medium">Produto {exigeProduto ? '' : '(opcional)'}</label>
                    <EntitySelect id="apProduto" entityName="produto" value={produtoId} options={produtoOptions} loading={produtoLoading} onChange={setProdutoId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="apQtd" className="font-medium">Quantidade *</label>
                    <QuantityInput id="apQtd" value={quantidade} onChange={(value) => { setQuantidade(value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12">
                    <label htmlFor="apObs" className="font-medium">Observação</label>
                    <InputTextarea id="apObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
