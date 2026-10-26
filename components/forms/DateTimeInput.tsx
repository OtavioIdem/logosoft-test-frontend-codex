'use client';
import { Calendar } from 'primereact/calendar';
export const DateTimeInput = ({ id, ariaLabel, value, onChange, disabled }: { id?: string; ariaLabel?: string; value?: Date | null; onChange: (value: Date | null) => void; disabled?: boolean }) => <Calendar id={id} pt={ariaLabel ? { input: { root: { 'aria-label': ariaLabel } } } : undefined} value={value ?? null} onChange={(event) => onChange(event.value as Date | null)} dateFormat="dd/mm/yy" showTime hourFormat="24" showIcon disabled={disabled} />;
