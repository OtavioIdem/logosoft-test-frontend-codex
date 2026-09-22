'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { administracaoApi } from '@/features/administracao/api/administracaoApi';
import { SelectOption } from '@/types/erp';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePermissions } from '@/features/auth/hooks/usePermissions';

const CADASTROS_PERMISSAO = 'FISCAL_CADASTROS_CONSULTAR';

// Remove sufixo de UF do nome do município ("São Paulo - SP", "São Paulo – SP", "São Paulo/SP",
// "São Paulo (SP)") quando as duas letras finais batem com a UF do próprio registro. Não medido no
// contrato: `MunicipioIbgeResponse.Nome` nasce de importação de arquivo (docs/arquitetura/debate/
// 04-inventario-cadastros-fiscais.md), então o formato depende da carga, não do código — este helper
// existe para o dropdown e o auto-preenchimento de Cidade ficarem imunes ao formato real, em vez de
// presumi-lo (C3, v1.11.0a8b64 Bloco C). Só corta quando o sufixo bate com a UF: um nome legítimo que
// termine com essas duas letras por coincidência nunca é mutilado.
const UF_SUFFIX_REGEX = /\s*(?:[-–]\s*|\/\s*|\(\s*)([A-Za-z]{2})\)?\s*$/;
export const semSufixoUf = (nome: string, ufSigla: string): string => {
    const normalizado = nome.trim();
    const match = normalizado.match(UF_SUFFIX_REGEX);
    if (!match || typeof match.index !== 'number') return normalizado;
    if (match[1].toUpperCase() !== ufSigla.trim().toUpperCase()) return normalizado;
    const semSufixo = normalizado.slice(0, match.index).trim();
    return semSufixo || normalizado;
};

// GET /api/fiscal/cadastros/uf não pagina (docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md, medido em
// docs/arquitetura/debate/04-inventario-cadastros-fiscais.md:159) — a lista inteira de UFs (27) é o
// próprio universo de busca, D52 não se aplica a ela.
export const useUfCatalogo = () => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(CADASTROS_PERMISSAO);
    const [termo, setTermo] = useState('');
    const debouncedTermo = useDebouncedValue(termo, 350);
    const query = useQuery({
        queryKey: ['administracao', 'endereco-fiscal', 'uf', debouncedTermo || null],
        queryFn: () => administracaoApi.listarUfsFiscais(debouncedTermo || null),
        enabled: permitido,
        staleTime: 5 * 60 * 1000
    });
    const options = useMemo<SelectOption<string>[]>(() => (query.data ?? []).map((uf) => ({ label: `${uf.sigla} — ${uf.nome}`, value: uf.sigla })), [query.data]);
    return { ...query, options, permitido, buscar: setTermo };
};

// GET /api/fiscal/cadastros/municipios pagina e exige `ufSigla` para ter sentido operacional — são
// 5.570 municípios no cadastro nacional (D52: busca no servidor com debounce, nunca o catálogo
// inteiro numa dropdown).
export const useMunicipioCatalogo = (ufSigla: string | null) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(CADASTROS_PERMISSAO);
    const [termo, setTermo] = useState('');
    const debouncedTermo = useDebouncedValue(termo, 350);
    const normalizedUf = ufSigla || null;
    const enabled = permitido && Boolean(normalizedUf);
    const query = useQuery({
        queryKey: ['administracao', 'endereco-fiscal', 'municipio', normalizedUf, debouncedTermo || null],
        queryFn: () => administracaoApi.listarMunicipiosFiscais({ ufSigla: normalizedUf, termo: debouncedTermo || null, tamanhoPagina: 20 }),
        enabled,
        staleTime: 5 * 60 * 1000
    });
    // `semSufixoUf` torna o label imune a um eventual sufixo de UF no `Nome` do catálogo (C3) — o
    // auto-preenchimento de Cidade em EnderecoFiscalSection confia neste label.
    const options = useMemo<SelectOption<string>[]>(() => (query.data?.items ?? []).map((municipio) => ({ label: semSufixoUf(municipio.nome, municipio.ufSigla), value: municipio.codigoIbge })), [query.data]);
    return { ...query, options, permitido, itens: query.data?.items ?? [], buscar: setTermo };
};

/**
 * `nao-aplica`: não há município vinculado para resolver (ou faltam UF/Id). `pendente`: a busca
 * ainda está em voo. `resolvido`: achou. `falhou`: terminou (ou não tinha permissão) sem achar —
 * nunca decorre de o operador ter limpado o campo, então quem consome não deve sugerir remover
 * vínculo neste estado (C1, v1.11.0a8b64 Bloco C).
 */
export type MunicipioResolucaoStatus = 'nao-aplica' | 'pendente' | 'resolvido' | 'falhou';

/**
 * `EnderecoFiscalResponse.municipioIbgeId` é o Id (Guid) do catálogo; o PUT precisa do
 * `codigoMunicipioIbge` (string). Não existe filtro por Id em `/cadastros/municipios` — só
 * `ufSigla`, `termo`, `codigoIbge`.
 *
 * Resolução em dois passos (C2, v1.11.0a8b64 Bloco C): primeiro uma busca curta usando `cidade`
 * (o `EnderecoFiscalResponse.Cidade` que o formulário já tem) como `termo`, dentro da UF — resolve o
 * caso comum numa página de até 50 itens. Só quando essa busca termina sem achar o Id é que a
 * segunda entra, varrendo a UF inteira (`tamanhoPagina` alto — no máximo ~853 municípios, Minas
 * Gerais). A varredura continua existindo porque `termo` pode não bater: acento, grafia divergente
 * do operador na digitação original do endereço.
 */
export const useMunicipioResolvidoPorId = (ufSigla: string | null, municipioIbgeId: string | null, cidade: string | null) => {
    const { hasPermission } = usePermissions();
    const permitido = hasPermission(CADASTROS_PERMISSAO);
    const normalizedUf = ufSigla || null;
    const aplica = Boolean(normalizedUf) && Boolean(municipioIbgeId);
    const enabledBase = permitido && aplica;

    const termoBusca = (cidade || '').trim() || null;
    const passo1Ativo = enabledBase && Boolean(termoBusca);
    const buscaPorNome = useQuery({
        queryKey: ['administracao', 'endereco-fiscal', 'municipio-resolvido-nome', normalizedUf, municipioIbgeId, termoBusca],
        queryFn: () => administracaoApi.listarMunicipiosFiscais({ ufSigla: normalizedUf, termo: termoBusca, tamanhoPagina: 50 }),
        enabled: passo1Ativo,
        staleTime: 5 * 60 * 1000
    });
    const encontradoPorNome = useMemo(() => buscaPorNome.data?.items.find((item) => item.id === municipioIbgeId) ?? null, [buscaPorNome.data, municipioIbgeId]);
    const passo1Terminou = !passo1Ativo || buscaPorNome.isFetched;

    const passo2Ativo = enabledBase && passo1Terminou && !encontradoPorNome;
    const buscaPorUf = useQuery({
        queryKey: ['administracao', 'endereco-fiscal', 'municipio-resolvido', normalizedUf, municipioIbgeId],
        queryFn: () => administracaoApi.listarMunicipiosFiscais({ ufSigla: normalizedUf, tamanhoPagina: 1000 }),
        enabled: passo2Ativo,
        staleTime: 5 * 60 * 1000
    });
    const encontradoPorUf = useMemo(() => buscaPorUf.data?.items.find((item) => item.id === municipioIbgeId) ?? null, [buscaPorUf.data, municipioIbgeId]);
    const passo2Terminou = !passo2Ativo || buscaPorUf.isFetched;

    const municipio = encontradoPorNome ?? encontradoPorUf;
    const isFetching = buscaPorNome.isFetching || buscaPorUf.isFetching;
    const isError = buscaPorNome.isError || buscaPorUf.isError;
    const pendente = !passo1Terminou || !passo2Terminou;

    const status: MunicipioResolucaoStatus = !aplica ? 'nao-aplica' : !permitido ? 'falhou' : municipio ? 'resolvido' : pendente ? 'pendente' : 'falhou';

    return { municipio, status, isFetching, isError, permitido };
};
