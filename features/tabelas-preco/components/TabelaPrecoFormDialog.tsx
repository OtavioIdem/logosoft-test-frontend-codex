'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { classNames } from 'primereact/utils';
import { DateInput } from '@/components/forms/DateInput';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FieldError } from '@/components/forms/FieldError';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { tabelaPrecoSchema } from '@/features/tabelas-preco/schemas/tabelasPrecoSchemas';
import { TabelaPrecoFormValues, TabelaPrecoResponse } from '@/features/tabelas-preco/types/tabelasPreco.types';

type FieldErrors = Record<string, string | undefined>;
const fieldErrorMap = (error: { issues: Array<{ path: Array<string | number>; message: string }> }) => Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? 'form'), issue.message])) as FieldErrors;
const dateFrom = (value?: string | null) => (value ? new Date(`${value}T00:00:00`) : null);
const initialValues = (tabela?: TabelaPrecoResponse | null): TabelaPrecoFormValues => ({ empresaId: tabela?.empresaId ?? '', filialId: tabela?.filialId ?? '', nome: tabela?.nome ?? '', dataInicioVigencia: dateFrom(tabela?.dataInicioVigencia) ?? new Date(), dataFimVigencia: dateFrom(tabela?.dataFimVigencia), padrao: Boolean(tabela?.padrao) });

export const TabelaPrecoFormDialog = ({ visible, loading, tabela, onHide, onSubmit }: { visible: boolean; loading?: boolean; tabela?: TabelaPrecoResponse | null; onHide: () => void; onSubmit: (values: TabelaPrecoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<TabelaPrecoFormValues>(initialValues(tabela));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => { if (visible) { setValues(initialValues(tabela)); setErrors({}); } }, [tabela, visible]);

    const update = (name: keyof TabelaPrecoFormValues, value: unknown) => { setValues((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); };
    const submit = async () => {
        const parsed = tabelaPrecoSchema.safeParse(values);
        if (!parsed.success) { setErrors(fieldErrorMap(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header={tabela ? 'Editar tabela de preço' : 'Nova tabela de preço'} visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} onHide={onHide} footer={<div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" severity="secondary" outlined disabled={loading} onClick={onHide} /><Button label={tabela ? 'Salvar' : 'Criar tabela'} icon="pi pi-check" loading={loading} onClick={submit} /></div>}>
            <div className="grid formgrid p-fluid">
                <div className="field col-12 md:col-6"><label htmlFor="empresaTabela" className="font-medium">Empresa *</label><EmpresaSelect id="empresaTabela" value={values.empresaId || null} required disabled={Boolean(tabela)} onChange={(value) => update('empresaId', value ?? '')} /><FieldError message={errors.empresaId} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="filialTabela" className="font-medium">Filial</label><FilialSelect id="filialTabela" empresaId={values.empresaId || null} value={values.filialId || null} disabled={!values.empresaId || Boolean(tabela)} onChange={(value) => update('filialId', value ?? '')} /><FieldError message={errors.filialId} /></div>
                <div className="field col-12"><label htmlFor="nomeTabela" className="font-medium">Nome *</label><InputText id="nomeTabela" value={values.nome} className={classNames({ 'p-invalid': errors.nome })} onChange={(event) => update('nome', event.target.value)} /><FieldError message={errors.nome} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="inicioTabela" className="font-medium">Início da vigência *</label><DateInput id="inicioTabela" value={values.dataInicioVigencia} onChange={(value) => update('dataInicioVigencia', value)} /><FieldError message={errors.dataInicioVigencia} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="fimTabela" className="font-medium">Fim da vigência</label><DateInput id="fimTabela" value={values.dataFimVigencia ?? null} onChange={(value) => update('dataFimVigencia', value)} /><FieldError message={errors.dataFimVigencia} /></div>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="padraoTabela" checked={values.padrao} onChange={(event) => update('padrao', Boolean(event.checked))} /><label htmlFor="padraoTabela" className="font-medium">Tabela padrão</label></div>
            </div>
        </Dialog>
    );
};
