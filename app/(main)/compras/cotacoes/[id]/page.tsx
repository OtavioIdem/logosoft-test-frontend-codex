import { CotacaoCompraDetalhePage } from '@/features/compras-avancado/components/CotacaoCompraDetalhePage';

type PageProps = { params: { id: string } };

export default function Page({ params }: PageProps) {
    return <CotacaoCompraDetalhePage cotacaoId={params.id} />;
}
