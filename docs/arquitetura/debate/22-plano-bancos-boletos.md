# Plano `b78` — Bancos / Boletos

## Base e objetivo

Base: `package.json` declara `1.11.0a8b76`. Pela D107, a próxima fatia é a `b78`: corrigir o contrato e fechar consulta, detalhe, histórico e cancelamento em `/bancos/boletos`, sem habilitar geração enquanto a carteira não tiver seleção legível.

## Impacto

| Área | Mudança |
| --- | --- |
| Listagem | Consulta somente com `empresaId`; envia `empresaId`, `filialId` e `status`; busca por documento/nosso número permanece local. |
| Detalhe e histórico | Leitura do DTO completo e erro recuperável dentro do diálogo. |
| Cancelamento | `{ motivo }` limitado a 300 caracteres e invalidação de lista, detalhe e histórico. |
| Geração | Client passa a declarar `{ boleto, alertas }`; ação continua desabilitada por falta de consulta de carteiras. |
| Permissões | Preservar `BANCOS_CONSULTAR`, `BOLETOS_CANCELAR` e `BOLETOS_GERAR`, sem novos códigos. |

## Passos ordenados

1. `features/bancos/types/bancos.types.ts`: definir `BoletoResponse` fiel ao DTO, inclusive `nossoNumero`, emissão, vencimento, liquidação e identificação bancária; declarar `GerarBoletoResponse`; tornar `empresaId` obrigatório e remover `termo`.
2. `features/bancos/schemas/bancosSchemas.ts`: limitar `motivo` a 300 e incluir schemas de response da borda.
3. `features/bancos/api/bancosApi.ts`: validar response, corrigir o retorno de geração e enviar só parâmetros de query publicados.
4. `features/bancos/hooks/useBancosResources.ts`: query keys para lista/detalhe/histórico e invalidação nominal após cancelamento.
5. `features/bancos/components/BoletosPage.tsx`: não consultar sem empresa, usar hook de detalhe, exibir botão `Gerar boleto` desabilitado e atualizar dados após cancelamento.
6. `features/bancos/components/BancosOperacoesDialogs.tsx`: exibir o detalhe sem GUIDs operacionais e tratar loading, vazio e erro de histórico no diálogo.
7. `tests/unit/bancosContrato.test.ts` e `tests/components/BoletosPage.test.tsx`: o engenheiro de testes cobre contrato, empresa obrigatória, histórico com erro, cancelamento e geração indisponível.
8. `tests/e2e/v1.11.0a8b78-boletos.spec.ts`: E2E isolado de consulta, detalhe/histórico, cancelamento e indisponibilidade da geração.

## Contratos

```ts
type BoletosListQuery = { empresaId: Guid; filialId?: Guid | null; status?: StatusBoleto | null };
type GerarBoletoResponse = { boleto: BoletoResponse; alertas: string[] };
```

`BoletoResponse` terá `id`, vínculos internos, `nossoNumero: number`, `numeroDocumento`, `dataEmissao`, `dataVencimento`, `valorTitulo`, `statusBoleto`, `linhaDigitavel?`, `codigoBarras?`, `dataLiquidacao?` e `valorPago?`, exatamente como `BancosContracts.cs:13-27`.

## Estados e bloqueios

- Sem empresa: não chama API e orienta o operador.
- Loading/vazio/erro: preservam filtros; detalhe e histórico carregam e falham independentemente.
- Sucesso: toast curto e recarga após cancelamento.
- Permissão negada: `UnauthorizedState` para consulta; ações obedecem ao código individual.
- Ação indisponível: `Gerar boleto` visível, desabilitado e com motivo explícito até existir lookup de carteiras.

## Gates

```powershell
npx vitest run tests/unit/bancosContrato.test.ts tests/components/BoletosPage.test.tsx
npx playwright test tests/e2e/v1.11.0a8b78-boletos.spec.ts
npm run validate:backend-contract-map
npm run validate:source
npm run typecheck
npm run lint
npm run build
git diff --check
git diff --cached --check
```

O E2E será isolado com fixtures e não chama POST bancário em ambiente real.

## Escopo preservado e riscos

Não alterar backend, CNAB, cadastros bancários, rota, menu, permissões, regras de elegibilidade financeira, cálculo de saldo, impressão, conciliação ou Central de Cadastros. Não habilitar geração ou aceitar GUID manual.

Riscos: falta `GET` de carteiras legíveis; `nossoNumero` é `long` e precisa de borda que não perca precisão; linha digitável e código de barras são best-effort e não significam homologação bancária.

```json
{
  "status": "completed_with_warnings",
  "agent": "arquiteto-frontend",
  "slice": "b78",
  "node": "planner",
  "changedFiles": ["docs/arquitetura/debate/22-plano-bancos-boletos.md"],
  "gates": {"validate:backend-contract-map": "passed", "typecheck": "not_run", "lint": "not_run", "build": "not_run"},
  "blockers": [],
  "handoff": {"testsRequired": true, "e2eRequired": true, "qaReviewRequired": true, "notes": "Preservar D107: geração não pode ser habilitada."}
}
```
