import { SolicitacaoCompraDetalhePage } from '@/features/compras-avancado/components/SolicitacaoCompraDetalhePage';

type PageProps = { params: { id: string } };

export default function Page({ params }: PageProps) {
    return <SolicitacaoCompraDetalhePage solicitacaoId={params.id} />;
}
