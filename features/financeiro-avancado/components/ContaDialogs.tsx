'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
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
import { DateInput } from '@/components/forms/DateInput';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { usePessoas } from '@/features/pessoas/hooks/usePessoasResources';
import { baixarContaSchema, criarContaSchema, estornarBaixaSchema } from '@/features/financeiro-avancado/schemas/financeiroAvancadoSchemas';
import { BaixaFinanceiraResponse, BaixarContaFormValues, CriarContaFormValues, EstornarBaixaFormValues, TipoConta } from '@/features/financeiro-avancado/types/financeiroAvancado.types';
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

const initialConta = (): CriarContaFormValues => ({ empresaId: '', filialId: null, participanteId: '', descricao: '', documento: null, valorOriginal: 0, dataEmissao: new Date(), dataVencimento: new Date() });

export const CriarContaDialog = ({ visible, loading, tipo, onHide, onSubmit }: { visible: boolean; loading?: boolean; tipo: TipoConta; onHide: () => void; onSubmit: (values: CriarContaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<CriarContaFormValues>(initialConta);
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValues(initialConta()); setErrors({}); } }, [visible]);

    const pessoasQuery = usePessoas({ empresaId: values.empresaId || undefined, filialId: values.filialId || undefined });
    const participanteOptions = useMemo(() => (pessoasQuery.data ?? []).map((pessoa) => ({ label: pessoa.nomeFantasia ? `${pessoa.nomeRazaoSocial} • ${pessoa.nomeFantasia}` : pessoa.nomeRazaoSocial, value: pessoa.id })), [pessoasQuery.data]);

    const update = (name: keyof CriarContaFormValues, value: unknown) => { setValues((c) => ({ ...c, [name]: value })); setErrors((c) => ({ ...c, [name]: '' })); };
    const confirmar = async () => {
        const parsed = criarContaSchema.safeParse(values);
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit(values);
    };
    return (
        <Dialog header={tipo === 'receber' ? 'Nova conta a receber' : 'Nova conta a pagar'} visible={visible} modal style={{ width: 'min(52rem, 98vw)' }} footer={footer('Criar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6"><label htmlFor="ctParticipante" className="font-medium">Participante *</label><EntitySelect id="ctParticipante" entityName="participante" value={values.participanteId || null} options={participanteOptions} loading={pessoasQuery.isFetching} onChange={(value) => update('participanteId', value ?? '')} /><FieldError message={errors.participanteId} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="ctValor" className="font-medium">Valor *</label><MoneyInput id="ctValor" value={values.valorOriginal} onChange={(value) => update('valorOriginal', value ?? 0)} /><FieldError message={errors.valorOriginal} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="ctDoc" className="font-medium">Documento</label><InputText id="ctDoc" value={values.documento ?? ''} onChange={(event) => update('documento', event.target.value)} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="ctEmissao" className="font-medium">Emissão *</label><DateInput id="ctEmissao" value={values.dataEmissao ?? null} onChange={(value) => update('dataEmissao', value)} /><FieldError message={errors.dataEmissao} /></div>
                <div className="field col-12 md:col-3"><label htmlFor="ctVenc" className="font-medium">Vencimento *</label><DateInput id="ctVenc" value={values.dataVencimento ?? null} onChange={(value) => update('dataVencimento', value)} /><FieldError message={errors.dataVencimento} /></div>
                <div className="field col-12"><label htmlFor="ctDesc" className="font-medium">Descrição *</label><InputText id="ctDesc" value={values.descricao} className={classNames({ 'p-invalid': errors.descricao })} onChange={(event) => update('descricao', event.target.value)} /><FieldError message={errors.descricao} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const BaixarContaDialog = ({ visible, loading, saldo, onHide, onSubmit }: { visible: boolean; loading?: boolean; saldo: number; onHide: () => void; onSubmit: (values: BaixarContaFormValues) => Promise<void> }) => {
    const [valor, setValor] = useState<number | null>(saldo);
    const [dataBaixa, setDataBaixa] = useState<Date | null>(new Date());
    const [observacao, setObservacao] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setValor(saldo); setDataBaixa(new Date()); setObservacao(''); setErrors({}); } }, [visible, saldo]);
    const confirmar = async () => {
        const parsed = baixarContaSchema.safeParse({ valor, dataBaixa, observacao });
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit({ valor: valor ?? 0, dataBaixa, observacao });
    };
    return (
        <Dialog header="Baixar conta" visible={visible} modal style={{ width: 'min(38rem, 96vw)' }} footer={footer('Baixar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12"><small className="text-color-secondary">Saldo em aberto: {formatMoney(saldo)}</small></div>
                <div className="field col-12 md:col-6"><label htmlFor="bxValor" className="font-medium">Valor da baixa *</label><MoneyInput id="bxValor" value={valor} onChange={(value) => { setValor(value); setErrors((c) => ({ ...c, valor: '' })); }} /><FieldError message={errors.valor} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="bxData" className="font-medium">Data da baixa *</label><DateInput id="bxData" value={dataBaixa} onChange={setDataBaixa} /><FieldError message={errors.dataBaixa} /></div>
                <div className="field col-12"><label htmlFor="bxObs" className="font-medium">Observação</label><InputTextarea id="bxObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} /></div>
            </FormGrid>
        </Dialog>
    );
};

export const EstornarBaixaDialog = ({ visible, loading, baixas, onHide, onSubmit }: { visible: boolean; loading?: boolean; baixas: BaixaFinanceiraResponse[]; onHide: () => void; onSubmit: (values: EstornarBaixaFormValues) => Promise<void> }) => {
    const [baixaId, setBaixaId] = useState<string | null>(null);
    const [dataEstorno, setDataEstorno] = useState<Date | null>(new Date());
    const [motivo, setMotivo] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    useEffect(() => { if (visible) { setBaixaId(null); setDataEstorno(new Date()); setMotivo(''); setErrors({}); } }, [visible]);
    const options = useMemo(() => baixas.filter((baixa) => !baixa.estornada).map((baixa) => ({ label: `${formatMoney(baixa.valor)} — ${new Date(baixa.dataBaixa).toLocaleDateString('pt-BR')}`, value: baixa.id })), [baixas]);
    const confirmar = async () => {
        const parsed = estornarBaixaSchema.safeParse({ baixaId, dataEstorno, motivo });
        if (!parsed.success) { setErrors(buildErrors(parsed.error)); return; }
        await onSubmit({ baixaId: baixaId as string, dataEstorno, motivo });
    };
    return (
        <Dialog header="Estornar baixa" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer('Estornar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12"><label htmlFor="esBaixa" className="font-medium">Baixa a estornar *</label><Dropdown inputId="esBaixa" value={baixaId} options={options} onChange={(event) => { setBaixaId(event.value); setErrors((c) => ({ ...c, baixaId: '' })); }} placeholder="Selecione a baixa" emptyMessage="Nenhuma baixa estornável" /><FieldError message={errors.baixaId} /></div>
                <div className="field col-12 md:col-6"><label htmlFor="esData" className="font-medium">Data do estorno *</label><DateInput id="esData" value={dataEstorno} onChange={setDataEstorno} /><FieldError message={errors.dataEstorno} /></div>
                <div className="field col-12"><label htmlFor="esMotivo" className="font-medium">Motivo *</label><InputText id="esMotivo" value={motivo} className={classNames({ 'p-invalid': errors.motivo })} onChange={(event) => { setMotivo(event.target.value); setErrors((c) => ({ ...c, motivo: '' })); }} /><FieldError message={errors.motivo} /></div>
            </FormGrid>
        </Dialog>
    );
};
