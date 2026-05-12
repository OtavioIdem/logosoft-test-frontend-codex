import { describe, expect, it } from 'vitest';
import { mockErpStore } from '@/features/shared/api/mockErpStore';
import { getResourceDefinition } from '@/features/shared/config/erpFeatureCatalog';
describe('mockErpStore', () => {
    it('lista dados paginados de produtos', async () => {
        const result = await mockErpStore.list(getResourceDefinition('produtos'), { page: 1, pageSize: 10 });
        expect(result.totalItems).toBeGreaterThan(0);
    });
    it('exige motivo em ação crítica', async () => {
        await expect(mockErpStore.applyAction(getResourceDefinition('clientes'), 'cli-1', 'credito-bloqueado')).rejects.toThrow('Motivo obrigatório');
    });
});
