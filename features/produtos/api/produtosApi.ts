import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    adicionarCodigoBarrasProdutoSchema,
    atualizarCategoriaProdutoSchema,
    atualizarDadosFiscaisProdutoSchema,
    atualizarMarcaSchema,
    atualizarPrecoCustoProdutoSchema,
    atualizarProdutoSchema,
    atualizarUnidadeMedidaSchema,
    criarCategoriaProdutoSchema,
    criarMarcaSchema,
    criarProdutoSchema,
    criarUnidadeMedidaSchema,
    motivoSchema,
    vincularFornecedorProdutoSchema
} from '@/features/produtos/schemas/produtosSchemas';
import {
    AdicionarCodigoBarrasProdutoRequest,
    AtualizarCategoriaProdutoRequest,
    AtualizarDadosFiscaisProdutoRequest,
    AtualizarMarcaRequest,
    AtualizarPrecoCustoProdutoRequest,
    AtualizarProdutoRequest,
    AtualizarUnidadeMedidaRequest,
    CatalogoListQuery,
    CategoriaProdutoResponse,
    CriarCategoriaProdutoRequest,
    CriarMarcaRequest,
    CriarProdutoRequest,
    CriarUnidadeMedidaRequest,
    MarcaResponse,
    MotivoRequest,
    ProdutoListQuery,
    ProdutoResponse,
    UnidadeMedidaResponse,
    VincularFornecedorProdutoRequest
} from '@/features/produtos/types/produtos.types';

type Schema<T> = { parse: (value: unknown) => T };

const runProdutoRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        const apiError = mapApiError(error);
        throw new Error(apiError.message);
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;
const params = (query?: CatalogoListQuery) => cleanQueryParams({ empresaId: query?.empresaId, filialId: query?.filialId, termo: query?.termo });

export const buildCriarCategoriaProdutoPayload = (values: unknown): CriarCategoriaProdutoRequest => parseSchema(criarCategoriaProdutoSchema, values);
export const buildAtualizarCategoriaProdutoPayload = (values: unknown): AtualizarCategoriaProdutoRequest => parseSchema(atualizarCategoriaProdutoSchema, values);
export const buildCriarUnidadeMedidaPayload = (values: unknown): CriarUnidadeMedidaRequest => parseSchema(criarUnidadeMedidaSchema, values);
export const buildAtualizarUnidadeMedidaPayload = (values: unknown): AtualizarUnidadeMedidaRequest => parseSchema(atualizarUnidadeMedidaSchema, values);
export const buildCriarMarcaPayload = (values: unknown): CriarMarcaRequest => parseSchema(criarMarcaSchema, values);
export const buildAtualizarMarcaPayload = (values: unknown): AtualizarMarcaRequest => parseSchema(atualizarMarcaSchema, values);
export const buildCriarProdutoPayload = (values: unknown): CriarProdutoRequest => parseSchema(criarProdutoSchema, values);
export const buildAtualizarProdutoPayload = (values: unknown): AtualizarProdutoRequest => parseSchema(atualizarProdutoSchema, values);
export const buildAtualizarPrecoCustoProdutoPayload = (values: unknown): AtualizarPrecoCustoProdutoRequest => parseSchema(atualizarPrecoCustoProdutoSchema, values);
export const buildAtualizarDadosFiscaisProdutoPayload = (values: unknown): AtualizarDadosFiscaisProdutoRequest => parseSchema(atualizarDadosFiscaisProdutoSchema, values);
export const buildAdicionarCodigoBarrasProdutoPayload = (values: unknown): AdicionarCodigoBarrasProdutoRequest => parseSchema(adicionarCodigoBarrasProdutoSchema, values);
export const buildVincularFornecedorProdutoPayload = (values: unknown): VincularFornecedorProdutoRequest => parseSchema(vincularFornecedorProdutoSchema, values);
export const buildProdutoMotivoPayload = (motivo: string): MotivoRequest => parseSchema(motivoSchema, { motivo });

export const categoriasProdutoApi = {
    async listar(query?: CatalogoListQuery) {
        return runProdutoRequest(async () => {
            const response = await httpClient.get<CategoriaProdutoResponse[]>('/api/produtos/categorias', { params: params(query) });
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarCategoriaProdutoPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.post<CategoriaProdutoResponse>('/api/produtos/categorias', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarCategoriaProdutoPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.put<CategoriaProdutoResponse>(`/api/produtos/categorias/${id}`, payload);
            return response.data;
        });
    },
    async inativar(id: string, motivo: string) {
        const payload = buildProdutoMotivoPayload(motivo);
        return runProdutoRequest(async () => {
            await httpClient.post<void>(`/api/produtos/categorias/${id}/inativar`, payload);
        });
    }
};

export const unidadesMedidaApi = {
    async listar(query?: CatalogoListQuery) {
        return runProdutoRequest(async () => {
            const response = await httpClient.get<UnidadeMedidaResponse[]>('/api/produtos/unidades-medida', { params: params(query) });
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarUnidadeMedidaPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.post<UnidadeMedidaResponse>('/api/produtos/unidades-medida', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarUnidadeMedidaPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.put<UnidadeMedidaResponse>(`/api/produtos/unidades-medida/${id}`, payload);
            return response.data;
        });
    },
    async inativar(id: string, motivo: string) {
        const payload = buildProdutoMotivoPayload(motivo);
        return runProdutoRequest(async () => {
            await httpClient.post<void>(`/api/produtos/unidades-medida/${id}/inativar`, payload);
        });
    }
};

export const marcasApi = {
    async listar(query?: CatalogoListQuery) {
        return runProdutoRequest(async () => {
            const response = await httpClient.get<MarcaResponse[]>('/api/produtos/marcas', { params: params(query) });
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarMarcaPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.post<MarcaResponse>('/api/produtos/marcas', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarMarcaPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.put<MarcaResponse>(`/api/produtos/marcas/${id}`, payload);
            return response.data;
        });
    },
    async inativar(id: string, motivo: string) {
        const payload = buildProdutoMotivoPayload(motivo);
        return runProdutoRequest(async () => {
            await httpClient.post<void>(`/api/produtos/marcas/${id}/inativar`, payload);
        });
    }
};

export const produtosApi = {
    async listar(query?: ProdutoListQuery) {
        return runProdutoRequest(async () => {
            const response = await httpClient.get<ProdutoResponse[]>('/api/produtos', { params: params(query) });
            return response.data;
        });
    },
    async obter(id: string) {
        return runProdutoRequest(async () => {
            const response = await httpClient.get<ProdutoResponse>(`/api/produtos/${id}`);
            return response.data;
        });
    },
    async criar(values: unknown) {
        const payload = buildCriarProdutoPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.post<ProdutoResponse>('/api/produtos', payload);
            return response.data;
        });
    },
    async atualizar(id: string, values: unknown) {
        const payload = buildAtualizarProdutoPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.put<ProdutoResponse>(`/api/produtos/${id}`, payload);
            return response.data;
        });
    },
    async atualizarPrecoCusto(id: string, values: unknown) {
        const payload = buildAtualizarPrecoCustoProdutoPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.patch<ProdutoResponse>(`/api/produtos/${id}/preco-custo`, payload);
            return response.data;
        });
    },
    async atualizarDadosFiscais(id: string, values: unknown) {
        const payload = buildAtualizarDadosFiscaisProdutoPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.patch<ProdutoResponse>(`/api/produtos/${id}/dados-fiscais`, payload);
            return response.data;
        });
    },
    async adicionarCodigoBarras(id: string, values: unknown) {
        const payload = buildAdicionarCodigoBarrasProdutoPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.post<ProdutoResponse>(`/api/produtos/${id}/codigos-barras`, payload);
            return response.data;
        });
    },
    async vincularFornecedor(id: string, values: unknown) {
        const payload = buildVincularFornecedorProdutoPayload(values);
        return runProdutoRequest(async () => {
            const response = await httpClient.post<ProdutoResponse>(`/api/produtos/${id}/fornecedores`, payload);
            return response.data;
        });
    },
    async inativar(id: string, motivo: string) {
        const payload = buildProdutoMotivoPayload(motivo);
        return runProdutoRequest(async () => {
            await httpClient.post<void>(`/api/produtos/${id}/inativar`, payload);
        });
    }
};
