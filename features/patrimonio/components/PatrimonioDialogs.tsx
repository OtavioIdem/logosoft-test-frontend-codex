'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
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
import { useSetoresOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { abrirInventarioSchema, cadastrarBemSchema, processarDepreciacaoSchema } from '@/features/patrimonio/schemas/patrimonioSchemas';
import {
    AbrirInventarioPatrimonioFormValues,
    BaixarBemFormValues,
    BemFormValues,
    CategoriaBem,
    ProcessarDepreciacaoFormValues,
    RegistrarContagemFormValues,
    TransferirBemFormValues
} from '@/features/patrimonio/types/patrimonio.types';
import { categoriaBemOptions } from '@/features/patrimonio/components/patrimonioLabels';

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

const initialBem = (): BemFormValues => ({ empresaId: '', filialId: null, codigo: '', descricao: '', categoria: CategoriaBem.Equipamento, dataAquisicao: null, valorAquisicao: 0, valorResidual: 0, vidaUtilMeses: 60, setorId: null, responsavelId: null });

export const BemFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: BemFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<BemFormValues>(initialBem);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialBem());
            setErrors({});
        }
    }, [visible]);

    const setoresQuery = useSetoresOptions(values.empresaId || null, values.filialId || null);
    const usuariosQuery = useUsuariosSeguranca({ empresaId: values.empresaId || undefined, filialId: values.filialId || undefined, ativo: true });
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);

    const update = (name: keyof BemFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = cadastrarBemSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    const invalid = (field: string) => classNames({ 'p-invalid': errors[field] });

    return (
        <Dialog header="Novo bem patrimonial" visible={visible} modal style={{ width: 'min(58rem, 98vw)' }} footer={footer('Cadastrar bem', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-6 md:col-3">
                    <label htmlFor="bemCodigo" className="font-medium">Código *</label>
                    <InputText id="bemCodigo" value={values.codigo} className={invalid('codigo')} onChange={(event) => update('codigo', event.target.value)} />
                    <FieldError message={errors.codigo} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="bemDescricao" className="font-medium">Descrição *</label>
                    <InputText id="bemDescricao" value={values.descricao} className={invalid('descricao')} onChange={(event) => update('descricao', event.target.value)} />
                    <FieldError message={errors.descricao} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="bemCategoria" className="font-medium">Categoria *</label>
                    <Dropdown inputId="bemCategoria" value={values.categoria} options={categoriaBemOptions} onChange={(event) => update('categoria', event.value)} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="bemData" className="font-medium">Aquisição *</label>
                    <DateInput id="bemData" value={values.dataAquisicao ?? null} onChange={(value) => update('dataAquisicao', value)} />
                    <FieldError message={errors.dataAquisicao} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="bemValor" className="font-medium">Valor de aquisição *</label>
                    <MoneyInput id="bemValor" value={values.valorAquisicao} onChange={(value) => update('valorAquisicao', value ?? 0)} />
                    <FieldError message={errors.valorAquisicao} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="bemResidual" className="font-medium">Valor residual *</label>
                    <MoneyInput id="bemResidual" value={values.valorResidual} onChange={(value) => update('valorResidual', value ?? 0)} />
                    <FieldError message={errors.valorResidual} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="bemVidaUtil" className="font-medium">Vida útil (meses) *</label>
                    <InputNumber inputId="bemVidaUtil" value={values.vidaUtilMeses} min={1} max={1200} onValueChange={(event) => update('vidaUtilMeses', event.value ?? 0)} />
                    <FieldError message={errors.vidaUtilMeses} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="bemSetor" className="font-medium">Setor</label>
                    <EntitySelect id="bemSetor" entityName="setor" value={values.setorId ?? null} options={setoresQuery.options} loading={setoresQuery.isFetching} onChange={(value) => update('setorId', value)} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="bemResponsavel" className="font-medium">Responsável</label>
                    <EntitySelect id="bemResponsavel" entityName="responsável" value={values.responsavelId ?? null} options={usuarioOptions} loading={usuariosQuery.isFetching} onChange={(value) => update('responsavelId', value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const TransferirBemDialog = ({ visible, loading, empresaId, filialId, onHide, onSubmit }: { visible: boolean; loading?: boolean; empresaId?: string | null; filialId?: string | null; onHide: () => void; onSubmit: (values: TransferirBemFormValues) => Promise<void> }) => {
    const [setorNovoId, setSetorNovoId] = useState<string | null>(null);
    const [responsavelNovoId, setResponsavelNovoId] = useState<string | null>(null);
    const [data, setData] = useState<Date | null>(null);
    const [observacao, setObservacao] = useState('');

    const setoresQuery = useSetoresOptions(empresaId ?? null, filialId ?? null);
    const usuariosQuery = useUsuariosSeguranca({ empresaId: empresaId ?? undefined, filialId: filialId ?? undefined, ativo: true });
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);

    useEffect(() => {
        if (visible) {
            setSetorNovoId(null);
            setResponsavelNovoId(null);
            setData(null);
            setObservacao('');
        }
    }, [visible]);

    return (
        <Dialog header="Transferir bem" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Transferir', loading, onHide, () => onSubmit({ setorNovoId, responsavelNovoId, data, observacao: observacao.trim() || null }))} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="transSetor" className="font-medium">Novo setor</label>
                    <EntitySelect id="transSetor" entityName="setor" value={setorNovoId} options={setoresQuery.options} loading={setoresQuery.isFetching} onChange={setSetorNovoId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="transResponsavel" className="font-medium">Novo responsável</label>
                    <EntitySelect id="transResponsavel" entityName="responsável" value={responsavelNovoId} options={usuarioOptions} loading={usuariosQuery.isFetching} onChange={setResponsavelNovoId} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="transData" className="font-medium">Data</label>
                    <DateInput id="transData" value={data} onChange={setData} />
                </div>
                <div className="field col-12">
                    <label htmlFor="transObs" className="font-medium">Observação</label>
                    <InputTextarea id="transObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const BaixarBemDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: BaixarBemFormValues) => Promise<void> }) => {
    const [data, setData] = useState<Date | null>(null);
    const [motivo, setMotivo] = useState('');
    const [justificativa, setJustificativa] = useState('');
    const [valorBaixa, setValorBaixa] = useState<number | null>(null);
    const [erros, setErros] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setData(null);
            setMotivo('');
            setJustificativa('');
            setValorBaixa(null);
            setErros({});
        }
    }, [visible]);

    const confirmar = async () => {
        const next: Record<string, string> = {};
        if (!motivo.trim()) next.motivo = 'Informe o motivo.';
        if (!justificativa.trim()) next.justificativa = 'Informe a justificativa.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ data, motivo, justificativa, valorBaixa });
    };

    return (
        <Dialog header="Baixar bem" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Baixar bem', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-6 md:col-4">
                    <label htmlFor="baixaData" className="font-medium">Data</label>
                    <DateInput id="baixaData" value={data} onChange={setData} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="baixaValor" className="font-medium">Valor da baixa</label>
                    <MoneyInput id="baixaValor" value={valorBaixa} onChange={setValorBaixa} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="baixaMotivo" className="font-medium">Motivo *</label>
                    <InputText id="baixaMotivo" value={motivo} className={classNames({ 'p-invalid': erros.motivo })} onChange={(event) => { setMotivo(event.target.value); setErros((c) => ({ ...c, motivo: '' })); }} />
                    <FieldError message={erros.motivo} />
                </div>
                <div className="field col-12">
                    <label htmlFor="baixaJustificativa" className="font-medium">Justificativa *</label>
                    <InputTextarea id="baixaJustificativa" value={justificativa} rows={3} autoResize className={classNames({ 'p-invalid': erros.justificativa })} onChange={(event) => { setJustificativa(event.target.value); setErros((c) => ({ ...c, justificativa: '' })); }} />
                    <FieldError message={erros.justificativa} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

const nowD = new Date();

export const ProcessarDepreciacaoDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: ProcessarDepreciacaoFormValues) => Promise<void> }) => {
    const [empresaId, setEmpresaId] = useState('');
    const [filialId, setFilialId] = useState<string | null>(null);
    const [ano, setAno] = useState<number>(nowD.getFullYear());
    const [mes, setMes] = useState<number>(nowD.getMonth() + 1);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setEmpresaId('');
            setFilialId(null);
            setAno(nowD.getFullYear());
            setMes(nowD.getMonth() + 1);
            setErrors({});
        }
    }, [visible]);

    const submit = async () => {
        const parsed = processarDepreciacaoSchema.safeParse({ empresaId, filialId, ano, mes });
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit({ empresaId, filialId, ano, mes });
    };

    return (
        <Dialog header="Processar depreciação" visible={visible} modal style={{ width: 'min(44rem, 96vw)' }} footer={footer('Processar', loading, onHide, submit)} onHide={onHide}>
            <p className="text-color-secondary mt-0">Processamento em lote por competência (idempotente). Informe ano e mês.</p>
            <FormGrid>
                <EmpresaFilialFields empresaId={empresaId || null} filialId={filialId} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => { setEmpresaId(value ?? ''); setErrors((c) => ({ ...c, empresaId: '' })); }} onFilialChange={setFilialId} />
                <div className="field col-6 md:col-3">
                    <label htmlFor="depAno" className="font-medium">Ano *</label>
                    <InputNumber inputId="depAno" value={ano} min={2000} max={2100} useGrouping={false} onValueChange={(event) => setAno(event.value ?? nowD.getFullYear())} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="depMes" className="font-medium">Mês *</label>
                    <InputNumber inputId="depMes" value={mes} min={1} max={12} onValueChange={(event) => setMes(event.value ?? 1)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const AbrirInventarioDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: AbrirInventarioPatrimonioFormValues) => Promise<void> }) => {
    const [empresaId, setEmpresaId] = useState('');
    const [filialId, setFilialId] = useState<string | null>(null);
    const [descricao, setDescricao] = useState('');
    const [dataReferencia, setDataReferencia] = useState<Date | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setEmpresaId('');
            setFilialId(null);
            setDescricao('');
            setDataReferencia(null);
            setErrors({});
        }
    }, [visible]);

    const submit = async () => {
        const parsed = abrirInventarioSchema.safeParse({ empresaId, filialId, descricao, dataReferencia });
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit({ empresaId, filialId, descricao, dataReferencia });
    };

    return (
        <Dialog header="Abrir inventário patrimonial" visible={visible} modal style={{ width: 'min(48rem, 96vw)' }} footer={footer('Abrir inventário', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={empresaId || null} filialId={filialId} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => { setEmpresaId(value ?? ''); setErrors((c) => ({ ...c, empresaId: '' })); }} onFilialChange={setFilialId} />
                <div className="field col-12 md:col-8">
                    <label htmlFor="invDescricao" className="font-medium">Descrição *</label>
                    <InputText id="invDescricao" value={descricao} className={classNames({ 'p-invalid': errors.descricao })} onChange={(event) => { setDescricao(event.target.value); setErrors((c) => ({ ...c, descricao: '' })); }} />
                    <FieldError message={errors.descricao} />
                </div>
                <div className="field col-6 md:col-4">
                    <label htmlFor="invData" className="font-medium">Data de referência</label>
                    <DateInput id="invData" value={dataReferencia} onChange={setDataReferencia} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ContagemDialog = ({ visible, loading, itemId, bemDescricao, empresaId, filialId, onHide, onSubmit }: { visible: boolean; loading?: boolean; itemId: string; bemDescricao: string; empresaId?: string | null; filialId?: string | null; onHide: () => void; onSubmit: (values: RegistrarContagemFormValues) => Promise<void> }) => {
    const [localizado, setLocalizado] = useState(true);
    const [setorEncontradoId, setSetorEncontradoId] = useState<string | null>(null);
    const [observacao, setObservacao] = useState('');

    const setoresQuery = useSetoresOptions(empresaId ?? null, filialId ?? null);

    useEffect(() => {
        if (visible) {
            setLocalizado(true);
            setSetorEncontradoId(null);
            setObservacao('');
        }
    }, [visible]);

    return (
        <Dialog header="Registrar contagem" visible={visible} modal style={{ width: 'min(44rem, 96vw)' }} footer={footer('Registrar', loading, onHide, () => onSubmit({ itemId, localizado, setorEncontradoId, observacao: observacao.trim() || null }))} onHide={onHide}>
            <p className="text-color-secondary mt-0">Bem: <strong>{bemDescricao}</strong></p>
            <FormGrid>
                <div className="field col-12 flex align-items-center gap-2">
                    <Checkbox inputId="contLocalizado" checked={localizado} onChange={(event) => setLocalizado(Boolean(event.checked))} />
                    <label htmlFor="contLocalizado">Bem localizado</label>
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="contSetor" className="font-medium">Setor encontrado</label>
                    <EntitySelect id="contSetor" entityName="setor" value={setorEncontradoId} options={setoresQuery.options} loading={setoresQuery.isFetching} onChange={setSetorEncontradoId} />
                </div>
                <div className="field col-12">
                    <label htmlFor="contObs" className="font-medium">Observação</label>
                    <InputTextarea id="contObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
