// Rótulos e regras puras da fatia Configuração fiscal e certificados (v1.11.0a8b81, D112). Catálogo de erros do
// §5.1 do plano do backend (`PLANO-FRONTEND-v1.26.22-faturamento.md`), mapeado por `code`. A regra crítica é do
// backend: aqui só texto e apresentação.

import { ApiError } from '@/types/erp';
import { SITUACAO_CERTIFICADO_DIGITAL, SituacaoCertificadoDigital, TIPO_AMBIENTE_FISCAL, TIPO_CERTIFICADO_DIGITAL, TipoAmbienteFiscal, TipoCertificadoDigital } from '@/features/fiscal/types/configuracaoFiscal.types';

export const CONFIGURACAO_FISCAL_PERMISSAO = {
    unauthorizedDescription: 'A configuração de emissão exige FISCAL_CONFIGURACAO_CONSULTAR.',
    semGerenciar: 'Permissão necessária: FISCAL_CONFIGURACAO_GERENCIAR.'
} as const;

export const CONFIGURACAO_FISCAL_PAGINA = {
    titulo: 'Configuração de emissão',
    descricao: 'Ambiente, documentos emitidos e certificado digital da empresa e de cada filial.',
    abaEmpresa: 'Empresa',
    abaFiliais: 'Filiais',
    abaCertificados: 'Certificados',
    seloSefazSimulada: 'SEFAZ simulada',
    seloSefazSimuladaDetalhe: 'O servidor está com a SEFAZ simulada: o resultado de Verificar não prova que o certificado real está montado.',
    avisoContextoDivergente: 'Esta tela mostra a configuração da empresa do seu usuário, não a da empresa selecionada no contexto.',
    // D114: o master configura a empresa escolhida no seletor de contexto.
    masterSemEmpresaTitulo: 'Selecione uma empresa',
    masterSemEmpresa: 'Selecione uma empresa no seletor de contexto para configurar a emissão fiscal dela. Nenhuma consulta é feita antes disso.',
    masterEmpresaSelecionada: 'Configurando a empresa selecionada no seletor de contexto. Trocar a empresa no seletor recarrega esta tela.'
} as const;

export const AMBIENTE_FISCAL_LABEL: Record<TipoAmbienteFiscal, string> = {
    [TIPO_AMBIENTE_FISCAL.homologacao]: 'Homologação',
    [TIPO_AMBIENTE_FISCAL.producao]: 'Produção'
};

export const AMBIENTE_FISCAL_OPTIONS = [
    { label: AMBIENTE_FISCAL_LABEL[TIPO_AMBIENTE_FISCAL.homologacao], value: TIPO_AMBIENTE_FISCAL.homologacao },
    { label: AMBIENTE_FISCAL_LABEL[TIPO_AMBIENTE_FISCAL.producao], value: TIPO_AMBIENTE_FISCAL.producao }
];

export const TIPO_CERTIFICADO_LABEL: Record<TipoCertificadoDigital, string> = {
    [TIPO_CERTIFICADO_DIGITAL.a1]: 'A1',
    [TIPO_CERTIFICADO_DIGITAL.a3]: 'A3'
};

export const TIPO_CERTIFICADO_OPTIONS = [
    { label: TIPO_CERTIFICADO_LABEL[TIPO_CERTIFICADO_DIGITAL.a1], value: TIPO_CERTIFICADO_DIGITAL.a1 },
    { label: TIPO_CERTIFICADO_LABEL[TIPO_CERTIFICADO_DIGITAL.a3], value: TIPO_CERTIFICADO_DIGITAL.a3 }
];

export const SITUACAO_CERTIFICADO_LABEL: Record<SituacaoCertificadoDigital, string> = {
    [SITUACAO_CERTIFICADO_DIGITAL.ativo]: 'Ativo',
    [SITUACAO_CERTIFICADO_DIGITAL.inativo]: 'Inativo',
    [SITUACAO_CERTIFICADO_DIGITAL.vencido]: 'Vencido'
};

export const situacaoCertificadoSeverity = (situacao: SituacaoCertificadoDigital): 'success' | 'warning' | 'danger' =>
    situacao === SITUACAO_CERTIFICADO_DIGITAL.ativo ? 'success' : situacao === SITUACAO_CERTIFICADO_DIGITAL.inativo ? 'warning' : 'danger';

export const tipoAmbienteLabel = (value?: number | null) => AMBIENTE_FISCAL_LABEL[value as TipoAmbienteFiscal] ?? '-';
export const tipoCertificadoLabel = (value?: number | null) => TIPO_CERTIFICADO_LABEL[value as TipoCertificadoDigital] ?? '-';
export const situacaoCertificadoLabel = (value?: number | null) => SITUACAO_CERTIFICADO_LABEL[value as SituacaoCertificadoDigital] ?? '-';

export const CONFIGURACAO_FISCAL_EMPRESA = {
    naoConfiguradaTitulo: 'Empresa ainda não configurada',
    naoConfiguradaDescricao: 'Esta empresa ainda não tem configuração fiscal de emissão. Preencha o formulário e salve para criá-la.',
    inativaAviso: 'A configuração da empresa está inativa. Reative-a antes de alterá-la.',
    cardTitulo: 'Configuração da empresa',
    ambiente: 'Ambiente',
    emitirNFe: 'Emitir NF-e',
    emitirNFCe: 'Emitir NFC-e',
    emitirNFSe: 'Emitir NFS-e',
    certificado: 'Certificado digital',
    certificadoNenhum: 'Sem certificado vinculado (usa o certificado do servidor)',
    observacao: 'Observação',
    salvar: 'Salvar configuração',
    inativar: 'Inativar configuração',
    reativar: 'Reativar configuração',
    salvo: 'Configuração da empresa salva.',
    inativada: 'Configuração da empresa inativada.',
    reativada: 'Configuração da empresa reativada.'
} as const;

export const CONFIGURACAO_FISCAL_FILIAL = {
    selecionar: 'Filial',
    selecionarPlaceholder: 'Selecione uma filial',
    selecionarVazio: 'Selecione uma filial para ver a configuração.',
    semFiliais: 'A empresa não tem filiais cadastradas.',
    herdaTitulo: 'Esta filial herda a configuração da empresa (sem configuração própria).',
    herdaDescricao: 'Salve para criar uma configuração própria para a filial.',
    herdaCampo: 'Herda a configuração da empresa',
    camposIgnorados: 'Com a herança ligada, o ambiente, o certificado e as séries padrão desta filial são ignorados na emissão.',
    inativaAviso: 'A configuração da filial está inativa e não pode ser alterada por esta tela.',
    ambiente: 'Ambiente próprio',
    certificado: 'Certificado digital próprio',
    serieNFePadrao: 'Série padrão da NF-e',
    serieNFCePadrao: 'Série padrão da NFC-e',
    observacao: 'Observação',
    salvar: 'Salvar configuração da filial',
    salvo: 'Configuração da filial salva.',
    contextoDivergenteBloqueio: 'Indisponível: a empresa selecionada no contexto é diferente da empresa do seu usuário, e as filiais só podem ser configuradas na empresa do usuário.'
} as const;

export const CERTIFICADOS_DIGITAIS = {
    cardTitulo: 'Certificados digitais',
    somenteAtivos: 'Somente ativos',
    cadastrar: 'Cadastrar certificado',
    vazioTitulo: 'Nenhum certificado cadastrado',
    vazioDescricao: 'Cadastre o metadado do certificado (apelido, tipo, thumbprint e validade). O arquivo e a senha ficam no servidor.',
    colunas: { apelido: 'Apelido', tipo: 'Tipo', thumbprint: 'Thumbprint', validoAte: 'Válido até', situacao: 'Situação', filial: 'Filial', acoes: 'Ações' },
    empresaToda: 'Empresa toda',
    vencePrefixo: 'vence em',
    verificar: 'Verificar',
    inativar: 'Inativar',
    cadastrado: 'Certificado cadastrado.',
    inativado: 'Certificado inativado.',
    verificarTitulo: 'Resultado da verificação',
    verificarDisponivel: 'O servidor encontrou o certificado.',
    verificarIndisponivel: 'O servidor não encontrou o certificado.',
    avisoSefazSimulada: 'Com a SEFAZ simulada, este resultado não prova que o arquivo do certificado está montado no servidor.'
} as const;

export const CERTIFICADO_CADASTRAR_DIALOG = {
    titulo: 'Cadastrar certificado digital',
    confirmLabel: 'Cadastrar',
    apelido: 'Apelido',
    tipo: 'Tipo',
    thumbprint: 'Thumbprint',
    thumbprintHint: 'Informe o thumbprint exibido pelo Windows. Ele é usado só neste cadastro: depois de salvo, a tela mostra apenas os últimos 6 caracteres.',
    validoAte: 'Válido até',
    filial: 'Filial (opcional)',
    observacao: 'Observação',
    semUpload: 'Não há upload do arquivo .pfx nem da senha: eles ficam no servidor.'
} as const;

export const MOTIVO_DIALOG = {
    campo: 'Motivo obrigatório',
    hint: 'O motivo será enviado para auditoria e histórico da operação.',
    cancelar: 'Cancelar'
} as const;

export const CERTIFICADO_INATIVAR_DIALOG = {
    titulo: (apelido: string) => `Inativar certificado ${apelido}`,
    confirmLabel: 'Inativar',
    confirmLabelVinculado: 'Inativar mesmo assim',
    avisoVinculado: 'Este certificado está vinculado a uma configuração fiscal ativa. Se for inativado, a emissão vai falhar até que outro certificado seja vinculado.'
} as const;

export const EMPRESA_INATIVAR_DIALOG = { titulo: 'Inativar configuração da empresa', confirmLabel: 'Inativar' } as const;
export const EMPRESA_REATIVAR_DIALOG = { titulo: 'Reativar configuração da empresa', confirmLabel: 'Reativar' } as const;

/** Códigos do backend (`ConfiguracaoFiscalErrors.cs`) que o frontend trata de forma própria. */
export const CODIGO_CONFIGURACAO = {
    empresaObrigatoria: 'Fiscal.Configuracao.EmpresaObrigatoria',
    certificadoIndisponivel: 'Fiscal.Configuracao.CertificadoIndisponivel',
    certificadoVencido: 'Fiscal.Configuracao.CertificadoVencido',
    thumbprintJaCadastrado: 'Fiscal.Configuracao.ThumbprintJaCadastrado',
    conflitoDeGravacao: 'Fiscal.Configuracao.ConflitoDeGravacao',
    empresaNaoEncontrada: 'Fiscal.Configuracao.EmpresaNaoEncontrada',
    filialNaoEncontrada: 'Fiscal.Configuracao.FilialNaoEncontrada',
    filialInexistente: 'Fiscal.Configuracao.FilialInexistente',
    certificadoNaoEncontrado: 'Fiscal.Configuracao.CertificadoNaoEncontrado',
    inativaReativeAntes: 'Fiscal.Configuracao.InativaReativeAntes',
    /** Corpo genérico de TODO 404 da API (`ApiErrorResponseFilter`): o código específico não chega ao navegador. */
    recursoNaoEncontrado: 'Recurso.NaoEncontrado'
} as const;

/** Catálogo §5.1 (mensagem para o usuário), por `code`. `InativaReativeAntes` vem do C#, fora do §5.1. */
export const CONFIGURACAO_FISCAL_ERROS: Record<string, string> = {
    [CODIGO_CONFIGURACAO.empresaObrigatoria]: 'Selecione uma empresa',
    [CODIGO_CONFIGURACAO.certificadoIndisponivel]: 'O certificado não existe, está inativo, vencido ou não é desta empresa',
    [CODIGO_CONFIGURACAO.certificadoVencido]: 'A validade informada já passou',
    [CODIGO_CONFIGURACAO.thumbprintJaCadastrado]: 'O thumbprint já está cadastrado, ativo ou inativo',
    [CODIGO_CONFIGURACAO.conflitoDeGravacao]: 'Outra pessoa gravou ao mesmo tempo; os dados foram recarregados. Confira e tente novamente.',
    [CODIGO_CONFIGURACAO.empresaNaoEncontrada]: 'A empresa ainda não tem configuração fiscal de emissão.',
    [CODIGO_CONFIGURACAO.filialNaoEncontrada]: 'A filial ainda não tem configuração própria; ela herda a da empresa.',
    [CODIGO_CONFIGURACAO.filialInexistente]: 'Filial não encontrada na empresa do seu usuário.',
    [CODIGO_CONFIGURACAO.certificadoNaoEncontrado]: 'Certificado não encontrado.',
    [CODIGO_CONFIGURACAO.inativaReativeAntes]: 'A configuração está inativa. Reative-a antes de alterá-la.'
};

/** Mensagem do catálogo quando o `code` é conhecido; senão a mensagem que a API devolveu. */
export const mensagemErroConfiguracaoFiscal = (error?: ApiError | null): string | undefined => {
    if (!error) return undefined;
    return (error.code ? CONFIGURACAO_FISCAL_ERROS[error.code] : undefined) ?? error.message;
};

/** Mesma `ApiError`, com a mensagem do catálogo, para entregar ao `ApiErrorPanel` (preserva code/status/traceId). */
export const erroConfiguracaoFiscalParaPainel = (error: ApiError): ApiError => ({ ...error, message: mensagemErroConfiguracaoFiscal(error) ?? error.message });

export const ehConflitoDeGravacao = (error?: ApiError | null) => error?.code === CODIGO_CONFIGURACAO.conflitoDeGravacao;

/**
 * 404 de "ainda não configurada" (empresa ou filial) NÃO é erro. Como o `ApiErrorResponseFilter` troca o código de
 * todo 404 por `Recurso.NaoEncontrado`, aceita o código específico e o genérico; 404 sem corpo reconhecido (rota
 * ausente, backend sem a F3) continua sendo erro, para não anunciar "não configurada" no lugar de uma falha.
 */
export const ehEstadoNaoConfigurada = (error: ApiError, codigoEspecifico: string) =>
    error.status === 404 && (error.code === codigoEspecifico || error.code === CODIGO_CONFIGURACAO.recursoNaoEncontrado);

export const DIAS_ALERTA_VALIDADE = 30;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export type ValidadeCertificado = {
    /** Data e hora no fuso local do navegador, ou '-' quando o valor é inválido. */
    texto: string;
    /** Dias inteiros até o vencimento (negativo se vencido); null se o valor é inválido. */
    diasRestantes: number | null;
    /** true quando falta menos de 30 dias e o certificado ainda não venceu. */
    venceEmBreve: boolean;
    vencido: boolean;
};

export const validadeCertificado = (validoAteIso: string, agora: Date = new Date()): ValidadeCertificado => {
    const data = new Date(validoAteIso);
    if (!Number.isFinite(data.getTime())) return { texto: '-', diasRestantes: null, venceEmBreve: false, vencido: false };
    const diferenca = data.getTime() - agora.getTime();
    const diasRestantes = Math.floor(diferenca / MS_POR_DIA);
    return {
        texto: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data),
        diasRestantes,
        venceEmBreve: diferenca >= 0 && diferenca < DIAS_ALERTA_VALIDADE * MS_POR_DIA,
        vencido: diferenca < 0
    };
};

export const certificadoOptionLabel = (apelido: string, thumbprintMascarado: string) => `${apelido} • ${thumbprintMascarado}`;
