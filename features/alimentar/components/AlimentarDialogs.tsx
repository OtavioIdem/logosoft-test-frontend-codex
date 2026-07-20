'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
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
import { PermissionGuard } from '@/components/security/PermissionGuard';
import { useFornecedores } from '@/features/fornecedores/hooks/useFornecedoresResources';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useMovimentacoesLote } from '@/features/alimentar/hooks/useAlimentarResources';
import { abrirRecallSchema, criarLoteSchema } from '@/features/alimentar/schemas/alimentarSchemas';
import {
    GravidadeRecall,
    LoteFormValues,
    LoteOrigem,
    MovimentacaoLoteFormValues,
    MovimentacaoLoteResponse,
    RecallFormValues,
    TipoMovimentacaoLote
} from '@/features/alimentar/types/alimentar.types';
import { gravidadeRecallOptions, loteOrigemOptions, tipoMovimentacaoLabel, tipoMovimentacaoOptions } from '@/features/alimentar/components/alimentarLabels';

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

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

const initialLote = (): LoteFormValues => ({ empresaId: '', filialId: null, produtoId: '', numeroLote: '', origem: LoteOrigem.Compra, dataFabricacao: null, dataValidade: null, quantidadeInicial: 1, fornecedorId: null, localEstoqueId: null, documentoOrigem: '' });

export const LoteFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: LoteFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<LoteFormValues>(initialLote);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialLote());
            setErrors({});
        }
    }, [visible]);

    const scope = { empresaId: values.empresaId || null, filialId: values.filialId || null };
    const produtosQuery = useProdutos(scope);
    const fornecedoresQuery = useFornecedores(scope);
    const locaisQuery = useLocaisEstoque(scope);
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const fornecedorOptions = useMemo(() => (fornecedoresQuery.data ?? []).map((fornecedor) => ({ label: fornecedor.codigo, value: fornecedor.id })), [fornecedoresQuery.data]);
    const localOptions = useMemo(() => (locaisQuery.data ?? []).map((local) => ({ label: `${local.codigo} - ${local.nome}`, value: local.id })), [locaisQuery.data]);

    const update = (name: keyof LoteFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarLoteSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Novo lote" visible={visible} modal style={{ width: 'min(58rem, 98vw)' }} footer={footer('Criar lote', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6">
                    <label htmlFor="loteProduto" className="font-medium">Produto *</label>
                    <EntitySelect id="loteProduto" entityName="produto" value={values.produtoId || null} options={produtoOptions} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} />
                    <FieldError message={errors.produtoId} />
                </div>
                <div className="field col-12 md:col-3">
                    <label htmlFor="loteNumero" className="font-medium">Número do lote *</label>
                    <InputText id="loteNumero" value={values.numeroLote} className={invalid('numeroLote')} onChange={(event) => update('numeroLote', event.target.value)} />
                    <FieldError message={errors.numeroLote} />
                </div>
                <div className="field col-12 md:col-3">
                    <label htmlFor="loteOrigem" className="font-medium">Origem *</label>
                    <Dropdown inputId="loteOrigem" value={values.origem} options={loteOrigemOptions} onChange={(event) => update('origem', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="loteFabricacao" className="font-medium">Fabricação</label>
                    <DateInput id="loteFabricacao" value={values.dataFabricacao ?? null} onChange={(value) => update('dataFabricacao', value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="loteValidade" className="font-medium">Validade *</label>
                    <DateInput id="loteValidade" value={values.dataValidade ?? null} onChange={(value) => update('dataValidade', value)} />
                    <FieldError message={errors.dataValidade} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="loteQtd" className="font-medium">Quantidade inicial *</label>
                    <QuantityInput id="loteQtd" value={values.quantidadeInicial} onChange={(value) => update('quantidadeInicial', value ?? 0)} />
                    <FieldError message={errors.quantidadeInicial} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="loteDocumento" className="font-medium">Documento de origem</label>
                    <InputText id="loteDocumento" value={values.documentoOrigem ?? ''} onChange={(event) => update('documentoOrigem', event.target.value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="loteFornecedor" className="font-medium">Fornecedor</label>
                    <EntitySelect id="loteFornecedor" entityName="fornecedor" value={values.fornecedorId ?? null} options={fornecedorOptions} loading={fornecedoresQuery.isFetching} onChange={(value) => update('fornecedorId', value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="loteLocal" className="font-medium">Local de estoque</label>
                    <EntitySelect id="loteLocal" entityName="local" value={values.localEstoqueId ?? null} options={localOptions} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueId', value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const MovimentacaoLoteDialog = ({ visible, loading, loteId, numeroLote, onHide, onSubmit }: { visible: boolean; loading?: boolean; loteId: string; numeroLote: string; onHide: () => void; onSubmit: (values: MovimentacaoLoteFormValues) => Promise<void> }) => {
    const [tipo, setTipo] = useState<number>(TipoMovimentacaoLote.Saida);
    const [quantidade, setQuantidade] = useState<number | null>(1);
    const [documento, setDocumento] = useState('');
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState('');

    const movimentacoesQuery = useMovimentacoesLote(visible ? loteId : null);

    useEffect(() => {
        if (visible) {
            setTipo(TipoMovimentacaoLote.Saida);
            setQuantidade(1);
            setDocumento('');
            setObservacao('');
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!quantidade || quantidade <= 0) {
            setErro('Quantidade deve ser maior que zero.');
            return;
        }
        await onSubmit({ loteId, tipo, quantidade: quantidade ?? 0, documento: documento.trim() || null, observacao: observacao.trim() || null });
    };

    return (
        <Dialog header={`Movimentações do lote ${numeroLote}`} visible={visible} modal style={{ width: 'min(52rem, 98vw)' }} onHide={onHide}>
            <PermissionGuard permission="ALIMENTAR_LOTES_GERENCIAR" mode="disable">
                {({ disabled }) => (
                    <FormGrid>
                        <div className="field col-6 md:col-3">
                            <label htmlFor="movTipo" className="font-medium">Tipo *</label>
                            <Dropdown inputId="movTipo" value={tipo} options={tipoMovimentacaoOptions} disabled={disabled} onChange={(event) => setTipo(event.value)} />
                        </div>
                        <div className="field col-6 md:col-3">
                            <label htmlFor="movQtd" className="font-medium">Quantidade *</label>
                            <QuantityInput id="movQtd" value={quantidade} disabled={disabled} onChange={(value) => { setQuantidade(value); setErro(''); }} />
                            <FieldError message={erro} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="movDocumento" className="font-medium">Documento</label>
                            <InputText id="movDocumento" value={documento} disabled={disabled} onChange={(event) => setDocumento(event.target.value)} />
                        </div>
                        <div className="field col-12 md:col-3 flex align-items-end">
                            <Button type="button" className="w-full mb-2" label="Registrar" icon="pi pi-plus" loading={loading} disabled={disabled} onClick={confirmar} />
                        </div>
                        <div className="field col-12">
                            <label htmlFor="movObservacao" className="font-medium">Observação</label>
                            <InputTextarea id="movObservacao" value={observacao} rows={2} autoResize disabled={disabled} onChange={(event) => setObservacao(event.target.value)} />
                        </div>
                    </FormGrid>
                )}
            </PermissionGuard>
            <DataTable value={movimentacoesQuery.data ?? []} dataKey="id" loading={movimentacoesQuery.isFetching} emptyMessage="Nenhuma movimentação." responsiveLayout="scroll" stripedRows size="small" className="mt-2">
                <Column header="Data" body={(row: MovimentacaoLoteResponse) => formatDate(row.data)} />
                <Column header="Tipo" body={(row: MovimentacaoLoteResponse) => tipoMovimentacaoLabel(Number(row.tipo))} />
                <Column header="Quantidade" body={(row: MovimentacaoLoteResponse) => row.quantidade.toLocaleString('pt-BR')} />
                <Column field="documento" header="Documento" headerClassName="hidden md:table-cell" bodyClassName="hidden md:table-cell" body={(row: MovimentacaoLoteResponse) => row.documento || '—'} />
            </DataTable>
        </Dialog>
    );
};

const initialRecall = (): RecallFormValues => ({ empresaId: '', filialId: null, gravidade: GravidadeRecall.Alta, motivo: '', descricao: '' });

export const RecallFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: RecallFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<RecallFormValues>(initialRecall);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialRecall());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof RecallFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = abrirRecallSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Abrir recall" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Abrir recall', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-4">
                    <label htmlFor="recallGravidade" className="font-medium">Gravidade *</label>
                    <Dropdown inputId="recallGravidade" value={values.gravidade} options={gravidadeRecallOptions} onChange={(event) => update('gravidade', event.value)} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="recallMotivo" className="font-medium">Motivo *</label>
                    <InputText id="recallMotivo" value={values.motivo} className={invalid('motivo')} onChange={(event) => update('motivo', event.target.value)} />
                    <FieldError message={errors.motivo} />
                </div>
                <div className="field col-12">
                    <label htmlFor="recallDescricao" className="font-medium">Descrição</label>
                    <InputTextarea id="recallDescricao" value={values.descricao ?? ''} rows={3} autoResize onChange={(event) => update('descricao', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
