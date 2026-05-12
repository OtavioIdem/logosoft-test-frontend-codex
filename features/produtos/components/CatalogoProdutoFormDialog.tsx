'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { FieldError } from '@/components/forms/FieldError';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { atualizarCategoriaProdutoSchema, atualizarMarcaSchema, atualizarUnidadeMedidaSchema, criarCategoriaProdutoSchema, criarMarcaSchema, criarUnidadeMedidaSchema } from '@/features/produtos/schemas/produtosSchemas';
import { CategoriaProdutoResponse, MarcaResponse, UnidadeMedidaResponse } from '@/features/produtos/types/produtos.types';
import { FieldErrors, fieldErrorMap, textValue } from '@/features/produtos/components/produtoFormUtils';

type CatalogoKind = 'categoria' | 'unidade' | 'marca';
type CatalogoRecord = CategoriaProdutoResponse | UnidadeMedidaResponse | MarcaResponse;
type CatalogoValues = Record<string, unknown> & { id?: string };

const titles: Record<CatalogoKind, string> = {
    categoria: 'categoria de produto',
    unidade: 'unidade de medida',
    marca: 'marca'
};

const buildInitialValues = (kind: CatalogoKind, record?: CatalogoRecord | null): CatalogoValues => {
    if (record) {
        if (kind === 'unidade') {
            const unidade = record as UnidadeMedidaResponse;
            return { id: unidade.id, descricao: unidade.descricao, casasDecimais: unidade.casasDecimais, permiteFracionado: unidade.permiteFracionado };
        }

        if (kind === 'categoria') {
            const categoria = record as CategoriaProdutoResponse;
            return { id: categoria.id, nome: categoria.nome, descricao: categoria.descricao };
        }

        const marca = record as MarcaResponse;
        return { id: marca.id, nome: marca.nome, descricao: marca.descricao };
    }

    if (kind === 'unidade') {
        return { empresaId: '', filialId: null, sigla: '', descricao: '', casasDecimais: 0, permiteFracionado: false };
    }

    if (kind === 'categoria') {
        return { empresaId: '', filialId: null, codigo: '', nome: '', descricao: null };
    }

    return { empresaId: '', filialId: null, nome: '', descricao: null };
};

export const CatalogoProdutoFormDialog = ({
    kind,
    visible,
    loading,
    record,
    onHide,
    onSubmit
}: {
    kind: CatalogoKind;
    visible: boolean;
    loading?: boolean;
    record?: CatalogoRecord | null;
    onHide: () => void;
    onSubmit: (values: CatalogoValues) => Promise<void>;
}) => {
    const [values, setValues] = useState<CatalogoValues>(() => buildInitialValues(kind, record));
    const [errors, setErrors] = useState<FieldErrors>({});
    const title = useMemo(() => titles[kind], [kind]);

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(kind, record));
            setErrors({});
        }
    }, [kind, record, visible]);

    const update = (name: string, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = kind === 'categoria' ? (record ? atualizarCategoriaProdutoSchema : criarCategoriaProdutoSchema) : kind === 'unidade' ? (record ? atualizarUnidadeMedidaSchema : criarUnidadeMedidaSchema) : record ? atualizarMarcaSchema : criarMarcaSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(record?.id ? { ...parsed.data, id: record.id } : parsed.data);
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );
    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header={record ? `Editar ${title}` : `Nova ${title}`} visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer} onHide={onHide}>
            <div className="grid formgrid p-fluid">
                {!record ? (
                    <>
                        <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                    </>
                ) : null}

                {kind === 'categoria' && !record ? (
                    <div className="field col-12 md:col-4">
                        <label htmlFor="codigo" className="font-medium">Código *</label>
                        <InputText id="codigo" value={textValue(values.codigo)} className={className('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                        <FieldError message={errors.codigo} />
                    </div>
                ) : null}

                {kind === 'unidade' && !record ? (
                    <div className="field col-12 md:col-4">
                        <label htmlFor="sigla" className="font-medium">Sigla *</label>
                        <InputText id="sigla" value={textValue(values.sigla)} className={className('sigla')} onChange={(event) => update('sigla', event.target.value.toUpperCase())} maxLength={10} />
                        <FieldError message={errors.sigla} />
                    </div>
                ) : null}

                {kind !== 'unidade' ? (
                    <div className="field col-12 md:col-8">
                        <label htmlFor="nome" className="font-medium">Nome *</label>
                        <InputText id="nome" value={textValue(values.nome)} className={className('nome')} onChange={(event) => update('nome', event.target.value)} />
                        <FieldError message={errors.nome} />
                    </div>
                ) : (
                    <>
                        <div className="field col-12 md:col-5">
                            <label htmlFor="descricao" className="font-medium">Descrição *</label>
                            <InputText id="descricao" value={textValue(values.descricao)} className={className('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                            <FieldError message={errors.descricao} />
                        </div>
                        <div className="field col-12 md:col-3">
                            <label htmlFor="casasDecimais" className="font-medium">Casas decimais *</label>
                            <InputNumber id="casasDecimais" value={typeof values.casasDecimais === 'number' ? values.casasDecimais : 0} className={className('casasDecimais')} min={0} max={6} onValueChange={(event) => update('casasDecimais', event.value ?? 0)} />
                            <FieldError message={errors.casasDecimais} />
                        </div>
                        <div className="field col-12 flex align-items-center gap-2 mt-2">
                            <Checkbox inputId="permiteFracionado" checked={Boolean(values.permiteFracionado)} onChange={(event) => update('permiteFracionado', Boolean(event.checked))} />
                            <label htmlFor="permiteFracionado" className="font-medium">Permite quantidade fracionada</label>
                        </div>
                    </>
                )}

                {kind !== 'unidade' ? (
                    <div className="field col-12">
                        <label htmlFor="descricao" className="font-medium">Descrição</label>
                        <InputTextarea id="descricao" value={textValue(values.descricao)} rows={3} autoResize className={className('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                        <FieldError message={errors.descricao} />
                    </div>
                ) : null}
            </div>
        </Dialog>
    );
};
