'use client';

import { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Card } from 'primereact/card';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ReasonDialog } from '@/components/feedback/ReasonDialog';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAppToast } from '@/hooks/useAppToast';
import { useMutationWithToast } from '@/hooks/useMutationWithToast';
import { mapApiError } from '@/lib/http/apiError';
import { useAnexos, useAnexosMutations } from '@/features/anexos/hooks/useAnexosResources';
import { ANEXO_MAX_BYTES, AnexoResponse, CategoriaAnexo } from '@/features/anexos/types/anexos.types';

const categoriaOptions = [
    { label: 'Documento', value: CategoriaAnexo.Documento },
    { label: 'Contrato', value: CategoriaAnexo.Contrato },
    { label: 'Nota fiscal', value: CategoriaAnexo.NotaFiscal },
    { label: 'Comprovante', value: CategoriaAnexo.Comprovante },
    { label: 'Foto', value: CategoriaAnexo.Foto },
    { label: 'Planilha', value: CategoriaAnexo.Planilha },
    { label: 'Outro', value: CategoriaAnexo.Outro }
];

const categoriaLabel = (categoria: number) => categoriaOptions.find((option) => option.value === Number(categoria))?.label ?? 'Documento';

// Extensões aceitas no cliente (o backend valida a lista oficial).
const EXTENSOES_PERMITIDAS = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'xml', 'zip'];

const formatTamanho = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type AnexosPanelProps = {
    modulo: string;
    entidade: string;
    entidadeId: string;
    empresaId: string;
    filialId?: string | null;
};

export const AnexosPanel = ({ modulo, entidade, entidadeId, empresaId, filialId = null }: AnexosPanelProps) => {
    const { hasPermission } = usePermissions();
    const toast = useAppToast();
    const runWithToast = useMutationWithToast();
    const inputRef = useRef<HTMLInputElement>(null);
    const [categoria, setCategoria] = useState<number>(CategoriaAnexo.Documento);
    const [descricao, setDescricao] = useState('');
    const [inativarRecord, setInativarRecord] = useState<AnexoResponse | null>(null);

    const podeConsultar = hasPermission('ANEXOS_CONSULTAR');
    const podeGerenciar = hasPermission('ANEXOS_GERENCIAR');
    const podeBaixar = hasPermission('ANEXOS_BAIXAR');

    const anexosQuery = useAnexos({ empresaId, filialId, modulo, entidade, entidadeId }, podeConsultar && Boolean(entidadeId));
    const { uploadMutation, inativarMutation, baixarMutation } = useAnexosMutations();

    if (!podeConsultar) return null;

    const anexos = anexosQuery.data ?? [];

    const onSelecionarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const arquivo = event.target.files?.[0];
        event.target.value = '';
        if (!arquivo) return;

        if (arquivo.size > ANEXO_MAX_BYTES) {
            toast.warn('Arquivo muito grande', `O limite é de 25 MB. "${arquivo.name}" tem ${formatTamanho(arquivo.size)}.`);
            return;
        }
        const extensao = arquivo.name.split('.').pop()?.toLowerCase() ?? '';
        if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
            toast.warn('Tipo não permitido', `Extensões aceitas: ${EXTENSOES_PERMITIDAS.join(', ')}.`);
            return;
        }

        await runWithToast(
            async () => {
                await uploadMutation.mutateAsync({ arquivo, empresaId, filialId, moduloOrigem: modulo, entidadeVinculada: entidade, entidadeVinculadaId: entidadeId, categoria, descricao: descricao.trim() || null });
                setDescricao('');
            },
            { success: { summary: 'Anexo enviado', detail: `"${arquivo.name}" vinculado com sucesso.` }, error: { summary: 'Erro ao anexar', detail: 'Não foi possível enviar o anexo.' } }
        );
    };

    const baixar = (anexo: AnexoResponse) =>
        runWithToast(() => baixarMutation.mutateAsync({ id: anexo.id, nomeArquivo: anexo.nomeArquivo }), { error: { summary: 'Erro ao baixar', detail: 'Não foi possível baixar o anexo.' } });

    const inativar = async (motivo: string) => {
        if (!inativarRecord) return;
        await runWithToast(
            async () => {
                await inativarMutation.mutateAsync({ id: inativarRecord.id, motivo });
                setInativarRecord(null);
            },
            { success: { summary: 'Anexo inativado', detail: 'Motivo registrado com sucesso.' }, error: { summary: 'Erro ao inativar', detail: 'Não foi possível inativar o anexo.' } }
        );
    };

    return (
        <Card title="Anexos" className="mt-3">
            {podeGerenciar ? (
                <div className="flex flex-column md:flex-row gap-2 md:align-items-end mb-3">
                    <div className="flex flex-column gap-1">
                        <label htmlFor="anexoCategoria" className="text-sm font-medium">Categoria</label>
                        <Dropdown inputId="anexoCategoria" value={categoria} options={categoriaOptions} onChange={(event) => setCategoria(event.value)} />
                    </div>
                    <div className="flex flex-column gap-1 flex-1">
                        <label htmlFor="anexoDescricao" className="text-sm font-medium">Descrição (opcional)</label>
                        <InputText id="anexoDescricao" value={descricao} onChange={(event) => setDescricao(event.target.value)} placeholder="Ex.: contrato assinado" />
                    </div>
                    <Button type="button" label="Anexar arquivo" icon="pi pi-upload" loading={uploadMutation.isPending} onClick={() => inputRef.current?.click()} />
                    <input ref={inputRef} type="file" className="hidden" onChange={onSelecionarArquivo} aria-hidden="true" tabIndex={-1} />
                </div>
            ) : null}

            <small className="block text-color-secondary mb-3">Tamanho máximo 25 MB. Tipos: {EXTENSOES_PERMITIDAS.join(', ')}. Duplicados são identificados por hash no servidor.</small>

            {anexosQuery.error ? <ApiErrorPanel error={mapApiError(anexosQuery.error)} /> : null}
            {anexosQuery.isLoading ? <p className="text-color-secondary text-sm">Carregando anexos…</p> : null}
            {!anexosQuery.isLoading && anexos.length === 0 ? <EmptyState title="Nenhum anexo" description="Envie um arquivo para vincular a este registro." /> : null}

            <ul className="list-none p-0 m-0">
                {anexos.map((anexo) => (
                    <li key={anexo.id} className="flex flex-column md:flex-row md:align-items-center gap-2 py-2 border-bottom-1 surface-border">
                        <span className="flex-1">
                            <span className="flex align-items-center gap-2 flex-wrap">
                                <i className="pi pi-file" aria-hidden="true" />
                                <span className="font-medium">{anexo.nomeArquivo}</span>
                                <Tag value={categoriaLabel(anexo.categoria)} />
                                {!anexo.ativo ? <Tag value="Inativo" severity="danger" /> : null}
                            </span>
                            <span className="block text-xs text-color-secondary mt-1">
                                {formatTamanho(anexo.tamanhoBytes)}
                                {anexo.descricao ? ` • ${anexo.descricao}` : ''}
                            </span>
                        </span>
                        <div className="flex gap-2">
                            {podeBaixar ? <Button type="button" label="Baixar" icon="pi pi-download" size="small" text loading={baixarMutation.isPending} onClick={() => baixar(anexo)} /> : null}
                            {podeGerenciar && anexo.ativo ? <Button type="button" label="Inativar" icon="pi pi-ban" size="small" text severity="danger" onClick={() => setInativarRecord(anexo)} /> : null}
                        </div>
                    </li>
                ))}
            </ul>

            <ReasonDialog visible={Boolean(inativarRecord)} title="Inativar anexo" confirmLabel="Inativar" loading={inativarMutation.isPending} onHide={() => setInativarRecord(null)} onConfirm={inativar} />
        </Card>
    );
};
