import { httpClient } from '@/lib/http/httpClient';
import { mapApiError } from '@/lib/http/apiError';
import { cleanQueryParams } from '@/lib/http/requestUtils';
import { AnexoResponse, AnexosListQuery, UploadAnexoInput } from '@/features/anexos/types/anexos.types';

const runRequest = async <T>(request: () => Promise<T>) => {
    try {
        return await request();
    } catch (error) {
        throw new Error(mapApiError(error).message);
    }
};

const listParams = (query?: AnexosListQuery) =>
    cleanQueryParams({
        empresaId: query?.empresaId,
        filialId: query?.filialId,
        modulo: query?.modulo,
        entidade: query?.entidade,
        entidadeId: query?.entidadeId,
        categoria: query?.categoria,
        incluirInativos: query?.incluirInativos
    });

export const anexosApi = {
    async listar(query?: AnexosListQuery) {
        return runRequest(async () => {
            const response = await httpClient.get<AnexoResponse[]>('/api/anexos', { params: listParams(query) });
            return response.data;
        });
    },
    async upload(input: UploadAnexoInput) {
        const form = new FormData();
        form.append('Arquivo', input.arquivo);
        form.append('EmpresaId', input.empresaId);
        if (input.filialId) form.append('FilialId', input.filialId);
        form.append('ModuloOrigem', input.moduloOrigem);
        form.append('EntidadeVinculada', input.entidadeVinculada);
        form.append('EntidadeVinculadaId', input.entidadeVinculadaId);
        form.append('Categoria', String(input.categoria));
        if (input.descricao) form.append('Descricao', input.descricao);

        return runRequest(async () => {
            const response = await httpClient.post<AnexoResponse>('/api/anexos', form);
            return response.data;
        });
    },
    async baixar(id: string, nomeArquivo: string) {
        return runRequest(async () => {
            const response = await httpClient.get<Blob>(`/api/anexos/${id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(response.data);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = nomeArquivo || 'anexo';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        });
    },
    async inativar(id: string, motivo: string) {
        return runRequest(async () => {
            await httpClient.post<void>(`/api/anexos/${id}/inativar`, { motivo });
        });
    }
};
