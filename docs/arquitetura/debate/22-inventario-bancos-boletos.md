# Inventário 22 — Bancos / Boletos

## Recorte e fontes

- **Missão:** conferir o contrato efetivo de Boletos e inventariar o que a rota `/bancos/boletos` precisa para operar sem supor payload financeiro.
- **Recorte:** listagem, detalhe, histórico, geração e cancelamento de boleto; não abrange CNAB nem os cadastros bancários.
- **Backend lido:** `../New project 3/src/Erp.Api/Controllers/Bancos/BoletosController.cs` e `../New project 3/src/Erp.Application/Bancos/`.
- **Hierarquia aplicada:** código do backend sobre tipos atuais do frontend. A captura anexada confirma as cinco rotas, mas não substitui a leitura dos DTOs.

## 1. Telas e rotas

| Rota | Página | Componente | Permissão da página | Registro |
| --- | --- | --- | --- | --- |
| `/bancos/boletos` | `app/(main)/bancos/boletos/page.tsx:1-5` | `features/bancos/components/BoletosPage.tsx:36-102` | `BANCOS_CONSULTAR` para a consulta; ações próprias para gerar/cancelar | `lib/security/routePermissions.ts:73`, `layout/AppMenu.tsx:192` |

## 2. Endpoints consumidos

| Método + rota | Client atual | Contrato de request | Resposta real | Permissão no backend | Situação |
| --- | --- | --- | --- | --- | --- |
| `GET /api/bancos/boletos` | `bancosApi.ts:61-62` | query obrigatória `empresaId`; opcionais `filialId`, `contaBancariaId`, `status` | coleção de `BoletoResponse` completo | `BANCOS_CONSULTAR` | Divergente: frontend envia `termo` e não declara `contaBancariaId`; `empresaId` é opcional no tipo local. |
| `GET /api/bancos/boletos/{id}` | `bancosApi.ts:64-65` | `id` GUID de rota | `BoletoResponse` | `BANCOS_CONSULTAR` | Endpoint e permissão confirmados. |
| `GET /api/bancos/boletos/{id}/historico` | `bancosApi.ts:67-68` | `id` GUID de rota | coleção de `BoletoHistoricoResponse` | `BANCOS_CONSULTAR` | Endpoint e campos confirmados. |
| `POST /api/bancos/boletos/gerar` | `bancosApi.ts:70-72` | `contaReceberId`, `parcelaReceberId`, `carteiraCobrancaId`, `numeroDocumento?` | `GerarBoletoResponse { boleto, alertas }` | `BOLETOS_GERAR` | Divergente: client tipa o retorno como `BoletoResponse`, descartando o envelope. |
| `POST /api/bancos/boletos/{id}/cancelar` | `bancosApi.ts:74-76` | `{ motivo }`, de 1 a 300 caracteres | `BoletoResponse` | `BOLETOS_CANCELAR` | Payload e resposta confirmados. |

Evidência: controller em `../New project 3/src/Erp.Api/Controllers/Bancos/BoletosController.cs:21-65`; DTOs em `../New project 3/src/Erp.Application/Bancos/BancosContracts.cs:13-50`; regras de geração em `GerarBoletoUseCase.cs:46-134`; validação em `BancosValidators.cs:46-62`.

## 3. Campos do contrato

| Campo | Tipo do backend | Origem | Destino declarado na estrutura de Boletos |
| --- | --- | --- | --- |
| `id` | GUID | todos os responses | exibido indiretamente e vínculo para detalhe/cancelamento/histórico |
| `contaReceberId` | GUID | `BoletoResponse` | exibido no detalhe técnico; vínculo de geração |
| `parcelaReceberId` | GUID | `BoletoResponse` | exibido no detalhe técnico; vínculo de geração |
| `carteiraCobrancaId` | GUID | `BoletoResponse`/request de geração | enviado; exibido como identificador técnico até existir consulta legível de carteiras |
| `nossoNumero` | `long` | `BoletoResponse` | exibido e pesquisável localmente |
| `numeroDocumento` | texto obrigatório no response, opcional no request | `BoletoResponse`/`GerarBoletoRequest` | exibido e pesquisável; enviado quando informado |
| `dataEmissao` | `DateTimeOffset` | `BoletoResponse` | exibido no detalhe |
| `dataVencimento` | `DateTimeOffset` | `BoletoResponse` | exibido na listagem e detalhe |
| `valorTitulo` | `decimal` | `BoletoResponse` | exibido na listagem e detalhe |
| `statusBoleto` | enum 1–4 | `BoletoResponse` | exibido, filtrado e usado apenas para apresentar ação; backend preserva a autoridade |
| `linhaDigitavel` | texto opcional | `BoletoResponse` | exibido no detalhe, sem edição |
| `codigoBarras` | texto opcional | `BoletoResponse` | exibido no detalhe, sem edição |
| `dataLiquidacao` | `DateTimeOffset?` | `BoletoResponse` | exibido no detalhe |
| `valorPago` | `decimal?` | `BoletoResponse` | exibido na listagem e detalhe |
| `alertas` | coleção de textos | `GerarBoletoResponse` | exibido após geração; nunca descartado |
| `statusAnterior`, `statusNovo`, `observacao`, `usuarioId`, `data` | enum, enum, texto, GUID?, data | `BoletoHistoricoResponse` | exibido no histórico |
| `empresaId`, `filialId`, `contaBancariaId`, `status` | GUID, GUID?, GUID?, enum? | query de listagem | enviado; `empresaId` selecionado antes de habilitar consulta |
| `motivo` | texto de 1 a 300 | request de cancelamento | enviado |

## 4. Estados atuais da tela

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Listagem | presente (`DataTableServer` em `BoletosPage.tsx:84`) | presente (`:98`) | presente para listagem (`ApiErrorPanel`, `:83`) | ausente | presente para cancelamento (toast, `:61-64`) | presente (`UnauthorizedState`, `:51-53`) | parcial: há aviso global sobre geração, mas nenhuma ação desabilitada nem motivo contextual (`:81`) |
| Detalhe/histórico | parcial: histórico usa `historicoLoading` | presente no DataTable do diálogo | parcial: falha do detalhe vira toast; falha do histórico não é mostrada no diálogo | ausente | não verificado | herdado da página | ausente |
| Geração | não acessível pela página atual | não se aplica | não se aplica | não se aplica | não alcançável | não verificável na composição atual | presente apenas como aviso geral; depende de consulta legível de carteira inexistente |

## Divergências

1. **Retorno de geração incompatível.** O frontend declara `POST /gerar` como `BoletoResponse` (`features/bancos/api/bancosApi.ts:70-72`), porém o backend retorna `GerarBoletoResponse(Boleto, Alertas)` (`BancosContracts.cs:41`). Consumir esse retorno como boleto produz campos `undefined` e perde os alertas bancários.
2. **Resposta de boleto incompleta/tipada incorretamente.** `BoletoResumoResponse` local declara `nossoNumero` como texto opcional e não contém `dataEmissao` nem `dataLiquidacao` (`features/bancos/types/bancos.types.ts:50-66`). O DTO real declara `NossoNumero: long`, `DataEmissao` e `DataLiquidacao` (`BancosContracts.cs:13-27`).
3. **Query de listagem incompatível.** O backend exige `EmpresaId` e aceita `ContaBancariaId` (`BancosContracts.cs:45-50`; `BancosConsultaUseCases.cs:40-45`). O frontend permite consultar sem empresa, omite a conta bancária e envia `termo` não pertencente ao contrato (`bancos.types.ts:95`; `bancosApi.ts:61-62`). A busca textual deve permanecer local; a consulta não pode iniciar sem empresa selecionada.
4. **Geração inacessível por falta de seleção de carteira.** O diálogo existe em `BancosOperacoesDialogs.tsx:30-96`, mas não é composto em `BoletosPage.tsx`; não há `GET` contratual de carteiras. O mapa de contrato registra explicitamente `BANCOS_CARTEIRAS_GET_AUSENTE` (`scripts/backend-contract-map.allowlist.json:21`). Não é seguro aceitar GUID livre para `carteiraCobrancaId`.
5. **Mapa de contrato confirmado, sem supressão nova.** As rotas não constam na seção de exceções do `scripts/backend-contract-map.allowlist.json`, mas o gate `npm run validate:backend-contract-map` confirmou as 484 rotas do frontend como compatíveis nesta base. Portanto, a estrutura de Boletos não deve criar uma entrada de supressão; ela deve apenas alinhar os tipos e payloads ao DTO real.
6. **Aviso bancário não pode ser perdido.** A geração emite alerta explícito de cálculo best-effort e necessidade de validação do banco (`GerarBoletoUseCase.cs:102-104`). A tela precisa exibi-lo após o sucesso e não afirmar homologação.

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "bancos-boletos",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/22-inventario-bancos-boletos.md",
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    {
      "tipo": "backend",
      "pergunta": "O backend disponibilizará GET de carteiras de cobrança com dados legíveis para permitir a geração sem GUID manual?",
      "decide": "se o botão Gerar boleto entra nesta fatia ou permanece indisponível com motivo"
    }
  ],
  "riscos": [
    "O contrato está compatível no gate, mas os tipos e o envelope de geração do frontend estão divergentes.",
    "A geração não pode ser liberada enquanto a carteira não puder ser selecionada por uma API real."
  ]
}
```
