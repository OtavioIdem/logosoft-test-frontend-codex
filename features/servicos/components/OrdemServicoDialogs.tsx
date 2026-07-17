'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { DateInput } from '@/components/forms/DateInput';
import { SelectOption } from '@/types/erp';
import {
    EncerrarOrdemServicoFormValues,
    FaturarOrdemServicoFormValues,
    ItemOrdemServicoFormValues,
    PlanejarOrdemServicoFormValues,
    TipoItemOrdemServico,
    TriarOrdemServicoFormValues
} from '@/features/servicos/types/servicos.types';
import { tipoItemOptions } from '@/features/servicos/components/servicosLabels';

type BaseProps = { visible: boolean; loading?: boolean; onHide: () => void };

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} onClick={onConfirm} />
    </div>
);

export const TriarDialog = ({ visible, loading, onHide, onSubmit, usuarioOptions }: BaseProps & { usuarioOptions: SelectOption<string>[]; onSubmit: (values: TriarOrdemServicoFormValues) => Promise<void> }) => {
    const [diagnostico, setDiagnostico] = useState('');
    const [tecnico, setTecnico] = useState<string | null>(null);
    const [erro, setErro] = useState('');
    useEffect(() => { if (visible) { setDiagnostico(''); setTecnico(null); setErro(''); } }, [visible]);
    const confirmar = async () => {
        if (!diagnostico.trim()) { setErro('Informe o diagnóstico.'); return; }
        await onSubmit({ diagnostico, tecnicoResponsavelId: tecnico });
    };
    return (
        <Dialog header="Triar ordem de serviço" visible={visible} modal style={{ width: 'min(38rem, 96vw)' }} footer={footer('Triar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="osDiagnostico" className="font-medium">Diagnóstico *</label>
                    <InputTextarea id="osDiagnostico" value={diagnostico} rows={3} autoResize onChange={(event) => { setDiagnostico(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12">
                    <label htmlFor="osTriarTecnico" className="font-medium">Técnico responsável</label>
                    <EntitySelect id="osTriarTecnico" entityName="técnico" value={tecnico} options={usuarioOptions} onChange={setTecnico} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const PlanejarDialog = ({ visible, loading, onHide, onSubmit }: BaseProps & { onSubmit: (values: PlanejarOrdemServicoFormValues) => Promise<void> }) => {
    const [plano, setPlano] = useState('');
    const [erro, setErro] = useState('');
    useEffect(() => { if (visible) { setPlano(''); setErro(''); } }, [visible]);
    const confirmar = async () => {
        if (!plano.trim()) { setErro('Informe o plano de execução.'); return; }
        await onSubmit({ planoExecucao: plano });
    };
    return (
        <Dialog header="Planejar ordem de serviço" visible={visible} modal style={{ width: 'min(38rem, 96vw)' }} footer={footer('Planejar', loading, onHide, confirmar)} onHide={onHide}>
            <div className="field">
                <label htmlFor="osPlano" className="font-medium">Plano de execução *</label>
                <InputTextarea id="osPlano" className="w-full" value={plano} rows={4} autoResize onChange={(event) => { setPlano(event.target.value); setErro(''); }} />
                <FieldError message={erro} />
            </div>
        </Dialog>
    );
};

export const ItemDialog = ({ visible, loading, onHide, onSubmit, produtoOptions }: BaseProps & { produtoOptions: SelectOption<string>[]; onSubmit: (values: ItemOrdemServicoFormValues) => Promise<void> }) => {
    const [tipo, setTipo] = useState<number>(TipoItemOrdemServico.MaoDeObra);
    const [descricao, setDescricao] = useState('');
    const [produtoId, setProdutoId] = useState<string | null>(null);
    const [quantidade, setQuantidade] = useState<number | null>(1);
    const [valorUnitario, setValorUnitario] = useState<number | null>(0);
    const [erros, setErros] = useState<{ descricao?: string; quantidade?: string }>({});
    useEffect(() => {
        if (visible) { setTipo(TipoItemOrdemServico.MaoDeObra); setDescricao(''); setProdutoId(null); setQuantidade(1); setValorUnitario(0); setErros({}); }
    }, [visible]);
    const confirmar = async () => {
        const next: typeof erros = {};
        if (!descricao.trim()) next.descricao = 'Informe a descrição.';
        if (!quantidade || quantidade <= 0) next.quantidade = 'Quantidade deve ser maior que zero.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ tipo, descricao, produtoId, quantidade: quantidade ?? 0, valorUnitario: valorUnitario ?? 0 });
    };
    return (
        <Dialog header="Adicionar item" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Adicionar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-4">
                    <label htmlFor="osItemTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="osItemTipo" value={tipo} options={tipoItemOptions} onChange={(event) => setTipo(event.value)} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="osItemDescricao" className="font-medium">Descrição *</label>
                    <InputText id="osItemDescricao" value={descricao} onChange={(event) => { setDescricao(event.target.value); setErros((c) => ({ ...c, descricao: undefined })); }} />
                    <FieldError message={erros.descricao} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="osItemProduto" className="font-medium">Produto (se material)</label>
                    <EntitySelect id="osItemProduto" entityName="produto" value={produtoId} options={produtoOptions} onChange={setProdutoId} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="osItemQtd" className="font-medium">Quantidade *</label>
                    <QuantityInput id="osItemQtd" value={quantidade} onChange={(value) => { setQuantidade(value); setErros((c) => ({ ...c, quantidade: undefined })); }} />
                    <FieldError message={erros.quantidade} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="osItemValor" className="font-medium">Valor unitário *</label>
                    <MoneyInput id="osItemValor" value={valorUnitario} onChange={setValorUnitario} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const EncerrarDialog = ({ visible, loading, onHide, onSubmit }: BaseProps & { onSubmit: (values: EncerrarOrdemServicoFormValues) => Promise<void> }) => {
    const [laudo, setLaudo] = useState('');
    const [erro, setErro] = useState('');
    useEffect(() => { if (visible) { setLaudo(''); setErro(''); } }, [visible]);
    const confirmar = async () => {
        if (!laudo.trim()) { setErro('Informe o laudo técnico.'); return; }
        await onSubmit({ laudoTecnico: laudo });
    };
    return (
        <Dialog header="Encerrar tecnicamente" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer('Encerrar', loading, onHide, confirmar)} onHide={onHide}>
            <div className="field">
                <label htmlFor="osLaudo" className="font-medium">Laudo técnico *</label>
                <InputTextarea id="osLaudo" className="w-full" value={laudo} rows={4} autoResize onChange={(event) => { setLaudo(event.target.value); setErro(''); }} />
                <FieldError message={erro} />
            </div>
        </Dialog>
    );
};

export const FaturarDialog = ({ visible, loading, onHide, onSubmit }: BaseProps & { onSubmit: (values: FaturarOrdemServicoFormValues) => Promise<void> }) => {
    const [numeroDocumento, setNumeroDocumento] = useState('');
    const [dataVencimento, setDataVencimento] = useState<Date | null>(null);
    const [observacao, setObservacao] = useState('');
    useEffect(() => { if (visible) { setNumeroDocumento(''); setDataVencimento(null); setObservacao(''); } }, [visible]);
    const confirmar = () => onSubmit({ numeroDocumento: numeroDocumento.trim() || null, dataVencimento, observacao: observacao.trim() || null });
    return (
        <Dialog header="Faturar ordem de serviço" visible={visible} modal style={{ width: 'min(44rem, 96vw)' }} footer={footer('Faturar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="osFatDoc" className="font-medium">Número do documento</label>
                    <InputText id="osFatDoc" value={numeroDocumento} onChange={(event) => setNumeroDocumento(event.target.value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="osFatVenc" className="font-medium">Data de vencimento</label>
                    <DateInput id="osFatVenc" value={dataVencimento} onChange={setDataVencimento} />
                </div>
                <div className="field col-12">
                    <label htmlFor="osFatObs" className="font-medium">Observação</label>
                    <InputTextarea id="osFatObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
