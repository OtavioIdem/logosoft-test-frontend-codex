import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfiguracaoFiscalFilialTab } from '@/features/fiscal/components/ConfiguracaoFiscalFilialTab';
import { CONFIGURACAO_FISCAL_FILIAL, CONFIGURACAO_FISCAL_PERMISSAO } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { ConfiguracaoFiscalEscopo } from '@/features/fiscal/hooks/useConfiguracaoFiscal';
import {
    EMPRESA_USUARIO_ID,
    erroServidor,
    FILIAL_ID,
    filialConfigurada,
    instalarServidorFiscal
} from '@/tests/mocks/fiscal/configuracaoFiscalServidor';

// Dublê padrão do repo para o Dropdown do PrimeReact (ver tests/mocks/primereact/dropdown.tsx).
vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));

// Só a lista de filiais é mockada (o hook depende de contexto e permissão, como no SeriesFiscaisPage.test.tsx). O cliente
// HTTP, o cache e o formulário são reais; o adapter HTTP é o servidor falso.
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', () => ({
    useFiliaisOptions: () => ({
        options: [{ label: 'Filial Centro', value: FILIAL_ID }],
        blocked: false,
        blockedMessage: '',
        error: null,
        isFetching: false
    })
}));

// v1.11.0a8b81 (AC-5, AC-1 leitura, contexto divergente). Herança e campos desabilitados; 404 é "herda", não erro.

const ESCOPO: ConfiguracaoFiscalEscopo = { organizationalScopeKey: 'user:empresa:filial:1', usuarioEmpresaId: EMPRESA_USUARIO_ID };
const GET_FILIAL = `GET /api/fiscal/configuracao/filiais/${FILIAL_ID}`;
const PUT_FILIAL = `PUT /api/fiscal/configuracao/filiais/${FILIAL_ID}`;
const SERIE_NFE = 'Série padrão da NF-e';
const SERIE_NFCE = 'Série padrão da NFC-e';

const renderAba = (props: { podeGerenciar?: boolean; contextoDivergente?: boolean } = {}) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ConfiguracaoFiscalFilialTab
                escopo={ESCOPO}
                filialId={FILIAL_ID}
                contextoDivergente={props.contextoDivergente ?? false}
                podeConsultar
                podeGerenciar={props.podeGerenciar ?? true}
            />
        </QueryClientProvider>
    );
    return { queryClient };
};

describe('AC-5: filial sem configuração própria herda da empresa', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('404 "Recurso.NaoEncontrado" mostra "herda da empresa", com a herança marcada e sem erro', async () => {
        const servidor = instalarServidorFiscal({ [GET_FILIAL]: erroServidor(404, 'Recurso.NaoEncontrado') });
        restaurar = servidor.restaurar;

        renderAba();

        // Texto com parênteses: busca por substring, sem RegExp (os parênteses seriam grupo de regex).
        expect(await screen.findByText(CONFIGURACAO_FISCAL_FILIAL.herdaTitulo, { exact: false })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_FILIAL.herdaCampo })).toBeChecked();
        expect(screen.queryByText('Recurso não encontrado.')).not.toBeInTheDocument();
    });

    it('com a herança ligada, série NFe, série NFCe e certificado ficam desabilitados e o texto diz que são ignorados', async () => {
        const servidor = instalarServidorFiscal({ [GET_FILIAL]: { status: 200, body: filialConfigurada({ herdaConfiguracaoEmpresa: true }) } });
        restaurar = servidor.restaurar;

        renderAba();

        expect(await screen.findByText(CONFIGURACAO_FISCAL_FILIAL.camposIgnorados)).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_FILIAL.herdaCampo })).toBeChecked();
        expect(screen.getByLabelText(SERIE_NFE)).toBeDisabled();
        expect(screen.getByLabelText(SERIE_NFCE)).toBeDisabled();
        expect(screen.getByRole('combobox', { name: CONFIGURACAO_FISCAL_FILIAL.ambiente })).toBeDisabled();
        expect(screen.getByRole('combobox', { name: CONFIGURACAO_FISCAL_FILIAL.certificado })).toBeDisabled();
    });

    it('desligando a herança, os campos próprios passam a ser editáveis', async () => {
        const servidor = instalarServidorFiscal({ [GET_FILIAL]: { status: 200, body: filialConfigurada({ herdaConfiguracaoEmpresa: true }) } });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        await usuario.click(await screen.findByRole('checkbox', { name: CONFIGURACAO_FISCAL_FILIAL.herdaCampo }));

        expect(screen.getByLabelText(SERIE_NFE)).toBeEnabled();
        expect(screen.getByLabelText(SERIE_NFCE)).toBeEnabled();
        expect(screen.getByRole('combobox', { name: CONFIGURACAO_FISCAL_FILIAL.ambiente })).toBeEnabled();
        expect(screen.getByRole('combobox', { name: CONFIGURACAO_FISCAL_FILIAL.certificado })).toBeEnabled();
    });

    it('salvar com herança desligada envia o PUT da filial com as séries, sem filialId nem empresaId no corpo', async () => {
        const servidor = instalarServidorFiscal({
            [GET_FILIAL]: { status: 200, body: filialConfigurada({ herdaConfiguracaoEmpresa: false, serieNFePadrao: '1' }) },
            [PUT_FILIAL]: (chamada) => ({ status: 200, body: filialConfigurada({ ...(chamada.body as Record<string, unknown>) }) })
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        const serie = await screen.findByLabelText(SERIE_NFE);
        await usuario.clear(serie);
        await usuario.type(serie, '55');
        await usuario.click(screen.getByRole('button', { name: CONFIGURACAO_FISCAL_FILIAL.salvar }));

        await waitFor(() => expect(servidor.chamadasDe(PUT_FILIAL)).toHaveLength(1));
        const [put] = servidor.chamadasDe(PUT_FILIAL);
        expect(put.body).toMatchObject({ ambiente: 2, herdaConfiguracaoEmpresa: false, serieNFePadrao: '55' });
        expect(put.body).not.toHaveProperty('filialId');
        expect(put.body).not.toHaveProperty('empresaId');
    });

    it('filial inativa: avisa que não pode ser alterada aqui e não mostra o salvar', async () => {
        const servidor = instalarServidorFiscal({ [GET_FILIAL]: { status: 200, body: filialConfigurada({ ativo: false }) } });
        restaurar = servidor.restaurar;

        renderAba();

        expect(await screen.findByText(CONFIGURACAO_FISCAL_FILIAL.inativaAviso)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: CONFIGURACAO_FISCAL_FILIAL.salvar })).not.toBeInTheDocument();
    });
});

describe('AC-1 (leitura) e contexto divergente (AC-11)', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('sem FISCAL_CONFIGURACAO_GERENCIAR a filial é só leitura: sem salvar e com o motivo', async () => {
        const servidor = instalarServidorFiscal({ [GET_FILIAL]: { status: 200, body: filialConfigurada({ herdaConfiguracaoEmpresa: false }) } });
        restaurar = servidor.restaurar;

        renderAba({ podeGerenciar: false });

        expect(await screen.findByText(new RegExp(CONFIGURACAO_FISCAL_PERMISSAO.semGerenciar))).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: CONFIGURACAO_FISCAL_FILIAL.salvar })).not.toBeInTheDocument();
        expect(screen.getByLabelText(SERIE_NFE)).toBeDisabled();
    });

    it('contexto divergente da empresa do usuário bloqueia a aba e não consulta filiais', () => {
        const servidor = instalarServidorFiscal({});
        restaurar = servidor.restaurar;

        renderAba({ contextoDivergente: true });

        expect(screen.getByText(CONFIGURACAO_FISCAL_FILIAL.contextoDivergenteBloqueio)).toBeInTheDocument();
        expect(servidor.chamadasDe(GET_FILIAL)).toHaveLength(0);
        expect(screen.queryByRole('button', { name: CONFIGURACAO_FISCAL_FILIAL.salvar })).not.toBeInTheDocument();
    });
});

describe('estado inicial sem filial no header (D115, AC-2)', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('sem filial, mostra a instrução para escolher no header, nenhum campo, e zero requisições a /filiais/', () => {
        const servidor = instalarServidorFiscal({});
        restaurar = servidor.restaurar;
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        render(
            <QueryClientProvider client={queryClient}>
                <ConfiguracaoFiscalFilialTab escopo={ESCOPO} filialId={null} contextoDivergente={false} podeConsultar podeGerenciar />
            </QueryClientProvider>
        );

        expect(screen.getByText(CONFIGURACAO_FISCAL_FILIAL.selecionarNoContexto)).toBeInTheDocument();
        expect(within(document.body).queryByLabelText(SERIE_NFE)).not.toBeInTheDocument();
        expect(servidor.chamadas.filter((chamada) => chamada.url.includes('/filiais/'))).toHaveLength(0);
    });
});
