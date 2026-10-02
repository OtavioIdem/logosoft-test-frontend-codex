'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';

type ReasonDialogProps = {
    visible: boolean;
    title: string;
    confirmLabel?: string;
    loading?: boolean;
    /** Aviso opcional, aditivo (D69): exibido entre o rótulo e o campo, só quando informado. */
    warning?: string;
    /** Aditivo (v1.11.0a8b72, D98): teto de caracteres do motivo, com contador; sem ele o campo não limita. */
    maxLength?: number;
    /** Aditivo (v1.11.0a8b72, D98): erro da última tentativa, dentro do diálogo (o painel da página fica atrás da máscara). */
    error?: string | null;
    onHide: () => void;
    onConfirm: (reason: string) => void;
};

export const ReasonDialog = ({ visible, title, confirmLabel = 'Confirmar', loading, warning, maxLength, error, onHide, onConfirm }: ReasonDialogProps) => {
    const [reason, setReason] = useState('');

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
            <Button label={confirmLabel} icon="pi pi-check" onClick={() => onConfirm(reason)} disabled={!reason.trim()} loading={loading} />
        </div>
    );

    return (
        <Dialog header={title} visible={visible} modal style={{ width: 'min(32rem, 96vw)' }} onHide={onHide} footer={footer}>
            <label htmlFor="reason" className="block font-medium mb-2">
                Motivo obrigatório
            </label>
            {warning ? <Message severity="warn" className="w-full mb-3" text={warning} /> : null}
            {error ? <Message severity="error" className="w-full mb-3" text={error} /> : null}
            <InputTextarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={5} maxLength={maxLength} className="w-full" autoFocus />
            <small className="text-color-secondary block mt-2">O motivo será enviado para auditoria e histórico da operação.</small>
            {maxLength ? <small className="text-color-secondary block mt-1">{reason.length}/{maxLength}</small> : null}
        </Dialog>
    );
};
