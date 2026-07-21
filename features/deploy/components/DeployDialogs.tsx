'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { CriarDeployFormValues, ItemChecklistFormValues, ResultadoChecklistFormValues } from '@/features/deploy/types/deploy.types';

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} onClick={onConfirm} />
    </div>
);

export const CriarDeployDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: CriarDeployFormValues) => Promise<void> }) => {
    const [versao, setVersao] = useState('');
    const [ambiente, setAmbiente] = useState('');
    const [descricao, setDescricao] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setVersao('');
            setAmbiente('');
            setDescricao('');
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!versao.trim()) {
            setErro('Informe a versão.');
            return;
        }
        await onSubmit({ versao, ambiente: ambiente.trim() || null, descricao: descricao.trim() || null });
    };

    return (
        <Dialog header="Registrar deploy" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Registrar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-6 md:col-4">
                    <label htmlFor="deployVersao" className="font-medium">Versão *</label>
                    <InputText id="deployVersao" value={versao} className={classNames({ 'p-invalid': erro })} onChange={(event) => { setVersao(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="deployAmbiente" className="font-medium">Ambiente</label>
                    <InputText id="deployAmbiente" value={ambiente} placeholder="produção, homolog…" onChange={(event) => setAmbiente(event.target.value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="deployDescricao" className="font-medium">Descrição</label>
                    <InputTextarea id="deployDescricao" value={descricao} rows={2} autoResize onChange={(event) => setDescricao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ItemChecklistDialog = ({ visible, loading, deployId, onHide, onSubmit }: { visible: boolean; loading?: boolean; deployId: string; onHide: () => void; onSubmit: (values: ItemChecklistFormValues) => Promise<void> }) => {
    const [descricao, setDescricao] = useState('');
    const [obrigatorio, setObrigatorio] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setDescricao('');
            setObrigatorio(true);
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!descricao.trim()) {
            setErro('Informe a descrição.');
            return;
        }
        await onSubmit({ deployId, descricao, obrigatorio });
    };

    return (
        <Dialog header="Adicionar item ao checklist" visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} footer={footer('Adicionar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="itemDescricao" className="font-medium">Descrição *</label>
                    <InputText id="itemDescricao" value={descricao} className={classNames({ 'p-invalid': erro })} onChange={(event) => { setDescricao(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12 flex align-items-center gap-2">
                    <Checkbox inputId="itemObrigatorio" checked={obrigatorio} onChange={(event) => setObrigatorio(Boolean(event.checked))} />
                    <label htmlFor="itemObrigatorio">Item obrigatório</label>
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ResultadoChecklistDialog = ({ visible, loading, descricaoItem, onHide, onSubmit }: { visible: boolean; loading?: boolean; descricaoItem: string; onHide: () => void; onSubmit: (values: ResultadoChecklistFormValues) => Promise<void> }) => {
    const [aprovado, setAprovado] = useState(true);
    const [observacao, setObservacao] = useState('');

    useEffect(() => {
        if (visible) {
            setAprovado(true);
            setObservacao('');
        }
    }, [visible]);

    return (
        <Dialog header="Registrar resultado" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer('Registrar', loading, onHide, () => onSubmit({ aprovado, observacao: observacao.trim() || null }))} onHide={onHide}>
            <p className="text-color-secondary mt-0">Item: <strong>{descricaoItem}</strong></p>
            <FormGrid>
                <div className="field col-12 flex align-items-center gap-2">
                    <Checkbox inputId="resAprovado" checked={aprovado} onChange={(event) => setAprovado(Boolean(event.checked))} />
                    <label htmlFor="resAprovado">Aprovado</label>
                </div>
                <div className="field col-12">
                    <label htmlFor="resObservacao" className="font-medium">Observação</label>
                    <InputTextarea id="resObservacao" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
