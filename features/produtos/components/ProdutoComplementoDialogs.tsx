'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { adicionarCodigoBarrasProdutoSchema, vincularFornecedorProdutoSchema } from '@/features/produtos/schemas/produtosSchemas';
import { CodigoBarrasFormValues, ProdutoFornecedorFormValues } from '@/features/produtos/types/produtos.types';
import { FieldErrors, fieldErrorMap, textValue, toOptions } from '@/features/produtos/components/produtoFormUtils';
import { FornecedorResponse } from '@/features/fornecedores/types/fornecedores.types';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';

export const CodigoBarrasDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: CodigoBarrasFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<CodigoBarrasFormValues>({ codigo: '', descricao: null, principal: true });
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues({ codigo: '', descricao: null, principal: true });
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof CodigoBarrasFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = adicionarCodigoBarrasProdutoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data);
    };

    const footer = <div className="flex justify-content-end gap-2"><Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} /><Button type="button" label="Adicionar" icon="pi pi-check" loading={loading} onClick={submit} /></div>;
    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Adicionar código de barras" visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} footer={footer} onHide={onHide}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12">
                    <label htmlFor="codigoBarras" className="font-medium">Código *</label>
                    <InputText id="codigoBarras" value={textValue(values.codigo)} className={className('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                    <FieldError message={errors.codigo} />
                </div>
                <div className="field col-12">
                    <label htmlFor="descricaoCodigo" className="font-medium">Descrição</label>
                    <InputText id="descricaoCodigo" value={textValue(values.descricao)} className={className('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                    <FieldError message={errors.descricao} />
                </div>
                <div className="field col-12 flex align-items-center gap-2">
                    <Checkbox inputId="principalCodigo" checked={Boolean(values.principal)} onChange={(event) => update('principal', Boolean(event.checked))} />
                    <label htmlFor="principalCodigo" className="font-medium">Código principal</label>
                </div>
            </div>
        </Dialog>
    );
};

export const ProdutoFornecedorDialog = ({ visible, loading, fornecedores, onHide, onSubmit }: { visible: boolean; loading?: boolean; fornecedores: FornecedorResponse[]; onHide: () => void; onSubmit: (values: ProdutoFornecedorFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ProdutoFornecedorFormValues>({ fornecedorId: '', codigoFornecedor: null, descricaoFornecedor: null, principal: true });
    const [errors, setErrors] = useState<FieldErrors>({});
    const pessoasQuery = usePessoas({});
    const pessoaLabelMap = useMemo(() => new Map((pessoasQuery.data ?? []).map((pessoa) => [pessoa.id, pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial])), [pessoasQuery.data]);
    const fornecedorOptions = useMemo(() => toOptions(fornecedores, (item) => `${item.codigo} - ${pessoaLabelMap.get(item.pessoaId) ?? 'Pessoa não carregada'}`), [fornecedores, pessoaLabelMap]);

    useEffect(() => {
        if (visible) {
            setValues({ fornecedorId: '', codigoFornecedor: null, descricaoFornecedor: null, principal: true });
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof ProdutoFornecedorFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const parsed = vincularFornecedorProdutoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(parsed.data);
    };

    const footer = <div className="flex justify-content-end gap-2"><Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} /><Button type="button" label="Vincular" icon="pi pi-check" loading={loading} onClick={submit} /></div>;
    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Vincular fornecedor ao produto" visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} footer={footer} onHide={onHide}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12">
                    <label htmlFor="fornecedorId" className="font-medium">Fornecedor *</label>
                    <EntitySelect id="fornecedorId" entityName="fornecedor" value={textValue(values.fornecedorId) || null} options={fornecedorOptions} onChange={(value) => update('fornecedorId', value)} />
                    <FieldError message={errors.fornecedorId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="codigoFornecedor" className="font-medium">Código no fornecedor</label>
                    <InputText id="codigoFornecedor" value={textValue(values.codigoFornecedor)} className={className('codigoFornecedor')} onChange={(event) => update('codigoFornecedor', event.target.value)} />
                    <FieldError message={errors.codigoFornecedor} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="descricaoFornecedor" className="font-medium">Descrição no fornecedor</label>
                    <InputText id="descricaoFornecedor" value={textValue(values.descricaoFornecedor)} className={className('descricaoFornecedor')} onChange={(event) => update('descricaoFornecedor', event.target.value)} />
                    <FieldError message={errors.descricaoFornecedor} />
                </div>
                <div className="field col-12 flex align-items-center gap-2">
                    <Checkbox inputId="principalFornecedor" checked={Boolean(values.principal)} onChange={(event) => update('principal', Boolean(event.checked))} />
                    <label htmlFor="principalFornecedor" className="font-medium">Fornecedor principal</label>
                </div>
            </div>
        </Dialog>
    );
};
