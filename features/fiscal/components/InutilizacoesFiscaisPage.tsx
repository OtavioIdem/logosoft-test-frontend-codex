'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { PageHeader } from '@/components/common/PageHeader';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { fiscalReferenceContextLabel } from '@/features/fiscal/components/fiscalUiUtils';
import { createFiscalCorrelationId, tipoDocumentoFiscalOptions } from '@/features/fiscal/components/fiscalUiUtils';
import { useFiscalMutations } from '@/features/fiscal/hooks/useFiscalResources';
import { inutilizarNumeracaoSefazSchema } from '@/features/fiscal/schemas/fiscalSchemas';
import { InutilizacaoNumeracaoResponse } from '@/features/fiscal/types/fiscal.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError, TipoDocumentoFiscal } from '@/types/erp';

type InutilizacaoFiscalValues = {
    empresaId: string;
    filialId: string;
    tipoDocumento: TipoDocumentoFiscal;
    serie: string;
    numeroInicial: number;
    numeroFinal: number;
    motivo: string;
    ufAutorizadora: string;
    xmlInutilizacaoAssinado: string;
    validarSchemaAntesTransmissao: boolean;
    schemaSetName: string;
    correlationId: string;
};

const createInitialValues = (): InutilizacaoFiscalValues => ({
    empresaId: '',
    filialId: '',
    tipoDocumento: TipoDocumentoFiscal.NFe,
    serie: '1',
    numeroInicial: 1,
    numeroFinal: 1,
    motivo: '',
    ufAutorizadora: 'SP',
    xmlInutilizacaoAssinado: '',
    validarSchemaAntesTransmissao: false,
    schemaSetName: 'NFe-Inutilizacao-4.00',
    correlationId: createFiscalCorrelationId('inutilizacao')
});

const Field = ({ label, children, className = 'field col-12 md:col-6' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label className="font-medium block mb-2">{label}</label>
        {children}
    </div>
);

const validationErrorFromIssues = (issues: Array<{ path: Array<string | number>; message: string }>): ApiError => ({
    code: 'Fiscal.Inutilizacao.ValidacaoFrontend',
    message: 'Verifique os campos obrigatórios da inutilização fiscal antes de transmitir.',
    validationErrors: issues.map((issue) => ({
        field: issue.path.join('.') || 'formulario',
        message: issue.message
    }))
});

export const InutilizacoesFiscaisPage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const mutations = useFiscalMutations();
    const [resultado, setResultado] = useState<InutilizacaoNumeracaoResponse | null>(null);
    const [formError, setFormError] = useState<ApiError | null>(null);
    const [values, setValues] = useState<InutilizacaoFiscalValues>(() => createInitialValues());

    if (!hasPermission('FISCAL_INUTILIZAR')) return <UnauthorizedState description="Inutilização fiscal exige FISCAL_INUTILIZAR." />;

    const clearOperationalState = () => {
        setResultado(null);
        setFormError(null);
    };

    const changeEmpresa = (empresaId: string | null) => {
        clearOperationalState();
        setValues((current) => ({ ...current, empresaId: empresaId ?? '', filialId: '' }));
    };

    const changeFilial = (filialId: string | null) => {
        clearOperationalState();
        setValues((current) => ({ ...current, filialId: filialId ?? '' }));
    };

    const regenerateCorrelationId = () => {
        setValues((current) => ({ ...current, correlationId: createFiscalCorrelationId('inutilizacao') }));
    };

    const submit = async () => {
        clearOperationalState();
        const parsed = inutilizarNumeracaoSefazSchema.safeParse(values);
        if (!parsed.success) {
            const mapped = validationErrorFromIssues(parsed.error.issues);
            setFormError(mapped);
            toast.warn('Inutilização fiscal', mapped.message);
            return;
        }

        try {
            const response = await mutations.inutilizarMutation.mutateAsync(parsed.data);
            setResultado(response);
            setValues((current) => ({ ...current, correlationId: createFiscalCorrelationId('inutilizacao') }));
            toast.success('Inutilização fiscal', 'Retorno de inutilização recebido.');
        } catch (error) {
            const mapped = mapApiError(error);
            setFormError(mapped);
            toast.error('Erro na inutilização', mapped.message);
        }
    };

    return (
        <>
            <PageHeader title="Inutilização fiscal" description="Registre inutilização de faixa de numeração NF-e/NFC-e com chamada ao ambiente autorizador configurado." />
            <Message severity="warn" className="w-full mb-3" text="Use somente para quebras reais de sequência e após validação fiscal. O frontend não decide regra legal de inutilização; ele envia o contrato ao backend autorizado." />
            <ApiErrorPanel error={formError} title="Não foi possível transmitir a inutilização fiscal." />

            <div className="grid">
                <div className="col-12 lg:col-8">
                    <Card title="Dados da inutilização">
                        <form
                            className="grid formgrid p-fluid"
                            onSubmit={(event) => {
                                event.preventDefault();
                                submit();
                            }}
                        >
                            <Field label="Empresa">
                                <EmpresaSelect value={values.empresaId || null} required onChange={changeEmpresa} />
                            </Field>
                            <Field label="Filial">
                                <FilialSelect empresaId={values.empresaId || null} value={values.filialId || null} onChange={changeFilial} />
                            </Field>
                            <Field label="Tipo documento">
                                <Dropdown value={values.tipoDocumento} options={tipoDocumentoFiscalOptions} onChange={(event) => setValues((current) => ({ ...current, tipoDocumento: event.value }))} />
                            </Field>
                            <Field label="Série">
                                <InputText value={values.serie} maxLength={20} onChange={(event) => setValues((current) => ({ ...current, serie: event.target.value }))} />
                            </Field>
                            <Field label="Número inicial">
                                <InputNumber value={values.numeroInicial} min={1} onValueChange={(event) => setValues((current) => ({ ...current, numeroInicial: Number(event.value ?? 0) }))} />
                            </Field>
                            <Field label="Número final">
                                <InputNumber value={values.numeroFinal} min={1} onValueChange={(event) => setValues((current) => ({ ...current, numeroFinal: Number(event.value ?? 0) }))} />
                            </Field>
                            <Field label="UF autorizadora">
                                <InputText value={values.ufAutorizadora} maxLength={2} onChange={(event) => setValues((current) => ({ ...current, ufAutorizadora: event.target.value.toUpperCase() }))} />
                            </Field>
                            <Field label="Schema set">
                                <InputText value={values.schemaSetName} maxLength={120} onChange={(event) => setValues((current) => ({ ...current, schemaSetName: event.target.value }))} />
                            </Field>
                            <Field label="Correlation ID gerado pelo frontend" className="field col-12">
                                <div className="p-inputgroup">
                                    <InputText value={values.correlationId} readOnly aria-label="Correlation ID gerado pelo frontend" />
                                    <Button type="button" icon="pi pi-refresh" label="Regenerar" outlined onClick={regenerateCorrelationId} />
                                </div>
                            </Field>
                            <div className="field col-12 flex align-items-center gap-2">
                                <Checkbox inputId="validarSchemaInutilizacao" checked={values.validarSchemaAntesTransmissao} onChange={(event) => setValues((current) => ({ ...current, validarSchemaAntesTransmissao: Boolean(event.checked) }))} />
                                <label htmlFor="validarSchemaInutilizacao">Validar schema antes da transmissão</label>
                            </div>
                            <Field label="Motivo" className="field col-12">
                                <InputTextarea rows={4} maxLength={500} value={values.motivo} onChange={(event) => setValues((current) => ({ ...current, motivo: event.target.value }))} />
                            </Field>
                            <Field label="XML de inutilização assinado" className="field col-12">
                                <InputTextarea rows={10} value={values.xmlInutilizacaoAssinado} onChange={(event) => setValues((current) => ({ ...current, xmlInutilizacaoAssinado: event.target.value }))} />
                            </Field>
                            <div className="field col-12 flex justify-content-end">
                                <Button label="Transmitir inutilização" icon="pi pi-send" loading={mutations.inutilizarMutation.isPending} />
                            </div>
                        </form>
                    </Card>
                </div>
                <div className="col-12 lg:col-4">
                    <Card title="Contexto operacional" className="mb-3">
                        <div className="flex flex-column gap-2 line-height-3">
                            <span>Empresa: {fiscalReferenceContextLabel('Empresa', values.empresaId)}</span>
                            <span>Filial: {fiscalReferenceContextLabel('Filial', values.filialId)}</span>
                            <span>Faixa: {values.serie || '-'} / {values.numeroInicial || '-'} até {values.numeroFinal || '-'}</span>
                            <span>UF autorizadora: {values.ufAutorizadora || '-'}</span>
                            <span>XML completo não deve ser exibido em logs ou observabilidade.</span>
                        </div>
                    </Card>
                    <Card title="Resultado">
                        {resultado ? (
                            <div className="flex flex-column gap-2 line-height-3">
                                <strong>{resultado.codigoStatus ?? '-'} • {resultado.retornoMotivo ?? 'Sem motivo'}</strong>
                                <span>Protocolo: {resultado.protocolo ?? '-'}</span>
                                <span>Faixa: {resultado.serie}/{resultado.numeroInicial} até {resultado.numeroFinal}</span>
                                <span>Autorizada pelo ambiente: {resultado.autorizadaPeloAmbiente ? 'Sim' : 'Não'}</span>
                                {resultado.deveReprocessar ? <Message severity="warn" text="O backend indicou necessidade de reprocessamento/consulta posterior." /> : null}
                            </div>
                        ) : (
                            <span className="text-color-secondary">Nenhuma inutilização transmitida nesta sessão.</span>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
};
