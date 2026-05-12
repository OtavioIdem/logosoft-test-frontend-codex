import { describe, expect, it } from 'vitest';
import { canRunActionByStatus, getStatusSeverity } from '@/features/shared/utils/statusRules';
describe('statusRules', () => {
    it('bloqueia edição em status final', () => expect(canRunActionByStatus({ key: 'editar', label: 'Editar', icon: 'pi pi-pencil' }, 'FATURADO')).toBe(false));
    it('mapeia status visual crítico', () => expect(getStatusSeverity('CANCELADO')).toBe('danger'));
});
