import { createResourceSchema } from '@/features/shared/schemas/createResourceSchema';
import { getResourceDefinition } from '@/features/shared/config/erpFeatureCatalog';

export const auditoriaEventosSchema = createResourceSchema(getResourceDefinition('auditoria-eventos'));
