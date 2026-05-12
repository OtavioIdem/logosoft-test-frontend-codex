import { PedidoVendaDetalhePage } from '@/features/vendas/components/PedidoVendaDetalhePage';

type PageProps = {
    params: {
        id: string;
    };
};

export default function Page({ params }: PageProps) {
    return <PedidoVendaDetalhePage pedidoId={params.id} />;
}
