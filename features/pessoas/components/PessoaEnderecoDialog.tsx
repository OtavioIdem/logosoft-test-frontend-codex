'use client';

import { useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputMask } from 'primereact/inputmask';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { FieldError } from '@/components/forms/FieldError';
import { fieldErrorMap, FieldErrors } from '@/features/pessoas/components/formUtils';
import {
    formatarCepEndereco,
    municipioFiscalLabel,
    PESSOA_ENDERECO_AVISOS,
    PESSOA_ENDERECO_CAMPOS,
    PESSOA_ENDERECO_CRIAR_DIALOG,
    PESSOA_ENDERECO_EDITAR_DIALOG,
    PESSOA_ENDERECO_LIMITES,
    PESSOA_ENDERECO_MUNICIPIO_FISCAL,
    PESSOA_ENDERECO_PRINCIPAL,
    PESSOA_ENDERECOS_ERRO,
    TIPO_ENDERECO_DICA,
    TIPO_ENDERECO_FISCAL_VALOR,
    TIPO_ENDERECO_OPTIONS,
    TIPO_ENDERECO_PADRAO,
    UF_ENDERECO_OPTIONS
} from '@/features/pessoas/components/pessoaEnderecosLabels';
import { atualizarEnderecoPessoaSchema, criarEnderecoPessoaSchema } from '@/features/pessoas/schemas/pessoasSchemas';
import { EnderecoPessoaFormValues, EnderecoPessoaResponse } from '@/features/pessoas/types/pessoaEnderecos.types';
import { ApiError } from '@/types/erp';

type PessoaEnderecoDialogProps = {
    visible: boolean;
    /** Endereço aberto para edição; vazio para cadastrar. O pai o entrega como foto do momento da abertura. */
    endereco?: EnderecoPessoaResponse | null;
    /** Cadastro do primeiro endereço: o backend o marca principal mesmo sem pedir (`Pessoa.cs:141`). */
    primeiroEndereco?: boolean;
    loading?: boolean;
    /** Erro da última tentativa de salvar, com code, status e traceId preservados. */
    error?: ApiError | null;
    onHide: () => void;
    onSubmit: (values: EnderecoPessoaFormValues) => Promise<void> | void;
};

const buildInitialValues = (endereco?: EnderecoPessoaResponse | null, primeiroEndereco?: boolean): EnderecoPessoaFormValues => {
    if (!endereco) {
        return { tipo: TIPO_ENDERECO_PADRAO, logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '', principal: Boolean(primeiroEndereco) };
    }
    const digitos = (endereco.cep ?? '').replace(/\D/g, '');
    return {
        tipo: endereco.tipo,
        logradouro: endereco.logradouro ?? '',
        numero: endereco.numero ?? '',
        complemento: endereco.complemento ?? '',
        bairro: endereco.bairro ?? '',
        cidade: endereco.cidade ?? '',
        uf: endereco.uf ?? '',
        cep: digitos.length === PESSOA_ENDERECO_LIMITES.cepDigitos ? formatarCepEndereco(digitos) : digitos,
        principal: endereco.principal
    };
};

const normalizarCidade = (value?: string | null) => (value ?? '').trim().toLowerCase();

export const PessoaEnderecoDialog = ({ visible, endereco, primeiroEndereco, loading, error, onHide, onSubmit }: PessoaEnderecoDialogProps) => {
    const editando = Boolean(endereco?.id);
    const [values, setValues] = useState<EnderecoPessoaFormValues>(() => buildInitialValues(endereco, primeiroEndereco));
    const [errors, setErrors] = useState<FieldErrors>({});

    useEffect(() => {
        if (visible) {
            setValues(buildInitialValues(endereco, primeiroEndereco));
            setErrors({});
        }
    }, [endereco, primeiroEndereco, visible]);

    const update = <K extends keyof EnderecoPessoaFormValues>(name: K, value: EnderecoPessoaFormValues[K]) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));
    };

    // EP-5: o único principal não pode ser desmarcado (o backend o devolve `true`); no primeiro endereço, o backend
    // já o marca principal. Nos dois casos o campo fica marcado e desabilitado, com a explicação ao lado.
    const principalTravado = editando ? Boolean(endereco?.principal) : Boolean(primeiroEndereco);

    // D102: a UF tem precedência sobre a cidade. Sem município vinculado, nenhum aviso (AC-6).
    const temVinculo = Boolean(endereco?.municipioIbgeId);
    const ufTrocada = editando && temVinculo && Boolean(values.uf) && values.uf !== endereco?.uf;
    const cidadeTrocada = editando && temVinculo && !ufTrocada && values.uf === endereco?.uf && normalizarCidade(values.cidade) !== '' && normalizarCidade(values.cidade) !== normalizarCidade(endereco?.cidade);
    const aviso = ufTrocada ? PESSOA_ENDERECO_AVISOS.ufTrocadaComVinculo : cidadeTrocada ? PESSOA_ENDERECO_AVISOS.cidadeTrocadaMesmaUfComVinculo : PESSOA_ENDERECO_AVISOS.nenhum;

    const submit = async () => {
        const schema = editando ? atualizarEnderecoPessoaSchema : criarEnderecoPessoaSchema;
        const parsed = schema.safeParse({ ...values, principal: principalTravado ? true : values.principal });
        if (!parsed.success) {
            setErrors(fieldErrorMap(parsed.error));
            return;
        }
        await onSubmit({ ...values, principal: principalTravado ? true : values.principal });
    };

    const dialogConfig = editando ? PESSOA_ENDERECO_EDITAR_DIALOG : PESSOA_ENDERECO_CRIAR_DIALOG;

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label={dialogConfig.confirmLabel} icon="pi pi-check" loading={loading} onClick={submit} />
        </div>
    );

    const className = (field: string) => classNames({ 'p-invalid': errors[field] });
    const obrigatorio = <span className="text-red-500 ml-1" aria-hidden="true">*</span>;

    return (
        <Dialog header={dialogConfig.titulo} visible={visible} modal appendTo="self" closable={!loading} style={{ width: 'min(40rem, 96vw)' }} footer={footer} onHide={onHide}>
            <ApiErrorPanel error={error} title={PESSOA_ENDERECOS_ERRO.tituloSalvar} />
            {error && editando ? <small className="block text-color-secondary mb-3">{PESSOA_ENDERECOS_ERRO.listaDesatualizada}</small> : null}
            <div className="grid formgrid p-fluid">
                <div className="field col-12 md:col-4">
                    <label htmlFor="enderecoTipo" className="font-medium">
                        {PESSOA_ENDERECO_CAMPOS.tipo}
                        {obrigatorio}
                    </label>
                    <Dropdown inputId="enderecoTipo" value={values.tipo} options={TIPO_ENDERECO_OPTIONS} className={className('tipo')} onChange={(event) => update('tipo', event.value)} />
                    <FieldError message={errors.tipo} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="enderecoLogradouro" className="font-medium">
                        {PESSOA_ENDERECO_CAMPOS.logradouro}
                        {obrigatorio}
                    </label>
                    <InputText id="enderecoLogradouro" value={values.logradouro} className={className('logradouro')} onChange={(event) => update('logradouro', event.target.value)} />
                    <FieldError message={errors.logradouro} />
                </div>
                {values.tipo === TIPO_ENDERECO_FISCAL_VALOR ? (
                    <div className="col-12">
                        <small className="block text-color-secondary mb-3">{TIPO_ENDERECO_DICA}</small>
                    </div>
                ) : null}
                <div className="field col-12 md:col-4">
                    <label htmlFor="enderecoNumero" className="font-medium">
                        {PESSOA_ENDERECO_CAMPOS.numero}
                        {obrigatorio}
                    </label>
                    <InputText id="enderecoNumero" value={values.numero} className={className('numero')} onChange={(event) => update('numero', event.target.value)} />
                    <small className="text-color-secondary">{PESSOA_ENDERECO_CAMPOS.numeroHint}</small>
                    <FieldError message={errors.numero} />
                </div>
                <div className="field col-12 md:col-8">
                    <label htmlFor="enderecoComplemento" className="font-medium">
                        {PESSOA_ENDERECO_CAMPOS.complemento}
                    </label>
                    <InputText id="enderecoComplemento" value={values.complemento} className={className('complemento')} onChange={(event) => update('complemento', event.target.value)} />
                    <FieldError message={errors.complemento} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="enderecoBairro" className="font-medium">
                        {PESSOA_ENDERECO_CAMPOS.bairro}
                        {obrigatorio}
                    </label>
                    <InputText id="enderecoBairro" value={values.bairro} className={className('bairro')} onChange={(event) => update('bairro', event.target.value)} />
                    <FieldError message={errors.bairro} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="enderecoCidade" className="font-medium">
                        {PESSOA_ENDERECO_CAMPOS.cidade}
                        {obrigatorio}
                    </label>
                    <InputText id="enderecoCidade" value={values.cidade} className={className('cidade')} onChange={(event) => update('cidade', event.target.value)} />
                    <small className="text-color-secondary">{PESSOA_ENDERECO_CAMPOS.cidadeHint}</small>
                    <FieldError message={errors.cidade} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="enderecoUf" className="font-medium">
                        {PESSOA_ENDERECO_CAMPOS.uf}
                        {obrigatorio}
                    </label>
                    <Dropdown inputId="enderecoUf" value={values.uf || null} options={UF_ENDERECO_OPTIONS} filter placeholder={PESSOA_ENDERECO_CAMPOS.ufPlaceholder} className={className('uf')} onChange={(event) => update('uf', event.value ?? '')} />
                    <FieldError message={errors.uf} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="enderecoCep" className="font-medium">
                        {PESSOA_ENDERECO_CAMPOS.cep}
                        {obrigatorio}
                    </label>
                    <InputMask id="enderecoCep" mask="99999-999" placeholder="00000-000" autoClear={false} value={values.cep} className={className('cep')} onChange={(event) => update('cep', event.value ?? '')} />
                    <small className="text-color-secondary">{PESSOA_ENDERECO_CAMPOS.cepHint}</small>
                    <FieldError message={errors.cep} />
                </div>
                {editando ? (
                    <div className="field col-12 md:col-4">
                        <span id="enderecoMunicipioFiscalLabel" className="block font-medium mb-2">
                            {PESSOA_ENDERECO_CAMPOS.municipioFiscal}
                        </span>
                        <Tag
                            value={municipioFiscalLabel(endereco?.municipioIbgeId)}
                            severity={temVinculo ? 'success' : 'warning'}
                            title={temVinculo ? PESSOA_ENDERECO_MUNICIPIO_FISCAL.dicaVinculado : PESSOA_ENDERECO_MUNICIPIO_FISCAL.dicaNaoVinculado}
                        />
                        <small className="block text-color-secondary mt-2">{PESSOA_ENDERECO_CAMPOS.municipioFiscalHint}</small>
                    </div>
                ) : null}
                {aviso ? (
                    <div className="col-12">
                        <Message severity="warn" className="w-full mb-3" text={aviso} />
                    </div>
                ) : null}
                <div className="field col-12">
                    <div className="flex align-items-center gap-2">
                        <Checkbox inputId="enderecoPrincipal" checked={principalTravado ? true : values.principal} disabled={principalTravado || loading} onChange={(event) => update('principal', Boolean(event.checked))} />
                        <label htmlFor="enderecoPrincipal" className="font-medium">
                            {PESSOA_ENDERECO_CAMPOS.principal}
                        </label>
                    </div>
                    <small className="block text-color-secondary mt-1">
                        {principalTravado ? (editando ? PESSOA_ENDERECO_PRINCIPAL.unicoPrincipalDica : PESSOA_ENDERECO_PRINCIPAL.primeiroEhPrincipal) : PESSOA_ENDERECO_CAMPOS.principalHint}
                    </small>
                </div>
            </div>
        </Dialog>
    );
};
