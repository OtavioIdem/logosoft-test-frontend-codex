'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { mapApiError } from '@/lib/http/apiError';
import { formatMoney } from '@/lib/formatters/money';
import { StatusPedidoVenda, TipoDocumentoFiscal as TipoDocumentoFiscalNota } from '@/types/erp';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { FiscalErroCadastroAcao } from '@/features/fiscal/components/FiscalErroCadastroAcao';
import { NaturezaOperacaoField } from '@/features/fiscal/components/NaturezaOperacaoField';
import { NotaFiscalSerieField } from '@/features/fiscal/components/NotaFiscalSerieField';
import { NATUREZA_OPERACAO_FIELD } from '@/features/fiscal/components/fiscalLabels';
import { gerarCorrelationId } from '@/features/fiscal/components/fiscalUiUtils';
import { naturezaOperacaoIndisponivelMotivo, useNaturezasOperacaoOpcoes } from '@/features/fiscal/hooks/useNaturezasOperacao';
import { respostaHttpRecebida } from '@/features/faturamento/api/faturamentoApi';
import { useFaturamentos } from '@/features/faturamento/hooks/useFaturamentoResources';
import { confirmarFaturamentoFormSchema, prepararFaturamentoSchema, retomarReversaoLegSchema } from '@/features/faturamento/schemas/faturamentoSchemas';
import {
    AcaoRetomadaReversaoLeg,
    ConfirmarFaturamentoFormValues,
    ConfirmarFaturamentoRequestValues,
    LegIntegracaoFaturamento,
    PrepararFaturamentoFormValues,
    RetomarReversaoFormValues,
    StatusFaturamento,
    TipoDocumentoFiscal
} from '@/features/faturamento/types/faturamento.types';
import { acaoRetomadaOptions, FATURAMENTO_CONFIRMAR, FATURAMENTO_PREPARAR, legFaturamentoLabel, pedidoVendaRotulo, statusFaturamentoLabel, tipoDocumentoOptions } from '@/features/faturamento/components/faturamentoLabels';

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

// D95: o Preparar lista só pedidos Aprovado (o backend só prepara Aprovado, `PedidoVenda.cs:190-194`) e, ao
// escolher o pedido, consulta `GET /api/faturamento?pedidoVendaId=` (`FaturamentoContracts.cs:146`,
// `FaturamentoRepository.cs:37`) para oferecer o faturamento existente antes de criar outro. O Preparar só
// reaproveita o que não está em Erro nem Cancelado (`FaturamentoRepository.cs:21-25`).
export const PrepararFaturamentoDialog = ({
    visible,
    loading,
    empresaId,
    filialId,
    onHide,
    onSubmit,
    onAbrirFaturamento
}: {
    visible: boolean;
    loading?: boolean;
    empresaId: string | null;
    filialId: string | null;
    onHide: () => void;
    onSubmit: (values: PrepararFaturamentoFormValues) => Promise<void>;
    onAbrirFaturamento: (faturamentoId: string) => void;
}) => {
    const [pedidoVendaId, setPedidoVendaId] = useState<string | null>(null);
    const [observacao, setObservacao] = useState('');
    const [erros, setErros] = useState<Record<string, string>>({});
    const [pedidoBusca, setPedidoBusca] = useState('');
    const pedidoTermo = useDebouncedValue(pedidoBusca.trim());
    useEffect(() => { if (visible) { setPedidoVendaId(null); setObservacao(''); setErros({}); setPedidoBusca(''); } }, [visible]);

    const pedidosQuery = usePedidosVenda({ empresaId, filialId, status: StatusPedidoVenda.Aprovado, termo: pedidoTermo || null });
    const pedidoOptions = useMemo(() => (pedidosQuery.data ?? []).map((pedido) => ({ label: pedidoVendaRotulo(pedido, formatMoney), value: pedido.id })), [pedidosQuery.data]);

    const existentesQuery = useFaturamentos({ empresaId, pedidoVendaId, page: 1, pageSize: 100 }, visible && Boolean(pedidoVendaId));
    const existentes = pedidoVendaId ? existentesQuery.data?.items ?? [] : [];
    // A listagem vem em ordem de criação decrescente (`FaturamentoRepository.cs:40`): o primeiro é o mais recente.
    const emAndamento = existentes.find((item) => ![StatusFaturamento.Erro, StatusFaturamento.Cancelado].includes(Number(item.etapa))) ?? null;
    const emErro = existentes.filter((item) => Number(item.etapa) === StatusFaturamento.Erro);

    const confirmar = async () => {
        const parsed = prepararFaturamentoSchema.safeParse({ pedidoVendaId, observacao });
        if (!parsed.success) {
            const mapa = buildErrors(parsed.error);
            if (!pedidoVendaId) mapa.pedidoVendaId = 'Selecione um pedido aprovado.';
            setErros(mapa);
            return;
        }
        await onSubmit({ pedidoVendaId: pedidoVendaId as string, observacao });
    };

    return (
        <Dialog header={FATURAMENTO_PREPARAR.titulo} visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer('Preparar', loading, onHide, confirmar)} onHide={onHide}>
            <Message className="w-full mb-3" severity="info" text={FATURAMENTO_PREPARAR.instrucao} />
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="fatPedido" className="font-medium">{FATURAMENTO_PREPARAR.pedidoRotulo}</label>
                    <EntitySelect
                        id="fatPedido"
                        entityName="pedido aprovado"
                        value={pedidoVendaId}
                        options={pedidoOptions}
                        disabled={!empresaId}
                        loading={pedidosQuery.isFetching}
                        emptyMessage={FATURAMENTO_PREPARAR.pedidoVazio}
                        onSearch={setPedidoBusca}
                        onChange={(value) => { setPedidoVendaId(value); setErros((atual) => ({ ...atual, pedidoVendaId: '' })); }}
                    />
                    {!empresaId ? <small className="text-color-secondary block mt-1">{FATURAMENTO_PREPARAR.semEmpresa}</small> : null}
                    <FieldError message={erros.pedidoVendaId} />
                </div>
                {pedidoVendaId ? (
                    <div className="field col-12">
                        {existentesQuery.isFetching && !existentesQuery.data ? <small className="text-color-secondary block">{FATURAMENTO_PREPARAR.consultandoExistentes}</small> : null}
                        {existentesQuery.error ? <ApiErrorPanel error={mapApiError(existentesQuery.error)} /> : null}
                        {emAndamento ? (
                            <div className="flex flex-column gap-2">
                                <Message className="w-full" severity="info" text={FATURAMENTO_PREPARAR.existenteAtivo(statusFaturamentoLabel(Number(emAndamento.etapa)))} />
                                <div><Button type="button" label={FATURAMENTO_PREPARAR.abrirAtivo} icon="pi pi-external-link" size="small" outlined onClick={() => onAbrirFaturamento(emAndamento.id)} /></div>
                            </div>
                        ) : emErro.length > 0 ? (
                            <div className="flex flex-column gap-2">
                                <Message className="w-full" severity="warn" text={FATURAMENTO_PREPARAR.existenteErro(emErro.length)} />
                                <div><Button type="button" label={FATURAMENTO_PREPARAR.abrirExistente} icon="pi pi-external-link" size="small" outlined onClick={() => onAbrirFaturamento(emErro[0].id)} /></div>
                            </div>
                        ) : null}
                    </div>
                ) : null}
                <div className="field col-12">
                    <label htmlFor="fatObs" className="font-medium">{FATURAMENTO_PREPARAR.observacaoRotulo}</label>
                    <InputTextarea id="fatObs" value={observacao} rows={2} maxLength={500} autoResize onChange={(event) => { setObservacao(event.target.value); setErros((atual) => ({ ...atual, observacao: '' })); }} />
                    <FieldError message={erros.observacao} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialConfirmar = (): ConfirmarFaturamentoFormValues => ({
    ufAutorizadora: '',
    tipoDocumento: TipoDocumentoFiscal.NFe,
    serie: '',
    numero: '',
    naturezaOperacaoId: null,
    unidadeComercialPadrao: '',
    validarDadosFiscaisProduto: true,
    condicaoPagamentoId: null,
    primeiraDataVencimentoContaReceber: null
});

// D92: gerador que os diálogos fiscais já usam; o segmento do faturamento ocupa o lugar do da nota. Formato
// `front-faturamento-<8>-<14>-<6>`, 48 caracteres, dentro dos 100 do validator (`FaturamentoValidators.cs:27`).
const novoCorrelationId = (faturamentoId?: string | null) => gerarCorrelationId('faturamento', faturamentoId);

export const ConfirmarFaturamentoDialog = ({
    visible,
    loading,
    faturamentoId,
    empresaId,
    filialId,
    error,
    onHide,
    onSubmit
}: {
    visible: boolean;
    loading?: boolean;
    faturamentoId?: string | null;
    empresaId: string | null;
    filialId?: string | null;
    error?: unknown;
    onHide: () => void;
    onSubmit: (values: ConfirmarFaturamentoRequestValues) => Promise<void>;
}) => {
    const [values, setValues] = useState<ConfirmarFaturamentoFormValues>(initialConfirmar);
    const [errors, setErrors] = useState<Record<string, string>>({});
    // D92: um id por abertura do diálogo.
    const [correlationId, setCorrelationId] = useState(() => novoCorrelationId(faturamentoId));
    useEffect(() => {
        if (visible) {
            setValues(initialConfirmar());
            setErrors({});
            setCorrelationId(novoCorrelationId(faturamentoId));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const condicoes = useCondicoesPagamentoOptions(empresaId);
    const naturezas = useNaturezasOperacaoOpcoes(empresaId);
    // D91/AC-2: sem natureza selecionável, o Confirmar fica indisponível e o motivo aparece.
    const motivoIndisponivel = naturezaOperacaoIndisponivelMotivo({ empresaId, permitido: naturezas.permitido, isLoading: naturezas.isLoading, isError: naturezas.isError, options: naturezas.options });
    const update = (name: keyof ConfirmarFaturamentoFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };

    const confirmar = async () => {
        if (motivoIndisponivel) return;
        const parsed = confirmarFaturamentoFormSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        try {
            await onSubmit({ ...values, correlationId });
            setCorrelationId(novoCorrelationId(faturamentoId));
        } catch (falha) {
            // D92: depois de QUALQUER resposta HTTP (400, 5xx), o id é trocado -- o backend exige id novo para
            // falha finalizada (`FiscalIntegracaoSefazSupport.cs:30-68`). Sem resposta (rede, timeout), o mesmo
            // id é reenviado, para não autorizar duas vezes.
            if (respostaHttpRecebida(falha)) setCorrelationId(novoCorrelationId(faturamentoId));
        }
    };
    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    const dialogFooter = (
        <div className="flex flex-column gap-2">
            {motivoIndisponivel && !naturezas.isLoading ? <Message className="w-full" severity="warn" text={`${FATURAMENTO_CONFIRMAR.indisponivelPrefixo} ${motivoIndisponivel}`} /> : null}
            <div className="flex justify-content-end gap-2">
                <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
                <Button type="button" label="Confirmar" icon="pi pi-check" loading={loading} disabled={Boolean(motivoIndisponivel)} onClick={confirmar} />
            </div>
        </div>
    );

    return (
        <Dialog header={FATURAMENTO_CONFIRMAR.titulo} visible={visible} modal style={{ width: 'min(52rem, 98vw)' }} footer={dialogFooter} onHide={onHide}>
            <Message className="w-full mb-2" severity="warn" text={FATURAMENTO_CONFIRMAR.instrucao} />
            <Message className="w-full mb-3" severity="info" text={FATURAMENTO_CONFIRMAR.preRequisitos} />
            {error ? <ApiErrorPanel error={mapApiError(error)} title={FATURAMENTO_CONFIRMAR.erroTitulo} /> : null}
            {error ? <FiscalErroCadastroAcao erro={mapApiError(error)} mostrarTitulo /> : null}
            <FormGrid>
                <div className="col-12"><span className="block font-semibold text-color-secondary">{FATURAMENTO_CONFIRMAR.grupoDocumento}</span></div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="fatTipoDoc" className="font-medium">Tipo de documento *</label>
                    <Dropdown inputId="fatTipoDoc" value={values.tipoDocumento} options={tipoDocumentoOptions} className={invalid('tipoDocumento')} onChange={(event) => update('tipoDocumento', event.value)} />
                    <FieldError message={errors.tipoDocumento} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="fatSerie" className="font-medium">Série *</label>
                    <NotaFiscalSerieField value={values.serie} onChange={(serie) => update('serie', serie)} empresaId={empresaId} filialId={filialId ?? null} tipoDocumento={Number(values.tipoDocumento) as TipoDocumentoFiscalNota} />
                    <FieldError message={errors.serie} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="fatNumero" className="font-medium">Número *</label>
                    <InputText id="fatNumero" value={values.numero} maxLength={40} className={invalid('numero')} onChange={(event) => update('numero', event.target.value)} />
                    <FieldError message={errors.numero} />
                </div>

                <div className="col-12"><span className="block font-semibold text-color-secondary">{FATURAMENTO_CONFIRMAR.grupoNatureza}</span></div>
                <div className="field col-12">
                    <label htmlFor="fatNatureza" className="font-medium">{NATUREZA_OPERACAO_FIELD.rotulo} *</label>
                    <NaturezaOperacaoField id="fatNatureza" value={values.naturezaOperacaoId} empresaId={empresaId} onChange={(naturezaOperacaoId) => update('naturezaOperacaoId', naturezaOperacaoId)} />
                    <small className="text-color-secondary block mt-1 line-height-3">{FATURAMENTO_CONFIRMAR.ajudaCfop}</small>
                    <FieldError message={errors.naturezaOperacaoId} />
                </div>

                <div className="col-12"><span className="block font-semibold text-color-secondary">{FATURAMENTO_CONFIRMAR.grupoTransmissao}</span></div>
                <div className="field col-12 md:col-3">
                    <label htmlFor="fatUf" className="font-medium">UF autorizadora *</label>
                    <InputText id="fatUf" value={values.ufAutorizadora} maxLength={2} className={invalid('ufAutorizadora')} onChange={(event) => update('ufAutorizadora', event.target.value.toUpperCase())} />
                    <FieldError message={errors.ufAutorizadora} />
                </div>
                <div className="field col-12 md:col-9">
                    <label htmlFor="fatCorrelation" className="font-medium">{FATURAMENTO_CONFIRMAR.correlationIdRotulo}</label>
                    <InputText id="fatCorrelation" value={correlationId} readOnly />
                    <small className="text-color-secondary block mt-1 line-height-3">{FATURAMENTO_CONFIRMAR.correlationIdAjuda}</small>
                </div>

                <div className="col-12"><span className="block font-semibold text-color-secondary">{FATURAMENTO_CONFIRMAR.grupoContaReceber}</span></div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="fatCondicao" className="font-medium">Condição de pagamento</label>
                    <EntitySelect id="fatCondicao" entityName="condição" value={values.condicaoPagamentoId ?? null} options={condicoes.options} onChange={(value) => update('condicaoPagamentoId', value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="fatVenc" className="font-medium">1º vencimento (conta a receber) *</label>
                    <DateInput id="fatVenc" value={values.primeiraDataVencimentoContaReceber ?? null} onChange={(value) => update('primeiraDataVencimentoContaReceber', value)} />
                    <FieldError message={errors.primeiraDataVencimentoContaReceber} />
                </div>

                <div className="col-12"><span className="block font-semibold text-color-secondary">{FATURAMENTO_CONFIRMAR.grupoExcecao}</span></div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="fatUnidade" className="font-medium">Unidade comercial padrão *</label>
                    <InputText id="fatUnidade" value={values.unidadeComercialPadrao} maxLength={20} className={invalid('unidadeComercialPadrao')} onChange={(event) => update('unidadeComercialPadrao', event.target.value)} />
                    <small className="text-color-secondary block mt-1 line-height-3">{FATURAMENTO_CONFIRMAR.ajudaUnidade}</small>
                    <FieldError message={errors.unidadeComercialPadrao} />
                </div>
                <div className="field col-12 md:col-6 flex align-items-center gap-2 mt-4">
                    <Checkbox inputId="fatValidar" checked={values.validarDadosFiscaisProduto} onChange={(event) => update('validarDadosFiscaisProduto', Boolean(event.checked))} />
                    <label htmlFor="fatValidar" className="font-medium">Validar dados fiscais</label>
                </div>
            </FormGrid>
        </Dialog>
    );
};

// RetomarReversaoDialog (D28): o leg vem da linha clicada (só leitura); a ação começa vazia; o motivo é
// obrigatório, com contador até 500 caracteres; "Declarar efeito desfeito" ganha um aviso de afirmação humana.
export const RetomarReversaoDialog = ({
    visible,
    loading,
    leg,
    onHide,
    onSubmit
}: {
    visible: boolean;
    loading?: boolean;
    leg: LegIntegracaoFaturamento | number | null;
    onHide: () => void;
    onSubmit: (values: RetomarReversaoFormValues) => Promise<void>;
}) => {
    const [acao, setAcao] = useState<AcaoRetomadaReversaoLeg | number | null>(null);
    const [motivo, setMotivo] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => {
        if (visible) {
            setAcao(null);
            setMotivo('');
            setErrors({});
        }
    }, [visible]);

    const confirmar = async () => {
        const parsed = retomarReversaoLegSchema.safeParse({ leg, acao, motivo });
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(parsed.data);
    };

    return (
        <Dialog header="Retomar reversão" visible={visible} modal style={{ width: 'min(36rem, 96vw)' }} footer={footer('Retomar', loading, onHide, confirmar)} onHide={onHide}>
            <div className="field">
                <span className="block text-color-secondary text-sm">Leg</span>
                <strong>{leg !== null ? legFaturamentoLabel(Number(leg)) : '—'}</strong>
            </div>
            <div className="field">
                <label htmlFor="retomarAcao" className="font-medium">Ação *</label>
                <Dropdown
                    inputId="retomarAcao"
                    value={acao}
                    options={acaoRetomadaOptions}
                    placeholder="Selecione a ação"
                    className={classNames('w-full', { 'p-invalid': errors.acao })}
                    onChange={(event) => { setAcao(event.value); setErrors((current) => ({ ...current, acao: '' })); }}
                />
                <FieldError message={errors.acao} />
            </div>
            {acao === AcaoRetomadaReversaoLeg.DeclararEfeitoDesfeito ? (
                <Message
                    className="w-full mb-3"
                    severity="warn"
                    text="Declarar o efeito desfeito é uma afirmação humana, auditada: o sistema não confirma nada, apenas registra que você verificou, fora do sistema, que o efeito não está mais de pé."
                />
            ) : null}
            <div className="field">
                <label htmlFor="retomarMotivo" className="font-medium">Motivo *</label>
                <InputTextarea
                    id="retomarMotivo"
                    value={motivo}
                    rows={4}
                    maxLength={500}
                    className={classNames('w-full', { 'p-invalid': errors.motivo })}
                    onChange={(event) => { setMotivo(event.target.value); setErrors((current) => ({ ...current, motivo: '' })); }}
                />
                <small className="text-color-secondary block mt-1">{motivo.length}/500</small>
                <FieldError message={errors.motivo} />
            </div>
        </Dialog>
    );
};
