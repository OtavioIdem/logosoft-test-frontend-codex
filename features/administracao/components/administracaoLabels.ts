import { RegimeTributario } from '@/features/administracao/types/administracao.types';

export const regimeTributarioLabel = (value: unknown) => {
    const map: Record<number, string> = {
        [RegimeTributario.SimplesNacional]: 'Simples Nacional',
        [RegimeTributario.LucroPresumido]: 'Lucro presumido',
        [RegimeTributario.LucroReal]: 'Lucro real'
    };
    return map[Number(value)] ?? String(value);
};

export const regimeTributarioOptions = [
    { label: 'Simples Nacional', value: RegimeTributario.SimplesNacional },
    { label: 'Lucro presumido', value: RegimeTributario.LucroPresumido },
    { label: 'Lucro real', value: RegimeTributario.LucroReal }
];
