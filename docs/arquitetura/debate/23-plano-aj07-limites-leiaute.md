# Plano de implementação — AJ-07: limites do leiaute

## 1. Base e versão alvo

Plano funcional proposto para `v1.11.0a8b79`, condicionado à aceitação das fatias de trabalho b77 e b78. A base declarada ainda é `1.11.0a8b76` em `package.json`; este documento não carimba versão nem autoriza release.

## 2. Objetivo funcional

Antecipar ao formulário os formatos já exigidos pelo domínio fiscal do backend. O operador corrige NCM, CEST, CFOP, unidade, IE ou IM antes do request; o backend continua autoridade de normalização, regra de contribuinte, concorrência e emissão.

## 3. Impacto

| Módulo/tela | Alteração planejada | Endpoint/permissão |
| --- | --- | --- |
| Produtos | validar NCM, CEST e unidade tributável; limitar sigla de unidade | endpoints existentes; `PRODUTOS_*` e `UNIDADES_MEDIDA_GERENCIAR` |
| Naturezas | validar `cfops[].cfopCodigo` | endpoints existentes; `FISCAL_CADASTROS_*` |
| Séries | somente regressão 0–999 | endpoints existentes; `FISCAL_SERIES_*` |
| Administração/Pessoas | validar IE e IM no request | endpoints existentes; permissões atuais |

Não há rota, menu, query key, cache, endpoint ou permissão nova. Impacto fiscal é alto no dado de cadastro, mas não há cálculo fiscal no cliente; financeiro e estoque não mudam.

## 4. Passos ordenados por arquivo

1. Criar `lib/validators/fiscalLayoutFormats.ts` com predicados de formato e normalização para comparação, derivados de `LimitesDoLeiaute.cs`; sem truncar ou gerar valores de domínio.
2. Atualizar `features/produtos/schemas/produtosSchemas.ts`: NCM, CEST, unidade tributável e sigla de unidade. Preservar campo nulo e payload atual.
3. Atualizar `features/fiscal/schemas/naturezasOperacaoSchemas.ts`: `cfopCodigo` de quatro dígitos e primeiro dígito permitido.
4. Atualizar `features/administracao/schemas/administracaoSchemas.ts` e `features/pessoas/schemas/pessoasSchemas.ts`: IE e IM nos requests de escrita, sem alterar respostas.
5. Confirmar em `features/fiscal/schemas/seriesFiscaisSchemas.ts` que a regra 0–999 continua única; só alterar se a comparação revelar divergência.
6. O engenheiro de testes cria `tests/unit/aj07LimitesLeiaute.test.ts` e atualiza os testes de payload já existentes de Produtos, Administração, Pessoas e Naturezas.
7. Só após os gates e QA: ritual de versão/CHANGELOG e eventual documento de implementação, em fatia própria autorizada.

## 5. Contratos e tipos

Nenhum tipo, endpoint ou payload ganha campo. Assinaturas pretendidas:

```ts
isNcmLeiauteValido(value: string): boolean
isCestLeiauteValido(value: string): boolean
isCfopLeiauteValido(value: string): boolean
isUnidadeLeiauteValida(value: string): boolean
isInscricaoEstadualLeiauteValida(value: string): boolean
isInscricaoMunicipalLeiauteValida(value: string): boolean
```

Os helpers servem à UX e devem aceitar apenas o que o backend aceita; não recebem condição de pessoa contribuinte nem calculam DV/tributos.

## 6. Estados de UI e bloqueios

- **loading/vazio/sucesso/permissão:** permanecem os componentes já existentes.
- **erro recuperável:** `FieldError` indica o campo inválido; o valor permanece editável.
- **erro bloqueante:** resposta do backend segue em `ApiErrorPanel`; o frontend não a substitui.
- **ação indisponível:** somente os motivos de permissão já presentes; AJ-07 não cria bloqueio novo.

## 7. Testes e gates

```powershell
npx vitest run tests/unit/aj07LimitesLeiaute.test.ts tests/unit/produtosPayload.test.ts tests/unit/administracaoPayload.test.ts tests/unit/pessoasClientesFornecedoresPayload.test.ts tests/unit/naturezasOperacaoPayload.test.ts
npm run validate:source
npm run typecheck
npm run lint
npm run validate:fiscal:production
npm run build
git diff --check
```

Os testes cobrem bordas válidas/inválidas, pontuação que o backend normaliza, `ISENTO`, IM de 1/15/16 caracteres, CFOP por primeiro dígito e a manutenção de série 0/999. Não rodar backend mutável, SEFAZ ou deploy.

## 8. Riscos e confirmações

1. O AJ-07 antigo mistura GTIN, mas K5 o exclui; não limitar o código de barras genérico sem campo contratado.
2. Edição de registro legado fora do limite pode receber 400 mesmo em alteração não fiscal; é necessário medir em backend controlado antes de prometer preservação.
3. Se a fonte backend publicar metadado gerado, este helper deve ser reavaliado para não competir com FE-4/R1.

## 9. Escopo preservado

Não alterar CNPJ alfanumérico/AJ-09, GTIN, máscaras, cálculo ou regra fiscal, emissão de nota, dados legados, endpoints, permissões, rotas, menu, query keys, cache, testes E2E ou infraestrutura.

```json
{
  "status": "completed_with_warnings",
  "agent": "arquiteto-frontend",
  "slice": "v1.11.0a8b79-proposta-aj07",
  "node": "planner",
  "changedFiles": ["docs/arquitetura/debate/23-plano-aj07-limites-leiaute.md"],
  "acceptanceCriteria": { "AC-1": "planejado", "AC-2": "planejado", "AC-3": "planejado" },
  "decisionsApplied": ["D105", "D107", "D108"],
  "gates": { "validate:source": "not_run", "typecheck": "not_run", "lint": "not_run", "build": "not_run" },
  "measurements": [],
  "risks": ["Ritual de versão depende da aceitação das fatias anteriores."],
  "blockers": [],
  "redTests": [],
  "handoff": { "testsRequired": true, "e2eRequired": false, "qaReviewRequired": true, "notes": "Plano pronto; código não foi alterado." },
  "nextRecommendedAgent": "dev-senior-react"
}
```
