'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { classNames } from 'primereact/utils';
import { z } from 'zod';
import { EmpresaFilialFields } from '@/components/forms/EmpresaFilialFields';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { DateInput } from '@/components/forms/DateInput';
import { useClientes } from '@/features/clientes/hooks/useClientesResources';
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { criarContratoSchema } from '@/features/contratos/schemas/contratosSchemas';
import { ContratoFormValues, GerarFaturamentoFormValues, PeriodicidadeContrato, TipoFaturamentoContrato } from '@/features/contratos/types/contratos.types';
import { isFaturamentoConsumo, periodicidadeOptions, tipoFaturamentoOptions } from '@/features/contratos/components/contratosLabels';

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

const initialContrato = (): ContratoFormValues => ({ empresaId: '', filialId: null, numero: '', clienteId: '', descricao: '', tipoFaturamento: TipoFaturamentoContrato.Recorrente, periodicidade: PeriodicidadeContrato.Mensal, dataInicio: null, dataFim: null, valorFixo: null, diaVencimento: 10, franquia: null, valorExcedente: null, responsavelId: null });

export const ContratoFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ContratoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ContratoFormValues>(initialContrato);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialContrato());
            setErrors({});
        }
    }, [visible]);

    const scope = { empresaId: values.empresaId || null, filialId: values.filialId || null };
    const clientesQuery = useClientes(scope);
    const usuariosQuery = useUsuariosSeguranca({ empresaId: values.empresaId || undefined, filialId: values.filialId || undefined, ativo: true });
    const clienteOptions = useMemo(() => (clientesQuery.data ?? []).map((cliente) => ({ label: cliente.codigo, value: cliente.id })), [clientesQuery.data]);
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);

    const consumo = isFaturamentoConsumo(Number(values.tipoFaturamento));

    const update = (name: keyof ContratoFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarContratoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Novo contrato" visible={visible} modal style={{ width: 'min(60rem, 98vw)' }} footer={footer('Criar contrato', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-6 md:col-3">
                    <label htmlFor="contNumero" className="font-medium">Número *</label>
                    <InputText id="contNumero" value={values.numero} className={invalid('numero')} onChange={(event) => update('numero', event.target.value)} />
                    <FieldError message={errors.numero} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="contCliente" className="font-medium">Cliente *</label>
                    <EntitySelect id="contCliente" entityName="cliente" value={values.clienteId || null} options={clienteOptions} loading={clientesQuery.isFetching} onChange={(value) => update('clienteId', value ?? '')} />
                    <FieldError message={errors.clienteId} />
                </div>
                <div className="field col-12 md:col-5">
                    <label htmlFor="contResponsavel" className="font-medium">Responsável</label>
                    <EntitySelect id="contResponsavel" entityName="responsável" value={values.responsavelId ?? null} options={usuarioOptions} loading={usuariosQuery.isFetching} onChange={(value) => update('responsavelId', value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="contDescricao" className="font-medium">Descrição *</label>
                    <InputText id="contDescricao" value={values.descricao} className={invalid('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                    <FieldError message={errors.descricao} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="contTipo" className="font-medium">Tipo de faturamento *</label>
                    <Dropdown inputId="contTipo" value={values.tipoFaturamento} options={tipoFaturamentoOptions} onChange={(event) => update('tipoFaturamento', event.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="contPeriodicidade" className="font-medium">Periodicidade *</label>
                    <Dropdown inputId="contPeriodicidade" value={values.periodicidade} options={periodicidadeOptions} onChange={(event) => update('periodicidade', event.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="contDiaVenc" className="font-medium">Dia de vencimento *</label>
                    <InputNumber inputId="contDiaVenc" value={values.diaVencimento} min={1} max={28} onValueChange={(event) => update('diaVencimento', event.value ?? 1)} />
                    <FieldError message={errors.diaVencimento} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="contInicio" className="font-medium">Início *</label>
                    <DateInput id="contInicio" value={values.dataInicio ?? null} onChange={(value) => update('dataInicio', value)} />
                    <FieldError message={errors.dataInicio} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="contFim" className="font-medium">Fim</label>
                    <DateInput id="contFim" value={values.dataFim ?? null} onChange={(value) => update('dataFim', value)} />
                </div>
                {consumo ? (
                    <>
                        <div className="field col-6 md:col-3">
                            <label htmlFor="contFranquia" className="font-medium">Franquia</label>
                            <MoneyInput id="contFranquia" value={values.franquia ?? null} onChange={(value) => update('franquia', value)} />
                        </div>
                        <div className="field col-6 md:col-3">
                            <label htmlFor="contExcedente" className="font-medium">Valor excedente</label>
                            <MoneyInput id="contExcedente" value={values.valorExcedente ?? null} onChange={(value) => update('valorExcedente', value)} />
                        </div>
                    </>
                ) : (
                    <div className="field col-6 md:col-3">
                        <label htmlFor="contValorFixo" className="font-medium">Valor fixo</label>
                        <MoneyInput id="contValorFixo" value={values.valorFixo ?? null} onChange={(value) => update('valorFixo', value)} />
                    </div>
                )}
            </FormGrid>
        </Dialog>
    );
};

const now = new Date();

export const GerarFaturamentoDialog = ({ visible, loading, consumo, onHide, onSubmit }: { visible: boolean; loading?: boolean; consumo: boolean; onHide: () => void; onSubmit: (values: GerarFaturamentoFormValues) => Promise<void> }) => {
    const [ano, setAno] = useState<number>(now.getFullYear());
    const [mes, setMes] = useState<number>(now.getMonth() + 1);
    const [consumoRegistrado, setConsumoRegistrado] = useState<number | null>(null);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setAno(now.getFullYear());
            setMes(now.getMonth() + 1);
            setConsumoRegistrado(null);
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (consumo && (consumoRegistrado == null || consumoRegistrado < 0)) {
            setErro('Informe o consumo registrado.');
            return;
        }
        await onSubmit({ ano, mes, consumoRegistrado: consumo ? consumoRegistrado : null });
    };

    return (
        <Dialog header="Gerar faturamento" visible={visible} modal style={{ width: 'min(40rem, 96vw)' }} footer={footer('Gerar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-6 md:col-3">
                    <label htmlFor="fatAno" className="font-medium">Ano *</label>
                    <InputNumber inputId="fatAno" value={ano} min={2000} max={2100} useGrouping={false} onValueChange={(event) => setAno(event.value ?? now.getFullYear())} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="fatMes" className="font-medium">Mês *</label>
                    <InputNumber inputId="fatMes" value={mes} min={1} max={12} onValueChange={(event) => setMes(event.value ?? 1)} />
                </div>
                {consumo ? (
                    <div className="field col-12 md:col-6">
                        <label htmlFor="fatConsumo" className="font-medium">Consumo registrado *</label>
                        <InputNumber inputId="fatConsumo" value={consumoRegistrado ?? null} min={0} onValueChange={(event) => { setConsumoRegistrado(event.value ?? null); setErro(''); }} />
                        <FieldError message={erro} />
                    </div>
                ) : null}
            </FormGrid>
        </Dialog>
    );
};

export const ReajustarDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (percentual: number) => Promise<void> }) => {
    const [percentual, setPercentual] = useState<number | null>(null);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setPercentual(null);
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!percentual || percentual <= 0) {
            setErro('Percentual deve ser maior que zero.');
            return;
        }
        await onSubmit(percentual);
    };

    return (
        <Dialog header="Reajustar contrato" visible={visible} modal style={{ width: 'min(32rem, 96vw)' }} footer={footer('Reajustar', loading, onHide, confirmar)} onHide={onHide}>
            <label htmlFor="reajPercentual" className="block font-medium mb-2">Percentual de reajuste *</label>
            <InputNumber inputId="reajPercentual" className="w-full" value={percentual ?? null} min={0} maxFractionDigits={2} suffix="%" onValueChange={(event) => { setPercentual(event.value ?? null); setErro(''); }} />
            <FieldError message={erro} />
        </Dialog>
    );
};

export const RenovarDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (novaDataFim: Date) => Promise<void> }) => {
    const [novaDataFim, setNovaDataFim] = useState<Date | null>(null);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setNovaDataFim(null);
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!novaDataFim) {
            setErro('Informe a nova data de fim.');
            return;
        }
        await onSubmit(novaDataFim);
    };

    return (
        <Dialog header="Renovar contrato" visible={visible} modal style={{ width: 'min(32rem, 96vw)' }} footer={footer('Renovar', loading, onHide, confirmar)} onHide={onHide}>
            <label htmlFor="renovData" className="block font-medium mb-2">Nova data de fim *</label>
            <DateInput id="renovData" value={novaDataFim} onChange={(value) => { setNovaDataFim(value); setErro(''); }} />
            <FieldError message={erro} />
        </Dialog>
    );
};
