'use client';

import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

export const OrganizationalContextDialog = ({ visible, onHide }: { visible: boolean; onHide: () => void }) => {
    const context = useOrganizationalContext();

    return (
        <Dialog header="Contexto organizacional" visible={visible} onHide={onHide} modal closable dismissableMask style={{ width: 'min(34rem, 92vw)' }}>
            {context.canChangeOrganization ? (
                <div className="grid formgrid p-fluid">
                    {context.isGlobal ? (
                        <div className="field col-12">
                            <Message severity="warn" text="Selecione uma empresa para consultar ou operar rotinas escopadas." />
                        </div>
                    ) : null}
                    <div className="field col-12">
                        <label htmlFor="organizational-empresa" className="font-medium block mb-2">Empresa ativa</label>
                        <EmpresaSelect id="organizational-empresa" value={context.empresaId} required onChange={context.setEmpresaId} />
                    </div>
                    <div className="field col-12">
                        <label htmlFor="organizational-filial" className="font-medium block mb-2">Filial ativa</label>
                        <FilialSelect id="organizational-filial" empresaId={context.empresaId} value={context.filialId} disabled={!context.empresaId} onChange={context.setFilialId} />
                    </div>
                </div>
            ) : null}
        </Dialog>
    );
};
