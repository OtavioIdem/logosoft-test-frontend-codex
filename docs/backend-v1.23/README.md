# Levantamento backend v1.23 × frontend — cópia de leitura

> **Cópia.** O original vive no repositório do backend, em `docs/frontend/`, e **é ele que
> vence** em caso de divergência — mesmo padrão já usado por
> [`docs/fiscal/contrato-motor-tributacao-frontend.md`](../fiscal/contrato-motor-tributacao-frontend.md).
>
> Copiado em 2026-09-08. Backend medido em `v1.23.2+`; frontend em `v1.11.0a8b47.c3`
> (HEAD `826cc6a`).

## Os quatro documentos

| Documento | Responde | Origem |
| --- | --- | --- |
| [`PLANO-FRONTEND-v1.23.md`](PLANO-FRONTEND-v1.23.md) | **Em que ordem** — seis ondas (F0…F5), com escopo, tradeoffs e critério de pronto | escrito à mão |
| [`FLUXOS-E-REGRAS-PARA-A-UI.md`](FLUXOS-E-REGRAS-PARA-A-UI.md) | **Por quê** — contrato de erro, modelo organizacional, legs, T1/T2, concorrência, motor de tributação | escrito à mão |
| [`GAP-FRONTEND-BACKEND.md`](GAP-FRONTEND-BACKEND.md) | **Quanto falta** — as 122 operações que a UI não chama, por módulo, com a permissão de cada uma | gerado |
| [`CONTRATO-API-v1.23.md`](CONTRATO-API-v1.23.md) | **O quê** — as 579 operações, com rota, verbo, permissão, request tipado e DTO de response (~320 KB, consulta, não leitura linear) | gerado |

**Ordem de leitura:** fluxos → plano → gap. O contrato é referência de consulta.

## O que este levantamento mede, e o que não mede

**Mede:** se existe, neste repositório, uma chamada para cada endpoint do backend; qual
permissão cada endpoint exige; qual o payload de request; e — por auditoria manual — cinco
divergências de contrato já ativas em produção.

**Não mede:** se a tela usa o endpoint corretamente em todos os casos. Endpoint marcado
como coberto ainda pode mandar o payload errado. O eixo semântico só foi auditado a fundo
em Fiscal, Faturamento, Financeiro e Segurança.

## O resumo em três frases

1. A cobertura real é **457/579 (79%)** — não a defasagem que o número de versão sugere.
   `NotasFiscais` está em **26/28**: este repositório **sabe operar** o documento fiscal.
   A medição usa o **`scanFrontendRoutes` deste repositório** (o mesmo do gate `validate-backend-contract-map`), casando **método + rota**.
2. O que falta é **cadastrar o que torna o documento correto**: `SeriesFiscais` 0/7,
   `NaturezasOperacao` 0/5, `CadastrosFiscais` 2/16, `Pessoas` 4/19.
3. Antes de qualquer tela nova há **cinco defeitos em produção** e **o CI parado** — o
   `frontend-ci.yml:31` tem indentação inválida, e os 21 gates não rodam desde então.

## Onde este levantamento diverge dos documentos vivos daqui

Não vem substituí-los; vem atualizá-los onde o tempo passou.

| Documento deste repo | Situação |
| --- | --- |
| `BACKEND-ESTADO-ATUAL-E-CONTRATO.md` | Catálogo canônico, de **2026-08-12**, com o backend em `feat/v1.18.0-g1`. Continua sendo a entrada de `validate-backend-contract-map`. O [contrato novo](CONTRATO-API-v1.23.md) é mais recente (`v1.23.2+`) e traz permissão por endpoint, mas **não** substitui a função de gate — trocar a fonte do gate é decisão própria |
| `PLANO-ADEQUACAO-FRONTEND-AO-BACKEND-ATUAL.md` | Sequência corrente de execução, de 2026-08-12. O [plano novo](PLANO-FRONTEND-v1.23.md) o sucede em ordenação, e concorda com ele em dois pontos que continuam pendentes: `empresaId` na query key e o rollout da política de contexto organizacional |
| `CONTRATO_FISCAL_OFICIAL.md` | Base declarada é o backend **`v1.10.0a18`**. Exigido por `validate-source.mjs`, então **não apagar** — mas a seção 4 dos [fluxos](FLUXOS-E-REGRAS-PARA-A-UI.md) descreve o comportamento fiscal atual, incluindo a separação emitir × reprocessar e o `correlationId` obrigatório |
| `scripts/backend-permissions.snapshot.json` | 177 permissões, `sourceDate: 2026-08-12`. O backend hoje tem **178** reais. Regenerar é o item **F0.3** do plano |

## Aviso sobre os dois arquivos gerados

Eles saem do **backend em execução** (`swagger.json`), não do código-fonte parado. Ficam
desatualizados sem avisar, e nada neste repositório os verifica.

E há uma limitação que atravessa o contrato inteiro: **nenhuma das 579 operações do backend
declara schema de response** (`[ProducesResponseType]` é usado zero vezes em 96
controllers). As seções "Response" vêm do `record` C#, não do contrato publicado — por isso
não é possível **gerar** os tipos de response deste repositório, e é por isso que campo novo
em response chega à tela como `undefined` em silêncio.
