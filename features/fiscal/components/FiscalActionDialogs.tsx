'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { ProdutoResponse } from '@/features/produtos/types/produtos.types';
import { useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { PedidoVendaResponse } from '@/features/vendas/types/vendas.types';
import { FormatoDocumentoAuxiliarFiscal, OrigemNotaFiscal, StatusPedidoVenda, TipoContingenciaFiscal, TipoDocumentoFiscal, TipoOperacaoFiscal, TipoServicoTransmissaoFiscal, TipoXmlFiscal } from '@/types/erp';
import { ItemNotaFiscalResponse } from '@/features/fiscal/types/fiscal.types';
import { gerarCorrelationId, maskFiscalSensitiveText, servicoTransmissaoFiscalOptions, tipoDocumentoFiscalOptions, tipoOperacaoFiscalOptions } from '@/features/fiscal/components/fiscalUiUtils';

type BaseDialogProps<T> = {
    visible: boolean;
    loading?: boolean;
    onHide: () => void;
    onSubmit: (values: T) => Promise<void> | void;
};

type FiscalReferenceScope = {
    empresaId?: string | null;
    filialId?: string | null;
};

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="field col-12 md:col-6">
        <label className="font-medium block mb-2">{label}</label>
        {children}
        {hint ? <small className="text-color-secondary block mt-1 line-height-3">{hint}</small> : null}
    </div>
);

const TextAreaField = ({ label, value, rows = 4, onChange, hint }: { label: string; value: string; rows?: number; onChange: (value: string) => void; hint?: string }) => (
    <div className="field col-12">
        <label className="font-medium block mb-2">{label}</label>
        <InputTextarea value={value} rows={rows} className="w-full" onChange={(event) => onChange(event.target.value)} />
        {hint ? <small className="text-color-secondary block mt-1 line-height-3">{hint}</small> : null}
    </div>
);

const ReferencePolicyMessage = () => (
    <div className="field col-12">
        <Message severity="info" className="w-full" text="Referências como empresa, filial, pessoa, pedido, produto e condição de pagamento devem ser selecionadas em listas carregadas da API. Não digite GUID manualmente." />
    </div>
);

const footer = (formId: string, loading: boolean | undefined, onHide: () => void, submitLabel = 'Confirmar') => (
    <div className="flex justify-content-end gap-2">
        <Button label="Cancelar" icon="pi pi-times" text onClick={onHide} disabled={loading} />
        <Button label={submitLabel} icon="pi pi-check" type="submit" form={formId} loading={loading} />
    </div>
);

const pessoaOptions = (pessoas: PessoaResponse[]) =>
    pessoas.map((pessoa) => ({
        label: [pessoa.nomeRazaoSocial, pessoa.nomeFantasia, pessoa.documento].filter(Boolean).join(' • '),
        value: pessoa.id
    }));

const produtoOptions = (produtos: ProdutoResponse[]) =>
    produtos.map((produto) => ({
        label: [produto.codigo, produto.descricao, produto.ncm ? `NCM ${produto.ncm}` : null].filter(Boolean).join(' • '),
        value: produto.id
    }));

const pedidoVendaOptions = (pedidos: PedidoVendaResponse[]) =>
    pedidos.map((pedido) => ({
        label: [pedido.numero, `Total ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(pedido.valorTotal ?? 0))}`].filter(Boolean).join(' • '),
        value: pedido.id
    }));

const findById = <T extends { id: string }>(items: T[], id?: string | null) => items.find((item) => item.id === id);

export const CriarNotaFiscalDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({
        empresaId: '',
        filialId: '',
        tipoDocumento: TipoDocumentoFiscal.NFe,
        tipoOperacao: TipoOperacaoFiscal.Venda,
        origem: OrigemNotaFiscal.Manual,
        origemId: '',
        serie: '1',
        numero: '',
        dataEmissao: new Date().toISOString(),
        naturezaOperacaoId: '',
        pessoaId: '',
        observacao: ''
    });
    const [pessoaSearch, setPessoaSearch] = useState('');
    const pessoaSearchTerm = useDebouncedValue(pessoaSearch.trim());
    const pessoasQuery = usePessoas({ empresaId: values.empresaId || null, filialId: values.filialId || null, termo: pessoaSearchTerm || null });
    const pessoasOptions = useMemo(() => pessoaOptions(pessoasQuery.data ?? []), [pessoasQuery.data]);

    useEffect(() => {
        if (visible) setValues((current) => ({ ...current, dataEmissao: new Date().toISOString() }));
    }, [visible]);

    return (
        <Dialog header="Nova nota fiscal manual" visible={visible} modal style={{ width: '56rem' }} onHide={onHide} footer={footer('criar-nota-fiscal-form', loading, onHide, 'Criar nota')}>
            <form id="criar-nota-fiscal-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <ReferencePolicyMessage />
                <Field label="Empresa"><EmpresaSelect value={values.empresaId || null} required onChange={(empresaId) => setValues((v) => ({ ...v, empresaId: empresaId ?? '', filialId: '', pessoaId: '' }))} /></Field>
                <Field label="Filial"><FilialSelect empresaId={values.empresaId || null} value={values.filialId || null} onChange={(filialId) => setValues((v) => ({ ...v, filialId: filialId ?? '', pessoaId: '' }))} /></Field>
                <Field label="Tipo documento"><Dropdown value={values.tipoDocumento} options={tipoDocumentoFiscalOptions} onChange={(e) => setValues((v) => ({ ...v, tipoDocumento: e.value }))} /></Field>
                <Field label="Operação"><Dropdown value={values.tipoOperacao} options={tipoOperacaoFiscalOptions} onChange={(e) => setValues((v) => ({ ...v, tipoOperacao: e.value }))} /></Field>
                <Field label="Série"><InputText value={values.serie} onChange={(e) => setValues((v) => ({ ...v, serie: e.target.value }))} /></Field>
                <Field label="Número"><InputText value={values.numero} onChange={(e) => setValues((v) => ({ ...v, numero: e.target.value }))} /></Field>
                <Field label="Pessoa/cliente" hint="Seleção carregada da API de Pessoas; o backend valida se a pessoa pode ser usada na nota."><EntitySelect entityName="pessoa" value={values.pessoaId || null} options={pessoasOptions} disabled={!values.empresaId || pessoasQuery.isLoading} loading={pessoasQuery.isFetching} onSearch={setPessoaSearch} onChange={(pessoaId) => setValues((v) => ({ ...v, pessoaId: pessoaId ?? '' }))} /></Field>
                <Field label="Natureza de operação" hint="Ainda sem endpoint operacional no backend; deixe vazio até parametrização fiscal oficial."><InputText value={values.naturezaOperacaoId} disabled placeholder="Parametrização fiscal futura" onChange={(e) => setValues((v) => ({ ...v, naturezaOperacaoId: e.target.value }))} /></Field>
                <TextAreaField label="Observação" value={values.observacao} onChange={(observacao) => setValues((v) => ({ ...v, observacao }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const GerarNotaFiscalPedidoVendaDialog = ({ visible, loading, onHide, onSubmit, pedidoVendaId }: BaseDialogProps<Record<string, unknown>> & { pedidoVendaId?: string }) => {
    const [values, setValues] = useState({
        empresaId: '',
        filialId: '',
        pedidoVendaId: pedidoVendaId ?? '',
        tipoDocumento: TipoDocumentoFiscal.NFe,
        serie: '1',
        numero: '',
        naturezaOperacaoId: '',
        cfopPadrao: '5102',
        unidadeComercialPadrao: 'UN',
        validarDadosFiscaisProduto: true,
        observacao: 'Gerada a partir do pedido de venda.'
    });
    const [pedidoSearch, setPedidoSearch] = useState('');
    const pedidoSearchTerm = useDebouncedValue(pedidoSearch.trim());
    const pedidosQuery = usePedidosVenda({ empresaId: values.empresaId || null, filialId: values.filialId || null, status: StatusPedidoVenda.Aprovado, termo: pedidoSearchTerm || null });
    const pedidosOptions = useMemo(() => pedidoVendaOptions(pedidosQuery.data ?? []), [pedidosQuery.data]);

    useEffect(() => {
        if (visible && pedidoVendaId) setValues((current) => ({ ...current, pedidoVendaId }));
    }, [pedidoVendaId, visible]);

    return (
        <Dialog header="Gerar nota fiscal de pedido de venda" visible={visible} modal style={{ width: '52rem' }} onHide={onHide} footer={footer('gerar-nf-pedido-form', loading, onHide, 'Gerar NF')}>
            <form id="gerar-nf-pedido-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <ReferencePolicyMessage />
                {!pedidoVendaId ? (
                    <>
                        <Field label="Empresa"><EmpresaSelect value={values.empresaId || null} required onChange={(empresaId) => setValues((v) => ({ ...v, empresaId: empresaId ?? '', filialId: '', pedidoVendaId: '' }))} /></Field>
                        <Field label="Filial"><FilialSelect empresaId={values.empresaId || null} value={values.filialId || null} onChange={(filialId) => setValues((v) => ({ ...v, filialId: filialId ?? '', pedidoVendaId: '' }))} /></Field>
                        <Field label="Pedido aprovado"><EntitySelect entityName="pedido aprovado" value={values.pedidoVendaId || null} options={pedidosOptions} disabled={!values.empresaId || pedidosQuery.isLoading} loading={pedidosQuery.isFetching} onSearch={setPedidoSearch} onChange={(pedidoId) => setValues((v) => ({ ...v, pedidoVendaId: pedidoId ?? '' }))} /></Field>
                    </>
                ) : (
                    <div className="field col-12">
                        <Message severity="info" className="w-full" text="Pedido de venda recebido pelo contexto da tela anterior; não há digitação manual de identificador neste fluxo." />
                    </div>
                )}
                <Field label="Tipo documento"><Dropdown value={values.tipoDocumento} options={tipoDocumentoFiscalOptions} onChange={(e) => setValues((v) => ({ ...v, tipoDocumento: e.value }))} /></Field>
                <Field label="Série"><InputText value={values.serie} onChange={(e) => setValues((v) => ({ ...v, serie: e.target.value }))} /></Field>
                <Field label="Número"><InputText value={values.numero} onChange={(e) => setValues((v) => ({ ...v, numero: e.target.value }))} /></Field>
                <Field label="CFOP padrão" hint="Obrigatório quando a validação fiscal do produto estiver ativa."><InputText value={values.cfopPadrao} onChange={(e) => setValues((v) => ({ ...v, cfopPadrao: e.target.value }))} /></Field>
                <Field label="Unidade padrão"><InputText value={values.unidadeComercialPadrao} onChange={(e) => setValues((v) => ({ ...v, unidadeComercialPadrao: e.target.value }))} /></Field>
                <Field label="Natureza de operação" hint="Ainda sem endpoint operacional no backend; deixe vazio até parametrização fiscal oficial."><InputText value={values.naturezaOperacaoId} disabled placeholder="Parametrização fiscal futura" onChange={(e) => setValues((v) => ({ ...v, naturezaOperacaoId: e.target.value }))} /></Field>
                <div className="field col-12 flex align-items-center gap-2">
                    <Checkbox inputId="validarDadosFiscaisProduto" checked={values.validarDadosFiscaisProduto} onChange={(e) => setValues((v) => ({ ...v, validarDadosFiscaisProduto: Boolean(e.checked) }))} />
                    <label htmlFor="validarDadosFiscaisProduto">Validar NCM/CFOP mínimo dos produtos</label>
                </div>
                <TextAreaField label="Observação" value={values.observacao} onChange={(observacao) => setValues((v) => ({ ...v, observacao }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const ItemNotaFiscalDialog = ({ visible, loading, onHide, onSubmit, empresaId, filialId }: BaseDialogProps<Record<string, unknown>> & FiscalReferenceScope) => {
    const [values, setValues] = useState({ produtoId: '', codigoItem: '', descricao: '', ncm: '', cfop: '5102', unidadeComercial: 'UN', quantidade: 1, valorUnitario: 0, valorDesconto: 0, observacao: '' });
    const [produtoSearch, setProdutoSearch] = useState('');
    const produtoSearchTerm = useDebouncedValue(produtoSearch.trim());
    const produtosQuery = useProdutos({ empresaId: empresaId ?? null, filialId: filialId ?? null, termo: produtoSearchTerm || null });
    const produtos = produtosQuery.data ?? [];
    const produtosOptions = useMemo(() => produtoOptions(produtos), [produtos]);

    const selecionarProduto = (produtoId: string | null) => {
        const produto = findById(produtos, produtoId);
        setValues((current) => ({
            ...current,
            produtoId: produtoId ?? '',
            codigoItem: produto?.codigo ?? current.codigoItem,
            descricao: produto?.descricao ?? current.descricao,
            ncm: produto?.ncm ?? current.ncm,
            valorUnitario: produto?.precoVendaBase ?? current.valorUnitario
        }));
    };

    return (
        <Dialog header="Adicionar item fiscal" visible={visible} modal style={{ width: '56rem' }} onHide={onHide} footer={footer('item-nota-fiscal-form', loading, onHide, 'Adicionar item')}>
            <form id="item-nota-fiscal-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <ReferencePolicyMessage />
                <Field label="Produto" hint="Seleção carregada da API de produtos. Código, descrição, NCM e preço são preenchidos como sugestão operacional."><EntitySelect entityName="produto" value={values.produtoId || null} options={produtosOptions} disabled={produtosQuery.isLoading} loading={produtosQuery.isFetching} onSearch={setProdutoSearch} onChange={selecionarProduto} /></Field>
                <Field label="Código"><InputText value={values.codigoItem} onChange={(e) => setValues((v) => ({ ...v, codigoItem: e.target.value }))} /></Field>
                <Field label="Descrição"><InputText value={values.descricao} onChange={(e) => setValues((v) => ({ ...v, descricao: e.target.value }))} /></Field>
                <Field label="NCM"><InputText value={values.ncm} onChange={(e) => setValues((v) => ({ ...v, ncm: e.target.value }))} /></Field>
                <Field label="CFOP"><InputText value={values.cfop} onChange={(e) => setValues((v) => ({ ...v, cfop: e.target.value }))} /></Field>
                <Field label="Unidade"><InputText value={values.unidadeComercial} onChange={(e) => setValues((v) => ({ ...v, unidadeComercial: e.target.value }))} /></Field>
                <Field label="Quantidade"><InputNumber value={values.quantidade} min={0} onValueChange={(e) => setValues((v) => ({ ...v, quantidade: Number(e.value ?? 0) }))} /></Field>
                <Field label="Valor unitário"><InputNumber value={values.valorUnitario} min={0} mode="currency" currency="BRL" locale="pt-BR" onValueChange={(e) => setValues((v) => ({ ...v, valorUnitario: Number(e.value ?? 0) }))} /></Field>
                <Field label="Desconto"><InputNumber value={values.valorDesconto} min={0} mode="currency" currency="BRL" locale="pt-BR" onValueChange={(e) => setValues((v) => ({ ...v, valorDesconto: Number(e.value ?? 0) }))} /></Field>
                <TextAreaField label="Observação" value={values.observacao} onChange={(observacao) => setValues((v) => ({ ...v, observacao }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const ImpostoNotaFiscalDialog = ({ visible, loading, onHide, onSubmit, itens }: BaseDialogProps<Record<string, unknown>> & { itens: ItemNotaFiscalResponse[] }) => {
    const [values, setValues] = useState({ itemNotaFiscalId: '', nome: 'ICMS', cstCsosn: '', baseCalculo: 0, aliquota: 0, valor: 0, observacao: 'Imposto parametrizado manualmente.' });
    const itemOptions = [{ label: 'Imposto da nota', value: '' }, ...itens.map((item) => ({ label: `${item.sequencia} • ${item.codigoItem} • ${item.descricao}`, value: item.id }))];
    return (
        <Dialog header="Adicionar imposto parametrizado" visible={visible} modal style={{ width: '52rem' }} onHide={onHide} footer={footer('imposto-nota-fiscal-form', loading, onHide, 'Adicionar imposto')}>
            <form id="imposto-nota-fiscal-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="Item vinculado" hint="Lista derivada dos itens já carregados no detalhe da nota; não digite o ID do item."><Dropdown value={values.itemNotaFiscalId} options={itemOptions} onChange={(e) => setValues((v) => ({ ...v, itemNotaFiscalId: e.value }))} /></Field>
                <Field label="Imposto"><InputText value={values.nome} onChange={(e) => setValues((v) => ({ ...v, nome: e.target.value }))} /></Field>
                <Field label="CST/CSOSN"><InputText value={values.cstCsosn} onChange={(e) => setValues((v) => ({ ...v, cstCsosn: e.target.value }))} /></Field>
                <Field label="Base cálculo"><InputNumber value={values.baseCalculo} min={0} mode="currency" currency="BRL" locale="pt-BR" onValueChange={(e) => setValues((v) => ({ ...v, baseCalculo: Number(e.value ?? 0) }))} /></Field>
                <Field label="Alíquota %"><InputNumber value={values.aliquota} min={0} suffix="%" onValueChange={(e) => setValues((v) => ({ ...v, aliquota: Number(e.value ?? 0) }))} /></Field>
                <Field label="Valor"><InputNumber value={values.valor} min={0} mode="currency" currency="BRL" locale="pt-BR" onValueChange={(e) => setValues((v) => ({ ...v, valor: Number(e.value ?? 0) }))} /></Field>
                <TextAreaField label="Observação" value={values.observacao} onChange={(observacao) => setValues((v) => ({ ...v, observacao }))} hint="O frontend não calcula imposto automaticamente nesta etapa." />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const XmlPipelineDialog = ({ visible, loading, onHide, onSubmit, mode }: BaseDialogProps<Record<string, unknown>> & { mode: 'gerar' | 'assinar' }) => {
    const [values, setValues] = useState({ armazenarXml: true, validarSchema: false, armazenarXmlAssinado: true, validarSchemaAntesAssinatura: false, schemaSetName: 'NFe-4.00', certificateThumbprint: '', xmlEnvio: '' });
    const isAssinar = mode === 'assinar';
    return (
        <Dialog header={isAssinar ? 'Assinar XML de envio' : 'Gerar XML de envio'} visible={visible} modal style={{ width: '48rem' }} onHide={onHide} footer={footer('xml-pipeline-form', loading, onHide, isAssinar ? 'Assinar XML' : 'Gerar XML')}>
            <form id="xml-pipeline-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(isAssinar ? { certificateThumbprint: values.certificateThumbprint, xmlEnvio: values.xmlEnvio, armazenarXmlAssinado: values.armazenarXmlAssinado, validarSchemaAntesAssinatura: values.validarSchemaAntesAssinatura, schemaSetName: values.schemaSetName } : { armazenarXml: values.armazenarXml, validarSchema: values.validarSchema, schemaSetName: values.schemaSetName }); }}>
                <Field label="Schema set"><InputText value={values.schemaSetName} onChange={(e) => setValues((v) => ({ ...v, schemaSetName: e.target.value }))} /></Field>
                {isAssinar ? (
                    <>
                        <Field label="Thumbprint certificado"><InputText value={values.certificateThumbprint} onChange={(e) => setValues((v) => ({ ...v, certificateThumbprint: e.target.value }))} placeholder="Vazio usa configuração do backend" /></Field>
                        <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="armazenarXmlAssinado" checked={values.armazenarXmlAssinado} onChange={(e) => setValues((v) => ({ ...v, armazenarXmlAssinado: Boolean(e.checked) }))} /><label htmlFor="armazenarXmlAssinado">Armazenar XML assinado</label></div>
                        <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="validarSchemaAntesAssinatura" checked={values.validarSchemaAntesAssinatura} onChange={(e) => setValues((v) => ({ ...v, validarSchemaAntesAssinatura: Boolean(e.checked) }))} /><label htmlFor="validarSchemaAntesAssinatura">Validar schema antes da assinatura</label></div>
                        <TextAreaField label="XML envio opcional" value={values.xmlEnvio} rows={8} onChange={(xmlEnvio) => setValues((v) => ({ ...v, xmlEnvio }))} hint="Se ficar vazio, o backend buscará o último XML de envio armazenado." />
                    </>
                ) : (
                    <>
                        <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="armazenarXml" checked={values.armazenarXml} onChange={(e) => setValues((v) => ({ ...v, armazenarXml: Boolean(e.checked) }))} /><label htmlFor="armazenarXml">Armazenar XML de envio</label></div>
                        <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="validarSchema" checked={values.validarSchema} onChange={(e) => setValues((v) => ({ ...v, validarSchema: Boolean(e.checked) }))} /><label htmlFor="validarSchema">Validar schema agora</label></div>
                    </>
                )}
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const TransmitirSefazDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ ufAutorizadora: 'SP', servico: TipoServicoTransmissaoFiscal.Autorizacao, xmlEnvioAssinado: '', validarSchemaAntesTransmissao: false, schemaSetName: 'NFe-4.00', correlationId: gerarCorrelationId('transmitir') });
    useEffect(() => { if (visible) setValues((v) => ({ ...v, correlationId: gerarCorrelationId('transmitir') })); }, [visible]);
    return (
        <Dialog header="Transmitir para SEFAZ / ambiente configurado" visible={visible} modal style={{ width: '52rem' }} onHide={onHide} footer={footer('transmitir-sefaz-form', loading, onHide, 'Transmitir')}>
            <form id="transmitir-sefaz-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="UF autorizadora"><InputText value={values.ufAutorizadora} maxLength={2} onChange={(e) => setValues((v) => ({ ...v, ufAutorizadora: e.target.value.toUpperCase() }))} /></Field>
                <Field label="Serviço"><Dropdown value={values.servico} options={servicoTransmissaoFiscalOptions} onChange={(e) => setValues((v) => ({ ...v, servico: e.value }))} /></Field>
                <Field label="Schema set"><InputText value={values.schemaSetName} onChange={(e) => setValues((v) => ({ ...v, schemaSetName: e.target.value }))} /></Field>
                <Field label="Correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="validarSchemaAntesTransmissao" checked={values.validarSchemaAntesTransmissao} onChange={(e) => setValues((v) => ({ ...v, validarSchemaAntesTransmissao: Boolean(e.checked) }))} /><label htmlFor="validarSchemaAntesTransmissao">Validar schema antes da transmissão</label></div>
                <TextAreaField label="XML assinado opcional" value={values.xmlEnvioAssinado} rows={8} onChange={(xmlEnvioAssinado) => setValues((v) => ({ ...v, xmlEnvioAssinado }))} hint="Se ficar vazio, o backend buscará o XML de envio armazenado." />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const CancelarNotaLocalDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ motivo: '', protocoloCancelamento: '', xmlCancelamento: '' });
    return (
        <Dialog header="Cancelar nota local/manual" visible={visible} modal style={{ width: '48rem' }} onHide={onHide} footer={footer('cancelar-nota-local-form', loading, onHide, 'Cancelar nota')}>
            <form id="cancelar-nota-local-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <TextAreaField label="Motivo" value={values.motivo} onChange={(motivo) => setValues((v) => ({ ...v, motivo }))} />
                <Field label="Protocolo cancelamento"><InputText value={values.protocoloCancelamento} onChange={(e) => setValues((v) => ({ ...v, protocoloCancelamento: e.target.value }))} /></Field>
                <TextAreaField label="XML cancelamento opcional" value={values.xmlCancelamento} rows={8} onChange={(xmlCancelamento) => setValues((v) => ({ ...v, xmlCancelamento }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const CancelarNotaSefazDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ ufAutorizadora: 'SP', motivo: '', xmlEventoAssinado: '', validarSchemaAntesTransmissao: false, schemaSetName: 'NFe-Evento-4.00', correlationId: gerarCorrelationId('cancelamento') });
    useEffect(() => { if (visible) setValues((v) => ({ ...v, correlationId: gerarCorrelationId('cancelamento') })); }, [visible]);
    return (
        <Dialog header="Cancelar via SEFAZ / ambiente configurado" visible={visible} modal style={{ width: '52rem' }} onHide={onHide} footer={footer('cancelar-nota-sefaz-form', loading, onHide, 'Transmitir cancelamento')}>
            <form id="cancelar-nota-sefaz-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="UF autorizadora"><InputText value={values.ufAutorizadora} maxLength={2} onChange={(e) => setValues((v) => ({ ...v, ufAutorizadora: e.target.value.toUpperCase() }))} /></Field>
                <Field label="Schema set"><InputText value={values.schemaSetName} onChange={(e) => setValues((v) => ({ ...v, schemaSetName: e.target.value }))} /></Field>
                <Field label="Correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="validarSchemaCancelamento" checked={values.validarSchemaAntesTransmissao} onChange={(e) => setValues((v) => ({ ...v, validarSchemaAntesTransmissao: Boolean(e.checked) }))} /><label htmlFor="validarSchemaCancelamento">Validar schema antes da transmissão</label></div>
                <TextAreaField label="Motivo" value={values.motivo} onChange={(motivo) => setValues((v) => ({ ...v, motivo }))} />
                <TextAreaField label="XML do evento assinado" value={values.xmlEventoAssinado} rows={8} onChange={(xmlEventoAssinado) => setValues((v) => ({ ...v, xmlEventoAssinado }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const CartaCorrecaoDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ ufAutorizadora: 'SP', textoCorrecao: '', xmlEventoAssinado: '', validarSchemaAntesTransmissao: false, schemaSetName: 'NFe-Evento-4.00', correlationId: gerarCorrelationId('cce') });
    useEffect(() => { if (visible) setValues((v) => ({ ...v, correlationId: gerarCorrelationId('cce') })); }, [visible]);
    return (
        <Dialog header="Carta de correção eletrônica" visible={visible} modal style={{ width: '52rem' }} onHide={onHide} footer={footer('carta-correcao-form', loading, onHide, 'Emitir CC-e')}>
            <form id="carta-correcao-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="UF autorizadora"><InputText value={values.ufAutorizadora} maxLength={2} onChange={(e) => setValues((v) => ({ ...v, ufAutorizadora: e.target.value.toUpperCase() }))} /></Field>
                <Field label="Schema set"><InputText value={values.schemaSetName} onChange={(e) => setValues((v) => ({ ...v, schemaSetName: e.target.value }))} /></Field>
                <Field label="Correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="validarSchemaCce" checked={values.validarSchemaAntesTransmissao} onChange={(e) => setValues((v) => ({ ...v, validarSchemaAntesTransmissao: Boolean(e.checked) }))} /><label htmlFor="validarSchemaCce">Validar schema antes da transmissão</label></div>
                <TextAreaField label="Texto da correção" value={values.textoCorrecao} onChange={(textoCorrecao) => setValues((v) => ({ ...v, textoCorrecao }))} hint="Não use CC-e para alterar valores, destinatário, impostos ou operação fiscal sem validação fiscal oficial." />
                <TextAreaField label="XML do evento assinado" value={values.xmlEventoAssinado} rows={8} onChange={(xmlEventoAssinado) => setValues((v) => ({ ...v, xmlEventoAssinado }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const RegistrarRejeicaoDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ codigoRejeicao: '', mensagemRejeicao: '' });
    return (
        <Dialog header="Registrar rejeição manual/técnica" visible={visible} modal style={{ width: '40rem' }} onHide={onHide} footer={footer('registrar-rejeicao-form', loading, onHide, 'Registrar rejeição')}>
            <form id="registrar-rejeicao-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="Código"><InputText value={values.codigoRejeicao} onChange={(e) => setValues((v) => ({ ...v, codigoRejeicao: e.target.value }))} /></Field>
                <TextAreaField label="Mensagem" value={values.mensagemRejeicao} onChange={(mensagemRejeicao) => setValues((v) => ({ ...v, mensagemRejeicao }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const ArmazenarXmlDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ tipo: TipoXmlFiscal.Envio, conteudoXml: '', protocolo: '', chaveAcesso: '' });
    const tipoOptions = [
        { label: 'Envio', value: TipoXmlFiscal.Envio },
        { label: 'Autorizado', value: TipoXmlFiscal.Autorizado },
        { label: 'Cancelamento', value: TipoXmlFiscal.Cancelamento },
        { label: 'Carta de correção', value: TipoXmlFiscal.CartaCorrecao },
        { label: 'Inutilização', value: TipoXmlFiscal.Inutilizacao },
        { label: 'Retorno autorizador', value: TipoXmlFiscal.RetornoAutorizador }
    ];
    return (
        <Dialog header="Armazenar XML fiscal" visible={visible} modal style={{ width: '52rem' }} onHide={onHide} footer={footer('armazenar-xml-form', loading, onHide, 'Armazenar XML')}>
            <form id="armazenar-xml-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="Tipo XML"><Dropdown value={values.tipo} options={tipoOptions} onChange={(e) => setValues((v) => ({ ...v, tipo: e.value }))} /></Field>
                <Field label="Protocolo"><InputText value={values.protocolo} onChange={(e) => setValues((v) => ({ ...v, protocolo: e.target.value }))} /></Field>
                <Field label="Chave de acesso"><InputText value={values.chaveAcesso} onChange={(e) => setValues((v) => ({ ...v, chaveAcesso: e.target.value }))} /></Field>
                <TextAreaField label="Conteúdo XML" value={values.conteudoXml} rows={10} onChange={(conteudoXml) => setValues((v) => ({ ...v, conteudoXml }))} hint="XML fiscal é dado operacional sensível; não é salvo em localStorage/sessionStorage." />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const DanfeDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ correlationId: gerarCorrelationId('danfe'), formatoEsperado: FormatoDocumentoAuxiliarFiscal.Html });
    useEffect(() => { if (visible) setValues((v) => ({ ...v, correlationId: gerarCorrelationId('danfe') })); }, [visible]);
    return (
        <Dialog header="Gerar DANFE técnico" visible={visible} modal style={{ width: '40rem' }} onHide={onHide} footer={footer('danfe-form', loading, onHide, 'Gerar DANFE')}>
            <form id="danfe-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit({ correlationId: values.correlationId }); }}>
                <Field label="Correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <div className="field col-12"><small className="text-color-secondary line-height-3">O backend atual pode retornar DANFE técnico/fallback HTML. Em produção, o provider oficial precisa substituir o fallback.</small></div>
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};


export const ReprocessarSefazDialog = ({ visible, loading, onHide, onSubmit, logIntegracaoFiscalId, correlationIdOriginal, mensagemFalha, payloadResumo }: BaseDialogProps<Record<string, unknown>> & { logIntegracaoFiscalId?: string | null; correlationIdOriginal?: string | null; mensagemFalha?: string | null; payloadResumo?: string | null }) => {
    const [values, setValues] = useState({ ufAutorizadora: 'SP', servico: TipoServicoTransmissaoFiscal.Autorizacao, xmlEnvioAssinado: '', validarSchemaAntesTransmissao: false, schemaSetName: 'NFe-4.00', logIntegracaoFiscalId: logIntegracaoFiscalId ?? '', correlationIdOriginal: correlationIdOriginal ?? '', correlationId: gerarCorrelationId('reprocessamento'), motivo: '' });
    useEffect(() => {
        if (visible) setValues((v) => ({ ...v, logIntegracaoFiscalId: logIntegracaoFiscalId ?? '', correlationIdOriginal: correlationIdOriginal ?? '', correlationId: gerarCorrelationId('reprocessamento') }));
    }, [visible, logIntegracaoFiscalId, correlationIdOriginal]);
    return (
        <Dialog header="Reprocessar transmissão SEFAZ" visible={visible} modal style={{ width: '54rem' }} onHide={onHide} footer={footer('reprocessar-sefaz-form', loading, onHide, 'Reprocessar')}>
            <form id="reprocessar-sefaz-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <div className="field col-12">
                    <Message severity="warn" className="w-full" text="Reprocessamento deve ser usado somente para falha técnica/log elegível. O backend continua responsável por idempotência, auditoria e regra fiscal." />
                </div>
                {mensagemFalha ? <div className="field col-12"><Message severity="info" className="w-full" text={`Falha original: ${mensagemFalha}`} /></div> : null}
                {payloadResumo ? <div className="field col-12"><small className="text-color-secondary block mb-1">Payload original sanitizado</small><div className="surface-100 border-round p-2 text-sm line-height-3">{maskFiscalSensitiveText(payloadResumo)}</div></div> : null}
                {logIntegracaoFiscalId ? <div className="field col-12"><Message severity="info" className="w-full" text="Log de integração selecionado para reprocessamento. O identificador técnico será enviado ao backend sem digitação manual." /></div> : null}
                <Field label="UF autorizadora"><InputText value={values.ufAutorizadora} maxLength={2} onChange={(e) => setValues((v) => ({ ...v, ufAutorizadora: e.target.value.toUpperCase() }))} /></Field>
                <Field label="Serviço"><Dropdown value={values.servico} options={servicoTransmissaoFiscalOptions} onChange={(e) => setValues((v) => ({ ...v, servico: e.value }))} /></Field>
                <Field label="Schema set"><InputText value={values.schemaSetName} onChange={(e) => setValues((v) => ({ ...v, schemaSetName: e.target.value }))} /></Field>
                <Field label="Correlation ID original" hint="Preenchido automaticamente ao selecionar um log reprocessável; edite somente se o backend solicitar reprocessamento por correlation ID."><InputText value={values.correlationIdOriginal} disabled={Boolean(correlationIdOriginal)} onChange={(e) => setValues((v) => ({ ...v, correlationIdOriginal: e.target.value }))} /></Field>
                <Field label="Novo correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="validarSchemaReprocessar" checked={values.validarSchemaAntesTransmissao} onChange={(e) => setValues((v) => ({ ...v, validarSchemaAntesTransmissao: Boolean(e.checked) }))} /><label htmlFor="validarSchemaReprocessar">Validar schema antes da transmissão</label></div>
                <TextAreaField label="Motivo" value={values.motivo} onChange={(motivo) => setValues((v) => ({ ...v, motivo }))} />
                <TextAreaField label="XML assinado opcional" value={values.xmlEnvioAssinado} rows={8} onChange={(xmlEnvioAssinado) => setValues((v) => ({ ...v, xmlEnvioAssinado }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const ConsultarProtocoloDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ ufAutorizadora: 'SP', servico: TipoServicoTransmissaoFiscal.ConsultaProtocolo, xmlConsultaAssinado: '', validarSchemaAntesConsulta: false, schemaSetName: 'NFe-4.00', aplicarReconciliacaoLocal: true, correlationId: gerarCorrelationId('consulta-protocolo') });
    useEffect(() => { if (visible) setValues((v) => ({ ...v, correlationId: gerarCorrelationId('consulta-protocolo') })); }, [visible]);
    return (
        <Dialog header="Consultar protocolo / status da nota" visible={visible} modal style={{ width: '52rem' }} onHide={onHide} footer={footer('consultar-protocolo-form', loading, onHide, 'Consultar')}>
            <form id="consultar-protocolo-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="UF autorizadora"><InputText value={values.ufAutorizadora} maxLength={2} onChange={(e) => setValues((v) => ({ ...v, ufAutorizadora: e.target.value.toUpperCase() }))} /></Field>
                <Field label="Serviço"><Dropdown value={values.servico} options={servicoTransmissaoFiscalOptions.filter((item) => item.value === TipoServicoTransmissaoFiscal.ConsultaProtocolo || item.value === TipoServicoTransmissaoFiscal.ConsultaRetornoAutorizacao)} onChange={(e) => setValues((v) => ({ ...v, servico: e.value }))} /></Field>
                <Field label="Schema set"><InputText value={values.schemaSetName} onChange={(e) => setValues((v) => ({ ...v, schemaSetName: e.target.value }))} /></Field>
                <Field label="Correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="validarSchemaConsulta" checked={values.validarSchemaAntesConsulta} onChange={(e) => setValues((v) => ({ ...v, validarSchemaAntesConsulta: Boolean(e.checked) }))} /><label htmlFor="validarSchemaConsulta">Validar schema antes da consulta</label></div>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="aplicarReconciliacaoLocal" checked={values.aplicarReconciliacaoLocal} onChange={(e) => setValues((v) => ({ ...v, aplicarReconciliacaoLocal: Boolean(e.checked) }))} /><label htmlFor="aplicarReconciliacaoLocal">Aplicar reconciliação local se backend permitir</label></div>
                <TextAreaField label="XML consulta assinado" value={values.xmlConsultaAssinado} rows={8} onChange={(xmlConsultaAssinado) => setValues((v) => ({ ...v, xmlConsultaAssinado }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const HabilitarContingenciaDialog = ({ visible, loading, onHide, onSubmit }: BaseDialogProps<Record<string, unknown>>) => {
    const [values, setValues] = useState({ ufAutorizadora: 'SP', tipoContingencia: TipoContingenciaFiscal.OperacionalInterna, motivo: '', exigirStatusServicoIndisponivelRecente: true, janelaStatusServicoMinutos: 30, correlationId: gerarCorrelationId('contingencia') });
    const contingenciaOptions = [
        { label: 'SVC', value: TipoContingenciaFiscal.Svc },
        { label: 'EPEC', value: TipoContingenciaFiscal.Epec },
        { label: 'Offline NFC-e', value: TipoContingenciaFiscal.OfflineNfce },
        { label: 'Operacional interna', value: TipoContingenciaFiscal.OperacionalInterna }
    ];
    useEffect(() => { if (visible) setValues((v) => ({ ...v, correlationId: gerarCorrelationId('contingencia') })); }, [visible]);
    return (
        <Dialog header="Habilitar contingência operacional" visible={visible} modal style={{ width: '46rem' }} onHide={onHide} footer={footer('habilitar-contingencia-form', loading, onHide, 'Habilitar contingência')}>
            <form id="habilitar-contingencia-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="UF autorizadora"><InputText value={values.ufAutorizadora} maxLength={2} onChange={(e) => setValues((v) => ({ ...v, ufAutorizadora: e.target.value.toUpperCase() }))} /></Field>
                <Field label="Tipo contingência"><Dropdown value={values.tipoContingencia} options={contingenciaOptions} onChange={(e) => setValues((v) => ({ ...v, tipoContingencia: e.value }))} /></Field>
                <Field label="Janela status serviço"><InputNumber value={values.janelaStatusServicoMinutos} min={1} suffix=" min" onValueChange={(e) => setValues((v) => ({ ...v, janelaStatusServicoMinutos: Number(e.value ?? 30) }))} /></Field>
                <Field label="Correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <div className="field col-12 flex align-items-center gap-2"><Checkbox inputId="exigirStatusServicoIndisponivelRecente" checked={values.exigirStatusServicoIndisponivelRecente} onChange={(e) => setValues((v) => ({ ...v, exigirStatusServicoIndisponivelRecente: Boolean(e.checked) }))} /><label htmlFor="exigirStatusServicoIndisponivelRecente">Exigir status de serviço indisponível recente</label></div>
                <TextAreaField label="Motivo" value={values.motivo} onChange={(motivo) => setValues((v) => ({ ...v, motivo }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const BaixarEstoqueDialog = ({ visible, loading, onHide, onSubmit, documento }: BaseDialogProps<Record<string, unknown>> & { documento?: string }) => {
    const [values, setValues] = useState({ motivo: 'Baixa de estoque da nota fiscal autorizada.', documento: documento ?? '', correlationId: gerarCorrelationId('baixa-estoque') });
    useEffect(() => { if (visible) setValues((v) => ({ ...v, documento: documento ?? v.documento, correlationId: gerarCorrelationId('baixa-estoque') })); }, [visible, documento]);
    return (
        <Dialog header="Baixar estoque da nota" visible={visible} modal style={{ width: '42rem' }} onHide={onHide} footer={footer('baixar-estoque-form', loading, onHide, 'Baixar estoque')}>
            <form id="baixar-estoque-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="Documento"><InputText value={values.documento} onChange={(e) => setValues((v) => ({ ...v, documento: e.target.value }))} /></Field>
                <Field label="Correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <TextAreaField label="Motivo" value={values.motivo} onChange={(motivo) => setValues((v) => ({ ...v, motivo }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};

export const GerarContaReceberDialog = ({ visible, loading, onHide, onSubmit, documento, empresaId }: BaseDialogProps<Record<string, unknown>> & { documento?: string; empresaId?: string | null; filialId?: string | null }) => {
    const defaultDate = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const [values, setValues] = useState({ condicaoPagamentoId: '', primeiraDataVencimento: defaultDate(), documento: documento ?? '', observacao: 'Conta a receber gerada a partir da nota fiscal.', correlationId: gerarCorrelationId('financeiro') });
    const condicoesQuery = useCondicoesPagamentoOptions(empresaId ?? null);
    useEffect(() => { if (visible) setValues((v) => ({ ...v, primeiraDataVencimento: defaultDate(), documento: documento ?? v.documento, correlationId: gerarCorrelationId('financeiro') })); }, [visible, documento]);
    return (
        <Dialog header="Gerar conta a receber" visible={visible} modal style={{ width: '42rem' }} onHide={onHide} footer={footer('gerar-conta-receber-form', loading, onHide, 'Gerar financeiro')}>
            <form id="gerar-conta-receber-form" className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }}>
                <Field label="Primeiro vencimento"><InputText type="datetime-local" value={values.primeiraDataVencimento.slice(0, 16)} onChange={(e) => setValues((v) => ({ ...v, primeiraDataVencimento: e.target.value }))} /></Field>
                <Field label="Documento"><InputText value={values.documento} onChange={(e) => setValues((v) => ({ ...v, documento: e.target.value }))} /></Field>
                <Field label="Condição de pagamento" hint="Opcional. Selecione uma condição carregada da API; não digite IDs manualmente."><EntitySelect entityName="condição de pagamento" value={values.condicaoPagamentoId || null} options={condicoesQuery.options} disabled={!empresaId || loading || condicoesQuery.isLoading} loading={condicoesQuery.isFetching} onChange={(condicaoPagamentoId) => setValues((v) => ({ ...v, condicaoPagamentoId: condicaoPagamentoId ?? '' }))} /></Field>
                <Field label="Correlation ID"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                <TextAreaField label="Observação" value={values.observacao} onChange={(observacao) => setValues((v) => ({ ...v, observacao }))} />
                <button type="submit" className="hidden" />
            </form>
        </Dialog>
    );
};
