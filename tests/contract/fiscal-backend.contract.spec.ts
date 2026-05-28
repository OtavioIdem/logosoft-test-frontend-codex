import { request as playwrightRequest, expect, test } from '@playwright/test';
import { maskFiscalSensitiveText } from '@/features/fiscal/components/fiscalUiUtils';

const apiUrl = process.env.LOGOSOFT_CONTRACT_API_URL?.replace(/\/+$/, '');
const accessToken = process.env.LOGOSOFT_CONTRACT_ACCESS_TOKEN;
const empresaId = process.env.LOGOSOFT_CONTRACT_EMPRESA_ID;
const filialId = process.env.LOGOSOFT_CONTRACT_FILIAL_ID;
const notaFiscalIdFromEnv = process.env.LOGOSOFT_CONTRACT_NOTA_FISCAL_ID;
const ufAutorizadora = process.env.LOGOSOFT_CONTRACT_UF_AUTORIZADORA ?? 'SP';
const runStatusServico = process.env.LOGOSOFT_CONTRACT_RUN_STATUS_SERVICO === 'true';
const runExportCsv = process.env.LOGOSOFT_CONTRACT_RUN_EXPORT_CSV === 'true';
const exportCsvMotivo = process.env.LOGOSOFT_CONTRACT_EXPORT_CSV_MOTIVO ?? 'Contrato fiscal frontend/backend controlado';

const shouldRun = Boolean(apiUrl && accessToken && empresaId);
const heavyListFields = ['itens', 'impostos', 'xmls', 'eventos', 'conteudoXml', 'payloadResumo', 'payloadEnviado', 'payloadRecebido'];
const sensitivePatterns = [
    /<\s*(?:NFe|infNFe|nfeProc|procNFe|enviNFe|consStatServ|consSitNFe|inutNFe|evento|procEventoNFe)\b/i,
    /<\s*\w+[^>]*>[\s\S]*<\s*\/\s*\w+\s*>/i,
    /\b(?:token|senha|password|secret|segredo|certificate|certificado|bearer)\b\s*[:=]/i,
    /-----BEGIN\s+(?:CERTIFICATE|PRIVATE KEY)-----/i
];

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const hasOwn = (source: unknown, key: string) => Object.prototype.hasOwnProperty.call(source, key);

const requireRecord = (value: unknown, label: string): JsonRecord => {
    expect(isRecord(value), `${label} deve ser objeto`).toBe(true);
    return value as JsonRecord;
};

const requireArray = (value: unknown, label: string): unknown[] => {
    expect(Array.isArray(value), `${label} deve ser array`).toBe(true);
    return value as unknown[];
};

const requireString = (source: JsonRecord, key: string, label: string) => {
    expect(typeof source[key], `${label}.${key} deve ser string`).toBe('string');
};

const requireNumber = (source: JsonRecord, key: string, label: string) => {
    expect(typeof source[key], `${label}.${key} deve ser number`).toBe('number');
};

const requireBoolean = (source: JsonRecord, key: string, label: string) => {
    expect(typeof source[key], `${label}.${key} deve ser boolean`).toBe('boolean');
};

const assertNoHeavyFields = (source: JsonRecord, label: string) => {
    for (const field of heavyListFields) {
        expect(hasOwn(source, field), `${label} não deve expor ${field}`).toBe(false);
    }
};

const assertNoSensitiveText = (value: unknown, label: string) => {
    if (typeof value !== 'string') return;

    for (const pattern of sensitivePatterns) {
        expect(pattern.test(value), `${label} não deve expor XML, token, senha, segredo ou certificado`).toBe(false);
    }

    expect(maskFiscalSensitiveText(value), `${label} deve chegar sanitizado pelo backend`).toBe(value);
};

const assertNoSensitiveObject = (value: unknown, label: string) => {
    if (typeof value === 'string') {
        assertNoSensitiveText(value, label);
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item, index) => assertNoSensitiveObject(item, `${label}[${index}]`));
        return;
    }

    if (!isRecord(value)) return;

    for (const [key, nested] of Object.entries(value)) {
        assertNoSensitiveObject(nested, `${label}.${key}`);
    }
};

const buildQuery = (params: Record<string, string | number | boolean | null | undefined>) => {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') continue;
        query.set(key, String(value));
    }

    return query.toString();
};

test.describe('contrato fiscal contra backend controlado', () => {
    test.skip(!shouldRun, 'Defina LOGOSOFT_CONTRACT_API_URL, LOGOSOFT_CONTRACT_ACCESS_TOKEN e LOGOSOFT_CONTRACT_EMPRESA_ID para validar contrato fiscal contra backend controlado.');

    test('valida DTOs fiscais principais retornados pela API real/controlada', async () => {
        const api = await playwrightRequest.newContext({
            baseURL: apiUrl,
            extraHTTPHeaders: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json'
            }
        });

        const listResponse = await api.get(`/api/fiscal/notas-fiscais?${buildQuery({ empresaId, filialId, page: 1, pageSize: 5 })}`);
        expect(listResponse.ok(), `listagem fiscal deve retornar 2xx: ${listResponse.status()}`).toBe(true);

        const listBody = requireRecord(await listResponse.json(), 'NotaFiscalListagemResponse');
        const items = requireArray(listBody.items, 'NotaFiscalListagemResponse.items');
        requireNumber(listBody, 'page', 'NotaFiscalListagemResponse');
        requireNumber(listBody, 'pageSize', 'NotaFiscalListagemResponse');
        requireNumber(listBody, 'totalItems', 'NotaFiscalListagemResponse');
        requireNumber(listBody, 'totalPages', 'NotaFiscalListagemResponse');

        items.forEach((rawItem, index) => {
            const item = requireRecord(rawItem, `NotaFiscalListagemResponse.items[${index}]`);
            requireString(item, 'id', `items[${index}]`);
            requireString(item, 'empresaId', `items[${index}]`);
            requireNumber(item, 'tipoDocumento', `items[${index}]`);
            requireNumber(item, 'tipoOperacao', `items[${index}]`);
            requireNumber(item, 'statusFiscal', `items[${index}]`);
            requireNumber(item, 'origem', `items[${index}]`);
            requireString(item, 'serie', `items[${index}]`);
            requireString(item, 'numero', `items[${index}]`);
            requireNumber(item, 'valorTotal', `items[${index}]`);
            requireBoolean(item, 'possuiXmlEnvio', `items[${index}]`);
            requireBoolean(item, 'possuiXmlAutorizado', `items[${index}]`);
            requireBoolean(item, 'possuiDanfe', `items[${index}]`);
            assertNoHeavyFields(item, `items[${index}]`);
            assertNoSensitiveObject(item, `items[${index}]`);
        });

        const notaFiscalId = notaFiscalIdFromEnv ?? (isRecord(items[0]) && typeof items[0].id === 'string' ? items[0].id : null);

        if (notaFiscalId) {
            const detalheResponse = await api.get(`/api/fiscal/notas-fiscais/${notaFiscalId}`);
            expect(detalheResponse.ok(), `detalhe fiscal deve retornar 2xx: ${detalheResponse.status()}`).toBe(true);
            const detalhe = requireRecord(await detalheResponse.json(), 'NotaFiscalResponse');
            requireString(detalhe, 'id', 'NotaFiscalResponse');
            requireString(detalhe, 'empresaId', 'NotaFiscalResponse');
            requireNumber(detalhe, 'tipoDocumento', 'NotaFiscalResponse');
            requireNumber(detalhe, 'tipoOperacao', 'NotaFiscalResponse');
            requireNumber(detalhe, 'statusFiscal', 'NotaFiscalResponse');
            requireArray(detalhe.itens, 'NotaFiscalResponse.itens');
            requireArray(detalhe.impostos, 'NotaFiscalResponse.impostos');
            const xmls = requireArray(detalhe.xmls, 'NotaFiscalResponse.xmls');
            requireArray(detalhe.eventos, 'NotaFiscalResponse.eventos');
            expect(hasOwn(detalhe, 'conteudoXml'), 'detalhe não deve expor conteudoXml completo').toBe(false);

            xmls.forEach((rawXml, index) => {
                const xml = requireRecord(rawXml, `NotaFiscalResponse.xmls[${index}]`);
                requireString(xml, 'id', `xmls[${index}]`);
                requireNumber(xml, 'tipo', `xmls[${index}]`);
                requireString(xml, 'hashSha256', `xmls[${index}]`);
                expect(hasOwn(xml, 'conteudoXml'), `xmls[${index}] não deve expor conteudoXml completo`).toBe(false);
                assertNoSensitiveObject(xml, `xmls[${index}]`);
            });

            const resumoResponse = await api.get(`/api/fiscal/notas-fiscais/${notaFiscalId}/resumo-operacional`);
            expect(resumoResponse.ok(), `resumo operacional deve retornar 2xx: ${resumoResponse.status()}`).toBe(true);
            const resumo = requireRecord(await resumoResponse.json(), 'ResumoOperacionalNotaFiscalResponse');
            requireString(resumo, 'notaFiscalId', 'ResumoOperacionalNotaFiscalResponse');
            const acoes = requireRecord(resumo.acoes, 'ResumoOperacionalNotaFiscalResponse.acoes');
            for (const key of ['podeValidar', 'podeGerarXmlEnvio', 'podeAssinarXmlEnvio', 'podeTransmitirSefaz', 'podeGerarDanfe', 'podeBaixarEstoque', 'podeGerarContaReceber', 'podeCancelar', 'podeEmitirCartaCorrecao']) {
                requireBoolean(acoes, key, 'ResumoOperacionalNotaFiscalResponse.acoes');
            }

            const workflowResponse = await api.get(`/api/fiscal/notas-fiscais/${notaFiscalId}/workflow-operacional`);
            expect(workflowResponse.ok(), `workflow operacional deve retornar 2xx: ${workflowResponse.status()}`).toBe(true);
            const workflow = requireRecord(await workflowResponse.json(), 'WorkflowOperacionalNotaFiscalResponse');
            requireString(workflow, 'notaFiscalId', 'WorkflowOperacionalNotaFiscalResponse');
            requireNumber(workflow, 'percentualConcluido', 'WorkflowOperacionalNotaFiscalResponse');
            const etapas = requireArray(workflow.etapas, 'WorkflowOperacionalNotaFiscalResponse.etapas');
            const proximasAcoes = requireArray(workflow.proximasAcoes, 'WorkflowOperacionalNotaFiscalResponse.proximasAcoes');
            expect(etapas.length, 'workflow deve retornar etapas operacionais').toBeGreaterThan(0);

            proximasAcoes.forEach((rawAction, index) => {
                const action = requireRecord(rawAction, `WorkflowOperacionalNotaFiscalResponse.proximasAcoes[${index}]`);
                requireString(action, 'codigo', `proximasAcoes[${index}]`);
                requireString(action, 'nome', `proximasAcoes[${index}]`);
                requireString(action, 'metodoHttp', `proximasAcoes[${index}]`);
                requireString(action, 'endpoint', `proximasAcoes[${index}]`);
                requireBoolean(action, 'habilitada', `proximasAcoes[${index}]`);
            });

            const integracoesResponse = await api.get(`/api/fiscal/notas-fiscais/${notaFiscalId}/integracoes`);
            expect(integracoesResponse.ok(), `integrações da nota devem retornar 2xx: ${integracoesResponse.status()}`).toBe(true);
            const integracoes = requireArray(await integracoesResponse.json(), 'LogIntegracaoFiscalResponse[]');
            integracoes.forEach((rawLog, index) => {
                const log = requireRecord(rawLog, `LogIntegracaoFiscalResponse[${index}]`);
                requireString(log, 'id', `integracoes[${index}]`);
                requireString(log, 'operacao', `integracoes[${index}]`);
                requireNumber(log, 'statusIntegracao', `integracoes[${index}]`);
                requireBoolean(log, 'podeReprocessar', `integracoes[${index}]`);
                requireBoolean(log, 'contemDadoSensivelOcultado', `integracoes[${index}]`);
                assertNoSensitiveObject(log.payloadResumo, `integracoes[${index}].payloadResumo`);
            });
        }

        const observabilidadeResponse = await api.get(`/api/fiscal/observabilidade/integracoes?${buildQuery({ empresaId, filialId, take: 10 })}`);
        expect(observabilidadeResponse.ok(), `observabilidade fiscal deve retornar 2xx: ${observabilidadeResponse.status()}`).toBe(true);
        const observabilidade = requireRecord(await observabilidadeResponse.json(), 'ObservabilidadeFiscalResponse');
        requireString(observabilidade, 'empresaId', 'ObservabilidadeFiscalResponse');
        requireNumber(observabilidade, 'totalLogsAnalisados', 'ObservabilidadeFiscalResponse');
        requireNumber(observabilidade, 'totalSucesso', 'ObservabilidadeFiscalResponse');
        requireNumber(observabilidade, 'totalFalha', 'ObservabilidadeFiscalResponse');
        requireNumber(observabilidade, 'totalReprocessamento', 'ObservabilidadeFiscalResponse');
        requireNumber(observabilidade, 'totalPendente', 'ObservabilidadeFiscalResponse');
        requireBoolean(observabilidade, 'possuiFalhaRecente', 'ObservabilidadeFiscalResponse');
        requireBoolean(observabilidade, 'possuiPendenciaRecente', 'ObservabilidadeFiscalResponse');
        const logsRecentes = requireArray(observabilidade.logsRecentes, 'ObservabilidadeFiscalResponse.logsRecentes');
        logsRecentes.forEach((log, index) => assertNoSensitiveObject(log, `logsRecentes[${index}]`));

        if (runStatusServico) {
            const statusResponse = await api.post('/api/fiscal/sefaz/status-servico', {
                data: {
                    empresaId,
                    filialId: filialId ?? null,
                    tipoDocumento: 1,
                    ufAutorizadora,
                    xmlStatusServico: '<consStatServ />',
                    validarSchemaAntesConsulta: false,
                    schemaSetName: null,
                    correlationId: `contract-status-servico-${Date.now()}`
                }
            });
            expect(statusResponse.ok(), `status de serviço deve retornar 2xx: ${statusResponse.status()}`).toBe(true);
            const statusBody = requireRecord(await statusResponse.json(), 'StatusServicoFiscalResponse');
            requireString(statusBody, 'empresaId', 'StatusServicoFiscalResponse');
            requireNumber(statusBody, 'tipoDocumento', 'StatusServicoFiscalResponse');
            requireString(statusBody, 'ufAutorizadora', 'StatusServicoFiscalResponse');
            requireBoolean(statusBody, 'comunicacaoOk', 'StatusServicoFiscalResponse');
            requireBoolean(statusBody, 'disponivel', 'StatusServicoFiscalResponse');
            requireBoolean(statusBody, 'deveReprocessar', 'StatusServicoFiscalResponse');
            assertNoSensitiveObject(statusBody, 'StatusServicoFiscalResponse');
        }

        if (runExportCsv) {
            const csvResponse = await api.get(`/api/fiscal/notas-fiscais/exportacoes/csv?${buildQuery({ empresaId, filialId, limite: 10, motivo: exportCsvMotivo })}`);
            expect(csvResponse.ok(), `exportação CSV fiscal deve retornar 2xx: ${csvResponse.status()}`).toBe(true);
            const contentType = csvResponse.headers()['content-type'] ?? '';
            const disposition = csvResponse.headers()['content-disposition'] ?? '';
            expect(contentType.toLowerCase()).toContain('text/csv');
            expect(disposition.toLowerCase()).toContain('attachment');
            const body = await csvResponse.text();
            assertNoSensitiveText(body, 'CSV fiscal exportado');
        }

        await api.dispose();
    });
});
