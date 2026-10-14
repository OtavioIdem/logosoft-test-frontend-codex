# Inventário 17 — pipeline XML fiscal

## Recorte e fontes

Inventário restrito a AJ-12 e AJ-16..18 no detalhe de Nota Fiscal: reabertura, geração/assinatura/transmissão do XML e armazenamento manual de XML. Não inclui R1/FE-1..FE-4, cobrança/pagamento D5, CNPJ, enums nem outros grupos fiscais.

Hierarquia aplicada: código backend visível em `../New project 3/src` acima do contrato documental. O plano registra AJ-12 e AJ-16..18 em `../New project 3/docs/frontend/PLANO-FRONTEND-v1.24-p1-validacoes-fiscais.md:66-72`; a correction slice K2c detalha o contrato pretendido em `../New project 3/docs/fatias/v1.24.1-k2-nota-fechada-imutavel.md:126-157`.

> **Atualização 2026-10-14 (QA-3 da b76).** As afirmações de que o backend não declara `podeReabrir` estão superadas. O campo existe em `NotaFiscalResponse.cs:148` e o `FiscalResumoOperacionalMapper.cs:51` o liga só em `Validada` ou `Assinada`, no backend em `1fa1bfd`. O DVG-05 e o trecho de `PodeReabrir` do DVG-01 foram corrigidos abaixo. Os demais itens do DVG-01 não foram reconferidos nesta atualização.

## 1. Telas e rotas

| Rota / ação | Arquivo de página | Componente da feature | Permissão exigida | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/fiscal/notas/[id]` — detalhe | `app/(main)/fiscal/notas/[id]/page.tsx:1-10` | `features/fiscal/components/NotaFiscalDetalhePage.tsx:87` | `FISCAL_CONSULTAR`; sem ela a página retorna estado negado | `NotaFiscalDetalhePage.tsx:90,130`; rota aceita o conjunto fiscal em `lib/security/routePermissions.ts:49`; catálogo em `features/seguranca/permissoesCatalogo.ts:107-114`; union em `types/erp.ts:301-308` |
| detalhe — Gerar XML | mesma página | botão em `NotaFiscalDetalhePage.tsx:204`; diálogo `FiscalActionDialogs.tsx:452-475` | `FISCAL_GERENCIAR` | guard em `NotaFiscalDetalhePage.tsx:204`; backend em `../New project 3/src/Erp.Api/Controllers/Fiscal/NotasFiscaisController.cs:156-162` |
| detalhe — Assinar XML | mesma página | botão em `NotaFiscalDetalhePage.tsx:205`; diálogo `FiscalActionDialogs.tsx:452-475` | `FISCAL_EMITIR` | guard em `NotaFiscalDetalhePage.tsx:205`; backend em `../New project 3/src/Erp.Api/Controllers/Fiscal/NotasFiscaisController.cs:165-171` |
| detalhe — Transmitir | mesma página | botão em `NotaFiscalDetalhePage.tsx:206`; diálogo `FiscalActionDialogs.tsx:478-493` | `FISCAL_EMITIR` | guard em `NotaFiscalDetalhePage.tsx:206`; backend em `../New project 3/src/Erp.Api/Controllers/Fiscal/NotasFiscaisController.cs:174-180` |
| detalhe — Armazenar XML | mesma página | botão em `NotaFiscalDetalhePage.tsx:262`; diálogo `FiscalActionDialogs.tsx:559-575` | `FISCAL_GERENCIAR` | guard em `NotaFiscalDetalhePage.tsx:262`; backend em `../New project 3/src/Erp.Api/Controllers/Fiscal/NotasFiscaisController.cs:113-119` |
| detalhe — Reabrir | mesma página | ausente no frontend atual | contrato: `FISCAL_GERENCIAR` | backend existente em `../New project 3/src/Erp.Api/Controllers/Fiscal/NotasFiscaisController.cs:131-142`; AJ-12 em `../New project 3/docs/frontend/PLANO-FRONTEND-v1.24-p1-validacoes-fiscais.md:66` |

## 2. Endpoints consumidos

| Método + rota | Arquivo em `features/fiscal/api/` | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/fiscal/notas-fiscais/{id}` | `fiscalApi.ts:342-344` | nenhum; resposta só tipada por `NotaFiscalResponse` | controller `NotasFiscaisController.cs:41-47` | sim, endpoint e `FISCAL_CONSULTAR` |
| `GET /api/fiscal/notas-fiscais/{id}/resumo-operacional` | `fiscalApi.ts:348-350` | nenhum; resposta só tipada por `ResumoOperacionalNotaFiscalResponse` | controller `NotasFiscaisController.cs:50-56` | sim, inclusive `podeReabrir` (`NotaFiscalResponse.cs:148`) |
| `POST /api/fiscal/notas-fiscais/{id}/reabrir` | ausente | ausente | AJ-12; controller `NotasFiscaisController.cs:131-142` | sim: request `ReabrirNotaFiscalRequest` e permissão `FiscalGerenciar`; devolve `NotaFiscalResponse` |
| `POST /api/fiscal/notas-fiscais/{id}/xmls` | `fiscalApi.ts:407-412` | `armazenarXmlNotaFiscalSchema`, `fiscalSchemas.ts:231-236` | AJ-17; controller `NotasFiscaisController.cs:113-119` | endpoint sim; recusa de `Envio` não está no fonte visível (`NotaFiscalBasicaUseCases.cs:433-449` ainda armazena qualquer `request.Tipo`) |
| `POST /api/fiscal/notas-fiscais/{id}/gerar-xml-envio` | `fiscalApi.ts:420-425` | `gerarXmlEnvioSchema`, `fiscalSchemas.ts:90-94` | pipeline citado por AJ-16; controller `NotasFiscaisController.cs:156-162` | sim |
| `POST /api/fiscal/notas-fiscais/{id}/assinar-xml-envio` | `fiscalApi.ts:427-432` | `assinarXmlEnvioSchema`, `fiscalSchemas.ts:96-102` | AJ-16; controller `NotasFiscaisController.cs:165-171` | endpoint sim; conferência de hash K2c não está no fonte visível (`NotaFiscalXmlPipelineUseCases.cs:161-167` ainda aceita o XML explícito como fonte) |
| `POST /api/fiscal/notas-fiscais/{id}/transmitir-sefaz` | `fiscalApi.ts:434-439` | `transmitirNotaFiscalSefazSchema`, `fiscalSchemas.ts:104-112` | AJ-16; controller `NotasFiscaisController.cs:174-180` | endpoint sim; conferência de hash K2c não está no fonte visível (`FiscalSefazUseCases.cs:100-106` ainda aceita o XML explícito como fonte) |

Os endpoints do recorte não aparecem como entradas em `scripts/backend-contract-map.allowlist.json`; o arquivo se declara `audit-only-no-suppressions` e aponta para contrato v1.23 (`scripts/backend-contract-map.allowlist.json:2-15`), portanto ele não confirma K2/K2c.

## 3. Campos

Universo desta tabela: apenas campos lidos ou enviados pelas ações AJ-12/AJ-16..18, incluindo os campos aditivos/ausentes do contrato. Não é inventário do `NotaFiscalResponse` inteiro.

| Campo | Tipo no frontend | Origem (endpoint/campo) | O backend entrega/aceita? | Destino declarado |
| --- | --- | --- | --- | --- |
| `statusFiscal` | `StatusNotaFiscal \| number` | `GET /{id}` | sim | exibido |
| `acoes.podeGerarXmlEnvio` | `boolean` | `GET /{id}/resumo-operacional` | sim | exibido |
| `acoes.podeAssinarXmlEnvio` | `boolean` | `GET /{id}/resumo-operacional` | sim | exibido |
| `acoes.podeTransmitirSefaz` | `boolean` | `GET /{id}/resumo-operacional` | sim | exibido |
| `acoes.podeReabrir` | ausente | contrato K2c-7 para `GET /{id}/resumo-operacional` | sim: `NotaFiscalResponse.cs:148`, mapper `:51` (Validada ou Assinada) | lido pelo botão Reabrir (b76) |
| `motivo` (reabrir) | ausente | `POST /{id}/reabrir` | sim; `string`, trim mínimo 15 e máximo 400 (`NotaFiscalValidators.cs:206-217`) | sem uso |
| `armazenarXml` (gerar) | `boolean` | `POST /{id}/gerar-xml-envio` | sim | enviado |
| `validarSchema` (gerar) | `boolean` | `POST /{id}/gerar-xml-envio` | sim | enviado |
| `schemaSetName` (gerar) | `string \| null` opcional | `POST /{id}/gerar-xml-envio` | sim | enviado |
| `certificateThumbprint` | `string \| null` opcional | `POST /{id}/assinar-xml-envio` | sim | enviado |
| `xmlEnvio` | `string \| null` opcional | `POST /{id}/assinar-xml-envio` | sim no request atual; K2c documenta aceitação apenas se idêntico ao vigente | enviado |
| `armazenarXmlAssinado` | `boolean` | `POST /{id}/assinar-xml-envio` | sim | enviado |
| `validarSchemaAntesAssinatura` | `boolean` | `POST /{id}/assinar-xml-envio` | sim | enviado |
| `schemaSetName` (assinar) | `string \| null` opcional | `POST /{id}/assinar-xml-envio` | sim | enviado |
| `ufAutorizadora` | `string` | `POST /{id}/transmitir-sefaz` | sim; duas letras | enviado |
| `servico` | `TipoServicoTransmissaoFiscal \| number` | `POST /{id}/transmitir-sefaz` | sim | enviado |
| `xmlEnvioAssinado` | `string \| null` opcional | `POST /{id}/transmitir-sefaz` | sim no request atual; K2c documenta aceitação apenas se idêntico ao vigente | enviado |
| `validarSchemaAntesTransmissao` | `boolean` | `POST /{id}/transmitir-sefaz` | sim | enviado |
| `schemaSetName` (transmitir) | `string \| null` opcional | `POST /{id}/transmitir-sefaz` | sim | enviado |
| `correlationId` | `string` | `POST /{id}/transmitir-sefaz` | sim; obrigatório, máximo 120 | enviado |
| `tipo` (armazenar) | `TipoXmlFiscal \| number`; default atual `Envio` | `POST /{id}/xmls` | request aceita enum; K2c documenta recusa específica de `Envio` | enviado |
| `conteudoXml` | `string` | `POST /{id}/xmls` | sim; obrigatório, máximo 2.000.000 | enviado |
| `protocolo` | `string \| null` opcional | `POST /{id}/xmls` | sim; máximo 80 | enviado |
| `chaveAcesso` | `string \| null` opcional | `POST /{id}/xmls` | sim; máximo 80 | enviado |

Evidências do tipo frontend: `features/fiscal/types/fiscal.types.ts:153-189,217-245,388-417`. Evidências dos requests backend: `../New project 3/src/Erp.Application/Fiscal/NotasFiscais/NotaFiscalRequests.cs:146-191`.

### Conta de campos

- Universo contratual do recorte: **24 ocorrências**.
- Presentes hoje no frontend: **22**.
- Presentes também no código-fonte backend visível: **22**.
- Backend existente sem correspondente frontend: **1** (`motivo` de reabertura).
- Apenas no contrato documental K2c, ausente em ambos os tipos visíveis: **1** (`acoes.podeReabrir`).
- Dos 22 campos atuais, **3 têm divergência de comportamento frente ao contrato documentado**: `xmlEnvio`, `xmlEnvioAssinado` e `tipo` quando vale `Envio`.
- Fechamento: `19 alinhados no recorte + 3 divergências comportamentais + 1 backend sem UI + 1 documental sem implementação visível = 24`.

## 4. Estados de tela

| Tela / ação | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| detalhe da nota | presente (`NotaFiscalDetalhePage.tsx:199,213`) | ausente para resposta sem `nota` | presente via `ApiErrorPanel` + Atualizar (`:199,214-217`) | presente via `ApiErrorPanel` | ausente como estado próprio de carregamento | presente (`:130`) | presente para ações resolvidas por workflow/resumo (`fiscalUiUtils.ts:169-204`) |
| Gerar / Assinar / Transmitir | presente via `mutation.isPending` (`NotaFiscalDetalhePage.tsx:354-356`) | ausente | presente via toast; diálogo só fecha no sucesso (`:132-156`) | ausente como painel próprio | presente via toast e fechamento do diálogo (`:132-152`) | presente por guards (`:204-206`) | presente por `fiscalActionDisabledReason` (`:204-206`) |
| Armazenar XML | presente (`NotaFiscalDetalhePage.tsx:357`) | ausente | presente via toast (`:132-140`) | ausente como painel próprio | presente via toast (`:357`) | presente (`:262`) | ausente para regra de negócio; só o motivo de permissão é representado pelo guard |
| Reabrir | ausente | ausente | ausente | ausente | ausente | ausente | ausente |
| edição em nota Validada | ausente | ausente | ausente | ausente | ausente | presente apenas por `FISCAL_GERENCIAR` | divergente: `notaPodeEditarItens` ainda permite `Rascunho` e `Validada` (`fiscalUiUtils.ts:207`), enquanto AJ-12 registra congelamento após Validar |

## Testes existentes usados como evidência

- O teste de contrato exige hoje só os nove booleanos antigos das ações; `podeReabrir` não faz parte da asserção (`tests/contract/fiscal-backend.contract.spec.ts:161-168`).
- A fixture tipada de resumo também não contém `podeReabrir` (`tests/unit/fiscalContract.test.ts:230-242`).
- O payload de transmissão preserva hoje `xmlEnvioAssinado: null` e testa esse campo (`tests/unit/fiscalPayload.test.ts:176-195`); outro teste passa XML explícito em transmissão (`tests/unit/fiscalContract.test.ts:341-343`).
- O teste de componente de transmissão cobre correlation ID, mas não impede campo de XML colado (`tests/components/TransmitirSefazDialog.test.tsx:19-65`).
- A rota e o conjunto de permissões fiscais estão congelados por `tests/unit/routePermissions.test.ts:48-59`.
- Não foi encontrado teste específico atual para `ArmazenarXmlDialog`, `XmlPipelineDialog` ou reabertura de nota fiscal.

## Divergências

1. **DVG-01 — contrato K2c ainda não confirmado no código backend visível.** K2c-1, K2c-2 e K2c-7 estão documentados (`v1.24.1-k2-nota-fechada-imutavel.md:140-146`), mas o fonte ainda aceita XML explícito como fonte (`NotaFiscalXmlPipelineUseCases.cs:161-167`; `FiscalSefazUseCases.cs:100-106`), armazena `Envio` em `POST /xmls` (`NotaFiscalBasicaUseCases.cs:443-449`), calcula `possuiXmlEnvio` por existência de qualquer XML (`FiscalResumoOperacionalMapper.cs:10-13`) (o `PodeReabrir` já está declarado, ver a atualização no topo).
2. **DVG-02 — AJ-16 / assinatura.** A UI exibe “XML envio opcional” e envia `xmlEnvio` (`FiscalActionDialogs.tsx:452-465`); tipo e schema o mantêm (`fiscal.types.ts:401-407`; `fiscalSchemas.ts:96-102`).
3. **DVG-03 — AJ-16 / transmissão.** A UI exibe “XML assinado opcional” e envia `xmlEnvioAssinado` (`FiscalActionDialogs.tsx:478-490`); tipo e schema o mantêm (`fiscal.types.ts:409-417`; `fiscalSchemas.ts:104-112`).
4. **DVG-04 — AJ-17.** `ArmazenarXmlDialog` inicia em `TipoXmlFiscal.Envio` e oferece `Envio` na lista (`FiscalActionDialogs.tsx:559-568`); o schema também usa `Envio` como default (`fiscalSchemas.ts:231-235`).
5. **DVG-05 — AJ-18 (resolvido na b76).** O backend declara `PodeReabrir` (`NotaFiscalResponse.cs:148`, `FiscalResumoOperacionalMapper.cs:51`). O frontend passou a declará-lo como opcional em `AcoesResumoFiscalResponse` e a lê-lo no botão Reabrir. O teste de contrato `fiscal-backend.contract.spec.ts` ainda não o exige.
6. **DVG-06 — AJ-12.** O backend já expõe `POST /{id}/reabrir`, `FISCAL_GERENCIAR`, `{ motivo }` e validação 15..400 (`NotasFiscaisController.cs:131-142`; `NotaFiscalRequests.cs:165-171`; `NotaFiscalValidators.cs:206-217`). O frontend não possui tipo, schema, builder, método API, mutation, diálogo ou botão correspondente.
7. **DVG-07 — AJ-12 / congelamento.** A edição de itens ainda é habilitada em `Validada` por decisão local de status (`fiscalUiUtils.ts:207`), divergindo do congelamento registrado pelo backend no AJ-12.
8. **DVG-08 — códigos K2c.** `Fiscal.XmlEnvioDivergenteDoVigente` e `Fiscal.XmlEnvioSoPeloPipeline` não aparecem no mapa atual `fiscalErrosCadastroMap` (`features/fiscal/components/fiscalErrosCadastro.ts:36-84`) nem no `FiscalErrors.cs` visível (`../New project 3/src/Erp.Application/Fiscal/FiscalErrors.cs:30-44`).

```json
{
  "status": "completed_with_warnings",
  "agent": "inventariante-contrato-tela",
  "slice": "AJ-12+AJ-16..18",
  "node": "projeto",
  "assunto": "pipeline-xml-fiscal",
  "arquivo": "docs/arquitetura/debate/17-inventario-pipeline-xml-fiscal.md",
  "changedFiles": [
    "docs/arquitetura/debate/17-inventario-pipeline-xml-fiscal.md"
  ],
  "gates": {
    "conta_de_campos": "passed: 24 = 19 alinhados + 3 divergencias comportamentais + 1 backend sem UI + 1 documental sem implementacao visivel",
    "evidencia_frontend_backend": "passed_with_warning",
    "testes": "not_run: inventario somente leitura; testes existentes usados como evidencia estatica"
  },
  "decisoesPropostas": [],
  "discordancias": [
    {
      "de": "codigo backend visivel x contrato K2c",
      "ponto": "K2c-1, K2c-2 e K2c-7 estao documentados, mas nao aparecem implementados no fonte acessivel",
      "impacto": "alto"
    },
    {
      "de": "frontend atual x AJ-12/AJ-16..18",
      "ponto": "XML explicito continua editavel, Envio continua em POST /xmls, reabrir e podeReabrir estao ausentes",
      "impacto": "alto"
    }
  ],
  "pendencias": [
    {
      "tipo": "backend",
      "pergunta": "Qual revisao de codigo contem a implementacao K2c-1, K2c-2 e K2c-7 descrita nos documentos?",
      "decide": "se o desenvolvimento frontend sera confrontado com fonte implementada ou apenas com contrato documental"
    }
  ],
  "risks": [
    "Implementar contra o documento sem a revisao backend visivel impede confirmar nomes, serializacao e erros reais de K2c.",
    "O teste de contrato atual nao exige podeReabrir e os testes atuais preservam xmlEnvioAssinado no payload."
  ],
  "blockers": [],
  "handoff": {
    "testsRequired": true,
    "e2eRequired": true,
    "qaReviewRequired": true,
    "notes": "Inventario concluido sem proposta de arquitetura e sem alteracao de codigo. As divergencias DVG-01 a DVG-08 devem ser arbitradas pela rodada."
  },
  "nextRecommendedAgent": "arquiteto-frontend"
}
```
