'use client';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
export const PercentInput = ({ id, value, onChange, disabled }: { id?: string; value?: number | null; onChange: (value: number | null) => void; disabled?: boolean }) => <InputNumber id={id} value={value ?? null} onValueChange={(event: InputNumberValueChangeEvent) => onChange(event.value ?? null)} suffix=" %" min={0} max={100} minFractionDigits={2} maxFractionDigits={4} disabled={disabled} />;
