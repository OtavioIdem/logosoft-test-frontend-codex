'use client';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
export const UnauthorizedState = ({ title = 'Acesso negado', description = 'Seu usuário não possui permissão para acessar esta rotina.' }: { title?: string; description?: string }) => <Card><div className="text-center p-5"><i className="pi pi-lock text-5xl text-orange-500" aria-hidden /><h2>{title}</h2><p className="text-600 line-height-3">{description}</p><Link href="/dashboard"><Button label="Voltar para o dashboard" icon="pi pi-home" /></Link></div></Card>;
