'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { PageHeader } from '@/components/common/PageHeader';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { cadastroCategorias, cadastroItens } from '../cadastrosCatalogo';

const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

export const CadastrosPage = () => {
    const { hasAnyPermission } = usePermissions();
    const router = useRouter();
    const [busca, setBusca] = useState('');
    const termo = normalizar(busca.trim());
    const categoriasVisiveis = useMemo(() => cadastroCategorias.map((categoria) => ({
        ...categoria,
        itens: cadastroItens.filter((item) => item.categoriaId === categoria.id && hasAnyPermission([...item.anyPermissions]) && (!termo || normalizar(`${item.label} ${item.descricao}`).includes(termo)))
    })).filter((categoria) => categoria.itens.length > 0), [hasAnyPermission, termo]);

    return <>
        <PageHeader title="Cadastros" description="Siga esta sequência para preparar a operação. A ordem orienta o cadastro e não bloqueia o acesso às rotinas permitidas." actions={<div className="flex flex-column-reverse md:flex-row gap-2 w-full md:w-auto"><Button label="Voltar" icon="pi pi-arrow-left" severity="secondary" outlined onClick={() => router.back()} /><span className="p-input-icon-left w-full md:w-20rem"><i className="pi pi-search" /><InputText aria-label="Buscar cadastro" className="w-full" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar cadastro" /></span></div>} />
        {categoriasVisiveis.length === 0 ? <Card><div className="text-center p-5"><i className="pi pi-search text-4xl text-color-secondary" aria-hidden="true" /><h2 className="text-xl mb-2">Nenhum cadastro encontrado</h2><p className="m-0 text-color-secondary">Revise o termo informado ou suas permissões de acesso.</p></div></Card> : <div className="flex flex-column gap-4">{categoriasVisiveis.map((categoria) => <Card key={categoria.id} title={categoria.label} subTitle={categoria.descricao}><div className="grid">{categoria.itens.map((item) => <div className="col-12 md:col-6 xl:col-4 flex" key={item.id}><Link href={item.to} className="flex w-full no-underline text-color"><div className="surface-hover border-1 surface-border border-round p-3 flex w-full h-full transition-colors transition-duration-150" style={{ height: '9rem' }}><div className="flex align-items-start gap-3"><i className={`${item.icon} text-primary text-2xl mt-1`} aria-hidden="true" /><div><div className="font-semibold mb-2">{item.label}</div><div className="text-color-secondary line-height-3 text-sm">{item.descricao}</div></div></div></div></Link></div>)}</div></Card>)}</div>}
    </>;
};
