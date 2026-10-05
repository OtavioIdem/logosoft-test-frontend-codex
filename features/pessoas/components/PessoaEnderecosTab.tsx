'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { DataTable } from 'primereact/datatable';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';
import { PessoaEnderecoDialog } from '@/features/pessoas/components/PessoaEnderecoDialog';
import { MunicipioEscolhido, PessoaMunicipioDialog } from '@/features/pessoas/components/PessoaMunicipioDialog';
import {
    cidadeUfLabel,
    enderecoLinhaLabel,
    formatarCepEndereco,
    municipioFiscalLabel,
    PESSOA_ENDERECO_ACOES,
    PESSOA_ENDERECO_EXCLUIR_DIALOG,
    PESSOA_ENDERECO_MUNICIPIO_FISCAL,
    PESSOA_ENDERECO_PRINCIPAL,
    PESSOA_ENDERECOS_ABA,
    PESSOA_ENDERECOS_COLUNAS,
    PESSOA_ENDERECOS_CRIACAO,
    PESSOA_ENDERECOS_ERRO,
    PESSOA_ENDERECOS_INDISPONIVEL,
    PESSOA_ENDERECOS_PERMISSAO,
    PESSOA_ENDERECOS_TOAST,
    PESSOA_ENDERECOS_VAZIO,
    TIPO_ENDERECO_DICA,
    tipoEnderecoLabel
} from '@/features/pessoas/components/pessoaEnderecosLabels';
import { PESSOA_MUNICIPIO_ACAO, PESSOA_MUNICIPIO_INDISPONIVEL, PESSOA_MUNICIPIO_TOAST } from '@/features/pessoas/components/pessoaFiscalLabels';
import { usePessoaEnderecoMutations, usePessoaEnderecos } from '@/features/pessoas/hooks/usePessoaEnderecos';
import { EnderecoPessoaFormValues, EnderecoPessoaResponse } from '@/features/pessoas/types/pessoaEnderecos.types';
import { useAppToast } from '@/hooks/useAppToast';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

type PessoaEnderecosTabProps = {
    /** Vazio na criação da Pessoa: a aba mostra o texto de "salve a pessoa" e não faz nenhuma chamada. */
    pessoaId?: string | null;
    pessoaAtiva: boolean;
    /** Permissões de quem monta o diálogo (o `PessoaFormDialog` as lê com `usePermissions`). */
    podeConsultar: boolean;
    podeGerenciar: boolean;
    /** `PESSOAS_DADOS_FISCAIS_GERENCIAR` (b75, D104): sem ela a ação "Vincular município" nem aparece. */
    podeGerenciarFiscal?: boolean;
    /** `FISCAL_CADASTROS_CONSULTAR`: a busca de município. Sem ela a ação fica indisponível, com o motivo, e não há campo de código livre. */
    podeConsultarCadastrosFiscais?: boolean;
};

type DialogoEndereco = { endereco: EnderecoPessoaResponse | null; primeiro: boolean };
type ErroAcao = { titulo: string; error: ApiError };

const ufValida = (uf?: string | null) => /^[A-Za-z]{2}$/.test((uf ?? '').trim());

export const PessoaEnderecosTab = ({ pessoaId, pessoaAtiva, podeConsultar, podeGerenciar, podeGerenciarFiscal = false, podeConsultarCadastrosFiscais = false }: PessoaEnderecosTabProps) => {
    const toast = useAppToast();
    const listQuery = usePessoaEnderecos(pessoaId, { enabled: podeConsultar });
    const { salvarMutation, principalMutation, excluirMutation, vincularMunicipioMutation } = usePessoaEnderecoMutations(pessoaId);
    const [vinculando, setVinculando] = useState<EnderecoPessoaResponse | null>(null);
    const [erroVinculo, setErroVinculo] = useState<ApiError | null>(null);
    const [dialogo, setDialogo] = useState<DialogoEndereco | null>(null);
    const [erroDialogo, setErroDialogo] = useState<ApiError | null>(null);
    const [erroAcao, setErroAcao] = useState<ErroAcao | null>(null);
    const [excluindo, setExcluindo] = useState<EnderecoPessoaResponse | null>(null);
    const [principalEmAndamento, setPrincipalEmAndamento] = useState<string | null>(null);
    const novoEnderecoRef = useRef<Button>(null);
    const [focarNovoEndereco, setFocarNovoEndereco] = useState(false);
    const salvandoOuExcluindo = salvarMutation.isPending || principalMutation.isPending || excluirMutation.isPending || vincularMunicipioMutation.isPending;

    // QA-04 (b73): depois de excluir, o PrimeReact devolve o foco ao botão da linha que sumiu e ele cai no BODY. O foco
    // vai para "Novo endereço", e só quando o botão voltou a ficar habilitado (a mutação terminou e a lista foi relida).
    useEffect(() => {
        if (!focarNovoEndereco || salvandoOuExcluindo || excluindo) return;
        // No PrimeReact 10.2 a ref do `Button` é o próprio `<button>` (`combinedRefs`), embora o `d.ts` a tipe como `Button`.
        (novoEnderecoRef.current as unknown as HTMLButtonElement | null)?.focus();
        setFocarNovoEndereco(false);
    }, [focarNovoEndereco, salvandoOuExcluindo, excluindo]);

    if (!pessoaId) {
        return (
            <div>
                <Message severity="info" className="w-full" text={PESSOA_ENDERECOS_CRIACAO.texto} />
                <p className="text-color-secondary line-height-3 mb-0">{PESSOA_ENDERECOS_CRIACAO.descricao}</p>
            </div>
        );
    }

    if (!podeConsultar) {
        return <Message severity="warn" className="w-full" text={PESSOA_ENDERECOS_PERMISSAO.semConsultar} />;
    }

    const enderecos = listQuery.data;
    const acoesDisponiveis = podeGerenciar && pessoaAtiva;
    const ocupado = salvarMutation.isPending || principalMutation.isPending || excluirMutation.isPending || vincularMunicipioMutation.isPending;
    const motivoIndisponivel = !podeGerenciar ? PESSOA_ENDERECOS_PERMISSAO.acaoSemGerenciar : !pessoaAtiva ? PESSOA_ENDERECOS_INDISPONIVEL.pessoaInativa : undefined;

    const falhar = (titulo: string, error: unknown) => {
        const apiError = mapApiError(error);
        setErroAcao({ titulo, error: apiError });
        toast.error(titulo, apiError.message);
    };

    const abrirCriacao = () => {
        setErroDialogo(null);
        setErroAcao(null);
        setDialogo({ endereco: null, primeiro: (enderecos ?? []).length === 0 });
    };

    const abrirEdicao = (endereco: EnderecoPessoaResponse) => {
        setErroDialogo(null);
        setErroAcao(null);
        setDialogo({ endereco, primeiro: false });
    };

    const fecharDialogo = () => {
        setDialogo(null);
        setErroDialogo(null);
    };

    // A mutation só resolve depois de reler a lista (`onSettled` aguarda a invalidação): a tela nunca mostra a
    // resposta da mutação no lugar da lista (EP-5/EP-6).
    const salvar = async (values: EnderecoPessoaFormValues) => {
        const endereco = dialogo?.endereco ?? null;
        setErroDialogo(null);
        try {
            await salvarMutation.mutateAsync({ enderecoId: endereco?.id ?? null, values });
            toast.success(endereco ? PESSOA_ENDERECOS_TOAST.atualizado : PESSOA_ENDERECOS_TOAST.criado);
            setDialogo(null);
        } catch (error) {
            setErroDialogo(mapApiError(error));
        }
    };

    // b75 (D104): motivo de a ação "Vincular município" estar desabilitada, sempre visível no title.
    const motivoVincular = (endereco: EnderecoPessoaResponse) =>
        !podeConsultarCadastrosFiscais ? PESSOA_MUNICIPIO_INDISPONIVEL.semBusca : !pessoaAtiva ? PESSOA_ENDERECOS_INDISPONIVEL.pessoaInativa : !ufValida(endereco.uf) ? PESSOA_MUNICIPIO_INDISPONIVEL.semUf : undefined;

    const abrirVinculo = (endereco: EnderecoPessoaResponse) => {
        setErroVinculo(null);
        setErroAcao(null);
        setVinculando(endereco);
    };

    const fecharVinculo = () => {
        setVinculando(null);
        setErroVinculo(null);
    };

    // A mutation só resolve depois de reler a lista de endereços (`onSettled` aguarda a invalidação). O erro do backend
    // (município inativo, inexistente, UF divergente, endereço removido) aparece no diálogo, com code/status/traceId.
    const vincular = async (municipio: MunicipioEscolhido) => {
        const endereco = vinculando;
        if (!endereco) return;
        setErroVinculo(null);
        try {
            await vincularMunicipioMutation.mutateAsync({ enderecoId: endereco.id, municipioIbgeCodigo: municipio.codigoIbge });
            toast.success(PESSOA_MUNICIPIO_TOAST.vinculado(municipio.nome, municipio.ufSigla));
            setVinculando(null);
        } catch (error) {
            setErroVinculo(mapApiError(error));
        }
    };

    const marcarPrincipal = async (endereco: EnderecoPessoaResponse) => {
        setErroAcao(null);
        setPrincipalEmAndamento(endereco.id);
        try {
            await principalMutation.mutateAsync(endereco.id);
            toast.success(PESSOA_ENDERECOS_TOAST.principalDefinido);
        } catch (error) {
            falhar(PESSOA_ENDERECOS_ERRO.tituloPrincipal, error);
        } finally {
            setPrincipalEmAndamento(null);
        }
    };

    const confirmarExclusao = async () => {
        const endereco = excluindo;
        if (!endereco) return;
        const havia = (enderecos ?? []).length;
        setErroAcao(null);
        try {
            await excluirMutation.mutateAsync(endereco.id);
            toast.success(endereco.principal && havia > 1 ? PESSOA_ENDERECOS_TOAST.excluidoPromovido : PESSOA_ENDERECOS_TOAST.excluido);
            setFocarNovoEndereco(true);
        } catch (error) {
            falhar(PESSOA_ENDERECOS_ERRO.tituloExcluir, error);
        }
    };

    const novoEndereco = (
        <Button ref={novoEnderecoRef} type="button" label={PESSOA_ENDERECOS_ABA.novoEndereco} icon="pi pi-plus" size="small" disabled={!acoesDisponiveis || !enderecos || ocupado} title={motivoIndisponivel} onClick={abrirCriacao} />
    );

    const acoes = (row: EnderecoPessoaResponse) => {
        const linha = enderecoLinhaLabel(row);
        return (
            <div className="flex gap-1 justify-content-end">
                <Button type="button" icon="pi pi-pencil" text rounded size="small" aria-label={PESSOA_ENDERECO_ACOES.editarAria(linha)} title={motivoIndisponivel ?? PESSOA_ENDERECO_ACOES.editar} disabled={!acoesDisponiveis || ocupado} onClick={() => abrirEdicao(row)} />
                {podeGerenciarFiscal ? (
                    <Button
                        type="button"
                        icon={PESSOA_MUNICIPIO_ACAO.icone}
                        text
                        rounded
                        size="small"
                        aria-label={row.municipioIbgeId ? PESSOA_MUNICIPIO_ACAO.trocarAria(linha) : PESSOA_MUNICIPIO_ACAO.vincularAria(linha)}
                        title={motivoVincular(row) ?? (row.municipioIbgeId ? PESSOA_MUNICIPIO_ACAO.trocar : PESSOA_MUNICIPIO_ACAO.vincular)}
                        disabled={!acoesDisponiveis || ocupado || Boolean(motivoVincular(row))}
                        onClick={() => abrirVinculo(row)}
                    />
                ) : null}
                <Button
                    type="button"
                    icon={row.principal ? 'pi pi-star-fill' : 'pi pi-star'}
                    text
                    rounded
                    size="small"
                    aria-label={PESSOA_ENDERECO_ACOES.marcarPrincipalAria(linha)}
                    title={motivoIndisponivel ?? (row.principal ? PESSOA_ENDERECOS_INDISPONIVEL.jaPrincipal : PESSOA_ENDERECO_ACOES.marcarPrincipal)}
                    loading={principalEmAndamento === row.id}
                    disabled={!acoesDisponiveis || row.principal || ocupado}
                    onClick={() => marcarPrincipal(row)}
                />
                <Button type="button" icon="pi pi-trash" text rounded size="small" severity="danger" aria-label={PESSOA_ENDERECO_ACOES.excluirAria(linha)} title={motivoIndisponivel ?? PESSOA_ENDERECO_ACOES.excluir} disabled={!acoesDisponiveis || ocupado} onClick={() => setExcluindo(row)} />
            </div>
        );
    };

    const mensagemExclusao = excluindo ? (
        <div className="line-height-3">
            <p className="mt-0">{PESSOA_ENDERECO_EXCLUIR_DIALOG.avisoDefinitivo}</p>
            <p>{PESSOA_ENDERECO_EXCLUIR_DIALOG.avisoEfeito}</p>
            {excluindo.principal ? <p>{PESSOA_ENDERECO_EXCLUIR_DIALOG.avisoPrincipal}</p> : null}
            {(enderecos ?? []).length === 1 ? <p className="mb-0">{PESSOA_ENDERECO_EXCLUIR_DIALOG.avisoUltimo}</p> : null}
        </div>
    ) : null;

    const vazio = listQuery.isSuccess && (enderecos ?? []).length === 0;

    return (
        <div>
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-3">
                <p className="m-0 text-color-secondary line-height-3">{PESSOA_ENDERECOS_ABA.descricao}</p>
                {novoEndereco}
            </div>
            {!podeGerenciar ? <Message severity="info" className="w-full mb-3" text={PESSOA_ENDERECOS_PERMISSAO.somenteLeitura} /> : null}
            {podeGerenciar && !pessoaAtiva ? <Message severity="warn" className="w-full mb-3" text={PESSOA_ENDERECOS_INDISPONIVEL.pessoaInativa} /> : null}
            {podeGerenciarFiscal && !podeConsultarCadastrosFiscais ? <Message severity="info" className="w-full mb-3" text={PESSOA_MUNICIPIO_INDISPONIVEL.avisoTabelaSemBusca} /> : null}

            {erroAcao ? (
                <div className="mb-3">
                    <div className="font-medium mb-2">{erroAcao.titulo}</div>
                    <ApiErrorPanel error={erroAcao.error} title={erroAcao.titulo} />
                    <small className="block text-color-secondary">{PESSOA_ENDERECOS_ERRO.listaDesatualizada}</small>
                </div>
            ) : null}

            {listQuery.isError ? (
                <div className="mb-3">
                    <div className="font-medium mb-2">{PESSOA_ENDERECOS_ERRO.tituloListagem}</div>
                    <ApiErrorPanel error={mapApiError(listQuery.error)} title={PESSOA_ENDERECOS_ERRO.tituloListagem} />
                    <Button type="button" label={PESSOA_ENDERECOS_ERRO.tentarNovamente} icon="pi pi-refresh" size="small" outlined loading={listQuery.isFetching} onClick={() => listQuery.refetch()} />
                </div>
            ) : null}

            {listQuery.isLoading ? <LoadingState variant="table" rows={3} columns={5} /> : null}

            {vazio ? (
                <EmptyState title={PESSOA_ENDERECOS_VAZIO.titulo} description={podeGerenciar ? PESSOA_ENDERECOS_VAZIO.descricao : PESSOA_ENDERECOS_VAZIO.descricaoSemGerenciar} action={<></>} />
            ) : null}

            {enderecos && enderecos.length > 0 ? (
                <div role="region" aria-label={PESSOA_ENDERECOS_ABA.tabelaAria}>
                    <DataTable<EnderecoPessoaResponse[]> value={enderecos} size="small" dataKey="id" loading={listQuery.isFetching} emptyMessage={PESSOA_ENDERECOS_VAZIO.emptyMessage} scrollable>
                        <Column
                            header={PESSOA_ENDERECOS_COLUNAS.principal}
                            body={(row: EnderecoPessoaResponse) => (row.principal ? <Tag value={PESSOA_ENDERECO_PRINCIPAL.marca} severity="success" title={PESSOA_ENDERECO_PRINCIPAL.texto} /> : PESSOA_ENDERECO_PRINCIPAL.naoPrincipal)}
                        />
                        <Column header={PESSOA_ENDERECOS_COLUNAS.tipo} body={(row: EnderecoPessoaResponse) => tipoEnderecoLabel(row.tipo)} />
                        <Column header={PESSOA_ENDERECOS_COLUNAS.endereco} body={(row: EnderecoPessoaResponse) => enderecoLinhaLabel(row)} />
                        <Column header={PESSOA_ENDERECOS_COLUNAS.bairro} field="bairro" />
                        <Column header={PESSOA_ENDERECOS_COLUNAS.cidadeUf} body={(row: EnderecoPessoaResponse) => cidadeUfLabel(row)} />
                        <Column header={PESSOA_ENDERECOS_COLUNAS.cep} body={(row: EnderecoPessoaResponse) => formatarCepEndereco(row.cep)} />
                        <Column
                            header={PESSOA_ENDERECOS_COLUNAS.municipioFiscal}
                            body={(row: EnderecoPessoaResponse) => (
                                <Tag
                                    value={municipioFiscalLabel(row.municipioIbgeId)}
                                    severity={row.municipioIbgeId ? 'success' : 'warning'}
                                    title={row.municipioIbgeId ? PESSOA_ENDERECO_MUNICIPIO_FISCAL.dicaVinculado : podeGerenciarFiscal ? PESSOA_ENDERECO_MUNICIPIO_FISCAL.dicaNaoVinculado : PESSOA_ENDERECO_MUNICIPIO_FISCAL.dicaNaoVinculadoSemPermissao}
                                />
                            )}
                        />
                        {podeGerenciar ? <Column header={PESSOA_ENDERECOS_COLUNAS.acoes} alignHeader="right" frozen alignFrozen="right" body={acoes} /> : null}
                    </DataTable>
                    <small className="block text-color-secondary mt-3 line-height-3">
                        {PESSOA_ENDERECO_PRINCIPAL.marca}: {PESSOA_ENDERECO_PRINCIPAL.texto.toLowerCase()}. {TIPO_ENDERECO_DICA}
                    </small>
                </div>
            ) : null}

            <PessoaEnderecoDialog visible={Boolean(dialogo)} endereco={dialogo?.endereco ?? null} primeiroEndereco={dialogo?.primeiro ?? false} loading={salvarMutation.isPending} error={erroDialogo} onHide={fecharDialogo} onSubmit={salvar} />
            {vinculando ? <PessoaMunicipioDialog endereco={vinculando} loading={vincularMunicipioMutation.isPending} error={erroVinculo} onHide={fecharVinculo} onSubmit={vincular} /> : null}
            <ConfirmDialog
                visible={Boolean(excluindo)}
                onHide={() => setExcluindo(null)}
                header={excluindo ? PESSOA_ENDERECO_EXCLUIR_DIALOG.titulo(enderecoLinhaLabel(excluindo)) : ''}
                message={mensagemExclusao}
                icon="pi pi-exclamation-triangle"
                acceptLabel={PESSOA_ENDERECO_EXCLUIR_DIALOG.confirmLabel}
                rejectLabel={PESSOA_ENDERECO_EXCLUIR_DIALOG.cancelLabel}
                acceptClassName="p-button-danger"
                accept={confirmarExclusao}
            />
        </div>
    );
};
