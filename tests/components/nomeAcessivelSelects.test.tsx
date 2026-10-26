import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchSelect } from '@/components/forms/SearchSelect';
import { EntitySelect } from '@/components/forms/EntitySelect';
import { EmpresaSelect } from '@/components/forms/EmpresaSelect';
import { DateInput } from '@/components/forms/DateInput';
import { DateTimeInput } from '@/components/forms/DateTimeInput';
import { useEmpresasOptions } from '@/features/administracao/hooks/useEmpresaFilialOptions';

// Nome acessível calculado pelo PrimeReact REAL: este arquivo não faz vi.mock de primereact/dropdown nem de
// primereact/calendar. A única dependência trocada é o hook de opções da empresa, que é fonte de dados e não a
// camada que o teste exercita.
//
// Consulta usada: `getByRole('textbox', { name })`. O campo focável do Dropdown é um `<input readonly>` dentro de
// `div.p-hidden-accessible`. Esse container esconde por clip, não por display:none nem aria-hidden, então o
// testing-library o considera acessível, do mesmo modo que um leitor de tela o alcança. Não usamos o gatilho
// (`div role="button"`), porque ele abre o painel e não recebe o foco.
//
// O `id` da raiz continua sendo o alvo dos seletores E2E (`#tipoPessoa`, `#empresaId`), por isso as asserções
// também conferem que a raiz segue com o mesmo id e sem `aria-label` (decisão P1/P6 da fatia c3).

vi.mock('@/features/administracao/hooks/useEmpresaFilialOptions', () => ({ useEmpresasOptions: vi.fn() }));

const mockedEmpresas = vi.mocked(useEmpresasOptions);
const EMPRESA_ID = '11111111-1111-1111-1111-111111111111';
const opcoesTipo = [
    { label: 'Pessoa física', value: 'F' },
    { label: 'Pessoa jurídica', value: 'J' }
];

describe('AC-1: SearchSelect com ariaLabel dá nome ao campo focável', () => {
    it('o input focável tem o ariaLabel como nome, e a raiz segue com o id original', () => {
        render(<SearchSelect id="tipoPessoa" ariaLabel="Tipo de pessoa" placeholder="Selecione o tipo" options={opcoesTipo} value="F" onChange={vi.fn()} />);

        const campo = screen.getByRole('textbox', { name: 'Tipo de pessoa' });

        const raiz = document.getElementById('tipoPessoa');
        expect(raiz).toBeInTheDocument();
        expect(raiz).not.toBe(campo);
        expect(raiz).not.toHaveAttribute('aria-label');
        // Regressão que o E2E pegou (id `<id>-input` colidia com seletores por prefixo): nenhum id derivado.
        expect(document.getElementById('tipoPessoa-input')).toBeNull();
    });

    it('sem ariaLabel, o input focável não recebe "Selecione" como nome', () => {
        render(<SearchSelect id="tipoPessoa" options={opcoesTipo} value={null} onChange={vi.fn()} />);

        expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-label');
        expect(screen.queryByRole('textbox', { name: 'Selecione' })).not.toBeInTheDocument();
    });
});

describe('AC-2: EmpresaSelect com valor e sem rótulo visível', () => {
    beforeEach(() => {
        mockedEmpresas.mockReturnValue({
            options: [{ label: 'Empresa A', value: EMPRESA_ID }],
            isLoading: false,
            isFetching: false
        } as unknown as ReturnType<typeof useEmpresasOptions>);
    });

    it('o campo focável se chama "Empresa", mostra o valor, e a raiz segue com id="empresaId" sem aria-label', () => {
        render(<EmpresaSelect value={EMPRESA_ID} onChange={vi.fn()} required />);

        const campo = screen.getByRole('textbox', { name: 'Empresa' });
        expect(screen.getByTitle('Empresa A')).toBeInTheDocument();

        const raiz = document.getElementById('empresaId');
        expect(raiz).toBeInTheDocument();
        expect(raiz).not.toBe(campo);
        expect(raiz).not.toHaveAttribute('aria-label');
        expect(document.getElementById('empresaId-input')).toBeNull();
    });
});

describe('AC-3: ariaLabel explícito vence o default do EntitySelect', () => {
    it('com ariaLabel, o nome do campo é o ariaLabel e não "Buscar produto"', () => {
        render(<EntitySelect entityName="produto" ariaLabel="Produto principal" options={[]} value={null} onChange={vi.fn()} />);

        expect(screen.getByRole('textbox', { name: 'Produto principal' })).toBeInTheDocument();
        expect(screen.queryByRole('textbox', { name: 'Buscar produto' })).not.toBeInTheDocument();
    });

    it('sem ariaLabel, o nome cai no default derivado de entityName', () => {
        render(<EntitySelect entityName="produto" options={[]} value={null} onChange={vi.fn()} />);

        expect(screen.getByRole('textbox', { name: 'Buscar produto' })).toBeInTheDocument();
    });
});

describe('AC-4: DateInput e DateTimeInput', () => {
    it('DateInput com ariaLabel: o input tem o nome, e a raiz segue com o id original', () => {
        render(<DateInput id="estoqueFiltroInicio" ariaLabel="Início do período" value={null} onChange={vi.fn()} />);

        const campo = screen.getByRole('textbox', { name: 'Início do período' });
        expect(document.getElementById('estoqueFiltroInicio')).not.toBe(campo);
        expect(document.getElementById('estoqueFiltroInicio-input')).toBeNull();
    });

    it('DateInput sem ariaLabel não ganha aria-label no input, com ou sem id', () => {
        const { unmount } = render(<DateInput id="estoqueFiltroFim" value={null} onChange={vi.fn()} />);
        expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-label');
        unmount();

        render(<DateInput value={null} onChange={vi.fn()} />);
        expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-label');
    });

    it('DateTimeInput com ariaLabel: o input tem o nome, e a raiz segue com o id original', () => {
        render(<DateTimeInput id="auditoriaDataInicial" ariaLabel="Data inicial" value={null} onChange={vi.fn()} />);

        const campo = screen.getByRole('textbox', { name: 'Data inicial' });
        expect(document.getElementById('auditoriaDataInicial')).not.toBe(campo);
        expect(document.getElementById('auditoriaDataInicial-input')).toBeNull();
    });

    it('DateTimeInput sem ariaLabel não ganha aria-label no input', () => {
        render(<DateTimeInput id="auditoriaDataFinal" value={null} onChange={vi.fn()} />);

        expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-label');
    });

    it('DateInput com ariaLabel e sem id: o input tem o nome e nenhum id derivado entra no DOM', () => {
        render(<DateInput ariaLabel="Início do período" value={null} onChange={vi.fn()} />);

        const campo = screen.getByRole('textbox', { name: 'Início do período' });
        expect(campo).not.toHaveAttribute('id');
        expect(document.querySelector('[id$="-input"]')).toBeNull();
    });

    it('DateTimeInput com ariaLabel e sem id (caso da auditoria): o input tem o nome e nenhum id derivado entra no DOM', () => {
        render(<DateTimeInput ariaLabel="Data inicial" value={null} onChange={vi.fn()} />);

        const campo = screen.getByRole('textbox', { name: 'Data inicial' });
        expect(campo).not.toHaveAttribute('id');
        expect(document.querySelector('[id$="-input"]')).toBeNull();
    });
});
