import { VeiculoDetalhePage } from '@/features/frota/components/VeiculoDetalhePage';

type PageProps = {
    params: {
        id: string;
    };
};

export default function Page({ params }: PageProps) {
    return <VeiculoDetalhePage veiculoId={params.id} />;
}
