// Regras puras da fatia Configuração fiscal e certificados (v1.11.0a8b81, D112): opções do select de certificado e
// detecção de certificado vinculado a configuração ativa. A regra crítica (quem pode emitir) é do backend.

import { certificadoOptionLabel, validadeCertificado } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { CertificadoDigitalResponse, ConfiguracaoFiscalEmpresaResponse, ConfiguracaoFiscalFilialResponse, SITUACAO_CERTIFICADO_DIGITAL } from '@/features/fiscal/types/configuracaoFiscal.types';
import { SelectOption } from '@/types/erp';

/**
 * Opções do select de certificado: só os utilizáveis (ativo e dentro da validade). Se o valor atual aponta para um
 * certificado que deixou de ser utilizável, ele continua visível (desabilitado) para o operador enxergar o vínculo.
 */
export const opcoesCertificado = (certificados: CertificadoDigitalResponse[] | undefined, valorAtual?: string | null, agora: Date = new Date()): SelectOption<string>[] => {
    const lista = certificados ?? [];
    const utilizaveis = lista.filter((item) => item.situacao === SITUACAO_CERTIFICADO_DIGITAL.ativo && !validadeCertificado(item.validoAte, agora).vencido);
    const opcoes: SelectOption<string>[] = utilizaveis.map((item) => ({ label: certificadoOptionLabel(item.apelido, item.thumbprintMascarado), value: item.id }));

    if (valorAtual && !opcoes.some((opcao) => opcao.value === valorAtual)) {
        const vinculado = lista.find((item) => item.id === valorAtual);
        opcoes.push({
            label: vinculado ? `${certificadoOptionLabel(vinculado.apelido, vinculado.thumbprintMascarado)} (indisponível)` : 'Certificado vinculado (indisponível)',
            value: valorAtual,
            disabled: true
        });
    }

    return opcoes;
};

/** AC-8: o certificado está no vínculo de uma configuração ATIVA (empresa, ou filial já carregada)? */
export const certificadoVinculadoAConfiguracaoAtiva = (
    certificadoId: string,
    empresa?: Pick<ConfiguracaoFiscalEmpresaResponse, 'ativo' | 'certificadoDigitalId'> | null,
    filial?: Pick<ConfiguracaoFiscalFilialResponse, 'ativo' | 'certificadoDigitalId'> | null
): boolean => Boolean((empresa?.ativo && empresa.certificadoDigitalId === certificadoId) || (filial?.ativo && filial.certificadoDigitalId === certificadoId));
