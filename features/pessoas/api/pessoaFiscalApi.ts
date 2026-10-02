import { ZodError } from 'zod';
import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { sanitizePayload } from '@/lib/http/requestUtils';
import { atualizarDadosFiscaisPessoaSchema, pessoaResponseSchema } from '@/features/pessoas/schemas/pessoasSchemas';
import { AtualizarDadosFiscaisPessoaRequest, PessoaResponse } from '@/features/pessoas/types/pessoas.types';

/**
 * D104: o erro do PATCH de dados fiscais sai com `code`, `status`, `traceId` e erros por campo. O client de Pessoa
 * (`pessoasApi.runPessoaRequest`) troca tudo por `new Error(message)`; aqui o padrão é o de `pessoaEnderecosApi`
 * (`PessoaEnderecosApiError`): `mapApiError` lê o `apiError` aninhado e o `ApiErrorPanel` mostra os metadados.
 */
export class PessoaFiscalApiError extends Error {
    apiError: ReturnType<typeof mapApiError>;

    constructor(apiError: ReturnType<typeof mapApiError>) {
        super(apiError.message);
        this.name = 'PessoaFiscalApiError';
        this.apiError = apiError;
    }
}

const RESPOSTA_FORA_DO_CONTRATO = 'A resposta do servidor não segue o contrato dos dados fiscais da pessoa.';

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        if (error instanceof PessoaFiscalApiError) throw error;
        throw new PessoaFiscalApiError(mapApiError(error));
    }
};

const parseResposta = <T>(parse: () => T): T => {
    try {
        return parse();
    } catch (error) {
        if (error instanceof ZodError) throw new PessoaFiscalApiError({ message: RESPOSTA_FORA_DO_CONTRATO });
        throw error;
    }
};

/** Valida os 8 campos (todos obrigatórios, `null` explícito) e normaliza. `sanitizePayload` mantém `null` e `false`. */
export const buildAtualizarDadosFiscaisPessoaPayload = (values: unknown): AtualizarDadosFiscaisPessoaRequest =>
    sanitizePayload(atualizarDadosFiscaisPessoaSchema.parse(values)) as AtualizarDadosFiscaisPessoaRequest;

export const pessoaFiscalApi = {
    /**
     * `PATCH /api/pessoas/{id}/dados-fiscais` -> 200 com o `PessoaResponse` inteiro (`PessoasController.cs:56-67`),
     * `PESSOAS_DADOS_FISCAIS_GERENCIAR`. SUBSTITUI o bloco inteiro: o corpo leva sempre os 8 campos (PF-1). Falha
     * -> 400 (`BadRequest(result.Error)`); pessoa de outra empresa/filial ou ausente -> 404 `Recurso.NaoEncontrado`.
     */
    async atualizar(pessoaId: string, values: unknown) {
        const payload = buildAtualizarDadosFiscaisPessoaPayload(values);
        return runRequest(async () => {
            const response = await httpClient.patch<unknown>(`/api/pessoas/${pessoaId}/dados-fiscais`, payload);
            return parseResposta(() => pessoaResponseSchema.parse(response.data)) as unknown as PessoaResponse;
        });
    }
};
