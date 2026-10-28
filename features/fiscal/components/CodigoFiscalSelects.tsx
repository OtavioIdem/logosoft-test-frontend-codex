'use client';

// Selects de NCM, CEST e origem da mercadoria do bloco fiscal do produto (v1.11.0a8b77). Diferente de `NcmSelect`
// (value = id do cadastro), aqui o `value` é o CÓDIGO: o backend resolve o produto pelo código
// (`ProdutoDadosFiscaisResolver`) e o payload continua `ncmCodigo`, `cestCodigo` e `origemMercadoriaCodigo`.
//
// Guarda por campo (D61): sem `FISCAL_CADASTROS_CONSULTAR` desabilita só o campo e avisa; o código já gravado
// continua visível (merge por código), porque a lista nunca contém tudo. Falha de consulta aparece com nova tentativa.

import { useMemo, useState } from 'react';
import { Message } from 'primereact/message';
import { SearchSelect } from '@/components/forms/SearchSelect';
import { CadastroFiscalSelectBuscaErro } from '@/features/fiscal/components/CadastroFiscalSelectBuscaErro';
import { useCestPorNcm, useNcmOptions, useOrigensMercadoria } from '@/features/fiscal/hooks/useCadastrosFiscais';
import { SelectOption } from '@/types/erp';

export const CODIGO_FISCAL_SEM_PERMISSAO = 'Consulta de cadastros fiscais indisponível: seu usuário não possui FISCAL_CADASTROS_CONSULTAR.';

/** A consulta traz só a página corrente: sem este merge, o código já gravado sumiria do campo (rótulo = o próprio código). */
export const comCodigoSelecionado = (options: SelectOption<string>[], codigoAtual?: string | null): SelectOption<string>[] => {
    if (!codigoAtual || options.some((option) => option.value === codigoAtual)) return options;
    return [{ label: codigoAtual, value: codigoAtual }, ...options];
};

type CodigoSelectProps = {
    id?: string;
    value?: string | null;
    onChange: (codigo: string | null) => void;
    disabled?: boolean;
};

export const NcmCodigoSelect = ({ id, value, onChange, disabled }: CodigoSelectProps) => {
    const [termo, setTermo] = useState('');
    const consulta = useNcmOptions(termo || null);
    const options = useMemo(() => comCodigoSelecionado(consulta.itens.map((item) => ({ label: `${item.codigo} — ${item.descricao}`, value: item.codigo })), value), [consulta.itens, value]);

    return (
        <>
            <SearchSelect
                id={id}
                ariaLabel="NCM"
                value={value ?? null}
                options={options}
                onChange={onChange}
                onSearch={setTermo}
                placeholder="Buscar NCM"
                filterPlaceholder="Código ou descrição do NCM"
                emptyMessage={consulta.permitido ? 'Nenhum NCM encontrado.' : CODIGO_FISCAL_SEM_PERMISSAO}
                loading={consulta.isBuscando}
                disabled={disabled || !consulta.permitido}
                maxLabelLength={40}
            />
            <CadastroFiscalSelectBuscaErro error={consulta.error} mensagem="Não foi possível buscar os NCMs. Tente novamente." fetching={consulta.isFetching} onRetry={() => void consulta.refetch()} />
            {!consulta.permitido ? <Message className="w-full mt-2" severity="warn" text={CODIGO_FISCAL_SEM_PERMISSAO} /> : null}
        </>
    );
};

export const CestCodigoSelect = ({ id, ncmCodigo, value, onChange, disabled }: CodigoSelectProps & { ncmCodigo?: string | null }) => {
    const consulta = useCestPorNcm(ncmCodigo);
    const options = useMemo(() => comCodigoSelecionado(consulta.options, value), [consulta.options, value]);
    const semNcm = !ncmCodigo;
    // Sem vínculo o campo só fica habilitado se houver um CEST gravado, para o operador conseguir limpá-lo.
    const bloqueado = disabled || !consulta.permitido || semNcm || (consulta.semVinculos && !value);

    const emptyMessage = !consulta.permitido ? CODIGO_FISCAL_SEM_PERMISSAO : semNcm ? 'Selecione o NCM.' : consulta.semVinculos ? 'Este NCM não exige CEST.' : 'Nenhum CEST encontrado para este NCM.';

    return (
        <>
            <SearchSelect
                id={id}
                ariaLabel="CEST"
                value={value ?? null}
                options={options}
                onChange={onChange}
                placeholder={semNcm ? 'Selecione o NCM' : 'Selecionar CEST'}
                filterPlaceholder="Código ou descrição do CEST"
                emptyMessage={emptyMessage}
                loading={consulta.isFetching || consulta.descricoesCarregando}
                disabled={bloqueado}
                maxLabelLength={40}
            />
            <CadastroFiscalSelectBuscaErro error={consulta.error} mensagem="Não foi possível consultar os CESTs do NCM. Tente novamente." fetching={consulta.isFetching} onRetry={() => void consulta.refetch()} />
            {consulta.permitido && semNcm ? <small className="text-color-secondary block mt-1">Selecione o NCM para listar os CESTs.</small> : null}
            {consulta.permitido && consulta.semVinculos ? <small className="text-color-secondary block mt-1">Este NCM não exige CEST.</small> : null}
            {consulta.permitido && consulta.exigeCest ? <small className="text-color-secondary block mt-1">Este NCM possui CEST vinculado: informe um deles.</small> : null}
            {consulta.permitido && consulta.parcial ? <small className="p-error block mt-1">A lista de CESTs deste NCM está incompleta ({consulta.codigos.length} de {consulta.data?.totalItems}).</small> : null}
            {!consulta.permitido ? <Message className="w-full mt-2" severity="warn" text={CODIGO_FISCAL_SEM_PERMISSAO} /> : null}
        </>
    );
};

export const OrigemMercadoriaSelect = ({ id, value, onChange, disabled }: CodigoSelectProps) => {
    const consulta = useOrigensMercadoria();
    const options = useMemo(() => comCodigoSelecionado(consulta.options, value), [consulta.options, value]);

    return (
        <>
            <SearchSelect
                id={id}
                ariaLabel="Origem da mercadoria"
                value={value ?? null}
                options={options}
                onChange={onChange}
                placeholder="Selecionar origem"
                filterPlaceholder="Código ou descrição da origem"
                emptyMessage={consulta.permitido ? 'Nenhuma origem encontrada.' : CODIGO_FISCAL_SEM_PERMISSAO}
                loading={consulta.isFetching}
                disabled={disabled || !consulta.permitido}
                maxLabelLength={40}
            />
            <CadastroFiscalSelectBuscaErro error={consulta.error} mensagem="Não foi possível carregar as origens da mercadoria. Tente novamente." fetching={consulta.isFetching} onRetry={() => void consulta.refetch()} />
            {!consulta.permitido ? <Message className="w-full mt-2" severity="warn" text={CODIGO_FISCAL_SEM_PERMISSAO} /> : null}
        </>
    );
};
