'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FormGrid } from '@/components/forms/FormGrid';
import { AtividadeFormValues, AtividadePrioridade, AtividadeResponse } from '@/features/atividades/types/atividades.types';
import { UsuarioResponse } from '@/features/seguranca/types/seguranca.types';
import { SelectOption } from '@/types/erp';

const prioridadeOptions: SelectOption<AtividadePrioridade>[] = [
    { label: 'Baixa', value: 'Baixa' },
    { label: 'Média', value: 'Media' },
    { label: 'Alta', value: 'Alta' },
    { label: 'Crítica', value: 'Critica' }
];

const dateOrNull = (value?: string | Date | null) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const initialValues = (atividade?: AtividadeResponse | null): AtividadeFormValues => ({
    id: atividade?.id,
    empresaId: atividade?.empresaId ?? '',
    filialId: atividade?.filialId ?? null,
    titulo: atividade?.titulo ?? '',
    descricao: atividade?.descricao ?? '',
    prioridade: (atividade?.prioridade as AtividadePrioridade) ?? 'Media',
    responsavelUsuarioId: atividade?.responsavelUsuarioId ?? null,
    prazoEm: dateOrNull(atividade?.prazoEm),
    entidadeOrigem: atividade?.entidadeOrigem ?? null,
    entidadeOrigemId: atividade?.entidadeOrigemId ?? null
});

export const AtividadeFormDialog = ({ visible, loading, atividade, usuarios, onHide, onSubmit }: { visible: boolean; loading?: boolean; atividade?: AtividadeResponse | null; usuarios: UsuarioResponse[]; onHide: () => void; onSubmit: (values: AtividadeFormValues) => Promise<void> | void }) => {
    const [values, setValues] = useState<AtividadeFormValues>(() => initialValues(atividade));

    useEffect(() => {
        if (visible) setValues(initialValues(atividade));
    }, [atividade, visible]);

    const usuarioOptions = useMemo<SelectOption<string>[]>(() => usuarios.filter((usuario) => usuario.ativo !== false).map((usuario) => ({ label: `${usuario.nome} • ${usuario.email}`, value: usuario.id })), [usuarios]);
    const update = <K extends keyof AtividadeFormValues>(key: K, value: AtividadeFormValues[K]) => setValues((current) => ({ ...current, [key]: value }));
    const canSubmit = Boolean((atividade?.id || values.empresaId) && values.titulo.trim() && values.prioridade);

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
            <Button label="Salvar" icon="pi pi-check" onClick={() => onSubmit(values)} loading={loading} disabled={!canSubmit} />
        </div>
    );

    return (
        <Dialog header={atividade ? 'Editar atividade' : 'Nova atividade'} visible={visible} modal style={{ width: '58rem' }} onHide={onHide} footer={footer}>
            <FormGrid>
                {!atividade ? <EmpresaFilialFields empresaId={values.empresaId} filialId={values.filialId ?? null} onEmpresaChange={(value) => setValues((current) => ({ ...current, empresaId: value ?? '', filialId: null, responsavelUsuarioId: null }))} onFilialChange={(value) => update('filialId', value)} disabled={loading} /> : null}
                <div className="field col-12 md:col-8">
                    <label htmlFor="atividadeTitulo" className="font-medium">Título</label>
                    <InputText id="atividadeTitulo" value={values.titulo} onChange={(event) => update('titulo', event.target.value)} disabled={loading} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="atividadePrioridade" className="font-medium">Prioridade</label>
                    <Dropdown id="atividadePrioridade" value={values.prioridade} options={prioridadeOptions} onChange={(event) => update('prioridade', event.value as AtividadePrioridade)} disabled={loading} />
                </div>
                <div className="field col-12">
                    <label htmlFor="atividadeDescricao" className="font-medium">Descrição</label>
                    <InputTextarea id="atividadeDescricao" value={values.descricao ?? ''} onChange={(event) => update('descricao', event.target.value)} rows={3} disabled={loading} />
                </div>
                {!atividade ? (
                    <div className="field col-12 md:col-6">
                        <label htmlFor="atividadeResponsavel" className="font-medium">Responsável</label>
                        <EntitySelect id="atividadeResponsavel" entityName="usuário" value={values.responsavelUsuarioId ?? null} options={usuarioOptions} onChange={(value) => update('responsavelUsuarioId', value)} disabled={loading || !values.empresaId} />
                    </div>
                ) : null}
                <div className="field col-12 md:col-6">
                    <label htmlFor="atividadePrazo" className="font-medium">Prazo</label>
                    <DateTimeInput id="atividadePrazo" value={dateOrNull(values.prazoEm)} onChange={(value) => update('prazoEm', value)} disabled={loading} />
                </div>
                {!atividade ? (
                    <div className="col-12">
                        <Message severity="info" text="O vínculo técnico com uma entidade de origem será preenchido por fluxos contextuais futuros. Nesta tela, não é permitido digitar GUID operacional manualmente." />
                    </div>
                ) : null}
            </FormGrid>
        </Dialog>
    );
};
