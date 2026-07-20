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
import { SelectOption } from '@/types/erp';
import { useCargos } from '@/features/administracao/hooks/useAdministracaoResources';
import { useSetoresOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useJornadas } from '@/features/rh/hooks/useRhResources';
import { admitirColaboradorSchema, criarBeneficioSchema, criarJornadaSchema, registrarEventoRhSchema } from '@/features/rh/schemas/rhSchemas';
import {
    AfastamentoFormValues,
    BeneficioFormValues,
    ColaboradorFormValues,
    ConcessaoFormValues,
    EventoRhFormValues,
    FeriasFormValues,
    JornadaFormValues,
    OrigemEventoRh,
    PontoFormValues,
    RegimeTrabalho,
    TipoAfastamento,
    TipoBeneficio,
    TipoEventoRh,
    TipoMarcacaoPonto
} from '@/features/rh/types/rh.types';
import { origemPontoOptions, regimeOptions, tipoAfastamentoOptions, tipoBeneficioOptions, tipoEventoOptions, tipoPontoOptions } from '@/features/rh/components/rhLabels';

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

const initialColaborador = (): ColaboradorFormValues => ({ empresaId: '', filialId: null, matricula: '', nome: '', cpf: '', cargoId: '', setorId: null, jornadaId: null, regime: RegimeTrabalho.Clt, salarioBase: 0, dataAdmissao: null, dataNascimento: null, email: '', telefone: '' });

export const ColaboradorFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ColaboradorFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<ColaboradorFormValues>(initialColaborador);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialColaborador());
            setErrors({});
        }
    }, [visible]);

    const cargosQuery = useCargos({ empresaId: values.empresaId || undefined, filialId: values.filialId || undefined });
    const setoresQuery = useSetoresOptions(values.empresaId || null, values.filialId || null);
    const jornadasQuery = useJornadas({ empresaId: values.empresaId || null, filialId: values.filialId || null }, Boolean(values.empresaId));
    const cargoOptions = useMemo<SelectOption<string>[]>(() => (cargosQuery.listQuery.data ?? []).map((cargo) => ({ label: String(cargo.nome ?? cargo.id), value: String(cargo.id) })), [cargosQuery.listQuery.data]);
    const jornadaOptions = useMemo<SelectOption<string>[]>(() => (jornadasQuery.data ?? []).map((jornada) => ({ label: jornada.nome, value: jornada.id })), [jornadasQuery.data]);

    const update = (name: keyof ColaboradorFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = admitirColaboradorSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Admitir colaborador" visible={visible} modal style={{ width: 'min(60rem, 98vw)' }} footer={footer('Admitir', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-6 md:col-3">
                    <label htmlFor="colMatricula" className="font-medium">Matrícula *</label>
                    <InputText id="colMatricula" value={values.matricula} className={invalid('matricula')} onChange={(event) => update('matricula', event.target.value)} />
                    <FieldError message={errors.matricula} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="colNome" className="font-medium">Nome *</label>
                    <InputText id="colNome" value={values.nome} className={invalid('nome')} onChange={(event) => update('nome', event.target.value)} />
                    <FieldError message={errors.nome} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="colCpf" className="font-medium">CPF *</label>
                    <InputText id="colCpf" value={values.cpf} className={invalid('cpf')} onChange={(event) => update('cpf', event.target.value)} />
                    <FieldError message={errors.cpf} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="colCargo" className="font-medium">Cargo *</label>
                    <EntitySelect id="colCargo" entityName="cargo" value={values.cargoId || null} options={cargoOptions} loading={cargosQuery.listQuery.isFetching} onChange={(value) => update('cargoId', value ?? '')} />
                    <FieldError message={errors.cargoId} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="colSetor" className="font-medium">Setor</label>
                    <EntitySelect id="colSetor" entityName="setor" value={values.setorId ?? null} options={setoresQuery.options} loading={setoresQuery.isFetching} onChange={(value) => update('setorId', value)} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="colJornada" className="font-medium">Jornada</label>
                    <EntitySelect id="colJornada" entityName="jornada" value={values.jornadaId ?? null} options={jornadaOptions} loading={jornadasQuery.isFetching} onChange={(value) => update('jornadaId', value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="colRegime" className="font-medium">Regime *</label>
                    <Dropdown inputId="colRegime" value={values.regime} options={regimeOptions} onChange={(event) => update('regime', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="colSalario" className="font-medium">Salário base *</label>
                    <MoneyInput id="colSalario" value={values.salarioBase} onChange={(value) => update('salarioBase', value ?? 0)} />
                    <FieldError message={errors.salarioBase} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="colAdmissao" className="font-medium">Admissão *</label>
                    <DateInput id="colAdmissao" value={values.dataAdmissao ?? null} onChange={(value) => update('dataAdmissao', value)} />
                    <FieldError message={errors.dataAdmissao} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="colNascimento" className="font-medium">Nascimento</label>
                    <DateInput id="colNascimento" value={values.dataNascimento ?? null} onChange={(value) => update('dataNascimento', value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="colEmail" className="font-medium">E-mail</label>
                    <InputText id="colEmail" value={values.email ?? ''} onChange={(event) => update('email', event.target.value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="colTelefone" className="font-medium">Telefone</label>
                    <InputText id="colTelefone" value={values.telefone ?? ''} onChange={(event) => update('telefone', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialJornada = (): JornadaFormValues => ({ empresaId: '', filialId: null, nome: '', descricao: '', cargaHorariaSemanal: 44, toleranciaMinutos: null });

export const JornadaFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: JornadaFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<JornadaFormValues>(initialJornada);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialJornada());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof JornadaFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarJornadaSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Nova jornada" visible={visible} modal style={{ width: 'min(52rem, 96vw)' }} footer={footer('Salvar', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-6">
                    <label htmlFor="jorNome" className="font-medium">Nome *</label>
                    <InputText id="jorNome" value={values.nome} className={invalid('nome')} onChange={(event) => update('nome', event.target.value)} />
                    <FieldError message={errors.nome} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="jorCarga" className="font-medium">Carga semanal (h) *</label>
                    <InputNumber inputId="jorCarga" value={values.cargaHorariaSemanal} min={1} max={60} onValueChange={(event) => update('cargaHorariaSemanal', event.value ?? 0)} />
                    <FieldError message={errors.cargaHorariaSemanal} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="jorTolerancia" className="font-medium">Tolerância (min)</label>
                    <InputNumber inputId="jorTolerancia" value={values.toleranciaMinutos ?? null} min={0} max={60} onValueChange={(event) => update('toleranciaMinutos', event.value ?? null)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="jorDescricao" className="font-medium">Descrição</label>
                    <InputTextarea id="jorDescricao" value={values.descricao ?? ''} rows={2} autoResize onChange={(event) => update('descricao', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const PontoDialog = ({ visible, loading, colaboradorOptions, colaboradorLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; colaboradorOptions: SelectOption<string>[]; colaboradorLoading?: boolean; onHide: () => void; onSubmit: (values: PontoFormValues) => Promise<void> }) => {
    const [colaboradorId, setColaboradorId] = useState<string | null>(null);
    const [data, setData] = useState<Date | null>(null);
    const [tipo, setTipo] = useState<number>(TipoMarcacaoPonto.Entrada);
    const [origem, setOrigem] = useState<number>(1);
    const [observacao, setObservacao] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setColaboradorId(null);
            setData(null);
            setTipo(TipoMarcacaoPonto.Entrada);
            setOrigem(1);
            setObservacao('');
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!colaboradorId) {
            setErro('Selecione o colaborador.');
            return;
        }
        await onSubmit({ colaboradorId, data, tipo, origem, observacao: observacao.trim() || null });
    };

    return (
        <Dialog header="Registrar ponto" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Registrar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="pontoColaborador" className="font-medium">Colaborador *</label>
                    <EntitySelect id="pontoColaborador" entityName="colaborador" value={colaboradorId} options={colaboradorOptions} loading={colaboradorLoading} onChange={(value) => { setColaboradorId(value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="pontoTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="pontoTipo" value={tipo} options={tipoPontoOptions} onChange={(event) => setTipo(event.value)} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="pontoOrigem" className="font-medium">Origem *</label>
                    <Dropdown inputId="pontoOrigem" value={origem} options={origemPontoOptions} onChange={(event) => setOrigem(event.value)} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="pontoData" className="font-medium">Data/hora</label>
                    <DateInput id="pontoData" value={data} onChange={setData} />
                </div>
                <div className="field col-12">
                    <label htmlFor="pontoObs" className="font-medium">Observação</label>
                    <InputTextarea id="pontoObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const FeriasDialog = ({ visible, loading, colaboradorOptions, colaboradorLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; colaboradorOptions: SelectOption<string>[]; colaboradorLoading?: boolean; onHide: () => void; onSubmit: (values: FeriasFormValues) => Promise<void> }) => {
    const [colaboradorId, setColaboradorId] = useState<string | null>(null);
    const [dataInicio, setDataInicio] = useState<Date | null>(null);
    const [dataFim, setDataFim] = useState<Date | null>(null);
    const [observacao, setObservacao] = useState('');
    const [erros, setErros] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setColaboradorId(null);
            setDataInicio(null);
            setDataFim(null);
            setObservacao('');
            setErros({});
        }
    }, [visible]);

    const confirmar = async () => {
        const next: Record<string, string> = {};
        if (!colaboradorId) next.colaboradorId = 'Selecione o colaborador.';
        if (!dataInicio) next.dataInicio = 'Informe o início.';
        if (!dataFim) next.dataFim = 'Informe o fim.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ colaboradorId: colaboradorId as string, dataInicio, dataFim, observacao: observacao.trim() || null });
    };

    return (
        <Dialog header="Solicitar férias" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Solicitar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="ferColaborador" className="font-medium">Colaborador *</label>
                    <EntitySelect id="ferColaborador" entityName="colaborador" value={colaboradorId} options={colaboradorOptions} loading={colaboradorLoading} onChange={(value) => { setColaboradorId(value); setErros((c) => ({ ...c, colaboradorId: '' })); }} />
                    <FieldError message={erros.colaboradorId} />
                </div>
                <div className="field col-6">
                    <label htmlFor="ferInicio" className="font-medium">Início *</label>
                    <DateInput id="ferInicio" value={dataInicio} onChange={(value) => { setDataInicio(value); setErros((c) => ({ ...c, dataInicio: '' })); }} />
                    <FieldError message={erros.dataInicio} />
                </div>
                <div className="field col-6">
                    <label htmlFor="ferFim" className="font-medium">Fim *</label>
                    <DateInput id="ferFim" value={dataFim} onChange={(value) => { setDataFim(value); setErros((c) => ({ ...c, dataFim: '' })); }} />
                    <FieldError message={erros.dataFim} />
                </div>
                <div className="field col-12">
                    <label htmlFor="ferObs" className="font-medium">Observação</label>
                    <InputTextarea id="ferObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const AfastamentoDialog = ({ visible, loading, colaboradorOptions, colaboradorLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; colaboradorOptions: SelectOption<string>[]; colaboradorLoading?: boolean; onHide: () => void; onSubmit: (values: AfastamentoFormValues) => Promise<void> }) => {
    const [colaboradorId, setColaboradorId] = useState<string | null>(null);
    const [tipo, setTipo] = useState<number>(TipoAfastamento.Doenca);
    const [dataInicio, setDataInicio] = useState<Date | null>(null);
    const [dataFimPrevista, setDataFimPrevista] = useState<Date | null>(null);
    const [motivo, setMotivo] = useState('');
    const [erros, setErros] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setColaboradorId(null);
            setTipo(TipoAfastamento.Doenca);
            setDataInicio(null);
            setDataFimPrevista(null);
            setMotivo('');
            setErros({});
        }
    }, [visible]);

    const confirmar = async () => {
        const next: Record<string, string> = {};
        if (!colaboradorId) next.colaboradorId = 'Selecione o colaborador.';
        if (!dataInicio) next.dataInicio = 'Informe o início.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ colaboradorId: colaboradorId as string, tipo, dataInicio, dataFimPrevista, motivo: motivo.trim() || null });
    };

    return (
        <Dialog header="Registrar afastamento" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Registrar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-8">
                    <label htmlFor="afaColaborador" className="font-medium">Colaborador *</label>
                    <EntitySelect id="afaColaborador" entityName="colaborador" value={colaboradorId} options={colaboradorOptions} loading={colaboradorLoading} onChange={(value) => { setColaboradorId(value); setErros((c) => ({ ...c, colaboradorId: '' })); }} />
                    <FieldError message={erros.colaboradorId} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="afaTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="afaTipo" value={tipo} options={tipoAfastamentoOptions} onChange={(event) => setTipo(event.value)} />
                </div>
                <div className="field col-6">
                    <label htmlFor="afaInicio" className="font-medium">Início *</label>
                    <DateInput id="afaInicio" value={dataInicio} onChange={(value) => { setDataInicio(value); setErros((c) => ({ ...c, dataInicio: '' })); }} />
                    <FieldError message={erros.dataInicio} />
                </div>
                <div className="field col-6">
                    <label htmlFor="afaFimPrev" className="font-medium">Fim previsto</label>
                    <DateInput id="afaFimPrev" value={dataFimPrevista} onChange={setDataFimPrevista} />
                </div>
                <div className="field col-12">
                    <label htmlFor="afaMotivo" className="font-medium">Motivo</label>
                    <InputTextarea id="afaMotivo" value={motivo} rows={2} autoResize onChange={(event) => setMotivo(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialBeneficio = (): BeneficioFormValues => ({ empresaId: '', filialId: null, nome: '', tipo: TipoBeneficio.ValeTransporte, valor: null, descricao: '' });

export const BeneficioFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: BeneficioFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<BeneficioFormValues>(initialBeneficio);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialBeneficio());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof BeneficioFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarBeneficioSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Novo benefício" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Salvar', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-5">
                    <label htmlFor="benNome" className="font-medium">Nome *</label>
                    <InputText id="benNome" value={values.nome} className={invalid('nome')} onChange={(event) => update('nome', event.target.value)} />
                    <FieldError message={errors.nome} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="benTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="benTipo" value={values.tipo} options={tipoBeneficioOptions} onChange={(event) => update('tipo', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="benValor" className="font-medium">Valor padrão</label>
                    <MoneyInput id="benValor" value={values.valor ?? null} onChange={(value) => update('valor', value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="benDescricao" className="font-medium">Descrição</label>
                    <InputTextarea id="benDescricao" value={values.descricao ?? ''} rows={2} autoResize onChange={(event) => update('descricao', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ConcessaoDialog = ({ visible, loading, colaboradorOptions, colaboradorLoading, beneficioOptions, beneficioLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; colaboradorOptions: SelectOption<string>[]; colaboradorLoading?: boolean; beneficioOptions: SelectOption<string>[]; beneficioLoading?: boolean; onHide: () => void; onSubmit: (values: ConcessaoFormValues) => Promise<void> }) => {
    const [colaboradorId, setColaboradorId] = useState<string | null>(null);
    const [beneficioId, setBeneficioId] = useState<string | null>(null);
    const [dataInicio, setDataInicio] = useState<Date | null>(null);
    const [valor, setValor] = useState<number | null>(null);
    const [erros, setErros] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setColaboradorId(null);
            setBeneficioId(null);
            setDataInicio(null);
            setValor(null);
            setErros({});
        }
    }, [visible]);

    const confirmar = async () => {
        const next: Record<string, string> = {};
        if (!colaboradorId) next.colaboradorId = 'Selecione o colaborador.';
        if (!beneficioId) next.beneficioId = 'Selecione o benefício.';
        if (!dataInicio) next.dataInicio = 'Informe o início.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ colaboradorId: colaboradorId as string, beneficioId: beneficioId as string, dataInicio, valor });
    };

    return (
        <Dialog header="Conceder benefício" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Conceder', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="concColaborador" className="font-medium">Colaborador *</label>
                    <EntitySelect id="concColaborador" entityName="colaborador" value={colaboradorId} options={colaboradorOptions} loading={colaboradorLoading} onChange={(value) => { setColaboradorId(value); setErros((c) => ({ ...c, colaboradorId: '' })); }} />
                    <FieldError message={erros.colaboradorId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="concBeneficio" className="font-medium">Benefício *</label>
                    <EntitySelect id="concBeneficio" entityName="benefício" value={beneficioId} options={beneficioOptions} loading={beneficioLoading} onChange={(value) => { setBeneficioId(value); setErros((c) => ({ ...c, beneficioId: '' })); }} />
                    <FieldError message={erros.beneficioId} />
                </div>
                <div className="field col-6">
                    <label htmlFor="concInicio" className="font-medium">Início *</label>
                    <DateInput id="concInicio" value={dataInicio} onChange={(value) => { setDataInicio(value); setErros((c) => ({ ...c, dataInicio: '' })); }} />
                    <FieldError message={erros.dataInicio} />
                </div>
                <div className="field col-6">
                    <label htmlFor="concValor" className="font-medium">Valor</label>
                    <MoneyInput id="concValor" value={valor} onChange={setValor} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const initialEvento = (): EventoRhFormValues => ({ colaboradorId: '', competencia: '', tipo: TipoEventoRh.Provento, codigo: '', descricao: '', valor: 0, referencia: '', origem: OrigemEventoRh.Manual });

export const EventoDialog = ({ visible, loading, colaboradorOptions, colaboradorLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; colaboradorOptions: SelectOption<string>[]; colaboradorLoading?: boolean; onHide: () => void; onSubmit: (values: EventoRhFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<EventoRhFormValues>(initialEvento);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialEvento());
            setErrors({});
        }
    }, [visible]);

    const update = (name: keyof EventoRhFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = registrarEventoRhSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Registrar evento de folha" visible={visible} modal style={{ width: 'min(52rem, 96vw)' }} footer={footer('Registrar', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="evtColaborador" className="font-medium">Colaborador *</label>
                    <EntitySelect id="evtColaborador" entityName="colaborador" value={values.colaboradorId || null} options={colaboradorOptions} loading={colaboradorLoading} onChange={(value) => update('colaboradorId', value ?? '')} />
                    <FieldError message={errors.colaboradorId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="evtCompetencia" className="font-medium">Competência (AAAAMM) *</label>
                    <InputText id="evtCompetencia" value={values.competencia} keyfilter="int" maxLength={6} placeholder="202607" className={invalid('competencia')} onChange={(event) => update('competencia', event.target.value)} />
                    <FieldError message={errors.competencia} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="evtTipo" className="font-medium">Tipo *</label>
                    <Dropdown inputId="evtTipo" value={values.tipo} options={tipoEventoOptions} onChange={(event) => update('tipo', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="evtCodigo" className="font-medium">Código *</label>
                    <InputText id="evtCodigo" value={values.codigo} className={invalid('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                    <FieldError message={errors.codigo} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="evtDescricao" className="font-medium">Descrição *</label>
                    <InputText id="evtDescricao" value={values.descricao} className={invalid('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                    <FieldError message={errors.descricao} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="evtValor" className="font-medium">Valor *</label>
                    <MoneyInput id="evtValor" value={values.valor} onChange={(value) => update('valor', value ?? 0)} />
                    <FieldError message={errors.valor} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="evtReferencia" className="font-medium">Referência</label>
                    <InputText id="evtReferencia" value={values.referencia ?? ''} onChange={(event) => update('referencia', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
