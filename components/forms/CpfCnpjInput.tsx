'use client';
import { InputText } from 'primereact/inputtext';
import { normalizeCnpj } from '@/lib/validators/documentos';
export const CpfCnpjInput = ({ id, value, onChange, disabled, placeholder = 'CPF, CNPJ numérico ou CNPJ alfanumérico' }: { id?: string; value?: string; onChange: (value: string) => void; disabled?: boolean; placeholder?: string }) => <InputText id={id} value={value ?? ''} onChange={(event) => onChange(normalizeCnpj(event.target.value))} maxLength={18} placeholder={placeholder} disabled={disabled} />;
