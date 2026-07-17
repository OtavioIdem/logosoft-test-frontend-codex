# Logosoft Frontend — Especificação dos Módulos Novos

> **Objetivo:** guia completo para construir as telas do frontend (`logosoft-frontend`, Next.js) que
> ainda **não existem** e que cobrem os módulos entregues no backend nas Ondas 1–6 e no backlog `.1`.
>
> O frontend atual (`features/`) já cobre o **núcleo**: `administracao, atividades, auditoria, auth,
> clientes, compras (pedido), dashboard, estoque, financeiro, fiscal, fornecedores, pessoas, produtos,
> relatorios, seguranca, tabelas-preco, vendas`. Este documento especifica o que **falta**: Produção,
> Contábil, Patrimônio, CRM, Qualidade, Contratos, Serviços, PDV, Frota, Portaria, RH, Alimentar,
> Faturamento, Bancos, Compras avançado, Estoque avançado, Financeiro avançado, e os transversais de UI
> (Notificações, Anexos, Deploy, Relatórios gerenciais/dashboard/exportação).
>
> Documento-par do backend: `../New project 3/docs/00-VISAO-GERAL-ARQUITETURA-E-ROADMAP.md`.

---

# Parte 1 — Contexto, convenções e como construir uma tela

## 1.1 Stack

| Camada | Tecnologia |
|---|---|
| Framework | **Next.js 13.4.8** (App Router) |
| UI | **PrimeReact 10.2.1** + PrimeFlex + PrimeIcons |
| Estado de servidor | **@tanstack/react-query v5** |
| HTTP | **axios** (`lib/http/httpClient.ts`, com refresh de JWT) |
| Formulários | **react-hook-form** + **zod** (`@hookform/resolvers`) |
| Gráficos | **chart.js** |
| Linguagem | **TypeScript** |
| Testes | **vitest** (unit/component) + **@playwright/test** (e2e) |

## 1.2 Anatomia de uma feature (padrão obrigatório)

Cada módulo é uma pasta em `features/<modulo>/` com a estrutura:

```
features/<modulo>/
  api/<modulo>Api.ts          → wrappers axios (1 objeto por recurso) + builders de payload (zod)
  hooks/use<Modulo>Resources.ts → react-query: useQuery (listas) + useMutation (ações) + query keys
  schemas/<modulo>Schemas.ts    → zod schemas (validação + sanitização de payload)
  types/<modulo>.types.ts       → tipos TS (Request/Response espelhando os DTOs do backend)
  components/*.tsx              → páginas (PrimeReact DataTable) e diálogos (form)
  tests/                       → testes unit/component da feature
```

A rota é registrada em `app/(main)/<modulo>/page.tsx`, que apenas importa e renderiza o componente de
página da feature:

```tsx
import { <Modulo>Page } from '@/features/<modulo>/components/<Modulo>Page';
export default function Page() { return <<Modulo>Page />; }
```

### Padrão do `api/<modulo>Api.ts`
Espelhar `features/produtos/api/produtosApi.ts`:
- Importar `httpClient` de `@/lib/http/httpClient` e `mapApiError` de `@/lib/http/apiError`.
- `cleanQueryParams` / `sanitizePayload` de `@/lib/http/requestUtils`.
- Cada chamada envolvida em um `runRequest` que traduz erro via `mapApiError`.
- **Builders de payload**: `parseSchema(schema, values)` = `sanitizePayload(schema.parse(values))` —
  valida com zod **antes** de enviar.
- Exemplo de assinatura: `listar(query)`, `obter(id)`, `criar(values)`, `<acao>(id, values)`.

### Padrão do `hooks/use<Modulo>Resources.ts`
Espelhar `features/produtos/hooks/useProdutosResources.ts`:
- `export const <recurso>QueryKey = (query) => ['<recurso>', query] as const;`
- `useQuery({ queryKey, queryFn })` para listas/detalhe.
- `useMutation({ mutationFn, onSuccess: invalidate })` para ações; `invalidate` chama
  `queryClient.invalidateQueries({ queryKey: ['<recurso>'] })`.

## 1.3 Autenticação, sessão e refresh

- `httpClient` injeta `Authorization: Bearer <accessToken>` automaticamente e faz **refresh
  transparente** quando o access token expira (via `/api/auth/refresh`). Em 401 irreversível, limpa a
  sessão e redireciona para `/sessao-expirada`.
- **Não** implementar refresh manual nas features — o interceptor já cuida.
- Endpoints de auth já existem no frontend (`features/auth`). Não precisam ser refeitos.

## 1.4 Contexto Empresa/Filial (multiempresa) — **crítico**

Quase todos os endpoints do backend exigem `empresaId` (e opcional `filialId`):
- **Listas (GET):** enviados como **query params** — `?empresaId=...&filialId=...&termo=...`
  (ver `params()` em `produtosApi.ts`). Use `cleanQueryParams` para omitir nulos.
- **Criações (POST):** `empresaId`/`filialId` vão no **corpo** do payload.
- A empresa/filial ativa vem do contexto de sessão do usuário logado (mesma fonte que o núcleo já usa).
  **Reutilizar o mecanismo existente** (o núcleo já resolve `empresaId`/`filialId` correntes) — não criar
  um novo seletor por módulo.

## 1.5 Permissões (gating de UI)

- Utilitários em `lib/permissions/permissions.ts`: `hasPermission(user, 'PERMISSAO')`,
  `hasAnyPermission`, `hasAllPermissions`.
- **Regra:** ocultar/desabilitar botões de ação conforme a permissão do endpoint correspondente.
  Ex.: botão "Aprovar" só aparece com `COMPRAS_SOLICITACOES_APROVAR`.
- Toda tela de listagem exige a permissão `<MODULO>_CONSULTAR`; sem ela, a rota não deve ser acessível
  (gate na navegação/menu).
- Permissões são enviadas no JWT e ficam em `user.permissoes` (array de códigos `UPPER_SNAKE`).

## 1.6 Formulários (react-hook-form + zod)

- Cada form tem um schema zod em `schemas/`. O resolver liga o schema ao form
  (`useForm({ resolver: zodResolver(schema) })`).
- Campos monetários/decimais: PrimeReact `InputNumber` (mode currency/decimal). GUIDs de relacionamento:
  `Dropdown` alimentado por `useQuery` do recurso relacionado (ex.: produtos, clientes, contas contábeis).
- Datas: `Calendar`; enviar como ISO 8601 (`DateTimeOffset`).
- Enums: `Dropdown`/`SelectButton` com options mapeando o enum (ver §1.9).

## 1.7 Componentes de tela (PrimeReact)

- **Listagem:** `DataTable` com `paginator`, `globalFilter` (termo), colunas de status como `Tag`, e uma
  coluna de ações (`Button` ícones) — mesmo padrão de `ProdutosPage.tsx`.
- **Form:** `Dialog` com o formulário; botões Salvar/Cancelar; `Toast` de sucesso/erro.
- **Ações de transição de estado** (aprovar/reprovar/encerrar…): botão que abre `ConfirmDialog` ou um
  `Dialog` pequeno pedindo o campo necessário (ex.: motivo, evidência) e dispara a mutation.
- **Motivo/observação obrigatórios:** várias ações do backend exigem `motivo`/`justificativa` — sempre um
  `Dialog` com `InputTextarea` obrigatório.

## 1.8 Erros e feedback

- `mapApiError(error)` normaliza a resposta do backend (`{ code, message }`) para uma mensagem exibível.
- Sucesso/erro via `Toast` (evento `logosoft:toast` já existe, ou `useAppToast`).
- Erros de validação de negócio chegam como HTTP 400 com `message`; erros de concorrência/único como 409.

## 1.9 Enums — convenção de serialização

- Enums do domínio são **numéricos** (a maioria inicia em `1`) e trafegam como **número** no JSON. Os
  tipos TS aceitam `Enum | number`. Manter no frontend um mapa `valor → rótulo` por enum.
- Exemplos confirmados: `TipoMovimentoEstoque` (Entrada=1, Saida=2, …), `OrigemInspecao`
  (RecebimentoCompra=1, OrdemProducao=2, Devolucao=3, Avulsa=4), `StatusInspecao` (Aberta=1, Aprovada=2,
  Reprovada=3, Encerrada=4). Para os demais, mapear na ordem declarada (ver cada módulo).

## 1.10 Testes (gates do frontend)

O `package.json` já define os gates. Para cada módulo novo, entregar no mínimo:
- **Unit (`vitest`)**: builders de payload (schema zod) e mapeamento de tipos — `tests/unit`.
- **Component (`@testing-library/react`)**: render da página, gating por permissão, submit de form
  mockando o `api` — `tests/components`.
- **E2E (`playwright`)** para os fluxos críticos (ex.: venda PDV, recebimento, faturamento) — `tests/e2e`.
- Rodar `npm run validate` (typecheck + lint + test). Seguir os validadores de contrato já existentes
  (`scripts/validate-backend-contract-map.mjs` etc.) ao adicionar endpoints.

## 1.11 Checklist para adicionar um módulo

1. Criar `features/<modulo>/{api,hooks,schemas,types,components,tests}`.
2. Escrever `types` espelhando os DTOs (§ do módulo). 3. Escrever `schemas` zod. 4. Escrever `api`.
5. Escrever `hooks` react-query. 6. Construir `components` (lista + dialogs). 7. Registrar rota em
`app/(main)/<modulo>/page.tsx` e no menu (`layout/`). 8. Gating por permissão. 9. Testes. 10. `npm run validate`.

---

# Parte 2 — Especificação por módulo

> Convenções das tabelas de endpoint: caminho relativo a `baseURL` (`appConfig.apiUrl`). `{id}` = GUID.
> "Perm." = permissão exigida. Payloads listam os campos do `Request` do backend (camelCase no JSON).

---

## 2.1 Compras — Solicitação, Cotação e Recebimento/Conferência (a43)

**Objetivo:** completar o fluxo de compras: **solicitação → cotação → aprovação (gera pedido) →
recebimento → divergência → conferência fiscal de entrada**. O pedido de compra já tem tela; falta o
resto do funil.

**Telas & rotas:**
- `app/(main)/compras/solicitacoes` — lista + form + itens + aprovar/cancelar.
- `app/(main)/compras/cotacoes` — lista + form + itens + aprovar (gera pedido)/recusar/cancelar.
- `app/(main)/compras/recebimentos` — detalhe do recebimento, lista de divergências, conferência fiscal.

**Fluxo:** Solicitação (Rascunho→Aprovada) → Cotação vinculada a solicitação (aprovar gera Pedido de
Compra) → Recebimento (na tela de pedido já existente) → Divergências geradas automaticamente →
Conferência fiscal da nota de entrada.

**Endpoints:**

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET | `/api/compras/solicitacoes` | COMPRAS_SOLICITACOES_CONSULTAR | query empresa/filial |
| GET | `/api/compras/solicitacoes/{id}` | COMPRAS_SOLICITACOES_CONSULTAR | — |
| POST | `/api/compras/solicitacoes` | COMPRAS_SOLICITACOES_GERENCIAR | `CriarSolicitacaoCompraRequest` |
| POST | `/api/compras/solicitacoes/{id}/itens` | COMPRAS_SOLICITACOES_GERENCIAR | item (produto, qtd) |
| POST | `/api/compras/solicitacoes/{id}/aprovar` | COMPRAS_SOLICITACOES_APROVAR | — |
| POST | `/api/compras/solicitacoes/{id}/cancelar` | COMPRAS_SOLICITACOES_GERENCIAR | `{ motivo }` |
| GET | `/api/compras/cotacoes` | COMPRAS_COTACOES_CONSULTAR | — |
| GET | `/api/compras/cotacoes/{id}` | COMPRAS_COTACOES_CONSULTAR | — |
| POST | `/api/compras/cotacoes` | COMPRAS_COTACOES_GERENCIAR | `CriarCotacaoCompraRequest` |
| POST | `/api/compras/cotacoes/{id}/itens` | COMPRAS_COTACOES_GERENCIAR | item (produto, qtd, valor) |
| POST | `/api/compras/cotacoes/{id}/aprovar` | COMPRAS_COTACOES_APROVAR | — (gera pedido) |
| POST | `/api/compras/cotacoes/{id}/recusar` | COMPRAS_COTACOES_GERENCIAR | `{ motivo }` |
| POST | `/api/compras/cotacoes/{id}/cancelar` | COMPRAS_COTACOES_GERENCIAR | `{ motivo }` |
| GET | `/api/compras/recebimentos/{id}` | COMPRAS_CONSULTAR | — |
| GET | `/api/compras/recebimentos/divergencias` | COMPRAS_CONSULTAR | query |
| POST | `/api/compras/recebimentos/{id}/conferencia-fiscal` | COMPRAS_CONFERENCIA_FISCAL_REGISTRAR | dados da NF de entrada |

**Payloads-chave:**
```ts
CriarSolicitacaoCompraRequest = { empresaId, filialId?, numero, dataSolicitacao, solicitante, justificativa? }
CriarCotacaoCompraRequest = { empresaId, filialId?, numero, fornecedorId, dataCotacao, validade?, solicitacaoCompraId?, observacao? }
```
**Critérios de aceite:** aprovar cotação cria o pedido de compra (mostrar link para o pedido gerado);
divergências de recebimento aparecem destacadas; ações respeitam as permissões específicas.

---

## 2.2 Estoque avançado — Inventário operacional, Ajustes e Bloqueios (base + reuso)

**Objetivo:** operações avançadas de estoque além do CRUD já existente.

**Telas & rotas:** `app/(main)/estoque/avancado` com abas: Inventários operacionais, Ajustes, Bloqueios.

**Fluxo:** Inventário operacional (abrir → adicionar itens → iniciar contagem → concluir/cancelar);
Ajuste pontual de saldo (entrada/saída com motivo); Bloqueio operacional (bloquear saldo → liberar/cancelar).

| Verbo | Caminho | Perm. |
|---|---|---|
| POST/GET | `/api/estoque/avancado/inventarios` | EstoqueInventarioGerenciar / EstoqueConsultar |
| GET | `/api/estoque/avancado/inventarios/{id}` | EstoqueConsultar |
| POST | `/api/estoque/avancado/inventarios/{id}/itens` | EstoqueInventarioGerenciar |
| POST | `/api/estoque/avancado/inventarios/{id}/iniciar-contagem` | EstoqueInventarioGerenciar |
| POST | `/api/estoque/avancado/inventarios/{id}/concluir` \| `/cancelar` | EstoqueInventarioGerenciar |
| POST | `/api/estoque/avancado/ajustes` | EstoqueAjustar |
| POST | `/api/estoque/avancado/bloqueios` | EstoqueBloqueioGerenciar |
| POST | `/api/estoque/avancado/bloqueios/{id}/liberar` \| `/cancelar` | EstoqueBloqueioGerenciar |

**Nota:** bloqueios de estoque também são criados automaticamente por Qualidade (reprovação) e Alimentar
(recall); esta tela é o ponto de **liberação** desses bloqueios (exige permissão + motivo).

---

## 2.3 Financeiro avançado — Baixa, Estorno, Cancelamento, Fluxo de caixa

**Objetivo:** operações avançadas sobre contas a pagar/receber (o núcleo já lista contas).

**Telas & rotas:** `app/(main)/financeiro/avancado` — contas a pagar/receber com ações de baixa,
estorno, cancelamento; painel de **fluxo de caixa**.

| Verbo | Caminho | Perm. |
|---|---|---|
| GET/POST | `/api/financeiro/avancado/contas-receber` | FinanceiroConsultar / FinanceiroGerenciar |
| GET/POST | `/api/financeiro/avancado/contas-pagar` | FinanceiroConsultar / FinanceiroGerenciar |
| GET | `/api/financeiro/avancado/contas/{id}` | FinanceiroConsultar |
| POST | `/api/financeiro/avancado/contas-receber/{id}/baixar` | FinanceiroReceber |
| POST | `/api/financeiro/avancado/contas-pagar/{id}/baixar` | FinanceiroPagar |
| POST | `/api/financeiro/avancado/contas-{receber\|pagar}/{id}/estornar` | FinanceiroEstornar |
| POST | `/api/financeiro/avancado/contas-{receber\|pagar}/{id}/cancelar` | FinanceiroCancelar |
| GET | `/api/financeiro/avancado/fluxo-caixa` | FinanceiroFluxoCaixaConsultar |

**Nota:** baixa e estorno disparam contabilização/estorno contábil **automáticos no backend** (best-effort);
a UI não precisa acionar contabilidade — apenas informar o resultado da baixa.

---

## 2.4 Faturamento (a41)

**Objetivo:** orquestrar `pedido de venda → nota fiscal → SEFAZ → estoque → conta a receber`.

**Telas & rotas:** `app/(main)/faturamento` — lista de faturamentos; wizard **Preparar → Confirmar**;
detalhe com histórico e ocorrências.

**Fluxo:** a partir de um Pedido de Venda, **Preparar** (cria o faturamento; avisa se já existia) →
**Confirmar** (informa dados fiscais: UF, tipo de documento, série, número, natureza, CFOP; transmite) →
acompanha histórico/ocorrências → **Cancelar** se necessário.

| Verbo | Caminho | Perm. |
|---|---|---|
| GET | `/api/faturamento` | FaturamentoConsultar |
| GET | `/api/faturamento/{id}` \| `/historico` \| `/ocorrencias` | FaturamentoConsultar |
| POST | `/api/faturamento/preparar` | FaturamentoPreparar |
| POST | `/api/faturamento/{id}/confirmar` | FaturamentoConfirmar |
| POST | `/api/faturamento/{id}/cancelar` | FaturamentoCancelar |

**Payloads-chave:**
```ts
PrepararFaturamentoRequest = { pedidoVendaId, observacao? }
ConfirmarFaturamentoRequest = { ufAutorizadora, tipoDocumento, serie, numero, naturezaOperacaoId?,
                                cfopPadrao?, unidadeComercialPadrao, validarDadosFiscaisProduto, ... }
CancelarFaturamentoRequest = { motivo, ... }
```
**Critérios de aceite:** exibir `Alertas` retornados por Preparar/Confirmar; o wizard não deve permitir
confirmar sem os dados fiscais obrigatórios; refletir status via histórico.

---

## 2.5 Bancos, Boletos e CNAB (a42)

**Objetivo:** cadastro bancário, emissão de boletos e troca CNAB (remessa/retorno).

**Telas & rotas:** `app/(main)/bancos` — cadastros (banco → conta → convênio → carteira); `.../boletos`
— gerar/cancelar/listar boletos; `.../cnab` — gerar remessa e importar retorno (**upload de arquivo**).

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| POST | `/api/bancos` | BancosGerenciar | `CriarBancoRequest` |
| POST | `/api/bancos/contas-bancarias` | BancosGerenciar | `CriarContaBancariaRequest` |
| POST | `/api/bancos/convenios` | BancosGerenciar | `CriarConvenioBancarioRequest` |
| POST | `/api/bancos/carteiras` | BancosGerenciar | `CriarCarteiraCobrancaRequest` |
| GET | `/api/bancos/boletos` `/{id}` `/{id}/historico` | BancosConsultar | — |
| POST | `/api/bancos/boletos/gerar` | BoletosGerar | `GerarBoletoRequest` |
| POST | `/api/bancos/boletos/{id}/cancelar` | BoletosCancelar | `{ motivo }` |
| POST | `/api/bancos/cnab/remessas` | CnabRemessaGerar | `{ carteiraCobrancaId }` |
| POST | `/api/bancos/cnab/retornos/importar` | CnabRetornoProcessar | `ImportarRetornoCnabRequest` |
| GET | `/api/bancos/cnab/retornos/{id}` | BancosConsultar | — |

**Payloads-chave:**
```ts
CriarContaBancariaRequest = { empresaId, filialId?, bancoId, agencia, agenciaDv?, conta, contaDv? }
CriarCarteiraCobrancaRequest = { convenioBancarioId, codigo, tipoCobranca }
GerarBoletoRequest = { contaReceberId, parcelaReceberId, carteiraCobrancaId, numeroDocumento? }
ImportarRetornoCnabRequest = { contaBancariaId, nomeArquivo, conteudo /* byte[]: enviar base64 */ }
```
**UI:** `GerarBoletoResponse`/remessa retornam `Alertas` — exibir. Retorno CNAB é **upload** (ler o
arquivo, enviar `conteudo` em base64). Boleto tem linha digitável/código de barras para exibir/imprimir.
**Aviso técnico:** layout CNAB/linha digitável é best-effort — sinalizar "validar contra banco real".

---

## 2.6 Produção — Ficha Técnica e Ordem de Produção (a44)

**Objetivo:** ficha técnica (BOM) + ciclo da ordem de produção com MRP simples.

**Telas & rotas:** `app/(main)/producao/fichas-tecnicas` (lista + componentes + ativar/inativar);
`app/(main)/producao/ordens` (lista + criar + **necessidade de componentes** + liberar/apontar/encerrar/cancelar).

**Fluxo OP:** Criar (Rascunho) → **Liberar** (reserva componentes, valida saldo) → **Apontamentos**
(consumo/horas/perdas/produzido) → **Encerrar** (baixa reservas, dá entrada do acabado, consolida custo)
→ ou **Cancelar**. Consultar **necessidade** antes de liberar.

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/producao/fichas-tecnicas` | ProducaoConsultar / ProducaoFichaTecnicaGerenciar | `CriarFichaTecnicaRequest` |
| POST | `/api/producao/fichas-tecnicas/{id}/componentes` | ProducaoFichaTecnicaGerenciar | `AdicionarComponenteFichaTecnicaRequest` |
| POST | `/api/producao/fichas-tecnicas/{id}/ativar` \| `/inativar` | ProducaoFichaTecnicaGerenciar | — |
| GET/POST | `/api/producao/ordens` | ProducaoConsultar / ProducaoOrdensGerenciar | `CriarOrdemProducaoRequest` |
| GET | `/api/producao/ordens/{id}/necessidade` | ProducaoConsultar | — |
| POST | `/api/producao/ordens/{id}/liberar` | ProducaoOrdensLiberar | — |
| POST | `/api/producao/ordens/{id}/apontamentos` | ProducaoOrdensApontar | `RegistrarApontamentoOrdemProducaoRequest` |
| POST | `/api/producao/ordens/{id}/encerrar` | ProducaoOrdensEncerrar | `{ observacao? }` |
| POST | `/api/producao/ordens/{id}/cancelar` | ProducaoOrdensCancelar | `{ motivo }` |

**Payloads-chave:**
```ts
CriarFichaTecnicaRequest = { empresaId, filialId?, codigo, produtoId, descricao, quantidadeBase, versao? }
CriarOrdemProducaoRequest = { empresaId, filialId?, numero, produtoId, quantidadePlanejada, dataPlanejada, localEstoqueId?, observacao? }
RegistrarApontamentoOrdemProducaoRequest = { /* tipo(consumo/horas/perda/produzido), produtoId?, quantidade, ... */ }
```
**Critérios de aceite:** liberar sem saldo deve mostrar erro; a tela de necessidade mostra faltantes;
custo consolidado exibido no encerramento.

---

## 2.7 Contábil (a45)

**Objetivo:** plano de contas, períodos, lançamentos de partidas dobradas, regras de contabilização.

**Telas & rotas:** `app/(main)/contabil/plano-contas`, `.../periodos`, `.../lancamentos`, `.../regras`.

**Fluxo:** manter plano de contas (analítica/sintética, natureza) → abrir período → lançamentos manuais
(partidas com Σdébito=Σcrédito) → estornar → fechar período (valida balancete). Regras automatizam
contabilização de baixas financeiras.

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/contabil/plano-contas` | ContabilConsultar / ContabilPlanoContasGerenciar | `CriarContaContabilRequest` |
| POST | `/api/contabil/plano-contas/{id}/inativar` | ContabilPlanoContasGerenciar | — |
| GET/POST | `/api/contabil/periodos` | ContabilConsultar / ContabilPeriodosGerenciar | `AbrirPeriodoContabilRequest` |
| POST | `/api/contabil/periodos/{id}/fechar` \| `/reabrir` | ContabilPeriodosGerenciar | `{ observacao? }` |
| GET/POST | `/api/contabil/lancamentos` | ContabilConsultar / ContabilLancamentosGerenciar | `CriarLancamentoManualRequest` |
| POST | `/api/contabil/lancamentos/{id}/estornar` | ContabilLancamentosEstornar | `{ motivo }` |
| GET/POST | `/api/contabil/regras` | ContabilConsultar / ContabilRegrasGerenciar | `CriarRegraContabilizacaoRequest` |
| POST | `/api/contabil/regras/{id}/inativar` | ContabilRegrasGerenciar | — |

**Payloads-chave:**
```ts
CriarContaContabilRequest = { empresaId, filialId?, codigo, nome, tipo, natureza, analitica, contaPaiId? }
AbrirPeriodoContabilRequest = { empresaId, filialId?, ano, mes }
PartidaContabilRequest = { contaContabilId, tipo /* Debito/Credito */, valor, centroCustoId?, historico? }
CriarLancamentoManualRequest = { empresaId, filialId?, data, historico, partidas: PartidaContabilRequest[] }
CriarRegraContabilizacaoRequest = { empresaId, filialId?, descricao, tipoEvento, origemFinanceira?, contaDebitoId, contaCreditoId }
```
**UI crítica:** editor de lançamento deve **validar em tempo real** Σdébito=Σcrédito antes de habilitar
salvar; só permitir lançar em conta **analítica** e período **aberto**.

---

## 2.8 Patrimônio (a46)

**Objetivo:** ativo imobilizado, depreciação e inventário patrimonial.

**Telas & rotas:** `app/(main)/patrimonio/bens` (cadastro, transferir, bloquear, baixar);
`.../depreciacao` (processar competência); `.../inventarios` (abrir, contagem, encerrar).

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/patrimonio/bens` | PatrimonioConsultar / PatrimonioBensGerenciar | `CadastrarBemRequest` |
| PUT | `/api/patrimonio/bens/{id}` | PatrimonioBensGerenciar | `AtualizarBemRequest` |
| POST | `/api/patrimonio/bens/{id}/transferir` | PatrimonioTransferir | `TransferirBemRequest` |
| POST | `/api/patrimonio/bens/{id}/bloquear` \| `/desbloquear` | PatrimonioBensGerenciar | `{ motivo }` |
| POST | `/api/patrimonio/bens/{id}/baixar` | PatrimonioBaixar | `BaixarBemRequest` |
| POST | `/api/patrimonio/depreciacao/processar` | PatrimonioDepreciar | `ProcessarDepreciacaoPeriodoRequest` |
| GET/POST | `/api/patrimonio/inventarios` | PatrimonioConsultar / PatrimonioInventarioGerenciar | `AbrirInventarioRequest` |
| POST | `/api/patrimonio/inventarios/{id}/contagem` | PatrimonioInventarioGerenciar | `RegistrarContagemRequest` |
| POST | `/api/patrimonio/inventarios/{id}/encerrar` | PatrimonioInventarioGerenciar | — |

**Payloads-chave:**
```ts
CadastrarBemRequest = { empresaId, filialId?, codigo, descricao, categoria, dataAquisicao, valorAquisicao, valorResidual, /* vidaUtilMeses, contas contábeis, setor, responsável... */ }
TransferirBemRequest = { setorNovoId?, responsavelNovoId?, data?, observacao? }
BaixarBemRequest = { data?, motivo, justificativa, valorBaixa? }
ProcessarDepreciacaoPeriodoRequest = { empresaId, filialId?, ano, mes }
AbrirInventarioRequest = { empresaId, filialId?, descricao, dataReferencia?, bemIds? }
RegistrarContagemRequest = { itemId, localizado, setorEncontradoId?, observacao? }
```
**Critérios de aceite:** processar depreciação é **batch por competência** (ano/mês) e idempotente —
mostrar quantos bens foram depreciados; inventário apura divergências no encerramento.

---

## 2.9 CRM (a47)

**Objetivo:** funil comercial `lead → oportunidade → proposta → pedido`.

**Telas & rotas:** `app/(main)/crm/leads`, `.../oportunidades` (kanban por estágio), `.../propostas`.

**Fluxo:** Lead (criar/qualificar → gera oportunidade / descartar) → Oportunidade (mover estágio,
ganhar/perder) → Proposta com itens (aceitar/recusar) → **Converter** oportunidade ganha em Pedido de Venda.

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/crm/leads` | CrmConsultar / CrmLeadsGerenciar | `CriarLeadRequest` |
| PUT | `/api/crm/leads/{id}` | CrmLeadsGerenciar | `AtualizarLeadRequest` |
| POST | `/api/crm/leads/{id}/qualificar` | CrmLeadsGerenciar | `QualificarLeadRequest` |
| POST | `/api/crm/leads/{id}/descartar` | CrmLeadsGerenciar | `{ motivo }` |
| GET | `/api/crm/oportunidades` `/{id}` | CrmConsultar | — |
| PUT | `/api/crm/oportunidades/{id}` | CrmOportunidadesGerenciar | `AtualizarOportunidadeRequest` |
| POST | `/api/crm/oportunidades/{id}/estagio` | CrmOportunidadesGerenciar | `{ estagio }` |
| POST | `/api/crm/oportunidades/{id}/ganhar` | CrmOportunidadesGerenciar | `{ propostaVencedoraId? }` |
| POST | `/api/crm/oportunidades/{id}/perder` | CrmOportunidadesGerenciar | `{ motivo, justificativa }` |
| POST | `/api/crm/oportunidades/{id}/converter` | CrmConverter | `ConverterOportunidadeRequest` |
| GET/POST | `/api/crm/propostas` | CrmConsultar / CrmPropostasGerenciar | `CriarPropostaRequest` |
| POST | `/api/crm/propostas/{id}/aceitar` \| `/recusar` | CrmPropostasGerenciar | — / `{ motivo }` |

**Payloads-chave:**
```ts
CriarLeadRequest = { empresaId, filialId?, nome, empresa?, email?, telefone?, origem, responsavelId?, ... }
QualificarLeadRequest = { clienteId, titulo, valorEstimado, responsavelId?, dataPrevisaoFechamento? }
PerderOportunidadeRequest = { motivo /* enum */, justificativa }
ConverterOportunidadeRequest = { numeroPedido, tipo, dataEmissao?, dataPrevisaoEntrega?, observacao? }
CriarPropostaRequest = { oportunidadeId, dataValidade?, observacao?, itens: { produtoId, quantidade, valorUnitario, valorDesconto, observacao? }[] }
```
**Enums:** `OrigemLead`, `EstagioOportunidade` (Qualificacao/Proposta/Negociacao), `MotivoPerdaOportunidade`.
**Critérios de aceite:** converter retorna `{ pedidoVendaId, numeroPedido, valorTotal }` — exibir link;
ganhar exige proposta vencedora com itens.

---

## 2.10 Qualidade (a48 + a48.1)

**Objetivo:** inspeção de qualidade e não-conformidade, com bloqueio de estoque na reprovação crítica.

**Telas & rotas:** `app/(main)/qualidade/inspecoes` (lista, criar, critérios, resultados,
aprovar/reprovar, encerrar); `.../nao-conformidades` (ações corretivas, encerrar).

**Fluxo:** Inspeção (Aberta) → adicionar **critérios** → registrar **resultados** → **Aprovar** (todos
conformes) ou **Reprovar** (≥1 não conforme → gera não-conformidade; crítica bloqueia estoque) →
**Encerrar** com evidência. Não-conformidade → ações corretivas (adicionar/iniciar/concluir/cancelar) → encerrar.

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/qualidade/inspecoes` | QualidadeConsultar / QualidadeInspecionar | `CriarInspecaoRequest` |
| POST | `/api/qualidade/inspecoes/{id}/criterios` | QualidadeInspecionar | `AdicionarCriterioRequest` |
| POST | `/api/qualidade/inspecoes/{id}/resultados` | QualidadeInspecionar | `RegistrarResultadoCriterioRequest` |
| POST | `/api/qualidade/inspecoes/{id}/aprovar` | QualidadeInspecionar | — |
| POST | `/api/qualidade/inspecoes/{id}/reprovar` | QualidadeInspecionar | `{ descricao }` |
| POST | `/api/qualidade/inspecoes/{id}/encerrar` | QualidadeInspecionar | `{ evidencia }` |
| GET | `/api/qualidade/nao-conformidades` `/{id}` | QualidadeConsultar | — |
| POST | `/api/qualidade/nao-conformidades/{id}/acoes` | QualidadeNaoConformidadeGerenciar | `AdicionarAcaoCorretivaRequest` |
| POST | `.../acoes/{acaoId}/iniciar` \| `/concluir` \| `/cancelar` | QualidadeNaoConformidadeGerenciar | — / `{ motivo }` |
| POST | `/api/qualidade/nao-conformidades/{id}/encerrar` | QualidadeNaoConformidadeGerenciar | — |

**Payloads-chave:**
```ts
CriarInspecaoRequest = { empresaId, filialId?, origem /* 1=RecebimentoCompra 2=OrdemProducao 3=Devolucao 4=Avulsa */,
  origemId?, produtoId, quantidade, localEstoqueId?, responsavelId?, dataInspecao?, observacao?, criterios?: { descricao, critico, valorEsperado? }[] }
AdicionarCriterioRequest = { descricao, critico, valorEsperado? }
RegistrarResultadoCriterioRequest = { criterioId, conforme, valorMedido?, observacao? }
AdicionarAcaoCorretivaRequest = { descricao, responsavelId?, prazo? }
```
**Enums:** `StatusInspecao` (Aberta=1, Aprovada=2, Reprovada=3, Encerrada=4); `ResultadoCriterio`
(Pendente=1, Conforme=2, NaoConforme=3); `StatusNaoConformidade`; `StatusAcaoCorretiva`.

**⚠️ Integração com a tela de Produtos (a48.1):** o `Produto` ganhou o campo **`controlaQualidade`**
(boolean). **Adicionar** ao formulário de produto (`features/produtos`) um checkbox "Controla
qualidade": incluir `controlaQualidade` em `CriarProdutoRequest`/`AtualizarProdutoRequest`,
`ProdutoResponse`, schema zod e no form. Quando `true`, o **recebimento de compra gera inspeção
automática** — exibir essa informação como dica no cadastro e, na tela de inspeções, o filtro por
`origem=RecebimentoCompra` mostra as inspeções geradas automaticamente (status Aberta, sem critérios).

---

## 2.11 Contratos (a49)

**Objetivo:** contratos com faturamento recorrente (valor fixo) ou por consumo (franquia + excedente).

**Telas & rotas:** `app/(main)/contratos` — lista, form, aprovar, reajustar, renovar, encerrar,
cancelar, **gerar faturamento** por competência.

**Fluxo:** Criar (Rascunho) → Aprovar → vigência → Gerar faturamento (mensal, gera `ContaReceber`) →
Reajustar/Renovar → Encerrar/Cancelar.

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/contratos` | ContratosConsultar / ContratosGerenciar | `CriarContratoRequest` |
| PUT | `/api/contratos/{id}` | ContratosGerenciar | `AtualizarContratoRequest` |
| POST | `/api/contratos/{id}/aprovar` | ContratosGerenciar | — |
| POST | `/api/contratos/{id}/reajustar` | ContratosGerenciar | `{ percentual }` |
| POST | `/api/contratos/{id}/renovar` | ContratosGerenciar | `{ novaDataFim }` |
| POST | `/api/contratos/{id}/encerrar` \| `/cancelar` | ContratosGerenciar | `{ motivo }` |
| POST | `/api/contratos/{id}/faturamentos` | ContratosFaturar | `GerarFaturamentoContratoRequest` |

**Payloads-chave:**
```ts
CriarContratoRequest = { empresaId, filialId?, numero, clienteId, descricao, tipoFaturamento, periodicidade, dataInicio, /* dataFim, valores, diaVencimento, franquia/excedente, responsavelId... */ }
GerarFaturamentoContratoRequest = { ano, mes, consumoRegistrado? }
```
**Enums:** `TipoFaturamentoContrato` (recorrente/consumo), `PeriodicidadeContrato`.
**Critérios de aceite:** faturamento por consumo pede `consumoRegistrado`; gerar faturamento retorna a
conta a receber criada (link); duplicidade por competência é bloqueada no backend — tratar o erro.

---

## 2.12 Serviços — Ordem de Serviço (a50)

**Objetivo:** OS Aberta → Triagem → Planejada → Execução → Encerrada (laudo) → Faturada.

**Telas & rotas:** `app/(main)/servicos/ordens` — lista, form, triar, planejar, **itens** (mão de
obra/material/serviço externo), encerrar, faturar, cancelar.

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/servicos/ordens` | ServicosConsultar / ServicosGerenciar | `CriarOrdemServicoRequest` |
| POST | `/api/servicos/ordens/{id}/triar` | ServicosGerenciar | `{ diagnostico, tecnicoResponsavelId? }` |
| POST | `/api/servicos/ordens/{id}/planejar` | ServicosGerenciar | `{ planoExecucao }` |
| POST | `/api/servicos/ordens/{id}/itens` | ServicosGerenciar | `AdicionarItemOrdemServicoRequest` |
| POST | `/api/servicos/ordens/{id}/encerrar` | ServicosGerenciar | `{ laudoTecnico }` |
| POST | `/api/servicos/ordens/{id}/faturar` | ServicosFaturar | `FaturarOrdemServicoRequest` |
| POST | `/api/servicos/ordens/{id}/cancelar` | ServicosGerenciar | `{ motivo }` |

**Payloads-chave:**
```ts
CriarOrdemServicoRequest = { empresaId, filialId?, numero, clienteId, descricao, prioridade, tecnicoResponsavelId?, localEstoqueId?, ... }
AdicionarItemOrdemServicoRequest = { tipo /* MaoDeObra/Material/ServicoExterno */, descricao, produtoId?, quantidade, valorUnitario }
FaturarOrdemServicoRequest = { numeroDocumento?, dataVencimento?, observacao? }
```
**Regras de UI:** item do tipo Material só em execução (dá baixa de estoque; saldo insuficiente falha —
tratar erro); faturar exige OS encerrada com valor > 0; laudo obrigatório para encerrar.

---

## 2.13 PDV — Caixa e Venda (a51)

**Objetivo:** operação de caixa e venda à vista com baixa de estoque atômica.

**Telas & rotas:** `app/(main)/pdv/caixas` (abrir, suprimento, sangria, fechar com conferência);
`app/(main)/pdv/vendas` (**tela de venda**: itens + pagamentos + troco).

**Fluxo:** Abrir caixa → registrar vendas (valida caixa aberto, baixa estoque, registra recebimentos por
meio de pagamento, calcula troco) → sangrias/suprimentos → Fechar (conferência esperado × informado).

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET | `/api/pdv/caixas` `/{id}` | PdvConsultar | — |
| POST | `/api/pdv/caixas/abrir` | PdvCaixaGerenciar | `AbrirCaixaRequest` |
| POST | `/api/pdv/caixas/{id}/suprimento` \| `/sangria` | PdvCaixaGerenciar | `MovimentoCaixaRequest` |
| POST | `/api/pdv/caixas/{id}/fechar` | PdvCaixaGerenciar | `{ valorInformado }` |
| GET | `/api/pdv/vendas` `/{id}` | PdvConsultar | — |
| POST | `/api/pdv/vendas` | PdvVender | `RegistrarVendaPdvRequest` |

**Payloads-chave:**
```ts
AbrirCaixaRequest = { empresaId, filialId?, codigo, terminal, valorAbertura }
MovimentoCaixaRequest = { valor, descricao }
RegistrarVendaPdvRequest = { caixaId, localEstoqueId, clienteId?,
  itens: { produtoId, quantidade, valorUnitario, valorDesconto }[],
  pagamentos: { formaPagamentoId, meio /* MeioPagamento: Dinheiro afeta gaveta */, valor }[] }
```
**Enums:** `MeioPagamento` (Dinheiro/Cartão/Pix/…), `TipoMovimentoCaixa`.
**Critérios de aceite:** venda exige caixa aberto; total pago ≥ líquido (senão erro); exibir troco;
fechamento mostra esperado (abertura + suprimentos − sangrias + recebimentos dinheiro) × informado × diferença.
**E2E obrigatório:** fluxo completo de venda.

---

## 2.14 Frota (a52 + a52.1)

**Objetivo:** veículos, motoristas, viagens, abastecimento, manutenção, despesa, documentos — com
odômetro consistente.

**Telas & rotas:** `app/(main)/frota/veiculos` (+ abas abastecimentos/manutenções/despesas/documentos),
`.../motoristas`, `.../viagens`.

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/frota/veiculos` | FrotaConsultar / FrotaGerenciar | `CriarVeiculoRequest` |
| PUT | `/api/frota/veiculos/{id}` | FrotaGerenciar | `AtualizarVeiculoRequest` |
| POST | `/api/frota/veiculos/{id}/status` | FrotaGerenciar | `{ status }` |
| GET/POST | `/api/frota/veiculos/abastecimentos` | FrotaConsultar / FrotaGerenciar | `RegistrarAbastecimentoRequest` |
| GET/POST | `/api/frota/veiculos/manutencoes` | FrotaConsultar / FrotaGerenciar | `RegistrarManutencaoRequest` |
| POST | `/api/frota/veiculos/manutencoes/{id}/concluir` \| `/cancelar` | FrotaGerenciar | — / `{ motivo }` |
| GET/POST | `/api/frota/veiculos/despesas` | FrotaConsultar / FrotaGerenciar | `RegistrarDespesaVeiculoRequest` |
| GET/POST | `/api/frota/veiculos/documentos` | FrotaConsultar / FrotaGerenciar | `RegistrarDocumentoVeiculoRequest` |
| GET/POST | `/api/frota/motoristas` | FrotaConsultar / FrotaGerenciar | `CriarMotoristaRequest` |
| GET/POST | `/api/frota/viagens` | FrotaConsultar / FrotaGerenciar | `IniciarViagemRequest` |
| POST | `/api/frota/viagens/{id}/encerrar` \| `/cancelar` | FrotaGerenciar | `EncerrarViagemRequest` / `{ motivo }` |

**Payloads-chave:** ver §2 (sweep) — `CriarVeiculoRequest { placa, modelo, marca?, ano?, tipo,
combustivel, odometroInicial, renavam? }`, `RegistrarAbastecimentoRequest { veiculoId, motoristaId?,
data?, odometro, litros, valorLitro, combustivel, tanqueCheio, posto? }`, `IniciarViagemRequest
{ veiculoId, motoristaId, origem, destino, dataSaida?, odometroSaida }`.
**Enums:** `TipoVeiculo`, `TipoCombustivel`, `StatusVeiculo`, `TipoManutencao`, `StatusManutencao`,
`TipoDespesaVeiculo`, `TipoDocumentoVeiculo`, `StatusViagem`.
**Regra de UI:** odômetro informado não pode ser menor que o atual (abastecimento/encerrar viagem) —
tratar erro. Manutenção/despesa com `fornecedorId` + valor geram Conta a Pagar. `cnhVencida`/`vencido`
vêm no response — exibir alerta visual.

---

## 2.15 Portaria (a53)

**Objetivo:** controle de acesso: pré-autorização, registro de acesso, ocorrências.

**Telas & rotas:** `app/(main)/portaria` — abas Pré-autorizações, Registros (entrada/validação/saída),
Ocorrências.

**Fluxo:** Pré-autorização (janela de validade) → Registro de entrada (com ou sem pré-autorização) →
**Validar documento** (aprova → permanência; recusa → acesso negado) → Saída (calcula permanência) →
Ocorrências (crítica gera notificação).

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/portaria/pre-autorizacoes` | PortariaConsultar / PortariaPreAutorizar | `CriarPreAutorizacaoRequest` |
| POST | `/api/portaria/pre-autorizacoes/{id}/cancelar` | PortariaPreAutorizar | `{ motivo }` |
| GET | `/api/portaria/registros` `/{id}` | PortariaConsultar | — |
| POST | `/api/portaria/registros/entrada` | PortariaOperar | `RegistrarEntradaRequest` |
| POST | `/api/portaria/registros/{id}/validar-documento` | PortariaOperar | `ValidarDocumentoRequest` |
| POST | `/api/portaria/registros/{id}/saida` | PortariaOperar | `{ dataSaida?, observacao? }` |
| POST | `/api/portaria/registros/{id}/cancelar` | PortariaOperar | `{ motivo }` |
| GET/POST | `/api/portaria/ocorrencias` | PortariaConsultar / PortariaOperar | `RegistrarOcorrenciaAcessoRequest` |
| POST | `/api/portaria/ocorrencias/{id}/resolver` | PortariaOperar | `{ resolucao }` |

**Payloads-chave:** ver sweep — `RegistrarEntradaRequest { empresaId, filialId?, preAutorizacaoId?,
nomeVisitante, documentoTipo, documentoNumero, tipoAcesso, destino, motivo?, placaVeiculo?, dataEntrada? }`;
`ValidarDocumentoRequest { aprovado, validadoPor?, observacao? }`.
**Enums:** `TipoDocumentoAcesso`, `TipoAcesso`, `StatusPreAutorizacao`, `StatusRegistroAcesso`,
`TipoOcorrenciaAcesso`, `GravidadeOcorrencia`, `StatusOcorrenciaAcesso`.

---

## 2.16 RH — folha preparatória (a54)

**Objetivo:** colaborador, jornada, ponto, férias/afastamento, benefícios, eventos de folha
(sem cálculo legal).

**Telas & rotas:** `app/(main)/rh/colaboradores`, `.../jornadas`, `.../ponto`, `.../ausencias`
(férias + afastamentos), `.../beneficios`, `.../eventos`.

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET/POST | `/api/rh/colaboradores` | RhConsultar / RhGerenciar | `AdmitirColaboradorRequest` |
| PUT | `/api/rh/colaboradores/{id}` | RhGerenciar | `AtualizarColaboradorRequest` |
| POST | `/api/rh/colaboradores/{id}/desligar` | RhGerenciar | `{ dataDemissao, motivo }` |
| GET/POST | `/api/rh/jornadas` (+PUT `/{id}`) | RhConsultar / RhGerenciar | `CriarJornadaRequest` |
| GET/POST | `/api/rh/ponto` | RhConsultar / RhPontoRegistrar | `RegistrarPontoRequest` |
| GET/POST | `/api/rh/ausencias/ferias` | RhConsultar / RhGerenciar | `SolicitarFeriasRequest` |
| POST | `/api/rh/ausencias/ferias/{id}/{aprovar\|rejeitar\|iniciar\|concluir\|cancelar}` | RhGerenciar | — / `{ motivo }` |
| GET/POST | `/api/rh/ausencias/afastamentos` | RhConsultar / RhGerenciar | `RegistrarAfastamentoRequest` |
| POST | `/api/rh/ausencias/afastamentos/{id}/encerrar` | RhGerenciar | `{ dataFimReal? }` |
| GET/POST | `/api/rh/beneficios` (+PUT `/{id}`) | RhConsultar / RhGerenciar | `CriarBeneficioRequest` |
| GET/POST | `/api/rh/beneficios/concessoes` | RhConsultar / RhGerenciar | `ConcederBeneficioRequest` |
| POST | `/api/rh/beneficios/concessoes/{id}/encerrar` | RhGerenciar | `{ dataFim? }` |
| GET/POST | `/api/rh/eventos` | RhConsultar / RhEventosGerenciar | `RegistrarEventoRhRequest` |

**Payloads-chave:** ver sweep — `AdmitirColaboradorRequest { empresaId, filialId?, matricula, nome, cpf,
cargoId, setorId?, pessoaId?, jornadaId?, regime, salarioBase, dataAdmissao, dataNascimento?, email?,
telefone? }`; `RegistrarEventoRhRequest { …, competencia /* aaaamm */, tipo, codigo, descricao, valor,
referencia?, origem }`.
**Enums:** `RegimeTrabalho`, `StatusColaborador`, `TipoMarcacaoPonto`, `OrigemPonto`, `StatusFerias`,
`TipoAfastamento`, `StatusAfastamento`, `TipoBeneficio`, `StatusColaboradorBeneficio`, `TipoEventoRh`,
`OrigemEventoRh`. **Reusa** `Cargo` e `Setor` de Administração (usar dropdowns já existentes).
**Regra:** status do colaborador muda com férias/afastamento (refletir na listagem).

---

## 2.17 Alimentar — Lote e Recall (a55 + a55.1)

**Objetivo:** rastreabilidade por lote/validade e recall com bloqueio de estoque.

**Telas & rotas:** `app/(main)/alimentar/lotes` (lista, criar, **a vencer**, bloquear/desbloquear,
movimentações), `.../recalls` (abrir, adicionar lotes, encerrar/cancelar).

| Verbo | Caminho | Perm. | Payload |
|---|---|---|---|
| GET | `/api/alimentar/lotes` `/a-vencer?dias=` `/{id}` | AlimentarConsultar | — |
| POST | `/api/alimentar/lotes` | AlimentarLotesGerenciar | `CriarLoteRequest` |
| POST | `/api/alimentar/lotes/{id}/bloquear` \| `/desbloquear` | AlimentarLotesGerenciar | `{ motivo }` / — |
| GET | `/api/alimentar/lotes/{id}/movimentacoes` | AlimentarConsultar | — |
| POST | `/api/alimentar/lotes/movimentacoes` | AlimentarLotesGerenciar | `RegistrarMovimentacaoLoteRequest` |
| GET/POST | `/api/alimentar/recalls` | AlimentarConsultar / AlimentarRecallGerenciar | `AbrirRecallRequest` |
| GET | `/api/alimentar/recalls/{id}/lotes` | AlimentarConsultar | — |
| POST | `/api/alimentar/recalls/{id}/lotes` | AlimentarRecallGerenciar | `{ loteId }` |
| POST | `/api/alimentar/recalls/{id}/encerrar` \| `/cancelar` | AlimentarRecallGerenciar | — / `{ motivo }` |

**Payloads-chave:** ver sweep — `CriarLoteRequest { empresaId, filialId?, produtoId, numeroLote, origem,
dataFabricacao?, dataValidade, quantidadeInicial, fornecedorId?, localEstoqueId?, documentoOrigem? }`.
**Enums:** `LoteOrigem`, `StatusLote` (Ativo/Bloqueado/Esgotado), `TipoMovimentacaoLote`, `GravidadeRecall`,
`StatusRecall`. **UI:** destacar lotes vencidos (`vencido`) e "a vencer"; adicionar lote ao recall bloqueia
o saldo.

---

## 2.18 Transversais de UI

### 2.18.1 Notificações (sino no cabeçalho)
Componente global no `layout/` (sino + badge de não-lidas + dropdown), presente em todas as telas.

| Verbo | Caminho | Perm. |
|---|---|---|
| GET | `/api/notificacoes` | NotificacoesConsultar |
| GET | `/api/notificacoes/nao-lidas/contagem` | NotificacoesConsultar |
| POST | `/api/notificacoes/{id}/marcar-lida` \| `/marcar-todas-lidas` \| `/{id}/arquivar` | NotificacoesConsultar |

Polling leve (react-query `refetchInterval`) da contagem de não-lidas. Notificações têm severidade,
título, mensagem e link de destino (`link`) — clicar navega para a entidade de origem.

### 2.18.2 Anexos (widget reutilizável)
Componente `shared/AnexosPanel` para acoplar em qualquer tela (recebe `modulo`, `entidade`, `entidadeId`).

| Verbo | Caminho | Perm. |
|---|---|---|
| GET | `/api/anexos?modulo=&entidade=&entidadeId=` | AnexosConsultar |
| POST | `/api/anexos` (**multipart**: arquivo + vínculo) | AnexosGerenciar |
| GET | `/api/anexos/{id}/download` | AnexosBaixar |
| POST | `/api/anexos/{id}/inativar` | AnexosGerenciar |

Upload **multipart** (`IFormFile` + `moduloOrigem`, `entidadeVinculada`, `entidadeVinculadaId`).
Validação: tipo permitido + tamanho (≤ 25MB) — validar no cliente antes de enviar. Download via link
dedicado. Não exibir caminho físico. Dedup por hash é automática no backend.

### 2.18.3 Relatórios gerenciais / Dashboard / Exportação (a57)
Estender `features/relatorios`. `app/(main)/dashboard` já existe — enriquecer com o dashboard consolidado.

| Verbo | Caminho | Perm. |
|---|---|---|
| GET | `/api/relatorios/gerenciais/{vendas\|compras\|financeiro\|estoque\|fiscal\|producao}` | Relatorios<Area>Consultar |
| GET | `/api/relatorios/gerenciais/dashboard` | RelatoriosDashboardConsultar |
| GET | `/api/relatorios/gerenciais/exportar?formato=csv\|xlsx\|pdf&...` | RelatoriosExportar |

Filtros por empresa/filial/período. Gráficos com `chart.js`. Exportação: `GET` que retorna arquivo
(CSV/XLSX/PDF) — tratar como download (blob). Dashboard consolida os 6 indicadores numa tela.

### 2.18.4 Deploy / Ambiente (tela administrativa)
`app/(main)/administracao/deploy` (ou área devops) — somente perfis com `DEPLOY_*`.

| Verbo | Caminho | Perm. |
|---|---|---|
| GET | `/api/deploy/ambiente` `/migracoes` | DeployConsultar |
| GET | `/api/deploy` `/{id}` `/{id}/checklist` | DeployConsultar |
| POST | `/api/deploy` `/{id}/concluir` `/{id}/falhar` `/{id}/reverter` | DeployGerenciar |
| POST | `/api/deploy/checklist` `/checklist/{id}/resultado` | DeployGerenciar |

Painel de status do ambiente (runtime + migrations pendentes/consistência + versão atual), registro de
deploys com checklist e rollback documentado.

---

# Parte 3 — Priorização sugerida de implementação

1. **Comercial/operacional de alto uso:** PDV, Faturamento, Compras avançado, Estoque avançado, Financeiro avançado.
2. **Verticais com valor imediato:** Serviços (OS), Frota, Portaria, Alimentar, RH.
3. **Gestão/estratégico:** CRM, Contratos, Qualidade (+ campo `controlaQualidade` no Produto), Produção.
4. **Contábil/fiscal:** Contábil, Bancos/Boletos/CNAB, Patrimônio.
5. **Transversais de UI (fazer cedo, pois aparecem em todas as telas):** Notificações (sino),
   Anexos (widget), Relatórios/Dashboard, Deploy (admin).

> Recomenda-se implementar **Notificações** e **Anexos** cedo (são transversais) e usar **um módulo
> piloto** (ex.: PDV ou Serviços) para validar o scaffold completo (api/hooks/schemas/types/components/tests)
> antes de escalar para os demais.

---

# Parte 4 — Regras gerais de aceite (todos os módulos)

- [ ] Rota registrada em `app/(main)/<modulo>` e no menu, com gate por `<MODULO>_CONSULTAR`.
- [ ] Botões de ação escondidos/desabilitados sem a permissão do endpoint correspondente.
- [ ] `empresaId`/`filialId` corretos em query (listas) e corpo (criações), vindos do contexto de sessão.
- [ ] Payloads validados por zod antes do envio; erros do backend exibidos via toast (`mapApiError`).
- [ ] Estados/enums exibidos como `Tag` com rótulo legível (mapa `valor→rótulo`).
- [ ] Ações que exigem motivo/evidência/justificativa abrem diálogo com campo obrigatório.
- [ ] Listas grandes: paginação (backend limita ~500; alinhar com paginação server-side quando existir).
- [ ] Testes: unit (schemas/builders) + component (render/gating/submit) + e2e nos fluxos críticos.
- [ ] `npm run validate` verde.

> **Fonte da verdade dos contratos:** os DTOs do backend em `../New project 3/src/Erp.Application/<Modulo>/**`
> e os controllers em `../New project 3/src/Erp.Api/Controllers/<Modulo>/**`. Em caso de divergência de
> payload, o backend prevalece — ajustar os `types`/`schemas` do frontend.
