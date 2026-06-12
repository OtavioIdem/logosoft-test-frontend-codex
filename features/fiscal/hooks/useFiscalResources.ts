'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fiscalApi } from '@/features/fiscal/api/fiscalApi';
import { NotaFiscalListQuery } from '@/features/fiscal/types/fiscal.types';

export const notasFiscaisQueryKey = (query?: NotaFiscalListQuery) => ['fiscal', 'notas-fiscais', query] as const;
export const notaFiscalQueryKey = (id?: string | null) => ['fiscal', 'nota-fiscal', id] as const;
export const notaFiscalResumoQueryKey = (id?: string | null) => ['fiscal', 'nota-fiscal', id, 'resumo'] as const;
export const notaFiscalWorkflowQueryKey = (id?: string | null) => ['fiscal', 'nota-fiscal', id, 'workflow'] as const;
export const notaFiscalIntegracoesQueryKey = (id?: string | null) => ['fiscal', 'nota-fiscal', id, 'integracoes'] as const;
export const observabilidadeFiscalQueryKey = (query?: { empresaId?: string | null; filialId?: string | null; registradoApos?: string | null; take?: number | null }) => ['fiscal', 'observabilidade', query] as const;
export const historicoStatusServicoFiscalQueryKey = (query?: { empresaId?: string | null; filialId?: string | null; take?: number | null }) => ['fiscal', 'sefaz', 'status-servico', 'historico', query] as const;
export const historicoContingenciaFiscalQueryKey = (query?: { empresaId?: string | null; filialId?: string | null; take?: number | null }) => ['fiscal', 'sefaz', 'contingencia', 'historico', query] as const;

export const useNotasFiscais = (query: NotaFiscalListQuery = {}) =>
    useQuery({
        queryKey: notasFiscaisQueryKey(query),
        queryFn: () => fiscalApi.listarNotas(query),
        enabled: Boolean(query.empresaId)
    });

export const useNotaFiscal = (id?: string | null) =>
    useQuery({
        queryKey: notaFiscalQueryKey(id),
        queryFn: () => fiscalApi.buscarNota(id ?? ''),
        enabled: Boolean(id)
    });

export const useNotaFiscalResumo = (id?: string | null) =>
    useQuery({
        queryKey: notaFiscalResumoQueryKey(id),
        queryFn: () => fiscalApi.buscarResumo(id ?? ''),
        enabled: Boolean(id)
    });

export const useNotaFiscalWorkflow = (id?: string | null) =>
    useQuery({
        queryKey: notaFiscalWorkflowQueryKey(id),
        queryFn: () => fiscalApi.buscarWorkflow(id ?? ''),
        enabled: Boolean(id)
    });

export const useNotaFiscalIntegracoes = (id?: string | null) =>
    useQuery({
        queryKey: notaFiscalIntegracoesQueryKey(id),
        queryFn: () => fiscalApi.buscarIntegracoes(id ?? ''),
        enabled: Boolean(id)
    });

export const useObservabilidadeFiscal = (query: { empresaId?: string | null; filialId?: string | null; registradoApos?: string | null; take?: number | null }) =>
    useQuery({
        queryKey: observabilidadeFiscalQueryKey(query),
        queryFn: () => fiscalApi.buscarObservabilidade(query),
        enabled: Boolean(query.empresaId)
    });

export const useHistoricoStatusServicoFiscal = (query: { empresaId?: string | null; filialId?: string | null; take?: number | null }) =>
    useQuery({
        queryKey: historicoStatusServicoFiscalQueryKey(query),
        queryFn: () => fiscalApi.listarHistoricoStatusServico(query),
        enabled: Boolean(query.empresaId)
    });

export const useHistoricoContingenciaFiscal = (query: { empresaId?: string | null; filialId?: string | null; take?: number | null }) =>
    useQuery({
        queryKey: historicoContingenciaFiscalQueryKey(query),
        queryFn: () => fiscalApi.listarHistoricoContingencia(query),
        enabled: Boolean(query.empresaId)
    });

export const useFiscalMutations = () => {
    const queryClient = useQueryClient();
    const invalidateNota = (id?: string | null) => {
        queryClient.invalidateQueries({ queryKey: ['fiscal', 'notas-fiscais'] });
        if (id) {
            queryClient.invalidateQueries({ queryKey: notaFiscalQueryKey(id) });
            queryClient.invalidateQueries({ queryKey: notaFiscalResumoQueryKey(id) });
            queryClient.invalidateQueries({ queryKey: notaFiscalWorkflowQueryKey(id) });
            queryClient.invalidateQueries({ queryKey: notaFiscalIntegracoesQueryKey(id) });
        }
    };

    const criarNotaMutation = useMutation({ mutationFn: (values: unknown) => fiscalApi.criarNota(values), onSuccess: (nota) => invalidateNota(nota.id) });
    const gerarNotaPedidoMutation = useMutation({ mutationFn: (values: unknown) => fiscalApi.gerarNotaDePedidoVenda(values), onSuccess: (result) => invalidateNota(result.notaFiscal.id) });
    const adicionarItemMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.adicionarItem(id, values), onSuccess: (nota) => invalidateNota(nota.id) });
    const adicionarImpostoMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.adicionarImposto(id, values), onSuccess: (nota) => invalidateNota(nota.id) });
    const armazenarXmlMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.armazenarXml(id, values), onSuccess: (nota) => invalidateNota(nota.id) });
    const validarMutation = useMutation({ mutationFn: (id: string) => fiscalApi.validar(id), onSuccess: (nota) => invalidateNota(nota.id) });
    const gerarXmlMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.gerarXmlEnvio(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const assinarXmlMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.assinarXmlEnvio(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const transmitirMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.transmitirSefaz(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const reprocessarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.reprocessarSefaz(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const consultarProtocoloMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.consultarProtocoloSefaz(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const statusServicoMutation = useMutation({ mutationFn: (values: unknown) => fiscalApi.consultarStatusServico(values), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal', 'observabilidade'] }); queryClient.invalidateQueries({ queryKey: ['fiscal', 'sefaz', 'status-servico'] }); } });
    const avaliarContingenciaMutation = useMutation({ mutationFn: (values: unknown) => fiscalApi.avaliarContingencia(values), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fiscal', 'observabilidade'] }); queryClient.invalidateQueries({ queryKey: ['fiscal', 'sefaz', 'contingencia'] }); } });
    const habilitarContingenciaMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.habilitarContingencia(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const registrarRejeicaoMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.registrarRejeicao(id, values), onSuccess: (nota) => invalidateNota(nota.id) });
    const cancelarMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.cancelar(id, values), onSuccess: (nota) => invalidateNota(nota.id) });
    const cancelarSefazMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.cancelarSefaz(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const cartaCorrecaoMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.emitirCartaCorrecao(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const gerarDanfeMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.gerarDanfe(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const baixarEstoqueMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.baixarEstoque(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const gerarContaReceberMutation = useMutation({ mutationFn: ({ id, values }: { id: string; values: unknown }) => fiscalApi.gerarContaReceber(id, values), onSuccess: (result) => invalidateNota(result.notaFiscalId) });
    const inutilizarMutation = useMutation({
        mutationFn: (values: unknown) => fiscalApi.inutilizarNumeracao(values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fiscal', 'observabilidade'] });
            queryClient.invalidateQueries({ queryKey: ['fiscal', 'sefaz'] });
            queryClient.invalidateQueries({ queryKey: ['fiscal', 'notas-fiscais'] });
        }
    });
    const exportarCsvMutation = useMutation({ mutationFn: (values: Parameters<typeof fiscalApi.exportarNotasCsv>[0]) => fiscalApi.exportarNotasCsv(values) });

    return {
        criarNotaMutation,
        gerarNotaPedidoMutation,
        adicionarItemMutation,
        adicionarImpostoMutation,
        armazenarXmlMutation,
        validarMutation,
        gerarXmlMutation,
        assinarXmlMutation,
        transmitirMutation,
        reprocessarMutation,
        consultarProtocoloMutation,
        statusServicoMutation,
        avaliarContingenciaMutation,
        habilitarContingenciaMutation,
        registrarRejeicaoMutation,
        cancelarMutation,
        cancelarSefazMutation,
        cartaCorrecaoMutation,
        gerarDanfeMutation,
        baixarEstoqueMutation,
        gerarContaReceberMutation,
        inutilizarMutation,
        exportarCsvMutation
    };
};
