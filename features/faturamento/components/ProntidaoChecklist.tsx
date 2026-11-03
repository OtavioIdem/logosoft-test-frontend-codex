'use client';

// Checklist de prontidão do faturamento (v1.11.0a8b82, D113). Só apresenta: o estado vem de `estadoProntidao` e a
// regra crítica (o que falta, se pode confirmar) é do backend. Usado no diálogo Confirmar e, em modo leitura, no
// detalhe do faturamento.

import Link from 'next/link';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { ApiErrorPanel } from '@/components/feedback/ApiErrorPanel';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { mapApiError } from '@/lib/http/apiError';
import { findRoutePermissionRule } from '@/lib/security/routePermissions';
import { FATURAMENTO_PRONTIDAO, PRONTIDAO_RECURSO_ROTULO, prontidaoEtapaRotulo } from '@/features/faturamento/components/faturamentoLabels';
import {
    agruparPendenciasPorEtapa,
    EstadoProntidao,
    pendenciaDependeDoConfirmar,
    prontidaoEhRetomada,
    rotaDoRecurso
} from '@/features/faturamento/components/prontidaoRecursos';
import { ProntidaoFaturamentoResponse, ProntidaoPendencia, ProntidaoRecursoConhecido } from '@/features/faturamento/types/faturamento.types';

const PendenciaLinha = ({ pendencia, marcarInformeNoConfirmar }: { pendencia: ProntidaoPendencia; marcarInformeNoConfirmar: boolean }) => {
    const { hasAnyPermission } = usePermissions();
    const rota = rotaDoRecurso(pendencia.recurso);
    const regra = rota ? findRoutePermissionRule(rota) : undefined;
    const podeAbrir = rota ? (regra ? hasAnyPermission(regra.anyOf) : true) : false;
    const rotuloLink = PRONTIDAO_RECURSO_ROTULO[pendencia.recurso as ProntidaoRecursoConhecido];

    return (
        <li className="mb-2" data-testid="prontidao-pendencia">
            <div className="flex flex-wrap align-items-center gap-2">
                <span>{pendencia.mensagem}</span>
                {marcarInformeNoConfirmar && pendenciaDependeDoConfirmar(pendencia) ? <Tag severity="info" value={FATURAMENTO_PRONTIDAO.informeNoConfirmar} /> : null}
            </div>
            {rota && podeAbrir ? (
                <Link href={rota} className="text-sm">
                    {rotuloLink}
                </Link>
            ) : rota && regra ? (
                <small className="text-color-secondary block">{FATURAMENTO_PRONTIDAO.semPermissaoLink(regra.description)}</small>
            ) : null}
        </li>
    );
};

export const ProntidaoChecklist = ({
    estado,
    resposta,
    error,
    onReconferir,
    modoLeitura = false
}: {
    estado: EstadoProntidao;
    resposta?: ProntidaoFaturamentoResponse | null;
    error?: unknown;
    onReconferir: () => void;
    // Detalhe do faturamento: consulta só com o pedido; pendências de natureza/regra viram "informe no Confirmar".
    modoLeitura?: boolean;
}) => {
    const retomada = prontidaoEhRetomada(resposta);
    const grupos = agruparPendenciasPorEtapa(resposta?.pendencias ?? []);
    const apiError = error ? mapApiError(error) : null;
    // 404 = pedido fora do contexto do usuário: mensagem genérica, nunca a lista (D113).
    const erroExibicao = apiError ? (apiError.status === 404 ? { ...apiError, message: FATURAMENTO_PRONTIDAO.erroNaoEncontrado } : apiError) : null;
    const podeReconferir = estado !== 'sem-pedido' && estado !== 'aguardando';

    return (
        <section className="mb-3" aria-label={FATURAMENTO_PRONTIDAO.titulo} data-testid="prontidao-checklist">
            <div className="flex align-items-center justify-content-between gap-2 mb-2">
                <span className="block font-semibold text-color-secondary">{FATURAMENTO_PRONTIDAO.titulo}</span>
                {podeReconferir ? (
                    <Button type="button" label={FATURAMENTO_PRONTIDAO.reconferir} icon="pi pi-refresh" size="small" outlined loading={estado === 'consultando'} disabled={estado === 'consultando'} onClick={onReconferir} />
                ) : null}
            </div>

            {estado === 'sem-pedido' ? <Message className="w-full" severity="warn" text={FATURAMENTO_PRONTIDAO.semPedido} /> : null}
            {estado === 'aguardando' ? <small className="text-color-secondary block">{FATURAMENTO_PRONTIDAO.aguardandoDigitacao}</small> : null}
            {estado === 'consultando' ? <small className="text-color-secondary block">{FATURAMENTO_PRONTIDAO.consultando}</small> : null}

            {estado === 'erro' ? (
                <>
                    <ApiErrorPanel error={erroExibicao} title={FATURAMENTO_PRONTIDAO.erroTitulo} />
                    <Message className="w-full" severity="warn" text={FATURAMENTO_PRONTIDAO.erroBloqueio} />
                </>
            ) : null}

            {estado === 'pronto' || estado === 'pendente' ? (
                <>
                    {retomada ? <Message className="w-full mb-2" severity="info" text={FATURAMENTO_PRONTIDAO.retomadaTexto} /> : null}
                    {estado === 'pronto' ? (
                        <Message className="w-full" severity="success" text={modoLeitura ? FATURAMENTO_PRONTIDAO.prontoLeitura : FATURAMENTO_PRONTIDAO.pronto} />
                    ) : (
                        <>
                            <Message className="w-full mb-2" severity="warn" text={FATURAMENTO_PRONTIDAO.pendentes(resposta?.pendencias.length ?? 0)} />
                            {grupos.map((grupo) => (
                                <div key={grupo.etapa} className="mb-2" data-testid="prontidao-grupo">
                                    <strong className="block mb-1">{prontidaoEtapaRotulo(grupo.etapa)}</strong>
                                    <ul className="m-0 pl-4 line-height-3">
                                        {grupo.pendencias.map((pendencia, indice) => (
                                            <PendenciaLinha key={`${pendencia.codigo}-${indice}`} pendencia={pendencia} marcarInformeNoConfirmar={modoLeitura} />
                                        ))}
                                    </ul>
                                </div>
                            ))}
                            <small className="text-color-secondary block line-height-3">{FATURAMENTO_PRONTIDAO.encadeadas}</small>
                        </>
                    )}
                </>
            ) : null}
        </section>
    );
};
