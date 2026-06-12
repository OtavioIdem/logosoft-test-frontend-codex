import { NotaFiscalDetalhePage } from '@/features/fiscal/components/NotaFiscalDetalhePage';

type PageProps = {
    params: {
        id: string;
    };
};

export default function Page({ params }: PageProps) {
    return <NotaFiscalDetalhePage notaId={params.id} />;
}
