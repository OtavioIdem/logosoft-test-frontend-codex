import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MutationObserver, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CertificadosDigitaisTab } from '@/features/fiscal/components/CertificadosDigitaisTab';
import { CERTIFICADO_CADASTRAR_DIALOG, CERTIFICADO_INATIVAR_DIALOG, CERTIFICADOS_DIGITAIS, CONFIGURACAO_FISCAL_PERMISSAO, MOTIVO_DIALOG } from '@/features/fiscal/components/configuracaoFiscalLabels';
import { configuracaoFiscalFilialQueryKey, ConfiguracaoFiscalEscopo } from '@/features/fiscal/hooks/useConfiguracaoFiscal';
import {
    CERT_FILIAL_ID,
    CERT_MATRIZ_ID,
    certificadoFilial,
    certificadoMatriz,
    diasAFrente,
    EMPRESA_USUARIO_ID,
    erroServidor,
    empresaConfigurada,
    FILIAL_ID,
    filialConfigurada,
    instalarServidorFiscal,
    RotaServidor,
    THUMBPRINT_DIGITADO,
    THUMBPRINT_MASCARADO_MATRIZ
} from '@/tests/mocks/fiscal/configuracaoFiscalServidor';

// Lista de filiais mockada (mesmo motivo do teste da aba Filiais). Todo o resto é real: cliente, cache, formulários e o
// servidor falso no adapter HTTP.
vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', () => ({
    useFiliaisOptions: () => ({
        options: [{ label: 'Filial Centro', value: FILIAL_ID }],
        blocked: false,
        blockedMessage: '',
        error: null,
        isFetching: false
    })
}));

// v1.11.0a8b81 (AC-6, AC-7, AC-8, AC-9 do certificado, AC-10 no diálogo de verificar, e o segredo do thumbprint).

const ESCOPO: ConfiguracaoFiscalEscopo = { organizationalScopeKey: 'user:empresa:all:1', usuarioEmpresaId: EMPRESA_USUARIO_ID };
const GET_CERTIFICADOS = 'GET /api/fiscal/configuracao/certificados';
const POST_CERTIFICADO = 'POST /api/fiscal/configuracao/certificados';
const GET_EMPRESA = 'GET /api/fiscal/configuracao/empresa';

type Opcoes = {
    certificados?: unknown[];
    empresa?: RotaServidor;
    sefazSimulada?: boolean;
    podeGerenciar?: boolean;
    filialSelecionadaId?: string | null;
    contextoDivergente?: boolean;
    queryClient?: QueryClient;
};

const renderAba = (opcoes: Opcoes = {}) => {
    const queryClient = opcoes.queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <CertificadosDigitaisTab
                escopo={ESCOPO}
                empresaContextoId={EMPRESA_USUARIO_ID}
                filialSelecionadaId={opcoes.filialSelecionadaId ?? null}
                contextoDivergente={opcoes.contextoDivergente ?? false}
                sefazSimulada={opcoes.sefazSimulada ?? false}
                podeConsultar
                podeGerenciar={opcoes.podeGerenciar ?? true}
            />
        </QueryClientProvider>
    );
    return { queryClient };
};

const servidorCom = (opcoes: Opcoes & { cadastro?: RotaServidor; verificar?: RotaServidor; inativar?: RotaServidor }) => {
    const rotas: Record<string, RotaServidor> = {
        [GET_CERTIFICADOS]: { status: 200, body: opcoes.certificados ?? [] },
        [GET_EMPRESA]: opcoes.empresa ?? erroServidor(404, 'Recurso.NaoEncontrado'),
        [POST_CERTIFICADO]: opcoes.cadastro ?? { status: 201, body: certificadoMatriz({ apelido: 'Matriz Nova' }) },
        ['POST /api/fiscal/configuracao/certificados/' + CERT_MATRIZ_ID + '/verificar']: opcoes.verificar ?? { status: 200, body: { disponivel: false, motivo: 'Arquivo não montado no servidor' } },
        ['POST /api/fiscal/configuracao/certificados/' + CERT_MATRIZ_ID + '/inativar']: opcoes.inativar ?? { status: 200, body: certificadoMatriz({ situacao: 2 }) }
    };
    return instalarServidorFiscal(rotas);
};

/** Tudo o que ficou no cache do React Query (consultas e mutações), em texto. Segredo que aparecer aqui vazou. */
const conteudoDoCache = (queryClient: QueryClient) =>
    JSON.stringify({
        consultas: queryClient.getQueryCache().getAll().map((consulta) => consulta.state.data),
        mutacoes: queryClient.getMutationCache().getAll().map((mutacao) => mutacao.state)
    });

/**
 * Digita a validade num único evento `input` com o texto completo. Medido: digitação caractere a caractere
 * (`userEvent.type`) deixou o campo vazio, e o texto completo converte. Formato aceito pelo DateTimeInput:
 * `dd/mm/yyyy HH:mm` (ano com quatro dígitos); ano com dois dígitos devolveu null no mesmo teste isolado.
 */
const digitarValidade = (campo: HTMLElement, texto: string) => fireEvent.input(campo, { target: { value: texto } });

const abrirCadastro = async (usuario: ReturnType<typeof userEvent.setup>) => {
    await usuario.click(await screen.findByRole('button', { name: CERTIFICADOS_DIGITAIS.cadastrar }));
    return screen.findByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo });
};

describe('AC-6: lista mostra só o mascarado, destaca validade abaixo de 30 dias, situação por rótulo', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('cada linha mostra o próprio mascarado e só ela destaca "vence em", comparando item a item', async () => {
        const servidor = servidorCom({
            certificados: [
                certificadoMatriz({ validoAte: diasAFrente(10.5) }),
                certificadoFilial({ validoAte: diasAFrente(200) })
            ]
        });
        restaurar = servidor.restaurar;

        renderAba();

        const linhaMatriz = await screen.findByRole('row', { name: /Certificado Matriz/ });
        const linhaFilial = screen.getByRole('row', { name: /Certificado Filial/ });

        expect(within(linhaMatriz).getByText(THUMBPRINT_MASCARADO_MATRIZ)).toBeInTheDocument();
        expect(within(linhaMatriz).getByText('vence em 10 dias')).toBeInTheDocument();

        expect(within(linhaFilial).getByText('******A0B1C')).toBeInTheDocument();
        expect(within(linhaFilial).queryByText(/vence em/)).not.toBeInTheDocument();
    });

    it('situação aparece por rótulo (Inativo, Vencido), nunca pelo número', async () => {
        const servidor = servidorCom({
            certificados: [certificadoMatriz({ situacao: 2 }), certificadoFilial({ situacao: 3 })]
        });
        restaurar = servidor.restaurar;

        renderAba();

        expect(await screen.findByText('Inativo')).toBeInTheDocument();
        expect(screen.getByText('Vencido')).toBeInTheDocument();
        expect(screen.queryByText('2')).not.toBeInTheDocument();
        expect(screen.queryByText('3')).not.toBeInTheDocument();
    });

    it('"Somente ativos" manda somenteAtivos=true na consulta', async () => {
        const servidor = servidorCom({ certificados: [certificadoMatriz()] });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        await screen.findByRole('row', { name: /Certificado Matriz/ });
        await usuario.click(screen.getByRole('checkbox', { name: CERTIFICADOS_DIGITAIS.somenteAtivos }));

        await waitFor(() => expect(servidor.chamadasDe(GET_CERTIFICADOS).some((chamada) => chamada.params.somenteAtivos === true)).toBe(true));
    });
});

describe('AC-7: Verificar só com GERENCIAR, e o resultado diz o que o servidor encontrou', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('com GERENCIAR: Verificar chama o endpoint e mostra o motivo, sem o aviso de SEFAZ simulada quando ela não é simulada', async () => {
        const servidor = servidorCom({ certificados: [certificadoMatriz()], sefazSimulada: false });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        await usuario.click(await screen.findByRole('button', { name: `${CERTIFICADOS_DIGITAIS.verificar} certificado Certificado Matriz` }));

        expect(await screen.findByText(CERTIFICADOS_DIGITAIS.verificarIndisponivel)).toBeInTheDocument();
        expect(screen.getByText('Arquivo não montado no servidor')).toBeInTheDocument();
        expect(servidor.chamadasDe(`POST /api/fiscal/configuracao/certificados/${CERT_MATRIZ_ID}/verificar`)).toHaveLength(1);
        expect(screen.queryByText(new RegExp(CERTIFICADOS_DIGITAIS.avisoSefazSimulada))).not.toBeInTheDocument();
    });

    it('com SEFAZ simulada, o resultado de Verificar traz o aviso de que não prova o arquivo montado (AC-10)', async () => {
        const servidor = servidorCom({ certificados: [certificadoMatriz()], sefazSimulada: true, verificar: { status: 200, body: { disponivel: true, motivo: '' } } });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba({ sefazSimulada: true });
        await usuario.click(await screen.findByRole('button', { name: `${CERTIFICADOS_DIGITAIS.verificar} certificado Certificado Matriz` }));

        expect(await screen.findByText(CERTIFICADOS_DIGITAIS.verificarDisponivel)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(CERTIFICADOS_DIGITAIS.avisoSefazSimulada))).toBeInTheDocument();
    });

    it('só CONSULTAR: não há Verificar, nem Inativar, nem Cadastrar; a lista continua visível com o motivo', async () => {
        const servidor = servidorCom({ certificados: [certificadoMatriz()], podeGerenciar: false });
        restaurar = servidor.restaurar;

        renderAba({ podeGerenciar: false });

        expect(await screen.findByRole('row', { name: /Certificado Matriz/ })).toBeInTheDocument();
        expect(screen.getByText(new RegExp(CONFIGURACAO_FISCAL_PERMISSAO.semGerenciar))).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Verificar/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Inativar/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: CERTIFICADOS_DIGITAIS.cadastrar })).not.toBeInTheDocument();
    });
});

describe('AC-6: cadastro manda validoAte em UTC e não guarda o thumbprint depois', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    // Prova de que a asserção de "não vaza" pode ficar vermelha: se o detector não enxergasse um segredo de propósito
    // no cache, toda a checagem de vazamento deste bloco passaria sem ter verificado nada.
    it('o detector de vazamento acha um segredo colocado de propósito no cache (controle negativo)', () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(['controle-de-vazamento'], { thumbprint: THUMBPRINT_DIGITADO });

        expect(conteudoDoCache(queryClient)).toContain(THUMBPRINT_DIGITADO);
    });

    // Controle do caminho de erro do cadastro: um AxiosError de 409 retido por um observer (como o diálogo faz enquanto
    // está aberto) guarda o corpo enviado. O detector tem de vê-lo; depois do reset() (o que a tela faz), não pode mais.
    it('controle de mutação: o AxiosError retido carrega o segredo, e reset() o tira do cache', async () => {
        const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
        const erro = new AxiosError(
            'Request failed with status code 409',
            'ERR_BAD_REQUEST',
            { data: JSON.stringify({ thumbprint: THUMBPRINT_DIGITADO }) } as InternalAxiosRequestConfig,
            undefined,
            { data: { code: 'Fiscal.Configuracao.ThumbprintJaCadastrado' }, status: 409, statusText: '', headers: {}, config: {} as InternalAxiosRequestConfig } as AxiosResponse
        );
        // gcTime: 0, como o hook de cadastro (useConfiguracaoFiscalMutations). Com o padrão de 5 minutos o erro ficaria no cache.
        const observer = new MutationObserver(queryClient, { mutationFn: () => Promise.reject(erro), gcTime: 0 });

        await observer.mutate(undefined).catch(() => undefined);
        expect(conteudoDoCache(queryClient)).toContain(THUMBPRINT_DIGITADO);

        // reset() só desanexa o observer: o erro sai do cache quando a coleta (gcTime 0) roda, em uma macrotarefa. Por
        // isso a checagem é um waitFor (espera a condição), e não uma asserção síncrona logo após o reset.
        observer.reset();
        await waitFor(() => expect(conteudoDoCache(queryClient)).not.toContain(THUMBPRINT_DIGITADO));
    });

    it('a validade digitada no fuso local sai no request como ISO UTC, e o thumbprint vai no corpo do cadastro', async () => {
        const servidor = servidorCom({ certificados: [] });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        const dialogo = await abrirCadastro(usuario);
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.apelido), 'Matriz Nova');
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint), THUMBPRINT_DIGITADO);
        digitarValidade(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.validoAte), '31/12/2026 23:59');
        await usuario.click(within(dialogo).getByRole('button', { name: CERTIFICADO_CADASTRAR_DIALOG.confirmLabel }));
        await waitFor(() => expect(servidor.chamadasDe(POST_CERTIFICADO)).toHaveLength(1));
        const [post] = servidor.chamadasDe(POST_CERTIFICADO);
        // Hora local digitada -> instante UTC. O valor esperado vem do mesmo construtor local, então vale em qualquer fuso.
        expect(post.body).toMatchObject({ apelido: 'Matriz Nova', tipo: 1, thumbprint: THUMBPRINT_DIGITADO });
        expect((post.body as { validoAte: string }).validoAte).toBe(new Date(2026, 11, 31, 23, 59).toISOString());
        expect((post.body as { validoAte: string }).validoAte).toMatch(/Z$/);
    });

    it('depois de salvar, o diálogo fecha e reabrir não traz o thumbprint; o cache não o contém', async () => {
        const servidor = servidorCom({ certificados: [] });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        const { queryClient } = renderAba();
        let dialogo = await abrirCadastro(usuario);
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.apelido), 'Matriz Nova');
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint), THUMBPRINT_DIGITADO);
        digitarValidade(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.validoAte), '31/12/2026 23:59');
        await usuario.click(within(dialogo).getByRole('button', { name: CERTIFICADO_CADASTRAR_DIALOG.confirmLabel }));

        await waitFor(() => expect(screen.queryByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo })).not.toBeInTheDocument());
        await waitFor(() => expect(conteudoDoCache(queryClient)).not.toContain(THUMBPRINT_DIGITADO));

        dialogo = await abrirCadastro(usuario);
        expect(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint)).toHaveValue('');
        expect(conteudoDoCache(queryClient)).not.toContain(THUMBPRINT_DIGITADO);
    });

    it('fechar sem salvar também zera o thumbprint ao reabrir', async () => {
        const servidor = servidorCom({ certificados: [] });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        let dialogo = await abrirCadastro(usuario);
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint), THUMBPRINT_DIGITADO);
        await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
        await waitFor(() => expect(screen.queryByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo })).not.toBeInTheDocument());

        dialogo = await abrirCadastro(usuario);
        expect(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint)).toHaveValue('');
        expect(servidor.chamadasDe(POST_CERTIFICADO)).toHaveLength(0);
    });

    // QA-02 (v1.11.0a8b81.c1): a checagem de cache acima só roda depois que a mutação já foi coletada (gcTime 0), então
    // não enxerga o que fica em `state.variables` enquanto o POST está em voo. Aqui a resposta fica retida numa promise
    // controlada: a mutação está pendente, e nada do cache (variables inclusive) pode conter o thumbprint digitado.
    // A mutationFn zera `caixa.valores` antes do POST (features/fiscal/hooks/useConfiguracaoFiscal.ts, instrução
    // `caixa.valores = null;`). Sem ela, `variables` (que guarda a referência da caixa) retém o segredo.
    it('com o POST em voo, a mutação pendente não guarda o thumbprint em variables nem em nenhuma entrada do cache', async () => {
        let liberarResposta!: () => void;
        const respostaRetida = new Promise<void>((resolver) => {
            liberarResposta = resolver;
        });
        const servidor = servidorCom({
            certificados: [],
            cadastro: async () => {
                await respostaRetida;
                return { status: 201, body: certificadoMatriz({ apelido: 'Matriz Nova' }) };
            }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        const { queryClient } = renderAba();
        const dialogo = await abrirCadastro(usuario);
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.apelido), 'Matriz Nova');
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint), THUMBPRINT_DIGITADO);
        digitarValidade(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.validoAte), '31/12/2026 23:59');
        await usuario.click(within(dialogo).getByRole('button', { name: CERTIFICADO_CADASTRAR_DIALOG.confirmLabel }));

        // O POST já saiu para o adapter (corpo enviado) e a resposta continua retida: a mutação está em voo.
        await waitFor(() => expect(servidor.chamadasDe(POST_CERTIFICADO)).toHaveLength(1));
        const pendentes = queryClient.getMutationCache().getAll().filter((mutacao) => mutacao.state.status === 'pending');
        expect(pendentes).toHaveLength(1);

        expect(JSON.stringify(pendentes[0].state.variables)).not.toContain(THUMBPRINT_DIGITADO);
        expect(conteudoDoCache(queryClient)).not.toContain(THUMBPRINT_DIGITADO);

        liberarResposta();
        await waitFor(() => expect(screen.queryByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo })).not.toBeInTheDocument());
        await waitFor(() => expect(conteudoDoCache(queryClient)).not.toContain(THUMBPRINT_DIGITADO));
    });

    it('erro de thumbprint duplicado (409) mostra a mensagem no campo, mantém o diálogo aberto e não deixa o segredo no cache', async () => {
        const servidor = servidorCom({
            certificados: [],
            cadastro: { status: 409, body: { code: 'Fiscal.Configuracao.ThumbprintJaCadastrado', message: 'duplicado' } }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        const { queryClient } = renderAba();
        const dialogo = await abrirCadastro(usuario);
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.apelido), 'Matriz Nova');
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint), THUMBPRINT_DIGITADO);
        digitarValidade(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.validoAte), '31/12/2026 23:59');
        await usuario.click(within(dialogo).getByRole('button', { name: CERTIFICADO_CADASTRAR_DIALOG.confirmLabel }));

        expect(await within(dialogo).findByText('O thumbprint já está cadastrado, ativo ou inativo')).toBeInTheDocument();
        expect(screen.getByRole('dialog', { name: CERTIFICADO_CADASTRAR_DIALOG.titulo })).toBeInTheDocument();
        // O erro carrega o AxiosError, cujo corpo tem o thumbprint. A tela chama reset(); a coleta do erro é assíncrona
        // (ver o controle de mutação acima), então a checagem espera a condição.
        await waitFor(() => expect(conteudoDoCache(queryClient)).not.toContain(THUMBPRINT_DIGITADO));
    });

    it('validade já passada (400 CertificadoVencido) mostra a mensagem no campo de validade', async () => {
        const servidor = servidorCom({
            certificados: [],
            cadastro: { status: 400, body: { code: 'Fiscal.Configuracao.CertificadoVencido', message: 'vencido' } }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        const dialogo = await abrirCadastro(usuario);
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.apelido), 'Matriz Nova');
        await usuario.type(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.thumbprint), THUMBPRINT_DIGITADO);
        digitarValidade(within(dialogo).getByLabelText(CERTIFICADO_CADASTRAR_DIALOG.validoAte), '31/12/2020 10:00');
        await usuario.click(within(dialogo).getByRole('button', { name: CERTIFICADO_CADASTRAR_DIALOG.confirmLabel }));

        expect(await within(dialogo).findByText('A validade informada já passou')).toBeInTheDocument();
    });

    it('campos obrigatórios vazios não mandam POST e mostram a validação local', async () => {
        const servidor = servidorCom({ certificados: [] });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        const dialogo = await abrirCadastro(usuario);
        await usuario.click(within(dialogo).getByRole('button', { name: CERTIFICADO_CADASTRAR_DIALOG.confirmLabel }));

        expect(await within(dialogo).findByText('Informe o apelido do certificado.')).toBeInTheDocument();
        expect(within(dialogo).getByText('Informe o thumbprint do certificado.')).toBeInTheDocument();
        expect(servidor.chamadasDe(POST_CERTIFICADO)).toHaveLength(0);
    });
});

describe('AC-8: inativar certificado vinculado à configuração ativa pede confirmação com aviso', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('vinculado à empresa ativa: aviso de que a emissão vai falhar e confirmação "Inativar mesmo assim"', async () => {
        const servidor = servidorCom({
            certificados: [certificadoMatriz()],
            empresa: { status: 200, body: empresaConfigurada({ certificadoDigitalId: CERT_MATRIZ_ID, ativo: true }) }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        await usuario.click(await screen.findByRole('button', { name: `${CERTIFICADOS_DIGITAIS.inativar} certificado Certificado Matriz` }));
        const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_INATIVAR_DIALOG.titulo('Certificado Matriz') });

        expect(within(dialogo).getByText(CERTIFICADO_INATIVAR_DIALOG.avisoVinculado)).toBeInTheDocument();
        expect(within(dialogo).getByRole('button', { name: CERTIFICADO_INATIVAR_DIALOG.confirmLabelVinculado })).toBeInTheDocument();
    });

    it('certificado NÃO vinculado: sem aviso e com a confirmação normal', async () => {
        const servidor = servidorCom({
            certificados: [certificadoMatriz()],
            empresa: { status: 200, body: empresaConfigurada({ certificadoDigitalId: null, ativo: true }) }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        await usuario.click(await screen.findByRole('button', { name: `${CERTIFICADOS_DIGITAIS.inativar} certificado Certificado Matriz` }));
        const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_INATIVAR_DIALOG.titulo('Certificado Matriz') });

        expect(within(dialogo).queryByText(CERTIFICADO_INATIVAR_DIALOG.avisoVinculado)).not.toBeInTheDocument();
        expect(within(dialogo).getByRole('button', { name: CERTIFICADO_INATIVAR_DIALOG.confirmLabel })).toBeInTheDocument();
    });

    it('vinculo com configuração ativa de filial já carregada também gera o aviso', async () => {
        const servidor = servidorCom({ certificados: [certificadoFilial()] });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        queryClient.setQueryData(configuracaoFiscalFilialQueryKey(ESCOPO, FILIAL_ID), filialConfigurada({ certificadoDigitalId: CERT_FILIAL_ID, ativo: true }));

        renderAba({ filialSelecionadaId: FILIAL_ID, queryClient });
        await usuario.click(await screen.findByRole('button', { name: `${CERTIFICADOS_DIGITAIS.inativar} certificado Certificado Filial` }));
        const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_INATIVAR_DIALOG.titulo('Certificado Filial') });

        expect(within(dialogo).getByText(CERTIFICADO_INATIVAR_DIALOG.avisoVinculado)).toBeInTheDocument();
    });

    it('inativar com motivo envia { motivo } ao endpoint do certificado', async () => {
        const servidor = servidorCom({ certificados: [certificadoMatriz()] });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba();
        await usuario.click(await screen.findByRole('button', { name: `${CERTIFICADOS_DIGITAIS.inativar} certificado Certificado Matriz` }));
        const dialogo = await screen.findByRole('dialog', { name: CERTIFICADO_INATIVAR_DIALOG.titulo('Certificado Matriz') });
        const confirmar = within(dialogo).getByRole('button', { name: CERTIFICADO_INATIVAR_DIALOG.confirmLabel });
        expect(confirmar).toBeDisabled();

        await usuario.type(within(dialogo).getByLabelText(MOTIVO_DIALOG.campo), 'Certificado substituído');
        await usuario.click(confirmar);

        await waitFor(() => expect(servidor.chamadasDe(`POST /api/fiscal/configuracao/certificados/${CERT_MATRIZ_ID}/inativar`)).toHaveLength(1));
        expect(servidor.chamadasDe(`POST /api/fiscal/configuracao/certificados/${CERT_MATRIZ_ID}/inativar`)[0].body).toEqual({ motivo: 'Certificado substituído' });
    });
});
