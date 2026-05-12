import { ModulePlaceholderPage } from '@/components/common/ModulePlaceholderPage';

export default function Page() {
    return (
        <ModulePlaceholderPage
            title="Grupos de acesso"
            description="O contrato v9.8 ainda não expõe endpoints oficiais para grupos de acesso e manutenção de permissões. Esta tela permanece bloqueada para evitar inventar contrato de API."
            permissions={['SEGURANCA_PERMISSOES_GERENCIAR']}
            actions={['Aguardando endpoints oficiais para listar, criar, editar grupos e vincular permissões.']}
            nextSteps={['Confirmar contrato de grupos de acesso no backend.', 'Implementar API client específico sem mock como padrão.', 'Aplicar testes de permissão, listagem e salvamento.']}
        />
    );
}
