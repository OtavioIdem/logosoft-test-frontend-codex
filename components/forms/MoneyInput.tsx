'use client';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
export const MoneyInput = ({ id, value, onChange, disabled }: { id?: string; value?: number | null; onChange: (value: number | null) => void; disabled?: boolean }) => <InputNumber id={id} value={value ?? null} onValueChange={(event: InputNumberValueChangeEvent) => onChange(event.value ?? null)} mode="currency" currency="BRL" locale="pt-BR" minFractionDigits={2} maxFractionDigits={2} disabled={disabled} />;
