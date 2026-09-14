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
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { DateInput } from '@/components/forms/DateInput';
import { usePedidosVenda } from '@/features/vendas/hooks/useVendasResources';
import { useCondicoesPagamentoOptions } from '@/features/financeiro/hooks/useFinanceiroResources';
import { confirmarFaturamentoSchema, prepararFaturamentoSchema, retomarReversaoLegSchema } from '@/features/faturamento/schemas/faturamentoSchemas';
import { AcaoRetomadaReversaoLeg, ConfirmarFaturamentoFormValues, LegIntegracaoFaturamento, PrepararFaturamentoFormValues, RetomarReversaoFormValues, TipoDocumentoFiscal } from '@/features/faturamento/types/faturamento.types';
import { acaoRetomadaOptions, legFaturamentoLabel, tipoDocumentoOptions } from '@/features/faturamento/components/faturamentoLabels';

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

export const PrepararFaturamentoDialog = ({ visible, loading, empresaId, filialId, onHide, onSubmit }: { visible: boolean; loading?: boolean; empresaId: string | null; filialId: string | null; onHide: () => void; onSubmit: (values: PrepararFaturamentoFormValues) => Promise<void> }) => {
    const [pedidoVendaId, setPedidoVendaId] = useState<string | null>(null);
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState('');
    useEffect(() => { if (visible) { setPedidoVendaId(null); setObservacao(''); setErro(''); } }, [visible]);

    const pedidosQuery = usePedidosVenda({ empresaId, filialId });
    const pedidoOptions = useMemo(() => (pedidosQuery.data ?? []).map((pedido) => ({ label: pedido.numero, value: pedido.id })), [pedidosQuery.data]);

    const confirmar = async () => {
        const parsed = prepararFaturamentoSchema.safeParse({ pedidoVendaId, observacao });
        if (!parsed.success) { setErro(buildErrors(parsed.error).pedidoVendaId ?? 'Selecione um pedido válido.'); return; }
        await onSubmit({ pedidoVendaId: pedidoVendaId as string, observacao });
    };

    return (
        <Dialog header="Preparar faturamento" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer('Preparar', loading, onHide, confirmar)} onHide={onHide}>
            <Message className="w-full mb-3" severity="info" text="Prepara o faturamento a partir de um pedido de venda. Se já existir um faturamento para o pedido, ele é reaproveitado." />
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="fatPedido" className="font-medium">Pedido de venda *</label>
                    <EntitySelect id="fatPedido" entityName="pedido" value={pedidoVendaId} options={pedidoOptions} loading={pedidosQuery.isFetching} onChange={(value) => { setPedidoVendaId(value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12">
                    <label htmlFor="fatObs" className="font-medium">Observação</label>
                    <InputTextarea id="fatObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
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
    cfopPadrao: null,
    unidadeComercialPadrao: '',
    validarDadosFiscaisProduto: true,
    condicaoPagamentoId: null,
    primeiraDataVencimentoContaReceber: null
});

export const ConfirmarFaturamentoDialog = ({ visible, loading, empresaId, onHide, onSubmit }: { visible: boolean; loading?: boolean; empresaId: string | null; onHide: () => void; onSubmit: (values: ConfirmarFaturamentoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ConfirmarFaturamentoFormValues>(initialConfirmar);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues(initialConfirmar()); setErrors({}); } }, [visible]);

    const condicoes = useCondicoesPagamentoOptions(empresaId);
    const update = (name: keyof ConfirmarFaturamentoFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };

    const confirmar = async () => {
        const parsed = confirmarFaturamentoSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Confirmar faturamento (dados fiscais)" visible={visible} modal style={{ width: 'min(52rem, 98vw)' }} footer={footer('Confirmar', loading, onHide, confirmar)} onHide={onHide}>
            <Message className="w-full mb-3" severity="warn" text="Informe os dados fiscais para transmitir. Campos obrigatórios marcados com *." />
            <FormGrid>
                <div className="field col-6 md:col-2">
                    <label htmlFor="fatUf" className="font-medium">UF *</label>
                    <InputText id="fatUf" value={values.ufAutorizadora} maxLength={2} className={invalid('ufAutorizadora')} onChange={(event) => update('ufAutorizadora', event.target.value.toUpperCase())} />
                    <FieldError message={errors.ufAutorizadora} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="fatTipoDoc" className="font-medium">Tipo de documento *</label>
                    <Dropdown inputId="fatTipoDoc" value={values.tipoDocumento} options={tipoDocumentoOptions} onChange={(event) => update('tipoDocumento', event.value)} />
                </div>
                <div className="field col-6 md:col-2">
                    <label htmlFor="fatSerie" className="font-medium">Série *</label>
                    <InputText id="fatSerie" value={values.serie} className={invalid('serie')} onChange={(event) => update('serie', event.target.value)} />
                    <FieldError message={errors.serie} />
                </div>
                <div className="field col-6 md:col-2">
                    <label htmlFor="fatNumero" className="font-medium">Número *</label>
                    <InputText id="fatNumero" value={values.numero} className={invalid('numero')} onChange={(event) => update('numero', event.target.value)} />
                    <FieldError message={errors.numero} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="fatCfop" className="font-medium">CFOP padrão</label>
                    <InputText id="fatCfop" value={values.cfopPadrao ?? ''} onChange={(event) => update('cfopPadrao', event.target.value)} />
                </div>
                <div className="field col-12 md:col-3">
                    <label htmlFor="fatUnidade" className="font-medium">Unidade comercial padrão *</label>
                    <InputText id="fatUnidade" value={values.unidadeComercialPadrao} className={invalid('unidadeComercialPadrao')} onChange={(event) => update('unidadeComercialPadrao', event.target.value)} />
                    <FieldError message={errors.unidadeComercialPadrao} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="fatCondicao" className="font-medium">Condição de pagamento</label>
                    <EntitySelect id="fatCondicao" entityName="condição" value={values.condicaoPagamentoId ?? null} options={condicoes.options} onChange={(value) => update('condicaoPagamentoId', value)} />
                </div>
                <div className="field col-12 md:col-3">
                    <label htmlFor="fatVenc" className="font-medium">1º vencimento (conta a receber) *</label>
                    <DateInput id="fatVenc" value={values.primeiraDataVencimentoContaReceber ?? null} onChange={(value) => update('primeiraDataVencimentoContaReceber', value)} />
                    <FieldError message={errors.primeiraDataVencimentoContaReceber} />
                </div>
                <div className="field col-12 md:col-2 flex align-items-center gap-2 mt-4">
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
