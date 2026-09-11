'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { QuantityInput } from '@/components/forms/QuantityInput';
import { DateInput } from '@/components/forms/DateInput';
import { SelectOption, TipoPedidoVenda } from '@/types/erp';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { criarLeadSchema } from '@/features/crm/schemas/crmSchemas';
import {
    ConverterOportunidadeFormValues,
    ItemPropostaFormValues,
    LeadFormValues,
    OrigemLead,
    PerderOportunidadeFormValues,
    PropostaFormValues,
    QualificarLeadFormValues
} from '@/features/crm/types/crm.types';
import { motivoPerdaOptions, origemLeadOptions } from '@/features/crm/components/crmLabels';
import { formatMoney } from '@/lib/formatters/money';

const buildErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    }
    return map;
};

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} onClick={onConfirm} />
    </div>
);


const tipoPedidoOptions = [
    { label: 'Orçamento', value: TipoPedidoVenda.Orcamento },
    { label: 'Pedido', value: TipoPedidoVenda.Pedido }
];

const initialLead = (): LeadFormValues => ({ empresaId: '', filialId: null, nome: '', empresa: '', email: '', telefone: '', origem: OrigemLead.Site, responsavelId: null });

export const LeadFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: LeadFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<LeadFormValues>(initialLead);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialLead());
            setErrors({});
        }
    }, [visible]);

    const usuariosQuery = useUsuariosSeguranca({ empresaId: values.empresaId || undefined, filialId: values.filialId || undefined, ativo: true });
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);

    const update = (name: keyof LeadFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarLeadSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Novo lead" visible={visible} modal style={{ width: 'min(54rem, 98vw)' }} footer={footer('Criar lead', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6">
                    <label htmlFor="leadNome" className="font-medium">Nome *</label>
                    <InputText id="leadNome" value={values.nome} className={invalid('nome')} onChange={(event) => update('nome', event.target.value)} />
                    <FieldError message={errors.nome} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="leadEmpresa" className="font-medium">Empresa</label>
                    <InputText id="leadEmpresa" value={values.empresa ?? ''} onChange={(event) => update('empresa', event.target.value)} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="leadEmail" className="font-medium">E-mail</label>
                    <InputText id="leadEmail" value={values.email ?? ''} onChange={(event) => update('email', event.target.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="leadTelefone" className="font-medium">Telefone</label>
                    <InputText id="leadTelefone" value={values.telefone ?? ''} onChange={(event) => update('telefone', event.target.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="leadOrigem" className="font-medium">Origem *</label>
                    <Dropdown inputId="leadOrigem" value={values.origem} options={origemLeadOptions} onChange={(event) => update('origem', event.value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="leadResponsavel" className="font-medium">Responsável</label>
                    <EntitySelect id="leadResponsavel" entityName="responsável" value={values.responsavelId ?? null} options={usuarioOptions} loading={usuariosQuery.isFetching} onChange={(value) => update('responsavelId', value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const QualificarLeadDialog = ({ visible, loading, empresaId, filialId, onHide, onSubmit }: { visible: boolean; loading?: boolean; empresaId?: string | null; filialId?: string | null; onHide: () => void; onSubmit: (values: QualificarLeadFormValues) => Promise<void> }) => {
    const [clienteId, setClienteId] = useState<string | null>(null);
    const [titulo, setTitulo] = useState('');
    const [valorEstimado, setValorEstimado] = useState<number | null>(0);
    const [responsavelId, setResponsavelId] = useState<string | null>(null);
    const [dataPrevisao, setDataPrevisao] = useState<Date | null>(null);
    const [erros, setErros] = useState<Record<string, string>>({});

    const clientesQuery = useClientes({ empresaId: empresaId ?? null, filialId: filialId ?? null });
    const usuariosQuery = useUsuariosSeguranca({ empresaId: empresaId ?? undefined, filialId: filialId ?? undefined, ativo: true });
    const clienteOptions = useMemo(() => (clientesQuery.data ?? []).map((cliente) => ({ label: cliente.codigo, value: cliente.id })), [clientesQuery.data]);
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);

    useEffect(() => {
        if (visible) {
            setClienteId(null);
            setTitulo('');
            setValorEstimado(0);
            setResponsavelId(null);
            setDataPrevisao(null);
            setErros({});
        }
    }, [visible]);

    const confirmar = async () => {
        const next: Record<string, string> = {};
        if (!clienteId) next.clienteId = 'Selecione o cliente.';
        if (!titulo.trim()) next.titulo = 'Informe o título.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ clienteId: clienteId as string, titulo, valorEstimado: valorEstimado ?? 0, responsavelId, dataPrevisaoFechamento: dataPrevisao });
    };

    return (
        <Dialog header="Qualificar lead" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Qualificar', loading, onHide, confirmar)} onHide={onHide}>
            <p className="text-color-secondary mt-0">Qualificar converte o lead em oportunidade vinculada a um cliente.</p>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="qualCliente" className="font-medium">Cliente *</label>
                    <EntitySelect id="qualCliente" entityName="cliente" value={clienteId} options={clienteOptions} loading={clientesQuery.isFetching} onChange={(value) => { setClienteId(value); setErros((c) => ({ ...c, clienteId: '' })); }} />
                    <FieldError message={erros.clienteId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="qualTitulo" className="font-medium">Título da oportunidade *</label>
                    <InputText id="qualTitulo" value={titulo} className={classNames({ 'p-invalid': erros.titulo })} onChange={(event) => { setTitulo(event.target.value); setErros((c) => ({ ...c, titulo: '' })); }} />
                    <FieldError message={erros.titulo} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="qualValor" className="font-medium">Valor estimado</label>
                    <MoneyInput id="qualValor" value={valorEstimado} onChange={setValorEstimado} />
                </div>
                <div className="field col-12 md:col-5">
                    <label htmlFor="qualResponsavel" className="font-medium">Responsável</label>
                    <EntitySelect id="qualResponsavel" entityName="responsável" value={responsavelId} options={usuarioOptions} loading={usuariosQuery.isFetching} onChange={setResponsavelId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="qualPrevisao" className="font-medium">Previsão</label>
                    <DateInput id="qualPrevisao" value={dataPrevisao} onChange={setDataPrevisao} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const PerderOportunidadeDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: PerderOportunidadeFormValues) => Promise<void> }) => {
    const [motivo, setMotivo] = useState<number>(motivoPerdaOptions[0]?.value ?? 1);
    const [justificativa, setJustificativa] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setMotivo(motivoPerdaOptions[0]?.value ?? 1);
            setJustificativa('');
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!justificativa.trim()) {
            setErro('Informe a justificativa.');
            return;
        }
        await onSubmit({ motivo, justificativa });
    };

    return (
        <Dialog header="Perder oportunidade" visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} footer={footer('Marcar como perdida', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-5">
                    <label htmlFor="perdaMotivo" className="font-medium">Motivo *</label>
                    <Dropdown inputId="perdaMotivo" value={motivo} options={motivoPerdaOptions} onChange={(event) => setMotivo(event.value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="perdaJustificativa" className="font-medium">Justificativa *</label>
                    <InputTextarea id="perdaJustificativa" value={justificativa} rows={3} autoResize className={classNames({ 'p-invalid': erro })} onChange={(event) => { setJustificativa(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ConverterOportunidadeDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ConverterOportunidadeFormValues) => Promise<void> }) => {
    const [numeroPedido, setNumeroPedido] = useState('');
    const [tipo, setTipo] = useState<number>(TipoPedidoVenda.Pedido);
    const [dataEmissao, setDataEmissao] = useState<Date | null>(null);
    const [dataPrevisaoEntrega, setDataPrevisaoEntrega] = useState<Date | null>(null);
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setNumeroPedido('');
            setTipo(TipoPedidoVenda.Pedido);
            setDataEmissao(null);
            setDataPrevisaoEntrega(null);
            setObservacao('');
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!numeroPedido.trim()) {
            setErro('Informe o número do pedido.');
            return;
        }
        await onSubmit({ numeroPedido, tipo, dataEmissao, dataPrevisaoEntrega, observacao: observacao.trim() || null });
    };

    return (
        <Dialog header="Converter em pedido de venda" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Converter', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-6 md:col-4">
                    <label htmlFor="convNumero" className="font-medium">Número do pedido *</label>
                    <InputText id="convNumero" value={numeroPedido} className={classNames({ 'p-invalid': erro })} onChange={(event) => { setNumeroPedido(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="convTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="convTipo" value={tipo} options={tipoPedidoOptions} onChange={(event) => setTipo(event.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="convEmissao" className="font-medium">Emissão</label>
                    <DateInput id="convEmissao" value={dataEmissao} onChange={setDataEmissao} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="convEntrega" className="font-medium">Previsão de entrega</label>
                    <DateInput id="convEntrega" value={dataPrevisaoEntrega} onChange={setDataPrevisaoEntrega} />
                </div>
                <div className="field col-12">
                    <label htmlFor="convObs" className="font-medium">Observação</label>
                    <InputTextarea id="convObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const emptyItem = (): ItemPropostaFormValues => ({ produtoId: '', quantidade: 1, valorUnitario: 0, valorDesconto: 0, observacao: null });

export const PropostaFormDialog = ({ visible, loading, oportunidadeId, empresaId, filialId, onHide, onSubmit }: { visible: boolean; loading?: boolean; oportunidadeId: string; empresaId?: string | null; filialId?: string | null; onHide: () => void; onSubmit: (values: PropostaFormValues) => Promise<void> }) => {
    const [dataValidade, setDataValidade] = useState<Date | null>(null);
    const [observacao, setObservacao] = useState('');
    const [itens, setItens] = useState<ItemPropostaFormValues[]>([]);
    const [novo, setNovo] = useState<ItemPropostaFormValues>(emptyItem);
    const [erro, setErro] = useState('');

    const produtosQuery = useProdutos({ empresaId: empresaId ?? null, filialId: filialId ?? null });
    const produtoOptions = useMemo<SelectOption<string>[]>(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const produtoLabel = useMemo(() => {
        const map = new Map(produtoOptions.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [produtoOptions]);

    useEffect(() => {
        if (visible) {
            setDataValidade(null);
            setObservacao('');
            setItens([]);
            setNovo(emptyItem());
            setErro('');
        }
    }, [visible]);

    const adicionarItem = () => {
        if (!novo.produtoId || novo.quantidade <= 0) {
            setErro('Selecione o produto e a quantidade do item.');
            return;
        }
        setItens((current) => [...current, novo]);
        setNovo(emptyItem());
        setErro('');
    };
    const removerItem = (index: number) => setItens((current) => current.filter((_, i) => i !== index));

    const totalItem = (item: ItemPropostaFormValues) => item.quantidade * item.valorUnitario - item.valorDesconto;

    const confirmar = async () => {
        if (itens.length === 0) {
            setErro('Adicione ao menos um item.');
            return;
        }
        await onSubmit({ oportunidadeId, dataValidade, observacao: observacao.trim() || null, itens });
    };

    return (
        <Dialog header="Nova proposta" visible={visible} modal style={{ width: 'min(64rem, 98vw)' }} footer={footer('Criar proposta', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-4">
                    <label htmlFor="propValidade" className="font-medium">Validade</label>
                    <DateInput id="propValidade" value={dataValidade} onChange={setDataValidade} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="propObs" className="font-medium">Observação</label>
                    <InputText id="propObs" value={observacao} onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>

            <div className="grid formgrid p-fluid align-items-end mt-2">
                <div className="field col-12 md:col-4">
                    <label htmlFor="itemProduto" className="font-medium">Produto</label>
                    <EntitySelect id="itemProduto" entityName="produto" value={novo.produtoId || null} options={produtoOptions} loading={produtosQuery.isFetching} onChange={(value) => setNovo((c) => ({ ...c, produtoId: value ?? '' }))} />
                </div>
                <div className="field col-4 md:col-2">
                    <label htmlFor="itemQtd" className="font-medium">Qtd</label>
                    <QuantityInput id="itemQtd" value={novo.quantidade} onChange={(value) => setNovo((c) => ({ ...c, quantidade: value ?? 0 }))} />
                </div>
                <div className="field col-4 md:col-2">
                    <label htmlFor="itemValor" className="font-medium">Valor unit.</label>
                    <MoneyInput id="itemValor" value={novo.valorUnitario} onChange={(value) => setNovo((c) => ({ ...c, valorUnitario: value ?? 0 }))} />
                </div>
                <div className="field col-4 md:col-2">
                    <label htmlFor="itemDesc" className="font-medium">Desconto</label>
                    <MoneyInput id="itemDesc" value={novo.valorDesconto} onChange={(value) => setNovo((c) => ({ ...c, valorDesconto: value ?? 0 }))} />
                </div>
                <div className="field col-12 md:col-2">
                    <Button type="button" label="Adicionar item" icon="pi pi-plus" severity="secondary" onClick={adicionarItem} />
                </div>
            </div>
            <FieldError message={erro} />

            <DataTable value={itens} dataKey="produtoId" emptyMessage="Nenhum item adicionado." responsiveLayout="scroll" stripedRows size="small" className="mt-2">
                <Column header="Produto" body={(item: ItemPropostaFormValues) => produtoLabel(item.produtoId)} />
                <Column header="Qtd" body={(item: ItemPropostaFormValues) => item.quantidade} />
                <Column header="Valor unit." body={(item: ItemPropostaFormValues) => formatMoney(item.valorUnitario)} />
                <Column header="Desconto" body={(item: ItemPropostaFormValues) => formatMoney(item.valorDesconto)} />
                <Column header="Total" body={(item: ItemPropostaFormValues) => formatMoney(totalItem(item))} />
                <Column header="" alignHeader="right" body={(_item: ItemPropostaFormValues, options) => <Button type="button" icon="pi pi-trash" text severity="danger" size="small" onClick={() => removerItem(options.rowIndex)} />} />
            </DataTable>
        </Dialog>
    );
};
