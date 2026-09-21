'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Tag } from 'primereact/tag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useContagemNaoLidas, useNotificacoes, useNotificacoesMutations } from '@/features/notificacoes/hooks/useNotificacoesResources';
import { NotificacaoResponse, SeveridadeNotificacao, StatusNotificacao } from '@/features/notificacoes/types/notificacoes.types';
import { mapApiError } from '@/lib/http/apiError';
import { ApiError } from '@/types/erp';

const severidadeInfo = (severidade: number): { label: string; severity: 'info' | 'success' | 'warning' | 'danger'; icon: string } => {
    switch (Number(severidade)) {
        case SeveridadeNotificacao.Sucesso:
            return { label: 'Sucesso', severity: 'success', icon: 'pi pi-check-circle' };
        case SeveridadeNotificacao.Alerta:
            return { label: 'Alerta', severity: 'warning', icon: 'pi pi-exclamation-triangle' };
        case SeveridadeNotificacao.Critica:
            return { label: 'Crítica', severity: 'danger', icon: 'pi pi-times-circle' };
        default:
            return { label: 'Informativa', severity: 'info', icon: 'pi pi-info-circle' };
    }
};

const formatQuando = (value: string) => {
    const data = new Date(value);
    if (Number.isNaN(data.getTime())) return '';
    return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const NotificacoesBell = () => {
    const { hasPermission } = usePermissions();
    const { user } = useAuth();
    const overlayRef = useRef<OverlayPanel>(null);
    const [aberto, setAberto] = useState(false);
    const [erroPorItem, setErroPorItem] = useState<Record<string, ApiError>>({});

    const scope = { empresaId: user?.empresaId ?? null, filialId: user?.filialId ?? null };
    const podeConsultar = hasPermission('NOTIFICACOES_CONSULTAR');

    const contagemQuery = useContagemNaoLidas(scope, podeConsultar);
    const listaQuery = useNotificacoes({ ...scope, situacao: StatusNotificacao.NaoLida, pageSize: 20 }, podeConsultar && aberto);
    const { marcarLidaMutation, marcarTodasMutation } = useNotificacoesMutations();
    const router = useRouter();

    if (!podeConsultar) return null;

    const naoLidas = contagemQuery.data?.naoLidas ?? 0;
    const notificacoes = listaQuery.data?.items ?? [];

    const abrirNotificacao = async (notificacao: NotificacaoResponse) => {
        if (Number(notificacao.situacao) === StatusNotificacao.NaoLida) {
            try {
                await marcarLidaMutation.mutateAsync(notificacao.id);
            } catch (error) {
                // Falha ao marcar como lida não pode fechar o painel nem remover o item da
                // lista: o operador precisa ver que a notificação continua pendente.
                setErroPorItem((prev) => ({ ...prev, [notificacao.id]: mapApiError(error) }));
                return;
            }
        }

        setErroPorItem((prev) => {
            if (!(notificacao.id in prev)) return prev;
            const resto = { ...prev };
            delete resto[notificacao.id];
            return resto;
        });
        overlayRef.current?.hide();
        if (notificacao.acaoUrl) router.push(notificacao.acaoUrl);
    };

    return (
        <>
            <button
                type="button"
                className="p-link layout-topbar-button p-overlay-badge"
                aria-label={`Notificações${naoLidas > 0 ? `, ${naoLidas} não lidas` : ''}`}
                aria-haspopup
                onClick={(event) => overlayRef.current?.toggle(event)}
            >
                <i className="pi pi-bell" />
                {naoLidas > 0 ? <Badge value={naoLidas > 99 ? '99+' : naoLidas} severity="danger" /> : null}
                <span className="layout-topbar-button-label">Notificações</span>
            </button>

            <OverlayPanel
                ref={overlayRef}
                onShow={() => setAberto(true)}
                onHide={() => {
                    setAberto(false);
                    setErroPorItem({});
                }}
                style={{ width: 'min(28rem, 96vw)' }}
                className="notificacoes-overlay"
            >
                <div className="flex align-items-center justify-content-between mb-2">
                    <span className="font-semibold">Notificações não lidas</span>
                    <Button
                        type="button"
                        label="Marcar todas"
                        icon="pi pi-check"
                        size="small"
                        text
                        disabled={naoLidas === 0 || marcarTodasMutation.isPending}
                        onClick={() => marcarTodasMutation.mutate(scope)}
                    />
                </div>

                {listaQuery.isLoading ? <p className="text-color-secondary text-sm my-3">Carregando…</p> : null}
                {listaQuery.isError ? <ApiErrorPanel error={mapApiError(listaQuery.error)} title="Não foi possível carregar as notificações." /> : null}
                {!listaQuery.isLoading && !listaQuery.isError && notificacoes.length === 0 ? (
                    <p className="text-color-secondary text-sm my-3">Nenhuma notificação não lida.</p>
                ) : null}

                <ul className="list-none p-0 m-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {notificacoes.map((notificacao) => {
                        const info = severidadeInfo(notificacao.severidade);
                        const erroItem = erroPorItem[notificacao.id];
                        return (
                            <li key={notificacao.id} className="border-bottom-1 surface-border py-2">
                                <button type="button" className="p-link w-full text-left flex gap-2 align-items-start" onClick={() => abrirNotificacao(notificacao)}>
                                    <i className={`${info.icon} mt-1 text-${info.severity === 'danger' ? 'red' : info.severity === 'warning' ? 'orange' : info.severity === 'success' ? 'green' : 'blue'}-500`} aria-hidden="true" />
                                    <span className="flex-1">
                                        <span className="flex align-items-center gap-2">
                                            <span className="font-medium">{notificacao.titulo}</span>
                                            <Tag value={info.label} severity={info.severity} />
                                        </span>
                                        <span className="block text-sm text-color-secondary mt-1">{notificacao.mensagem}</span>
                                        <span className="block text-xs text-color-secondary mt-1">
                                            {notificacao.moduloOrigem} • {formatQuando(notificacao.criadaEm)}
                                            {notificacao.acaoUrl ? ' • abrir' : ''}
                                        </span>
                                    </span>
                                </button>
                                {erroItem ? (
                                    <Message
                                        severity="error"
                                        className="w-full mt-1"
                                        text={erroItem.message || 'Não foi possível marcar como lida. Tente novamente.'}
                                    />
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            </OverlayPanel>
        </>
    );
};
