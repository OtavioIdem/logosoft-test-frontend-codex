'use client';
import { ReactNode } from 'react';
import { Divider } from 'primereact/divider';
export const FormSection = ({ title, description, children }: { title: string; description?: string; children: ReactNode }) => <section className="mb-4"><div className="mb-3"><h3 className="text-lg font-semibold m-0">{title}</h3>{description ? <p className="text-600 mt-1 mb-0 line-height-3">{description}</p> : null}</div><div className="grid formgrid p-fluid">{children}</div><Divider /></section>;
