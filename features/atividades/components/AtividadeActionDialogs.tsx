'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { AtividadeStatus } from '@/features/atividades/types/atividades.types';
import { UsuarioResponse } from '@/features/seguranca/types/seguranca.types';
import { SelectOption } from '@/types/erp';

const statusOptions: SelectOption<AtividadeStatus>[] = [
    { label: 'Aberta', value: 'Aberta' },
    { label: 'Em andamento', value: 'EmAndamento' },
    { label: 'Concluída', value: 'Concluida' },
    { label: 'Cancelada', value: 'Cancelada' }
];

export const AtribuirAtividadeDialog = ({ visible, loading, usuarios, onHide, onSubmit }: { visible: boolean; loading?: boolean; usuarios: UsuarioResponse[]; onHide: () => void; onSubmit: (values: { responsavelUsuarioId: string }) => Promise<void> | void }) => {
    const [responsavelUsuarioId, setResponsavelUsuarioId] = useState<string | null>(null);
    useEffect(() => { if (visible) setResponsavelUsuarioId(null); }, [visible]);
    const options = useMemo<SelectOption<string>[]>(() => usuarios.filter((usuario) => usuario.ativo !== false).map((usuario) => ({ label: `${usuario.nome} • ${usuario.email}`, value: usuario.id })), [usuarios]);
    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label="Atribuir" icon="pi pi-user" onClick={() => responsavelUsuarioId && onSubmit({ responsavelUsuarioId })} loading={loading} disabled={!responsavelUsuarioId} /></div>;
    return <Dialog header="Atribuir responsável" visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} onHide={onHide} footer={footer}><div className="field"><label htmlFor="atividadeAtribuir" className="font-medium">Responsável</label><EntitySelect id="atividadeAtribuir" entityName="usuário" value={responsavelUsuarioId} options={options} onChange={setResponsavelUsuarioId} loading={loading} /></div></Dialog>;
};

export const AlterarStatusAtividadeDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: { status: AtividadeStatus; comentario?: string | null }) => Promise<void> | void }) => {
    const [status, setStatus] = useState<AtividadeStatus>('EmAndamento');
    const [comentario, setComentario] = useState('');
    useEffect(() => { if (visible) { setStatus('EmAndamento'); setComentario(''); } }, [visible]);
    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label="Alterar status" icon="pi pi-check" onClick={() => onSubmit({ status, comentario: comentario.trim() || null })} loading={loading} disabled={!status} /></div>;
    return <Dialog header="Alterar status da atividade" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} onHide={onHide} footer={footer}><div className="grid formgrid p-fluid"><div className="field col-12"><label htmlFor="atividadeStatus" className="font-medium">Status</label><Dropdown id="atividadeStatus" value={status} options={statusOptions} onChange={(event) => setStatus(event.value as AtividadeStatus)} /></div><div className="field col-12"><label htmlFor="atividadeStatusComentario" className="font-medium">Comentário</label><InputTextarea id="atividadeStatusComentario" value={comentario} onChange={(event) => setComentario(event.target.value)} rows={3} disabled={loading} /></div></div></Dialog>;
};

export const ComentarAtividadeDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: { mensagem: string }) => Promise<void> | void }) => {
    const [mensagem, setMensagem] = useState('');
    useEffect(() => { if (visible) setMensagem(''); }, [visible]);
    const footer = <div className="flex justify-content-end gap-2"><Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} /><Button label="Comentar" icon="pi pi-comment" onClick={() => onSubmit({ mensagem })} loading={loading} disabled={mensagem.trim().length < 3} /></div>;
    return <Dialog header="Adicionar comentário" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} onHide={onHide} footer={footer}><div className="field"><label htmlFor="atividadeComentario" className="font-medium">Mensagem</label><InputTextarea id="atividadeComentario" value={mensagem} onChange={(event) => setMensagem(event.target.value)} rows={4} disabled={loading} /></div></Dialog>;
};
