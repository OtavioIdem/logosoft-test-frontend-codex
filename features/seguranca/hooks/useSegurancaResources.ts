import { useResourceController } from '@/features/shared/hooks/useResourceController';
import { getResourceDefinition } from '@/features/shared/config/erpFeatureCatalog';

export const useUsuarios = () => useResourceController(getResourceDefinition('seguranca-usuarios'));
export const useGrupos = () => useResourceController(getResourceDefinition('seguranca-grupos'));
