'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { classNames } from 'primereact/utils';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { FieldError } from '@/components/forms/FieldError';
import { fieldErrorMap, FieldErrors } from '@/features/pessoas/components/formUtils';
import {
    fiscalFormAlterado,
    fiscalFormEstaEmBranco,
    fiscalFormFromRecord,
    montarDadosFiscaisRequest,
    municipioOuPaisPreenchido,
    registroTemDadosFiscais
} from '@/features/pessoas/components/pessoaFiscalForm';
import {
    INDICADOR_CONTRIBUINTE_ICMS_CONTRIBUINTE,
    INDICADOR_CONTRIBUINTE_ICMS_DESCRICAO,
    INDICADOR_CONTRIBUINTE_ICMS_OPTIONS,
    indicadorIeDestinatarioLabel,
    PESSOA_FISCAL_ABA,
    PESSOA_FISCAL_CAMPOS,
    PESSOA_FISCAL_CONTRIBUINTE_SEM_IE,
    PESSOA_FISCAL_CRIACAO,
    PESSOA_FISCAL_ERRO,
    PESSOA_FISCAL_GRAVACAO,
    PESSOA_FISCAL_GRUPOS,
    PESSOA_FISCAL_INDISPONIVEL,
    PESSOA_FISCAL_LIMITES,
    PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO,
    PESSOA_FISCAL_PERMISSAO,
    PESSOA_FISCAL_REGISTRO_INCOMPLETO,
    PESSOA_FISCAL_TOAST,
    REGIME_TRIBUTARIO_PARCEIRO_OPTIONS,
    TRI_ESTADO_OPTIONS,
    triEstadoLabel
} from '@/features/pessoas/components/pessoaFiscalLabels';
import { usePessoaFiscalMutations } from '@/features/pessoas/hooks/usePessoaFiscal';
import { atualizarDadosFiscaisPessoaSchema } from '@/features/pessoas/schemas/pessoasSchemas';
import { PessoaFiscalFormValues, PessoaResponse } from '@/features/pessoas/types/pessoas.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError, EntityStatus } from '@/types/erp';

type PessoaFiscalTabProps = {
    /** Registro da lista de Pessoas. Vazio na criação (sem id): a aba mostra só o texto e não faz nenhuma chamada. */
    record?: PessoaResponse | null;
    /** `PESSOAS_DADOS_FISCAIS_GERENCIAR`, lida por quem monta o diálogo. Sem ela a aba é somente leitura. */
    podeGerenciar: boolean;
    /** IE digitada na aba "Documentos e observações" e ainda não salva (PF-2): só para a orientação. */
    inscricaoEstadualDigitada?: string;
};

const VAZIO: PessoaFiscalFormValues = {
    indicadorContribuinteIcms: null,
    inscricaoEstadualSt: '',
    suframa: '',
    regimeTributarioParceiro: null,
    contribuinteIpi: null,
    tomadorOrgaoPublico: null
};

const INDICADOR_OPTIONS = [{ label: PESSOA_FISCAL_CAMPOS.indicadorContribuinteIcmsPlaceholder, value: null as number | null }, ...INDICADOR_CONTRIBUINTE_ICMS_OPTIONS];
const REGIME_OPTIONS = [{ label: PESSOA_FISCAL_CAMPOS.regimeTributarioParceiroPlaceholder, value: null as number | null }, ...REGIME_TRIBUTARIO_PARCEIRO_OPTIONS];

const MensagemComTitulo = ({ severity, titulo, texto, extra }: { severity: 'info' | 'warn' | 'error'; titulo: string; texto: string; extra?: string }) => (
    <Message
        severity={severity}
        className="w-full mb-3"
        content={
            <div className="flex flex-column gap-1 line-height-3">
                <strong>{titulo}</strong>
                <span>{texto}</span>
                {extra ? <span>{extra}</span> : null}
            </div>
        }
    />
);

export const PessoaFiscalTab = ({ record, podeGerenciar, inscricaoEstadualDigitada }: PessoaFiscalTabProps) => {
    const toast = useAppToast();
    const pessoaId = record?.id ?? null;
    const { salvarMutation } = usePessoaFiscalMutations(pessoaId);
    // A aba carrega do REGISTRO (PF-1) e recarrega quando a lista é relida e o registro muda (PF-4).
    const base = useMemo(() => (record ? fiscalFormFromRecord(record) : VAZIO), [record]);
    const [values, setValues] = useState<PessoaFiscalFormValues>(base);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [erro, setErro] = useState<ApiError | null>(null);

    useEffect(() => {
        setValues(base);
        setErrors({});
        setErro(null);
    }, [base]);

    if (!record || !pessoaId) {
        return (
            <div>
                <Message severity="info" className="w-full" text={PESSOA_FISCAL_CRIACAO.texto} />
                <p className="text-color-secondary line-height-3 mb-0">{PESSOA_FISCAL_CRIACAO.descricao}</p>
            </div>
        );
    }

    const pessoaAtiva = Number(record.status) === EntityStatus.Ativo;
    const registroCompleto = registroTemDadosFiscais(record);
    const municipioPais = registroCompleto && municipioOuPaisPreenchido(record);
    const ieDoRegistro = (record.inscricaoEstadual ?? '').trim();
    const contribuinteSemIe = values.indicadorContribuinteIcms === INDICADOR_CONTRIBUINTE_ICMS_CONTRIBUINTE && !ieDoRegistro;
    const alterado = fiscalFormAlterado(values, base);
    const salvando = salvarMutation.isPending;
    const camposDesabilitados = !podeGerenciar || !pessoaAtiva || !registroCompleto || municipioPais || salvando;

    // O PATCH substitui o bloco inteiro: a regra crítica é do backend, e o bloqueio daqui existe para não mandar o que apaga dado.
    const motivoIndisponivel = !podeGerenciar
        ? PESSOA_FISCAL_PERMISSAO.acaoSemGerenciar
        : !pessoaAtiva
          ? PESSOA_FISCAL_INDISPONIVEL.pessoaInativa
          : !registroCompleto
            ? PESSOA_FISCAL_REGISTRO_INCOMPLETO.tituloBotao
            : municipioPais
              ? PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO.tituloBotao
              : contribuinteSemIe
                ? PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.tituloBotao
                : !alterado
                  ? PESSOA_FISCAL_INDISPONIVEL.semAlteracao
                  : undefined;

    const update = <K extends keyof PessoaFiscalFormValues>(name: K, value: PessoaFiscalFormValues[K]) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    const salvar = async () => {
        if (motivoIndisponivel) return;
        const request = montarDadosFiscaisRequest(values);
        const parsed = atualizarDadosFiscaisPessoaSchema.safeParse(request);
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        setErrors({});
        setErro(null);
        try {
            await salvarMutation.mutateAsync(request);
            toast.success(fiscalFormEstaEmBranco(values) ? PESSOA_FISCAL_TOAST.limpo : PESSOA_FISCAL_TOAST.salvo);
        } catch (error) {
            setErro(mapApiError(error));
        }
    };

    const className = (field: string) => classNames({ 'p-invalid': errors[field] });
    const descricaoIndicador = values.indicadorContribuinteIcms !== null ? INDICADOR_CONTRIBUINTE_ICMS_DESCRICAO[values.indicadorContribuinteIcms] : undefined;
    const ieNaoSalva = Boolean((inscricaoEstadualDigitada ?? '').trim()) && !ieDoRegistro;

    return (
        <div role="group" aria-label={PESSOA_FISCAL_ABA.formularioAria}>
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
                <p className="m-0 text-color-secondary line-height-3">{PESSOA_FISCAL_ABA.descricao}</p>
                <Button type="button" label={PESSOA_FISCAL_ABA.salvar} icon="pi pi-save" size="small" outlined loading={salvando} disabled={Boolean(motivoIndisponivel) || salvando} title={motivoIndisponivel ?? PESSOA_FISCAL_GRAVACAO.tituloBotao} onClick={salvar} />
            </div>

            <MensagemComTitulo severity="info" titulo={PESSOA_FISCAL_GRAVACAO.titulo} texto={PESSOA_FISCAL_GRAVACAO.texto} />
            {!podeGerenciar ? <Message severity="info" className="w-full mb-3" text={PESSOA_FISCAL_PERMISSAO.somenteLeitura} /> : null}
            {podeGerenciar && !pessoaAtiva ? <Message severity="warn" className="w-full mb-3" text={PESSOA_FISCAL_INDISPONIVEL.pessoaInativa} /> : null}
            {contribuinteSemIe ? <MensagemComTitulo severity="warn" titulo={PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.titulo} texto={PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.texto} extra={ieNaoSalva ? PESSOA_FISCAL_CONTRIBUINTE_SEM_IE.ieNaoSalva : undefined} /> : null}
            {municipioPais ? <MensagemComTitulo severity="warn" titulo={PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO.titulo} texto={PESSOA_FISCAL_MUNICIPIO_PAIS_BLOQUEADO.texto} /> : null}
            {!registroCompleto ? <MensagemComTitulo severity="error" titulo={PESSOA_FISCAL_REGISTRO_INCOMPLETO.titulo} texto={PESSOA_FISCAL_REGISTRO_INCOMPLETO.texto} /> : null}
            <ApiErrorPanel error={erro} title={PESSOA_FISCAL_ERRO.tituloSalvar} />
            {erro ? <small className="block text-color-secondary mb-3">{PESSOA_FISCAL_ERRO.registroDesatualizado}</small> : null}

            <div className="grid formgrid p-fluid">
                <div className="col-12">
                    <span className="block font-semibold text-color-secondary">{PESSOA_FISCAL_GRUPOS.icms}</span>
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="pessoaFiscalIndicador" className="font-medium">
                        {PESSOA_FISCAL_CAMPOS.indicadorContribuinteIcms}
                    </label>
                    <Dropdown
                        inputId="pessoaFiscalIndicador"
                        value={values.indicadorContribuinteIcms}
                        options={INDICADOR_OPTIONS}
                        placeholder={PESSOA_FISCAL_CAMPOS.indicadorContribuinteIcmsPlaceholder}
                        disabled={camposDesabilitados}
                        className={className('indicadorContribuinteIcms')}
                        onChange={(event) => update('indicadorContribuinteIcms', event.value ?? null)}
                    />
                    <small className="block text-color-secondary mt-1">{descricaoIndicador ?? PESSOA_FISCAL_CAMPOS.indicadorContribuinteIcmsHint}</small>
                    <FieldError message={errors.indicadorContribuinteIcms} />
                </div>
                {record.indicadorIeDestinatario !== null && record.indicadorIeDestinatario !== undefined ? (
                    <div className="field col-12 md:col-6">
                        <label htmlFor="pessoaFiscalIndicadorIe" className="font-medium">
                            {PESSOA_FISCAL_CAMPOS.indicadorIeDestinatario}
                        </label>
                        <InputText id="pessoaFiscalIndicadorIe" value={indicadorIeDestinatarioLabel(record.indicadorIeDestinatario)} readOnly disabled />
                        <small className="block text-color-secondary mt-1">{PESSOA_FISCAL_CAMPOS.indicadorIeDestinatarioHint}</small>
                    </div>
                ) : null}

                <div className="col-12">
                    <span className="block font-semibold text-color-secondary">{PESSOA_FISCAL_GRUPOS.parceiro}</span>
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="pessoaFiscalRegime" className="font-medium">
                        {PESSOA_FISCAL_CAMPOS.regimeTributarioParceiro}
                    </label>
                    <Dropdown
                        inputId="pessoaFiscalRegime"
                        value={values.regimeTributarioParceiro}
                        options={REGIME_OPTIONS}
                        placeholder={PESSOA_FISCAL_CAMPOS.regimeTributarioParceiroPlaceholder}
                        disabled={camposDesabilitados}
                        className={className('regimeTributarioParceiro')}
                        onChange={(event) => update('regimeTributarioParceiro', event.value ?? null)}
                    />
                    <small className="block text-color-secondary mt-1">{PESSOA_FISCAL_CAMPOS.regimeTributarioParceiroHint}</small>
                    <FieldError message={errors.regimeTributarioParceiro} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="pessoaFiscalIeSt" className="font-medium">
                        {PESSOA_FISCAL_CAMPOS.inscricaoEstadualSt}
                    </label>
                    <InputText id="pessoaFiscalIeSt" value={values.inscricaoEstadualSt} maxLength={PESSOA_FISCAL_LIMITES.inscricaoEstadualSt} disabled={camposDesabilitados} className={className('inscricaoEstadualSt')} onChange={(event) => update('inscricaoEstadualSt', event.target.value)} />
                    <small className="block text-color-secondary mt-1">{PESSOA_FISCAL_CAMPOS.inscricaoEstadualStHint}</small>
                    <FieldError message={errors.inscricaoEstadualSt} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="pessoaFiscalSuframa" className="font-medium">
                        {PESSOA_FISCAL_CAMPOS.suframa}
                    </label>
                    <InputText id="pessoaFiscalSuframa" value={values.suframa} inputMode="numeric" maxLength={PESSOA_FISCAL_LIMITES.suframa} disabled={camposDesabilitados} className={className('suframa')} onChange={(event) => update('suframa', event.target.value)} />
                    <small className="block text-color-secondary mt-1">{PESSOA_FISCAL_CAMPOS.suframaHint}</small>
                    <FieldError message={errors.suframa} />
                </div>

                <div className="col-12">
                    <span className="block font-semibold text-color-secondary">{PESSOA_FISCAL_GRUPOS.contextoNota}</span>
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="pessoaFiscalContribuinteIpi" className="font-medium">
                        {PESSOA_FISCAL_CAMPOS.contribuinteIpi}
                    </label>
                    <Dropdown
                        inputId="pessoaFiscalContribuinteIpi"
                        value={values.contribuinteIpi}
                        options={TRI_ESTADO_OPTIONS}
                        placeholder={triEstadoLabel(null)}
                        disabled={camposDesabilitados}
                        className={className('contribuinteIpi')}
                        onChange={(event) => update('contribuinteIpi', event.value ?? null)}
                    />
                    <small className="block text-color-secondary mt-1">{PESSOA_FISCAL_CAMPOS.contribuinteIpiHint}</small>
                    <FieldError message={errors.contribuinteIpi} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="pessoaFiscalTomadorOrgaoPublico" className="font-medium">
                        {PESSOA_FISCAL_CAMPOS.tomadorOrgaoPublico}
                    </label>
                    <Dropdown
                        inputId="pessoaFiscalTomadorOrgaoPublico"
                        value={values.tomadorOrgaoPublico}
                        options={TRI_ESTADO_OPTIONS}
                        placeholder={triEstadoLabel(null)}
                        disabled={camposDesabilitados}
                        className={className('tomadorOrgaoPublico')}
                        onChange={(event) => update('tomadorOrgaoPublico', event.value ?? null)}
                    />
                    <small className="block text-color-secondary mt-1">{PESSOA_FISCAL_CAMPOS.tomadorOrgaoPublicoHint}</small>
                    <FieldError message={errors.tomadorOrgaoPublico} />
                </div>
            </div>
        </div>
    );
};
