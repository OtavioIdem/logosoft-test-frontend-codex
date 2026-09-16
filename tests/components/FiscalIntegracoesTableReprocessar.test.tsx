import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FiscalIntegracoesTable } from '@/features/fiscal/components/FiscalOperationalPanels';
import { LogIntegracaoFiscalResponse } from '@/features/fiscal/types/fiscal.types';

// AC-9 (v1.11.0a8b57): o botão Reprocessar usa o guard FISCAL_REPROCESSAR (desde a b52) -- o mock registra a
// `permission` recebida e devolve disabled: true, para provar que o botão nasce desabilitado quando o guard nega.
const permissionsRecebidas: Array<string | undefined> = [];

vi.mock('@/components/security/PermissionGuard', () => ({
    PermissionGuard: ({ permission, children }: { permission?: string; children: (value: { disabled: boolean }) => ReactNode }) => {
        permissionsRecebidas.push(permission);
        return <>{children({ disabled: true })}</>;
    }
}));

const logReprocessavel: LogIntegracaoFiscalResponse = {
    id: '11111111-1111-1111-1111-111111111111',
    empresaId: '22222222-2222-2222-2222-222222222222',
    filialId: null,
    notaFiscalId: '33333333-3333-3333-3333-333333333333',
    operacao: 'transmitir-sefaz',
    statusIntegracao: 3,
    correlationId: 'front-transmitir-20260916-abc123',
    payloadResumo: null,
    mensagem: 'Falha de comunicação com a SEFAZ',
    registradoEm: '2026-09-16T10:00:00-03:00',
    podeReprocessar: true,
    contemDadoSensivelOcultado: false
};

describe('FiscalIntegracoesTable — botão Reprocessar (AC-9)', () => {
    it('o guard recebe permission="FISCAL_REPROCESSAR"', () => {
        permissionsRecebidas.length = 0;
        render(<FiscalIntegracoesTable logs={[logReprocessavel]} onReprocessar={vi.fn()} />);

        expect(permissionsRecebidas).toContain('FISCAL_REPROCESSAR');
    });

    it('o botão Reprocessar nasce disabled quando o guard nega, com o title "Permissão necessária: FISCAL_REPROCESSAR."', () => {
        render(<FiscalIntegracoesTable logs={[logReprocessavel]} onReprocessar={vi.fn()} />);

        const botao = screen.getByRole('button', { name: 'Reprocessar' });
        expect(botao).toBeDisabled();
        expect(botao).toHaveAttribute('title', 'Permissão necessária: FISCAL_REPROCESSAR.');
    });

    it('nenhum título "Permissão necessária: FISCAL_EMITIR." aparece ligado ao botão Reprocessar', () => {
        render(<FiscalIntegracoesTable logs={[logReprocessavel]} onReprocessar={vi.fn()} />);

        expect(screen.queryByTitle('Permissão necessária: FISCAL_EMITIR.')).not.toBeInTheDocument();
    });

    it('log não reprocessável mostra a tag "Não reprocessável" em vez do botão', () => {
        render(<FiscalIntegracoesTable logs={[{ ...logReprocessavel, podeReprocessar: false }]} onReprocessar={vi.fn()} />);

        expect(screen.getByText('Não reprocessável')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Reprocessar' })).not.toBeInTheDocument();
    });
});
