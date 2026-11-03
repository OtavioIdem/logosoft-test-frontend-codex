'use client';

// Tela Fiscal › Configuração de emissão (v1.11.0a8b81, D112). Três abas: Empresa, Filiais e Certificados. Padrão
// visual de `SeriesFiscaisPage.tsx`.
//
// Usuário comum: a empresa vem do TOKEN (`empresa_id` do JWT) e nenhuma chamada injeta `empresaId`. Quando o contexto
// selecionado diverge da empresa do usuário, a tela avisa que mostra a configuração da empresa do usuário (AC-11).
// Master (D114): não tem empresa no token; as chamadas levam `?empresaId=` da empresa do seletor de contexto, não há
// divergência, a aba Filiais fica liberada e, sem empresa no seletor, a tela pede para escolher e não consulta nada.

import { useMemo, useState } from 'react';
import { Message } from 'primereact/message';
import { TabPanel, TabView } from 'primereact/tabview';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';
import { CertificadosDigitaisTab } from '@/features/fiscal/components/CertificadosDigitaisTab';
import { ConfiguracaoFiscalEmpresaTab } from '@/features/fiscal/components/ConfiguracaoFiscalEmpresaTab';
import { ConfiguracaoFiscalFilialTab } from '@/features/fiscal/components/ConfiguracaoFiscalFilialTab';
import { CONFIGURACAO_FISCAL_PAGINA, CONFIGURACAO_FISCAL_PERMISSAO } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { ConfiguracaoFiscalEscopo } from '@/features/fiscal/hooks/useConfiguracaoFiscal';
import { useSefazSimulada } from '@/features/fiscal/hooks/useSefazSimulada';

/** AC-11: o contexto selecionado difere da empresa do usuário (comparação sem diferenciar maiúsculas). */
export const contextoDivergeDaEmpresaDoUsuario = (contextoEmpresaId?: string | null, usuarioEmpresaId?: string | null) =>
    Boolean(contextoEmpresaId && usuarioEmpresaId && contextoEmpresaId.toLowerCase() !== usuarioEmpresaId.toLowerCase());

export const ConfiguracaoFiscalPage = () => {
    const { hasPermission } = usePermissions();
    const { user } = useAuth();
    const context = useOrganizationalContext();
    const sefazSimulada = useSefazSimulada();
    const [abaAtiva, setAbaAtiva] = useState(0);

    const podeConsultar = hasPermission('FISCAL_CONFIGURACAO_CONSULTAR');
    const podeGerenciar = hasPermission('FISCAL_CONFIGURACAO_GERENCIAR');

    const usuarioEmpresaId = normalizeGuidOrNull(user?.empresaId);
    const empresaContextoId = context.empresaId;
    const master = context.snapshot.isMaster;
    // D114: para o master a empresa configurada É a do seletor, então nunca diverge.
    const contextoDivergente = master ? false : contextoDivergeDaEmpresaDoUsuario(empresaContextoId, usuarioEmpresaId);
    const escopo = useMemo<ConfiguracaoFiscalEscopo>(
        () => ({ organizationalScopeKey: context.organizationalScopeKey, usuarioEmpresaId, master, empresaContextoId, snapshot: context.snapshot }),
        [context.organizationalScopeKey, usuarioEmpresaId, master, empresaContextoId, context.snapshot]
    );
    const masterSemEmpresa = master && !empresaContextoId;
    // D115: a filial é SEMPRE a do seletor de contexto (nada de estado local). `organizationalScopeKey` inclui a filial, então
    // trocar só a filial do header também remonta as abas pelo `key`, e nenhuma recebe filial antiga com empresa nova.
    const filialId = context.filialId;

    if (!podeConsultar) {
        return <UnauthorizedState description={CONFIGURACAO_FISCAL_PERMISSAO.unauthorizedDescription} />;
    }

    return (
        <>
            <PageHeader
                title={CONFIGURACAO_FISCAL_PAGINA.titulo}
                description={CONFIGURACAO_FISCAL_PAGINA.descricao}
                actions={sefazSimulada ? <Tag icon="pi pi-exclamation-triangle" severity="warning" value={CONFIGURACAO_FISCAL_PAGINA.seloSefazSimulada} aria-label={CONFIGURACAO_FISCAL_PAGINA.seloSefazSimulada} /> : undefined}
            />

            {sefazSimulada ? <Message severity="warn" className="w-full mb-3" text={CONFIGURACAO_FISCAL_PAGINA.seloSefazSimuladaDetalhe} /> : null}
            {contextoDivergente ? <Message severity="warn" className="w-full mb-3" text={CONFIGURACAO_FISCAL_PAGINA.avisoContextoDivergente} /> : null}
            {master && !masterSemEmpresa ? <Message severity="info" className="w-full mb-3" text={CONFIGURACAO_FISCAL_PAGINA.masterEmpresaSelecionada} /> : null}
            {masterSemEmpresa ? <Message severity="warn" className="w-full mb-3" text={`${CONFIGURACAO_FISCAL_PAGINA.masterSemEmpresaTitulo}. ${CONFIGURACAO_FISCAL_PAGINA.masterSemEmpresa}`} /> : null}

            {masterSemEmpresa ? null : (
                <TabView activeIndex={abaAtiva} onTabChange={(event) => setAbaAtiva(event.index)}>
                    <TabPanel header={CONFIGURACAO_FISCAL_PAGINA.abaEmpresa}>
                        <ConfiguracaoFiscalEmpresaTab key={context.organizationalScopeKey} escopo={escopo} podeConsultar={podeConsultar} podeGerenciar={podeGerenciar} />
                    </TabPanel>
                    <TabPanel header={CONFIGURACAO_FISCAL_PAGINA.abaFiliais}>
                        <ConfiguracaoFiscalFilialTab key={context.organizationalScopeKey} escopo={escopo} filialId={filialId} contextoDivergente={contextoDivergente} podeConsultar={podeConsultar} podeGerenciar={podeGerenciar} />
                    </TabPanel>
                    <TabPanel header={CONFIGURACAO_FISCAL_PAGINA.abaCertificados}>
                        <CertificadosDigitaisTab key={context.organizationalScopeKey} escopo={escopo} empresaContextoId={empresaContextoId} filialSelecionadaId={filialId} contextoDivergente={contextoDivergente} sefazSimulada={sefazSimulada} podeConsultar={podeConsultar} podeGerenciar={podeGerenciar} />
                    </TabPanel>
                </TabView>
            )}
        </>
    );
};
