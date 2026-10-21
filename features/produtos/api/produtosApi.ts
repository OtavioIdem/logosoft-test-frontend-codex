import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams, sanitizePayload } from '@/lib/http/requestUtils';
import {
    adicionarCodigoBarrasProdutoSchema,
    atualizarCategoriaProdutoSchema,
    atualizarGrupoProdutoSchema,
    atualizarCadastroAuxiliarProdutoSchema,
    atualizarDadosFiscaisProdutoSchema,
    atualizarMarcaSchema,
    atualizarPrecoCustoProdutoSchema,
    atualizarProdutoSchema,
    atualizarUnidadeMedidaSchema,
    criarCategoriaProdutoSchema,
    criarGrupoProdutoSchema,
    criarCadastroAuxiliarProdutoSchema,
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
    CriarGrupoProdutoRequest,
    CadastroAuxiliarProdutoRequest,
    CadastroAuxiliarProdutoResponse,
    ReferenciasCadastraisProdutoRequest,
    CriarMarcaRequest,
    CriarProdutoRequest,
    CriarUnidadeMedidaRequest,
    MarcaResponse,
    GrupoProdutoListQuery,
    GrupoProdutoResponse,
    AtualizarGrupoProdutoRequest,
    MotivoRequest,
    ProdutoListQuery,
    ProdutoResponse,
    UnidadeMedidaResponse,
    UnidadeTributavelCadastro,
    UnidadeTributavelCadastroQuery,
    VincularFornecedorProdutoRequest
} from '@/features/produtos/types/produtos.types';
import { referenciasCadastraisProdutoSchema } from '@/features/produtos/schemas/produtosSchemas';
import type { ApiResult, PagedResult } from '@/types/erp';

type Schema<T> = { parse: (value: unknown) => T };

type ProdutoListPayload = ProdutoResponse[] | ApiResult<ProdutoResponse[]> | PagedResult<ProdutoResponse[]> | { resultado?: unknown; Result?: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A lista de produtos é consumida por selects e grades de vários módulos. O backend
 * pode devolvê-la diretamente ou embrulhada no padrão ApiResult/PagedResult; a tela
 * precisa sempre receber uma lista, para que uma mudança de envelope não cause uma
 * exceção de renderização (`.map is not a function`).
 */
export const normalizeProdutosListResponse = (payload: ProdutoListPayload | unknown): ProdutoResponse[] => {
    let current: unknown = payload;

    for (let depth = 0; depth < 3; depth += 1) {
        if (Array.isArray(current)) {
            return current as ProdutoResponse[];
        }

        if (!isRecord(current)) {
            break;
        }

        const currentRecord = current;

        if (currentRecord.success === false || currentRecord.Success === false) {
            const error = isRecord(currentRecord.error) ? currentRecord.error : isRecord(currentRecord.Error) ? currentRecord.Error : undefined;
            const message = error?.message ?? error?.Message;
            throw new Error(typeof message === 'string' && message.trim() ? message : 'A API não conseguiu listar os produtos.');
        }

        if (Array.isArray(currentRecord.items)) {
            return currentRecord.items as ProdutoResponse[];
        }

        const envelopeKey = ['data', 'Data', 'resultado', 'Resultado', 'result', 'Result', 'value', 'Value'].find((key) => currentRecord[key] !== undefined && currentRecord[key] !== null);
        if (!envelopeKey) {
            break;
        }

        current = currentRecord[envelopeKey];
    }

    throw new Error('A API retornou uma lista de produtos em formato incompatível.');
};

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
export const buildCriarGrupoProdutoPayload = (values: unknown): CriarGrupoProdutoRequest => parseSchema(criarGrupoProdutoSchema, values);
export const buildAtualizarGrupoProdutoPayload = (values: unknown): AtualizarGrupoProdutoRequest => parseSchema(atualizarGrupoProdutoSchema, values);
export const buildCriarCadastroAuxiliarProdutoPayload = (values: unknown): CadastroAuxiliarProdutoRequest => parseSchema(criarCadastroAuxiliarProdutoSchema, values);
export const buildAtualizarCadastroAuxiliarProdutoPayload = (values: unknown): Pick<CadastroAuxiliarProdutoRequest, 'nome'> => parseSchema(atualizarCadastroAuxiliarProdutoSchema, values);
export const buildReferenciasCadastraisProdutoPayload = (values: unknown): ReferenciasCadastraisProdutoRequest => parseSchema(referenciasCadastraisProdutoSchema, values);
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

export const gruposProdutoApi = {
    async listar(query: GrupoProdutoListQuery) {
        return runProdutoRequest(async () => (await httpClient.get<PagedResult<GrupoProdutoResponse>>('/api/produtos/grupos', { params: cleanQueryParams({ empresaId: query.empresaId, incluirInativos: query.incluirInativos ?? false, pagina: query.pagina ?? 1, tamanho: query.tamanho ?? 500 }) })).data);
    },
    async criar(values: unknown) { const payload = buildCriarGrupoProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.post<GrupoProdutoResponse>('/api/produtos/grupos', payload)).data); },
    async atualizar(id: string, values: unknown) { const payload = buildAtualizarGrupoProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.put<GrupoProdutoResponse>(`/api/produtos/grupos/${id}`, payload)).data); },
    async mover(id: string, novoGrupoPaiId: string | null) { return runProdutoRequest(async () => (await httpClient.post<GrupoProdutoResponse>(`/api/produtos/grupos/${id}/mover`, { novoGrupoPaiId })).data); },
    async inativar(id: string, motivo: string) { return runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/grupos/${id}/inativar`, buildProdutoMotivoPayload(motivo)); }); },
    async reativar(id: string, motivo: string) { return runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/grupos/${id}/reativar`, buildProdutoMotivoPayload(motivo)); }); }
};

export type CadastroAuxiliarProdutoKind = 'linhas' | 'classificacoes' | 'classificacoes-compra' | 'modos-aplicacao' | 'naturezas-fisicas' | 'fabricantes';

type CadastroAuxiliarProdutoApi = {
    listar: (empresaId: string, incluirInativos?: boolean) => Promise<PagedResult<CadastroAuxiliarProdutoResponse>>;
    criar: (values: unknown) => Promise<CadastroAuxiliarProdutoResponse>;
    atualizar: (id: string, values: unknown) => Promise<CadastroAuxiliarProdutoResponse>;
    inativar: (id: string, motivo: string) => Promise<void>;
    reativar: (id: string, motivo: string) => Promise<void>;
};

export const cadastrosAuxiliaresProdutoApi: Record<CadastroAuxiliarProdutoKind, CadastroAuxiliarProdutoApi> = {
    linhas: {
        listar: (empresaId, incluirInativos = false) => runProdutoRequest(async () => (await httpClient.get<PagedResult<CadastroAuxiliarProdutoResponse>>('/api/produtos/linhas', { params: { empresaId, incluirInativos, pagina: 1, tamanho: 500 } })).data),
        criar: (values) => { const payload = buildCriarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.post<CadastroAuxiliarProdutoResponse>('/api/produtos/linhas', payload)).data); },
        atualizar: (id, values) => { const payload = buildAtualizarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.put<CadastroAuxiliarProdutoResponse>(`/api/produtos/linhas/${id}`, payload)).data); },
        inativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/linhas/${id}/inativar`, buildProdutoMotivoPayload(motivo)); }),
        reativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/linhas/${id}/reativar`, buildProdutoMotivoPayload(motivo)); })
    },
    classificacoes: {
        listar: (empresaId, incluirInativos = false) => runProdutoRequest(async () => (await httpClient.get<PagedResult<CadastroAuxiliarProdutoResponse>>('/api/produtos/classificacoes', { params: { empresaId, incluirInativos, pagina: 1, tamanho: 500 } })).data),
        criar: (values) => { const payload = buildCriarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.post<CadastroAuxiliarProdutoResponse>('/api/produtos/classificacoes', payload)).data); },
        atualizar: (id, values) => { const payload = buildAtualizarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.put<CadastroAuxiliarProdutoResponse>(`/api/produtos/classificacoes/${id}`, payload)).data); },
        inativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/classificacoes/${id}/inativar`, buildProdutoMotivoPayload(motivo)); }),
        reativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/classificacoes/${id}/reativar`, buildProdutoMotivoPayload(motivo)); })
    },
    'classificacoes-compra': {
        listar: (empresaId, incluirInativos = false) => runProdutoRequest(async () => (await httpClient.get<PagedResult<CadastroAuxiliarProdutoResponse>>('/api/produtos/classificacoes-compra', { params: { empresaId, incluirInativos, pagina: 1, tamanho: 500 } })).data),
        criar: (values) => { const payload = buildCriarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.post<CadastroAuxiliarProdutoResponse>('/api/produtos/classificacoes-compra', payload)).data); },
        atualizar: (id, values) => { const payload = buildAtualizarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.put<CadastroAuxiliarProdutoResponse>(`/api/produtos/classificacoes-compra/${id}`, payload)).data); },
        inativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/classificacoes-compra/${id}/inativar`, buildProdutoMotivoPayload(motivo)); }),
        reativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/classificacoes-compra/${id}/reativar`, buildProdutoMotivoPayload(motivo)); })
    },
    'modos-aplicacao': {
        listar: (empresaId, incluirInativos = false) => runProdutoRequest(async () => (await httpClient.get<PagedResult<CadastroAuxiliarProdutoResponse>>('/api/produtos/modos-aplicacao', { params: { empresaId, incluirInativos, pagina: 1, tamanho: 500 } })).data),
        criar: (values) => { const payload = buildCriarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.post<CadastroAuxiliarProdutoResponse>('/api/produtos/modos-aplicacao', payload)).data); },
        atualizar: (id, values) => { const payload = buildAtualizarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.put<CadastroAuxiliarProdutoResponse>(`/api/produtos/modos-aplicacao/${id}`, payload)).data); },
        inativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/modos-aplicacao/${id}/inativar`, buildProdutoMotivoPayload(motivo)); }),
        reativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/modos-aplicacao/${id}/reativar`, buildProdutoMotivoPayload(motivo)); })
    },
    'naturezas-fisicas': {
        listar: (empresaId, incluirInativos = false) => runProdutoRequest(async () => (await httpClient.get<PagedResult<CadastroAuxiliarProdutoResponse>>('/api/produtos/naturezas-fisicas', { params: { empresaId, incluirInativos, pagina: 1, tamanho: 500 } })).data),
        criar: (values) => { const payload = buildCriarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.post<CadastroAuxiliarProdutoResponse>('/api/produtos/naturezas-fisicas', payload)).data); },
        atualizar: (id, values) => { const payload = buildAtualizarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.put<CadastroAuxiliarProdutoResponse>(`/api/produtos/naturezas-fisicas/${id}`, payload)).data); },
        inativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/naturezas-fisicas/${id}/inativar`, buildProdutoMotivoPayload(motivo)); }),
        reativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/naturezas-fisicas/${id}/reativar`, buildProdutoMotivoPayload(motivo)); })
    },
    fabricantes: {
        listar: (empresaId, incluirInativos = false) => runProdutoRequest(async () => (await httpClient.get<PagedResult<CadastroAuxiliarProdutoResponse>>('/api/produtos/fabricantes', { params: { empresaId, incluirInativos, pagina: 1, tamanho: 500 } })).data),
        criar: (values) => { const payload = buildCriarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.post<CadastroAuxiliarProdutoResponse>('/api/produtos/fabricantes', payload)).data); },
        atualizar: (id, values) => { const payload = buildAtualizarCadastroAuxiliarProdutoPayload(values); return runProdutoRequest(async () => (await httpClient.put<CadastroAuxiliarProdutoResponse>(`/api/produtos/fabricantes/${id}`, payload)).data); },
        inativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/fabricantes/${id}/inativar`, buildProdutoMotivoPayload(motivo)); }),
        reativar: (id, motivo) => runProdutoRequest(async () => { await httpClient.post<void>(`/api/produtos/fabricantes/${id}/reativar`, buildProdutoMotivoPayload(motivo)); })
    }
};

// Cadastro global (Mód.04), sem escopo de empresa/filial (D60) — mesmo padrão de
// `administracaoApi.listarUfsFiscais`/`listarMunicipiosFiscais` (b64): o módulo consumidor chama
// `CadastrosFiscaisController` direto, sem indireção por um "features/fiscal" compartilhado.
export const unidadesTributaveisApi = {
    async listar(query?: UnidadeTributavelCadastroQuery) {
        return runProdutoRequest(async () => {
            const response = await httpClient.get<PagedResult<UnidadeTributavelCadastro>>('/api/fiscal/cadastros/unidades-tributaveis', {
                params: cleanQueryParams({ termo: query?.termo, sigla: query?.sigla, ativo: query?.ativo ?? true, pagina: query?.pagina ?? 1, tamanhoPagina: query?.tamanhoPagina ?? 20 })
            });
            return response.data;
        });
    }
};

export const produtosApi = {
    async listar(query?: ProdutoListQuery) {
        return runProdutoRequest(async () => {
            const response = await httpClient.get<ProdutoListPayload>('/api/produtos', { params: params(query) });
            return normalizeProdutosListResponse(response.data);
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
    async atualizarClassificacao(id: string, grupoProdutoId: string | null) {
        return runProdutoRequest(async () => (await httpClient.put<ProdutoResponse>(`/api/produtos/${id}/classificacao`, { grupoProdutoId })).data);
    },
    async atualizarReferenciasCadastrais(id: string, values: unknown) {
        const payload = buildReferenciasCadastraisProdutoPayload(values);
        return runProdutoRequest(async () => (await httpClient.put<ProdutoResponse>(`/api/produtos/${id}/referencias-cadastrais`, payload)).data);
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
