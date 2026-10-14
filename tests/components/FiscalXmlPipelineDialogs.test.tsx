import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    ArmazenarXmlDialog,
    ReabrirNotaFiscalDialog,
    ReprocessarSefazDialog,
    TransmitirSefazDialog,
    XmlPipelineDialog
} from '@/features/fiscal/components/FiscalActionDialogs';
import { TipoXmlFiscal } from '@/types/erp';

afterEach(cleanup);

describe('diálogos do pipeline XML fiscal', () => {
    it('AJ-16: assinatura, transmissão e reprocessamento não expõem campos para colar XML', () => {
        const { rerender } = render(<XmlPipelineDialog mode="assinar" visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);

        expect(screen.queryByText('XML envio opcional')).not.toBeInTheDocument();

        rerender(<TransmitirSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.queryByText('XML assinado opcional')).not.toBeInTheDocument();

        rerender(<ReprocessarSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.queryByText('XML assinado opcional')).not.toBeInTheDocument();
    });

    it('AJ-19: os fluxos de NF-e não oferecem nem submetem bools de validação de schema ignorados pelo backend', async () => {
        const gerar = vi.fn();
        const assinar = vi.fn();
        const transmitir = vi.fn();
        const { rerender } = render(<XmlPipelineDialog mode="gerar" visible loading={false} onHide={vi.fn()} onSubmit={gerar} />);

        expect(screen.queryByText('Validar schema agora')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Gerar XML' }));
        expect(gerar).toHaveBeenCalledWith(expect.not.objectContaining({ validarSchema: expect.anything() }));

        rerender(<XmlPipelineDialog mode="assinar" visible loading={false} onHide={vi.fn()} onSubmit={assinar} />);
        expect(screen.queryByText('Validar schema antes da assinatura')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Assinar XML' }));
        expect(assinar).toHaveBeenCalledWith(expect.not.objectContaining({ validarSchemaAntesAssinatura: expect.anything() }));

        rerender(<TransmitirSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={transmitir} />);
        expect(screen.queryByText('Validar schema antes da transmissão')).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Transmitir' }));
        expect(transmitir).toHaveBeenCalledWith(expect.not.objectContaining({ validarSchemaAntesTransmissao: expect.anything() }));

        rerender(<ReprocessarSefazDialog visible loading={false} onHide={vi.fn()} onSubmit={vi.fn()} />);
        expect(screen.queryByText('Validar schema antes da transmissão')).not.toBeInTheDocument();
    });

    it('AJ-17: armazenamento manual começa em Autorizado e não oferece Envio', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        render(<ArmazenarXmlDialog visible loading={false} onHide={vi.fn()} onSubmit={onSubmit} />);

        expect(screen.queryByText('Envio')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Armazenar XML' }));

        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ tipo: TipoXmlFiscal.Autorizado }));
    });

    it('AJ-12: reabertura não submete motivo curto e envia motivo válido sem espaços externos', async () => {
        const onSubmit = vi.fn();
        const user = userEvent.setup();
        render(<ReabrirNotaFiscalDialog visible loading={false} onHide={vi.fn()} onSubmit={onSubmit} />);

        const motivo = screen.getByLabelText('Motivo obrigatório');
        await user.type(motivo, 'Curto');
        await user.click(screen.getByRole('button', { name: 'Reabrir nota' }));

        expect(await screen.findByText('Informe um motivo com pelo menos 15 caracteres.')).toBeInTheDocument();
        expect(onSubmit).not.toHaveBeenCalled();

        await user.clear(motivo);
        await user.type(motivo, '  Correção documentada da nota.  ');
        await user.click(screen.getByRole('button', { name: 'Reabrir nota' }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith('Correção documentada da nota.');
    });
});
