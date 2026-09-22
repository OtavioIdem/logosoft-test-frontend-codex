import { Crt, RegimeTributario } from '@/features/administracao/types/administracao.types';

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

// Crt não tem zero (1, 2, 3) — o sentinel `''` representa "não informado" e vira `null` no schema
// (administracaoSchemas.ts), nunca `Crt.SimplesNacional` por ser a primeira opção da lista.
export const crtLabel = (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'Não informado';
    const map: Record<number, string> = {
        [Crt.SimplesNacional]: 'Simples Nacional',
        [Crt.SimplesNacionalExcessoSublimite]: 'Simples Nacional — excesso de sublimite',
        [Crt.RegimeNormal]: 'Regime normal'
    };
    return map[Number(value)] ?? String(value);
};

export const crtOptions = [
    { label: 'Não informado', value: '' },
    { label: 'Simples Nacional', value: Crt.SimplesNacional },
    { label: 'Simples Nacional — excesso de sublimite', value: Crt.SimplesNacionalExcessoSublimite },
    { label: 'Regime normal', value: Crt.RegimeNormal }
];

// Sentinel de `contribuinteIpiPatch` (administracaoPageConfig.ts) — `''` não gera chave no PUT
// (armadilha 5 do plano v1.11.0a8b64); só `'sim'`/`'nao'` viram `contribuinteIpi: true|false`.
export const contribuinteIpiPatchOptions = [
    { label: 'Manter valor atual', value: '' },
    { label: 'Contribuinte de IPI', value: 'sim' },
    { label: 'Não contribuinte de IPI', value: 'nao' }
];
