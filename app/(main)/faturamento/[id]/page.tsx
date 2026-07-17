import { FaturamentoDetalhePage } from '@/features/faturamento/components/FaturamentoDetalhePage';

type PageProps = {
    params: {
        id: string;
    };
};

export default function Page({ params }: PageProps) {
    return <FaturamentoDetalhePage faturamentoId={params.id} />;
}
