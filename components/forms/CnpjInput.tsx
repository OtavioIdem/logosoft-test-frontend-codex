'use client';
import { CpfCnpjInput } from './CpfCnpjInput';
export const CnpjInput = ({ id, value, onChange, disabled }: { id?: string; value?: string; onChange: (value: string) => void; disabled?: boolean }) => <CpfCnpjInput id={id} value={value} onChange={onChange} disabled={disabled} placeholder="CNPJ numérico ou alfanumérico" />;
