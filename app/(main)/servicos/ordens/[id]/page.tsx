import { OrdemServicoDetalhePage } from '@/features/servicos/components/OrdemServicoDetalhePage';

type PageProps = {
    params: {
        id: string;
    };
};

export default function Page({ params }: PageProps) {
    return <OrdemServicoDetalhePage ordemId={params.id} />;
}
