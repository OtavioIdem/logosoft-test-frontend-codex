'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { DateInput } from '@/components/forms/DateInput';
import { SelectOption } from '@/types/erp';
import { useCentrosCusto } from '@/features/administracao/hooks/useAdministracaoResources';
import { usePlanoContas } from '@/features/contabil/hooks/useContabilResources';
import { abrirPeriodoSchema, criarContaContabilSchema, criarRegraSchema } from '@/features/contabil/schemas/contabilSchemas';
import {
    AbrirPeriodoFormValues,
    ContaContabilFormValues,
    LancamentoFormValues,
    NaturezaConta,
    PartidaFormValues,
    RegraContabilizacaoFormValues,
    TipoContaContabil,
    TipoEventoContabilizacao,
    TipoPartida
} from '@/features/contabil/types/contabil.types';
import { naturezaOptions, tipoContaOptions, tipoEventoOptions, tipoPartidaLabel, tipoPartidaOptions } from '@/features/contabil/components/contabilLabels';

const buildErrors = (error: z.ZodError) => {
    const map: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !map[key]) map[key] = issue.message;
    }
    return map;
};

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void, disabled?: boolean) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} disabled={disabled} onClick={onConfirm} />
    </div>
);

const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const initialConta = (): ContaContabilFormValues => ({ empresaId: '', filialId: null, codigo: '', nome: '', tipo: TipoContaContabil.Ativo, natureza: NaturezaConta.Devedora, analitica: true, contaPaiId: null });

export const ContaContabilFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ContaContabilFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ContaContabilFormValues>(initialConta);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialConta());
            setErrors({});
        }
    }, [visible]);

    const contasQuery = usePlanoContas({ empresaId: values.empresaId || null, filialId: values.filialId || null }, Boolean(values.empresaId));
    const contaPaiOptions = useMemo<SelectOption<string>[]>(() => (contasQuery.data ?? []).filter((conta) => !conta.analitica).map((conta) => ({ label: `${conta.codigo} - ${conta.nome}`, value: conta.id })), [contasQuery.data]);

    const update = (name: keyof ContaContabilFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarContaContabilSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Nova conta contábil" visible={visible} modal style={{ width: 'min(52rem, 96vw)' }} footer={footer('Criar conta', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-6 md:col-3">
                    <label htmlFor="contaCodigo" className="font-medium">Código *</label>
                    <InputText id="contaCodigo" value={values.codigo} className={invalid('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                    <FieldError message={errors.codigo} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="contaNome" className="font-medium">Nome *</label>
                    <InputText id="contaNome" value={values.nome} className={invalid('nome')} onChange={(event) => update('nome', event.target.value)} />
                    <FieldError message={errors.nome} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="contaTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="contaTipo" value={values.tipo} options={tipoContaOptions} onChange={(event) => update('tipo', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="contaNatureza" className="font-medium">Natureza *</label>
                    <Dropdown inputId="contaNatureza" value={values.natureza} options={naturezaOptions} onChange={(event) => update('natureza', event.value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="contaPai" className="font-medium">Conta pai (sintética)</label>
                    <EntitySelect id="contaPai" entityName="conta" value={values.contaPaiId ?? null} options={contaPaiOptions} loading={contasQuery.isFetching} onChange={(value) => update('contaPaiId', value)} />
                </div>
                <div className="field col-12 md:col-3 flex align-items-center gap-2 mt-4">
                    <Checkbox inputId="contaAnalitica" checked={values.analitica} onChange={(event) => update('analitica', Boolean(event.checked))} />
                    <label htmlFor="contaAnalitica">Analítica (aceita lançamento)</label>
                </div>
            </FormGrid>
        </Dialog>
    );
};

const nowDate = new Date();

export const AbrirPeriodoDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: AbrirPeriodoFormValues) => Promise<void> }) => {
    const [empresaId, setEmpresaId] = useState('');
    const [filialId, setFilialId] = useState<string | null>(null);
    const [ano, setAno] = useState<number>(nowDate.getFullYear());
    const [mes, setMes] = useState<number>(nowDate.getMonth() + 1);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setEmpresaId('');
            setFilialId(null);
            setAno(nowDate.getFullYear());
            setMes(nowDate.getMonth() + 1);
            setErrors({});
        }
    }, [visible]);

    const submit = async () => {
        const parsed = abrirPeriodoSchema.safeParse({ empresaId, filialId, ano, mes });
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit({ empresaId, filialId, ano, mes });
    };

    return (
        <Dialog header="Abrir período contábil" visible={visible} modal style={{ width: 'min(44rem, 96vw)' }} footer={footer('Abrir período', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={empresaId || null} filialId={filialId} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => { setEmpresaId(value ?? ''); setErrors((c) => ({ ...c, empresaId: '' })); }} onFilialChange={setFilialId} />
                <div className="field col-6 md:col-3">
                    <label htmlFor="perAno" className="font-medium">Ano *</label>
                    <InputNumber inputId="perAno" value={ano} min={2000} max={2100} useGrouping={false} onValueChange={(event) => setAno(event.value ?? nowDate.getFullYear())} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="perMes" className="font-medium">Mês *</label>
                    <InputNumber inputId="perMes" value={mes} min={1} max={12} onValueChange={(event) => setMes(event.value ?? 1)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialRegra = (): RegraContabilizacaoFormValues => ({ empresaId: '', filialId: null, descricao: '', tipoEvento: TipoEventoContabilizacao.BaixaContaReceber, origemFinanceira: '', contaDebitoId: '', contaCreditoId: '' });

export const RegraFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: RegraContabilizacaoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<RegraContabilizacaoFormValues>(initialRegra);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialRegra());
            setErrors({});
        }
    }, [visible]);

    const contasQuery = usePlanoContas({ empresaId: values.empresaId || null, filialId: values.filialId || null }, Boolean(values.empresaId));
    const contaOptions = useMemo<SelectOption<string>[]>(() => (contasQuery.data ?? []).filter((conta) => conta.analitica).map((conta) => ({ label: `${conta.codigo} - ${conta.nome}`, value: conta.id })), [contasQuery.data]);

    const update = (name: keyof RegraContabilizacaoFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarRegraSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Nova regra de contabilização" visible={visible} modal style={{ width: 'min(54rem, 96vw)' }} footer={footer('Criar regra', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6">
                    <label htmlFor="regraDescricao" className="font-medium">Descrição *</label>
                    <InputText id="regraDescricao" value={values.descricao} className={invalid('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                    <FieldError message={errors.descricao} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="regraEvento" className="font-medium">Evento *</label>
                    <Dropdown inputId="regraEvento" value={values.tipoEvento} options={tipoEventoOptions} onChange={(event) => update('tipoEvento', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="regraOrigem" className="font-medium">Origem financeira</label>
                    <InputText id="regraOrigem" value={values.origemFinanceira ?? ''} onChange={(event) => update('origemFinanceira', event.target.value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="regraDebito" className="font-medium">Conta de débito *</label>
                    <EntitySelect id="regraDebito" entityName="conta" value={values.contaDebitoId || null} options={contaOptions} loading={contasQuery.isFetching} onChange={(value) => update('contaDebitoId', value ?? '')} />
                    <FieldError message={errors.contaDebitoId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="regraCredito" className="font-medium">Conta de crédito *</label>
                    <EntitySelect id="regraCredito" entityName="conta" value={values.contaCreditoId || null} options={contaOptions} loading={contasQuery.isFetching} onChange={(value) => update('contaCreditoId', value ?? '')} />
                    <FieldError message={errors.contaCreditoId} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const emptyPartida = (): PartidaFormValues => ({ contaContabilId: '', tipo: TipoPartida.Debito, valor: 0, centroCustoId: null, historico: null });

export const LancamentoFormDialog = ({ visible, loading, empresaId, filialId, onHide, onSubmit }: { visible: boolean; loading?: boolean; empresaId: string; filialId: string | null; onHide: () => void; onSubmit: (values: LancamentoFormValues) => Promise<void> }) => {
    const [data, setData] = useState<Date | null>(null);
    const [historico, setHistorico] = useState('');
    const [partidas, setPartidas] = useState<PartidaFormValues[]>([]);
    const [nova, setNova] = useState<PartidaFormValues>(emptyPartida);
    const [erro, setErro] = useState('');

    const contasQuery = usePlanoContas({ empresaId: empresaId || null, filialId: filialId || null }, visible && Boolean(empresaId));
    const centrosQuery = useCentrosCusto({ empresaId: empresaId || undefined, filialId: filialId || undefined });
    const contaOptions = useMemo<SelectOption<string>[]>(() => (contasQuery.data ?? []).filter((conta) => conta.analitica && conta.ativa).map((conta) => ({ label: `${conta.codigo} - ${conta.nome}`, value: conta.id })), [contasQuery.data]);
    const centroOptions = useMemo<SelectOption<string>[]>(() => (centrosQuery.listQuery.data ?? []).map((centro) => ({ label: String(centro.nome ?? centro.codigo ?? centro.id), value: String(centro.id) })), [centrosQuery.listQuery.data]);
    const contaLabel = useMemo(() => {
        const map = new Map(contaOptions.map((option) => [option.value, option.label]));
        return (id: string) => map.get(id) ?? id;
    }, [contaOptions]);

    useEffect(() => {
        if (visible) {
            setData(null);
            setHistorico('');
            setPartidas([]);
            setNova(emptyPartida());
            setErro('');
        }
    }, [visible]);

    const totalDebito = partidas.filter((p) => Number(p.tipo) === TipoPartida.Debito).reduce((sum, p) => sum + p.valor, 0);
    const totalCredito = partidas.filter((p) => Number(p.tipo) === TipoPartida.Credito).reduce((sum, p) => sum + p.valor, 0);
    const balanceado = partidas.length >= 2 && Math.abs(totalDebito - totalCredito) < 0.005 && totalDebito > 0;

    const adicionarPartida = () => {
        if (!nova.contaContabilId || nova.valor <= 0) {
            setErro('Selecione a conta analítica e informe um valor maior que zero.');
            return;
        }
        setPartidas((current) => [...current, nova]);
        setNova({ ...emptyPartida(), tipo: nova.tipo });
        setErro('');
    };
    const removerPartida = (index: number) => setPartidas((current) => current.filter((_, i) => i !== index));

    const submit = async () => {
        if (!historico.trim()) {
            setErro('Informe o histórico.');
            return;
        }
        if (!balanceado) {
            setErro('A soma dos débitos deve ser igual à soma dos créditos.');
            return;
        }
        await onSubmit({ empresaId, filialId, data, historico, partidas });
    };

    return (
        <Dialog header="Novo lançamento contábil" visible={visible} modal style={{ width: 'min(68rem, 98vw)' }} footer={footer('Salvar lançamento', loading, onHide, submit, !balanceado)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-3">
                    <label htmlFor="lancData" className="font-medium">Data *</label>
                    <DateInput id="lancData" value={data} onChange={setData} />
                </div>
                <div className="field col-12 md:col-9">
                    <label htmlFor="lancHistorico" className="font-medium">Histórico *</label>
                    <InputText id="lancHistorico" value={historico} onChange={(event) => { setHistorico(event.target.value); setErro(''); }} />
                </div>
            </FormGrid>

            <div className="grid formgrid p-fluid align-items-end mt-2">
                <div className="field col-12 md:col-4">
                    <label htmlFor="partConta" className="font-medium">Conta analítica</label>
                    <EntitySelect id="partConta" entityName="conta" value={nova.contaContabilId || null} options={contaOptions} loading={contasQuery.isFetching} onChange={(value) => setNova((c) => ({ ...c, contaContabilId: value ?? '' }))} />
                </div>
                <div className="field col-6 md:col-2">
                    <label htmlFor="partTipo" className="font-medium">Tipo</label>
                    <Dropdown inputId="partTipo" value={nova.tipo} options={tipoPartidaOptions} onChange={(event) => setNova((c) => ({ ...c, tipo: event.value }))} />
                </div>
                <div className="field col-6 md:col-2">
                    <label htmlFor="partValor" className="font-medium">Valor</label>
                    <MoneyInput id="partValor" value={nova.valor} onChange={(value) => setNova((c) => ({ ...c, valor: value ?? 0 }))} />
                </div>
                <div className="field col-12 md:col-2">
                    <label htmlFor="partCentro" className="font-medium">Centro de custo</label>
                    <EntitySelect id="partCentro" entityName="centro de custo" value={nova.centroCustoId ?? null} options={centroOptions} loading={centrosQuery.listQuery.isFetching} onChange={(value) => setNova((c) => ({ ...c, centroCustoId: value }))} />
                </div>
                <div className="field col-12 md:col-2">
                    <Button type="button" label="Adicionar partida" icon="pi pi-plus" severity="secondary" onClick={adicionarPartida} />
                </div>
            </div>
            <FieldError message={erro} />

            <DataTable value={partidas} dataKey="contaContabilId" emptyMessage="Nenhuma partida. Adicione ao menos duas (débito e crédito)." responsiveLayout="scroll" stripedRows size="small" className="mt-2">
                <Column header="Conta" body={(item: PartidaFormValues) => contaLabel(item.contaContabilId)} />
                <Column header="Tipo" body={(item: PartidaFormValues) => tipoPartidaLabel(Number(item.tipo))} />
                <Column header="Débito" body={(item: PartidaFormValues) => (Number(item.tipo) === TipoPartida.Debito ? formatMoney(item.valor) : '—')} />
                <Column header="Crédito" body={(item: PartidaFormValues) => (Number(item.tipo) === TipoPartida.Credito ? formatMoney(item.valor) : '—')} />
                <Column header="" alignHeader="right" body={(_item: PartidaFormValues, options) => <Button type="button" icon="pi pi-trash" text severity="danger" size="small" onClick={() => removerPartida(options.rowIndex)} />} />
            </DataTable>

            <div className="flex justify-content-end gap-4 mt-2 mb-2">
                <span className="text-color-secondary">Débitos: <strong>{formatMoney(totalDebito)}</strong></span>
                <span className="text-color-secondary">Créditos: <strong>{formatMoney(totalCredito)}</strong></span>
            </div>
            <Message className="w-full" severity={balanceado ? 'success' : 'warn'} text={balanceado ? 'Lançamento balanceado (Σdébito = Σcrédito).' : 'Σdébito deve ser igual a Σcrédito para habilitar o salvamento.'} />
        </Dialog>
    );
};
