'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { classNames } from 'primereact/utils';
import { CpfCnpjInput } from '@/components/forms/CpfCnpjInput';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { FieldError } from '@/components/forms/FieldError';
import { criarPessoaSchema, atualizarPessoaSchema } from '@/features/pessoas/schemas/pessoasSchemas';
import { PessoaFormValues, PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { fieldErrorMap, FieldErrors, textValue } from '@/features/pessoas/components/formUtils';
import { TipoPessoa } from '@/types/erp';

const tipoPessoaOptions = [
    { label: 'Pessoa física', value: TipoPessoa.Fisica },
    { label: 'Pessoa jurídica', value: TipoPessoa.Juridica }
];

const buildInitialValues = (record?: PessoaResponse | null): PessoaFormValues =>
    record
        ? {
              id: record.id,
              nomeRazaoSocial: record.nomeRazaoSocial,
              nomeFantasia: record.nomeFantasia,
              inscricaoEstadual: record.inscricaoEstadual,
              inscricaoMunicipal: record.inscricaoMunicipal,
              observacao: record.observacao
          }
        : {
              empresaId: '',
              filialId: null,
              tipoPessoa: TipoPessoa.Juridica,
              nomeRazaoSocial: '',
              nomeFantasia: null,
              documento: '',
              inscricaoEstadual: null,
              inscricaoMunicipal: null,
              observacao: null
          };

export const PessoaFormDialog = ({ visible, loading, record, onHide, onSubmit }: { visible: boolean; loading?: boolean; record?: PessoaResponse | null; onHide: () => void; onSubmit: (values: PessoaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<PessoaFormValues>(() => buildInitialValues(record));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(record));
            setErrors({});
        }
    }, [record, visible]);

    const update = (name: keyof PessoaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const submit = async () => {
        const schema = record ? atualizarPessoaSchema : criarPessoaSchema;
        const parsed = schema.safeParse(values);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit(record?.id ? { ...(parsed.data as PessoaFormValues), id: record.id } : (parsed.data as PessoaFormValues));
    };

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label="Salvar" icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    const className = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header={record ? 'Editar pessoa' : 'Nova pessoa'} visible={visible} modal style={{ width: 'min(64rem, 96vw)' }} footer={footer} onHide={onHide}>
            <TabView>
                <TabPanel header="Dados gerais">
                    <div className="grid formgrid p-fluid">
                        {!record ? (
                            <>
                                <EmpresaFilialFields empresaId={textValue(values.empresaId) || null} filialId={textValue(values.filialId) || null} empresaError={errors.empresaId} filialError={errors.filialId} onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                                <div className="field col-12 md:col-4">
                                    <label htmlFor="tipoPessoa" className="font-medium">Tipo *</label>
                                    <Dropdown id="tipoPessoa" value={values.tipoPessoa ?? TipoPessoa.Juridica} options={tipoPessoaOptions} onChange={(event) => update('tipoPessoa', event.value)} />
                                    <FieldError message={errors.tipoPessoa} />
                                </div>
                                <div className="field col-12 md:col-8">
                                    <label htmlFor="documento" className="font-medium">CPF/CNPJ *</label>
                                    <CpfCnpjInput id="documento" value={textValue(values.documento)} onChange={(value) => update('documento', value)} />
                                    <small className="text-color-secondary">CNPJ alfanumérico é preservado; a validação definitiva é do backend.</small>
                                    <FieldError message={errors.documento} />
                                </div>
                            </>
                        ) : null}
                        <div className="field col-12 md:col-6">
                            <label htmlFor="nomeRazaoSocial" className="font-medium">Nome/Razão social *</label>
                            <InputText id="nomeRazaoSocial" value={textValue(values.nomeRazaoSocial)} className={className('nomeRazaoSocial')} onChange={(event) => update('nomeRazaoSocial', event.target.value)} />
                            <FieldError message={errors.nomeRazaoSocial} />
                        </div>
                        <div className="field col-12 md:col-6">
                            <label htmlFor="nomeFantasia" className="font-medium">Nome fantasia/Apelido</label>
                            <InputText id="nomeFantasia" value={textValue(values.nomeFantasia)} className={className('nomeFantasia')} onChange={(event) => update('nomeFantasia', event.target.value)} />
                            <FieldError message={errors.nomeFantasia} />
                        </div>
                    </div>
                </TabPanel>
                <TabPanel header="Documentos e observações">
                    <div className="grid formgrid p-fluid">
                        <div className="field col-12 md:col-6">
                            <label htmlFor="inscricaoEstadual" className="font-medium">Inscrição estadual</label>
                            <InputText id="inscricaoEstadual" value={textValue(values.inscricaoEstadual)} className={className('inscricaoEstadual')} onChange={(event) => update('inscricaoEstadual', event.target.value)} />
                            <FieldError message={errors.inscricaoEstadual} />
                        </div>
                        <div className="field col-12 md:col-6">
                            <label htmlFor="inscricaoMunicipal" className="font-medium">Inscrição municipal</label>
                            <InputText id="inscricaoMunicipal" value={textValue(values.inscricaoMunicipal)} className={className('inscricaoMunicipal')} onChange={(event) => update('inscricaoMunicipal', event.target.value)} />
                            <FieldError message={errors.inscricaoMunicipal} />
                        </div>
                        <div className="field col-12">
                            <label htmlFor="observacao" className="font-medium">Observação</label>
                            <InputTextarea id="observacao" value={textValue(values.observacao)} rows={4} autoResize className={className('observacao')} onChange={(event) => update('observacao', event.target.value)} />
                            <FieldError message={errors.observacao} />
                        </div>
                    </div>
                </TabPanel>
                <TabPanel header="LGPD e auditoria visual">
                    <Message severity="warn" className="w-full" text="Esta rotina manipula dados pessoais. Evite copiar documentos para campos de observação e não compartilhe prints com CPF/CNPJ sem necessidade operacional." />
                </TabPanel>
            </TabView>
        </Dialog>
    );
};
