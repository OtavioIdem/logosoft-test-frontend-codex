'use client';

import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Message } from 'primereact/message';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { SearchSelect } from '@/components/forms/SearchSelect';
import { semSufixoUf, useMunicipioCatalogo } from '@/features/administracao/hooks/useEnderecoFiscalCatalogos';
import { cidadeUfLabel, enderecoLinhaLabel } from '@/features/pessoas/components/pessoaEnderecosLabels';
import { PESSOA_MUNICIPIO_DIALOG, PESSOA_MUNICIPIO_ERRO, PESSOA_MUNICIPIO_INDISPONIVEL, PESSOA_MUNICIPIO_VAZIO } from '@/features/pessoas/components/pessoaFiscalLabels';
import { EnderecoPessoaResponse } from '@/features/pessoas/types/pessoaEnderecos.types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError, SelectOption } from '@/types/erp';

export type MunicipioEscolhido = { codigoIbge: string; nome: string; ufSigla: string };

type PessoaMunicipioDialogProps = {
    /** Endereço cujo município será vinculado. O pai só monta o diálogo com o endereço escolhido (o estado da busca nasce a cada abertura). */
    endereco: EnderecoPessoaResponse;
    loading?: boolean;
    /** Erro da última tentativa de vincular, com code, status e traceId preservados. */
    error?: ApiError | null;
    onHide: () => void;
    onSubmit: (municipio: MunicipioEscolhido) => Promise<void> | void;
};

/**
 * Diálogo aninhado "Vincular município" (b75, D104). A busca é a de `features/administracao` (`useMunicipioCatalogo`):
 * servidor, debounce de 350 ms, `ufSigla` do endereço, 20 por página (o backend limita a 200, PF-15), exige
 * `FISCAL_CADASTROS_CONSULTAR`. O valor da opção é o `codigoIbge`, que o PATCH recebe; não existe campo de código livre.
 */
export const PessoaMunicipioDialog = ({ endereco, loading, error, onHide, onSubmit }: PessoaMunicipioDialogProps) => {
    const uf = (endereco.uf ?? '').trim().toUpperCase();
    const catalogo = useMunicipioCatalogo(uf || null);
    const [termo, setTermo] = useState('');
    const termoBuscado = useDebouncedValue(termo, 350);
    const [escolhido, setEscolhido] = useState<MunicipioEscolhido | null>(null);

    // O termo precisa alimentar tanto a mensagem de vazio quanto o catálogo remoto. Antes, o campo visual mudava,
    // mas o hook permanecia buscando a primeira página sem `termo` (D52).
    const buscar = (valor: string) => {
        setTermo(valor);
        catalogo.buscar(valor);
    };

    // A busca devolve só a primeira página: o escolhido pode sumir dela quando o termo muda, e o campo ficaria vazio
    // com um município ainda selecionado. O merge o mantém na lista.
    const options = useMemo<SelectOption<string>[]>(() => {
        if (!escolhido || catalogo.options.some((option) => option.value === escolhido.codigoIbge)) return catalogo.options;
        return [{ label: escolhido.nome, value: escolhido.codigoIbge }, ...catalogo.options];
    }, [catalogo.options, escolhido]);

    const selecionar = (codigoIbge: string | null) => {
        if (!codigoIbge) {
            setEscolhido(null);
            return;
        }
        const item = catalogo.itens.find((candidato) => candidato.codigoIbge === codigoIbge);
        if (item) {
            setEscolhido({ codigoIbge: item.codigoIbge, nome: semSufixoUf(item.nome, item.ufSigla), ufSigla: item.ufSigla });
        }
    };

    const vincular = async () => {
        if (!escolhido) return;
        await onSubmit(escolhido);
    };

    const jaVinculado = Boolean(endereco.municipioIbgeId);
    const vazio = catalogo.permitido && catalogo.isSuccess && !catalogo.isFetching && catalogo.itens.length === 0;

    const footer = (
        <div className="flex justify-content-end gap-2">
            <Button type="button" label={PESSOA_MUNICIPIO_DIALOG.cancelLabel} icon="pi pi-times" severity="secondary" outlined onClick={onHide} disabled={loading} />
            <Button type="button" label={PESSOA_MUNICIPIO_DIALOG.confirmLabel} icon="pi pi-check" loading={loading} disabled={!escolhido} title={escolhido ? undefined : PESSOA_MUNICIPIO_DIALOG.semSelecao} onClick={vincular} />
        </div>
    );

    return (
        <Dialog header={PESSOA_MUNICIPIO_DIALOG.titulo} visible modal appendTo="self" closable={!loading} style={{ width: 'min(32rem, 96vw)' }} footer={footer} onHide={onHide}>
            <p className="mt-0 mb-3 line-height-3">{PESSOA_MUNICIPIO_DIALOG.contexto(enderecoLinhaLabel(endereco), cidadeUfLabel(endereco))}</p>
            {jaVinculado ? <Message severity="info" className="w-full mb-3" text={PESSOA_MUNICIPIO_DIALOG.jaVinculado} /> : null}
            <ApiErrorPanel error={error} title={PESSOA_MUNICIPIO_ERRO.tituloVincular} />
            {error ? <small className="block text-color-secondary mb-3">{PESSOA_MUNICIPIO_ERRO.listaDesatualizada}</small> : null}
            {!catalogo.permitido ? <Message severity="warn" className="w-full mb-3" text={PESSOA_MUNICIPIO_INDISPONIVEL.semBusca} /> : null}
            <div className="field p-fluid">
                <label htmlFor="pessoaMunicipioBusca" className="font-medium">
                    {PESSOA_MUNICIPIO_DIALOG.campo(uf)}
                    <span className="text-red-500 ml-1" aria-hidden="true">
                        *
                    </span>
                </label>
                <SearchSelect
                    id="pessoaMunicipioBusca"
                    value={escolhido?.codigoIbge ?? null}
                    options={options}
                    onChange={selecionar}
                    onSearch={buscar}
                    placeholder={PESSOA_MUNICIPIO_DIALOG.placeholder}
                    filterPlaceholder={PESSOA_MUNICIPIO_DIALOG.filtroPlaceholder}
                    emptyMessage={PESSOA_MUNICIPIO_VAZIO.emptyMessage}
                    loading={catalogo.isFetching}
                    disabled={!catalogo.permitido || loading}
                    maxLabelLength={48}
                />
                <small className="block text-color-secondary mt-1 line-height-3">{PESSOA_MUNICIPIO_DIALOG.dicaUf(uf)}</small>
                <small className="block text-color-secondary mt-1 line-height-3">{PESSOA_MUNICIPIO_DIALOG.dicaAcento}</small>
                <small className="block text-color-secondary mt-1 line-height-3">{PESSOA_MUNICIPIO_DIALOG.dicaLimite}</small>
            </div>
            {catalogo.isError ? (
                <div className="mb-3">
                    <ApiErrorPanel error={mapApiError(catalogo.error)} title={PESSOA_MUNICIPIO_ERRO.tituloBusca} />
                    <Button type="button" label={PESSOA_MUNICIPIO_ERRO.tentarNovamente} icon="pi pi-refresh" size="small" outlined loading={catalogo.isFetching} onClick={() => void catalogo.refetch()} />
                </div>
            ) : null}
            {vazio ? (
                <div className="mb-3" role="status">
                    <strong className="block">{PESSOA_MUNICIPIO_VAZIO.titulo(uf)}</strong>
                    <span className="block text-color-secondary line-height-3">{PESSOA_MUNICIPIO_VAZIO.descricao(uf, termoBuscado.trim())}</span>
                </div>
            ) : null}
            <small className="block text-color-secondary line-height-3">{PESSOA_MUNICIPIO_DIALOG.dicaNota}</small>
        </Dialog>
    );
};
