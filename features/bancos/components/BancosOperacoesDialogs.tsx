'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { EmpresaFilialFilter } from '@/components/forms/EmpresaFilialFilter';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { FieldError } from '@/components/forms/FieldError';
import { FormGrid } from '@/components/forms/FormGrid';
import { SelectOption } from '@/types/erp';
import { useContasReceber } from '@/features/financeiro/hooks/useFinanceiroResources';
import { BoletoResponse, GerarBoletoFormValues, ImportarRetornoFormValues } from '@/features/bancos/types/bancos.types';
import { formatMoney } from '@/lib/formatters/money';

const footer = (label: string, loading: boolean | undefined, onHide: () => void, onConfirm: () => void, disabled?: boolean) => (
    <div className="flex justify-content-end gap-2">
        <Button type="button" label="Cancelar" icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
        <Button type="button" label={label} icon="pi pi-check" loading={loading} disabled={disabled} onClick={onConfirm} />
    </div>
);

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export const GerarBoletoDialog = ({ visible, loading, carteiraOptions, carteiraLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; carteiraOptions: SelectOption<string>[]; carteiraLoading?: boolean; onHide: () => void; onSubmit: (values: GerarBoletoFormValues) => Promise<void> }) => {
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const [filialId, setFilialId] = useState<string | null>(null);
    const [contaReceberId, setContaReceberId] = useState<string | null>(null);
    const [parcelaReceberId, setParcelaReceberId] = useState<string | null>(null);
    const [carteiraCobrancaId, setCarteiraCobrancaId] = useState<string | null>(null);
    const [numeroDocumento, setNumeroDocumento] = useState('');
    const [erros, setErros] = useState<Record<string, string>>({});

    const contasQuery = useContasReceber({ empresaId: empresaId ?? undefined, filialId: filialId ?? undefined });
    const contaOptions = useMemo<SelectOption<string>[]>(() => (contasQuery.data ?? []).map((conta) => ({ label: `${conta.documento}`, value: conta.id })), [contasQuery.data]);
    const parcelaOptions = useMemo<SelectOption<string>[]>(() => {
        const conta = (contasQuery.data ?? []).find((item) => item.id === contaReceberId);
        return (conta?.parcelas ?? []).map((parcela) => ({ label: `Parcela ${parcela.numero} — venc. ${formatDate(parcela.vencimento)} — ${formatMoney(parcela.valorSaldo)}`, value: parcela.id }));
    }, [contasQuery.data, contaReceberId]);

    useEffect(() => {
        if (visible) {
            setEmpresaId(null);
            setFilialId(null);
            setContaReceberId(null);
            setParcelaReceberId(null);
            setCarteiraCobrancaId(null);
            setNumeroDocumento('');
            setErros({});
        }
    }, [visible]);

    const confirmar = async () => {
        const next: Record<string, string> = {};
        if (!contaReceberId) next.contaReceberId = 'Selecione a conta a receber.';
        if (!parcelaReceberId) next.parcelaReceberId = 'Selecione a parcela.';
        if (!carteiraCobrancaId) next.carteiraCobrancaId = 'Selecione a carteira.';
        setErros(next);
        if (Object.keys(next).length > 0) return;
        await onSubmit({ contaReceberId: contaReceberId as string, parcelaReceberId: parcelaReceberId as string, carteiraCobrancaId: carteiraCobrancaId as string, numeroDocumento: numeroDocumento.trim() || null });
    };

    return (
        <Dialog header="Gerar boleto" visible={visible} modal style={{ width: 'min(52rem, 96vw)' }} footer={footer('Gerar boleto', loading, onHide, confirmar)} onHide={onHide}>
            <div className="mb-3">
                <EmpresaFilialFilter empresaId={empresaId} filialId={filialId} onEmpresaChange={(value) => { setEmpresaId(value); setContaReceberId(null); setParcelaReceberId(null); }} onFilialChange={setFilialId} />
            </div>
            <FormGrid>
                <div className="field col-12 md:col-6">
                    <label htmlFor="boletoConta" className="font-medium">Conta a receber *</label>
                    <EntitySelect id="boletoConta" entityName="conta a receber" value={contaReceberId} options={contaOptions} loading={contasQuery.isFetching} onChange={(value) => { setContaReceberId(value); setParcelaReceberId(null); setErros((c) => ({ ...c, contaReceberId: '' })); }} />
                    <FieldError message={erros.contaReceberId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="boletoParcela" className="font-medium">Parcela *</label>
                    <EntitySelect id="boletoParcela" entityName="parcela" value={parcelaReceberId} options={parcelaOptions} onChange={(value) => { setParcelaReceberId(value); setErros((c) => ({ ...c, parcelaReceberId: '' })); }} emptyMessage="Selecione a conta primeiro." />
                    <FieldError message={erros.parcelaReceberId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="boletoCarteira" className="font-medium">Carteira de cobrança *</label>
                    <EntitySelect id="boletoCarteira" entityName="carteira" value={carteiraCobrancaId} options={carteiraOptions} loading={carteiraLoading} onChange={(value) => { setCarteiraCobrancaId(value); setErros((c) => ({ ...c, carteiraCobrancaId: '' })); }} />
                    <FieldError message={erros.carteiraCobrancaId} />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="boletoNumeroDoc" className="font-medium">Número do documento</label>
                    <InputText id="boletoNumeroDoc" value={numeroDocumento} onChange={(event) => setNumeroDocumento(event.target.value)} />
                </div>
            </FormGrid>
        </Dialog>
    );
};

export const BoletoDetalheDialog = ({ visible, boleto, historico, historicoLoading, onHide }: { visible: boolean; boleto: BoletoResponse | null; historico: { data: string; evento: string; descricao?: string | null }[]; historicoLoading?: boolean; onHide: () => void }) => {
    return (
        <Dialog header="Boleto" visible={visible} modal style={{ width: 'min(56rem, 98vw)' }} onHide={onHide}>
            {boleto ? (
                <>
                    <div className="grid mb-2">
                        {/* boleto.valor não existe no contrato (BoletoResponse só tem valorTitulo/valorPago) — correção de campo é da b54.c1, D5 */}
                        <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Valor</span><strong>{formatMoney(boleto.valor)}</strong></div>
                        <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Vencimento</span>{formatDate(boleto.vencimento)}</div>
                        <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Nosso número</span>{boleto.nossoNumero || '—'}</div>
                        <div className="col-6 md:col-3"><span className="block text-color-secondary text-sm">Documento</span>{boleto.numeroDocumento || '—'}</div>
                        <div className="col-12"><span className="block text-color-secondary text-sm">Linha digitável</span><span className="font-mono">{boleto.linhaDigitavel || '—'}</span></div>
                        <div className="col-12"><span className="block text-color-secondary text-sm">Código de barras</span><span className="font-mono">{boleto.codigoBarras || '—'}</span></div>
                    </div>
                    {boleto.alertas && boleto.alertas.length > 0 ? <Message className="w-full mb-3" severity="warn" text={boleto.alertas.join(' · ')} /> : null}
                    <Message className="w-full mb-3" severity="info" text="Layout de linha digitável/código de barras é best-effort — validar contra o banco real antes de usar em produção." />
                    <DataTable value={historico} dataKey="data" loading={historicoLoading} emptyMessage="Sem histórico." responsiveLayout="scroll" stripedRows size="small">
                        <Column header="Data" body={(row: { data: string }) => new Date(row.data).toLocaleString('pt-BR')} />
                        <Column field="evento" header="Evento" body={(row: { evento: string }) => <Tag value={row.evento} />} />
                        <Column field="descricao" header="Descrição" body={(row: { descricao?: string | null }) => row.descricao || '—'} />
                    </DataTable>
                </>
            ) : null}
        </Dialog>
    );
};

const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result ?? '');
            resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
        };
        reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
        reader.readAsDataURL(file);
    });

export const ImportarRetornoDialog = ({ visible, loading, contaOptions, contaLoading, onHide, onSubmit }: { visible: boolean; loading?: boolean; contaOptions: SelectOption<string>[]; contaLoading?: boolean; onHide: () => void; onSubmit: (values: ImportarRetornoFormValues) => Promise<void> }) => {
    const [contaBancariaId, setContaBancariaId] = useState<string | null>(null);
    const [nomeArquivo, setNomeArquivo] = useState('');
    const [conteudo, setConteudo] = useState('');
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (visible) {
            setContaBancariaId(null);
            setNomeArquivo('');
            setConteudo('');
            setErro('');
        }
    }, [visible]);

    const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await readFileAsBase64(file);
            setNomeArquivo(file.name);
            setConteudo(base64);
            setErro('');
        } catch {
            setErro('Não foi possível ler o arquivo.');
        }
    };

    const confirmar = async () => {
        if (!contaBancariaId) {
            setErro('Selecione a conta bancária.');
            return;
        }
        if (!conteudo) {
            setErro('Selecione o arquivo de retorno.');
            return;
        }
        await onSubmit({ contaBancariaId, nomeArquivo, conteudo });
    };

    return (
        <Dialog header="Importar retorno CNAB" visible={visible} modal style={{ width: 'min(46rem, 96vw)' }} footer={footer('Importar', loading, onHide, confirmar, !conteudo || !contaBancariaId)} onHide={onHide}>
            <FormGrid>
                <div className="field col-12">
                    <label htmlFor="retConta" className="font-medium">Conta bancária *</label>
                    <EntitySelect id="retConta" entityName="conta bancária" value={contaBancariaId} options={contaOptions} loading={contaLoading} onChange={(value) => { setContaBancariaId(value); setErro(''); }} />
                </div>
                <div className="field col-12">
                    <label htmlFor="retArquivo" className="font-medium">Arquivo de retorno *</label>
                    <input id="retArquivo" type="file" accept=".ret,.txt,.rem" className="block mt-1" onChange={onFile} aria-label="Arquivo de retorno CNAB" />
                    {nomeArquivo ? <small className="block mt-1 text-color-secondary">Selecionado: {nomeArquivo}</small> : null}
                    <FieldError message={erro} />
                </div>
            </FormGrid>
        </Dialog>
    );
};
