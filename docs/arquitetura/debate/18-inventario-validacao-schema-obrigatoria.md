# Inventário — validação obrigatória de schema (AJ-19 / K7)

## Recorte

Detalhe de Nota Fiscal em `app/(main)/fiscal/notas/[id]/page.tsx`, delegado para
`features/fiscal/components/NotaFiscalDetalhePage.tsx`. Inclui apenas geração, assinatura,
transmissão e reprocessamento de NF-e/NFC-e. Eventos, inutilização e consultas ficam fora:
o contrato K7 preserva seus controles de validação.

## Telas e rota

| Rota | Página/componente | Permissão | Registro |
| --- | --- | --- | --- |
| `/fiscal/notas/[id]` | `app/(main)/fiscal/notas/[id]/page.tsx` → `NotaFiscalDetalhePage.tsx` | acesso por ao menos uma permissão Fiscal; ação de gerar: `FISCAL_GERENCIAR`; assinar/transmitir: `FISCAL_EMITIR`; reprocessar: `FISCAL_REPROCESSAR` | `lib/security/routePermissions.ts:49`; guards no detalhe |

## Endpoints e payloads

| Método + rota | Client/schema frontend | Campos AJ-19 | Fonte de contrato | Backend disponível |
| --- | --- | --- | --- | --- |
| `POST /api/fiscal/notas-fiscais/{id}/gerar-xml-envio` | `fiscalApi.gerarXmlEnvio` / `gerarXmlEnvioSchema` | `validarSchema` não deve ser exibido nem enviado; `armazenarXml`, `schemaSetName` permanecem | plano v1.24 AJ-19; K7 D4 | o código local ainda declara/lê `ValidarSchema` (`NotaFiscalRequests.cs:173-176`, `NotaFiscalXmlPipelineUseCases.cs:77`) |
| `POST /api/fiscal/notas-fiscais/{id}/assinar-xml-envio` | `fiscalApi.assinarXmlEnvio` / `assinarXmlEnvioSchema` | `validarSchemaAntesAssinatura` não deve ser exibido nem enviado; demais campos permanecem | plano v1.24 AJ-19; K7 D4 | o código local ainda declara/lê o bool (`NotaFiscalRequests.cs:178-183`, `NotaFiscalXmlPipelineUseCases.cs:175`) |
| `POST /api/fiscal/notas-fiscais/{id}/transmitir-sefaz` | `fiscalApi.transmitirSefaz` / `transmitirNotaFiscalSefazSchema` | `validarSchemaAntesTransmissao` não deve ser exibido nem enviado | plano v1.24 AJ-19; K7 D4 | o código local ainda declara/lê o bool (`NotaFiscalRequests.cs:185-191`, `FiscalSefazUseCases.cs:105`) |
| `POST /api/fiscal/notas-fiscais/{id}/reprocessar-sefaz` | `fiscalApi.reprocessarSefaz` / `reprocessarNotaFiscalSefazSchema` | mesmo bool não deve ser enviado: o use case delega ao transmissor | K7 D4; `FiscalSefazUseCases.cs:342-348` | o código local ainda repassa o bool |

## Campos e destino

| Campo | Tipo atual no frontend | Origem | Backend registrado | Destino |
| --- | --- | --- | --- | --- |
| `validarSchema` | `boolean` | `GerarXmlEnvioNotaFiscalRequest` | mantido como compatibilidade e ignorado para NF-e/NFC-e (K7 D4) | enviado — deve sair do payload |
| `validarSchemaAntesAssinatura` | `boolean` | `AssinarXmlNotaFiscalRequest` | mantido como compatibilidade e ignorado para NF-e/NFC-e (K7 D4) | enviado — deve sair do payload |
| `validarSchemaAntesTransmissao` | `boolean` | transmitir/reprocessar | mantido como compatibilidade e ignorado para NF-e/NFC-e (K7 D4) | enviado — deve sair do payload |
| `validarSchemaAntesConsulta` | `boolean` | consulta/status | eventos e consultas continuam com bool (K7 D4) | enviado — fora do recorte |

## Estados da tela

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Detalhe / pipeline XML | presente (mutations) | não aplicável | presente (`run`/toast) | presente (erro da API) | presente (toast/painel operacional) | presente (`PermissionGuard`) | presente (workflow + `fiscalActionDisabledReason`) |

## Divergências

1. **DVG-K7-01 — código backend local versus contrato K7.** O código de `../New project 3/src` ainda condiciona a validação aos bools, mas a fatia K7 D4 determina que eles sejam ignorados para NF-e/NFC-e. Para este recorte, a fonte de verdade é a implementação K7 registrada pelo backend; a UI não preservará controles que o contrato define como sem efeito.
2. **DVG-K7-02 — escopo de reprocessamento.** AJ-19 nomeia gerar, assinar e transmitir; o reprocessamento materializa `TransmitirNotaFiscalSefazRequest` com o mesmo bool (`FiscalSefazUseCases.cs:342-348`). O campo tem o mesmo destino sem efeito e entra no recorte para não manter escolha falsa no fluxo equivalente.
3. Eventos, inutilização, consulta de protocolo e status de serviço ficam fora. O K7 D4 preserva seus bools e o código backend local confirma esse uso em `FiscalEventosSefazUseCases.cs:68`, `:170`, `:276` e `FiscalSefazUseCases.cs:410`, `:758`.

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "validacao-schema-obrigatoria-k7",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/18-inventario-validacao-schema-obrigatoria.md",
  "decisoesPropostas": [],
  "discordancias": [
    { "de": "backend-local", "ponto": "bools ainda condicionam validação", "impacto": "alto" }
  ],
  "pendencias": [],
  "riscos": ["O checkout local do backend não contém a semântica K7; a implementação frontend depende do contrato K7 registrado."]
}
```
