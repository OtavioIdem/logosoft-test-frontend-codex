'use client';

import { useRef } from 'react';
import { Message } from 'primereact/message';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Tag } from 'primereact/tag';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';

/**
 * Painel de perfil do topbar. Somente leitura por decisão travada (D56): o backend expõe login,
 * `GET /api/auth/me`, refresh e logout — não existe endpoint de editar perfil, trocar senha ou
 * salvar preferência. O painel mostra só o que `CurrentUser` (types/erp.ts:407) garante e diz por
 * quê não há edição, para a ausência não virar chamado de suporte.
 *
 * `empresaId`/`filialId` são Guid sem nome amigável no contrato (nenhuma das 580 operações do
 * Swagger publica schema de resposta) — por isso o painel mostra o rótulo do vínculo
 * ("Empresa vinculada"), nunca o identificador técnico.
 */
export const ProfilePanel = () => {
    const { user } = useAuth();
    const { empresaId, filialId, isGlobal } = useOrganizationalContext();
    const overlayRef = useRef<OverlayPanel>(null);

    if (!user) return null;

    const empresaTag = empresaId
        ? { value: 'Empresa vinculada', severity: 'success' as const }
        : { value: isGlobal ? 'Nenhuma empresa selecionada' : 'Sem empresa vinculada', severity: 'warning' as const };
    const filialTag = filialId ? { value: 'Filial vinculada', severity: 'success' as const } : { value: 'Sem filial', severity: undefined };

    return (
        <>
            <button
                type="button"
                className="p-link layout-topbar-button"
                aria-label={`Abrir perfil de ${user.nome}`}
                aria-haspopup
                onClick={(event) => overlayRef.current?.toggle(event)}
            >
                <i className="pi pi-user" />
                <span className="layout-topbar-button-label">{user.nome}</span>
            </button>

            <OverlayPanel ref={overlayRef} style={{ width: 'min(22rem, 96vw)' }} className="profile-overlay">
                <div className="flex align-items-start justify-content-between gap-2 mb-3 pb-3 border-bottom-1 surface-border">
                    <div className="min-w-0">
                        <span className="block font-semibold white-space-nowrap overflow-hidden text-overflow-ellipsis">{user.nome}</span>
                        <span className="block text-sm text-color-secondary white-space-nowrap overflow-hidden text-overflow-ellipsis">{user.email}</span>
                    </div>
                    {user.isMaster ? <Tag value="Administrador" severity="info" /> : null}
                </div>

                <div className="flex flex-column gap-2 mb-3">
                    <div className="flex align-items-center justify-content-between gap-2">
                        <span className="text-sm text-color-secondary">Empresa</span>
                        <Tag value={empresaTag.value} severity={empresaTag.severity} />
                    </div>
                    <div className="flex align-items-center justify-content-between gap-2">
                        <span className="text-sm text-color-secondary">Filial</span>
                        <Tag value={filialTag.value} severity={filialTag.severity} />
                    </div>
                </div>

                <Message
                    severity="info"
                    className="w-full profile-overlay-readonly"
                    text="Perfil somente leitura nesta versão: ainda não há tela para editar dados, trocar senha ou salvar preferências."
                />
            </OverlayPanel>
        </>
    );
};
