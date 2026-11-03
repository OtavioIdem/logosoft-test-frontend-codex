'use client';

// Hooks React Query da fatia Configuração fiscal e certificados (v1.11.0a8b81, D112). Segue `useSeriesFiscais.ts`:
// `queryKey` exportada como função e mutação invalidando a família afetada.
//
// As rotas NÃO recebem empresa (vem do token), então a chave carrega o escopo organizacional + a empresa do
// usuário: troca de empresa no contexto nunca serve o cache de outra. 4xx não é repetido (`retry: false`): 404 de
// "não configurada" já volta como `null` e 400/409 são resposta definitiva.
//
// Segredo: o thumbprint completo só existe no formulário de cadastro. A mutação de cadastro recebe uma "caixa" que
// é zerada dentro da `mutationFn` ao ser consumida, a mutação roda com `gcTime: 0` e a tela chama `reset()` após
// sucesso e falha; e NENHUM
// `setQueryData` recebe dado do formulário -- a lista é sempre refeita pela resposta do backend (mascarada).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configuracaoFiscalApi } from '@/features/fiscal/api/configuracaoFiscalApi';

const CONFIGURACAO_FISCAL_ROOT_KEY = ['fiscal', 'configuracao'] as const;

export type ConfiguracaoFiscalEscopo = { organizationalScopeKey: string; usuarioEmpresaId: string | null };

export const configuracaoFiscalEmpresaQueryKey = (escopo: ConfiguracaoFiscalEscopo) => [...CONFIGURACAO_FISCAL_ROOT_KEY, 'empresa', escopo.organizationalScopeKey, escopo.usuarioEmpresaId] as const;

export const configuracaoFiscalFilialQueryKey = (escopo: ConfiguracaoFiscalEscopo, filialId?: string | null) =>
    [...CONFIGURACAO_FISCAL_ROOT_KEY, 'filial', escopo.organizationalScopeKey, escopo.usuarioEmpresaId, filialId ?? null] as const;

export const certificadosDigitaisQueryKey = (escopo: ConfiguracaoFiscalEscopo, somenteAtivos: boolean) =>
    [...CONFIGURACAO_FISCAL_ROOT_KEY, 'certificados', escopo.organizationalScopeKey, escopo.usuarioEmpresaId, somenteAtivos] as const;

export const useConfiguracaoFiscalEmpresa = (escopo: ConfiguracaoFiscalEscopo, habilitado: boolean) =>
    useQuery({
        queryKey: configuracaoFiscalEmpresaQueryKey(escopo),
        queryFn: () => configuracaoFiscalApi.obterEmpresa(),
        enabled: habilitado,
        retry: false
    });

export const useConfiguracaoFiscalFilial = (escopo: ConfiguracaoFiscalEscopo, filialId: string | null, habilitado: boolean) =>
    useQuery({
        queryKey: configuracaoFiscalFilialQueryKey(escopo, filialId),
        queryFn: () => configuracaoFiscalApi.obterFilial(filialId as string),
        enabled: habilitado && Boolean(filialId),
        retry: false
    });

export const useCertificadosDigitais = (escopo: ConfiguracaoFiscalEscopo, somenteAtivos: boolean, habilitado: boolean) =>
    useQuery({
        queryKey: certificadosDigitaisQueryKey(escopo, somenteAtivos),
        queryFn: () => configuracaoFiscalApi.listarCertificados({ somenteAtivos: somenteAtivos ? true : undefined }),
        enabled: habilitado,
        retry: false
    });

/** Caixa de uma só leitura: a `mutationFn` tira o valor dela e a zera ao consumi-lo. */
export type CaixaDeUmaLeitura = { valores: unknown };

export const useConfiguracaoFiscalMutations = () => {
    const queryClient = useQueryClient();
    // `onSettled` invalida a família inteira mesmo em falha: depois de 409 a tela precisa do dado atual.
    const invalidar = () => queryClient.invalidateQueries({ queryKey: CONFIGURACAO_FISCAL_ROOT_KEY });

    const salvarEmpresaMutation = useMutation({
        mutationFn: (values: unknown) => configuracaoFiscalApi.salvarEmpresa(values),
        onSettled: invalidar
    });

    const inativarEmpresaMutation = useMutation({
        mutationFn: (values: unknown) => configuracaoFiscalApi.inativarEmpresa(values),
        onSettled: invalidar
    });

    const reativarEmpresaMutation = useMutation({
        mutationFn: (values: unknown) => configuracaoFiscalApi.reativarEmpresa(values),
        onSettled: invalidar
    });

    const salvarFilialMutation = useMutation({
        mutationFn: ({ filialId, values }: { filialId: string; values: unknown }) => configuracaoFiscalApi.salvarFilial(filialId, values),
        onSettled: invalidar
    });

    const cadastrarCertificadoMutation = useMutation({
        gcTime: 0,
        mutationFn: (caixa: CaixaDeUmaLeitura) => {
            const valores = caixa.valores;
            caixa.valores = null;
            return configuracaoFiscalApi.cadastrarCertificado(valores);
        },
        onSettled: invalidar
    });

    const inativarCertificadoMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: unknown }) => configuracaoFiscalApi.inativarCertificado(id, values),
        onSettled: invalidar
    });

    const verificarCertificadoMutation = useMutation({
        mutationFn: (id: string) => configuracaoFiscalApi.verificarCertificado(id)
    });

    return {
        salvarEmpresaMutation,
        inativarEmpresaMutation,
        reativarEmpresaMutation,
        salvarFilialMutation,
        cadastrarCertificadoMutation,
        inativarCertificadoMutation,
        verificarCertificadoMutation
    };
};
