# Inventário: Endereços da Pessoa (rodada de arquitetura 15, recorte `b73`)

Agente: `inventariante-contrato-tela`. Branch `codex/v1.11.0a8b73-endereco-pessoa`, criada sobre a `b72`.
Recorte: endereços da Pessoa (listar, criar, editar, marcar principal, excluir), conteúdo da `b60` da D53 renumerado `b73`
pela D97. Profundidade: o que o endereço aciona (o `DestinatarioFiscalResolver`, o vínculo de município e os links `DestinatarioSem*`),
só para dizer onde a `b73` termina e a `b74` começa. Não debate desenho nem propõe solução.

**Árvore medida:**

- **Frontend:** HEAD `a3cf5e3` (`feat(release): v1.11.0a8b72`), branch `codex/v1.11.0a8b73-endereco-pessoa`. `git status --short`
  fora de `.codex/`, `.agents/` e `.claude/settings.local.json` mostra **0 linhas**, no início e no fim da sessão. Todas as
  citações `arquivo:linha` do frontend valem para esse commit.
- **Backend** (`../New project 3/src`, só leitura): branch `fix/v1.23.3-g3-crt-com-semantica-de-manutencao`, HEAD `0387e44`
  (`feat(fiscal): separa FCP e prepara XML oficial`), `git status --short | wc -l` = **0** (árvore limpa). O HEAD andou um commit desde a
  rodada 14 (`ab5d00a` → `0387e44`); `git diff --stat ab5d00a..0387e44` nos caminhos `Erp.Application/Pessoas`, `Erp.Domain/Pessoas`,
  `DestinatarioFiscalResolver.cs` e `Erp.Api/Controllers/Pessoas` devolve **vazio**: o recorte não mudou.

**Fontes vivas:**

- **Código do backend:** lido (controller, request/response, validadores, domínio, use cases, repositório, configuração EF, resolvers
  fiscais). "Confirmado no backend" quer dizer **lido no C#**, e não observado em execução. Não houve chamada HTTP autenticada
  (não há credencial). Onde só a resposta real responderia, a linha diz **não verificado**.
- **Banco dev: NÃO VERIFICADO nesta sessão.** `docker exec logosoft-postgres psql ...` devolveu
  `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ... O sistema não pode encontrar o arquivo
  especificado`: o daemon do Docker Desktop não está rodando. Não o iniciei (o `CLAUDE.md` manda Docker só sob pedido
  explícito). As contagens de pessoas, endereços principais e municípios **não foram medidas por mim hoje**; a §8 traz o que
  consta de medições anteriores, com a origem de cada uma, e o que é leitura de arquivo do repositório (que não é o banco).
- **Gates e testes:** nenhum executado. Tudo é leitura de código, contratos e documentos.

**Entrada que este inventário respeita, sem redecidir:** D47 item 2, D49 item 2, D50, D52, D53, D97, D98 a D101
(`docs/arquitetura/DECISOES.md:1406-1475,2466-2584`).

---

## 0. As duas perguntas do briefing

### 0.1 O que impede um faturamento de concluir depois desta fatia (medido no C#)

O Confirmar Faturamento chama, nesta ordem, o leg 1 `GerarNotaFiscalPedidoVenda` (`ConfirmarFaturamentoUseCase.cs:117-121`), os
legs 2-3 `GerarXmlEnvio` + `AssinarXml` (`:158-172`) e o leg 4 SEFAZ (`:182-198`). Sobre o **endereço do destinatário**, a cadeia é:

| # | Barreira (código de erro) | Onde, no C# | A `b73` a remove? |
| --- | --- | --- | --- |
| 1 | Com natureza informada, o leg 1 chama `ResolverUfsAsync`, que resolve **primeiro o emitente** (`CfopDoItemResolver.cs:92`) e **depois o destinatário** (`:98`); `GerarNotaFiscalPedidoVendaUseCase.cs:141,149` | `GerarNotaFiscalPedidoVendaUseCase.cs:141-153` | n/a (é o ponto de entrada) |
| 2 | `Fiscal.DestinatarioSemEnderecoFiscal`: pessoa sem **nenhum endereço ativo** | `DestinatarioFiscalResolver.cs:157-166` | **Sim**: é a falha de hoje (banco dev anterior: 0 endereços) |
| 3 | `Fiscal.DestinatarioSemEnderecoPrincipal`: ativos, mas nenhum com `Principal` | `:168-175` | Não é alcançável pela API (a invariante do domínio mantém um principal, `Pessoa.cs:162-166`); só dado legado por carga direta |
| 4 | `Fiscal.DestinatarioEnderecoFiscalIncompleto`: UF vazia ou ≠ 2 caracteres | `:179-182` | Não é alcançável pela API (`EnderecoPessoa.cs:161-175` valida UF de 2 letras); só dado legado |
| 5 | **`Fiscal.DestinatarioSemMunicipioIbge`**: `endereco.MunicipioIbgeId` nulo | `:184-187` | **Não.** `POST` e `PUT` do endereço **não aceitam município** (§3.2). O endereço criado pela `b73` nasce com `MunicipioIbgeId = null` e **para exatamente aqui** |
| 6 | `Fiscal.DestinatarioMunicipioIbgeNaoEncontrado` | `:189-193` | n/a (dado quebrado) |
| 7 | `Fiscal.DestinatarioMunicipioUfDivergente` | `:198-202` | n/a (o domínio zera o vínculo na troca de UF, `EnderecoPessoa.cs:60-71`) |

Resposta curta: **depois da `b73`, o leg 1 deixa de falhar por falta de endereço e passa a falhar por falta de município no
endereço (linha 5)**. O único caminho de escrita do município é `PATCH /api/pessoas/{id}/enderecos/{enderecoId}/municipio`, com
outra permissão (`PESSOAS_DADOS_FISCAIS_GERENCIAR`, `PessoasController.cs:179-180`), ou o `backfill-municipios`
(`:196-197`, mesma permissão). Nenhum dos dois é consumido pelo frontend (§2).

Outras barreiras no mesmo caminho, **fora do endereço de Pessoa**, medidas só até onde o código as torna visíveis:

- **Emitente primeiro.** `ResolverUfsAsync` falha antes do destinatário se a empresa/filial não tem endereço fiscal completo com município
  (`EmitenteFiscalResolver.cs:160-171`: `EmitenteSemEnderecoFiscal`, `EmitenteEnderecoFiscalIncompleto`, `EmitenteSemMunicipioIbge`). O estado
  das 2 empresas do dev **não foi medido** (Docker); não sei se passam.
- **Natureza com CFOP mapeado** para o âmbito e o tipo de item (`GerarNotaFiscalPedidoVendaUseCase.cs:141-232`; b72 entregou a tela; o
  banco dev tinha 0 naturezas na rodada 14).
- **Município na tabela.** O vínculo busca o município pelo código IBGE (`VincularMunicipioEnderecoPessoaUseCase.cs`, `ObterMunicipioPorCodigoAsync`,
  `CadastroFiscalConsultaService.cs:90-104`): inexistente → `FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO`; inativo → `..._MUNICIPIO_INATIVO`.
  O CSV de seed do repositório tem **27 capitais** (§8); o que o banco dev tem hoje **não foi medido**.
- **Leg 2 em diante** (`NotaFiscalXmlPipelineUseCases.cs:53`; `FiscalConfiguracaoEmissaoResolver.cs:42-74`): configuração fiscal habilitando o
  documento, e todo item com NCM e CFOP. Leg 3 (certificado) e leg 4 (SEFAZ): **não lidos até o fim**; estão fora do recorte e não afirmo que passam.
- **O que NÃO está no caminho do Confirmar** (medido por `grep`): `DestinatarioSemIndicadorContribuinteIcms` só sai de
  `ContextoTributarioDocumentoResolver.cs:96-100`, chamado por `CalculoTributarioNotaFiscalService` ← `ValidarNotaFiscalUseCase.cs:163` e
  `CalcularTributosNotaFiscalUseCase.cs:58`. Os únicos chamadores de `CalcularAsync(nota` e do `ValidarNotaFiscalUseCase` são esses dois; o
  Confirmar não chama nenhum (os legs 2 e 3 chamam `ValidarPrerequisitosEmissaoSefazAsync` e o `INotaFiscalXmlBuilder`, e o `NotaFiscalXmlBuilder.cs`
  em uso tem **0** referências a `Pessoa|Destinat|Endere|Municipio`, `grep -i`). Ou seja: o indicador de contribuinte barra o **Validar** e o
  **Calcular tributos** da nota, e não o Confirmar Faturamento, pelo que li. **Não verifiquei o leg 4 inteiro.**
- **`NfeXmlOficialBuilder.cs` (commit `0387e44`)** usa o endereço do destinatário (`xLgr`, `nro`, `xCpl`, `xBairro`, `cMun`, `xMun`, `UF`, `CEP`;
  `NfeXmlOficialBuilder.cs:97-106`) e tem **0 referências fora do próprio arquivo** (`grep -rn NfeXmlOficialBuilder`): ainda não está ligado ao pipeline.
  Quando for, os 8 campos do endereço da Pessoa viram o `enderDest`.

### 0.2 A `b73` é viável sem tocar em município? Qual a fronteira real entre `b73` e `b74`?

**Tecnicamente sim; a fronteira é uma linha do backend, e ela já existe separada em duas permissões e dois verbos.**

| Lado | O que cabe | Evidência |
| --- | --- | --- |
| **`b73`** (permissão `PESSOAS_CONSULTAR` / `PESSOAS_GERENCIAR`) | `GET`, `POST`, `PUT`, `POST …/principal`, `DELETE` de `/api/pessoas/{id}/enderecos[/{enderecoId}]`; 9 campos de escrita (`tipo`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cep`, `principal`); exibir `municipioIbgeId` como "vinculado: sim/não" (o Guid não traz o nome) | `PessoasController.cs:108-170`; `EnderecoContatoRequests.cs:5-25` |
| **`b74`** (permissão `PESSOAS_DADOS_FISCAIS_GERENCIAR`) | `PATCH …/{enderecoId}/municipio` (`municipioIbgeCodigo`, 7 dígitos), `POST /enderecos/backfill-municipios`, a busca de município, os links `DestinatarioSem*` | `PessoasController.cs:179-207`; D53 (`b61`: "vínculo de município no endereço") |

O que a `b73` **não consegue sem a `b74`:** fazer o leg 1 passar (linha 5 da §0.1). O que a `b73` **tem de saber do município** mesmo sem tocar
nele (fatos, sem decidir): (a) `PUT` com **UF diferente zera `MunicipioIbgeId`** (`EnderecoPessoa.cs:60-71`); (b) `PUT` com **cidade diferente,
mesma UF, mantém** o vínculo antigo (EP-2); (c) a resposta traz só `municipioIbgeId` (Guid), e **não existe filtro por Id** em
`GET /api/fiscal/cadastros/municipios` (`CadastrosFiscaisController.cs:63-76`: `ufSigla`, `termo`, `codigoIbge`, `ativo`, `pagina`,
`tamanhoPagina`); o precedente do endereço da empresa resolve o Guid em dois passos (`useEnderecoFiscalCatalogos.ts:89-125`); (d) o campo `cidade`
do endereço é **texto livre obrigatório** (`NotEmpty`, ≤ 120), e a D52 trava município por busca no servidor; a relação entre os dois é a
pergunta funcional **PF-1** (§ Pendências).

---

## 1. Telas e rotas

**Não existe tela, aba nem componente de endereço de Pessoa no HEAD.** `grep -rli endereco features/pessoas features/clientes
features/fornecedores` → **0 arquivos**; os únicos arquivos com "endereco" no frontend são de `features/administracao` (9 arquivos: api, schemas, types, 2 hooks e 4 componentes) e um comentário em
`features/produtos/components/ProdutoFormDialog.tsx:65`. Não há `CepInput` em `components/forms/` nem validador de CEP em `lib/validators/`.

| Rota / superfície | Arquivo de página | Componente da feature | Permissão exigida | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/pessoas` (a lista que abre o diálogo de edição) | `app/(main)/pessoas/page.tsx` (5 linhas) | `PessoasPage` (`features/pessoas/components/PessoasPage.tsx`, 127 linhas) | Regra de rota: `PESSOAS_CONSULTAR` **ou** `PESSOAS_GERENCIAR` (`routePermissions.ts:15`). **A página nega sem `PESSOAS_CONSULTAR`** (`PessoasPage.tsx:53-55`, `UnauthorizedState`): quem tem só `GERENCIAR` entra na rota e vê "sem autorização" | union `types/erp.ts:255-258`; catálogo FE `permissoesCatalogo.ts:46-49`; snapshot `backend-permissions.snapshot.json:153-156`; backend `SystemPermissions.cs:46-49`; catálogo estruturado `PermissoesCatalogoDefinition.cs:37-44` (recurso "Pessoas", rota `/pessoas`); menu `AppMenu.tsx:75` (pai `:73`) |
| **Aba "Endereços" do `PessoaFormDialog`** (D49 item 2) | — | **inexistente**. O diálogo (`PessoaFormDialog.tsx`, 140 linhas) tem 3 abas no `TabView` (`:84`): "Dados gerais" (`:85`), "Documentos e observações" (`:115`), "LGPD e auditoria visual" (`:134`) | listar: `PESSOAS_CONSULTAR`; escrever: `PESSOAS_GERENCIAR` (backend, §6). O diálogo só abre pelas ações "Editar" e "Nova pessoa", ambas com `permission: 'PESSOAS_GERENCIAR'` (`PessoasPage.tsx:101-103,119`) | — |
| `/pessoas/classificacoes` | `app/(main)/pessoas/classificacoes/page.tsx` | `ClassificacoesPessoaPage` | `PESSOAS_CONSULTAR` (`routePermissions.ts:14`) | vizinha; fora do recorte |
| `/clientes`, `/fornecedores` | `app/(main)/clientes`, `…/fornecedores` | `ClientesPage`, `FornecedoresPage` | `CLIENTES_*`, `FORNECEDORES_*` (`routePermissions.ts:16-17`) | só **leem** a lista de Pessoa para um seletor (`usePessoas`); **0** referência a endereço |
| Destino de link do erro `DestinatarioSem*` (D50 item 3) | `/pessoas` não lê `searchParams` (`grep -rn "useSearchParams\|searchParams" features/pessoas "app/(main)/pessoas"` → **0**) | — | — | o mapa `fiscalErrosCadastroMap` (`fiscalErrosCadastro.ts:29-44`) tem **2 entradas** (série e CFOP); nenhuma `DestinatarioSem*` |
| Diálogo de edição aberto a partir do item da lista | `PessoasPage.tsx:119,123` | `setSelected(row)` | — | **não existe `GET /api/pessoas/{id}`** (o controller só tem `GET` da lista, `PessoasController.cs:22-28`); o diálogo parte do `record` da lista |

- **Quem consome `usePessoas`:** 18 arquivos (`grep -rln "usePessoas\b" features app components`), em 11 módulos. Nenhum lê endereço.
- **Rota nova, item de menu novo, regra de rota nova:** o desenho da D49 item 2 (aba) **não exige nenhuma das três edições**. Fato registrado,
  não decisão: a permissão do union já existe (`PESSOAS_CONSULTAR`, `PESSOAS_GERENCIAR`), a rota `/pessoas` já tem regra, e o item de menu já existe.
- **`PermissionCode`:** `PESSOAS_DADOS_FISCAIS_GERENCIAR` está no union (`types/erp.ts:258`) e no catálogo FE (`:49`), com **0 consumidores** em
  `features app lib layout components` (`grep`). É a permissão do `PATCH …/municipio` e do backfill.

## 2. Endpoints consumidos e existentes

O `scripts/backend-contract-map.allowlist.json` está `audit-only-no-suppressions` (`suppressions: []`, `documentedDivergences: []`) e tem **0**
ocorrências de `enderecos`. O gate compara a rota consumida com o catálogo de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`, e as 7 rotas de endereço
constam dele (`:1744-1750` mais o `GET` da lista e o `DELETE`). Nenhuma é consumida: o gate nada tem a dizer hoje. Não rodei `npm run validate:backend-contract-map`:
**não verificado** por gate.

| Método + rota | Arquivo em `features/pessoas/api/` | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/pessoas/{id}/enderecos` | **nenhum** (`pessoasApi.ts` tem 4 rotas de Pessoa e 4 de classificação: `:43-72,77-100`) | nenhum | `CONTRATO-API-v1.23.md:12808-12833` ("Frontend ❌ não consome"); `GAP-FRONTEND-BACKEND.md:149`; `BACKEND-ESTADO…:1744` | sim, `PessoasController.cs:108-119`, `PESSOAS_CONSULTAR`. **200** com `IReadOnlyList<EnderecoPessoaResponse>`, **sem paginação**, **só endereços ativos** (`ListarEnderecosPessoaUseCase.cs`: `.Where(x => x.IsActive)`) |
| `POST /api/pessoas/{id}/enderecos` | nenhum | nenhum | `CONTRATO…:12836-12876`; `GAP…:150`; `BACKEND-ESTADO…:1745` | sim, `:121-132`, `PESSOAS_GERENCIAR`. **201** com `EnderecoPessoaResponse` e `Location` (`:131`) |
| `PUT /api/pessoas/{id}/enderecos/{enderecoId}` | nenhum | nenhum | `CONTRATO…:12888-12928`; `GAP…:151`; `BACKEND-ESTADO…:1746` | sim, `:134-145`, `PESSOAS_GERENCIAR`. **200** com `EnderecoPessoaResponse` |
| `POST /api/pessoas/{id}/enderecos/{enderecoId}/principal` | nenhum | nenhum (sem corpo) | `CONTRATO…:12966-12990`; `GAP…:153`; `BACKEND-ESTADO…:1747` | sim, `:147-158`, `PESSOAS_GERENCIAR`. **200** com `EnderecoPessoaResponse` |
| `DELETE /api/pessoas/{id}/enderecos/{enderecoId}` | nenhum | nenhum | `CONTRATO…:12879-12885`; `GAP…:152`; `BACKEND-ESTADO…:1748` | sim, `:160-170`, `PESSOAS_GERENCIAR`. **204 sem corpo** |
| `PATCH /api/pessoas/{id}/enderecos/{enderecoId}/municipio` (**b74**) | nenhum | nenhum | `CONTRATO…:12931-12963`; `GAP…:154`; `BACKEND-ESTADO…:1749` | sim, `:179-190`, **`PESSOAS_DADOS_FISCAIS_GERENCIAR`**. **200** com `EnderecoPessoaResponse` |
| `POST /api/pessoas/enderecos/backfill-municipios` (**b74**) | nenhum | nenhum | `CONTRATO…:13010-13033`; `GAP…:155`; `BACKEND-ESTADO…:1750` | sim, `:196-207`, `PESSOAS_DADOS_FISCAIS_GERENCIAR`. **200** com `BackfillMunicipiosEnderecosPessoaResponse` |

Contagem: **7 rotas de endereço, 0 consumidas (0%)**, 5 no recorte da `b73` e 2 da `b74`. O `GAP` diz "Pessoas — faltam 15 de 19"
(`GAP:144`); 15 = 7 de endereço + 5 de contato + `dados-fiscais` + `bloquear` + `desbloquear`. A contagem do `GAP` **bate**.

Rotas vizinhas que a aba tocaria **só na `b74`** (já consumidas pelo precedente do endereço da empresa, em `features/administracao/api/administracaoApi.ts:250,256`):
`GET /api/fiscal/cadastros/uf` e `GET /api/fiscal/cadastros/municipios`, ambas `FISCAL_CADASTROS_CONSULTAR`.

**Cliente HTTP existente (`features/pessoas/api/pessoasApi.ts:14-20`):** `runPessoaRequest` captura o erro e lança `new Error(apiError.message)`: **`code`,
`status`, `traceId` e `validationErrors` são descartados** (o padrão de preservar o `code` da D93 está em `faturamentoApi.ts`, não aqui). Efeito: a `PessoasPage`
renderiza `ApiErrorPanel` com `mapApiError(listQuery.error)` (`:112`) de um `Error` só com mensagem, e o painel não mostra código nem trace.

## 3. Campos

**Como medi:** li os records C# e o tipo TypeScript lado a lado, nome a nome. Como **não existe tipo, schema nem client de endereço no
frontend**, as colunas "Tipo no frontend" e "Destino declarado" dizem "não declarado" para todo campo do endereço. **Fórmula:** declarados pelo
frontend = entregues com destino + divergência (lido e não entregue) + sem uso. Campo entregue pelo backend e não declarado fica à parte.

### 3.1 `EnderecoPessoaResponse` (`EnderecoContatoResponse.cs:6-19`, 13 campos) × frontend (0 declarados)

Serve as 4 rotas que devolvem um endereço (POST, PUT, principal, PATCH município) e, em lista, o GET.

| Campo | Tipo C# | Tipo no frontend | O backend entrega? | Destino declarado | Observação (fonte) |
| --- | --- | --- | --- | --- | --- |
| `Id` | `Guid` | não declarado | sim | não declarado | `enderecoId` das rotas de escrita |
| `PessoaId` | `Guid` | não declarado | sim | não declarado | igual ao `{id}` do path |
| `Tipo` | `TipoEndereco` | não declarado (enum **não existe** no frontend, §4.1) | sim | não declarado | JSON numérico (§4.1) |
| `Logradouro` | `string` | não declarado | sim | não declarado | ≤ 200 |
| `Numero` | `string` | não declarado | sim | não declarado | ≤ 30; texto ("S/N" vale) |
| `Complemento` | `string?` | não declarado | sim | não declarado | ≤ 120; vazio vira `null` |
| `Bairro` | `string` | não declarado | sim | não declarado | ≤ 120 |
| `Cidade` | `string` | não declarado | sim | não declarado | ≤ 120; **texto livre**, fonte textual mesmo depois do vínculo (`EnderecoPessoa.cs:42-47`) |
| `Uf` | `string` | não declarado | sim | não declarado | 2 letras, maiúsculas |
| `Cep` | `string` | não declarado | sim | não declarado | **só 8 dígitos** (`NormalizarCep`, `EnderecoPessoa.cs:177-187`); a resposta não traz máscara |
| `Principal` | `bool` | não declarado | sim | não declarado | §4.2 |
| `Status` | `EntityStatus` | não declarado (o enum `EntityStatus` existe, `types/erp.ts:6-12`, igual ao C#) | sim | não declarado | na **lista** é sempre `Ativo` (1): a lista filtra `IsActive` |
| `MunicipioIbgeId` | `Guid?` | não declarado | sim | não declarado | **é o campo que o resolver lê** (`DestinatarioFiscalResolver.cs:184`); nulo até o `PATCH` da `b74` |

Conta: **13 entregues = 0 declarados + 13 não declarados**. Fecha.

### 3.2 Requests de escrita do endereço: o que o backend aceita × o que existe no frontend

**`AdicionarEnderecoPessoaRequest`** (`EnderecoContatoRequests.cs:5-14`, **9** campos) e **`AtualizarEnderecoPessoaRequest`**
(`:16-25`, **9** campos, os mesmos nomes e tipos). Validador (`EnderecoContatoValidators.cs:5-33`) e domínio (`EnderecoPessoa.cs:11-26,48-75,129-186`):

| Campo | Tipo C# | Regra no validador (FluentValidation) | Regra no domínio | No frontend |
| --- | --- | --- | --- | --- |
| `Tipo` | `TipoEndereco` | `IsInEnum` | — | ausente |
| `Logradouro` | `string` | `NotEmpty`, `MaximumLength(200)` | `Trim`, obrigatório, ≤ 200 | ausente |
| `Numero` | `string` | `NotEmpty`, `MaximumLength(30)` | idem, ≤ 30 | ausente |
| `Complemento` | `string?` | `MaximumLength(120)` | opcional, vazio → `null`, ≤ 120 | ausente |
| `Bairro` | `string` | `NotEmpty`, `MaximumLength(120)` | idem, ≤ 120 | ausente |
| `Cidade` | `string` | `NotEmpty`, `MaximumLength(120)` | idem, ≤ 120 | ausente |
| `Uf` | `string` | `NotEmpty`, `Length(2)` (sobre o valor **cru**, antes do `Trim`) | `Trim`, `ToUpperInvariant`, 2 letras (`char.IsLetter`) | ausente |
| `Cep` | `string` | `NotEmpty` (só isso) | remove tudo que não é dígito e exige **8 dígitos** | ausente |
| `Principal` | `bool` | — | §4.2 | ausente |

Os 9 campos de escrita são os mesmos do `AdicionarEnderecoPessoaRequest` e do `AtualizarEnderecoPessoaRequest`. **Nenhum** campo é município:
`AdicionarEndereco` e `AtualizarEndereco` não recebem código nem id de município (`Pessoa.cs:129,146`).

**Os dois requests de município e backfill (`b74`):**

| Record | Campos | Regra | No frontend |
| --- | --- | --- | --- |
| `VincularMunicipioEnderecoPessoaRequest` (`:31`) | `MunicipioIbgeCodigo` (`string?`) | nulo/vazio **desvincula**; preenchido: `Length(7)` + `^[0-9]{7}$` (`EnderecoContatoValidators.cs:35-46`); existência e atividade vêm do cadastro fiscal | ausente (1) |
| `BackfillMunicipiosEnderecosPessoaRequest` (`:37`) | `EmpresaId` (`Guid`, `NotEmpty`), `FilialId` (`Guid?`) | confrontado com o contexto do usuário (`PessoaContextoOperacional`) | ausente (2) |

**`GET /api/pessoas/{id}/enderecos` não tem query** (só o path). `POST`, `PUT`, `principal` e `DELETE` também só têm path (`{id}`, `{enderecoId}`).

Conta dos requests: **9 + 9 + 1 + 2 = 21 campos no backend, 0 no frontend, 21 ausentes.** Parâmetros de path: `id` em 7 rotas e `enderecoId` em 4 (PUT, principal,
DELETE, PATCH); o backfill não tem path param.

**O contrato Swagger descreve os requests de forma menos estrita que o C#** (`CONTRATO-API-v1.23.md:12844-12856`): `tipo?`, `logradouro?: string | null`,
`numero?`, `bairro?`, `cidade?`, `uf?`, `cep?` todos opcionais. No C#, 7 dos 9 campos são obrigatórios. É a mesma armadilha 1 que o schema do endereço
da empresa já documentou (`administracaoSchemas.ts:33-34`). O contrato **não lista os valores de `TipoEndereco`** (só `Erp.Domain.Pessoas.TipoEndereco`);
os valores estão em `BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3482`.

### 3.3 Resposta do hospedeiro: `PessoaResponse` (`PessoaResponse.cs:7-29`, 22 campos) × `pessoas.types.ts:9-21` (12 campos)

A aba vive no diálogo da Pessoa, e o diálogo parte desse `record`. Não existe schema Zod de resposta (`pessoasApi.ts:44-47`: `httpClient.get<PessoaResponse[]>`, asserção de tipo).

| Campo (frontend) | Tipo | O backend entrega? | Destino declarado |
| --- | --- | --- | --- |
| `id` | `Guid` | sim | enviado (path de `PUT /api/pessoas/{id}` e `inativar`: `usePessoasResources.ts:24,29`; vira o `{id}` da aba) |
| `empresaId` | `Guid` | sim | sem uso (nenhuma leitura de `record.empresaId`; só `filterLocal` varre `Object.values(record)` para a busca local, `PessoasPage.tsx:34`) |
| `filialId` | `Guid \| null` | sim | sem uso (idem) |
| `tipoPessoa` | `TipoPessoa` | sim | exibido (`Tag`, `PessoasPage.tsx:114`) |
| `nomeRazaoSocial` | `string` | sim | exibido (`:115`); no form de edição (`PessoaFormDialog.tsx:29`) |
| `nomeFantasia` | `string \| null` | sim | exibido (`:116`); form (`:30`) |
| `documento` | `string` | sim | exibido, mascarado (`:117`) |
| `inscricaoEstadual` | `string \| null` | sim | exibido (campo do form de edição, `PessoaFormDialog.tsx:31`), reenviado no `PUT` |
| `inscricaoMunicipal` | `string \| null` | sim | exibido (form, `:32`), reenviado no `PUT` |
| `observacao` | `string \| null` | sim | exibido (form, `:33`), reenviado no `PUT` |
| `status` | `EntityStatus` | sim | exibido (`StatusTag`, `:118`); habilita ou desabilita Editar e Inativar (`isActive`, `:30,119`) |
| `createdAt` | `IsoDateTime?` | **não** (não há `CreatedAt` no record) | **lido pela UI e não entregue** (`OperationalGovernancePanel.tsx:28` lê `asRecord(record).createdAt`); EP-17 |

Conta do hospedeiro: **12 declarados = 9 com destino + 2 sem uso + 1 divergência (lido e não entregue)**. Fecha. Backend entrega **22 = 11 com par no
frontend + 11 não declarados** (`IndicadorContribuinteIcms`, `IndicadorIeDestinatario`, `InscricaoEstadualSt`, `Suframa`, `RegimeTributarioParceiro`,
`MunicipioIbgeId`, `PaisId`, `Bloqueada`, `MotivoBloqueio`, `ContribuinteIpi`, `TomadorOrgaoPublico`: bloco fiscal, `b74`). Fecha. O `04` §1.4.3 já
trazia essa mesma conta (12 × 22) e **continua certa**; `pessoas.types.ts` não mudou desde a `b67` (`git log -- features/pessoas/types/pessoas.types.ts`).

**Atenção a dois "municípios":** a `Pessoa` tem o seu `MunicipioIbgeId` (bloco fiscal, escrito por `PATCH /dados-fiscais`) e o **endereço** tem o dele. O
`DestinatarioFiscalResolver` lê **só o do endereço** (`:184`, `:189`). O da Pessoa não satisfaz o resolver.

### 3.4 Resposta do backfill (`b74`): `BackfillMunicipiosEnderecosPessoaResponse` + `DivergenciaMunicipioEnderecoResponse`

`EnderecoContatoResponse.cs:22-32`: `Analisados`, `Vinculados`, `Divergencias[]` (3 campos) e, por divergência, `EnderecoId`, `PessoaId`, `Cidade`, `Uf`,
`Motivo` (5 campos). Todos entregues, **nenhum declarado**: 8 = 0 + 0 + 0, mais 8 não declarados.

## 4. Enums, regras e semântica do backend

### 4.1 `TipoEndereco` e serialização

- `TipoEndereco` (`Erp.Domain/Pessoas/TipoEndereco.cs:3-10`): **6 valores**, `Comercial = 1`, `Residencial = 2`, `Entrega = 3`, `Cobranca = 4`, `Fiscal = 5`,
  `Outro = 99`. **Não existe equivalente no frontend** (`grep -rn "TipoEndereco\|tipoEndereco" features types lib tests` → **0**).
- **JSON numérico.** `grep -rn JsonStringEnumConverter src` → **0**; `Program.cs:28` chama `AddControllers` sem `AddJsonOptions`. O banco guarda texto
  (`HasConversion<string>`, `EnderecoPessoaConfiguration.cs:14,23`), mas a API fala número. **Não verificado em execução:** o que um corpo com o nome do enum devolve.
- **`Tipo` não tem efeito em nenhuma regra fiscal.** `grep -rn TipoEndereco src` fora de `Erp.Domain/Pessoas`, contratos e configuração → **0**. O
  `DestinatarioFiscalResolver` **não lê `Tipo`** (`grep "\.Tipo\b"` no arquivo → 0): o "endereço fiscal" do destinatário é o **endereço ativo marcado `Principal`**,
  qualquer que seja o `Tipo` (`:157-168`). Um endereço de `Tipo = Fiscal (5)` que não seja o principal **não** é usado.

### 4.2 "Principal": único **por pessoa**, não por tipo; só no domínio

Regra (`Pessoa.cs:129-200`):

| Operação | Efeito sobre `Principal` |
| --- | --- |
| `POST` (Adicionar) | `principal = true` rebaixa todos os ativos. **O primeiro endereço ativo vira principal mesmo com `principal: false`** (`principal \|\| !_enderecos.Any(x => x.IsActive)`, `:141`) |
| `PUT` (Atualizar) | `principal = true` rebaixa os outros ativos (`:152-158`). **`principal = false` no único principal é desfeito**: depois de gravar, se nenhum ativo é principal, o próprio endereço volta a `true` (`:162-166`). A resposta devolve `principal: true` |
| `POST …/principal` | rebaixa os outros e marca este (`:171-183`); devolve **só este** endereço |
| `DELETE` do principal | inativa e **promove o primeiro ativo restante** (`:185-200`, `FirstOrDefault(x => x.IsActive)` sobre a coleção carregada pelo EF, **sem ORDER BY** em `ObterPessoaComRelacionamentosPorIdAsync`, `PessoasRepository.cs:24-28`): qual vira principal não é determinístico pelo contrato; a resposta é `204` sem corpo |
| Último endereço excluído | a pessoa fica com 0 ativos e 0 principal; nada impede |

- **Único por pessoa.** Não há índice único no banco: `EnderecoPessoaConfiguration.cs:25-26` só indexa `PessoaId` e `(EmpresaId, FilialId)`. A invariante é do
  agregado, sem proteção contra duas requisições concorrentes (não há `xmin`/`RowVersion`: `grep` em `PessoaConfiguration.cs` e `EnderecoPessoaConfiguration.cs` → 0).
- **As respostas de mutação devolvem só o endereço tocado.** Os outros endereços rebaixados ou promovidos **não** voltam na resposta; quem consome precisa reler a lista.

### 4.3 Excluir: lógico, motivo fixo, sem reativação

- `DELETE` **inativa** (`endereco.Inativar(usuarioId, agora, "Endereço removido.")`, `Pessoa.cs:185-192`; evento de auditoria `AuditoriaAcao.Inativacao`,
  `RemoverEnderecoPessoaUseCase.cs`). O motivo é uma constante do servidor; o `DELETE` não tem corpo. Não há exclusão física.
- **Não há rota para reativar** endereço; `AuditableEntity.Reativar` não é chamado em `Erp.Application/Pessoas` nem `Erp.Domain/Pessoas` (`grep` → 0).
- A lista só devolve ativos; o endereço excluído **some** da API (o `PUT`, o `principal` e o `DELETE` sobre ele devolvem "Endereço não encontrado.", §4.5).
- Nada impede excluir o endereço que a nota fiscal já usou: o resolver **não faz snapshot** ("resolvido, não snapshotado", `DestinatarioFiscalResolver.cs:36-50`).

### 4.4 UF, CEP e cidade

- **UF:** o domínio exige 2 letras (`ValidarUf`, `EnderecoPessoa.cs:161-175`) e guarda em maiúsculas. O validador usa `Length(2)` sobre o valor cru, então `"SP "` falha no
  validador e passaria no domínio. **Não há validação contra as 27 UFs**: `"ZZ"` é aceito. Não existe `GET` de UF para endereço de Pessoa.
- **CEP:** qualquer string com exatamente 8 dígitos depois de remover o que não é dígito (`"12.345-678"` vale). **A resposta devolve só os 8 dígitos.**
- **Cidade:** texto livre ≤ 120. O backend **não** confere `Cidade` com o município vinculado.
- **Município no endereço:** `EnderecoPessoa.MunicipioIbgeId` (`Guid?`, FK com `Restrict`, `EnderecoPessoaConfiguration.cs:35-39`). Nunca é escrito por `Criar` nem por `Atualizar`.
  O `Atualizar` o **zera na troca de UF** (`:60-71`), **não** na troca de cidade (EP-2). O `VincularMunicipio` confere a UF do município com a do endereço (`:84-102`).

### 4.5 Erros e HTTP

- **Todo erro de validação ou de domínio sai como `PESSOAS_VALIDACAO` (400)**, com as mensagens do FluentValidation juntas por `" | "`
  (`PessoasValidation.cs:8-13`, `PessoaErrors.cs:22`). **Não há código por campo**: a UI só tem texto.
- **Pessoa inexistente** → `Error.NotFound("Pessoa", id)` → o `ApiErrorResponseFilter` o remapeia para **404** com corpo genérico `Recurso.NaoEncontrado`
  (`ApiErrorResponseFilter.cs:80-93`).
- **Endereço inexistente (ou já excluído)** em `PUT`, `principal` e `DELETE` → `DomainException("Endereço não encontrado.")` → **400 `PESSOAS_VALIDACAO`**, **não 404**
  (`Pessoa.cs:277-285`). Só o `PATCH` de município devolve o 404 (`PessoaErrors.cs:21`).
- **Pessoa inativa** → 400 `PESSOAS_VALIDACAO` "Pessoa inativa não pode ser alterada." em `POST`, `PUT`, `principal` e `DELETE` (`Pessoa.cs:326-332`). O `GET` funciona. **`Bloqueada`
  não é conferida** em nenhuma das cinco rotas.
- **Endereço inativo** não é alcançável pelas rotas (a busca é `LocalizarEnderecoAtivo`).
- **Auditoria:** cada rota de escrita grava um evento (`PessoasAuditoria`); texto fixo, sem dado do endereço.

### 4.6 Contexto organizacional: as cinco rotas do recorte **não têm guard** (EP-1)

`PessoaContextoOperacional.Validar` (`OrganizationalContextGuard`) é chamado por **3** use cases de Pessoas: `AtualizarDadosFiscaisPessoaUseCase`,
`VincularMunicipioEnderecoPessoaUseCase` e `BackfillMunicipiosEnderecosPessoaUseCase` (`grep -rl PessoaContextoOperacional Erp.Application/Pessoas`: a classe e esses 3). Os
use cases de `Listar`, `Adicionar`, `Atualizar`, `DefinirPrincipal` e `Remover` endereço **não o chamam**. Não há `HasQueryFilter` em nenhum lugar (`grep -rn HasQueryFilter src` → 0)
nem filtro de ação além do `ApiErrorResponseFilter` (`grep` por `IActionFilter|IAuthorizationFilter|IExceptionFilter` → 0), e o `PermissionAuthorizationHandler` não lê empresa
nem filial (`grep -i "empresa\|filial"` → 0). **Pela leitura, quem tem `PESSOAS_CONSULTAR`/`PESSOAS_GERENCIAR` lê e escreve o endereço de uma Pessoa de outra empresa só acertando o `{id}`.**
**Não medido em execução.**

## 5. FT-21: o que a `b73` fecha e o que fica para a `b74`

`DestinatarioFiscalResolver.cs:157-186` (a faixa citada na D97 e no `CHANGELOG:29`), **campo a campo do endereço**:

| O resolver exige | Campo do endereço | A `b73` escreve? | Fecha na `b73`? |
| --- | --- | --- | --- |
| ao menos 1 endereço **ativo** (`:157-166`) | existência | sim (`POST`) | **sim** |
| 1 ativo com `Principal` (`:168-175`) | `Principal` | sim (`POST`/`PUT`/`principal`) | **sim**, e a invariante já o garante pela API |
| `Uf` com 2 caracteres (`:179-182`) | `Uf` | sim | **sim** |
| `MunicipioIbgeId` não nulo (`:184-187`) | `MunicipioIbgeId` | **não** (`PATCH`, `PESSOAS_DADOS_FISCAIS_GERENCIAR`) | **não: `b74`** |
| município existe na tabela (`:189-193`) | idem | idem | `b74` |
| UF do município = UF do endereço (`:198-202`) | `Uf` × município | `Uf` sim; o vínculo não | `b74` |

Campos do endereço que a nota **não** exige do resolver, mas que o `NfeXmlOficialBuilder` (não ligado) vai usar no `enderDest`: `Logradouro`, `Numero`, `Complemento`, `Bairro`, `Cep`
e o nome do município (`xMun`; a fonte entre `Cidade` e `MunicipioIbge.Nome` **não está decidida no builder**: `NfeXmlOficialBuilder.cs:97-106`, `NfeXmlEndereco.Municipio`).
Todos são campos da `b73`. O resolver em si valida **só** os de cima: `Logradouro`, `Numero`, `Bairro`, `Cidade` e `Cep` já vêm obrigatórios do cadastro (validador e domínio), então não há
caminho pela API para um endereço ativo sem eles.

**Erros `DestinatarioSem*` por tela (D50/D53):**

| Código (`FiscalErrors.cs`) | Linha | Resolve na `b73` | Link no mapa D50 hoje |
| --- | --- | --- | --- |
| `Fiscal.DestinatarioSemEnderecoFiscal` | `:218-221` | sim (aba de endereços) | **não** (`fiscalErrosCadastro.ts:29-44`: 2 entradas; teste `NotaFiscalErroCadastroPanel.test.tsx:48` exige `null`) |
| `Fiscal.DestinatarioSemEnderecoPrincipal` | `:229-232` | sim (aba), embora inalcançável pela API | não |
| `Fiscal.DestinatarioEnderecoFiscalIncompleto` | `:235-238` | sim, idem | não (fora das "quatro" da D53) |
| `Fiscal.DestinatarioSemMunicipioIbge` | `:241-244` | **não** | não |
| `Fiscal.DestinatarioSemIndicadorContribuinteIcms` | `:304-307` | **não** (bloco fiscal) | não |
| `Fiscal.DestinatarioMunicipioIbgeNaoEncontrado`, `…MunicipioUfDivergente`, `…SemPessoaVinculada` | `:247-259`, `:209-212` | n/a | não |
| `Fiscal.DestinatarioPessoaNaoEncontrada` | `:205-206` | n/a (vira 404 genérico `Recurso.NaoEncontrado`) | não |

O comentário de `fiscalErrosCadastro.ts:3-5` e o teste `NotaFiscalErroCadastroPanel.test.tsx:44` dizem que as `DestinatarioSem*` ficam fora **até a `b74`**; a D53 diz "`b61` — … links das quatro
`DestinatarioSem*`" (`DECISOES.md:1478`); a D50 item 3 diz "cada código ganha link na fatia que cria a tela de destino" (`:1449`). As duas frases não coincidem para
`SemEnderecoFiscal` e `SemEnderecoPrincipal` (EP-12).

## 6. Permissões

| Código | Backend (`SystemPermissions.cs`) | Snapshot | Union | Catálogo FE | Catálogo estruturado do backend | Rota | Menu pai / filho | Rotas de endereço que exigem |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PESSOAS_CONSULTAR` | `:46` | `:154` | `types/erp.ts:255` | `permissoesCatalogo.ts:46` | `PermissoesCatalogoDefinition.cs:41` (`/pessoas`, não crítica) | `routePermissions.ts:15` | `AppMenu.tsx:73` / `:75` | `GET …/enderecos` |
| `PESSOAS_GERENCIAR` | `:47` | `:156` | `:256` | `:47` | `:42` (crítica) | `:15` | `:73` / `:75` | `POST`, `PUT`, `principal`, `DELETE` |
| `PESSOAS_DADOS_FISCAIS_GERENCIAR` | `:49` | `:155` | `:258` | `:49` | `:44` (crítica) | **sem regra própria** (a rota é a `/pessoas`) | pai não a lista | `PATCH …/municipio`, `backfill` (**b74**) |

- **As 4 fontes (backend, snapshot, union, catálogo FE) concordam** nas três. Não rodei `validate:backend-permissions`: **não verificado** por gate.
- **`GERENCIAR` não implica `CONSULTAR`:** cada rota tem seu `[RequiredPermission]`. A rota `/pessoas` admite as duas, e a página só abre com `CONSULTAR` (`PessoasPage.tsx:53`). Quem só tem
  `GERENCIAR` cai em `UnauthorizedState`: **a aba não é alcançável por esse perfil**. (Mesmo comportamento de Séries e Naturezas; fato, não decisão.)
- **`PESSOAS_DADOS_FISCAIS_GERENCIAR` não é `PESSOAS_GERENCIAR`.** Quem edita o endereço **não** ganha o vínculo de município (comentário do controller, `PessoasController.cs:171-178`). Não há consumidor da
  permissão no frontend.
- **`FISCAL_CADASTROS_CONSULTAR`** é exigida pelo precedente do endereço da empresa para listar UF e município (`useEnderecoFiscalCatalogos.ts:10,33-34`); **não** faz parte do perfil `PESSOAS_*` (EP-14).
- **Banco dev:** não medido hoje. A medição da rodada 14 (grupos de acesso) cobria só `FISCAL_CADASTROS_*`; **não sei** quais grupos concedem `PESSOAS_*`.
- **`accessRisk` desta fatia (fato, a classificação é da rodada):** a aba é capacidade nova, e nenhuma permissão entra ou sai do union; nada que exista hoje perde acesso.

## 7. Estados de tela

Procurei os componentes nas linhas do HEAD. Não deduzi pelo nome. "Não se aplica" = a tela não tem essa situação.

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Aba "Endereços"** | **não existe** | não existe | não existe | não existe | não existe | não existe | não existe |
| `PessoasPage` (hospedeira) | presente (`DataTableServer loading={listQuery.isFetching}`, `:113`) | presente **em dobro**: `emptyMessage` (`:113`) + `EmptyState` (`:121`, também aparece com a lista em erro) | presente (`ApiErrorPanel`, `:112`), **sem botão de tentar de novo**, e sem `code`/`traceId` (§2) | ausente | presente (toast, `:82,93`) | presente (`UnauthorizedState`, `:53-55`, exige `PESSOAS_CONSULTAR`) | **ausente**: "Nova pessoa" desabilita por permissão sem texto (`PermissionGuard mode="disable"`, `:101-103`); Editar/Inativar `disabled: !isActive(row)` sem motivo (`:119`); ações sem permissão somem (`DataTableActions.tsx:28`) |
| `PessoaFormDialog` (hospedeiro da aba) | presente (botão Salvar `loading`, `:76`) | não se aplica | **ausente no diálogo**: erro de campo só do Zod (`FieldError`); erro do servidor vai por toast (`PessoasPage.tsx:82`, `rethrow: true`) | ausente | toast da página; fecha o diálogo (`:72`) | não verificado (o diálogo não confere permissão; só abre por ação guardada) | ausente |
| `EnderecoFiscalFormSection` (precedente: endereço da empresa/filial) | presente (`ufLoading`, `municipioLoading`, botão `loading`, `:284,288,297`) | não verificado | presente (toast `:243`; erro por campo `:225-230`) | não verificado | presente (toast `:243`) | presente (`Message` warn sem `FISCAL_CADASTROS_CONSULTAR`, `:295`) | presente (mensagens por motivo em `validarInterno`, `:188-222`) |

Em `EnderecoFiscalSection.tsx` (a parte visual do precedente) abri só o necessário para citar `maxLength={9}` do CEP (`:193`); os estados que ficaram "não verificado" não foram lidos ali.

## 8. Banco dev, e o que é leitura de arquivo

**Não medido por mim hoje: o daemon do Docker está parado** (erro bruto no topo). Nenhum `select` rodou.

| O quê | Valor | Origem (e de quando) |
| --- | --- | --- |
| `erp.pessoas` | 2 pessoas | `CHANGELOG.md:135` ("0 endereços de pessoa (para 2 pessoas), medido por `psql` no `logosoft-postgres`"). **Medição anterior, 2026-09-30, rodada 13; não refeita.** |
| `erp.pessoas_enderecos` | **0 linhas** | `13-design-faturamento.md:51` e `:551` (`docker exec psql -U erp_user`, 2026-09-30); `CHANGELOG.md:135`. **Não refeita hoje.** |
| endereços principais | **não verificado** (0 endereços na medição anterior, logo 0 principais; hoje não medi) | — |
| `erp.clientes` | 2 | `13-design-faturamento.md:51`. Não refeita |
| `erp.municipios_ibge` (banco) | **não verificado** | — |
| `data/fiscal/municipio-ibge.csv` (**arquivo do repositório do backend, não o banco**) | 28 linhas não comentadas = 1 cabeçalho + **27 municípios** (as 27 capitais; 4 linhas de comentário: "AMOSTRA versionada - as 27 capitais … ~5.570") | `grep -vc '^#'`, `grep -c '^#'`. É o que o importador carrega; o banco dev **pode** ter a amostra ou mais |

O que isso quer dizer para a rodada, sem decidir: **se** o banco dev ainda tem só a amostra, o `PATCH …/municipio` com o código IBGE de qualquer cidade que não seja capital
falha com `FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO`, e o faturamento de uma Pessoa fora de capital não conclui mesmo com a `b74`. A `04` §6 (`:516`) já registrava o volume amostra.

## 9. Precedente: o endereço da empresa e da filial (`features/administracao`)

`EnderecoFiscalFormSection.tsx` (304 linhas) + `EnderecoFiscalSection.tsx` (287) + `useEnderecoFiscal.ts` (29) + `useEnderecoFiscalCatalogos.ts` (125). Serve de precedente do desenho, com estas
diferenças medidas entre ele e o endereço de Pessoa:

| Ponto | Endereço da empresa/filial | Endereço da Pessoa | Fonte |
| --- | --- | --- | --- |
| Cardinalidade | **um** por empresa/filial (`PUT` substitui) | **vários**, com um principal | `administracaoApi.ts:231-243`; `Pessoa.cs:129-200` |
| Escrita de município | no próprio `PUT` (`codigoMunicipioIbge`) + `DELETE …/municipio` | **separada**: `PATCH …/municipio`, outra permissão | `definirEnderecoFiscalSchema` (`administracaoSchemas.ts:35-52`); `PessoasController.cs:179` |
| Regra de vínculo ao mudar o endereço | zera na troca de **cidade ou UF**, herda se não mudou (D19/D23) | zera **só na troca de UF** | `EnderecoFiscal.cs:197-215`; `EnderecoPessoa.cs:60-71` |
| Guard organizacional | sim | **não** nas 5 rotas (EP-1) | §4.6 |
| `Tipo` | não existe | `TipoEndereco`, 6 valores | §4.1 |
| `estaCompleto` | existe no response | não existe | `EnderecoFiscalResponse` |
| UF | catálogo do servidor (`GET /api/fiscal/cadastros/uf`), exige `FISCAL_CADASTROS_CONSULTAR` | contrato sem rota de UF; **D52: combo estático** | `useEnderecoFiscalCatalogos.ts:10,32-45`; `DECISOES.md:1465-1466` |
| CEP | `<InputText maxLength={9}>`, schema `.min(8).max(9)` | backend aceita 8 dígitos com qualquer máscara | `EnderecoFiscalSection.tsx:193`; `administracaoSchemas.ts:46-50` |
| Salvar | botão próprio dentro de um diálogo com outro "Salvar" (C7: `estaSujo`/`validar`/`salvar` por `ref`) | a aba de endereço teria o mesmo desenho (D49 item 2); o diálogo da Pessoa fecha no sucesso do `PUT` (`PessoasPage.tsx:72`) | `EnderecoFiscalFormSection.tsx:24-37,248-260` |
| Resolução de município por Id | dois passos (busca por nome na UF, depois varredura de até 1000 itens) | idem, na `b74` | `useEnderecoFiscalCatalogos.ts:89-125` |
| Lista estática de UF | — | existe **só** em `features/faturamento/schemas/faturamentoSchemas.ts:25` (`UFS_BRASIL`, 27 itens) | `grep` |

- **QA-05 da b72:** o comentário `EnderecoFiscalFormSection.tsx:62` ainda cita `features/tributacao/components/CadastroFiscalSelects.tsx`. `ls features/tributacao/components` **não** tem esse arquivo; ele
  está em `features/fiscal/components/CadastroFiscalSelects.tsx` (D99; `:3` do arquivo novo registra a mudança). Uma única ocorrência (`grep -rn "tributacao/components/CadastroFiscalSelects"` → `:62` e o histórico em
  `CadastroFiscalSelects.tsx:3`). `ProdutoFormDialog.tsx:65` cita só `CadastroFiscalSelects.tsx`, sem caminho. O `CHANGELOG.md:106` marca "corrigir na `b73`".

## 10. Decisões travadas × medido

Não redecido; só aponto onde o medido acrescenta ou tensiona.

| Decisão | Medido |
| --- | --- |
| **D47 item 2** (endereços em `features/pessoas`) | `features/pessoas` tem `api/ types/ schemas/ hooks/ components/` e **0** arquivo de endereço. O `usePessoasResources.ts:21` invalida `['pessoas']` (prefixo) nas mutações de Pessoa; a chave de lista é `['pessoas', query]` (`:10`). Uma chave de endereço sob `['pessoas', …]` seria apanhada por essa invalidação. Fato. |
| **D49 item 2** (aba no `TabView`) | `PessoaFormDialog.tsx:84` tem o `TabView`. O diálogo serve **criar** e **editar**; no criar não há `id` (a aba de endereço dependeria do `id` da pessoa já gravada). A edição só abre para pessoa ativa (`disabled: !isActive(row)`, `:119`), e o backend recusa escrita de endereço em pessoa inativa (§4.5): coerentes. |
| **D50** (link por `Error.Code`, com `pessoaId` quando o erro é do destinatário) | O `ApiErrorResponse` (`Erp.Api/Responses/ApiErrorResponse.cs:3-9`) só tem `Code, Message, UserMessage, Operation, TraceId, Errors`: **sem campo estruturado de `pessoaId`**. O id só aparece **dentro do texto** da mensagem (`FiscalErrors.cs:221,232,238,244`). Fontes de `pessoaId` no frontend: `NotaFiscalResponse.PessoaId` (C# `:18`; `fiscal.types.ts:25`) e `cliente.pessoaId` (`clientes.types.ts:13`). `/pessoas` não lê query string (§1). Os 4 pontos onde o erro aparece: Adicionar item, Gerar NF, Confirmar e Validar (§5 do `14`). |
| **D52** (município por busca no servidor; UF em combo estático) | A UF estática hoje só existe em `features/faturamento/schemas/faturamentoSchemas.ts:25`; o precedente do endereço usa o catálogo do servidor (EP-14). |
| **D53** (`b60` = endereços; `b61` = bloco fiscal + vínculo de município + links) | C# confirma o corte: o vínculo de município é outro verbo e outra permissão. A D53 também põe "links das quatro `DestinatarioSem*`" na `b61` (= `b74`); ver EP-12. |
| **D97** ("o endereço de Pessoa (conteúdo da `b60`) e o conteúdo da `b61`") | A D97 diz que "nenhum faturamento conclui sem natureza e sem endereço fiscal do destinatário (FT-21)". O C# mostra que o **endereço sozinho** não basta: falta o município no endereço (§0.1, linha 5). |
| **D98–D101** (precedentes da b72) | Aplicáveis ao recorte: `accessRisk`, lista só com contexto resolvido, mapa D50 indexado por código, helper único de link (`FiscalErroCadastroAcao.tsx`). **Não** transferem: o filtro "Ativas/Todas" (a lista de endereço só devolve ativos), a regra de motivo (o `DELETE` não tem corpo) e o 404 genérico por filial (as 5 rotas não têm guard). |

## 11. O que ficou obsoleto no inventário `04` (`04-inventario-cadastros-fiscais.md`)

| Onde (04) | O que dizia | Hoje |
| --- | --- | --- |
| `:198-202` | as 15 rotas faltantes de Pessoa são "todas guardadas por contexto organizacional resolvido a partir da própria pessoa … checado dentro do use case via `PessoaContextoOperacional`" | **falso para as 5 rotas de endereço** (e para o contato): só `dados-fiscais`, `município` e `backfill` chamam o guard (§4.6) |
| `:219-222` | `POST/PUT` de endereço com "9 campos" e `Tipo` obrigatório | certo; **falta** que `Uf` só valida `Length(2)` no validador, que `Cep` só `NotEmpty` e que o domínio normaliza para 8 dígitos |
| `:229-231` | `EnderecoPessoaResponse` "13 campos" | certo (§3.1) |
| `:221` | `POST …/principal` "sem corpo → `EnderecoPessoaResponse`" | certo; **falta** que devolve só o endereço tocado e que o `PUT principal=false` no único principal é desfeito (§4.2) |
| `:11` e `:196` | "F3.3 Bloco fiscal da Pessoa 4/19 → +8" | endereços: **0/7** consumidos (5 + 2); a conta de 4/19 bate com o `GAP:144` |
| `:381-382,477-479,650` | as `DestinatarioSem*` "sem tela" | segue verdade para as quatro; **Séries** e **Naturezas** já têm tela (b58, b72) |
| `:209` | `PATCH …/municipio` "13 campos" na resposta | certo |
| `:516` | município IBGE "seed … 32 linhas incl. cabeçalho" | o CSV tem **32 linhas = 4 de comentário + 1 cabeçalho + 27 municípios** (§8); a conta de 27 capitais bate |
| `DIV-6` (`:~660`) | `createdAt` sem par no backend | **continua** (EP-17) |

O `04` **continua certo** em: as permissões das 7 rotas, o 404 genérico de `Forbidden`/`NotFound`, o `204` do `DELETE`, a validação `Length(7)` do código IBGE, e o `Fiscal.DestinatarioSemEnderecoFiscal`
como bloqueio do `DestinatarioFiscalResolver`.

## 12. Testes e gates que tocam o recorte (lista para o QA)

Medido com `grep -rli pessoa tests` e leitura. **Nenhum foi executado nesta sessão.**

```text
# afirmam o desenho antigo e ficam vermelhos se a fatia mexer
tests/components/NotaFiscalErroCadastroPanel.test.tsx   :44-48 (mapa D50 == [série, CFOP]; DestinatarioSemEnderecoFiscal == null)  # só se entrar link de DestinatarioSem*
tests/e2e/fixtures/logosoft.ts                          :741 (`path.includes('/api/pessoas')` devolve o ARRAY DE PESSOAS para qualquer subcaminho,
                                                        inclusive GET /api/pessoas/{id}/enderecos: o e2e receberia pessoas no lugar de endereços)

# tocam o diálogo e a lista de Pessoa
tests/e2e/cadastros.spec.ts                              :25-40 (cria PJ pelo diálogo; abas "Dados gerais"; botão "Salvar")
tests/unit/pessoasClientesFornecedoresPayload.test.ts    (builders de payload de Pessoa; padrão para os de endereço)

# leem rota/menu/guard (só se a rota, o menu ou as chamadas HTTP mudarem)
tests/unit/routePermissions.test.ts, tests/unit/guardPermissionMap*.test.ts (o gate lê chamada HTTP × permissão do contrato)

# gates que não conhecem endereço de Pessoa
scripts/gate-contract-request-fields.mjs   SCHEMA_TO_REQUEST_MAP (:49-92): `pessoas:` tem só as 3 de classificação; nenhum Adicionar/AtualizarEnderecoPessoaRequest
scripts/backend-request-records.snapshot.json e backend-response-records.snapshot.json: 0 ocorrências de EnderecoPessoa
scripts/gate-contract-fields.allowlist.json, gate-contract-request-fields.allowlist.json: 0 ocorrências
```

---

## Divergências

Seis classes pedidas pelo manual, e as que o recorte acrescentou. **EP-n** é o identificador desta rodada.

**EP-1: as 5 rotas de endereço do recorte não têm guard de contexto organizacional (IDOR por `{id}`), e o `04` afirmava o contrário.**
`ListarEnderecosPessoaUseCase`, `AdicionarEnderecoPessoaUseCase`, `AtualizarEnderecoPessoaUseCase`, `DefinirEnderecoPrincipalPessoaUseCase` e `RemoverEnderecoPessoaUseCase` carregam a Pessoa por
`ObterPessoaComRelacionamentosPorIdAsync` (`PessoasRepository.cs:24-28`, sem filtro de empresa) e **não** chamam `PessoaContextoOperacional.Validar`; só `dados-fiscais`, `município` e `backfill` o chamam
(`grep -rl PessoaContextoOperacional Erp.Application/Pessoas` → classe + 3 use cases). Sem `HasQueryFilter`, sem filtro de ação, `PermissionAuthorizationHandler` sem leitura de empresa.
`04:198-202` diz que "todas" são guardadas. Classe: permissão/escopo ausente no backend + documento obsoleto. **Não medido em execução.** Consequência para a UI: ao contrário da `b72` (NO-7), a aba
**não** receberia 404 por empresa/filial; o acesso entre empresas não é barrado pelo servidor nestas rotas. Fato registrado; a rodada decide o que fazer.

**EP-2: editar a cidade (mesma UF) mantém o município vinculado; o precedente do frontend assume a regra contrária.**
`EnderecoPessoa.Atualizar` zera `MunicipioIbgeId` **apenas** quando a UF muda (`EnderecoPessoa.cs:60-71`). O resolver só confere a UF do município com a do endereço (`DestinatarioFiscalResolver.cs:198`). Trocar
"São Paulo/SP" por "Campinas/SP" mantém o vínculo de São Paulo e **passa** no resolver. O próprio backend registra isto como dívida: "`EnderecoPessoa` não é alterado por esta fatia; o mesmo buraco lá está registrado
como dívida separada" (`EnderecoFiscal.cs:197-204`, D19). O endereço da empresa zera na troca de cidade **ou** UF e herda se nenhuma mudou (`:197-215`). Classe: regra do backend ≠ regra do precedente do frontend; dado
incoerente possível (`cMun` de um município, `xMun` de outro).

**EP-3: o endereço que a `b73` cria nunca satisfaz o resolver; FT-21 só se fecha pela metade.**
`POST` e `PUT` não aceitam município (§3.2). `MunicipioIbgeId` nasce nulo e a próxima barreira é `DestinatarioSemMunicipioIbge` (`DestinatarioFiscalResolver.cs:184-187`). A D97 e o `CHANGELOG:29` descrevem a `b73` como
o fim do FT-21 no que toca ao endereço; o C# mostra que a falha **muda de código, não some**. O `PATCH` exige `PESSOAS_DADOS_FISCAIS_GERENCIAR`, que **não** é `PESSOAS_GERENCIAR` (`PessoasController.cs:171-180`), então a mesma
pessoa que cadastra o endereço pode não ter poder de vinculá-lo. Classe: dependência entre fatias; permissão exigida pela rota ausente do perfil da tela.

**EP-4: "endereço fiscal" não é o `Tipo = Fiscal`.**
O resolver usa o endereço **ativo e principal**, de qualquer `Tipo` (`DestinatarioFiscalResolver.cs:157-168`; `grep "\.Tipo\b"` → 0). `TipoEndereco` tem **0** uso fora de `Erp.Domain/Pessoas` e dos contratos. A mensagem de erro e a D53 falam em
"endereço fiscal". Quem marcar `Tipo = Fiscal` num endereço que não é o principal não resolve o erro. Classe: nome × semântica.

**EP-5: `principal: false` enviado no único principal volta `true`.**
`Pessoa.cs:162-166` re-marca. O campo enviado não tem o efeito dito. Não há índice único no banco (`EnderecoPessoaConfiguration.cs:25-26`) nem token de concorrência. Classe: campo enviado sem efeito; invariante só no domínio.

**EP-6: as respostas de mutação não refletem os efeitos colaterais; o `DELETE` do principal promove um endereço não determinístico.**
`POST`, `PUT` e `principal` devolvem um endereço; os outros rebaixados não voltam. `DELETE` (`204`) promove `FirstOrDefault(x => x.IsActive)` sobre a coleção do EF, sem `ORDER BY` (`Pessoa.cs:185-200`;
`PessoasRepository.cs:24-28`). Classe: efeito não observável pela resposta; a lista precisa ser relida.

**EP-7: a lista só devolve ativos, então `status` do endereço é sempre `Ativo`; excluir é irreversível pela API.**
`ListarEnderecosPessoaUseCase`: `.Where(x => x.IsActive)`. Sem reativação (`grep Reativar` em `Erp.Application/Pessoas` e `Erp.Domain/Pessoas` → 0) e sem corpo no `DELETE`. O campo `Status` do response é
"sem uso" garantido pelo contrato. Classe: campo entregue que a UI ignorará por construção.

**EP-8: o `Error.Code` não distingue nada, e o client de Pessoa descarta o que o backend entrega.**
Toda validação é `PESSOAS_VALIDACAO` com mensagens juntas por `" | "`; endereço inexistente em `PUT`/`principal`/`DELETE` sai **400**, não 404 (`Pessoa.cs:277-285`), enquanto o `PATCH` de município sai 404
(`PessoaErrors.cs:21`). O mapa por código (D50) não tem o que mapear nos erros de campo. E `pessoasApi.runPessoaRequest` (`:14-20`) lança `new Error(apiError.message)`, perdendo `code`, `status`, `traceId` e `validationErrors`.
Classe: campo entregue pelo backend que a UI ignora (no client de Pessoa).

**EP-9: CEP e UF: o validador do backend é mais frouxo que o domínio, e o precedente do frontend tem outro limite.**
Validador: `Cep` só `NotEmpty`, `Uf` `Length(2)` sobre o valor cru. Domínio: CEP = 8 dígitos após remover máscara, UF = 2 letras. A resposta devolve CEP **só com dígitos**. O precedente limita a 9 caracteres (`EnderecoFiscalSection.tsx:193`;
`administracaoSchemas.ts:46-50`), então `"12.345-678"` (10) passaria no backend e não no precedente. Nenhuma UF é conferida contra as 27 (`"ZZ"` vale). Classe: tipo/regra diferente entre as fontes.

**EP-10: enum `TipoEndereco` com 6 valores e nenhum equivalente no frontend; o Swagger não os lista e declara tudo opcional.**
`TipoEndereco.cs:3-10`; frontend 0. `CONTRATO-API-v1.23.md:12844-12856` traz `tipo?` e sete campos obrigatórios no C# como opcionais. Valores só em `BACKEND-ESTADO…:3482`. JSON numérico. Classe: enum a criar no
frontend com contrato incompleto; request opcional no Swagger × obrigatório no C#.

**EP-11: os gates de contrato não cobrem endereço de Pessoa.**
`SCHEMA_TO_REQUEST_MAP` (`gate-contract-request-fields.mjs:49-92`) tem `pessoas:` com 3 requests de classificação; os snapshots de request e de response têm **0** `EnderecoPessoa`. O gate não detectaria um campo
que a UI deixe de enviar. **Não executei gate.** Classe: contrato sem cobertura.

**EP-12: D50 item 3 × D53 sobre quem entrega os links de `SemEnderecoFiscal` e `SemEnderecoPrincipal`; e o destino do link não existe.**
D50 item 3: "cada código ganha link na fatia que cria a tela de destino". D53: "`b61` — … links das quatro `DestinatarioSem*`". O comentário de `fiscalErrosCadastro.ts:3-5` e o teste
`NotaFiscalErroCadastroPanel.test.tsx:44` seguem a D53 ("até a `b74`"). Para as duas de endereço, a tela de destino nasce na `b73`. Além disso, o destino `/pessoas` **não abre uma Pessoa por id** (sem `searchParams`), o id só vem no
texto do erro, e o `ApiErrorResponse` não tem campo de `pessoaId`. Classe: decisões travadas que não coincidem; dependência de destino.

**EP-13: QA-05, comentário com o caminho antigo.** `EnderecoFiscalFormSection.tsx:62` (1 ocorrência). Classe: documentação no código obsoleta; marcada para a `b73` no `CHANGELOG.md:106`.

**EP-14: D52 manda UF estática; o precedente usa o catálogo do servidor, que exige uma permissão fora do perfil `PESSOAS_*`.**
`useUfCatalogo` exige `FISCAL_CADASTROS_CONSULTAR` (`useEnderecoFiscalCatalogos.ts:10,33-34`); a única lista estática de UF está em `faturamentoSchemas.ts:25`, em outro módulo. Quem tem `PESSOAS_CONSULTAR`/`GERENCIAR` e não tem
`FISCAL_CADASTROS_CONSULTAR` não carregaria o catálogo do servidor. Classe: permissão exigida pelo precedente ausente do perfil da tela. Não redecido: a D52 já fixou "estático".

**EP-15: `PESSOAS_DADOS_FISCAIS_GERENCIAR` está no union e no catálogo, e tem 0 consumidores.**
Backend, snapshot, union e catálogo FE concordam; nenhum arquivo de `features app lib layout components` a usa. Classe: permissão presente no catálogo e sem uso (esperado: é da `b74`). **Não é divergência de contrato.** Registro porque o `PATCH` de município depende dela e o catálogo estruturado do backend a marca "crítica".

**EP-16: a fixture e2e responde qualquer `/api/pessoas*` com o array de pessoas.** `tests/e2e/fixtures/logosoft.ts:741`. Um e2e da aba receberia pessoas em `GET …/enderecos`. (Mock não é fonte; registrado para quem escrever o teste.)

**EP-17: `createdAt` lido pela UI e não entregue (continuação de DIV-6 do `04`).** `pessoas.types.ts:21`; `OperationalGovernancePanel.tsx:28`; `PessoaResponse.cs:7-29` sem o campo. Classe: campo lido pela UI que o backend não entrega.

**EP-18: o município do repositório é amostra de 27 capitais.** `data/fiscal/municipio-ibge.csv` (27 municípios). Banco dev **não medido**. Se o banco tiver só a amostra, o vínculo (`b74`) de qualquer cidade fora das capitais falha
(`FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO`). Classe: dado; **não verificado no banco**.

**EP-19: dois campos "município" com donos diferentes.** `PessoaResponse.MunicipioIbgeId` (bloco fiscal) e `EnderecoPessoaResponse.MunicipioIbgeId`; o resolver lê só o do endereço (`DestinatarioFiscalResolver.cs:184,189`).
Classe: nome igual, semântica diferente; risco de confusão na `b74`.

**Sem divergência encontrada (afirmação com evidência):**
- **Tipo diferente entre o schema Zod e a resposta real:** **não aplicável**: não existe schema Zod de endereço nem de `PessoaResponse` (`pessoasApi.ts:44-47`, asserção de tipo).
- **Enum fixo no frontend sem enum correspondente no backend:** **0**: o frontend não tem enum de endereço; `EntityStatus` (`types/erp.ts:6-12`) e `TipoPessoa` (`:14-17`) batem com o C# valor a valor.
- **Endpoint consumido fora da allowlist:** **0** consumidos (0/7); a allowlist é `audit-only` e vazia; as 7 rotas constam do catálogo `BACKEND-ESTADO…:1744-1750`. O gate **não foi rodado**.
- **Campo lido pela UI que o backend não entrega (endereço):** **0** (a UI não lê endereço). No hospedeiro, **1** (`createdAt`, EP-17).
- **Permissão exigida na rota e ausente do catálogo, ou o contrário:** **0** nas 3 permissões de Pessoa (backend, snapshot, union e catálogo FE batem). A única assimetria é a regra de rota `/pessoas` admitir `GERENCIAR` e a página exigir `CONSULTAR`.

---

## Conta de campos, fechando

**Respostas (o que o backend entrega × o que o frontend declara):**

| Record | Backend entrega | Frontend declara | Com destino | Divergência (lido e não entregue) | Sem uso | Entregue e não declarado |
| --- | --- | --- | --- | --- | --- | --- |
| `EnderecoPessoaResponse` | 13 | 0 | 0 | 0 | 0 | 13 |
| `PessoaResponse` (hospedeiro) | 22 | 12 (11 com par + `createdAt`) | 9 | 1 (`createdAt`) | 2 (`empresaId`, `filialId`) | 11 |
| `BackfillMunicipiosEnderecosPessoaResponse` (`b74`) | 3 | 0 | 0 | 0 | 0 | 3 |
| `DivergenciaMunicipioEnderecoResponse` (`b74`) | 5 | 0 | 0 | 0 | 0 | 5 |
| **Total** | **43** | **12** | **9** | **1** | **2** | **32** |

Fórmula dos declarados: **12 = 9 + 1 + 2**. Fecha. Fórmula do total entregue: **43 = 11 declarados com par + 32 não declarados** (13 + 11 + 3 + 5 = 32). Fecha. (Os 12 declarados incluem `createdAt`,
que o backend não entrega; por isso 43 − 32 = 11, e não 12.)

**Requests e queries (o que o backend aceita × o que o frontend tem):**

| Request ou query | No backend | Enviados | Declarado sem uso | Ausentes |
| --- | --- | --- | --- | --- |
| `AdicionarEnderecoPessoaRequest` | 9 | 0 | 0 | 9 |
| `AtualizarEnderecoPessoaRequest` | 9 | 0 | 0 | 9 |
| `VincularMunicipioEnderecoPessoaRequest` (`b74`) | 1 | 0 | 0 | 1 |
| `BackfillMunicipiosEnderecosPessoaRequest` (`b74`) | 2 | 0 | 0 | 2 |
| Query de `GET …/enderecos` | 0 | 0 | 0 | 0 |
| **Total** | **21** | **0** | **0** | **21** |

Fórmula: **21 = 0 + 0 + 21**. Fecha. Como medi: leitura pareada dos records em `EnderecoContatoRequests.cs` e do controller contra `grep` no frontend (0 ocorrências de `EnderecoPessoa`, `enderecos`, `TipoEndereco` em
`features app lib types`), e contagem dos parâmetros da assinatura do controller.

**Rotas:** 7 de endereço no backend = **0 consumidas** + 7 ausentes (5 do recorte `b73` + 2 da `b74`).

**Permissões:** 3 de Pessoa citadas = 3 nas quatro fontes (backend, snapshot, union, catálogo FE); 1 delas (`PESSOAS_DADOS_FISCAIS_GERENCIAR`) com 0 consumidores.

## Destino por item (resumo para a rodada)

| Item | Destino hoje |
| --- | --- |
| Os 13 campos de `EnderecoPessoaResponse` | não declarados (nenhum tipo no frontend) |
| Os 9 campos de `Adicionar`/`AtualizarEnderecoPessoaRequest` | ausentes |
| `TipoEndereco` (6 valores) | enum inexistente no frontend |
| `PessoaResponse.id` | enviado (path do `PUT` e do `inativar`) |
| `.tipoPessoa`, `.nomeRazaoSocial`, `.nomeFantasia`, `.documento`, `.status` | exibidos |
| `.inscricaoEstadual`, `.inscricaoMunicipal`, `.observacao` | exibidos (form) e reenviados no `PUT` |
| `.empresaId`, `.filialId` | sem uso |
| `.createdAt` | lido pela UI e não entregue pelo backend |
| Os 11 campos de `PessoaResponse` ausentes do tipo | sem campo no frontend (bloco fiscal, `b74`) |
| `MunicipioIbgeId` (endereço) | não declarado; lido pelo resolver (`:184`); escrito só pelo `PATCH` (`b74`) |
| `PessoasController` rotas de endereço | 0 de 7 consumidas |
| `PESSOAS_CONSULTAR`, `PESSOAS_GERENCIAR` | existem nas 4 fontes; a aba as usaria |
| `PESSOAS_DADOS_FISCAIS_GERENCIAR` | existe nas 4 fontes; 0 consumidores (`b74`) |

---

## Pendências

**Resolvem-se lendo o código (respondidas acima, sem pergunta ao backend):**

- Verbos, rotas, permissão e resposta de cada rota (§2). Limites de tamanho (§3.2). Principal: único por pessoa, só no domínio (§4.2). Excluir: lógico, irreversível pela API, motivo fixo (§4.3).
- Se `POST`/`PUT` aceitam município: **não**; é o `PATCH` da `b74` (§3.2, §0.2).
- O que o resolver exige e o que a `b73` fecha (§5, §0.1). Tipos e enums: `TipoEndereco`, 6 valores, numérico, sem efeito fiscal (§4.1).

**Perguntas ao backend:**

- **PB-1 (EP-1):** as 5 rotas de endereço (e as de contato) deveriam chamar `PessoaContextoOperacional`? Hoje só 3 use cases de Pessoas o chamam, e o `04` supunha que todos. Decide se a aba deve esperar 404 por empresa/filial.
- **PB-2 (EP-2):** `EnderecoPessoa.Atualizar` deveria zerar `MunicipioIbgeId` também na troca de cidade, como o endereço da empresa (D19)? O próprio backend chama de "dívida separada" (`EnderecoFiscal.cs:197-204`). Decide se a UI da `b74` tem de reavisar "revincule o município" a cada edição de cidade.
- **PB-3 (EP-6):** o `DELETE` do principal deveria promover o endereço mais antigo, de forma determinística, e devolver a lista ou o novo principal?
- **PB-4 (EP-3):** `POST`/`PUT` poderiam aceitar `municipioIbgeCodigo` com a permissão de endereço, ou o vínculo continua exclusivo do `PATCH` com `PESSOAS_DADOS_FISCAIS_GERENCIAR`? Decide se a `b73` tem como entregar endereço que passe no resolver.
- **PB-5 (EP-10):** o contrato canônico será regenerado com os valores de `TipoEndereco` e os obrigatórios reais dos requests?
- **PB-6 (EP-12):** o `ApiErrorResponse` poderia levar o `pessoaId` do destinatário como campo estruturado? Hoje só o texto da mensagem o traz.
- **PB-7:** `DestinatarioFiscalResolver` deveria preferir `Tipo = Fiscal`, ou o principal (hoje)? Decide se o rótulo "endereço fiscal" da tela tem de existir.
- **PB-8 (EP-7):** endereço excluído deveria poder ser reativado?

**Perguntas ao produto e à rodada (não ao backend):**

- **PF-1:** o campo `cidade` do endereço é texto livre na `b73`, mesmo com a D52 travando município por busca? E o que a UI diz do vínculo (sim/não) quando a `b74` ainda não existe?
- **PF-2:** os links de `DestinatarioSemEnderecoFiscal` e `DestinatarioSemEnderecoPrincipal` entram na `b73` (D50 item 3) ou na `b74` (D53)? E o destino do link abre a Pessoa pela lista ou por id?
- **PF-3:** a aba fica visível ao criar uma Pessoa (sem `id`) ou só na edição?
- **PF-4:** o perfil que cadastra endereço (`PESSOAS_GERENCIAR`) é o mesmo que vincula município (`PESSOAS_DADOS_FISCAIS_GERENCIAR`)? Se não, o faturamento depende de dois perfis.
- **PF-5:** a CHANGELOG da `b73` diz que o faturamento **não** conclui, porque o município continua faltando (§0.1, linha 5)?
- **PF-6:** o banco dev tem município além das 27 capitais? (não medido; Docker parado)

---

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "endereco-pessoa",
  "slice": "v1.11.0a8b73",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/15-inventario-endereco-pessoa.md",
  "arvoreMedida": "frontend HEAD a3cf5e3 (v1.11.0a8b72), branch codex/v1.11.0a8b73-endereco-pessoa, git status limpo fora de .codex/, .agents/ e .claude/settings.local.json; backend branch fix/v1.23.3-g3-crt-com-semantica-de-manutencao HEAD 0387e44, arvore limpa (git status --short = 0 linhas), 1 commit a frente do usado na rodada 14 e nenhum toca Pessoas/DestinatarioFiscalResolver; banco dev NAO verificado (daemon do Docker parado, nao iniciado por regra do CLAUDE.md)",
  "motivoWarnings": "Docker indisponivel: contagens de pessoas, enderecos principais e municipios do banco dev nao foram medidas hoje; usei medicoes anteriores citadas (CHANGELOG.md:135, 13-design:51) e o CSV de seed do repositorio, rotulados. Nenhuma chamada HTTP autenticada, nenhum gate e nenhum teste executado: 'backend entrega' e leitura de C#. Efeito em execucao de EP-1 (rotas sem guard organizacional) e de EP-9 (UF/CEP) nao verificado. Leg 3 e leg 4 (SEFAZ) do Confirmar nao lidos ate o fim.",
  "contagemDeCampos": {
    "EnderecoPessoaResponse": "13 no backend, 0 declarados, 13 nao declarados. EnderecoContatoResponse.cs:6-19.",
    "PessoaResponse": "22 no backend, 12 declarados = 9 com destino + 1 divergencia (createdAt, lido e nao entregue) + 2 sem uso (empresaId, filialId); 11 entregues e nao declarados. PessoaResponse.cs:7-29 x pessoas.types.ts:9-21.",
    "BackfillMunicipiosEnderecosPessoaResponse": "3 no backend, 0 declarados, 3 nao declarados (b74).",
    "DivergenciaMunicipioEnderecoResponse": "5 no backend, 0 declarados, 5 nao declarados (b74).",
    "totalRespostas": "43 entregues = 11 declarados com par + 32 nao declarados; 12 declarados = 9 com destino + 1 divergencia + 2 sem uso.",
    "requests": "21 no backend = 0 enviados + 0 declarados sem uso + 21 ausentes. Adicionar 9, Atualizar 9, Vincular municipio 1 (b74), Backfill 2 (b74); GET enderecos sem query.",
    "rotas": "7 rotas de endereco no backend, 0 consumidas pelo frontend (5 da b73 + 2 da b74). GAP 'faltam 15 de 19' bate: 15 = 7 enderecos + 5 contatos + dados-fiscais + bloquear + desbloquear.",
    "permissoes": "3 de Pessoa (CONSULTAR, GERENCIAR, DADOS_FISCAIS_GERENCIAR) presentes nas 4 fontes (backend, snapshot, union, catalogo FE); DADOS_FISCAIS_GERENCIAR com 0 consumidores."
  },
  "respostasAoBriefing": {
    "Q1_o_que_impede_o_faturamento_depois_da_b73": "O endereco criado pela b73 nasce com MunicipioIbgeId nulo (POST/PUT nao aceitam municipio; EnderecoContatoRequests.cs:5-25). O leg 1 do Confirmar (GerarNotaFiscalPedidoVendaUseCase.cs:141-153) resolve emitente e depois destinatario; no DestinatarioFiscalResolver.cs a falha de hoje (:157-166, DestinatarioSemEnderecoFiscal) passa a ser :184-187 (DestinatarioSemMunicipioIbge). Unico caminho de escrita do municipio: PATCH .../municipio e backfill, com PESSOAS_DADOS_FISCAIS_GERENCIAR (PessoasController.cs:179-207), nenhum consumido. Tambem: emitente (EmitenteFiscalResolver.cs:160-171, nao medido no dev), natureza com CFOP mapeado, municipio na tabela (seed do repo = 27 capitais), e os legs 2-4 (config fiscal, NCM/CFOP por item, certificado, SEFAZ; leg 3 e 4 nao lidos ate o fim). DestinatarioSemIndicadorContribuinteIcms NAO esta no caminho do Confirmar (so Validar e Calcular tributos).",
    "Q2_viavel_sem_tocar_em_municipio": "Sim, tecnicamente: as 5 rotas da b73 nao tocam municipio (9 campos de escrita, PESSOAS_CONSULTAR/GERENCIAR). A fronteira real com a b74 e o PATCH .../municipio (outro verbo, outra permissao PESSOAS_DADOS_FISCAIS_GERENCIAR), o backfill, a busca de municipio e os links DestinatarioSem*. Mas a b73 sozinha nao faz nenhum faturamento passar: o proximo erro e DestinatarioSemMunicipioIbge. Fatos que a b73 precisa conhecer: PUT com UF diferente zera o vinculo; PUT com cidade diferente (mesma UF) mantem o vinculo antigo (EP-2); a resposta traz so o Guid (nao ha filtro por Id em /cadastros/municipios)."
  },
  "medicoes": [
    { "o_que": "rotas de endereco de Pessoa consumidas pelo frontend", "valor": "0 de 7", "como": "grep de enderecos em features/pessoas/api e leitura de pessoasApi.ts; GAP-FRONTEND-BACKEND.md:146-155" },
    { "o_que": "arquivos de features/pessoas, clientes e fornecedores que mencionam endereco", "valor": "0", "como": "grep -rli endereco features/pessoas features/clientes features/fornecedores" },
    { "o_que": "use cases de Pessoas que chamam PessoaContextoOperacional", "valor": "3 (dados-fiscais, vincular municipio, backfill); os 5 de endereco do recorte nao chamam", "como": "grep -rl PessoaContextoOperacional Erp.Application/Pessoas; HasQueryFilter, IActionFilter e leitura de empresa no PermissionAuthorizationHandler: 0" },
    { "o_que": "ocorrencias de TipoEndereco fora de Erp.Domain/Pessoas, contratos e configuracao", "valor": "0", "como": "grep -rn TipoEndereco src; grep '\\.Tipo\\b' em DestinatarioFiscalResolver.cs" },
    { "o_que": "ocorrencias de JsonStringEnumConverter no backend", "valor": "0 (enums numericos no JSON)", "como": "grep -rn JsonStringEnumConverter src; Program.cs:28 sem AddJsonOptions" },
    { "o_que": "consumidores de usePessoas", "valor": "18 arquivos em 11 modulos", "como": "grep -rln usePessoas features app components" },
    { "o_que": "ocorrencias de EnderecoPessoa nos gates e snapshots", "valor": "0 em gate-contract-request-fields.mjs, backend-request-records.snapshot.json, backend-response-records.snapshot.json e nas duas allowlists", "como": "grep -c EnderecoPessoa scripts/*" },
    { "o_que": "municipios no CSV de seed do repositorio do backend (NAO e o banco)", "valor": "27 (28 linhas nao comentadas = 1 cabecalho + 27; 4 linhas de comentario)", "como": "grep -vc '^#' e grep -c '^#' em data/fiscal/municipio-ibge.csv" },
    { "o_que": "pessoas e enderecos no banco dev", "valor": "2 pessoas e 0 enderecos (NAO medido hoje)", "como": "citado de CHANGELOG.md:135 e 13-design-faturamento.md:51/551 (psql de 2026-09-30); Docker parado hoje, entao nao refeito" },
    { "o_que": "ocorrencias da referencia antiga a features/tributacao/components/CadastroFiscalSelects.tsx", "valor": "1 (EnderecoFiscalFormSection.tsx:62)", "como": "grep -rn tributacao/components/CadastroFiscalSelects" },
    { "o_que": "ocorrencias de PESSOAS_DADOS_FISCAIS_GERENCIAR em codigo do frontend alem de union e catalogo", "valor": "0", "como": "grep -rn em features app lib layout components types" }
  ],
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    { "tipo": "backend", "pergunta": "PB-1 (EP-1): as 5 rotas de endereco de Pessoa deveriam chamar PessoaContextoOperacional? Hoje so 3 use cases de Pessoas o chamam.", "decide": "se a aba deve esperar 404 por empresa/filial e se ha IDOR por {id}" },
    { "tipo": "backend", "pergunta": "PB-2 (EP-2): EnderecoPessoa.Atualizar deveria zerar MunicipioIbgeId tambem na troca de cidade, como o endereco da empresa (D19)?", "decide": "se a UI da b74 precisa reavisar 'revincule o municipio' a cada edicao de cidade" },
    { "tipo": "backend", "pergunta": "PB-3 (EP-6): DELETE do principal deveria promover endereco de forma deterministica e devolver o resultado?", "decide": "se a tela precisa reler a lista apos excluir o principal" },
    { "tipo": "backend", "pergunta": "PB-4 (EP-3): POST/PUT poderiam aceitar municipioIbgeCodigo, ou o vinculo continua exclusivo do PATCH com PESSOAS_DADOS_FISCAIS_GERENCIAR?", "decide": "se a b73 consegue entregar endereco que passe no resolver" },
    { "tipo": "backend", "pergunta": "PB-5 (EP-10): o contrato canonico sera regenerado com os valores de TipoEndereco e os obrigatorios reais dos requests?", "decide": "enum e schema de request do frontend" },
    { "tipo": "backend", "pergunta": "PB-6 (EP-12): ApiErrorResponse pode levar o pessoaId do destinatario como campo estruturado?", "decide": "se o link D50 do destinatario depende de extrair id de texto ou de outra fonte" },
    { "tipo": "backend", "pergunta": "PB-7 (EP-4): o resolver deveria preferir TipoEndereco.Fiscal em vez do principal?", "decide": "se o rotulo 'endereco fiscal' da tela corresponde ao que o resolver usa" },
    { "tipo": "backend", "pergunta": "PB-8 (EP-7): endereco excluido deveria poder ser reativado?", "decide": "se a tela declara a exclusao definitiva" },
    { "tipo": "funcional", "pergunta": "PF-1: cidade do endereco e texto livre na b73, apesar da D52? O que a UI diz do vinculo de municipio antes da b74?", "decide": "campos da aba e coerencia cidade x municipio" },
    { "tipo": "funcional", "pergunta": "PF-2: links de DestinatarioSemEnderecoFiscal e DestinatarioSemEnderecoPrincipal entram na b73 (D50 item 3) ou na b74 (D53)? Destino do link: lista ou por id?", "decide": "fiscalErrosCadastro.ts, NotaFiscalErroCadastroPanel.test.tsx:44-48, deep link em /pessoas" },
    { "tipo": "funcional", "pergunta": "PF-3: a aba aparece ao criar Pessoa (sem id) ou so na edicao?", "decide": "estrutura do PessoaFormDialog" },
    { "tipo": "funcional", "pergunta": "PF-4: o perfil que cadastra endereco (PESSOAS_GERENCIAR) e o que vincula municipio (PESSOAS_DADOS_FISCAIS_GERENCIAR)?", "decide": "ordem de concessao no CHANGELOG da b73/b74" },
    { "tipo": "funcional", "pergunta": "PF-5: o CHANGELOG da b73 declara que o faturamento ainda nao conclui por falta de municipio no endereco?", "decide": "honestidade da entrega (D53)" },
    { "tipo": "ambiente", "pergunta": "PF-6: o banco dev tem municipio alem das 27 capitais? Quantas pessoas, enderecos e principais? (Docker parado, nao medido)", "decide": "se a b74 consegue vincular qualquer cidade e se ha dado legado a considerar" }
  ],
  "riscos": [
    "EP-1: as 5 rotas de endereco de Pessoa nao tem guard de contexto organizacional (pelo C#); quem tem PESSOAS_CONSULTAR/GERENCIAR le e escreve endereco de Pessoa de outra empresa pelo {id}. O 04 afirmava o contrario. Nao medido em execucao.",
    "EP-2: PUT com cidade diferente e mesma UF mantem MunicipioIbgeId antigo; o resolver so confere a UF; o backend ja registra isso como divida (EnderecoFiscal.cs:197-204). Risco de cMun incoerente com xMun quando o NfeXmlOficialBuilder for ligado.",
    "EP-3: o endereco criado pela b73 nunca satisfaz o resolver (municipio nulo); o faturamento troca de erro e nao conclui. A D97 e o CHANGELOG:29 descrevem a b73 como o fim do FT-21 no endereco.",
    "EP-4: o resolver usa o endereco principal de qualquer Tipo; TipoEndereco.Fiscal nao tem efeito. O rotulo 'endereco fiscal' induz ao erro.",
    "EP-5/EP-6: principal:false no unico principal e desfeito; as respostas de mutacao nao trazem os outros enderecos afetados; DELETE do principal promove um endereco nao deterministico; sem indice unico nem token de concorrencia.",
    "EP-8: o client de Pessoa descarta code, status, traceId e validationErrors; todo erro de endereco e PESSOAS_VALIDACAO (400); endereco inexistente em PUT/principal/DELETE sai 400 e nao 404.",
    "EP-12: D50 item 3 e D53 nao coincidem sobre quem entrega os links DestinatarioSem*; /pessoas nao abre uma Pessoa por id; o ApiErrorResponse nao tem campo de pessoaId. O teste NotaFiscalErroCadastroPanel.test.tsx:48 exige null para DestinatarioSemEnderecoFiscal.",
    "EP-14: o precedente de UF do endereco da empresa exige FISCAL_CADASTROS_CONSULTAR, fora do perfil PESSOAS_*; a D52 manda UF estatica e a unica lista estatica esta em features/faturamento.",
    "EP-16: a fixture e2e (tests/e2e/fixtures/logosoft.ts:741) responde qualquer /api/pessoas* com o array de pessoas, inclusive GET .../enderecos.",
    "EP-18: o seed do repositorio tem so as 27 capitais; se o banco dev tem so a amostra, o vinculo de qualquer cidade fora das capitais falha na b74. Banco nao medido.",
    "Docker parado: pessoas, enderecos, principais e municipios do banco dev nao medidos hoje; usei medicoes de 2026-09-30 (rodada 13) rotuladas.",
    "Nenhum gate nem teste foi executado (validate:backend-contract-map, validate:guard-permission-map, validate:backend-permissions, vitest). Tudo e leitura de codigo, de contratos e de documentos.",
    "Leg 3 (assinatura) e leg 4 (SEFAZ) do Confirmar nao foram lidos ate o fim; nao afirmo que passam depois de b73 e b74."
  ]
}
```
