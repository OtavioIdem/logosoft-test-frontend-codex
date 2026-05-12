import { createResourceSchema } from '@/features/shared/schemas/createResourceSchema';
import { getResourceDefinition } from '@/features/shared/config/erpFeatureCatalog';

export const usuariosSchema = createResourceSchema(getResourceDefinition('seguranca-usuarios'));
export const gruposSchema = createResourceSchema(getResourceDefinition('seguranca-grupos'));
