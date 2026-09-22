'use client';

import { useState } from 'react';
import { Button } from 'primereact/button';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { InputText } from 'primereact/inputtext';
import { Panel } from 'primereact/panel';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { FieldError } from '@/components/forms/FieldError';
import { SearchSelect } from '@/components/forms/SearchSelect';
import { SelectOption } from '@/types/erp';

/**
 * Bloco de endereço fiscal — compartilhado por Empresa e Filial (v1.11.0a8b64, uiPattern).
 *
 * Espelha `DefinirEnderecoFiscalRequest`: seis campos obrigatórios (logradouro, numero, bairro,
 * cidade, uf, cep) e dois anuláveis (complemento, codigoMunicipioIbge) — fonte C#, não o Swagger,
 * que erra a anulabilidade destes oito campos pela terceira vez nesta onda.
 *
 * O componente é puramente apresentacional: quem chama fornece os catálogos (UF, Município) já
 * resolvidos e as funções de busca/seleção/remoção. Nenhuma chamada de API, hook ou schema mora
 * aqui — isso é do dev-senior-react (Bloco B desta fatia).
 *
 * Contrato de integração para quem for montar isto em `AdministracaoFormDialog`:
 * - Só faz sentido em modo edição (registro com `id`): o PUT de endereço fiscal exige
 *   `/{empresas|filiais}/{id}/endereco-fiscal`, que não existe antes de a empresa/filial existir.
 * - `municipioValue` é o `codigoMunicipioIbge` (string) pendente/selecionado — nunca o
 *   `municipioIbgeId` (Guid) do response. Resolver um a partir do outro via catálogo é
 *   responsabilidade de quem fornece `municipioOptions`.
 * - `estaCompleto` vem pronto do backend (`EnderecoFiscalResponse.EstaCompleto`). Não recalcular.
 * - Remover o município é `DELETE /endereco-fiscal/municipio`, uma ação própria — nunca mandar
 *   `codigoMunicipioIbge: null` no PUT. Por isso `onRemoverMunicipio` é uma função separada de
 *   `onChange`/`onSelecionarMunicipio`, disparada só quando `municipioVinculado` é `true` (já
 *   existe vínculo gravado no backend).
 */

export type EnderecoFiscalCampos = {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
};

export type EnderecoFiscalCampoErros = Partial<Record<keyof EnderecoFiscalCampos | 'codigoMunicipioIbge', string>>;

export type EnderecoFiscalSectionProps = {
    value: EnderecoFiscalCampos;
    onChange: (patch: Partial<EnderecoFiscalCampos>) => void;
    errors?: EnderecoFiscalCampoErros;
    disabled?: boolean;

    /** `undefined` = a empresa/filial ainda não tem endereço fiscal gravado (registro novo). */
    estaCompleto?: boolean;

    ufOptions: SelectOption<string>[];
    ufLoading?: boolean;
    onSearchUf?: (termo: string) => void;

    /** `codigoMunicipioIbge` pendente/selecionado — o que vai no PUT. Município filtra por UF. */
    municipioValue: string | null;
    municipioOptions: SelectOption<string>[];
    municipioLoading?: boolean;
    onSearchMunicipio?: (termo: string) => void;
    onSelecionarMunicipio: (codigoIbge: string | null) => void;

    /** `true` quando o backend já tem um `municipioIbgeId` gravado para este registro. */
    municipioVinculado?: boolean;
    onRemoverMunicipio?: () => Promise<void> | void;
    removendoMunicipio?: boolean;
};

const completoTag = (estaCompleto?: boolean) => {
    if (estaCompleto === true) return <Tag severity="success" icon="pi pi-check-circle" value="Completo" />;
    if (estaCompleto === false) return <Tag severity="warning" icon="pi pi-exclamation-triangle" value="Incompleto" />;
    return <Tag icon="pi pi-minus-circle" value="Não cadastrado" />;
};

export const EnderecoFiscalSection = ({
    value,
    onChange,
    errors,
    disabled,
    estaCompleto,
    ufOptions,
    ufLoading,
    onSearchUf,
    municipioValue,
    municipioOptions,
    municipioLoading,
    onSearchMunicipio,
    onSelecionarMunicipio,
    municipioVinculado,
    onRemoverMunicipio,
    removendoMunicipio
}: EnderecoFiscalSectionProps) => {
    const [ufTrocaAvisoVisivel, setUfTrocaAvisoVisivel] = useState(false);
    const [confirmRemoverVisivel, setConfirmRemoverVisivel] = useState(false);

    const municipioDesabilitado = Boolean(disabled) || !value.uf;

    const handleUfChange = (novaUf: string | null) => {
        const ufAnterior = value.uf;
        onChange({ uf: novaUf ?? '' });

        // Trocar a UF depois de já ter escolhido município deixaria o par UF/município inválido —
        // o município pertence à UF anterior. Limpar é local (não é o DELETE do vínculo: se o
        // registro tinha um município gravado, ele só é desfeito no backend quando o operador
        // salvar o formulário sem município, ou usar "Remover vínculo" explicitamente).
        if (municipioValue && novaUf !== ufAnterior) {
            onSelecionarMunicipio(null);
            setUfTrocaAvisoVisivel(true);
        }
    };

    const handleSelecionarMunicipio = (codigo: string | null) => {
        setUfTrocaAvisoVisivel(false);
        onSelecionarMunicipio(codigo);

        // Conveniência: se a Cidade ainda não foi digitada, preenche com o nome do município
        // escolhido. Nunca sobrescreve o que o operador já digitou. O label já vem sem sufixo de UF
        // (`semSufixoUf` em useEnderecoFiscalCatalogos.ts, aplicado na origem da opção — C3,
        // v1.11.0a8b64 Bloco C); este componente confia nele sem reprocessar.
        if (codigo && !value.cidade.trim()) {
            const opcaoEscolhida = municipioOptions.find((opcao) => opcao.value === codigo);
            if (opcaoEscolhida) onChange({ cidade: opcaoEscolhida.label });
        }
    };

    const confirmarRemocao = async () => {
        setConfirmRemoverVisivel(false);
        await onRemoverMunicipio?.();
    };

    return (
        <Panel
            className="mb-3"
            headerTemplate={
                <div className="flex align-items-center justify-content-between p-3 gap-3">
                    <span className="font-semibold">Endereço fiscal</span>
                    {completoTag(estaCompleto)}
                </div>
            }
        >
            {estaCompleto === false ? <p className="text-sm text-color-secondary mt-0 mb-3">Necessário para emissão de nota fiscal — complete os campos obrigatórios quando possível.</p> : null}

            <div className="grid formgrid p-fluid">
                <div className="field col-12 md:col-8">
                    <label htmlFor="enderecoFiscalLogradouro" className="font-medium">
                        Logradouro<span className="text-red-500 ml-1">*</span>
                    </label>
                    <InputText
                        id="enderecoFiscalLogradouro"
                        value={value.logradouro}
                        className={classNames({ 'p-invalid': errors?.logradouro })}
                        disabled={disabled}
                        onChange={(event) => onChange({ logradouro: event.target.value })}
                    />
                    <FieldError message={errors?.logradouro} />
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="enderecoFiscalNumero" className="font-medium">
                        Número<span className="text-red-500 ml-1">*</span>
                    </label>
                    <InputText id="enderecoFiscalNumero" value={value.numero} className={classNames({ 'p-invalid': errors?.numero })} disabled={disabled} onChange={(event) => onChange({ numero: event.target.value })} />
                    <FieldError message={errors?.numero} />
                </div>

                <div className="field col-12 md:col-5">
                    <label htmlFor="enderecoFiscalComplemento" className="font-medium">
                        Complemento
                    </label>
                    <InputText id="enderecoFiscalComplemento" value={value.complemento} disabled={disabled} onChange={(event) => onChange({ complemento: event.target.value })} />
                    <small className="text-color-secondary">Opcional — sala, bloco, referência.</small>
                </div>
                <div className="field col-12 md:col-4">
                    <label htmlFor="enderecoFiscalBairro" className="font-medium">
                        Bairro<span className="text-red-500 ml-1">*</span>
                    </label>
                    <InputText id="enderecoFiscalBairro" value={value.bairro} className={classNames({ 'p-invalid': errors?.bairro })} disabled={disabled} onChange={(event) => onChange({ bairro: event.target.value })} />
                    <FieldError message={errors?.bairro} />
                </div>
                <div className="field col-12 md:col-3">
                    <label htmlFor="enderecoFiscalCep" className="font-medium">
                        CEP<span className="text-red-500 ml-1">*</span>
                    </label>
                    <InputText
                        id="enderecoFiscalCep"
                        value={value.cep}
                        maxLength={9}
                        placeholder="00000-000"
                        className={classNames({ 'p-invalid': errors?.cep })}
                        disabled={disabled}
                        onChange={(event) => onChange({ cep: event.target.value })}
                    />
                    <FieldError message={errors?.cep} />
                </div>

                <div className="field col-12 md:col-3">
                    <label htmlFor="enderecoFiscalUf" className="font-medium">
                        UF<span className="text-red-500 ml-1">*</span>
                    </label>
                    <SearchSelect
                        id="enderecoFiscalUf"
                        value={value.uf || null}
                        options={ufOptions}
                        onChange={handleUfChange}
                        onSearch={onSearchUf}
                        placeholder="UF"
                        filterPlaceholder="Buscar UF"
                        emptyMessage="Nenhuma UF encontrada."
                        loading={ufLoading}
                        disabled={disabled}
                    />
                    <FieldError message={errors?.uf} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="enderecoFiscalCidade" className="font-medium">
                        Cidade<span className="text-red-500 ml-1">*</span>
                    </label>
                    <InputText id="enderecoFiscalCidade" value={value.cidade} className={classNames({ 'p-invalid': errors?.cidade })} disabled={disabled} onChange={(event) => onChange({ cidade: event.target.value })} />
                    <FieldError message={errors?.cidade} />
                </div>
            </div>

            <div className="grid formgrid p-fluid mt-1">
                <div className="field col-12">
                    <label htmlFor="enderecoFiscalMunicipio" className="font-medium">
                        Município (IBGE)
                    </label>
                    <div className="flex align-items-start gap-2">
                        <div className="flex-1">
                            <SearchSelect
                                id="enderecoFiscalMunicipio"
                                value={municipioValue}
                                options={municipioOptions}
                                onChange={handleSelecionarMunicipio}
                                onSearch={onSearchMunicipio}
                                placeholder={value.uf ? 'Buscar município' : 'Selecione a UF antes do município'}
                                filterPlaceholder="Buscar município"
                                emptyMessage={value.uf ? 'Nenhum município encontrado para a UF selecionada.' : 'Selecione a UF antes do município.'}
                                loading={municipioLoading}
                                disabled={municipioDesabilitado}
                            />
                        </div>
                        {municipioVinculado ? (
                            <Button
                                type="button"
                                icon="pi pi-trash"
                                severity="danger"
                                outlined
                                aria-label="Remover vínculo do município"
                                loading={removendoMunicipio}
                                disabled={disabled}
                                onClick={() => setConfirmRemoverVisivel(true)}
                            />
                        ) : null}
                    </div>
                    <FieldError message={errors?.codigoMunicipioIbge} />
                    {ufTrocaAvisoVisivel ? (
                        <small className="block text-orange-600 mt-1">
                            <i className="pi pi-info-circle mr-1" />
                            Município limpo: a UF mudou. Selecione novamente.
                        </small>
                    ) : (
                        <small className="text-color-secondary block mt-1">Código IBGE usado em documentos fiscais. Opcional, mas recomendado para a nota fiscal.</small>
                    )}
                </div>
            </div>

            <ConfirmDialog
                visible={confirmRemoverVisivel}
                onHide={() => setConfirmRemoverVisivel(false)}
                header="Remover município fiscal"
                message="Remove o vínculo do município fiscal deste endereço. O endereço fica incompleto até um novo município ser selecionado e salvo."
                icon="pi pi-exclamation-triangle"
                acceptLabel="Remover vínculo"
                rejectLabel="Cancelar"
                acceptClassName="p-button-danger"
                accept={confirmarRemocao}
            />
        </Panel>
    );
};
