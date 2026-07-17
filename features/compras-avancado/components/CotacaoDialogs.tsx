'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { SelectOption } from '@/types/erp';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { aprovarCotacaoSchema, criarCotacaoSchema, itemCotacaoSchema } from '@/features/compras-avancado/schemas/comprasAvancadoSchemas';
import { AprovarCotacaoFormValues, CriarCotacaoFormValues, ItemCotacaoFormValues } from '@/features/compras-avancado/types/comprasAvancado.types';

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

const initialCotacao = (): CriarCotacaoFormValues => ({ empresaId: '', filialId: null, numero: '', fornecedorId: '', dataCotacao: new Date(), validade: null, solicitacaoCompraId: null, observacao: null });

export const CriarCotacaoDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: CriarCotacaoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<CriarCotacaoFormValues>(initialCotacao);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues(initialCotacao()); setErrors({}); } }, [visible]);

    const fornecedoresQuery = useFornecedores({ empresaId: values.empresaId || null, filialId: values.filialId || null });
    const fornecedorOptions = useMemo(() => (fornecedoresQuery.data ?? []).map((fornecedor) => ({ label: fornecedor.codigo, value: fornecedor.id })), [fornecedoresQuery.data]);

    const update = (name: keyof CriarCotacaoFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };
    const confirmar = async () => {
        const parsed = criarCotacaoSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    return (
        <Dialog header="Nova cotação de compra" visible={visible} modal style={{ width: 'min(52rem, 98vw)' }} footer={footer('Criar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-4"><label htmlFor="cotNumero" className="font-medium">Número *</label><InputText id="cotNumero" value={values.numero} className={classNames({ 'p-invalid': errors.numero })} onChange={(event) => update('numero', event.target.value)} /><FieldError message={errors.numero} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="cotFornecedor" className="font-medium">Fornecedor *</label><EntitySelect id="cotFornecedor" entityName="fornecedor" value={values.fornecedorId || null} options={fornecedorOptions} loading={fornecedoresQuery.isFetching} onChange={(value) => update('fornecedorId', value)} /><FieldError message={errors.fornecedorId} /></div>
                <div className="field col-12 md:col-2"><label htmlFor="cotData" className="font-medium">Data *</label><DateInput id="cotData" value={values.dataCotacao ?? null} onChange={(value) => update('dataCotacao', value)} /><FieldError message={errors.dataCotacao} /></div>
                <div className="field col-12 md:col-2"><label htmlFor="cotValidade" className="font-medium">Validade</label><DateInput id="cotValidade" value={values.validade ?? null} onChange={(value) => update('validade', value)} /></div>
                <div className="field col-12"><label htmlFor="cotObs" className="font-medium">Observação</label><InputTextarea id="cotObs" value={values.observacao ?? ''} rows={2} autoResize onChange={(event) => update('observacao', event.target.value)} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const ItemCotacaoDialog = ({ visible, loading, produtoOptions, onHide, onSubmit }: { visible: boolean; loading?: boolean; produtoOptions: SelectOption<string>[]; onHide: () => void; onSubmit: (values: ItemCotacaoFormValues) => Promise<void> }) => {
    const [produtoId, setProdutoId] = useState<string | null>(null);
    const [quantidade, setQuantidade] = useState<number | null>(1);
    const [valorUnitario, setValorUnitario] = useState<number | null>(0);
    const [observacao, setObservacao] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setProdutoId(null); setQuantidade(1); setValorUnitario(0); setObservacao(''); setErrors({}); } }, [visible]);
    const confirmar = async () => {
        const parsed = itemCotacaoSchema.safeParse({ produtoId, quantidade, valorUnitario, observacao });
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit({ produtoId: produtoId as string, quantidade: quantidade ?? 0, valorUnitario: valorUnitario ?? 0, observacao });
    };
    return (
        <Dialog header="Adicionar item" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Adicionar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-5"><label htmlFor="cotItemProduto" className="font-medium">Produto *</label><EntitySelect id="cotItemProduto" entityName="produto" value={produtoId} options={produtoOptions} onChange={(value) => { setProdutoId(value); setErrors((c) => ({ ...c, produtoId: '' })); }} /><FieldError message={errors.produtoId} /></div>
                <div className="field col-6 md:col-3"><label htmlFor="cotItemQtd" className="font-medium">Quantidade *</label><QuantityInput id="cotItemQtd" value={quantidade} onChange={(value) => { setQuantidade(value); setErrors((c) => ({ ...c, quantidade: '' })); }} /><FieldError message={errors.quantidade} /></div>
                <div className="field col-6 md:col-4"><label htmlFor="cotItemValor" className="font-medium">Valor unitário *</label><MoneyInput id="cotItemValor" value={valorUnitario} onChange={setValorUnitario} /></div>
                <div className="field col-12"><label htmlFor="cotItemObs" className="font-medium">Observação</label><InputText id="cotItemObs" value={observacao} onChange={(event) => setObservacao(event.target.value)} /></div>
            </FormGrid>
        </Dialog>
    );
};

const initialAprovar = (): AprovarCotacaoFormValues => ({ numeroPedido: '', dataEmissaoPedido: new Date(), dataPrevisaoEntrega: null, condicaoPagamentoId: null, observacao: null });

export const AprovarCotacaoDialog = ({ visible, loading, empresaId, onHide, onSubmit }: { visible: boolean; loading?: boolean; empresaId: string | null; onHide: () => void; onSubmit: (values: AprovarCotacaoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<AprovarCotacaoFormValues>(initialAprovar);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues(initialAprovar()); setErrors({}); } }, [visible]);
    const condicoes = useCondicoesPagamentoOptions(empresaId);
    const update = (name: keyof AprovarCotacaoFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };
    const confirmar = async () => {
        const parsed = aprovarCotacaoSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    return (
        <Dialog header="Aprovar cotação (gera pedido de compra)" visible={visible} modal style={{ width: 'min(48rem, 98vw)' }} footer={footer('Aprovar e gerar pedido', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-4"><label htmlFor="aprNumero" className="font-medium">Número do pedido *</label><InputText id="aprNumero" value={values.numeroPedido} className={classNames({ 'p-invalid': errors.numeroPedido })} onChange={(event) => update('numeroPedido', event.target.value)} /><FieldError message={errors.numeroPedido} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="aprEmissao" className="font-medium">Emissão *</label><DateInput id="aprEmissao" value={values.dataEmissaoPedido ?? null} onChange={(value) => update('dataEmissaoPedido', value)} /><FieldError message={errors.dataEmissaoPedido} /></div>
                <div className="field col-12 md:col-4"><label htmlFor="aprPrevisao" className="font-medium">Previsão de entrega</label><DateInput id="aprPrevisao" value={values.dataPrevisaoEntrega ?? null} onChange={(value) => update('dataPrevisaoEntrega', value)} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="aprCondicao" className="font-medium">Condição de pagamento</label><EntitySelect id="aprCondicao" entityName="condição" value={values.condicaoPagamentoId ?? null} options={condicoes.options} onChange={(value) => update('condicaoPagamentoId', value)} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="aprObs" className="font-medium">Observação</label><InputText id="aprObs" value={values.observacao ?? ''} onChange={(event) => update('observacao', event.target.value)} /></div>
            </FormGrid>
        </Dialog>
    );
};
