'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from 'primereact/badge';
import { Button } from 'primereact/button';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Tag } from 'primereact/tag';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useContagemNaoLidas, useNotificacoes, useNotificacoesMutations } from '@/features/notificacoes/hooks/useNotificacoesResources';
import { NotificacaoResponse, SeveridadeNotificacao, StatusNotificacao } from '@/features/notificacoes/types/notificacoes.types';

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
        try {
            if (Number(notificacao.situacao) === StatusNotificacao.NaoLida) {
                await marcarLidaMutation.mutateAsync(notificacao.id);
            }
        } finally {
            overlayRef.current?.hide();
            if (notificacao.acaoUrl) router.push(notificacao.acaoUrl);
        }
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
                <span>Notificações</span>
            </button>

            <OverlayPanel ref={overlayRef} onShow={() => setAberto(true)} onHide={() => setAberto(false)} style={{ width: 'min(28rem, 96vw)' }} className="notificacoes-overlay">
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
                {!listaQuery.isLoading && notificacoes.length === 0 ? <p className="text-color-secondary text-sm my-3">Nenhuma notificação não lida.</p> : null}

                <ul className="list-none p-0 m-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {notificacoes.map((notificacao) => {
                        const info = severidadeInfo(notificacao.severidade);
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
                            </li>
                        );
                    })}
                </ul>
            </OverlayPanel>
        </>
    );
};
