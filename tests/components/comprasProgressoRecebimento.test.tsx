import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { itemPedidoCompraProgressoLabel, pedidoCompraMostraProgressoRecebimento } from '@/features/compras/components/comprasUiUtils';
import { StatusPedidoCompra } from '@/types/erp';
import type { ItemPedidoCompraResponse, PedidoCompraResponse } from '@/features/compras/types/compras.types';

describe('Compras — AC-4 — Progresso de recebimento na célula de quantidade', () => {
    describe('itemPedidoCompraProgressoLabel função', () => {
        it('retorna "Recebido 5 • Pendente 5" com os valores corretos', () => {
            const item = {
                quantidadeRecebida: 5,
                quantidadePendente: 5
            } as ItemPedidoCompraResponse;

            const resultado = itemPedidoCompraProgressoLabel(item);
            expect(resultado).toBe('Recebido 5 • Pendente 5');
        });

        it('retorna "Recebido 10 • Pendente 0" quando item totalmente recebido', () => {
            const item = {
                quantidadeRecebida: 10,
                quantidadePendente: 0
            } as ItemPedidoCompraResponse;

            const resultado = itemPedidoCompraProgressoLabel(item);
            expect(resultado).toBe('Recebido 10 • Pendente 0');
        });

        it('retorna "Recebido 0 • Pendente 10" quando nenhum item recebido', () => {
            const item = {
                quantidadeRecebida: 0,
                quantidadePendente: 10
            } as ItemPedidoCompraResponse;

            const resultado = itemPedidoCompraProgressoLabel(item);
            expect(resultado).toBe('Recebido 0 • Pendente 10');
        });
    });

    describe('pedidoCompraMostraProgressoRecebimento função', () => {
        it('retorna true para ParcialmenteRecebido', () => {
            const pedido = {
                statusPedido: StatusPedidoCompra.ParcialmenteRecebido
            } as PedidoCompraResponse;

            const resultado = pedidoCompraMostraProgressoRecebimento(pedido);
            expect(resultado).toBe(true);
        });

        it('retorna true para Recebido', () => {
            const pedido = {
                statusPedido: StatusPedidoCompra.Recebido
            } as PedidoCompraResponse;

            const resultado = pedidoCompraMostraProgressoRecebimento(pedido);
            expect(resultado).toBe(true);
        });

        it('retorna false para Rascunho', () => {
            const pedido = {
                statusPedido: StatusPedidoCompra.Rascunho
            } as PedidoCompraResponse;

            const resultado = pedidoCompraMostraProgressoRecebimento(pedido);
            expect(resultado).toBe(false);
        });

        it('retorna false para AguardandoAprovacao', () => {
            const pedido = {
                statusPedido: StatusPedidoCompra.AguardandoAprovacao
            } as PedidoCompraResponse;

            const resultado = pedidoCompraMostraProgressoRecebimento(pedido);
            expect(resultado).toBe(false);
        });

        it('retorna false para Aprovado', () => {
            const pedido = {
                statusPedido: StatusPedidoCompra.Aprovado
            } as PedidoCompraResponse;

            const resultado = pedidoCompraMostraProgressoRecebimento(pedido);
            expect(resultado).toBe(false);
        });

        it('retorna false para Cancelado', () => {
            const pedido = {
                statusPedido: StatusPedidoCompra.Cancelado
            } as PedidoCompraResponse;

            const resultado = pedidoCompraMostraProgressoRecebimento(pedido);
            expect(resultado).toBe(false);
        });
    });

    describe('renderização com data-testid', () => {
        it('renderiza progresso de recebimento em célula de quantidade', () => {
            const item = {
                quantidade: 10,
                quantidadeRecebida: 5,
                quantidadePendente: 5
            } as ItemPedidoCompraResponse;

            const mostraProgresso = true;
            const progressoLabel = itemPedidoCompraProgressoLabel(item);

            render(
                <div>
                    <>
                        {item.quantidade}
                        {mostraProgresso ? <small className="block text-color-secondary">{progressoLabel}</small> : null}
                    </>
                </div>
            );

            const label = screen.getByText('Recebido 5 • Pendente 5');
            expect(label).toBeInTheDocument();
        });

        it('não renderiza progresso quando mostraProgresso é false', () => {
            const item = {
                quantidade: 10,
                quantidadeRecebida: 0,
                quantidadePendente: 10
            } as ItemPedidoCompraResponse;

            const mostraProgresso = false;
            const progressoLabel = itemPedidoCompraProgressoLabel(item);

            render(
                <div>
                    <>
                        {item.quantidade}
                        {mostraProgresso ? <small className="block text-color-secondary">{progressoLabel}</small> : null}
                    </>
                </div>
            );

            const label = screen.queryByText(/Recebido.*Pendente/);
            expect(label).not.toBeInTheDocument();

            // Mas deve exibir a quantidade
            const quantidade = screen.getByText('10');
            expect(quantidade).toBeInTheDocument();
        });
    });
});
