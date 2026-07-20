'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
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
import { QuantityInput } from '@/components/forms/QuantityInput';
import { DateInput } from '@/components/forms/DateInput';
import { SelectOption } from '@/types/erp';
import { useLocaisEstoque } from '@/features/estoque/hooks/useEstoqueResources';
import { useProdutos } from '@/features/produtos/hooks/useProdutosResources';
import { useUsuariosSeguranca } from '@/features/seguranca/hooks/useUsuariosSeguranca';
import { criarInspecaoSchema } from '@/features/qualidade/schemas/qualidadeSchemas';
import { AcaoCorretivaFormValues, CriterioFormValues, InspecaoFormValues, OrigemInspecao, ResultadoCriterioFormValues } from '@/features/qualidade/types/qualidade.types';
import { origemInspecaoOptions } from '@/features/qualidade/components/qualidadeLabels';

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

const initialInspecao = (): InspecaoFormValues => ({ empresaId: '', filialId: null, origem: OrigemInspecao.Avulsa, produtoId: '', quantidade: 1, localEstoqueId: null, responsavelId: null, dataInspecao: null, observacao: '' });

export const InspecaoFormDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: InspecaoFormValues) => Promise<void> }) => {
    const [values, setValues] = useState<InspecaoFormValues>(initialInspecao);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (visible) {
            setValues(initialInspecao());
            setErrors({});
        }
    }, [visible]);

    const scope = { empresaId: values.empresaId || null, filialId: values.filialId || null };
    const produtosQuery = useProdutos(scope);
    const locaisQuery = useLocaisEstoque(scope);
    const usuariosQuery = useUsuariosSeguranca({ empresaId: values.empresaId || undefined, filialId: values.filialId || undefined, ativo: true });
    const produtoOptions = useMemo(() => (produtosQuery.data ?? []).map((produto) => ({ label: `${produto.codigo} - ${produto.descricao}`, value: produto.id })), [produtosQuery.data]);
    const localOptions = useMemo(() => (locaisQuery.data ?? []).map((local) => ({ label: `${local.codigo} - ${local.nome}`, value: local.id })), [locaisQuery.data]);
    const usuarioOptions = useMemo(() => (usuariosQuery.data ?? []).map((usuario) => ({ label: usuario.nome, value: usuario.id })), [usuariosQuery.data]);

    const update = (name: keyof InspecaoFormValues, value: unknown) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: '' }));
    };

    const submit = async () => {
        const parsed = criarInspecaoSchema.safeParse(values);
        if (!parsed.success) {
            setErrors(buildErrors(parsed.error));
            return;
        }
        await onSubmit(values);
    };

    return (
        <Dialog header="Nova inspeção" visible={visible} modal style={{ width: 'min(56rem, 98vw)' }} footer={footer('Criar inspeção', loading, onHide, submit)} onHide={onHide}>
            <FormGrid>
                <EmpresaFilialFields empresaId={values.empresaId || null} filialId={values.filialId || null} empresaError={errors.empresaId} filialError={errors.filialId} empresaCol="col-12 md:col-6" filialCol="col-12 md:col-6" onEmpresaChange={(value) => update('empresaId', value)} onFilialChange={(value) => update('filialId', value)} />
                <div className="field col-12 md:col-4">
                    <label htmlFor="inspOrigem" className="font-medium">Origem *</label>
                    <Dropdown inputId="inspOrigem" value={values.origem} options={origemInspecaoOptions} onChange={(event) => update('origem', event.value)} />
                </div>
                <div className="field col-12 md:col-5">
                    <label htmlFor="inspProduto" className="font-medium">Produto *</label>
                    <EntitySelect id="inspProduto" entityName="produto" value={values.produtoId || null} options={produtoOptions} loading={produtosQuery.isFetching} onChange={(value) => update('produtoId', value ?? '')} />
                    <FieldError message={errors.produtoId} />
                </div>
                <div className="field col-6 md:col-3">
                    <label htmlFor="inspQtd" className="font-medium">Quantidade *</label>
                    <QuantityInput id="inspQtd" value={values.quantidade} onChange={(value) => update('quantidade', value ?? 0)} />
                    <FieldError message={errors.quantidade} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="inspLocal" className="font-medium">Local de estoque</label>
                    <EntitySelect id="inspLocal" entityName="local" value={values.localEstoqueId ?? null} options={localOptions} loading={locaisQuery.isFetching} onChange={(value) => update('localEstoqueId', value)} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="inspResponsavel" className="font-medium">Responsável</label>
                    <EntitySelect id="inspResponsavel" entityName="responsável" value={values.responsavelId ?? null} options={usuarioOptions} loading={usuariosQuery.isFetching} onChange={(value) => update('responsavelId', value)} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="inspData" className="font-medium">Data da inspeção</label>
                    <DateInput id="inspData" value={values.dataInspecao ?? null} onChange={(value) => update('dataInspecao', value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="inspObs" className="font-medium">Observação</label>
                    <InputTextarea id="inspObs" value={values.observacao ?? ''} rows={2} autoResize onChange={(event) => update('observacao', event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const CriterioDialog = ({ visible, loading, onHide, onSubmit }: { visible: boolean; loading?: boolean; onHide: () => void; onSubmit: (values: CriterioFormValues) => Promise<void> }) => {
    const [descricao, setDescricao] = useState('');
    const [critico, setCritico] = useState(false);
    const [valorEsperado, setValorEsperado] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setDescricao('');
            setCritico(false);
            setValorEsperado('');
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!descricao.trim()) {
            setErro('Informe a descrição.');
            return;
        }
        await onSubmit({ descricao, critico, valorEsperado: valorEsperado.trim() || null });
    };

    return (
        <Dialog header="Adicionar critério" visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} footer={footer('Adicionar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12 md:col-8">
                    <label htmlFor="critDescricao" className="font-medium">Descrição *</label>
                    <InputText id="critDescricao" value={descricao} className={classNames({ 'p-invalid': erro })} onChange={(event) => { setDescricao(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="critValor" className="font-medium">Valor esperado</label>
                    <InputText id="critValor" value={valorEsperado} onChange={(event) => setValorEsperado(event.target.value)} />
                </div>
                <div className="field col-12 flex align-items-center gap-2">
                    <Checkbox inputId="critCritico" checked={critico} onChange={(event) => setCritico(Boolean(event.checked))} />
                    <label htmlFor="critCritico">Critério crítico (reprovação bloqueia estoque)</label>
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const ResultadoDialog = ({ visible, loading, criterioId, criterioDescricao, onHide, onSubmit }: { visible: boolean; loading?: boolean; criterioId: string; criterioDescricao: string; onHide: () => void; onSubmit: (values: ResultadoCriterioFormValues) => Promise<void> }) => {
    const [conforme, setConforme] = useState(true);
    const [valorMedido, setValorMedido] = useState('');
    const [observacao, setObservacao] = useState('');

    useEffect(() => {
        if (visible) {
            setConforme(true);
            setValorMedido('');
            setObservacao('');
        }
    }, [visible]);

    return (
        <Dialog header="Registrar resultado" visible={visible} modal style={{ width: 'min(42rem, 96vw)' }} footer={footer('Registrar', loading, onHide, () => onSubmit({ criterioId, conforme, valorMedido: valorMedido.trim() || null, observacao: observacao.trim() || null }))} onHide={onHide}>
            <p className="text-color-secondary mt-0">Critério: <strong>{criterioDescricao}</strong></p>
            <FormGrid>
                <div className="field col-12 flex align-items-center gap-2">
                    <Checkbox inputId="resConforme" checked={conforme} onChange={(event) => setConforme(Boolean(event.checked))} />
                    <label htmlFor="resConforme">Conforme</label>
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="resValor" className="font-medium">Valor medido</label>
                    <InputText id="resValor" value={valorMedido} onChange={(event) => setValorMedido(event.target.value)} />
                </div>
                <div className="field col-12">
                    <label htmlFor="resObs" className="font-medium">Observação</label>
                    <InputTextarea id="resObs" value={observacao} rows={2} autoResize onChange={(event) => setObservacao(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const AcaoCorretivaDialog = ({ visible, loading, responsavelOptions, responsavelLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; responsavelOptions: SelectOption<string>[]; responsavelLoading?: boolean; onHide: () => void; onSubmit: (values: AcaoCorretivaFormValues) => Promise<void> }) => {
    const [descricao, setDescricao] = useState('');
    const [responsavelId, setResponsavelId] = useState<string | null>(null);
    const [prazo, setPrazo] = useState<Date | null>(null);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setDescricao('');
            setResponsavelId(null);
            setPrazo(null);
            setErro('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!descricao.trim()) {
            setErro('Informe a descrição.');
            return;
        }
        await onSubmit({ descricao, responsavelId, prazo });
    };

    return (
        <Dialog header="Adicionar ação corretiva" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Adicionar', loading, onHide, confirmar)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="acaoDescricao" className="font-medium">Descrição *</label>
                    <InputTextarea id="acaoDescricao" value={descricao} rows={3} autoResize className={classNames({ 'p-invalid': erro })} onChange={(event) => { setDescricao(event.target.value); setErro(''); }} />
                    <FieldError message={erro} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="acaoResponsavel" className="font-medium">Responsável</label>
                    <EntitySelect id="acaoResponsavel" entityName="responsável" value={responsavelId} options={responsavelOptions} loading={responsavelLoading} onChange={setResponsavelId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="acaoPrazo" className="font-medium">Prazo</label>
                    <DateInput id="acaoPrazo" value={prazo} onChange={setPrazo} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
