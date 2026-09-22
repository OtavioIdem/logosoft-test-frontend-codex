'use client';

import { useEffect, useMemo, useState } from 'react';
import { ZodError } from 'zod';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { EnderecoFiscalCampoErros, EnderecoFiscalCampos, EnderecoFiscalSection } from '@/features/administracao/components/EnderecoFiscalSection';
import { useEnderecoFiscal } from '@/features/administracao/hooks/useEnderecoFiscal';
import { semSufixoUf, useMunicipioCatalogo, useMunicipioResolvidoPorId, useUfCatalogo } from '@/features/administracao/hooks/useEnderecoFiscalCatalogos';
import { definirEnderecoFiscalSchema } from '@/features/administracao/schemas/administracaoSchemas';
import { EnderecoFiscalResponse } from '@/features/administracao/types/administracao.types';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { SelectOption } from '@/types/erp';

type EnderecoFiscalFormSectionProps = {
    resourceKey: 'empresas' | 'filiais';
    registroId: string;
    enderecoFiscal?: EnderecoFiscalResponse | null;
    disabled?: boolean;
};

const camposVazios: EnderecoFiscalCampos = { logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '' };

// `campos.uf` nasce do catálogo (sigla já maiúscula); `enderecoFiscal.uf` vem do response e não tem
// garantia de caixa — normaliza os dois lados antes de comparar (C6, v1.11.0a8b64 Bloco C).
const normalizarUf = (uf?: string | null) => (uf || '').trim().toUpperCase();

const toCampos = (enderecoFiscal?: EnderecoFiscalResponse | null): EnderecoFiscalCampos =>
    enderecoFiscal
        ? {
              logradouro: enderecoFiscal.logradouro ?? '',
              numero: enderecoFiscal.numero ?? '',
              complemento: enderecoFiscal.complemento ?? '',
              bairro: enderecoFiscal.bairro ?? '',
              cidade: enderecoFiscal.cidade ?? '',
              uf: enderecoFiscal.uf ?? '',
              cep: enderecoFiscal.cep ?? ''
          }
        : camposVazios;

/**
 * A busca de município traz só a primeira página do catálogo (D52). Ao editar um endereço já
 * gravado, o município vinculado pode não estar nela — sem este merge o campo apareceria vazio e o
 * operador salvaria por cima de um vínculo que continuava lá (mesmo risco do NcmSelect/CfopSelect em
 * features/tributacao/components/CadastroFiscalSelects.tsx). Recebe uma lista de extras (resolvido
 * pelo backend, e/ou o que o operador acabou de escolher — C5, v1.11.0a8b64 Bloco C) e injeta os que
 * ainda não estão nas opções da busca corrente, sem duplicar entre si.
 */
const comSelecionado = (options: SelectOption<string>[], extras: SelectOption<string>[]) => {
    const vistos = new Set<string>();
    const faltantes = extras.filter((extra) => {
        if (options.some((option) => option.value === extra.value)) return false;
        if (vistos.has(extra.value)) return false;
        vistos.add(extra.value);
        return true;
    });
    if (faltantes.length === 0) return options;
    return [...faltantes, ...options];
};

const fieldErrorMapEnderecoFiscal = (error: ZodError<unknown>): EnderecoFiscalCampoErros => {
    const flattened = error.flatten();
    const fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
    return Object.entries(fieldErrors).reduce<EnderecoFiscalCampoErros>((acc, [field, messages]) => {
        acc[field as keyof EnderecoFiscalCampoErros] = Array.isArray(messages) ? messages[0] : undefined;
        return acc;
    }, {});
};

/**
 * Fecha o contrato de integração documentado no cabeçalho de `EnderecoFiscalSection.tsx`: busca os
 * catálogos de UF/Município, resolve `municipioIbgeId` (Guid do response) para `codigoMunicipioIbge`
 * (string do request) e grava pelos dois endpoints próprios de endereço fiscal — nunca pelo
 * `saveMutation` genérico de Empresa/Filial.
 */
export const EnderecoFiscalFormSection = ({ resourceKey, registroId, enderecoFiscal, disabled }: EnderecoFiscalFormSectionProps) => {
    const runWithToast = useMutationWithToast();
    const { definirMutation, removerMunicipioMutation } = useEnderecoFiscal(resourceKey);

    const [campos, setCampos] = useState<EnderecoFiscalCampos>(() => toCampos(enderecoFiscal));
    const [municipioValue, setMunicipioValue] = useState<string | null>(null);
    const [municipioVinculado, setMunicipioVinculado] = useState(Boolean(enderecoFiscal?.municipioIbgeId));
    // `true` só quando o próprio operador mexeu no campo Município (selecionou outro, ou limpou pelo
    // dropdown/troca de UF) — nunca quando o valor `null` inicial ainda não foi resolvido. É o que
    // separa "o operador limpou" de "a resolução não chegou" no guard de `salvar()` (C1).
    const [municipioAlteradoPeloUsuario, setMunicipioAlteradoPeloUsuario] = useState(false);
    // Rótulo que o operador escolheu na busca — sobrevive a uma nova busca que troque as opções do
    // catálogo (C5): sem isto, digitar outro termo depois de escolher um município faz o Dropdown
    // voltar ao placeholder mesmo com `municipioValue` ainda preenchido.
    const [municipioEscolhidoLabel, setMunicipioEscolhidoLabel] = useState<string | null>(null);
    const [errors, setErrors] = useState<EnderecoFiscalCampoErros>({});

    useEffect(() => {
        setCampos(toCampos(enderecoFiscal));
        setMunicipioValue(null);
        setMunicipioVinculado(Boolean(enderecoFiscal?.municipioIbgeId));
        setMunicipioAlteradoPeloUsuario(false);
        setMunicipioEscolhidoLabel(null);
        setErrors({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registroId]);

    const ufCatalogo = useUfCatalogo();
    const municipioCatalogo = useMunicipioCatalogo(campos.uf || null);
    const municipioResolvido = useMunicipioResolvidoPorId(enderecoFiscal?.uf ?? null, enderecoFiscal?.municipioIbgeId ?? null, enderecoFiscal?.cidade ?? null);

    // A resolução é chaveada na UF de origem do registro (`enderecoFiscal.uf`), não na UF corrente do
    // formulário. Se o operador troca a UF antes de ela chegar, o município que ela resolve pertence à
    // UF antiga — usá-lo agora manda `codigoMunicipioIbge` de uma UF para o PUT de outra (C6,
    // v1.11.0a8b64 Bloco C). Vale tanto para o auto-preenchimento quanto para a opção extra do dropdown.
    const resolucaoNaUfAtual = normalizarUf(campos.uf) === normalizarUf(enderecoFiscal?.uf);

    useEffect(() => {
        // Só preenche a partir da resolução automática enquanto o operador não tiver tocado no campo, e
        // só enquanto o formulário continuar na UF em que a resolução foi buscada — depois que ele mexe
        // (mesmo para limpar de propósito) ou troca a UF, a resolução que chega depois não pode
        // reescrever por cima da escolha dele nem trazer município de outra UF.
        if (municipioAlteradoPeloUsuario || !resolucaoNaUfAtual) return;
        if (municipioResolvido.municipio) {
            setMunicipioValue((current) => current ?? (municipioResolvido.municipio ? municipioResolvido.municipio.codigoIbge : null));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [municipioResolvido.municipio, municipioAlteradoPeloUsuario, resolucaoNaUfAtual]);

    const municipioExtras = useMemo<SelectOption<string>[]>(() => {
        const extras: SelectOption<string>[] = [];
        if (municipioResolvido.municipio && resolucaoNaUfAtual) {
            extras.push({ value: municipioResolvido.municipio.codigoIbge, label: semSufixoUf(municipioResolvido.municipio.nome, municipioResolvido.municipio.ufSigla) });
        }
        if (municipioValue && municipioEscolhidoLabel) {
            extras.push({ value: municipioValue, label: municipioEscolhidoLabel });
        }
        return extras;
    }, [municipioResolvido.municipio, resolucaoNaUfAtual, municipioValue, municipioEscolhidoLabel]);

    const municipioOptions = useMemo(() => comSelecionado(municipioCatalogo.options, municipioExtras), [municipioCatalogo.options, municipioExtras]);

    const handleSelecionarMunicipio = (codigo: string | null) => {
        setMunicipioAlteradoPeloUsuario(true);
        setMunicipioValue(codigo);
        setMunicipioEscolhidoLabel(codigo ? (municipioOptions.find((opcao) => opcao.value === codigo)?.label ?? null) : null);
        setErrors((current) => (current.codigoMunicipioIbge ? { ...current, codigoMunicipioIbge: undefined } : current));
    };

    const handleCamposChange = (patch: Partial<EnderecoFiscalCampos>) => {
        setCampos((current) => ({ ...current, ...patch }));
        setErrors((current) => {
            const campoAlterado = (Object.keys(patch) as (keyof EnderecoFiscalCampos)[]).some((campo) => current[campo]);
            if (!campoAlterado) return current;
            const proximo = { ...current };
            (Object.keys(patch) as (keyof EnderecoFiscalCampos)[]).forEach((campo) => {
                delete proximo[campo];
            });
            return proximo;
        });
    };

    const salvar = async () => {
        // Nunca `codigoMunicipioIbge: null` no PUT para desfazer um vínculo já gravado — isso é
        // suposição sobre semântica que o backend não declarou. A remoção é o DELETE próprio,
        // acionado pelo botão de lixeira (armadilha 3 do plano v1.11.0a8b64).
        if (municipioVinculado && !municipioValue) {
            if (municipioAlteradoPeloUsuario) {
                setErrors({ codigoMunicipioIbge: 'Remova o vínculo do município pelo botão antes de salvar sem município, ou selecione outro.' });
                return;
            }

            // A UF mudou desde que o vínculo foi gravado (ou desde que a resolução começou a buscar) —
            // o município antigo pertence à UF anterior e não se aplica mais à UF atual do formulário.
            // Diferente dos ramos abaixo, aqui a intenção de mudar de UF já é do operador, então citar o
            // botão de remoção é correto (C6, v1.11.0a8b64 Bloco C) — é o único ramo "resolução não
            // chegou" em que isso vale.
            if (!resolucaoNaUfAtual) {
                setErrors({ codigoMunicipioIbge: 'A UF mudou: o município vinculado pertencia à UF anterior e não se aplica mais. Selecione um município da UF atual, ou remova o vínculo pelo botão antes de salvar.' });
                return;
            }

            // O campo ainda está `null` porque a resolução do município já vinculado
            // (useMunicipioResolvidoPorId) não chegou — nunca porque o operador limpou o campo.
            // Bloquear com a mensagem de "remover" aqui mandaria clicar na lixeira, que dispara o
            // DELETE de verdade (C1, v1.11.0a8b64 Bloco C).
            if (!municipioResolvido.permitido) {
                setErrors({ codigoMunicipioIbge: 'Não foi possível confirmar o município já vinculado a este endereço: falta a permissão FISCAL_CADASTROS_CONSULTAR para editar um endereço que já tem município.' });
                return;
            }

            if (municipioResolvido.status === 'pendente') {
                setErrors({ codigoMunicipioIbge: 'O vínculo do município ainda está sendo carregado. Aguarde e tente salvar novamente.' });
                return;
            }

            setErrors({ codigoMunicipioIbge: 'Não foi possível confirmar o município já vinculado a este endereço. Tente novamente mais tarde.' });
            return;
        }

        const parsed = definirEnderecoFiscalSchema.safeParse({ ...campos, codigoMunicipioIbge: municipioValue });
        if (!parsed.success) {
            setErrors(fieldErrorMapEnderecoFiscal(parsed.error));
            return;
        }

        setErrors({});
        await runWithToast(() => definirMutation.mutateAsync({ id: registroId, values: parsed.data }), {
            success: { summary: 'Endereço fiscal gravado' },
            error: { summary: 'Erro ao gravar endereço fiscal' }
        });
    };

    const removerMunicipio = async () => {
        await runWithToast(
            async () => {
                await removerMunicipioMutation.mutateAsync(registroId);
                setMunicipioValue(null);
                setMunicipioVinculado(false);
                setMunicipioAlteradoPeloUsuario(false);
                setMunicipioEscolhidoLabel(null);
            },
            { success: { summary: 'Vínculo de município removido' }, error: { summary: 'Erro ao remover o vínculo do município' } }
        );
    };

    return (
        <div className="mt-3">
            <EnderecoFiscalSection
                value={campos}
                onChange={handleCamposChange}
                errors={errors}
                disabled={disabled || definirMutation.isPending}
                estaCompleto={enderecoFiscal?.estaCompleto}
                ufOptions={ufCatalogo.options}
                ufLoading={ufCatalogo.isFetching}
                onSearchUf={ufCatalogo.buscar}
                municipioValue={municipioValue}
                municipioOptions={municipioOptions}
                municipioLoading={municipioCatalogo.isFetching || municipioResolvido.isFetching}
                onSearchMunicipio={municipioCatalogo.buscar}
                onSelecionarMunicipio={handleSelecionarMunicipio}
                municipioVinculado={municipioVinculado}
                onRemoverMunicipio={removerMunicipio}
                removendoMunicipio={removerMunicipioMutation.isPending}
            />
            {!ufCatalogo.permitido ? <Message className="w-full mb-3" severity="warn" text="Consulta de cadastros fiscais indisponível: seu usuário não possui FISCAL_CADASTROS_CONSULTAR." /> : null}
            <div className="flex justify-content-end">
                <Button type="button" label="Salvar endereço fiscal" icon="pi pi-save" outlined loading={definirMutation.isPending} disabled={disabled} onClick={salvar} />
            </div>
        </div>
    );
};
