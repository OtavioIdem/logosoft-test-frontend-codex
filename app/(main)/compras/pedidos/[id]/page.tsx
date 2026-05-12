import { PedidoCompraDetalhePage } from '@/features/compras/components/PedidoCompraDetalhePage';

type PageProps = {
    params: {
        id: string;
    };
};

export default function Page({ params }: PageProps) {
    return <PedidoCompraDetalhePage pedidoId={params.id} />;
}
