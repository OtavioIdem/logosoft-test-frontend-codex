# Rodada 23 — Inventário AJ-07: limites do leiaute

## Recorte e fontes

O planejamento formal ainda pendente é o AJ-07, indicado como a próxima fatia depois de AJ-06 em
`docs/arquitetura/debate/19-planejamento-proxima-sessao-v124.md:21-23`. A fonte de contrato é
`../New project 3/src/Erp.Domain/Fiscal/LimitesDoLeiaute.cs:18-89`; ela é hierarquicamente superior
ao plano do frontend do backend (`../New project 3/docs/frontend/PLANO-FRONTEND-v1.24-p1-validacoes-fiscais.md:61`).

## Telas e rotas

| Rota/tela | Componente | Permissão registrada | Papel no recorte |
| --- | --- | --- | --- |
| `/produtos` | `features/produtos/components/ProdutoFormDialog.tsx:295-334` | `PRODUTOS_GERENCIAR` e `PRODUTOS_DADOS_FISCAIS_GERENCIAR`, catálogo em `features/seguranca/permissoesCatalogo.ts:57-60` | edita NCM, CEST e unidade tributável |
| `/produtos/unidades-medida` | `features/produtos/components/CatalogoProdutoPage.tsx` por `app/(main)/produtos/unidades-medida/page.tsx:1-5` | `UNIDADES_MEDIDA_GERENCIAR` | edita a sigla que alimenta `uCom` |
| `/fiscal/naturezas-operacao` | `features/fiscal/components/NaturezasOperacaoPage.tsx` | `FISCAL_CADASTROS_CONSULTAR/GERENCIAR`, `lib/security/routePermissions.ts:58` | envia CFOP pelo código no mapeamento |
| `/fiscal/series` | `features/fiscal/components/SerieFiscalDialogs.tsx:103-119` | `FISCAL_SERIES_CONSULTAR/GERENCIAR`, `lib/security/routePermissions.ts:57` | cria série fiscal |
| Empresas e filiais | `features/administracao/schemas/administracaoSchemas.ts:26-54` | `ADMINISTRACAO_*` | enviam IE e IM |
| Pessoas | `features/pessoas/schemas/pessoasSchemas.ts:36-54` | `PESSOAS_*` | envia IE e IM |

## Endpoints e payloads

| Método + rota | Payload/campo | Schema atual | Backend confirma? |
| --- | --- | --- | --- |
| PATCH de dados fiscais do produto | `ncmCodigo`, `cestCodigo`, `unidadeTributavelSigla` | `atualizarDadosFiscaisProdutoSchema`, `features/produtos/schemas/produtosSchemas.ts:108-123` | Sim: NCM 8 (ou `00`), CEST 7 e unidade 1–6 em `LimitesDoLeiaute.cs:18-49` |
| POST/PUT unidade de medida | `sigla` | `criarUnidadeMedidaSchema`, `produtosSchemas.ts:57-71` | Sim: unidade 1–6, `LimitesDoLeiaute.cs:34-49` |
| POST/PUT natureza de operação | `cfops[].cfopCodigo` | `mapeamentoCfopSchema`, `features/fiscal/schemas/naturezasOperacaoSchemas.ts:65-72` | Sim: CFOP 4, primeiro dígito 1/2/3/5/6/7, `LimitesDoLeiaute.cs:27-32` |
| POST série fiscal | `numero` | `criarSerieFiscalSchema`, `features/fiscal/schemas/seriesFiscaisSchemas.ts:54-74` | Sim: 0–999, `LimitesDoLeiaute.cs:58-62` |
| POST/PUT empresa/filial/pessoa | `inscricaoEstadual`, `inscricaoMunicipal` | `administracaoSchemas.ts:26-54`, `pessoasSchemas.ts:36-54` | Sim: IE 2–14 dígitos ou ISENTO; IM 1–15, `LimitesDoLeiaute.cs:40-57` |

## Campos e destino

| Campo | Situação no frontend | Destino | Contrato backend |
| --- | --- | --- | --- |
| `ncmCodigo` | texto livre normalizado apenas por `trim` | enviado | 8 dígitos ou `00`; pontuação é normalizada no backend |
| `cestCodigo` | texto livre normalizado apenas por `trim` | enviado | 7 dígitos; pontuação é normalizada no backend |
| `unidadeTributavelSigla` | teto 6 já existe | enviado | 1–6 sem espaço nas pontas |
| `sigla` da unidade | obrigatório, sem teto | enviado | 1–6 sem espaço nas pontas |
| `cfops[].cfopCodigo` | obrigatório, sem formato | enviado | 4 dígitos e primeiro dígito restrito |
| `numero` da série | 0–999 já existe | enviado | 0–999 |
| IE/IM de empresa, filial e pessoa | texto anulável, sem formato | enviado | IE 2–14 dígitos ou ISENTO; IM 1–15 sem espaço nas pontas |
| GTIN/código de barras | código de barras genérico, sem contrato de GTIN no request | enviado em outro fluxo | fora: a K5 do backend exclui GTIN (`v1.24.1-k5-limites-do-leiaute-nos-cadastros.md:38`) |

## Estados de tela

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Produto | presente | presente | presente por erro de campo/API | presente | presente | presente | presente por campo de catálogo |
| Unidade de medida | não verificado nesta rodada | não verificado | não verificado | não verificado | não verificado | não verificado | não verificado |
| Natureza | presente no recorte anterior | presente | presente | presente | presente | presente | presente |
| Série | presente, `SeriesFiscaisPage.tsx:167-203` | presente | presente | presente | presente | presente | presente |
| Empresa/filial/pessoa | não verificado nesta rodada | não aplicável (formulários) | não verificado | não verificado | não verificado | não verificado | não verificado |

## Divergências

1. O AJ-07 cita somente schemas de Produtos, Cadastros Fiscais e Séries, mas o domínio aplica IE/IM também a Empresa, Filial e Pessoa. As schemas atuais dessas três superfícies não impõem os limites. A decisão de escopo precisa escolher incluí-las ou deixar uma divergência conhecida.
2. `cadastrosFiscaisSchemas.ts` é de resposta (`NCM`/`CFOP` para busca), não é o request que envia o CFOP; o request está em `naturezasOperacaoSchemas.ts:65-72`.
3. Série e unidade tributável já têm o teto de 999 e 6, respectivamente; planejar esses itens como novos duplicaria comportamento. Falta confirmar se a regra de caracteres da unidade deve ser reproduzida integralmente no cliente ou apenas o limite e a normalização explícita do backend.
4. GTIN não tem campo fiscal próprio no payload atual e a K5 do backend o exclui; não deve ser inferido a partir do código de barras genérico.

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "aj07-limites-leiaute",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/23-inventario-aj07-limites-leiaute.md",
  "decisoesPropostas": [],
  "discordancias": [
    { "de": "plano AJ-07", "ponto": "schemas de IE/IM e request de CFOP não aparecem no mapa de arquivos", "impacto": "alto" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "O cliente deve espelhar integralmente os predicados de IE/IM ou somente limites/formato declarados?", "decide": "escopo e mensagens dos schemas" }
  ],
  "riscos": ["O plano antigo inclui GTIN, mas a K5 o declarou fora e o request atual não o modela."]
}
```
