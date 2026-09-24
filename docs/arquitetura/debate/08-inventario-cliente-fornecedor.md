# Inventário — Rodada 08 · Cliente/Fornecedor comercial

Branch `codex/v1.11.0a8b65-produtos-fiscais`. Agente: inventariante-contrato-tela.
Recorte: os itens que a D58 tirou de `b65` por falta deste inventário —
`PUT /api/clientes/{id}/configuracao-comercial` e, de Fornecedor, configuração de compra,
homologação e revogação de homologação — mais tudo diretamente acoplado (catálogos
referenciados, permissões, dependência com o pedido de venda / `b67`).

**Fontes usadas, na ordem da hierarquia:** código C# em `../New project 3/src` (nível 2 —
autoritativo aqui, mesma ressalva da rodada 07: o Swagger deste backend já errou
anulabilidade e não foi consultado); `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` (nível 3,
conferido linha a linha contra o C# — nenhuma divergência encontrada entre os dois para o
recorte deste documento); código do frontend em `features/clientes/`, `features/fornecedores/`,
`features/vendas/` (só para responder a pergunta de dependência com `b67`), `types/erp.ts`,
`features/seguranca/permissoesCatalogo.ts`, `lib/security/routePermissions.ts`,
`layout/AppMenu.tsx` (nível 4).

**Banco:** `docker exec logosoft-postgres psql -U erp_user -d erp -c "SELECT COUNT(*) FROM
\"__EFMigrationsHistory\";"` → `0`. Container `logosoft-postgres` está de pé, mas sem nenhuma
migração aplicada — mesmo estado da rodada 07. O banco não serviu de fonte; toda afirmação sobre
o backend vem do C#, conferido também ao nível de `EntityFrameworkConfiguration` (mapeamento
objeto-relacional), não de dado real.

---

## 1. Endpoints do recorte — todos os de Cliente e de Fornecedor

Confirmado em `../New project 3/src/Erp.Api/Controllers/Pessoas/ClientesController.cs` e
`FornecedoresController.cs` (arquivos completos lidos), e conferido campo a campo contra
`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1702-1729` — as duas fontes batem 1:1, sem divergência.

### `api/clientes` (`ClientesController.cs`)

| Rota | Verbo | Permissão (C#) | Request | Já consumido pelo frontend? |
| --- | --- | --- | --- | --- |
| `/api/clientes` | `GET` (`:23`) | `ClientesConsultar` | query `empresaId, filialId?, termo?` | Sim — `clientesApi.listar` (`features/clientes/api/clientesApi.ts:24-29`) |
| `/api/clientes` | `POST` (`:31`) | `ClientesGerenciar` | `CriarClienteRequest` | Sim — `clientesApi.criar` (`:30-36`) |
| `/api/clientes/{id}` | `PUT` (`:44`) | `ClientesGerenciar` | `AtualizarClienteRequest` | Sim — `clientesApi.atualizar` (`:37-43`) |
| `/api/clientes/{id}/bloquear-credito` | `POST` (`:57`) | `ClientesGerenciar` | `AlterarBloqueioCreditoRequest` | Sim — `clientesApi.bloquearCredito` (`:44-49`) |
| **`/api/clientes/{id}/configuracao-comercial`** | **`PUT`** (`:70`) | `ClientesGerenciar` | `ConfigurarComercialClienteRequest` | **Não** — nenhuma ocorrência em `features/clientes/`; zero linhas de resultado em `grep -rn "configuracao-comercial" features/` |
| `/api/clientes/{id}/desbloquear-credito` | `POST` (`:83`) | `ClientesGerenciar` | `AlterarBloqueioCreditoRequest` | Sim — `clientesApi.desbloquearCredito` (`:50-55`) |
| `/api/clientes/{id}/inativar` | `POST` (`:96`) | `ClientesGerenciar` | `InativarPessoaRequest` | Sim — `clientesApi.inativar` (`:56-61`) |

### `api/fornecedores` (`FornecedoresController.cs`)

| Rota | Verbo | Permissão (C#) | Request | Já consumido pelo frontend? |
| --- | --- | --- | --- | --- |
| `/api/fornecedores` | `GET` (`:26`) | `FornecedoresConsultar` | query `empresaId, filialId?, termo?` | Sim — `fornecedoresApi.listar` (`features/fornecedores/api/fornecedoresApi.ts:24-29`) |
| `/api/fornecedores` | `POST` (`:34`) | `FornecedoresGerenciar` | `CriarFornecedorRequest` | Sim — `fornecedoresApi.criar` (`:30-36`) |
| `/api/fornecedores/{id}` | `PUT` (`:47`) | `FornecedoresGerenciar` | `AtualizarFornecedorRequest` | Sim — `fornecedoresApi.atualizar` (`:37-43`) |
| **`/api/fornecedores/{id}/configuracao-compra`** | **`PUT`** (`:60`) | `FornecedoresGerenciar` | `ConfigurarCompraFornecedorRequest` | **Não** |
| **`/api/fornecedores/{id}/homologar`** | **`POST`**, sem body (`:73`) | `FornecedoresGerenciar` | — | **Não** |
| **`/api/fornecedores/{id}/revogar-homologacao`** | **`POST`** (`:86`) | `FornecedoresGerenciar` | `RevogarHomologacaoFornecedorRequest` | **Não** |
| **`/api/fornecedores/{id}/situacao-compra`** | **`GET`** (`:99`) | `FornecedoresConsultar` | — (retorna `SituacaoCompraFornecedor`) | **Não** |
| `/api/fornecedores/{id}/inativar` | `POST` (`:112`) | `FornecedoresGerenciar` | `InativarPessoaRequest` | Sim — `fornecedoresApi.inativar` (`:44-49`) |

Confirmado por `grep -rn "configuracao-comercial\|configuracao-compra\|homologar\|revogar-homologacao\|situacao-compra" features/clientes features/fornecedores` → zero ocorrências nos dois módulos. Os cinco endpoints do recorte existem no backend e não têm nenhum consumidor no frontend hoje — não há "o que já existe" para reaproveitar além do padrão de tela (Seção 4).

### Records C# — assinatura completa

`ClienteRequests.cs:1-20` e `FornecedorRequests.cs:1-17` (arquivos completos lidos):

```csharp
public sealed record ConfigurarComercialClienteRequest(
    Guid? TabelaPrecoPadraoId,
    Guid? CondicaoPagamentoPadraoId,
    Guid? ClassificacaoId,
    int? DiaVencimentoPreferencial,
    bool PermiteVendaAPrazo);

public sealed record ConfigurarCompraFornecedorRequest(
    Guid? CondicaoPagamentoPadraoId,
    int? PrazoEntregaMedio,
    string? CategoriaFornecimento);

public sealed record RevogarHomologacaoFornecedorRequest(string Motivo);
// Homologar não tem request — POST sem corpo.
```

Todos os cinco campos de `ConfigurarComercialClienteRequest` são anuláveis; nenhum obrigatório
por si. `RevogarHomologacaoFornecedorRequest.Motivo` é `string` não-anulável, validado
`NotEmpty().MaximumLength(500)` (`FornecedorValidators.cs:37`).

### Responses — o que o backend já devolve hoje, mesmo sem endpoint de escrita consumido

`ClienteResponse.cs:5-20` e `FornecedorResponse.cs:5-16` (arquivos completos):

```csharp
public sealed record ClienteResponse(
    Guid Id, Guid EmpresaId, Guid? FilialId, Guid PessoaId, string Codigo,
    decimal LimiteCredito, bool CreditoBloqueado, string? MotivoBloqueioCredito, string? Observacao,
    Guid? TabelaPrecoPadraoId, Guid? CondicaoPagamentoPadraoId, Guid? ClassificacaoId,
    int? DiaVencimentoPreferencial, bool PermiteVendaAPrazo, EntityStatus Status);

public sealed record FornecedorResponse(
    Guid Id, Guid EmpresaId, Guid? FilialId, Guid PessoaId, string Codigo, string? Observacao,
    Guid? CondicaoPagamentoPadraoId, int? PrazoEntregaMedio, bool Homologado,
    string? CategoriaFornecimento, EntityStatus Status);

public sealed record SituacaoCompraFornecedor(
    Guid FornecedorId, bool Ativo, bool Homologado, bool PodeReceberPedidoCompra, string? Motivo);
```

`PessoaMapper.ParaResponse` (`../New project 3/src/Erp.Application/Pessoas/PessoaMapper.cs:36-40`)
mapeia todos os campos do agregado 1:1 para a response — não há campo do domínio que fique de
fora da resposta HTTP. `ClienteConfiguration.cs:18-22` e `FornecedorConfiguration.cs:16-19`
(EF Core) confirmam que os cinco/quatro campos comerciais são colunas mapeadas de verdade
(`TabelaPrecoPadraoId`, `CondicaoPagamentoPadraoId`, `ClassificacaoId`,
`DiaVencimentoPreferencial`, `PermiteVendaAPrazo` para Cliente;
`CondicaoPagamentoPadraoId`, `PrazoEntregaMedio`, `Homologado`, `CategoriaFornecimento` para
Fornecedor) — não é campo de request órfão sem coluna.

---

## 2. Semântica de gravação — sem a trava que a `b65` encontrou

Os dois use cases foram lidos por completo:
`../New project 3/src/Erp.Application/Pessoas/Clientes/ConfigurarComercialCliente/ConfigurarComercialClienteUseCase.cs`
e `.../Fornecedores/ConfigurarCompraFornecedor/ConfigurarCompraFornecedorUseCase.cs`.

**É substituição atômica do bloco (mesmo padrão do `AtualizarDadosFiscaisProdutoRequest` da
`b65`), mas sem a trava "campo obrigatório assim que qualquer outro vem preenchido" que bloqueava
a gravação de Produto.**

`Cliente.ConfigurarComercial` (`../New project 3/src/Erp.Domain/Pessoas/Cliente.cs:46-63`):

```csharp
public void ConfigurarComercial(Guid? tabelaPrecoPadraoId, Guid? condicaoPagamentoPadraoId,
    Guid? classificacaoId, int? diaVencimentoPreferencial, bool permiteVendaAPrazo)
{
    if (!IsActive) throw new DomainException("Cliente inativo não pode ser alterado.");
    if (diaVencimentoPreferencial is not null && (diaVencimentoPreferencial < 1 || diaVencimentoPreferencial > 31))
        throw new DomainException("Dia de vencimento preferencial deve estar entre 1 e 31.");

    TabelaPrecoPadraoId = tabelaPrecoPadraoId;
    CondicaoPagamentoPadraoId = condicaoPagamentoPadraoId;
    ClassificacaoId = classificacaoId;
    DiaVencimentoPreferencial = diaVencimentoPreferencial;
    PermiteVendaAPrazo = permiteVendaAPrazo;
}
```

Todos os cinco campos são sobrescritos incondicionalmente a cada chamada — **não há `?? valorAtual`
em nenhum deles**: `null` em `tabelaPrecoPadraoId`/`condicaoPagamentoPadraoId`/`classificacaoId`
apaga o vínculo atual (não "mantém"); `permiteVendaAPrazo` não é anulável, então todo PUT decide
o valor booleano — não existe "campo ausente" para ele, é sempre enviado. `Fornecedor.ConfigurarCompra`
(`Fornecedor.cs:40-55`) é idêntico em estrutura para seus três campos.

**Diferença central em relação ao achado da `b65`:** não há nenhuma regra do tipo "se qualquer
campo do bloco vier preenchido, outro campo passa a ser obrigatório". As únicas validações são
independentes campo a campo — `diaVencimentoPreferencial` entre 1 e 31 quando informado
(duplicada no domínio `Cliente.cs:53-56` **e** no
`ConfigurarComercialClienteRequestValidator` — `ClienteValidators.cs:34-40`);
`prazoEntregaMedio >= 0` quando informado (`Fornecedor.cs:47-50` e
`ConfigurarCompraFornecedorRequestValidator` — `FornecedorValidators.cs:24-31`). Enviar o
request inteiro em branco (todos `null`, `permiteVendaAPrazo = false`) é uma chamada válida — não
existe `EstaEmBranco()` nem caminho de recusa equivalente ao `TipoItemSpedObrigatorio` da `b65`.
**Não há round-trip quebrado a corrigir neste recorte**: como hoje nenhuma tela chama estes dois
endpoints, não existe nenhum caminho de UI que dispare uma chamada e receba 400 — ao contrário do
Produto, aqui a lacuna é "capacidade ausente", não "gravação que falha silenciosamente".

**Pré-condição comum às duas ações, e às quatro de Fornecedor:** `IsActive` — `Cliente`/`Fornecedor`
inativo não pode ter a configuração comercial/de compra alterada, nem ser homologado, nem ter a
homologação revogada (`Cliente.cs:48-51`, `Fornecedor.cs:42-45,59-62,74-77`). O padrão de UI já
existe: `ClientesPage.tsx:114` desabilita `editar`/`bloquear`/`desbloquear`/`inativar` quando
`!isActive(row)` — uma tela nova de configuração comercial/compra/homologação replicaria o mesmo
guard, não é achado, é conferência de que o precedente está disponível.

---

## 3. Regras de negócio que a UI precisa refletir

### 3.1 `ConfigurarComercialClienteRequest` — três referências por catálogo, uma por valor livre, uma booleana

Confirmado em `ConfigurarComercialClienteUseCase.cs:53-78` (bloco de validação de referência,
completo):

| Campo | Tipo de referência | Endpoint de catálogo | Permissão do catálogo | Validação cruzada |
| --- | --- | --- | --- | --- |
| `tabelaPrecoPadraoId` | Id por catálogo | `GET /api/tabelas-preco` (`TabelasPrecoController.cs:22-23`) | `TABELAS_PRECO_CONSULTAR` | `:55-59` — rejeita se a tabela não existir **ou** se `tabela.EmpresaId != cliente.EmpresaId` (`"Tabela de preço padrão inválida para a empresa do cliente."`) |
| `condicaoPagamentoPadraoId` (Cliente) | Id por catálogo | `GET /api/financeiro/condicoes-pagamento` (`CondicoesPagamentoController.cs:19-20`) | `FINANCEIRO_CONSULTAR` | `:62-68` — mesma regra: inexistente ou de outra empresa → `"Condição de pagamento padrão inválida para a empresa do cliente."` |
| `classificacaoId` | Id por catálogo | `GET /api/pessoas/classificacoes` (`ClassificacoesPessoaController.cs:22-23`) | `PESSOAS_CONSULTAR` | `:71-77` — inexistente para a empresa → `"Classificação inválida para a empresa do cliente."` |
| `diaVencimentoPreferencial` | valor livre | — | — | 1–31, dobrada (domínio + validator, ver §2) |
| `permiteVendaAPrazo` | valor livre (booleano) | — | — | nenhuma |

### 3.2 `ConfigurarCompraFornecedorRequest` — uma referência por catálogo, duas por valor livre

`ConfigurarCompraFornecedorUseCase.cs:49-56`:

| Campo | Tipo de referência | Endpoint de catálogo | Permissão do catálogo | Validação cruzada |
| --- | --- | --- | --- | --- |
| `condicaoPagamentoPadraoId` (Fornecedor) | Id por catálogo | `GET /api/financeiro/condicoes-pagamento` (mesmo catálogo do Cliente) | `FINANCEIRO_CONSULTAR` | inexistente ou de outra empresa → `"Condição de pagamento padrão inválida para a empresa do fornecedor."` |
| `prazoEntregaMedio` | valor livre | — | — | `>= 0` quando informado |
| `categoriaFornecimento` | valor livre | — | — | máx. 80 caracteres (`FornecedorValidators.cs:29`) |

### 3.3 Homologação — pré-condição de estado, sem motivo; revogação — com motivo obrigatório

`Fornecedor.Homologar()` (`Fornecedor.cs:57-70`) e `.RevogarHomologacao()` (`:72-85`):

- **Homologar**: recusa (`DomainException` → HTTP 400 via `PessoaErrors.Validacao`) se o fornecedor
  **já** está homologado (`"Fornecedor já está homologado."`). Sem motivo — `POST` sem corpo
  (`FornecedoresController.cs:73-84`).
- **Revogar homologação**: recusa se o fornecedor **não** está homologado
  (`"Fornecedor não está homologado."`). Exige `Motivo` não vazio, máx. 500
  (`RevogarHomologacaoFornecedorRequestValidator`, `FornecedorValidators.cs:33-39`) — mesmo
  formato de `ClienteMotivoRequest`/`FornecedorMotivoRequest` já usado hoje para bloqueio de
  crédito e inativação (`ReasonDialog` já é o componente reutilizado nessas duas telas,
  `ClientesPage.tsx:119`, `FornecedoresPage.tsx:108`).
- As duas ações são **mutuamente excludentes** por estado — a UI precisa saber o `homologado`
  atual do registro para decidir qual botão habilitar, no mesmo padrão que
  `bloquear`/`desbloquear` crédito já resolve hoje (`ClientesPage.tsx:114`,
  disabled em função de `row.creditoBloqueado`).

### 3.4 `GET .../situacao-compra` — endpoint de leitura derivada, com parâmetro de sistema

`FornecedoresCompraConsultaService.ObterSituacaoCompraAsync`
(`../New project 3/src/Erp.Application/Pessoas/FornecedoresCompraConsultaService.cs:19-57`,
arquivo completo):

- Se o fornecedor está inativo: `podeReceberPedidoCompra = false`, `motivo = "Fornecedor inativo."`
- Senão, resolve o parâmetro booleano `COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO`
  (`CatalogoParametros.cs:23,31`, default `"false"`) por empresa/filial via `IParametroResolver`.
  Se o fornecedor **não** está homologado **e** o parâmetro bloqueia: `podeReceberPedidoCompra =
  false`, `motivo = "Fornecedor não homologado e bloqueio por parâmetro ativo."`
- Caso contrário: `podeReceberPedidoCompra = true`, `motivo = null`.
- **Não encontrei em `features/` nenhum consumidor deste parâmetro nem tela que edite
  `COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO`** — `grep -rn "ComprasBloqueiaFornecedorNaoHomologado\|COMPRAS_BLOQUEIA_FORNECEDOR"
  features/` não retornou nada. Se a UI decidir mostrar "por que este fornecedor não pode receber
  pedido de compra", o dado depende de um parâmetro de sistema que hoje não tem tela — registrado
  como risco, não como bloqueio deste recorte (o endpoint funciona sozinho, só o "porquê"
  operacional do parâmetro fica invisível).

---

## 4. Onde isso moraria na tela hoje

| Arquivo | Papel hoje | Cobre o recorte? |
| --- | --- | --- |
| `features/clientes/components/ClienteFormDialog.tsx` | Diálogo único (sem abas) — cria/edita `empresaId/filialId/pessoaId/codigo` (só na criação) + `limiteCredito` + `observacao`. Início em `buildInitialValues` (`:20-23`) | Não toca nenhum campo comercial; não há estrutura de aba para acomodar cinco campos novos sem redesenho (diferente da `b65`, onde a aba fiscal já existia e só faltavam inputs) |
| `features/clientes/components/ClientesPage.tsx` | Orquestra listagem + `ReasonDialog` reusável para `bloquear`/`desbloquear`/`inativar` (`:37,98-100`, um único componente parametrizado por `action`) | O padrão `ReasonDialog` é diretamente reaproveitável para "revogar homologação" de Fornecedor (mesmo formato `{ motivo }`); não serve para "configuração comercial" (não é ação com motivo, é formulário com 5 campos) |
| `features/fornecedores/components/FornecedorFormDialog.tsx` | Diálogo único (sem abas) — cria/edita `empresaId/filialId/pessoaId/codigo` + `observacao`. Ainda mais enxuto que o de Cliente | Não toca `condicaoPagamentoPadraoId`/`prazoEntregaMedio`/`categoriaFornecimento`/`homologado` |
| `features/fornecedores/components/FornecedoresPage.tsx` | Só tem a ação `inativar` com `ReasonDialog` (`:44,73-82,108`) — **nenhuma ação de linha para homologar/revogar**, diferente de Cliente que já tem duas ações de estado (`bloquear`/`desbloquear`) | Não cobre; precedente de "duas ações de estado mutuamente exclusivas por linha" existe em Cliente (crédito) e replicaria para Fornecedor (homologação) |

**Cabe na tela existente ou é tela/aba nova?** Isto é leitura de estrutura, não proposta — quem
decide layout é a rodada. Fatos: (1) nenhum dos dois diálogos hoje tem abas — ao contrário do
`ProdutoFormDialog` da `b65`, que já tinha a aba "Dados fiscais" pronta para receber campo. Editar
5 campos de Cliente (3 selects de catálogo + 1 número + 1 booleano) ou 3 de Fornecedor (1 select +
1 número + 1 texto) dentro do diálogo atual, sem aba, mistura dado cadastral com dado comercial
num único formulário já teria 4 campos (Cliente) ou 2 (Fornecedor) antes desta fatia. (2)
Homologar/Revogar têm o mesmíssimo formato de ação-por-linha-com-motivo que `bloquear`/`desbloquear`
crédito já resolve em produção, no mesmo `ReasonDialog`. (3) `situacao-compra` é dado só de
leitura, sem ação — hoje não há nenhuma coluna nem indicador na tabela de Fornecedores que mostre
`homologado`/`podeReceberPedidoCompra` (a tabela lista só `codigo`, `pessoa`, `observacao`,
`status` — `FornecedoresPage.tsx:99-102`).

---

## 5. Permissões — sem divergência encontrada

Toda ação do recorte usa **as mesmas duas permissões que já guardam a rota inteira hoje** —
`ClientesGerenciar`/`ClientesConsultar` e `FornecedoresGerenciar`/`FornecedoresConsultar`
(`SystemPermissions.cs:51-54`, confirmado por leitura direta da classe) — não há permissão nova
exigida por nenhum dos cinco endpoints do recorte.

| Permissão (C#) | União `PermissionCode` | Catálogo | Guard de rota | Menu |
| --- | --- | --- | --- | --- |
| `ClientesConsultar` / `ClientesGerenciar` | `types/erp.ts:254-255` | `permissoesCatalogo.ts:51-52` | `routePermissions.ts:15` (`anyOf: CLIENTES_CONSULTAR, CLIENTES_GERENCIAR`) | `AppMenu.tsx:76` |
| `FornecedoresConsultar` / `FornecedoresGerenciar` | `types/erp.ts:256-257` | `permissoesCatalogo.ts:53-54` | `routePermissions.ts:16` | `AppMenu.tsx:77` |

Os catálogos referenciados por `ConfigurarComercialClienteRequest`/`ConfigurarCompraFornecedorRequest`
também batem, sem divergência:

| Permissão do catálogo (C#) | União | Catálogo | Frontend já consome? |
| --- | --- | --- | --- |
| `TabelasPrecoConsultar` | `types/erp.ts:277` | `permissoesCatalogo.ts:78` | Sim — `features/tabelas-preco/` |
| `FinanceiroConsultar` | `types/erp.ts:284` | `permissoesCatalogo.ts:86` | Sim — `features/financeiro/` (condições de pagamento) |
| `PessoasConsultar` | `types/erp.ts:249` | `permissoesCatalogo.ts:46` | **Não** — ver achado abaixo |

**Achado (não é divergência de contrato, é lacuna de produto):** `GET /api/pessoas/classificacoes`
existe, exige só `PessoasConsultar` (que toda a base de Pessoas já usa), e **não há nenhuma tela
no frontend inteiro que o consuma** — `grep -rln "classificacoes" features/` não encontrou
arquivo nenhum, e não há rota `/pessoas/classificacoes` nem `CLASSIFICACOES_PESSOA_GERENCIAR` em
`layout/AppMenu.tsx` ou `lib/security/routePermissions.ts` (grep confirmou zero ocorrências nos
dois arquivos), apesar de `CLASSIFICACOES_PESSOA_GERENCIAR` já existir na união
(`types/erp.ts:253`) e no catálogo (`permissoesCatalogo.ts:50`). Ou seja: **o cadastro de
Classificação de Pessoa em si (CRUD) não existe em nenhuma tela hoje** — não é um problema deste
recorte (`classificacaoId` só referencia o Id), mas se a UI de configuração comercial do Cliente
quiser resolver a sigla/nome da classificação por um seletor, o catálogo subjacente para
administrá-lo não tem onde ser cadastrado ainda. Registrado como risco.

---

## 6. Dependência com a venda (`b67`) — resposta à pergunta P1 da rodada 07

**Não encontrei nenhuma referência, em nenhum ponto do fluxo de pedido de venda do backend, aos
cinco campos de `ConfigurarComercialClienteRequest`.**

`grep -rn "TabelaPrecoPadraoId|CondicaoPagamentoPadraoId|PermiteVendaAPrazo|DiaVencimentoPreferencial"
../New\ project\ 3/src/Erp.Application/Vendas ../New\ project\ 3/src/Erp.Domain/Vendas` → zero
ocorrências. Evidência por arquivo:

- `VendaClienteValidator.ValidarAsync` (`../New project 3/src/Erp.Application/Vendas/VendaClienteValidator.cs`,
  arquivo completo, 24 linhas) só verifica `cliente.IsActive` e `cliente.CreditoBloqueado` — não lê
  `TabelaPrecoPadraoId` nem `CondicaoPagamentoPadraoId` nem `PermiteVendaAPrazo`.
- `AdicionarItemPedidoVendaRequest` (`.../Vendas/Pedidos/PedidoVendaRequests.cs:20-26`) recebe
  `ValorUnitario` **do chamador** — não há cálculo server-side a partir de tabela de preço.
  `AdicionarItemPedidoVendaUseCase.ExecutarAsync` (arquivo completo,
  `.../Vendas/Pedidos/AdicionarItemPedidoVendaUseCase.cs:31-58`) grava exatamente o valor
  recebido, sem consultar `ITabelasPrecoRepository` nem `TabelaPrecoPadraoId` do cliente.
- `GET .../tabelas-preco/produtos/{produtoId}/preco-vigente`
  (`TabelasPrecoController.cs:131-133`) — o único endpoint de preço vigente do sistema — recebe
  `produtoId`, `empresaId?`, `filialId?`, `dataReferencia`; **não recebe `clienteId`** nem
  seleciona tabela por cliente.
- Do lado do frontend, `features/vendas/components/PedidoVendaItemDialog.tsx:61` usa
  `MoneyInput` para `valorUnitario` digitado manualmente pelo operador
  (`buildInitialValues`, `:20-21`) — confirma que hoje o preço do item de pedido de venda **já
  está implementado como entrada manual**, sem qualquer leitura de `tabelaPrecoPadraoId` do
  cliente (nenhuma ocorrência de `tabelaPreco` nem `condicaoPagamento` no arquivo).

**Conclusão, com a ressalva de que é leitura de código e não execução:** hoje, nem o backend nem
o frontend do pedido de venda dependem da configuração comercial de Cliente para calcular preço
ou condição. Isso responde P1 no sentido de que **este recorte não é um bloqueio disfarçado para
`b67`** — mas é uma constatação sobre o estado atual do código, não uma afirmação de que a regra
de negócio *deveria* continuar assim; se o produto decidir que o pedido de venda deve herdar
tabela de preço/condição de pagamento padrão do cliente, isso é trabalho novo em `b67`,
independente de este recorte existir ou não. Achado lateral, fora do recorte mas registrado por
ter aparecido na varredura: `features/vendas/` já existe e cobre boa parte do CRUD de pedido de
venda (listagem, formulário, itens, ações — `PedidoVendaActionDialogs.tsx`,
`PedidoVendaDetalhePage.tsx`), o que pode já reduzir o escopo real de `b67` quando chegar sua
rodada — não avaliado aqui além desta constatação de existência.

---

## 7. Gate de contrato

`scripts/gate-contract-request-fields.mjs:30-49` (`SCHEMA_TO_REQUEST_MAP`) e `:64-73`
(`recordNames`, usado por `loadRequestContractFromDocument`) cobrem hoje oito records em cinco
módulos — `produtos`, `estoque`, `administracao`, `seguranca`, `rh`. **Nenhum record de Cliente ou
Fornecedor está no universo do gate.** `grep -n "cliente\|fornecedor\|Cliente\|Fornecedor"
scripts/gate-contract-request-fields.mjs` só encontra as duas entradas de Produto
(`AtualizarDadosFiscaisProdutoRequest`, `VincularProdutoFornecedorRequest`), que são de outro
módulo (Produto vinculando um Fornecedor, não Fornecedor propriamente).

Para o recorte entrar no gate, seriam necessários (nenhum existe hoje em `features/clientes/schemas/`
nem `features/fornecedores/schemas/`, que hoje só têm `criar*`/`atualizar*`/`*MotivoSchema`):

1. Um schema Zod novo para `ConfigurarComercialClienteRequest` (5 campos) em
   `features/clientes/schemas/clientesSchemas.ts`.
2. Um schema Zod novo para `ConfigurarCompraFornecedorRequest` (3 campos) em
   `features/fornecedores/schemas/fornecedoresSchemas.ts`.
3. Opcionalmente, `RevogarHomologacaoFornecedorRequest` (1 campo, `motivo`) — mas esse schema já
   teria o mesmo formato de `clienteMotivoSchema`/`fornecedorMotivoSchema` existentes, que **não**
   estão no gate hoje (o gate cobre só os records "com lacuna", não todo o universo de requests).
4. As três entradas em `SCHEMA_TO_REQUEST_MAP` (chave do módulo → nome do schema → nome do record)
   e em `recordNames` (`gate-contract-request-fields.mjs:64-73`).

**O documento-fonte do gate já tem as três assinaturas prontas** —
`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3030` (`ConfigurarComercialClienteRequest`), `:3038`
(`ConfigurarCompraFornecedorRequest`), `:3041` (`RevogarHomologacaoFornecedorRequest`), cada uma
em início de linha no formato que `loadRequestContractFromDocument`
(`gate-contract-request-fields.mjs:55-73`) já sabe parsear — não seria necessário reescrever o
documento de contrato, só o script e os schemas.

---

## Tabelas do padrão da skill

### Telas e rotas

| Rota | Arquivo de página | Componente da feature | Permissão exigida | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/clientes` | `app/(main)/clientes/page.tsx` | `ClientesPage` (`features/clientes/components/ClientesPage.tsx`) | `anyOf: CLIENTES_CONSULTAR, CLIENTES_GERENCIAR` | `lib/security/routePermissions.ts:15`; `types/erp.ts:254-255`; `permissoesCatalogo.ts:51-52`; `layout/AppMenu.tsx:76` |
| `/fornecedores` | `app/(main)/fornecedores/page.tsx` | `FornecedoresPage` (`features/fornecedores/components/FornecedoresPage.tsx`) | `anyOf: FORNECEDORES_CONSULTAR, FORNECEDORES_GERENCIAR` | `lib/security/routePermissions.ts:16`; `types/erp.ts:256-257`; `permissoesCatalogo.ts:53-54`; `layout/AppMenu.tsx:77` |

Nenhuma rota nova é exigida pelo backend — os cinco endpoints do recorte penduram nas mesmas duas
rotas de página que já existem.

### Endpoints consumidos (recorte + o que já existe, para não duplicar)

| Método + rota | Arquivo em `features/<mod>/api/` | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/clientes` | `clientesApi.ts:24-29` | — (query, sem schema de body) | `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:1708` | Sim — `ClientesController.cs:23-24` |
| `POST /api/clientes` | `clientesApi.ts:30-36` | `criarClienteSchema` (`clientesSchemas.ts:7-14`) | `:1709` | Sim — `:31-32` |
| `PUT /api/clientes/{id}` | `clientesApi.ts:37-43` | `atualizarClienteSchema` (`clientesSchemas.ts:16-19`) | `:1710` | Sim — `:44-45` |
| `POST /api/clientes/{id}/bloquear-credito` | `clientesApi.ts:44-49` | `clienteMotivoSchema` (`clientesSchemas.ts:21`) | `:1711` | Sim — `:57-58` |
| **`PUT /api/clientes/{id}/configuracao-comercial`** | **nenhum** | **nenhum** | `:1712`; `ClienteRequests.cs:15-20` | Sim, existe — `ClientesController.cs:70-71`; não consumido |
| `POST /api/clientes/{id}/desbloquear-credito` | `clientesApi.ts:50-55` | `clienteMotivoSchema` | `:1713` | Sim — `:83-84` |
| `POST /api/clientes/{id}/inativar` | `clientesApi.ts:56-61` | `clienteMotivoSchema` | `:1714` | Sim — `:96-97` |
| `GET /api/fornecedores` | `fornecedoresApi.ts:24-29` | — | `:1722` | Sim — `FornecedoresController.cs:26-27` |
| `POST /api/fornecedores` | `fornecedoresApi.ts:30-36` | `criarFornecedorSchema` (`fornecedoresSchemas.ts:7-13`) | `:1723` | Sim — `:34-35` |
| `PUT /api/fornecedores/{id}` | `fornecedoresApi.ts:37-43` | `atualizarFornecedorSchema` (`fornecedoresSchemas.ts:15-17`) | `:1724` | Sim — `:47-48` |
| **`PUT /api/fornecedores/{id}/configuracao-compra`** | **nenhum** | **nenhum** | `:1725`; `FornecedorRequests.cs:12-15` | Sim, existe — `FornecedoresController.cs:60-61`; não consumido |
| **`POST /api/fornecedores/{id}/homologar`** | **nenhum** | — (sem body) | `:1726` | Sim, existe — `:73-74`; não consumido |
| **`POST /api/fornecedores/{id}/revogar-homologacao`** | **nenhum** | **nenhum** | `:1727`; `FornecedorRequests.cs:17` | Sim, existe — `:86-87`; não consumido |
| **`GET /api/fornecedores/{id}/situacao-compra`** | **nenhum** | — | `:1728`; `IFornecedoresCompraConsulta.cs:7` | Sim, existe — `:99-100`; não consumido |
| `POST /api/fornecedores/{id}/inativar` | `fornecedoresApi.ts:44-49` | `fornecedorMotivoSchema` (`fornecedoresSchemas.ts:19`) | `:1729` | Sim — `:112-113` |
| `GET /api/tabelas-preco` (catálogo referenciado) | `features/tabelas-preco/api/tabelasPrecoApi.ts:59` | — | contrato de Tabelas de Preço (fora deste recorte) | Sim — `TabelasPrecoController.cs:22-23` |
| `GET /api/financeiro/condicoes-pagamento` (catálogo referenciado) | `features/financeiro/api/financeiroApi.ts:97` | — | contrato de Financeiro (fora deste recorte) | Sim — `CondicoesPagamentoController.cs:19-20` |
| **`GET /api/pessoas/classificacoes`** (catálogo referenciado) | **nenhum** | — | `:1697` | Sim, existe — `ClassificacoesPessoaController.cs:22-23`; **nenhuma tela no app consome, mesmo fora deste recorte** |

Todas as rotas hoje já consumidas batem 1:1 com o backend (verbo, caminho, permissão) — não há
nenhuma entrada nova para `scripts/backend-contract-map.allowlist.json`, e as ausentes dos cinco
endpoints do recorte também não geram entrada de allowlist porque não são chamadas pelo frontend
(o allowlist registra divergência de chamada real contra contrato, não endpoint não-usado).

### Campos (recorte, `destino declarado`)

Todos os 14 campos abaixo pertencem ao recorte (configuração comercial de Cliente, configuração
de compra e homologação de Fornecedor) e **nenhum é lido, exibido ou enviado por nenhuma tela do
frontend hoje** — os tipos `ClienteResponse`/`FornecedorResponse` do frontend
(`features/clientes/types/clientes.types.ts:9-20`, `features/fornecedores/types/fornecedores.types.ts:9-17`)
não os declaram, e não existe schema de request para nenhum deles (Seção 1/7).

| Campo | Tipo no frontend hoje | Origem (endpoint/campo) | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `tabelaPrecoPadraoId` | inexistente | `ConfigurarComercialClienteRequest.TabelaPrecoPadraoId` / `ClienteResponse.TabelaPrecoPadraoId` | sim (response) | **sem uso** |
| `condicaoPagamentoPadraoId` (Cliente) | inexistente | idem, `.CondicaoPagamentoPadraoId` | sim (response) | **sem uso** |
| `classificacaoId` | inexistente | idem, `.ClassificacaoId` | sim (response) | **sem uso** |
| `diaVencimentoPreferencial` | inexistente | idem, `.DiaVencimentoPreferencial` | sim (response) | **sem uso** |
| `permiteVendaAPrazo` | inexistente | idem, `.PermiteVendaAPrazo` | sim (response) | **sem uso** |
| `condicaoPagamentoPadraoId` (Fornecedor) | inexistente | `ConfigurarCompraFornecedorRequest.CondicaoPagamentoPadraoId` / `FornecedorResponse.CondicaoPagamentoPadraoId` | sim (response) | **sem uso** |
| `prazoEntregaMedio` | inexistente | idem, `.PrazoEntregaMedio` | sim (response) | **sem uso** |
| `categoriaFornecimento` | inexistente | idem, `.CategoriaFornecimento` | sim (response) | **sem uso** |
| `homologado` | inexistente | `FornecedorResponse.Homologado` (setado só por `POST .../homologar` e `POST .../revogar-homologacao`, sem campo de request próprio) | sim (response) | **sem uso** |
| `motivo` (revogação) | inexistente | `RevogarHomologacaoFornecedorRequest.Motivo` (write-only, sem espelho em response) | não se aplica (campo de request) | **sem uso** |
| `situacaoCompra.ativo` | inexistente | `SituacaoCompraFornecedor.Ativo` (`GET .../situacao-compra`) | sim | **sem uso** |
| `situacaoCompra.homologado` | inexistente | `SituacaoCompraFornecedor.Homologado` — mesmo valor de `FornecedorResponse.Homologado`, mas por endpoint separado | sim | **sem uso** |
| `situacaoCompra.podeReceberPedidoCompra` | inexistente | `SituacaoCompraFornecedor.PodeReceberPedidoCompra` — **derivado no backend** de `Ativo`, `Homologado` e do parâmetro `COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO` | sim | **sem uso** |
| `situacaoCompra.motivo` | inexistente | `SituacaoCompraFornecedor.Motivo` — texto explicativo quando `PodeReceberPedidoCompra = false` | sim | **sem uso** |

**Fechamento da conta:** a UI lê hoje **0** destes 14 campos do recorte. `0 exibido + 0 enviado +
0 derivado + 14 sem uso = 14` — bate com o total inventariado. Não há campo lido pela UI sem
correspondência no backend, nem campo com tipo divergente entre Zod e resposta real, porque não
existe schema Zod nem leitura de UI para nenhum deles ainda — a divergência aqui é de categoria
diferente da `b65` (capacidade ausente, não contrato quebrado), registrada na Seção Divergências.

### Estados de tela

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `ClientesPage` (listagem) | presente — `listQuery.isFetching` no `DataTableServer` (`ClientesPage.tsx:108`) | presente — `EmptyState` (`:116`) | presente — `ApiErrorPanel` sobre `listQuery.error` (`:107`) | não verificado — nenhum tratamento distinto para erro bloqueante na listagem | presente — toast via `runWithToast` em `save`/`runReasonAction` (`:66-88`) | presente — `UnauthorizedState` quando falta `CLIENTES_CONSULTAR` (`:57-59`) | presente — `DataTableActions` com `permission` e `disabled` por ação em função de `isActive`/`creditoBloqueado` (`:114`) |
| `ClienteFormDialog` | presente — `loading` prop desabilita/mostra spinner no botão Salvar (`:56`) | não se aplica (formulário) | não verificado — erro do backend cai no toast genérico de `save()` (`ClientesPage.tsx:73`, `rethrow: true` mantém o diálogo aberto, mas sem mapeamento campo a campo do erro do backend) | não verificado — mesma observação | presente — toast de sucesso (`ClientesPage.tsx:73`) | não se aplica (a abertura do diálogo já é guardada por `PermissionGuard mode="disable"` no botão "Novo cliente", `:94`) | não se aplica — o diálogo hoje não tem nenhum campo/ação do recorte (configuração comercial) para marcar indisponível |
| `FornecedoresPage` (listagem) | presente — `listQuery.isFetching` (`FornecedoresPage.tsx:98`) | presente — `EmptyState` (`:105`) | presente — `ApiErrorPanel` (`:97`) | não verificado | presente — toast (`:62-71,73-82`) | presente — `UnauthorizedState` (`:53-55`) | presente para a única ação hoje (`inativar`, disabled por `isActive`, `:103`); **ausente** para homologar/revogar — ações não existem, logo não há "indisponível com motivo" para elas (é "inexistente", categoria diferente de "ausente") |
| `FornecedorFormDialog` | presente — `loading` prop (`:53`) | não se aplica | não verificado — mesmo padrão de `ClienteFormDialog` | não verificado | presente | não se aplica | não se aplica — sem campos do recorte |

`situacao-compra` não tem tela hoje — as sete colunas acima não se aplicam a um endpoint que não
tem nenhum componente que o chame.

---

## Divergências

1. **Campo entregue pelo backend que a UI ignora — bloco comercial de Cliente.** `ClienteResponse`
   do C# tem 15 campos (`ClienteResponse.cs:5-20`); o tipo `ClienteResponse` do frontend
   (`features/clientes/types/clientes.types.ts:9-20`) tem 10 — faltam os cinco campos comerciais
   (`tabelaPrecoPadraoId`, `condicaoPagamentoPadraoId`, `classificacaoId`,
   `diaVencimentoPreferencial`, `permiteVendaAPrazo`). Já vêm na resposta de `GET /api/clientes`
   hoje (o backend não tem como omitir, é o mesmo mapper), mas ficam descartados porque o tipo
   frontend não os declara e nenhum componente os lê.
2. **Campo entregue pelo backend que a UI ignora — bloco de compra/homologação de Fornecedor.**
   `FornecedorResponse` do C# tem 11 campos; o tipo frontend
   (`features/fornecedores/types/fornecedores.types.ts:9-17`) tem 7 — faltam
   `condicaoPagamentoPadraoId`, `prazoEntregaMedio`, `homologado`, `categoriaFornecimento`. Mesmo
   raciocínio do item 1: o backend já devolve, a UI descarta por tipo incompleto.
3. **Cinco endpoints existentes no backend, documentados em
   `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`, sem nenhum consumidor no frontend:**
   `PUT .../clientes/{id}/configuracao-comercial`, `PUT .../fornecedores/{id}/configuracao-compra`,
   `POST .../fornecedores/{id}/homologar`, `POST .../fornecedores/{id}/revogar-homologacao`,
   `GET .../fornecedores/{id}/situacao-compra`. Não é divergência de contrato (nada aqui
   diverge do que o backend expõe) — é a lacuna que a D58 já registrou como gatilho para este
   inventário, agora com endpoint, permissão, semântica e catálogo confirmados campo a campo.
4. **Catálogo referenciado sem tela em lugar nenhum do app:** `GET /api/pessoas/classificacoes`
   existe, tem permissão já presente no union e no catálogo
   (`PESSOAS_CONSULTAR`/`CLASSIFICACOES_PESSOA_GERENCIAR`), e **nenhuma rota, menu ou feature o
   consome hoje** — nem para listar classificações em algum cadastro administrativo, nem para
   resolvê-las como catálogo de outro módulo. Isso é anterior a este recorte (não foi criado por
   ele), mas o afeta diretamente: se `classificacaoId` do Cliente ganhar um seletor, não há hoje
   onde cadastrar/consultar classificações fora do endpoint cru.
5. **Parâmetro de sistema sem tela:** `COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO`
   (`CatalogoParametros.cs:23,31`) decide o `motivo`/`podeReceberPedidoCompra` de
   `situacao-compra`, e não há em `features/` nenhuma tela de administração de parâmetros que o
   exponha (`grep -rn "COMPRAS_BLOQUEIA_FORNECEDOR" features/` vazio). Mesma categoria do item 4:
   pré-existente, mas relevante para quem for desenhar a leitura de `situacao-compra`.
6. **Sem divergência de permissão:** todas as permissões do recorte (`ClientesGerenciar`,
   `ClientesConsultar`, `FornecedoresGerenciar`, `FornecedoresConsultar`, `TabelasPrecoConsultar`,
   `FinanceiroConsultar`, `PessoasConsultar`) já existem na união (`types/erp.ts`), no catálogo
   (`permissoesCatalogo.ts`) e, para as duas primeiras, no guard de rota
   (`routePermissions.ts:15-16`) e no menu (`AppMenu.tsx:76-77`). Registrado explicitamente porque
   a ausência de divergência aqui é ela própria um dado relevante para a rodada — ao contrário da
   `b65`, que não teve achado de permissão nova também, este recorte reforça o padrão.
7. **Sem trava de gravação equivalente ao `TipoItemSpedObrigatorio` da `b65`:** verificado por
   leitura completa dos dois use cases e dos dois métodos de domínio (Seção 2) — não há
   validação cruzada "campo X obrigatório quando qualquer campo do bloco vem preenchido". A
   gravidade que motivou o enquadramento "corrigir gravação quebrada" na `b65` **não se repete**
   aqui; este recorte é, na taxonomia da própria `b65`, "campo/capacidade nova", não correção.
8. **Endpoint fora da allowlist:** não se aplica. `scripts/backend-contract-map.allowlist.json`
   não lista nenhuma rota de `clientes`/`fornecedores` (`grep -n "cliente\|fornecedor"` vazio) —
   correto, porque todas as dez rotas já consumidas hoje (Cliente: 6 — `listar`, `criar`,
   `atualizar`, `bloquear-credito`, `desbloquear-credito`, `inativar`; Fornecedor: 4 — `listar`,
   `criar`, `atualizar`, `inativar`) batem 1:1 com o contrato; o allowlist só registra
   divergência real de chamada, e não há nenhuma aqui.
9. **Gate `scripts/gate-contract-request-fields.mjs` não cobre o recorte:** nenhum dos três
   records (`ConfigurarComercialClienteRequest`, `ConfigurarCompraFornecedorRequest`,
   `RevogarHomologacaoFornecedorRequest`) está em `SCHEMA_TO_REQUEST_MAP` nem em `recordNames`
   (Seção 7). Diferente de uma falha, é ausência esperada — o gate cobre hoje só os oito records
   que a `b58.c3` originalmente mapeou como "com lacuna"; nenhum destes três tinha schema Zod
   correspondente para comparar até agora.
10. **Enum fixo no frontend sem enum correspondente no backend / o inverso:** não aplicável — não
    há enum no recorte (`TipoItemSped` foi o caso da `b65`; aqui os únicos campos fechados são
    booleanos e Ids de catálogo, sem lista de valores fixa no domínio).

---

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "cliente-fornecedor-comercial",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/08-inventario-cliente-fornecedor.md",
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    { "tipo": "funcional", "pergunta": "A configuração comercial do Cliente (5 campos: tabela de preço, condição de pagamento, classificação, dia de vencimento preferencial, permite venda a prazo) entra como aba nova no ClienteFormDialog existente (hoje sem abas) ou como diálogo/tela separada? Mesma pergunta para os 3 campos de configuração de compra do Fornecedor.", "decide": "estrutura de tela da fatia que implementar este recorte" },
    { "tipo": "funcional", "pergunta": "Homologar/Revogar homologação de Fornecedor cabem como duas novas ações de linha na FornecedoresPage (replicando o padrão bloquear/desbloquear crédito já em produção em ClientesPage) ou precisam de superfície própria?", "decide": "onde a ação mutuamente exclusiva por estado (Homologado) aparece na tela" },
    { "tipo": "funcional", "pergunta": "GET .../situacao-compra (leitura derivada com podeReceberPedidoCompra e motivo, dependente do parâmetro COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO que hoje não tem tela) entra nesta fatia ou fica para quando o parâmetro tiver onde ser administrado?", "decide": "se a fatia expõe só a leitura crua do endpoint ou também um indicador visual que dependeria de um parâmetro hoje invisível" },
    { "tipo": "funcional", "pergunta": "classificacaoId do Cliente referencia um catálogo (Classificação de Pessoa) sem nenhuma tela de CRUD no app hoje. A fatia inclui um seletor mesmo sem tela de cadastro (usuário resolveria por Id/termo já existente pelo GET), adia esse campo, ou a criação da tela de Classificações de Pessoa entra como pré-requisito?", "decide": "se o campo classificacaoId entra nesta fatia com seletor por busca ou fica fora até existir cadastro" }
  ],
  "riscos": [
    "Banco de dev (logosoft-postgres) sem nenhuma migração aplicada (__EFMigrationsHistory com 0 linhas) — nada neste inventário foi confirmado contra dado real, só contra código-fonte C# (incluindo EF Core Configuration) e frontend.",
    "GET /api/pessoas/classificacoes existe e tem permissão pronta, mas não há nenhuma tela de CRUD de Classificação de Pessoa no app — se a fatia que consumir este inventário quiser um seletor amigável (não só Id cru) para classificacaoId, esbarra numa lacuna de produto anterior a este recorte.",
    "Parâmetro de sistema COMPRAS_BLOQUEIA_FORNECEDOR_NAO_HOMOLOGADO decide o resultado de situacao-compra e não tem tela de administração — o \"motivo\" que a UI mostraria para um fornecedor bloqueado por parâmetro fica sem explicação editável para o operador.",
    "Não verificado em runtime: toda a semântica de gravação (Seção 2, 3) foi confirmada por leitura de código nos dois lados (use case, domínio, validators), não por execução real contra o backend de pé — consistente com o restante do inventário, mas registrado porque nenhuma chamada HTTP real foi feita."
  ]
}
```
