'use client';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
export const QuantityInput = ({ id, value, onChange, disabled }: { id?: string; value?: number | null; onChange: (value: number | null) => void; disabled?: boolean }) => <InputNumber id={id} value={value ?? null} onValueChange={(event: InputNumberValueChangeEvent) => onChange(event.value ?? null)} min={0} minFractionDigits={0} maxFractionDigits={6} disabled={disabled} />;
