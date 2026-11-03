'use client';

// UF do emitente para pré-preencher a "UF autorizadora" do Confirmar (AJ-38, D113). Fonte: a UF do endereço fiscal
// da filial do faturamento, quando ela existe e tem endereço; senão a da empresa. Só sugere: quem decide o que vai
// no request é o operador (o diálogo nunca sobrescreve o que ele digitou) e o backend valida (D94).

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';
import { usePermissions } from '@/features/auth/hooks/usePermissions';
import { useOrganizationalContext } from '@/hooks/useOrganizationalContext';
import { organizationalScopeKey } from '@/lib/http/organizationalContextPolicy';
import { normalizeGuidOrNull } from '@/lib/http/requestUtils';
import { UFS_BRASIL } from '@/lib/constants/ufs';

const normalizarUf = (value?: string | null) => {
    const uf = (value ?? '').trim().toUpperCase();
    return (UFS_BRASIL as readonly string[]).includes(uf) ? uf : null;
};

/** Filial primeiro (quando o endereço dela tem UF válida), depois a empresa; nenhuma das duas, `null`. */
export const ufEmitenteSugerida = ({ filialUf, empresaUf }: { filialUf?: string | null; empresaUf?: string | null }): string | null =>
    normalizarUf(filialUf) ?? normalizarUf(empresaUf);

// `enabled` só é verdadeiro com o diálogo visível: o diálogo fica montado oculto em todo detalhe e nenhuma consulta
// de administração pode sair dali. `useEmpresasOptions` e `useFiliaisOptions` não aceitam `enabled`, então as duas
// consultas são feitas aqui com as mesmas chaves e o mesmo client; sem ADMINISTRACAO_CONSULTAR (nem master) nada é
// consultado e a UF simplesmente não é sugerida.
export const useUfEmitenteFaturamento = (empresaId: string | null | undefined, filialId: string | null | undefined, enabled: boolean) => {
    const context = useOrganizationalContext();
    const { hasPermission } = usePermissions();
    const empresa = normalizeGuidOrNull(empresaId);
    const podeConsultar = enabled && (context.snapshot.isMaster || hasPermission('ADMINISTRACAO_CONSULTAR'));
    const contextoConfere = Boolean(context.snapshot.empresaId && context.snapshot.empresaId === empresa);

    const empresasQuery = useQuery({
        queryKey: ['administracao', 'empresas', 'select'],
        queryFn: administracaoApi.listarEmpresas,
        staleTime: 5 * 60 * 1000,
        enabled: podeConsultar && Boolean(empresa)
    });
    const filiaisQuery = useQuery({
        queryKey: ['administracao', 'filiais', 'select', organizationalScopeKey(context.snapshot), empresa],
        queryFn: () => administracaoApi.listarFiliais({ empresaId: empresa as string }, context.snapshot),
        staleTime: 5 * 60 * 1000,
        enabled: podeConsultar && Boolean(empresa) && Boolean(filialId) && contextoConfere
    });

    // Com filial no faturamento, espera a lista de filiais antes de sugerir a UF da empresa (a UF não pisca).
    const aguardando = empresasQuery.isFetching || filiaisQuery.isFetching;

    return useMemo(() => {
        if (!enabled || aguardando) return null;
        const emp = (empresasQuery.data ?? []).find((item) => item.id === empresaId) ?? null;
        const fil = filialId ? (filiaisQuery.data ?? []).find((item) => item.id === filialId) ?? null : null;
        return ufEmitenteSugerida({ filialUf: fil?.enderecoFiscal?.uf, empresaUf: emp?.enderecoFiscal?.uf });
    }, [enabled, aguardando, empresasQuery.data, filiaisQuery.data, empresaId, filialId]);
};
