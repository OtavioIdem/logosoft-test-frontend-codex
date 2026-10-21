'use client';

import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import { PageHeader } from '@/components/common/PageHeader';
import { UnauthorizedState } from '@/components/feedback/UnauthorizedState';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

const dependenciaConsulta = 'O backend ainda não oferece consultas de contas bancárias e carteiras de cobrança para seleção segura.';

export const CnabPage = () => {
    const { hasPermission } = usePermissions();
    const podeConsultar = hasPermission('BANCOS_CONSULTAR');
    const podeGerarRemessa = hasPermission('CNAB_REMESSA_GERAR');
    const podeProcessarRetorno = hasPermission('CNAB_RETORNO_PROCESSAR');

    if (!podeConsultar && !podeGerarRemessa && !podeProcessarRetorno) {
        return <UnauthorizedState description="O módulo CNAB exige uma permissão de consulta, geração de remessa ou processamento de retorno." />;
    }

    return (
        <>
            <PageHeader title="CNAB" description="Geração de remessas e processamento de arquivos de retorno bancário." />
            <Message className="w-full mb-3" severity="warn" text={`Operações indisponíveis: ${dependenciaConsulta} Nenhum arquivo será enviado ou processado.`} />

            <div className="grid">
                <div className="col-12 lg:col-6">
                    <Card title="Gerar remessa" subTitle="Envia os boletos elegíveis da carteira selecionada ao banco.">
                        <div className="flex flex-column gap-3">
                            <div className="flex align-items-center justify-content-between gap-2">
                                <span className="text-color-secondary">Permissão necessária</span>
                                <Tag value="CNAB · Gerar remessa" severity={podeGerarRemessa ? 'success' : 'warning'} />
                            </div>
                            <p className="m-0 line-height-3">A remessa depende de uma carteira de cobrança identificada e selecionável. O sistema não solicitará um identificador técnico manualmente.</p>
                            <Button label="Gerar remessa" icon="pi pi-send" disabled title={dependenciaConsulta} />
                        </div>
                    </Card>
                </div>

                <div className="col-12 lg:col-6">
                    <Card title="Importar retorno" subTitle="Processa o arquivo de retorno emitido pelo banco.">
                        <div className="flex flex-column gap-3">
                            <div className="flex align-items-center justify-content-between gap-2">
                                <span className="text-color-secondary">Permissão necessária</span>
                                <Tag value="CNAB · Processar retorno" severity={podeProcessarRetorno ? 'success' : 'warning'} />
                            </div>
                            <p className="m-0 line-height-3">A importação requer uma conta bancária válida para associar o arquivo. Essa conta precisa ser escolhida por uma consulta publicada pelo backend.</p>
                            <Button label="Importar retorno" icon="pi pi-upload" disabled title={dependenciaConsulta} />
                        </div>
                    </Card>
                </div>

                <div className="col-12">
                    <Card title="O que falta para liberar as operações">
                        <ul className="m-0 pl-3 line-height-3">
                            <li>Consulta de contas bancárias com identificação legível e contexto organizacional.</li>
                            <li>Consulta de carteiras de cobrança vinculadas à conta e à empresa.</li>
                            <li>Após essas consultas, a tela poderá enviar remessa e importar retorno sem aceitar GUID manual.</li>
                        </ul>
                    </Card>
                </div>
            </div>
        </>
    );
};
