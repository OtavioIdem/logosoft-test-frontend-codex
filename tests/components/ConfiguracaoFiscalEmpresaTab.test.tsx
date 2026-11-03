import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfiguracaoFiscalEmpresaTab } from '@/features/fiscal/components/ConfiguracaoFiscalEmpresaTab';
import { ConfiguracaoFiscalEscopo } from '@/features/fiscal/hooks/useConfiguracaoFiscal';
import {
    CONFIGURACAO_FISCAL_EMPRESA,
    EMPRESA_INATIVAR_DIALOG,
    EMPRESA_REATIVAR_DIALOG,
    MOTIVO_DIALOG
} from '@/features/fiscal/components/configuracaoFiscalLabels';
import { erroServidor, empresaConfigurada, EMPRESA_USUARIO_ID, instalarServidorFiscal, RotaServidor } from '@/tests/mocks/fiscal/configuracaoFiscalServidor';

// Dublê padrão do repo para o Dropdown do PrimeReact (painel em portal não é operável por papel no jsdom). Vira um
// <select> nativo com o mesmo contrato de props. Ver o cabeçalho de tests/mocks/primereact/dropdown.tsx.
vi.mock('primereact/dropdown', () => import('@/tests/mocks/primereact/dropdown'));

// v1.11.0a8b81 (AC-2, AC-3, AC-4, AC-9, e a parte de leitura do AC-1). Componente real, cliente real, só o adapter HTTP
// é falso. O GET da empresa é stateful: 404 até o PUT gravar, como o backend faz com o upsert.

const ESCOPO: ConfiguracaoFiscalEscopo = { organizationalScopeKey: 'user:empresa:all:1', usuarioEmpresaId: EMPRESA_USUARIO_ID };
const GET_EMPRESA = 'GET /api/fiscal/configuracao/empresa';
const PUT_EMPRESA = 'PUT /api/fiscal/configuracao/empresa';

const renderAba = (podeGerenciar: boolean) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ConfiguracaoFiscalEmpresaTab escopo={ESCOPO} podeConsultar podeGerenciar={podeGerenciar} />
        </QueryClientProvider>
    );
    return { queryClient };
};

describe('AC-3: empresa ainda não configurada', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('404 com Recurso.NaoEncontrado mostra "ainda não configurada" e o formulário vazio, sem painel de erro', async () => {
        const servidor = instalarServidorFiscal({
            [GET_EMPRESA]: erroServidor(404, 'Recurso.NaoEncontrado'),
            'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] }
        });
        restaurar = servidor.restaurar;

        renderAba(true);

        expect(await screen.findByText(new RegExp(CONFIGURACAO_FISCAL_EMPRESA.naoConfiguradaTitulo))).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_EMPRESA.emitirNFe })).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_EMPRESA.emitirNFCe })).not.toBeChecked();
        expect(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_EMPRESA.emitirNFSe })).not.toBeChecked();
        expect(screen.getByLabelText(CONFIGURACAO_FISCAL_EMPRESA.observacao)).toHaveValue('');
        expect(screen.queryByText('Recurso não encontrado.')).not.toBeInTheDocument();
    });

    it.each([['Fiscal.Configuracao.EmpresaNaoEncontrada']])('404 com o código específico %s também é "não configurada"', async (codigo) => {
        const servidor = instalarServidorFiscal({ [GET_EMPRESA]: erroServidor(404, codigo), 'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] } });
        restaurar = servidor.restaurar;

        renderAba(true);

        expect(await screen.findByText(new RegExp(CONFIGURACAO_FISCAL_EMPRESA.naoConfiguradaTitulo))).toBeInTheDocument();
    });

    it('404 SEM corpo reconhecido é erro de verdade: não pode anunciar "não configurada" no lugar de uma falha', async () => {
        const servidor = instalarServidorFiscal({ [GET_EMPRESA]: erroServidor(404), 'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] } });
        restaurar = servidor.restaurar;

        renderAba(true);

        expect(await screen.findByText('Recurso não encontrado.')).toBeInTheDocument();
        expect(screen.queryByText(new RegExp(CONFIGURACAO_FISCAL_EMPRESA.naoConfiguradaTitulo))).not.toBeInTheDocument();
    });

    it('500 é erro, não estado', async () => {
        const servidor = instalarServidorFiscal({ [GET_EMPRESA]: erroServidor(500, undefined, 'Falha interna simulada'), 'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] } });
        restaurar = servidor.restaurar;

        renderAba(true);

        expect(await screen.findByText('Falha interna simulada')).toBeInTheDocument();
        expect(screen.queryByText(new RegExp(CONFIGURACAO_FISCAL_EMPRESA.naoConfiguradaTitulo))).not.toBeInTheDocument();
    });
});

describe('AC-2: salvar a configuração da empresa (PUT upsert)', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('sem configuração, salvar faz PUT (upsert) com o que foi escolhido, sem empresaId', async () => {
        let gravada: unknown = null;
        const rotas: Record<string, RotaServidor> = {
            [GET_EMPRESA]: () => (gravada ? { status: 200, body: gravada } : erroServidor(404, 'Recurso.NaoEncontrado')),
            [PUT_EMPRESA]: (chamada) => {
                gravada = empresaConfigurada({ ...(chamada.body as Record<string, unknown>), id: '55555555-5555-5555-5555-555555555555' });
                return { status: 200, body: gravada };
            },
            'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] }
        };
        const servidor = instalarServidorFiscal(rotas);
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba(true);
        await screen.findByText(new RegExp(CONFIGURACAO_FISCAL_EMPRESA.naoConfiguradaTitulo));
        await usuario.click(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_EMPRESA.emitirNFe }));
        await usuario.click(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_EMPRESA.emitirNFSe }));
        await usuario.click(screen.getByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.salvar }));

        await waitFor(() => expect(servidor.chamadasDe(PUT_EMPRESA)).toHaveLength(1));
        const [put] = servidor.chamadasDe(PUT_EMPRESA);
        expect(put.body).toEqual(expect.objectContaining({ ambiente: 1, emitirNFe: true, emitirNFCe: false, emitirNFSe: true }));
        expect(put.body).not.toHaveProperty('empresaId');
        expect(put.params).not.toHaveProperty('empresaId');
    });

    it('configuração existente: ambiente, flags e observação vão no PUT, com o texto aparado', async () => {
        const servidor = instalarServidorFiscal({
            [GET_EMPRESA]: { status: 200, body: empresaConfigurada({ ambiente: 1, emitirNFe: true, observacao: 'antiga' }) },
            [PUT_EMPRESA]: (chamada) => ({ status: 200, body: empresaConfigurada({ ...(chamada.body as Record<string, unknown>) }) }),
            'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba(true);
        await usuario.selectOptions(await screen.findByRole('combobox', { name: CONFIGURACAO_FISCAL_EMPRESA.ambiente }), 'Produção');
        await usuario.click(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_EMPRESA.emitirNFSe }));
        const observacao = screen.getByLabelText(CONFIGURACAO_FISCAL_EMPRESA.observacao);
        await usuario.clear(observacao);
        await usuario.type(observacao, '  Operação nacional  ');
        await usuario.click(screen.getByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.salvar }));

        await waitFor(() => expect(servidor.chamadasDe(PUT_EMPRESA)).toHaveLength(1));
        const [put] = servidor.chamadasDe(PUT_EMPRESA);
        expect(put.body).toEqual({
            ambiente: 2,
            emitirNFe: true,
            emitirNFCe: false,
            emitirNFSe: true,
            certificadoDigitalId: null,
            observacao: 'Operação nacional'
        });
    });
});

describe('AC-4: inativar e reativar exigem motivo', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('inativar: o botão de confirmar fica desabilitado sem motivo (inclusive com espaços) e nada é enviado', async () => {
        const servidor = instalarServidorFiscal({
            [GET_EMPRESA]: { status: 200, body: empresaConfigurada({ ativo: true }) },
            'POST /api/fiscal/configuracao/empresa/inativar': { status: 200 },
            'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba(true);
        await usuario.click(await screen.findByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.inativar }));
        const dialogo = await screen.findByRole('dialog', { name: EMPRESA_INATIVAR_DIALOG.titulo });
        const confirmar = within(dialogo).getByRole('button', { name: EMPRESA_INATIVAR_DIALOG.confirmLabel });

        expect(confirmar).toBeDisabled();
        await usuario.type(within(dialogo).getByLabelText(MOTIVO_DIALOG.campo), '   ');
        expect(confirmar).toBeDisabled();
        await usuario.click(confirmar);
        expect(servidor.chamadasDe('POST /api/fiscal/configuracao/empresa/inativar')).toHaveLength(0);
    });

    it('inativar com motivo envia { motivo } ao endpoint de inativação', async () => {
        const servidor = instalarServidorFiscal({
            [GET_EMPRESA]: { status: 200, body: empresaConfigurada({ ativo: true }) },
            'POST /api/fiscal/configuracao/empresa/inativar': { status: 200 },
            'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba(true);
        await usuario.click(await screen.findByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.inativar }));
        const dialogo = await screen.findByRole('dialog', { name: EMPRESA_INATIVAR_DIALOG.titulo });
        await usuario.type(within(dialogo).getByLabelText(MOTIVO_DIALOG.campo), 'Troca de ambiente');
        await usuario.click(within(dialogo).getByRole('button', { name: EMPRESA_INATIVAR_DIALOG.confirmLabel }));

        await waitFor(() => expect(servidor.chamadasDe('POST /api/fiscal/configuracao/empresa/inativar')).toHaveLength(1));
        expect(servidor.chamadasDe('POST /api/fiscal/configuracao/empresa/inativar')[0].body).toEqual({ motivo: 'Troca de ambiente' });
    });

    it('reativar: sem motivo o confirmar fica desabilitado; com motivo envia ao endpoint de reativação', async () => {
        const servidor = instalarServidorFiscal({
            [GET_EMPRESA]: { status: 200, body: empresaConfigurada({ ativo: false }) },
            'POST /api/fiscal/configuracao/empresa/reativar': { status: 200 },
            'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba(true);
        await usuario.click(await screen.findByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.reativar }));
        const dialogo = await screen.findByRole('dialog', { name: EMPRESA_REATIVAR_DIALOG.titulo });
        const confirmar = within(dialogo).getByRole('button', { name: EMPRESA_REATIVAR_DIALOG.confirmLabel });
        expect(confirmar).toBeDisabled();

        await usuario.type(within(dialogo).getByLabelText(MOTIVO_DIALOG.campo), 'Regularizado');
        await usuario.click(confirmar);

        await waitFor(() => expect(servidor.chamadasDe('POST /api/fiscal/configuracao/empresa/reativar')).toHaveLength(1));
        expect(servidor.chamadasDe('POST /api/fiscal/configuracao/empresa/reativar')[0].body).toEqual({ motivo: 'Regularizado' });
    });
});

describe('AC-9: 409 ConflitoDeGravacao mostra a mensagem e refaz o GET', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('PUT com 409 mostra "Outra pessoa gravou ao mesmo tempo" e dispara um novo GET da empresa', async () => {
        const servidor = instalarServidorFiscal({
            [GET_EMPRESA]: { status: 200, body: empresaConfigurada({ observacao: null }) },
            [PUT_EMPRESA]: { status: 409, body: { code: 'Fiscal.Configuracao.ConflitoDeGravacao', message: 'conflito' } },
            'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] }
        });
        restaurar = servidor.restaurar;
        const usuario = userEvent.setup();

        renderAba(true);
        await usuario.click(await screen.findByRole('checkbox', { name: CONFIGURACAO_FISCAL_EMPRESA.emitirNFCe }));
        const getsAntesDoSalvar = servidor.chamadasDe(GET_EMPRESA).length;
        await usuario.click(screen.getByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.salvar }));

        expect(await screen.findByText(/Outra pessoa gravou ao mesmo tempo/)).toBeInTheDocument();
        await waitFor(() => expect(servidor.chamadasDe(GET_EMPRESA).length).toBeGreaterThan(getsAntesDoSalvar));
    });
});

describe('AC-1 (leitura): sem FISCAL_CONFIGURACAO_GERENCIAR não há nenhum botão de gravar', () => {
    let restaurar: (() => void) | undefined;
    afterEach(() => {
        restaurar?.();
        restaurar = undefined;
    });

    it('mostra a configuração em somente leitura, com o motivo, e sem salvar nem inativar', async () => {
        const servidor = instalarServidorFiscal({
            [GET_EMPRESA]: { status: 200, body: empresaConfigurada() },
            'GET /api/fiscal/configuracao/certificados': { status: 200, body: [] }
        });
        restaurar = servidor.restaurar;

        renderAba(false);

        expect(await screen.findByText(/Somente leitura/)).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: CONFIGURACAO_FISCAL_EMPRESA.emitirNFe })).toBeDisabled();
        expect(screen.queryByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.salvar })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.inativar })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: CONFIGURACAO_FISCAL_EMPRESA.reativar })).not.toBeInTheDocument();
    });
});
