import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    atualizarCondicaoPagamentoSchema,
    atualizarFormaPagamentoSchema,
    cancelarContaFinanceiraSchema,
    criarCondicaoPagamentoSchema,
    criarContaPagarSchema,
    criarContaReceberSchema,
    criarFormaPagamentoSchema,
    estornarPagamentoSchema,
    estornarRecebimentoSchema,
    fluxoCaixaQuerySchema,
    gerarContaReceberPedidoSchema,
    pagarContaSchema,
    receberContaSchema
} from '@/features/financeiro/schemas/financeiroSchemas';
import {
    AtualizarCondicaoPagamentoRequest,
    AtualizarFormaPagamentoRequest,
    CancelarContaFinanceiraRequest,
    CondicaoPagamentoResponse,
    ContaPagarResponse,
    ContaReceberResponse,
    CriarCondicaoPagamentoRequest,
    CriarContaPagarRequest,
    CriarContaReceberRequest,
    CriarFormaPagamentoRequest,
    EstornarPagamentoRequest,
    EstornarRecebimentoRequest,
    FinanceiroListQuery,
    FluxoCaixaQuery,
    FormaPagamentoResponse,
    GerarContaReceberPedidoRequest,
    PagarContaRequest,
    ReceberContaRequest
} from '@/features/financeiro/types/financeiro.types';

type Schema<T> = { parse: (value: unknown) => T };

const runFinanceiroRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: FinanceiroListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, clienteId: query?.clienteId, fornecedorId: query?.fornecedorId, participanteId: query?.participanteId, status: query?.status, dataInicial: query?.dataInicial, dataFinal: query?.dataFinal, page: query?.page, pageSize: query?.pageSize });

export const buildCriarFormaPagamentoPayload = (values: unknown): CriarFormaPagamentoRequest => parseSchema(criarFormaPagamentoSchema, values);
export const buildAtualizarFormaPagamentoPayload = (values: unknown): AtualizarFormaPagamentoRequest => parseSchema(atualizarFormaPagamentoSchema, values);
export const buildCriarCondicaoPagamentoPayload = (values: unknown): CriarCondicaoPagamentoRequest => parseSchema(criarCondicaoPagamentoSchema, values);
export const buildAtualizarCondicaoPagamentoPayload = (values: unknown): AtualizarCondicaoPagamentoRequest => parseSchema(atualizarCondicaoPagamentoSchema, values);
export const buildCriarContaReceberPayload = (values: unknown): CriarContaReceberRequest => parseSchema(criarContaReceberSchema, values);
export const buildGerarContaReceberPedidoPayload = (values: unknown): GerarContaReceberPedidoRequest => parseSchema(gerarContaReceberPedidoSchema, values);
export const buildReceberContaPayload = (values: unknown): ReceberContaRequest => parseSchema(receberContaSchema, values);
export const buildEstornarRecebimentoPayload = (values: unknown): EstornarRecebimentoRequest => parseSchema(estornarRecebimentoSchema, values);
export const buildCancelarContaFinanceiraPayload = (motivo: string): CancelarContaFinanceiraRequest => parseSchema(cancelarContaFinanceiraSchema, { motivo });
export const buildCriarContaPagarPayload = (values: unknown): CriarContaPagarRequest => parseSchema(criarContaPagarSchema, values);
export const buildPagarContaPayload = (values: unknown): PagarContaRequest => parseSchema(pagarContaSchema, values);
export const buildEstornarPagamentoPayload = (values: unknown): EstornarPagamentoRequest => parseSchema(estornarPagamentoSchema, values);
export const buildFluxoCaixaQuery = (values: unknown): FluxoCaixaQuery => parseSchema(fluxoCaixaQuerySchema, values);

export const financeiroApi = {
    async listarFormasPagamento(query?: Pick<FinanceiroListQuery, 'empresaId'>) {
        return runFinanceiroRequest(async () => {
            const response = await httpClient.get<FormaPagamentoResponse[]>('/api/financeiro/formas-pagamento', { params: cleanQueryParams({ empresaId: query?.empresaId }) });
            return response.data;
        });
    },
    async criarFormaPagamento(values: unknown) {
        const payload = buildCriarFormaPagamentoPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<FormaPagamentoResponse>('/api/financeiro/formas-pagamento', payload);
            return response.data;
        });
    },
    async atualizarFormaPagamento(id: string, values: unknown) {
        const payload = buildAtualizarFormaPagamentoPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.put<FormaPagamentoResponse>(`/api/financeiro/formas-pagamento/${id}`, payload);
            return response.data;
        });
    },
    async inativarFormaPagamento(id: string, motivo: string) {
        const payload = buildCancelarContaFinanceiraPayload(motivo);
        return runFinanceiroRequest(async () => {
            await httpClient.post<void>(`/api/financeiro/formas-pagamento/${id}/inativar`, payload);
        });
    },
    async listarCondicoesPagamento(query?: Pick<FinanceiroListQuery, 'empresaId'>) {
        return runFinanceiroRequest(async () => {
            const response = await httpClient.get<CondicaoPagamentoResponse[]>('/api/financeiro/condicoes-pagamento', { params: cleanQueryParams({ empresaId: query?.empresaId }) });
            return response.data;
        });
    },
    async criarCondicaoPagamento(values: unknown) {
        const payload = buildCriarCondicaoPagamentoPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<CondicaoPagamentoResponse>('/api/financeiro/condicoes-pagamento', payload);
            return response.data;
        });
    },
    async atualizarCondicaoPagamento(id: string, values: unknown) {
        const payload = buildAtualizarCondicaoPagamentoPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.put<CondicaoPagamentoResponse>(`/api/financeiro/condicoes-pagamento/${id}`, payload);
            return response.data;
        });
    },
    async inativarCondicaoPagamento(id: string, motivo: string) {
        const payload = buildCancelarContaFinanceiraPayload(motivo);
        return runFinanceiroRequest(async () => {
            await httpClient.post<void>(`/api/financeiro/condicoes-pagamento/${id}/inativar`, payload);
        });
    },
    async listarContasReceber(query?: FinanceiroListQuery) {
        return runFinanceiroRequest(async () => {
            const response = await httpClient.get<ContaReceberResponse[]>('/api/financeiro/contas-receber', { params: params(query) });
            return response.data;
        });
    },
    async buscarContaReceber(id: string) {
        return runFinanceiroRequest(async () => {
            const response = await httpClient.get<ContaReceberResponse>(`/api/financeiro/contas-receber/${id}`);
            return response.data;
        });
    },
    async criarContaReceber(values: unknown) {
        const payload = buildCriarContaReceberPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaReceberResponse>('/api/financeiro/contas-receber', payload);
            return response.data;
        });
    },
    async gerarContaReceberPedido(pedidoVendaId: string, values: unknown) {
        const payload = buildGerarContaReceberPedidoPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaReceberResponse>(`/api/financeiro/contas-receber/pedido-venda/${pedidoVendaId}`, payload);
            return response.data;
        });
    },
    async receberConta(id: string, values: unknown) {
        const payload = buildReceberContaPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaReceberResponse>(`/api/financeiro/contas-receber/${id}/receber`, payload);
            return response.data;
        });
    },
    async estornarRecebimento(id: string, values: unknown) {
        const payload = buildEstornarRecebimentoPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaReceberResponse>(`/api/financeiro/contas-receber/${id}/estornar-recebimento`, payload);
            return response.data;
        });
    },
    async cancelarContaReceber(id: string, motivo: string) {
        const payload = buildCancelarContaFinanceiraPayload(motivo);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaReceberResponse>(`/api/financeiro/contas-receber/${id}/cancelar`, payload);
            return response.data;
        });
    },
    async listarContasPagar(query?: FinanceiroListQuery) {
        return runFinanceiroRequest(async () => {
            const response = await httpClient.get<ContaPagarResponse[]>('/api/financeiro/contas-pagar', { params: params(query) });
            return response.data;
        });
    },
    async buscarContaPagar(id: string) {
        return runFinanceiroRequest(async () => {
            const response = await httpClient.get<ContaPagarResponse>(`/api/financeiro/contas-pagar/${id}`);
            return response.data;
        });
    },
    async criarContaPagar(values: unknown) {
        const payload = buildCriarContaPagarPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaPagarResponse>('/api/financeiro/contas-pagar', payload);
            return response.data;
        });
    },
    async pagarConta(id: string, values: unknown) {
        const payload = buildPagarContaPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaPagarResponse>(`/api/financeiro/contas-pagar/${id}/pagar`, payload);
            return response.data;
        });
    },
    async estornarPagamento(id: string, values: unknown) {
        const payload = buildEstornarPagamentoPayload(values);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaPagarResponse>(`/api/financeiro/contas-pagar/${id}/estornar-pagamento`, payload);
            return response.data;
        });
    },
    async cancelarContaPagar(id: string, motivo: string) {
        const payload = buildCancelarContaFinanceiraPayload(motivo);
        return runFinanceiroRequest(async () => {
            const response = await httpClient.post<ContaPagarResponse>(`/api/financeiro/contas-pagar/${id}/cancelar`, payload);
            return response.data;
        });
    },
};

export const formasPagamentoApi = {
    listar: financeiroApi.listarFormasPagamento,
    criar: financeiroApi.criarFormaPagamento,
    atualizar: financeiroApi.atualizarFormaPagamento,
    inativar: financeiroApi.inativarFormaPagamento
};
export const condicoesPagamentoApi = {
    listar: financeiroApi.listarCondicoesPagamento,
    criar: financeiroApi.criarCondicaoPagamento,
    atualizar: financeiroApi.atualizarCondicaoPagamento,
    inativar: financeiroApi.inativarCondicaoPagamento
};
export const contasReceberApi = {
    listar: financeiroApi.listarContasReceber,
    buscar: financeiroApi.buscarContaReceber,
    criar: financeiroApi.criarContaReceber,
    receber: financeiroApi.receberConta,
    baixar: financeiroApi.receberConta,
    estornarRecebimento: financeiroApi.estornarRecebimento,
    cancelar: financeiroApi.cancelarContaReceber
};
export const contasPagarApi = {
    listar: financeiroApi.listarContasPagar,
    buscar: financeiroApi.buscarContaPagar,
    criar: financeiroApi.criarContaPagar,
    pagar: financeiroApi.pagarConta,
    baixar: financeiroApi.pagarConta,
    estornarPagamento: financeiroApi.estornarPagamento,
    cancelar: financeiroApi.cancelarContaPagar
};
