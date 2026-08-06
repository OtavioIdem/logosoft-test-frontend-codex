'use client';

import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { CfopSelect, NcmSelect } from '@/features/tributacao/components/CadastroFiscalSelects';
import { formatMoeda, origemMercadoriaOptions, tipoItemSpedOptions } from '@/features/tributacao/components/tributacaoUiUtils';
import { TipoItemSped } from '@/features/tributacao/types/tributacao.types';

export type ItemSimuladoValues = {
    chave: string;
    identificadorItem: string;
    origemMercadoria: string;
    tipoItem: number;
    ncmId: string;
    ncmCodigo: string;
    cfopId: string;
    cfopCodigo: string;
    cestCodigo: string;
    quantidade: number;
    valorUnitario: number;
    valorProduto: number;
};

export const criarItemSimulado = (indice: number): ItemSimuladoValues => ({
    chave: `item-${indice}-${Date.now()}`,
    identificadorItem: String(indice),
    origemMercadoria: '0',
    tipoItem: TipoItemSped.MercadoriaParaRevenda,
    ncmId: '',
    ncmCodigo: '',
    cfopId: '',
    cfopCodigo: '',
    cestCodigo: '',
    quantidade: 1,
    valorUnitario: 0,
    valorProduto: 0
});

const Campo = ({ label, htmlFor, children, className = 'field col-12 md:col-4 xl:col-3' }: { label: string; htmlFor?: string; children: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label htmlFor={htmlFor} className="font-medium block mb-2 text-sm">
            {label}
        </label>
        {children}
    </div>
);

/**
 * Grade de itens do documento simulado.
 *
 * `valorProduto` é campo próprio e **não** é derivado de quantidade × unitário: a NF-e tolera divergência de
 * centavos por arredondamento na origem, e o motor não recalcula de propósito. O botão "usar quantidade ×
 * unitário" existe como conveniência explícita, nunca como cálculo automático que sobrescreveria o número
 * que o documento já fixou.
 */
export const ItensTributaveisGrid = ({ itens, disabled, onChange }: { itens: ItemSimuladoValues[]; disabled?: boolean; onChange: (itens: ItemSimuladoValues[]) => void }) => {
    const atualizar = (chave: string, patch: Partial<ItemSimuladoValues>) => onChange(itens.map((item) => (item.chave === chave ? { ...item, ...patch } : item)));
    const remover = (chave: string) => onChange(itens.filter((item) => item.chave !== chave));
    const adicionar = () => onChange([...itens, criarItemSimulado(itens.length + 1)]);

    const somaProdutos = itens.reduce((total, item) => total + (item.valorProduto || 0), 0);

    return (
        <div className="flex flex-column gap-3">
            {itens.length === 0 ? <Message severity="warn" className="w-full" text="Informe ao menos um item para simular a tributação." /> : null}

            {itens.map((item, indice) => {
                const ehServico = Number(item.tipoItem) === TipoItemSped.Servicos;

                return (
                    <div key={item.chave} className="surface-card border-1 surface-border border-round p-3">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <span className="font-semibold">
                                Item {indice + 1}
                                {ehServico ? <span className="text-color-secondary font-normal ml-2">· serviço (ISS e retenções)</span> : <span className="text-color-secondary font-normal ml-2">· mercadoria (ICMS, ST, DIFAL, IPI, PIS/COFINS)</span>}
                            </span>
                            <Button type="button" icon="pi pi-trash" label="Remover" text severity="danger" size="small" disabled={disabled || itens.length === 1} onClick={() => remover(item.chave)} />
                        </div>

                        <div className="grid formgrid p-fluid">
                            <Campo label="Identificação na origem" htmlFor={`identificador-${item.chave}`} className="field col-12 md:col-4 xl:col-2">
                                <InputText id={`identificador-${item.chave}`} value={item.identificadorItem} maxLength={40} disabled={disabled} onChange={(event) => atualizar(item.chave, { identificadorItem: event.target.value })} />
                            </Campo>
                            <Campo label="Tipo do item (SPED)" htmlFor={`tipoItem-${item.chave}`}>
                                <Dropdown inputId={`tipoItem-${item.chave}`} value={item.tipoItem} options={tipoItemSpedOptions} disabled={disabled} onChange={(event) => atualizar(item.chave, { tipoItem: Number(event.value) })} />
                            </Campo>
                            <Campo label="Origem da mercadoria" htmlFor={`origem-${item.chave}`}>
                                <Dropdown inputId={`origem-${item.chave}`} value={item.origemMercadoria} options={origemMercadoriaOptions} disabled={disabled} onChange={(event) => atualizar(item.chave, { origemMercadoria: String(event.value) })} />
                            </Campo>
                            <Campo label="NCM" htmlFor={`ncm-${item.chave}`}>
                                <NcmSelect id={`ncm-${item.chave}`} value={item.ncmId || null} disabled={disabled} onChange={(value, selecionado) => atualizar(item.chave, { ncmId: value ?? '', ncmCodigo: selecionado?.codigo ?? '' })} />
                            </Campo>
                            <Campo label="CFOP" htmlFor={`cfop-${item.chave}`}>
                                <CfopSelect id={`cfop-${item.chave}`} value={item.cfopId || null} disabled={disabled} onChange={(value, selecionado) => atualizar(item.chave, { cfopId: value ?? '', cfopCodigo: selecionado?.codigo ?? '' })} />
                            </Campo>
                            <Campo label="CEST" htmlFor={`cest-${item.chave}`} className="field col-12 md:col-4 xl:col-2">
                                <InputText id={`cest-${item.chave}`} value={item.cestCodigo} maxLength={10} disabled={disabled} onChange={(event) => atualizar(item.chave, { cestCodigo: event.target.value })} />
                            </Campo>
                            <Campo label="Quantidade" htmlFor={`quantidade-${item.chave}`} className="field col-12 md:col-4 xl:col-2">
                                <InputNumber
                                    inputId={`quantidade-${item.chave}`}
                                    value={item.quantidade}
                                    min={0}
                                    minFractionDigits={0}
                                    maxFractionDigits={6}
                                    disabled={disabled}
                                    onValueChange={(event) => atualizar(item.chave, { quantidade: Number(event.value ?? 0) })}
                                />
                            </Campo>
                            <Campo label="Valor unitário" htmlFor={`valorUnitario-${item.chave}`} className="field col-12 md:col-4 xl:col-2">
                                <InputNumber
                                    inputId={`valorUnitario-${item.chave}`}
                                    value={item.valorUnitario}
                                    mode="currency"
                                    currency="BRL"
                                    locale="pt-BR"
                                    min={0}
                                    disabled={disabled}
                                    onValueChange={(event) => atualizar(item.chave, { valorUnitario: Number(event.value ?? 0) })}
                                />
                            </Campo>
                            <Campo label="Valor do produto (informado)" htmlFor={`valorProduto-${item.chave}`} className="field col-12 md:col-8 xl:col-4">
                                <div className="p-inputgroup">
                                    <InputNumber
                                        inputId={`valorProduto-${item.chave}`}
                                        value={item.valorProduto}
                                        mode="currency"
                                        currency="BRL"
                                        locale="pt-BR"
                                        min={0}
                                        disabled={disabled}
                                        onValueChange={(event) => atualizar(item.chave, { valorProduto: Number(event.value ?? 0) })}
                                    />
                                    <Button
                                        type="button"
                                        icon="pi pi-calculator"
                                        label="Qtd × unit."
                                        outlined
                                        disabled={disabled}
                                        tooltip="Preenche com quantidade × valor unitário. O motor não recalcula este campo."
                                        onClick={() => atualizar(item.chave, { valorProduto: Number((item.quantidade * item.valorUnitario).toFixed(2)) })}
                                    />
                                </div>
                            </Campo>
                        </div>
                    </div>
                );
            })}

            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2">
                <Button type="button" icon="pi pi-plus" label="Adicionar item" outlined disabled={disabled} onClick={adicionar} />
                <span className="text-color-secondary">Soma dos valores de produto: {formatMoeda(somaProdutos)}</span>
            </div>
        </div>
    );
};
