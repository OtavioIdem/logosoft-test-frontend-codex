# Inventário — cargos de acesso e a Pessoa do colaborador (v1.11.0a8b63)

Agente: `inventariante-contrato-tela`. Insumo: `docs/fatias/v1.11.0a8b63-f4-cargos-de-acesso-e-pessoa.md`
(Bloco A). Recorte: os cinco requests da família `cargos-acesso` mais `AdmitirColaboradorRequest`.
Sem credencial de sessão no ambiente — tudo que dependeria de resposta autenticada está marcado
`não verificado`; tudo que vem de código-fonte ou do Swagger público está marcado como medido, com
arquivo:linha.

Este documento **não** entra em `docs/fatias/v1.11.0a8b63-*.md` — instrução recebida no briefing,
que substitui o texto da §6 Bloco A do plano da fatia (que apontava para lá).

## 0. Fontes usadas, por hierarquia

1. Backend em execução — `http://localhost:8080/swagger/v1/swagger.json` (200; baixado e
   inspecionado). Todo endpoint protegido devolveu `401` sem credencial — confirmado para
   `GET /api/seguranca/cargos-acesso`.
2. Código do backend em `../New project 3/src` (leitura) — fonte primária de tipo, nulidade e regra
   de negócio; o Swagger **erra** nulidade de `string` obrigatória (ver §4).
3. `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md` — conferido linha a linha contra o código-fonte; uma
   omissão encontrada (`RemoverGrupoCargoAcessoRequest` não está no bloco de records, só na tabela
   de rotas).
4. `features/seguranca/**`, `features/rh/**` — estado atual do frontend.

## 1. Campo a campo dos cinco requests

Fonte de tipo e nulidade: os records em `Erp.Application/Security/CargosAcesso/CargosAcessoRequests.cs`
(medido, arquivo aberto por inteiro). Fonte de obrigatoriedade **de fato** (além do que o tipo já
força): os use cases em `CargoAcessoMutationUseCases.cs`, `CargoAcessoGrupoUseCases.cs`,
`UsuarioCargoAcessoUseCases.cs` e as entidades de domínio `CargoAcesso.cs` / `UsuarioCargoAcesso.cs`
(todos lidos por inteiro). Coluna "Swagger" registra o que o schema público diz, só para marcar onde
ele diverge do C# — nunca como fonte de verdade.

### `CriarCargoAcessoRequest(Guid EmpresaId, Guid? FilialId, EscopoAcesso Escopo, string Nome, string? Descricao, int NivelHierarquico)`

`CargosAcessoRequests.cs:5-11`. `POST /api/seguranca/cargos-acesso`, permissão `PermissoesGerenciar`
= `SEGURANCA_PERMISSOES_GERENCIAR` (`CargosAcessoController.cs:43`).

| Campo | Tipo C# | Anulável | Obrigatório de fato | Onde é validado |
| --- | --- | --- | --- | --- |
| `EmpresaId` | `Guid` | não | sim — `Guid.Empty` lança `DomainException` | `CargoAcesso.cs:16-19` |
| `FilialId` | `Guid?` | sim | condicional — obrigatório se `Escopo=Filial`; **proibido** se `Escopo=Empresa` | `CargoAcesso.cs:21-29` |
| `Escopo` | `EscopoAcesso` (enum) | não | sim | tipo não anulável; sem validação adicional além da regra acima |
| `Nome` | `string` | não | sim — vazio/whitespace lança `DomainException`; máx. 120 após `Trim()` | `CargoAcesso.cs:33,101-115` |
| `Descricao` | `string?` | sim | opcional; se enviado, máx. 500 após `Trim()` | `CargoAcesso.cs:34,117-131` |
| `NivelHierarquico` | `int` | não | sim (o tipo obriga); negativo é **silenciosamente zerado**, não rejeitado | `CargoAcesso.cs:35` |

Regra adicional não expressa no tipo: nome duplicado no mesmo escopo/empresa/filial é rejeitado
(`CargoDuplicado`, checado **antes** da criação — `CargoAcessoMutationUseCases.cs:35-38`).

Swagger declara `nome` e `descricao` como `"nullable": true` — **errado** para `Nome` (o C# é
`string`, não `string?`, e o domínio rejeita vazio). Confirma a armadilha 1 do plano, generalizada:
o Swagger deste backend também erra nulidade de `string` não-anulável, não só de enum.

### `AtualizarCargoAcessoRequest(string Nome, string? Descricao, int NivelHierarquico, string Motivo)`

`CargosAcessoRequests.cs:13-17`. `PUT /api/seguranca/cargos-acesso/{id}`, mesma permissão.

| Campo | Tipo C# | Anulável | Obrigatório de fato | Onde é validado |
| --- | --- | --- | --- | --- |
| `Nome` | `string` | não | sim, mesma regra de `Criar` | `CargoAcesso.cs:51,101-115` |
| `Descricao` | `string?` | sim | opcional, máx. 500 | `CargoAcesso.cs:52,117-131` |
| `NivelHierarquico` | `int` | não | sim; negativo zerado | `CargoAcesso.cs:53` |
| `Motivo` | `string` | não | sim — `string.IsNullOrWhiteSpace` retorna erro `SEGURANCA_MOTIVO_OBRIGATORIO` **antes** de carregar o cargo | `CargoAcessoMutationUseCases.cs:74-77` |

Nome duplicado é checado de novo aqui, excluindo o próprio id (`CargoAcessoMutationUseCases.cs:92-95`).
Atualizar dispara `CargosAcessoPermissionInvalidator.InvalidarUsuariosDoCargoAsync` (linha 102) — ver
§5 sobre o que essa invalidação de fato alcança.

### `VincularGrupoCargoAcessoRequest(Guid GrupoAcessoId, string Motivo)`

`CargosAcessoRequests.cs:19`. `POST /api/seguranca/cargos-acesso/{id}/grupos`, mesma permissão.

| Campo | Tipo C# | Anulável | Obrigatório de fato | Onde é validado |
| --- | --- | --- | --- | --- |
| `GrupoAcessoId` | `Guid` | não | sim — `Guid.Empty` rejeitado no domínio; grupo precisa **existir** (`GrupoNaoEncontrado`) e pertencer ao contexto organizacional do cargo | `CargoAcesso.cs:58-61`; `CargoAcessoGrupoUseCases.cs:52-62` |
| `Motivo` | `string` | não | sim — mesma checagem de `IsNullOrWhiteSpace` | `CargoAcessoGrupoUseCases.cs:34-37` |

Vínculo é idempotente por reativação: se já existe um vínculo inativo para o par
(cargo, grupo), ele é reativado em vez de duplicado — índice único (cargo, grupo)
(`CargoAcesso.cs:63-77`, comentário no próprio código).

### `RemoverGrupoCargoAcessoRequest(string Motivo)` — **não documentado em `BACKEND-ESTADO-ATUAL-E-CONTRATO.md`**

Record inline no controller: `CargosAcessoController.cs:94`. `POST
/api/seguranca/cargos-acesso/{id}/grupos/{grupoAcessoId}/remover`, mesma permissão. O doc de
contrato lista a rota (`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:2011`) mas **não** o record no bloco
`Security/CargosAcesso` (linhas 3256-3268) — é o tipo de omissão que este inventário existe para
achar. Registrado em Divergências.

| Campo | Tipo C# | Anulável | Obrigatório de fato | Onde é validado |
| --- | --- | --- | --- | --- |
| `Motivo` | `string` | não | sim — mesma checagem | `CargoAcessoGrupoUseCases.cs:96-99` |

### `AtribuirCargoEmpresaUsuarioRequest(Guid CargoAcessoId, DateOnly VigenteDesde, DateOnly? VigenteAte, string Motivo)`

`CargosAcessoRequests.cs:21`. `POST /api/seguranca/usuarios/{id}/cargos-empresa`, permissão
`PermissoesGerenciar`.

| Campo | Tipo C# | Anulável | Obrigatório de fato | Onde é validado |
| --- | --- | --- | --- | --- |
| `CargoAcessoId` | `Guid` | não | sim — cargo precisa existir, ter `Escopo=Empresa` **e** `FilialId=null` | `UsuarioCargoAcessoUseCases.cs:25-41` |
| `VigenteDesde` | `DateOnly` | não | sim — **não é `DateTimeOffset`** (armadilha 5 confirmada) | tipo não anulável |
| `VigenteAte` | `DateOnly?` | sim | opcional; se enviado, não pode ser anterior a `VigenteDesde` | `UsuarioCargoAcesso.cs:38-41` |
| `Motivo` | `string` | não | sim, mesma checagem | `UsuarioCargoAcessoUseCases.cs:106-109` |

Usuário-alvo também precisa existir e passar pelo guard de contexto organizacional
(`UsuarioCargoAcessoUseCases.cs:112-122`).

**Response medido diretamente no controller**: `AtribuirCargoEmpresa` devolve `NoContent()` — **204,
sem corpo** (`UsuariosCargosAcessoController.cs:31`). O Swagger publica `"200": {"description":
"OK"}` para essa rota, mas o código devolve 204. Divergência entre o que o Swagger anuncia e o que
o controller de fato retorna — registrada em §6.

### `AtribuirCargoFilialUsuarioRequest(Guid CargoAcessoId, Guid FilialId, DateOnly VigenteDesde, DateOnly? VigenteAte, string Motivo)`

`CargosAcessoRequests.cs:23`. `POST /api/seguranca/usuarios/{id}/cargos-filial`, mesma permissão.

| Campo | Tipo C# | Anulável | Obrigatório de fato | Onde é validado |
| --- | --- | --- | --- | --- |
| `CargoAcessoId` | `Guid` | não | sim — cargo precisa existir, ter `Escopo=Filial` **e** `FilialId` do cargo **igual** ao `FilialId` do payload (checagem estrita, não "pertence a alguma filial") | `UsuarioCargoAcessoUseCases.cs:60-76` |
| `FilialId` | `Guid` | não | sim | tipo não anulável |
| `VigenteDesde` | `DateOnly` | não | sim | tipo não anulável |
| `VigenteAte` | `DateOnly?` | sim | opcional, mesma regra de não-anterioridade | `UsuarioCargoAcesso.cs:38-41` |
| `Motivo` | `string` | não | sim | `UsuarioCargoAcessoUseCases.cs:106-109` |

Mesmo padrão de resposta: `NoContent()` — 204, sem corpo (`UsuariosCargosAcessoController.cs:44`).

## 2. O que o response entrega

Confirmado ao vivo: **nenhuma** das seis rotas desta família publica schema de resposta no Swagger.
Medido baixando `swagger.json` (200 OK) e inspecionando `components.schemas` e cada `paths.*.responses`:
todas retornam só `{"200": {"description": "OK"}}` (ou `204` sem entrada nenhuma), sem `content` nem
`$ref`. `CargoAcessoResponse`, `AtribuirCargoEmpresaUsuarioRequest`/`FilialUsuarioRequest` **não
aparecem** entre as chaves de `components.schemas` como resposta — só como corpo de request (para os
dois últimos). Isso confirma a premissa do plano; o que segue vem do C#, não do Swagger.

| Response | Campos (medido no record C#) | Endpoints que devolvem |
| --- | --- | --- |
| `CargoAcessoResponse` | `Id, EmpresaId, FilialId, Escopo, Nome, Descricao, NivelHierarquico, Ativo, GruposAcessoIds` — `GruposAcessoIds` é **derivado**: só os vínculos com `Ativo=true` (`CargosAcessoMapper.cs:7-16`), não todos os vínculos já criados | `GET /`, `GET /{id}`, `POST /`, `PUT /{id}`, `POST /{id}/grupos`, `POST /{id}/grupos/{gid}/remover` |
| — (204, sem corpo) | nenhum | `POST /usuarios/{id}/cargos-empresa`, `POST /usuarios/{id}/cargos-filial` |
| `PermissoesEfetivasUsuarioResponse` | `UsuarioId, EmpresaId, FilialId, Permissoes (string[]), Origens (OrigemPermissaoEfetivaResponse[])` | `GET /usuarios/{id}/permissoes-efetivas` |
| `OrigemPermissaoEfetivaResponse` (item de `Origens`) | `Escopo, CargoAcessoId, GrupoAcessoId, PermissionCode, Permitido` | idem, aninhado |

`PermissoesEfetivasUsuarioResponse` já é consumido pelo frontend (`segurancaApi.ts:148-155`) e
validado por `permissoesEfetivasUsuarioSchema` (`segurancaSchemas.ts:40-56`) — schema tolerante,
sem `.strict()`, com `origens` e `permissoes` tratados como opcionais e "escopo" com `.catch(1)`.
Já respeita a armadilha 4 (escopo numérico) por precedente — nenhum ajuste necessário nesse ponto.

`CargoAcessoResponse` **não tem** tipo nem schema no frontend hoje — zero consumidores, confirmado
por grep vazio em `features/seguranca/{types,schemas}/*.ts` para `CargoAcessoResponse`.

## 3. `AdmitirColaboradorRequest` e `pessoaId`

Record medido: `AdmitirColaboradorRequest(Guid EmpresaId, Guid? FilialId, string Matricula, string
Nome, string Cpf, Guid CargoId, Guid? SetorId, Guid? PessoaId, Guid? JornadaId, RegimeTrabalho
Regime, decimal SalarioBase, DateTimeOffset DataAdmissao, DateTimeOffset? DataNascimento, string?
Email, string? Telefone)` — `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3215`, confirmado contra
`RhContracts.cs` (mesma assinatura).

`PessoaId` é `Guid?`, anulável, e **não tem nenhuma regra de obrigatoriedade nem de existência**:

- `AdmitirColaboradorRequestValidator` (`RhValidators.cs:5-16`) tem `RuleFor` para `EmpresaId`,
  `Matricula`, `Nome`, `Cpf`, `CargoId`, `SalarioBase` — **nenhuma para `PessoaId`**.
- `RhService.AdmitirColaboradorAsync` (`RhService.cs:62-88`) valida existência de `CargoId`,
  `SetorId` e `JornadaId` via `ValidarCargoSetorJornadaAsync` (linha 70) — `PessoaId` **não** passa
  por essa checagem; vai direto para `Colaborador.Admitir(...)` (linha 80) e é gravado sem
  confirmar que a Pessoa existe.
- `Colaborador.cs:22,39` também não valida `PessoaId` no construtor.

Isto é achado, não recomendação: hoje, se a UI mandar um Guid de Pessoa que não existe, o backend
aceita e grava — sem nenhum vínculo garantido.

**O que a UI envia hoje**: `admitirColaboradorSchema` (`features/rh/schemas/rhSchemas.ts:23-38`) tem
`empresaId, filialId, matricula, nome, cpf, cargoId, setorId, jornadaId, regime, salarioBase,
dataAdmissao, dataNascimento, email, telefone` — **`pessoaId` está ausente**. Como o schema é
`z.object(...)` sem `.passthrough()`, mesmo que o formulário coletasse o campo ele seria descartado
por `sanitizePayload(schema.parse(values))` (`rhApi.ts:48,65`). Confirmado também que
`ColaboradorFormDialog` (`RhDialogs.tsx:59-110`) não tem nenhum campo, estado ou referência a
`pessoaId` ou "Pessoa" — grep vazio no arquivo inteiro.

Existe `GET /api/pessoas` já consumido por `features/pessoas/api/pessoasApi.ts:26` — a fonte de
dados para um seletor de Pessoa já existe no frontend, só não está ligada a este formulário.

`ColaboradorResponse.pessoaId` (tipo `Guid | null`, `features/rh/types/rh.types.ts:94`) já é lido
como campo tolerado, mas **nenhum componente exibe** esse valor hoje — grep de `pessoaId` em
`features/rh/components/*.tsx` não retornou nada. Destino atual: **sem uso**.

## 4. Estados de tela por superfície

Nenhuma tela nova existe ainda: `app/(main)/seguranca/cargos-acesso/` **não existe**
(`ls` confirmou `ENOENT`). Três superfícies são tocadas por esta fatia; as duas primeiras já
existem e têm estado hoje, a terceira é nova.

| Superfície | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/seguranca/cargos-acesso` (tela nova, cargos + vínculo de grupo) | ausente — não existe | ausente | ausente | ausente | ausente | ausente | ausente |
| `UsuariosPage` (`features/seguranca/components/UsuariosPage.tsx`) — onde a atribuição de cargo por empresa/filial provavelmente ganha uma ação | presente — `usuariosQuery.isFetching`/`DataTableServer loading` (linha 183) | presente — `EmptyState` (linha 210) | presente — `ApiErrorPanel` para usuários e grupos (linhas 180-181) | não verificado — não há teste de erro 5xx observado, só o painel de erro recuperável | presente — atualização de lista via query invalidada (padrão React Query do módulo) | presente — `PermissionGuard mode="disable"` no botão "Novo usuário" (linhas 167-169) | presente — `SegurancaActionDialogs.tsx:109-125` usa `title` com o texto "Permissão necessária: `<CODE>`." quando `disabled` |
| `ColaboradorFormDialog` (admissão, `features/rh/components/RhDialogs.tsx:59-110`) | presente — prop `loading` no footer (linha 93, via `footer()`) | não se aplica (formulário, não listagem) | presente — erros de campo via `FieldError` após `safeParse` (linhas 82-86); erro de submissão em si depende do `onSubmit` do chamador, **não verificado neste arquivo** | não verificado | não verificado — depende do `onSubmit` do hook `useRhResources` | não verificado — não há `PermissionGuard` dentro do próprio dialog; a permissão `RH_GERENCIAR` teria de estar na ação que abre o dialog, não localizada neste arquivo | não se aplica ao campo `pessoaId` hoje, porque o campo não existe na tela |

## 5. Precedência — medida, não deduzida (pendência B-1)

O anexo pergunta qual tem prioridade entre acesso pessoal, grupo e cargo. O código responde de
forma direta e **documentável por arquivo:linha**, e a resposta diverge do que
`docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md:707-736` descreve como duas alternativas equivalentes
("— ou —" entre vincular grupo direto e atribuir cargo).

**O que decide se uma chamada HTTP passa** (`RequiredPermission`): `PermissionAuthorizationHandler`
chama `ICurrentUserService.HasPermission` (`Erp.Api/Authorization/PermissionAuthorizationHandler.cs:31`),
que lê a claim `"permission"` do JWT (`Erp.Infrastructure/Auth/CurrentUserService.cs:24-32`). Essa
claim é gravada no token **só no login/refresh**
(`Erp.Application/Security/Auth/AuthUserSessionIssuer.cs:39-44`), a partir de
`IUsuarioRepository.ObterCodigosPermissoesAsync`, cujo SQL (medido em
`Erp.Infrastructure/Security/UsuarioRepository.cs:75-84`) lê **exclusivamente**:

```
UsuarioGrupoAcessos (vínculo direto usuário↔grupo, Ativo=true)
  → GrupoAcesso.Permissoes (lista achatada, tabela GrupoAcessoPermissao)
```

**O que `permissoes-efetivas` calcula** (`ObterPermissoesEfetivasUsuarioUseCase.cs`,
`CargosAcessoRepository.ObterPermissoesUsuarioAsync:102-133`) lê uma cadeia **inteiramente
diferente**:

```
UsuarioCargoAcesso (vínculo por empresa/filial, com vigência)
  → CargoAcessoGrupo (grupo vinculado ao cargo)
    → GrupoAcessoMatrizPermissao (tabela separada — "matriz estruturada")
```

As duas cadeias não se tocam. `GrupoAcesso.Permissoes` (flat) e `GrupoAcessoMatrizPermissao`
(matriz) são tabelas distintas, escritas por endpoints distintos
(`AdicionarPermissaoGrupoRequest`/`RemoverPermissaoGrupoRequest` vs.
`SalvarMatrizPermissoesGrupoRequest` — `SalvarMatrizGrupoAcessoUseCase.cs:76-100`), sem nenhuma
sincronização entre elas encontrada no código lido.

Consequência medida, não deduzida: **atribuir ou remover um cargo de acesso de um usuário
(`cargos-empresa`/`cargos-filial`) não muda em nada o que esse usuário pode de fato chamar.** O
`CargosAcessoPermissionInvalidator` invalida o cache Redis de permissões do usuário
(`CargosAcessoPermissionInvalidator.cs:17-24`), mas a função que **reconstrói** esse cache
(`ObterCodigosPermissoesAsync`) nunca lê `CargoAcesso`, `CargoAcessoGrupo` nem
`GrupoAcessoMatrizPermissao` — a invalidação dispara sem que a fonte de reconstrução dependa do dado
invalidado. O mesmo padrão se repete quando a matriz estruturada de um grupo é salva
(`SalvarMatrizGrupoAcessoUseCase.cs:105-109` invalida o mesmo cache, pela mesma razão inerte).

Em outras palavras: **o único mecanismo que concede acesso real hoje é o vínculo direto
usuário↔grupo** (`POST /usuarios/{id}/grupos-acesso`, já consumido pelo frontend em
`segurancaApi.ts:136-141`). Cargo de acesso, vínculo cargo↔grupo e matriz estruturada de grupo
alimentam **somente** a simulação exibida por `permissoes-efetivas` — uma tela de "acesso efetivo"
construída sobre esses dados mostraria algo que **não corresponde** ao que o `RequiredPermission`
realmente concede.

Isto não é `não verificado`: é medido, com os sete arquivos citados acima abertos por inteiro. O que
seria dedução — e por isso não é afirmado aqui — é *por quê* o backend tem duas cadeias paralelas
(migração em andamento? feature desativada por decisão de produto?). Essa pergunta é pendência de
contrato (ver bloco JSON).

## 6. Divergências

```text
1. RemoverGrupoCargoAcessoRequest não está documentado no bloco de records de
   docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md (§ Security/CargosAcesso, linhas 3256-3268), só na
   tabela de rotas (linha 2011). Existe no código-fonte (CargosAcessoController.cs:94) com a
   assinatura `(string Motivo)`, idêntica em forma às demais.

2. Precedência entre grupo direto, cargo de acesso e matriz estruturada — a cadeia que alimenta
   `RequiredPermission` (grupo direto, tabela flat) é INTEIRAMENTE DIFERENTE da cadeia que
   `permissoes-efetivas` calcula (cargo → grupo-do-cargo → matriz estruturada). Uma tela construída
   sobre `permissoes-efetivas` mostraria acesso que o backend não concede de fato. Ver §5, com
   citação de arquivo:linha para cada elo. Isto é o conteúdo da pendência B-1 — aqui já não é mais
   "não verificado", é medido; falta é decisão de produto/arquitetura sobre o que fazer com o
   achado.

3. Duas invalidações de cache de permissão são inertes: `CargosAcessoPermissionInvalidator` (ao
   atualizar cargo, vincular/remover grupo do cargo, atribuir cargo a usuário) e a invalidação em
   `SalvarMatrizGrupoAcessoUseCase.cs:105-109` — ambas disparam `InvalidarPermissoesUsuarioAsync`,
   mas a função de reconstrução do cache (`UsuarioRepository.ObterCodigosPermissoesAsync`) nunca lê
   os dados que motivaram a invalidação. Não é bug de frontend, é comportamento do backend a
   registrar.

4. Swagger declara `nome`/`descricao`/`motivo` como `"nullable": true` em `CriarCargoAcessoRequest`,
   `AtualizarCargoAcessoRequest`, `VincularGrupoCargoAcessoRequest` e
   `RemoverGrupoCargoAcessoRequest`, mas o C# declara `string` não-anulável para `Nome` e `Motivo`
   em todos os casos, e o domínio rejeita vazio/whitespace em runtime. Generaliza a armadilha 1 do
   plano (que citava só enum): o Swagger deste backend também erra nulidade de `string`
   obrigatória. Fonte de verdade é o C#, não o Swagger — já assim tratado neste inventário.

5. `AtribuirCargoEmpresa`/`AtribuirCargoFilial` retornam 204 sem corpo
   (`UsuariosCargosAcessoController.cs:31,44`), mas o Swagger publica
   `"200": {"description": "OK"}` para as duas rotas. Divergência Swagger × código; sem
   consequência de contrato porque nenhum consumidor lê corpo de uma resposta 204.

6. `AdmitirColaboradorRequest.PessoaId` não tem checagem de existência nem no
   `AdmitirColaboradorRequestValidator` (FluentValidation) nem no fluxo de `RhService`/`Colaborador`
   — aceita qualquer Guid, inclusive de Pessoa inexistente, e grava sem validar. Achado a registrar,
   não corrigir aqui.

7. `ColaboradorResponse.pessoaId` já é lido pelo tipo do frontend (`rh.types.ts:94`) mas nenhum
   componente hoje exibe esse valor — destino atual `sem uso`.

8. `CargoAcessoResponse` não tem tipo, schema nem consumidor no frontend hoje — zero grep-hits em
   `features/seguranca/{types,schemas}/*.ts`. Consistente com "1 de 9 endpoints consumidos", já
   medido no plano da fatia; registrado aqui porque também vale para o campo `gruposAcessoIds`, que
   é campo **derivado** (só vínculos ativos) e precisa ser tratado como tal quando a tela for
   construída.
```

## 7. O que fica para o Bloco B, sem proposta de solução

Este inventário não desenha tela. Ficou de fora, de propósito: nome de componente, agrupamento de
campos em formulário, ordem de abas, padrão de diálogo. Fica registrado apenas que o padrão de
estado já existe em `SegurancaActionDialogs.tsx` e `UsuariosPage.tsx` (loading, vazio, erro
recuperável, permissão negada via `PermissionGuard mode="disable"` com `title` explicando o motivo)
e pode ser observado como precedente — decidir se ele se repete é do arquiteto, não deste documento.

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "cargos-de-acesso-e-pessoa-do-colaborador",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/06-inventario-cargos-de-acesso.md",
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    {
      "tipo": "backend",
      "pergunta": "Por que existem duas cadeias paralelas de permissão (grupo direto ao usuário, que decide RequiredPermission; e cargo→grupo-do-cargo→matriz estruturada, que só alimenta permissoes-efetivas)? É migração em andamento, feature ainda não ligada, ou desenho intencional de simulação sem efeito prático?",
      "decide": "se a tela de cargos de acesso pode ser apresentada como 'concede acesso' ou precisa ser rotulada como simulação/preview sem efeito real — é a pendência B-1 do plano da fatia, agora com evidência de código em vez de suposição"
    },
    {
      "tipo": "backend",
      "pergunta": "PessoaId em AdmitirColaboradorRequest deveria validar existência da Pessoa (como CargoId/SetorId/JornadaId já fazem)?",
      "decide": "se a UI pode confiar num Guid de Pessoa aceito pelo backend, ou precisa validar client-side antes de enviar"
    },
    {
      "tipo": "backend",
      "pergunta": "RemoverGrupoCargoAcessoRequest deveria constar no bloco de records de docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md?",
      "decide": "correção de documentação, não bloqueia a fatia — já supri a lacuna neste inventário com a assinatura medida no código-fonte"
    }
  ],
  "riscos": [
    "Se o Bloco B construir a tela de cargos-acesso apresentando 'atribuir cargo' como equivalente a 'conceder acesso', a tela mentirá sobre o efeito da ação — o cargo não altera nenhuma permissão real hoje (§5). Isto é mais grave que a ilusão de clicar já mapeada em accessRisk: é a tela inteira sendo, de fato, um preview sem efeito, sem dizer isso ao usuário.",
      "AtribuirCargoEmpresa/AtribuirCargoFilial devolvem 204 sem corpo; se o Bloco B assumir CargoAcessoResponse como retorno dessas duas chamadas (por analogia com Criar/Atualizar/VincularGrupo), o parse quebra em runtime.",
      "PessoaId sem validação de existência no backend significa que um erro de seleção na tela de admissão só aparece depois, quando alguém tentar usar o vínculo — não há como a UI confiar em 201 como confirmação de que a Pessoa referenciada existe."
  ]
}
```
