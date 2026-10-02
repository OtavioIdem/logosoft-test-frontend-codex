import { ZodError } from 'zod';
import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { sanitizePayload } from '@/lib/http/requestUtils';
import {
    atualizarEnderecoPessoaSchema,
    criarEnderecoPessoaSchema,
    enderecoPessoaResponseSchema,
    enderecosPessoaResponseSchema,
    vincularMunicipioEnderecoPessoaSchema
} from '@/features/pessoas/schemas/pessoasSchemas';
import { AtualizarEnderecoPessoaRequest, CriarEnderecoPessoaRequest, EnderecoPessoaResponse, VincularMunicipioEnderecoPessoaRequest } from '@/features/pessoas/types/pessoaEnderecos.types';

type Schema<T> = { parse: (value: unknown) => T };

/**
 * D102 / EP-8: o erro das rotas de endereço sai com `code`, `status`, `traceId` e erros por campo. O client de Pessoa
 * (`pessoasApi.runPessoaRequest`) troca tudo por `new Error(message)`; aqui o padrão é o da b71
 * (`FaturamentoApiError`): `mapApiError` lê o `apiError` aninhado e o `ApiErrorPanel` mostra os metadados.
 */
export class PessoaEnderecosApiError extends Error {
    apiError: ReturnType<typeof mapApiError>;

    constructor(apiError: ReturnType<typeof mapApiError>) {
        super(apiError.message);
        this.name = 'PessoaEnderecosApiError';
        this.apiError = apiError;
    }
}

const RESPOSTA_FORA_DO_CONTRATO = 'A resposta do servidor não segue o contrato de endereços da pessoa.';

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        if (error instanceof PessoaEnderecosApiError) throw error;
        throw new PessoaEnderecosApiError(mapApiError(error));
    }
};

const parseSchema = <T>(schema: Schema<T>, values: unknown): T => sanitizePayload(schema.parse(values)) as T;

const parseResposta = <T>(parse: () => T): T => {
    try {
        return parse();
    } catch (error) {
        if (error instanceof ZodError) throw new PessoaEnderecosApiError({ message: RESPOSTA_FORA_DO_CONTRATO });
        throw error;
    }
};

type EnderecoParseado = ReturnType<typeof enderecoPessoaResponseSchema.parse>;

const toEndereco = (item: EnderecoParseado): EnderecoPessoaResponse => ({
    ...item,
    complemento: item.complemento ?? null,
    municipioIbgeId: item.municipioIbgeId ?? null
});

const basePath = (pessoaId: string) => `/api/pessoas/${pessoaId}/enderecos`;

export const buildCriarEnderecoPessoaPayload = (values: unknown): CriarEnderecoPessoaRequest => parseSchema(criarEnderecoPessoaSchema, values);
export const buildAtualizarEnderecoPessoaPayload = (values: unknown): AtualizarEnderecoPessoaRequest => parseSchema(atualizarEnderecoPessoaSchema, values);
export const buildVincularMunicipioEnderecoPessoaPayload = (values: unknown): VincularMunicipioEnderecoPessoaRequest => parseSchema(vincularMunicipioEnderecoPessoaSchema, values);

export const pessoaEnderecosApi = {
    /** `GET /api/pessoas/{id}/enderecos`: só endereços ativos, sem paginação (`PessoasController.cs:108-119`). */
    async listar(pessoaId: string) {
        return runRequest(async () => {
            const response = await httpClient.get<unknown>(basePath(pessoaId));
            return parseResposta(() => enderecosPessoaResponseSchema.parse(response.data)).map(toEndereco);
        });
    },
    /** `POST /api/pessoas/{id}/enderecos` -> 201 com o endereço criado (`:121-132`). */
    async criar(pessoaId: string, values: unknown) {
        const payload = buildCriarEnderecoPessoaPayload(values);
        return runRequest(async () => {
            const response = await httpClient.post<unknown>(basePath(pessoaId), payload);
            return toEndereco(parseResposta(() => enderecoPessoaResponseSchema.parse(response.data)));
        });
    },
    /** `PUT /api/pessoas/{id}/enderecos/{enderecoId}` -> 200 com o endereço (`:134-145`). */
    async atualizar(pessoaId: string, enderecoId: string, values: unknown) {
        const payload = buildAtualizarEnderecoPessoaPayload(values);
        return runRequest(async () => {
            const response = await httpClient.put<unknown>(`${basePath(pessoaId)}/${enderecoId}`, payload);
            return toEndereco(parseResposta(() => enderecoPessoaResponseSchema.parse(response.data)));
        });
    },
    /** `POST /api/pessoas/{id}/enderecos/{enderecoId}/principal`, sem corpo (`:147-158`). Devolve só o endereço tocado. */
    async definirPrincipal(pessoaId: string, enderecoId: string) {
        return runRequest(async () => {
            const response = await httpClient.post<unknown>(`${basePath(pessoaId)}/${enderecoId}/principal`);
            return toEndereco(parseResposta(() => enderecoPessoaResponseSchema.parse(response.data)));
        });
    },
    /**
     * `PATCH /api/pessoas/{id}/enderecos/{enderecoId}/municipio` -> 200 com o endereço tocado (`PessoasController.cs:179-190`),
     * `PESSOAS_DADOS_FISCAIS_GERENCIAR`. Corpo: só `municipioIbgeCodigo` (7 dígitos). Município inexistente ou inativo ->
     * 400 (`FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO` / `_INATIVO`, PF-5); UF diferente da do endereço -> 400 `PESSOAS_VALIDACAO`.
     */
    async vincularMunicipio(pessoaId: string, enderecoId: string, values: unknown) {
        const payload = buildVincularMunicipioEnderecoPessoaPayload(values);
        return runRequest(async () => {
            const response = await httpClient.patch<unknown>(`${basePath(pessoaId)}/${enderecoId}/municipio`, payload);
            return toEndereco(parseResposta(() => enderecoPessoaResponseSchema.parse(response.data)));
        });
    },
    /** `DELETE /api/pessoas/{id}/enderecos/{enderecoId}` -> 204, sem corpo na ida e na volta (`:160-170`). */
    async excluir(pessoaId: string, enderecoId: string) {
        return runRequest(async () => {
            await httpClient.delete<void>(`${basePath(pessoaId)}/${enderecoId}`);
        });
    }
};
