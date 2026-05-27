'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputText } from 'primereact/inputtext';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { FilialSelect } from '@/components/forms/FilialSelect';
import { Message } from 'primereact/message';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { gerarCorrelationId, tipoDocumentoFiscalOptions } from '@/features/fiscal/components/fiscalUiUtils';
import { formatFiscalApiError } from '@/features/fiscal/api/fiscalApi';
import { useFiscalMutations } from '@/features/fiscal/hooks/useFiscalResources';
import { InutilizacaoNumeracaoResponse } from '@/features/fiscal/types/fiscal.types';
import { useAppToast } from '@/hooks/useAppToast';
import { TipoDocumentoFiscal } from '@/types/erp';

const Field = ({ label, children, className = 'field col-12 md:col-6' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label className="font-medium block mb-2">{label}</label>
        {children}
    </div>
);

export const InutilizacoesFiscaisPage = () => {
    const toast = useAppToast();
    const { hasPermission } = usePermissions();
    const mutations = useFiscalMutations();
    const [resultado, setResultado] = useState<InutilizacaoNumeracaoResponse | null>(null);
    const [values, setValues] = useState({
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
        correlationId: gerarCorrelationId('inutilizacao')
    });

    if (!hasPermission('FISCAL_INUTILIZAR')) return <UnauthorizedState description="Inutilização fiscal exige FISCAL_INUTILIZAR." />;

    const submit = async () => {
        try {
            const response = await mutations.inutilizarMutation.mutateAsync(values);
            setResultado(response);
            setValues((current) => ({ ...current, correlationId: gerarCorrelationId('inutilizacao') }));
            toast.success('Inutilização fiscal', 'Retorno de inutilização recebido.');
        } catch (error) {
            toast.error('Erro na inutilização', formatFiscalApiError(error, 'Não foi possível inutilizar a numeração.'));
        }
    };

    return (
        <>
            <PageHeader title="Inutilização fiscal" description="Registre inutilização de faixa de numeração NF-e/NFC-e com chamada ao ambiente autorizador configurado." />
            <Message severity="warn" className="w-full mb-3" text="Use somente para quebras reais de sequência e após validação fiscal. O backend bloqueia sobreposição de faixa para mesma empresa/filial/documento/série." />
            <div className="grid">
                <div className="col-12 lg:col-8">
                    <Card title="Dados da inutilização">
                        <form className="grid formgrid p-fluid" onSubmit={(event) => { event.preventDefault(); submit(); }}>
                            <Field label="Empresa"><EmpresaSelect value={values.empresaId || null} required onChange={(empresaId) => setValues((v) => ({ ...v, empresaId: empresaId ?? '', filialId: '' }))} /></Field>
                            <Field label="Filial"><FilialSelect empresaId={values.empresaId || null} value={values.filialId || null} onChange={(filialId) => setValues((v) => ({ ...v, filialId: filialId ?? '' }))} /></Field>
                            <Field label="Tipo documento"><Dropdown value={values.tipoDocumento} options={tipoDocumentoFiscalOptions} onChange={(e) => setValues((v) => ({ ...v, tipoDocumento: e.value }))} /></Field>
                            <Field label="Série"><InputText value={values.serie} onChange={(e) => setValues((v) => ({ ...v, serie: e.target.value }))} /></Field>
                            <Field label="Número inicial"><InputNumber value={values.numeroInicial} min={1} onValueChange={(e) => setValues((v) => ({ ...v, numeroInicial: Number(e.value ?? 0) }))} /></Field>
                            <Field label="Número final"><InputNumber value={values.numeroFinal} min={1} onValueChange={(e) => setValues((v) => ({ ...v, numeroFinal: Number(e.value ?? 0) }))} /></Field>
                            <Field label="UF autorizadora"><InputText value={values.ufAutorizadora} maxLength={2} onChange={(e) => setValues((v) => ({ ...v, ufAutorizadora: e.target.value.toUpperCase() }))} /></Field>
                            <Field label="Schema set"><InputText value={values.schemaSetName} onChange={(e) => setValues((v) => ({ ...v, schemaSetName: e.target.value }))} /></Field>
                            <Field label="Correlation ID" className="field col-12"><InputText value={values.correlationId} onChange={(e) => setValues((v) => ({ ...v, correlationId: e.target.value }))} /></Field>
                            <div className="field col-12 flex align-items-center gap-2">
                                <Checkbox inputId="validarSchemaInutilizacao" checked={values.validarSchemaAntesTransmissao} onChange={(e) => setValues((v) => ({ ...v, validarSchemaAntesTransmissao: Boolean(e.checked) }))} />
                                <label htmlFor="validarSchemaInutilizacao">Validar schema antes da transmissão</label>
                            </div>
                            <Field label="Motivo" className="field col-12"><InputTextarea rows={4} value={values.motivo} onChange={(e) => setValues((v) => ({ ...v, motivo: e.target.value }))} /></Field>
                            <Field label="XML de inutilização assinado" className="field col-12"><InputTextarea rows={10} value={values.xmlInutilizacaoAssinado} onChange={(e) => setValues((v) => ({ ...v, xmlInutilizacaoAssinado: e.target.value }))} /></Field>
                            <div className="field col-12 flex justify-content-end">
                                <Button label="Transmitir inutilização" icon="pi pi-send" loading={mutations.inutilizarMutation.isPending} />
                            </div>
                        </form>
                    </Card>
                </div>
                <div className="col-12 lg:col-4">
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
