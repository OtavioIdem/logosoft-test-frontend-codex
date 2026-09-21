# Inventário — Cadastros fiscais (F3 do `PLANO-FRONTEND-v1.23.md`)

Agente: `inventariante-contrato-tela`. Nó: `inventario`, rodada de arquitetura 04, assunto
`cadastros-fiscais`. Não propõe desenho, sequência nem fatiamento — confere o que existe hoje nos
dois lados e devolve a lista sobre a qual os quatro arquitetos discutem.

Recorte (F3, `PLANO-FRONTEND-v1.23.md` §5):

```text
F3.1  Séries fiscais — listar, criar, ampliar, encerrar vigência, inativar, buracos    0/7
F3.2  Naturezas de operação e CFOP derivado                                            0/5
F3.3  Bloco fiscal da Pessoa                                                           4/19 → +8
F3.4  Cadastros fiscais: NCM, CEST, CST, geografia fiscal                              2/16 → +14
F3.5  Modelos de documento fiscal                                                      0/1
```

Backend acessível como repositório (`../New project 3/src`, só leitura) — **toda coluna "o backend
entrega?" vem de leitura direta do código-fonte**, nunca de resposta real de endpoint. Segundo
degrau da hierarquia de `01_fontes_de_verdade.md`.

Frontend lido:

```text
features/fiscal/{api,schemas,hooks,types,components}
features/tributacao/{api,hooks,types,components} (os dois consumidores de CadastrosFiscais)
features/pessoas/{api,schemas,hooks,types,components}
types/erp.ts (union PermissionCode)
features/seguranca/permissoesCatalogo.ts
lib/security/routePermissions.ts
layout/AppMenu.tsx
scripts/backend-permissions.snapshot.json
scripts/backend-contract-map.allowlist.json
app/(main)/fiscal/**, app/(main)/pessoas/**
```

Backend lido (arquivo:linha citado por afirmação, ao longo do documento):

```text
Erp.Api/Controllers/Fiscal/{SeriesFiscaisController,NaturezasOperacaoController,
  CadastrosFiscaisController,ModelosDocumentoFiscalController,TributacaoSimulacaoController,
  NotasFiscaisController}.cs
Erp.Api/Controllers/Pessoas/{PessoasController,ClassificacoesPessoaController}.cs
Erp.Application/Fiscal/Documentos/{SerieFiscalContracts,SerieFiscalUseCases,SerieFiscalErrors,
  ConsultarBuracosSerieFiscalUseCase,AlocarNumeroSerieUseCase,ModeloDocumentoFiscalContracts,
  CfopDoItemResolver,DestinatarioFiscalResolver}.cs
Erp.Application/Fiscal/Cadastros/{CadastrosFiscaisResponses,CadastrosFiscaisErrors,
  ICadastrosFiscaisService}.cs
Erp.Application/Fiscal/Cadastros/NaturezasOperacao/{NaturezaOperacaoContracts,
  NaturezaOperacaoUseCases,ResolvedorMapeamentoCfop}.cs
Erp.Application/Fiscal/Cadastros/Importacao/{ResumoImportacaoTabelaOficial,
  IImportarTabelaOficialUseCase}.cs
Erp.Application/Fiscal/{FiscalErrors,ValidarNotaFiscalUseCase,NotaFiscalBasicaUseCases}.cs
Erp.Application/Pessoas/{PessoaMapper,PessoaDadosFiscaisResolver}.cs
Erp.Application/Pessoas/Pessoas/{PessoaRequests,PessoaResponse,PessoaValidators,
  EnderecoContatoRequests,EnderecoContatoResponse,EnderecoContatoValidators,
  AtualizarDadosFiscaisPessoa/AtualizarDadosFiscaisPessoaUseCase}.cs
Erp.Application/Pessoas/Classificacoes/{ClassificacaoPessoaResponse,ClassificacaoPessoaRequests}.cs
Erp.Application/Common/Permissions/SystemPermissions.cs
Erp.Domain/Fiscal/Documentos/{SerieFiscal,ModeloDocumentoFiscal}.cs
Erp.Domain/Fiscal/Cadastros/{NaturezaOperacao,NaturezaOperacaoCfop,AmbitoCfopResolver,
  TipoItemCfop,TabelaOficialFiscal,EnumsCadastrosFiscais}.cs
Erp.Domain/Fiscal/EnumsFiscal.cs
Erp.Domain/Pessoas/{DadosFiscaisPessoa,IndicadorContribuinteIcms,IndicadorIeDestinatario,
  TipoEndereco,TipoContato}.cs
Erp.Domain/Administration/RegimeTributario.cs
Erp.Api/Filters/ApiErrorResponseFilter.cs
Erp.Shared/Kernel/Error.cs
data/fiscal/README.md + data/fiscal/*.csv
Erp.Infrastructure/Persistence/Migrations/{20260727171446_CadastrosFiscaisGeografia,
  20260727180100_CadastrosFiscaisSituacaoTributaria,20260728133102_CadastrosFiscaisCfop,
  20260807140503_SerieFiscalENumeracaoDocumento}.cs
```

---

## 1. Endpoints

Nenhuma das 579 operações do backend declara `[ProducesResponseType]` (confirmado por leitura —
zero ocorrências nos controllers acima); todo tipo de resposta abaixo vem do `record` C# do
`Application`, não de um contrato publicado. `docs/backend-v1.23/CONTRATO-API-v1.23.md` só publica
o formato de **request** destas rotas — nunca o de resposta — confirmado por leitura das seções
`SeriesFiscais` (`CONTRATO-API-v1.23.md:15127-15218`), `NaturezasOperacao` (`:9127-9206`),
`CadastrosFiscais` (`:1678-1822`), `Pessoas` (`:12448-13018`) e `ModelosDocumentoFiscal`
(`:8827-`).

### 1.1 SeriesFiscais — 0/7 consumidos

Controller: `SeriesFiscaisController.cs`. Todas as rotas passam por
`FiscalContextoOperacional.GarantirAcesso(empresaId, filialId)` **dentro do use case** — o guard
organizacional não está no controller.

| # | Verbo + rota | Permissão (arquivo:linha) | Request | Response |
|---|---|---|---|---|
| 1 | `GET /api/fiscal/series` | `FiscalSeriesConsultar` — `SeriesFiscaisController.cs:46-47` | query: `empresaId: Guid` (**obrigatório**, binding falha sem ele), `filialId?: Guid`, `modeloDocumentoFiscalId?: Guid`, `somenteAtivas?: bool`, `pagina: int = 1`, `tamanhoPagina: int = 20` (`:48-55`) | `PagedResult<SerieFiscalResponse>` — 11 campos (ver 1.1.1) |
| 2 | `POST /api/fiscal/series` | `FiscalSeriesGerenciar` — `:93-94` | `CriarSerieFiscalRequest` — 8 campos, todos posicionais sem `default` ⇒ **todos obrigatórios** na assinatura C# (`SerieFiscalContracts.cs:5-13`): `EmpresaId: Guid`, `FilialId?: Guid`, `ModeloDocumentoFiscalId: Guid`, `Numero: int`, `NumeroInicial: int`, `NumeroFinal: int`, `VigenciaInicio: DateOnly`, `VigenciaFim?: DateOnly` | `SerieFiscalResponse` (11 campos) |
| 3 | `GET /api/fiscal/series/{id}` | `FiscalSeriesConsultar` — `:66-67` | `id: Guid` na rota | `SerieFiscalResponse` |
| 4 | `GET /api/fiscal/series/{id}/buracos` | `FiscalSeriesConsultar` — `:80-81` | `id: Guid` na rota | `BuracosSerieFiscalResponse` — 5 campos (ver 1.1.1) |
| 5 | `POST /api/fiscal/series/{id}/ampliar` | `FiscalSeriesGerenciar` — `:106-107` | `AmpliarNumeroFinalSerieFiscalRequest(NovoNumeroFinal: int)` — 1 campo obrigatório (`SerieFiscalContracts.cs:15`) | `SerieFiscalResponse` |
| 6 | `POST /api/fiscal/series/{id}/encerrar-vigencia` | `FiscalSeriesGerenciar` — `:119-120` | `EncerrarVigenciaSerieFiscalRequest(VigenciaFim: DateOnly)` — 1 campo obrigatório (`:17`) | `SerieFiscalResponse` |
| 7 | `POST /api/fiscal/series/{id}/inativar` | `FiscalSeriesGerenciar` — `:133-134` | `InativarSerieFiscalRequest(Motivo: string)` — 1 campo obrigatório (`:19`, sem validador de tamanho — ver §2) | `204 No Content` (sem corpo) |

**1.1.1 — campos de resposta**

`SerieFiscalResponse` (`SerieFiscalContracts.cs:21-32`, 11 campos): `Id: Guid`, `EmpresaId: Guid`,
`FilialId: Guid?`, `ModeloDocumentoFiscalId: Guid`, `Numero: int`, `NumeroInicial: int`,
`NumeroFinal: int`, `ProximoNumero: int`, `VigenciaInicio: DateOnly`, `VigenciaFim: DateOnly?`,
`Ativa: bool`.

`BuracosSerieFiscalResponse` (`:35-40`, 5 campos): `SerieFiscalId: Guid`, `Numero: int`,
`NumeroInicial: int`, `UltimoNumeroAlocado: int`, `NumerosSemDocumentoAutorizado: int[]` — lista
**não paginada**, calculada por varredura de todo o intervalo alocado a cada chamada
(`ConsultarBuracosSerieFiscalUseCase.cs:39-54`, ver §6).

**Não há `FluentValidation`** para nenhum destes seis requests — toda validação de forma é feita no
construtor/métodos do agregado `SerieFiscal` (`Erp.Domain/Fiscal/Documentos/SerieFiscal.cs`), lança
`DomainException`, e o use case a converte em `SerieFiscalErrors.Validacao(...)` (Kind
`Validation`). Não existe classe `CriarSerieFiscalRequestValidator`.

### 1.2 NaturezasOperacao — 0/5 consumidos

Controller: `NaturezasOperacaoController.cs`. **A única entidade "por empresa" do Módulo 04**
(comentário de classe, `:11-15`) — todas as demais tabelas deste módulo são globais.

| # | Verbo + rota | Permissão (arquivo:linha) | Request | Response |
|---|---|---|---|---|
| 1 | `GET /api/fiscal/naturezas-operacao` | `FiscalCadastrosConsultar` — `:41-42` (mesma permissão de F3.4, não uma exclusiva de naturezas) | query: `empresaId: Guid` (obrigatório), `termo?`, `codigo?`, `tipoDocumento?: TipoDocumentoFiscal`, `tipoOperacao?: TipoOperacaoFiscal`, `finalidade?: FinalidadeNaturezaOperacao`, `somenteAtivas?: bool`, `pagina=1`, `tamanhoPagina=20` (`:43-53`) | `PagedResult<NaturezaOperacaoResponse>` — 15 campos (ver 1.2.1) |
| 2 | `POST /api/fiscal/naturezas-operacao` | `FiscalCadastrosGerenciar` — `:75-76` | `CriarNaturezaOperacaoRequest` — 12 campos, sem `default` posicional exceto `Observacao?`/`Cfops?` (`NaturezaOperacaoContracts.cs:17-30`): `EmpresaId: Guid`, `FilialId?: Guid`, `Codigo: string`, `Descricao: string`, `TipoDocumento: TipoDocumentoFiscal`, `TipoOperacao: TipoOperacaoFiscal`, `Finalidade: FinalidadeNaturezaOperacao`, `IndicadorPresencaComprador: IndicadorPresencaComprador`, `IndicadorConsumidorFinal: bool`, `MovimentaEstoque: bool`, `GeraFinanceiro: bool`, `Observacao?: string`, `Cfops?: MapeamentoCfopRequest[]` | `NaturezaOperacaoResponse` |
| 3 | `PUT /api/fiscal/naturezas-operacao/{id}` | `FiscalCadastrosGerenciar` — `:90-91` | `AtualizarNaturezaOperacaoRequest` — 10 campos (`:36-46`); **`Codigo` não entra** ("é a identidade do cadastro... notas fiscais já emitidas o referenciam", comentário `:33-34`) | `NaturezaOperacaoResponse` |
| 4 | `POST /api/fiscal/naturezas-operacao/{id}/inativar` | `FiscalCadastrosGerenciar` — `:106-107` | `InativarNaturezaOperacaoRequest(Motivo: string)` — 1 campo (`:48`) | `204 No Content` |
| 5 | `GET /api/fiscal/naturezas-operacao/{id}/cfop` | `FiscalCadastrosConsultar` — `:128-129` | query: `ufOrigem: string` (obrigatório), `ufDestino: string` (obrigatório), `tipoItem?: TipoItemCfop`, `operacaoComExterior: bool = false` (`:130-136`) | `CfopResolvidoResponse` — 8 campos (ver 1.2.1) |

**1.2.1 — campos de resposta**

`NaturezaOperacaoResponse` (`NaturezaOperacaoContracts.cs:53-68`, 15 campos): `Id`, `EmpresaId`,
`FilialId: Guid?`, `Codigo`, `Descricao`, `TipoDocumento`, `TipoOperacao`, `Finalidade`,
`IndicadorPresencaComprador`, `IndicadorConsumidorFinal: bool`, `MovimentaEstoque: bool`,
`GeraFinanceiro: bool`, `Observacao: string?`, `Ativa: bool`,
`Cfops: MapeamentoCfopResponse[]`. Cada `MapeamentoCfopResponse` (`:51`) tem 4 campos: `Ambito`,
`CfopId`, `CfopCodigo`, `TipoItem: TipoItemCfop?`.

`CfopResolvidoResponse` (`:74-82`, 8 campos): `NaturezaOperacaoId`, `NaturezaCodigo`, `Ambito`,
`CfopId`, `CfopCodigo`, `CfopDescricao`, `GeraFinanceiro: bool`, `MovimentaEstoque: bool`.

Sem `FluentValidation` para nenhum dos cinco — mesma disciplina da §1.1: validação de forma no
construtor/métodos de `NaturezaOperacao` (`Erp.Domain/Fiscal/Cadastros/NaturezaOperacao.cs:196-235`)
e de `NaturezaOperacaoCfop` (`:24-40`), erro convertido em `CadastrosFiscaisErrors.Validacao`.

### 1.3 CadastrosFiscais — 2/16 consumidos

Controller: `CadastrosFiscaisController.cs`. **Cadastro global** — nenhuma das 16 rotas exige
`empresaId` nem passa por `FiscalContextoOperacional` (comentário de classe, `:12-15`, confirmado:
nenhuma assinatura de ação recebe `empresaId`). **14 delas são só leitura (`GET`)**; a única escrita
é o importador em lote (`POST /importar/{tabela}`) — **não existe endpoint de criação/edição
individual de UF, município, NCM, CEST, CST, CSOSN, origem de mercadoria, unidade tributável ou
CFOP**: o cadastro nasce por carga de arquivo, não por formulário campo a campo.

| # | Verbo + rota | Consumido? | Permissão | Query (todos opcionais) | Response (por item) |
|---|---|---|---|---|---|
| 1 | `GET /api/fiscal/cadastros/uf` | ❌ | `FiscalCadastrosConsultar` (`:38-39`) | `termo?`, `ativo?` — **sem paginação** (`:40-43`, devolve `IReadOnlyList<UfResponse>` direto) | `UfResponse` — 6 campos: `Id`, `Sigla`, `Nome`, `CodigoIbge`, `AliquotaInternaPadraoReferencia: decimal?`, `Ativo`, `MotivoInativacao: string?` (`CadastrosFiscaisResponses.cs:6-13`) |
| 2 | `GET /api/fiscal/cadastros/paises` | ❌ | idem (`:49-50`) | `termo?`, `codigoBacen?`, `ativo?`, `pagina=1`, `tamanhoPagina=20` | `PaisResponse` — 5 campos (`:15-21`) |
| 3 | `GET /api/fiscal/cadastros/municipios` | ❌ | idem (`:63-64`) | `ufSigla?`, `termo?`, `codigoIbge?`, `ativo?`, paginação | `MunicipioIbgeResponse` — 7 campos: inclui `UfId: Guid`, `UfSigla` (`:23-31`) |
| 4 | `GET /api/fiscal/cadastros/cst-icms` | ❌ | idem (`:78-79`) | `termo?`, `codigo?`, `ativo?`, paginação | `CstIcmsResponse` — 5 campos (`:33-38`) |
| 5 | `GET /api/fiscal/cadastros/csosn` | ❌ | idem (`:92-93`) | idem | `CsosnResponse` — 5 campos (`:40-45`) |
| 6 | `GET /api/fiscal/cadastros/cst-ipi` | ❌ | idem (`:106-107`) | `+indicadorOperacao?: IndicadorOperacaoCst` | `CstIpiResponse` — 6 campos, inclui `IndicadorOperacao` (`:47-53`) |
| 7 | `GET /api/fiscal/cadastros/cst-pis-cofins` | ❌ | idem (`:121-122`) | `+indicadorOperacao?`, `+geraCredito?: bool` | `CstPisCofinsResponse` — 7 campos (`:55-62`) |
| 8 | `GET /api/fiscal/cadastros/origens-mercadoria` | ❌ | idem (`:137-138`) | `termo?`, `codigo?`, `ativo?`, paginação | `OrigemMercadoriaResponse` — 6 campos, inclui `EhEstrangeira: bool` (`:64-70`) |
| 9 | `GET /api/fiscal/cadastros/unidades-tributaveis` | ❌ | idem (`:151-152`) | `termo?`, `sigla?`, `ativo?`, paginação | `UnidadeTributavelResponse` — 5 campos (`:72-77`) |
| 10 | `GET /api/fiscal/cadastros/cfop` | ✅ **parcial** | idem (`:165-166`) | `termo?`, `codigo?`, `tipo?: TipoCfop`, `ambito?: AmbitoCfop`, `indicadorDevolucao?`, `indicadorTransferencia?`, `indicadorIndustrializacao?`, `geraFinanceiro?`, `movimentaEstoque?`, `ativo?`, paginação (`:167-198`) | `CfopResponse` — **12 campos** (`:121-133`); frontend lê **5/12** (ver 1.3.1) |
| 11 | `GET /api/fiscal/cadastros/ncm` | ✅ **parcial** | idem (`:200-201`) | `termo?`, `codigo?`, `vigenteEm?: DateOnly`, `ativo?`, paginação | `NcmResponse` — **9 campos** (`:79-89`); frontend lê **4/9** (ver 1.3.1) |
| 12 | `GET /api/fiscal/cadastros/cest` | ❌ | idem (`:215-216`) | `termo?`, `codigo?`, `segmento?`, `ativo?`, paginação | `CestResponse` — 5 campos (`:91-97`) |
| 13 | `GET /api/fiscal/cadastros/ncm-cest` | ❌ | idem (`:230-231`) | `ncmCodigo?`, `cestCodigo?`, `ativo?`, paginação | `NcmCestResponse` — 6 campos (`:99-106`) |
| 14 | `GET /api/fiscal/cadastros/ncm/{codigo}/validacao` | ❌ | idem (`:248-249`) | `codigo` na rota; `cestCodigo?`, `dataOperacao?: DateOnly` (default hoje) | `ValidacaoNcmCestResponse` — 6 campos: `NcmCodigo`, `NcmVigente: bool`, `ExigeCest: bool`, `CestsVinculados: string[]`, `CestInformado: string?`, `CestCompativel: bool` (`:113-119`) |
| 15 | `GET /api/fiscal/cadastros/codigos-servico` | ❌ | idem (`:271-272`) | `municipioCodigoIbge?`, `codigoLc116?`, `termo?`, `ativo?`, paginação | `CodigoServicoMunicipalResponse` — 9 campos, inclui `AliquotaIssPadrao: decimal?` (`NaturezaOperacaoContracts.cs:84-93`) |
| 16 | `POST /api/fiscal/cadastros/importar/{tabela}` | ❌ | `FiscalCadastrosGerenciar` — **única rota de escrita do módulo** (`:299-300`) | `tabela: TabelaOficialFiscal` na rota (enum, 9 valores — ver §6) | `ResumoImportacaoTabelaOficial` — 7 campos: `Tabela`, `Arquivo: string`, `LinhasLidas: int`, `Inseridos: int`, `Atualizados: int`, `Inalterados: int`, `Rejeitadas: LinhaRejeitadaImportacao[]` (3 campos cada: `Linha`, `Codigo?`, `Motivo`) — mais `Rejeitados`/`TemDivergencias` computados (`ResumoImportacaoTabelaOficial.cs:12-23`) |

**1.3.1 — os 2 endpoints já consumidos (resumo, não CRUD)**

`features/tributacao/api/tributacaoApi.ts:232-243` (`listarNcm`, `listarCfop`) alimentam só os
combos de seleção de `RegrasFiscaisPage`/`ExcecoesFiscaisPage` via
`features/tributacao/hooks/useTributacao.ts:72-96` (`useNcmOptions`, `useCfopOptions`), consumidos
em `features/tributacao/components/CadastroFiscalSelects.tsx:37,74`. Tipos reduzidos declarados em
`features/tributacao/types/tributacao.types.ts:652-665`:

```text
NcmResumoResponse   { id, codigo, descricao, ativo }              — 4 de 9 campos do NcmResponse
CfopResumoResponse  { id, codigo, descricao, tipo, ativo }        — 5 de 12 campos do CfopResponse
```

Campos do backend nunca lidos por este consumo: de `NcmResponse` — `Capitulo`,
`AliquotaIpiReferencia`, `VigenciaInicio`, `VigenciaFim`, `ExTipi`, `MotivoInativacao` (6); de
`CfopResponse` — `Ambito`, `IndicadorDevolucao`, `IndicadorTransferencia`,
`IndicadorIndustrializacao`, `GeraFinanceiro`, `MovimentaEstoque`, `MotivoInativacao` (7). Nenhum
`.strict()`/Zod valida a resposta destes dois — são `type` TS puro, mesma classe de risco do achado
"campo aditivo vira `undefined` em silêncio" já registrado em `FLUXOS-E-REGRAS-PARA-A-UI.md:258-273`.

### 1.4 Pessoas — bloco fiscal e pré-requisitos — 4/19 consumidos (endpoints); 12/22 campos de `PessoaResponse` consumidos

O GAP marca "Pessoas: faltam 15". Dessas 15, **3 são estritamente fiscais** (o escopo declarado de
F3.3) e **12 são pré-requisito funcional não-fiscal** (endereço/contato/bloqueio) sem os quais os
3 fiscais não produzem nota fiscal válida — ver §5. Todas guardadas por contexto organizacional
resolvido a partir da própria pessoa (`pessoa.EmpresaId`/`pessoa.FilialId`, checado dentro do use
case via `PessoaContextoOperacional`/`FiscalContextoOperacional`), nunca por `empresaId` na query.

**1.4.1 — estritamente fiscais (o "+8" do plano)**

| # | Verbo + rota | Permissão (arquivo:linha) | Request | Response |
|---|---|---|---|---|
| 1 | `PATCH /api/pessoas/{id}/dados-fiscais` | `PessoasDadosFiscaisGerenciar` — `PessoasController.cs:56-57` | `AtualizarDadosFiscaisPessoaRequest` — **8 campos, todos opcionais na assinatura** (`PessoaRequests.cs:37-45`): `IndicadorContribuinteIcms?: IndicadorContribuinteIcms`, `InscricaoEstadualSt?: string`, `Suframa?: string`, `RegimeTributarioParceiro?: RegimeTributario`, `MunicipioIbgeCodigo?: string`, `PaisCodigoBacen?: string`, `ContribuinteIpi?: bool`, `TomadorOrgaoPublico?: bool`. **Regra condicional** (não expressa no tipo): se qualquer campo vier preenchido, `IndicadorContribuinteIcms` passa a ser obrigatório — ver §2 | `PessoaResponse` (22 campos, ver 1.4.3) |
| 2 | `PATCH /api/pessoas/{id}/enderecos/{enderecoId}/municipio` | `PessoasDadosFiscaisGerenciar` — `:179-180` | `VincularMunicipioEnderecoPessoaRequest(MunicipioIbgeCodigo?: string)` — 1 campo; vazio/nulo **desvincula** de propósito (`EnderecoContatoRequests.cs:27-31`); validado `Length(7)` + regex `^[0-9]{7}$` só quando preenchido (`EnderecoContatoValidators.cs:41-44`) | `EnderecoPessoaResponse` — 13 campos |
| 3 | `POST /api/pessoas/enderecos/backfill-municipios` | `PessoasDadosFiscaisGerenciar` — `:196-197` | `BackfillMunicipiosEnderecosPessoaRequest(EmpresaId: Guid, FilialId?: Guid)` — `EmpresaId` obrigatório (`NotEmpty`, `EnderecoContatoValidators.cs:52`) | `BackfillMunicipiosEnderecosPessoaResponse` — 3 campos: `Analisados: int`, `Vinculados: int`, `Divergencias: DivergenciaMunicipioEnderecoResponse[]` (5 campos cada, `EnderecoContatoResponse.cs:22-32`) |

**1.4.2 — pré-requisito funcional, não-fiscal (as outras 12 das 15 faltantes)**

| # | Verbo + rota | Permissão | Request/Response (contagem) |
|---|---|---|---|
| 4 | `POST /api/pessoas/{id}/bloquear` | `PessoasBloquear` — `:69-70` | `BloquearPessoaRequest(Motivo: string)`, `NotEmpty().MaximumLength(300)` (`PessoaValidators.cs:67-72`) → `PessoaResponse` |
| 5 | `POST /api/pessoas/{id}/desbloquear` | `PessoasBloquear` — `:82-83` | sem corpo → `PessoaResponse` |
| 6 | `GET /api/pessoas/{id}/enderecos` | `PessoasConsultar` — `:108-109` | — → `EnderecoPessoaResponse[]` |
| 7 | `POST /api/pessoas/{id}/enderecos` | `PessoasGerenciar` — `:121-122` | `AdicionarEnderecoPessoaRequest` — 9 campos, `Tipo`/`Logradouro`/`Numero`/`Bairro`/`Cidade`/`Uf`(2)/`Cep` obrigatórios, `Complemento`/`Principal` não (`EnderecoContatoRequests.cs:5-14`, validador `EnderecoContatoValidators.cs:5-17`) → `EnderecoPessoaResponse` |
| 8 | `PUT /api/pessoas/{id}/enderecos/{enderecoId}` | `PessoasGerenciar` — `:134-135` | `AtualizarEnderecoPessoaRequest` — mesmos 9 campos → `EnderecoPessoaResponse` |
| 9 | `POST /api/pessoas/{id}/enderecos/{enderecoId}/principal` | `PessoasGerenciar` — `:147-148` | sem corpo → `EnderecoPessoaResponse` |
| 10 | `DELETE /api/pessoas/{id}/enderecos/{enderecoId}` | `PessoasGerenciar` — `:160-161` | — → `204 No Content` |
| 11 | `GET /api/pessoas/{id}/contatos` | `PessoasConsultar` — `:209-210` | — → `ContatoPessoaResponse[]` |
| 12 | `POST /api/pessoas/{id}/contatos` | `PessoasGerenciar` — `:222-223` | `AdicionarContatoPessoaRequest` — 4 campos, `Tipo`/`Valor` obrigatórios (`EnderecoContatoRequests.cs:39-43`) → `ContatoPessoaResponse` |
| 13 | `PUT /api/pessoas/{id}/contatos/{contatoId}` | `PessoasGerenciar` — `:235-236` | `AtualizarContatoPessoaRequest` — mesmos 4 campos → `ContatoPessoaResponse` |
| 14 | `POST /api/pessoas/{id}/contatos/{contatoId}/principal` | `PessoasGerenciar` — `:248-249` | sem corpo → `ContatoPessoaResponse` |
| 15 | `DELETE /api/pessoas/{id}/contatos/{contatoId}` | `PessoasGerenciar` — `:261-262` | — → `204 No Content` |

`EnderecoPessoaResponse` (13 campos, `EnderecoContatoResponse.cs:6-19`): `Id`, `PessoaId`,
`Tipo: TipoEndereco`, `Logradouro`, `Numero`, `Complemento: string?`, `Bairro`, `Cidade`, `Uf`,
`Cep`, `Principal: bool`, `Status: EntityStatus`, `MunicipioIbgeId: Guid?` — este último é o campo
que a rota #2 acima resolve, e é o que falta para o documento fiscal (ver §5).
`ContatoPessoaResponse` (7 campos, `:34-41`): `Id`, `PessoaId`, `Tipo: TipoContato`, `Valor`,
`Nome: string?`, `Principal: bool`, `Status`.

**1.4.3 — `PessoaResponse` já consumida (4 endpoints existentes) × contrato do backend**

Backend, 22 campos posicionais (`PessoaResponse.cs:7-29`): `Id`, `EmpresaId`, `FilialId: Guid?`,
`TipoPessoa`, `NomeRazaoSocial`, `NomeFantasia: string?`, `Documento`, `InscricaoEstadual: string?`,
`InscricaoMunicipal: string?`, `IndicadorContribuinteIcms: IndicadorContribuinteIcms?`,
`IndicadorIeDestinatario: IndicadorIeDestinatario?`, `InscricaoEstadualSt: string?`,
`Suframa: string?`, `RegimeTributarioParceiro: RegimeTributario?`, `MunicipioIbgeId: Guid?`,
`PaisId: Guid?`, `Observacao: string?`, `Bloqueada: bool`, `MotivoBloqueio: string?`,
`Status: EntityStatus`, `ContribuinteIpi: bool?`, `TomadorOrgaoPublico: bool?`.

Frontend, `PessoaResponse` (`features/pessoas/types/pessoas.types.ts:9-21`, 12 campos): `id`,
`empresaId`, `filialId`, `tipoPessoa`, `nomeRazaoSocial`, `nomeFantasia`, `documento`,
`inscricaoEstadual`, `inscricaoMunicipal`, `observacao`, `status`, `createdAt?` — este último **sem
par no backend** (ver Divergências, DIV-6).

```text
11 campos comuns, com par exato de tipo
+ 1 campo do TS sem par no backend (createdAt)
+ 11 campos do backend ausentes do TS:
    IndicadorContribuinteIcms, IndicadorIeDestinatario, InscricaoEstadualSt, Suframa,
    RegimeTributarioParceiro, MunicipioIbgeId, PaisId, Bloqueada, MotivoBloqueio,
    ContribuinteIpi, TomadorOrgaoPublico
= 22 campos do backend (11 + 11) ✓ fecha
```

Medição: contagem manual dos 22 parâmetros posicionais do `record` contra as 12 propriedades do
`type` TS, cruzada por nome.

### 1.5 ModelosDocumentoFiscal — 0/1 consumido

Controller: `ModelosDocumentoFiscalController.cs`. **Cadastro global, só leitura** — não há
`POST`/`PUT`/`inativar` expostos pela API (o domínio tem `Criar`/`Atualizar` em
`ModeloDocumentoFiscal.cs:44-52`, mas nenhum controller os chama); não existe
`FiscalModelosGerenciar` no backend (confirmado: `grep -n "FiscalModelos" SystemPermissions.cs`
devolve só `FiscalModelosConsultar`, linha 135). "Semear um modelo aqui não é compromisso de
implementar a emissão dele" (`ModeloDocumentoFiscal.cs:11-14`).

| # | Verbo + rota | Permissão | Query | Response |
|---|---|---|---|---|
| 1 | `GET /api/fiscal/modelos-documento` | `FiscalModelosConsultar` — `:26-27` | `termo?`, `codigo?`, `ativo?`, `pagina=1`, `tamanhoPagina=20` | `PagedResult<ModeloDocumentoFiscalResponse>` — 5 campos: `Id`, `Codigo`, `Descricao`, `Sigla`, `Ativo`, `MotivoInativacao: string?` (`ModeloDocumentoFiscalContracts.cs:7-13`) |

### 1.6 ClassificacoesPessoa — vizinhança do GAP, não no escopo numerado de F3 — 0/4 consumidos

Citado porque o briefing manda ler "pela vizinhança"; não é item F3.1-F3.5. Controller:
`ClassificacoesPessoaController.cs`.

| # | Verbo + rota | Permissão | Request | Response |
|---|---|---|---|---|
| 1 | `GET /api/pessoas/classificacoes` | `PessoasConsultar` — `:22-23` | `empresaId: Guid` (obrigatório), `termo?` | `ClassificacaoPessoaResponse[]` — 6 campos: `Id`, `EmpresaId`, `Codigo`, `Nome`, `Descricao: string?`, `Status` |
| 2 | `POST /api/pessoas/classificacoes` | `ClassificacoesPessoaGerenciar` — `:30-31` | `CriarClassificacaoPessoaRequest(EmpresaId, Codigo, Nome, Descricao?)` — 4 campos | `ClassificacaoPessoaResponse` |
| 3 | `PUT /api/pessoas/classificacoes/{id}` | idem — `:43-44` | `AtualizarClassificacaoPessoaRequest(EmpresaId, Nome, Descricao?)` — 3 campos | `ClassificacaoPessoaResponse` |
| 4 | `POST /api/pessoas/classificacoes/{id}/inativar` | idem — `:56-57` | `InativarClassificacaoPessoaRequest(EmpresaId, Motivo)` — 2 campos | `204 No Content` |

---

## 2. Regra de negócio que a UI precisa respeitar

Todas as citações abaixo são leitura direta do domínio/`Application`, não dedução.

**Vigência e encerramento de série.** `SerieFiscal.AlocarProximoNumero` (`SerieFiscal.cs:94-120`)
recusa alocar quando `dataOperacao < VigenciaInicio` ou `> VigenciaFim` (quando definido) ou quando
`!IsActive`. `EncerrarVigencia` (`:136-140`) só seta `VigenciaFim`; **não apaga nem move** os
números já alocados — histórico preservado (invariante 6, comentário `:9-13`).

**Ampliação de faixa.** `AmpliarNumeroFinal` (`:123-133`) **nunca reduz**: `novoNumeroFinal <
NumeroFinal` lança `DomainException`. Não há operação simétrica para reduzir `NumeroInicial`.

**Duplicidade de série, não "sobreposição" de faixa.** `CriarSerieFiscalUseCase` (`:58-63`) barra
duas séries **ativas** com o mesmo `(EmpresaId, FilialId, ModeloDocumentoFiscalId, Numero)` —
`Numero` é o identificador de 3 dígitos da série (0-999), **não** o intervalo
`NumeroInicial-NumeroFinal`. **Não existe checagem de sobreposição de faixa entre séries
diferentes**: nada impede cadastrar a série `Numero=1` com faixa 1-1000 e a série `Numero=2` com
faixa 500-1500 para a mesma empresa/filial/modelo — cada série tem seu próprio contador
independente, e a legislação não proíbe isso (números de série ≠ números de documento). Não é
lacuna a fechar; é a regra tal como o domínio a implementa hoje.

**Buraco de numeração.** É legítimo por definição — "a legislação prevê e se resolve com
inutilização formal" (`ConsultarBuracosSerieFiscalUseCase.cs:7-13`). O que a UI precisa é **tornar
visível**, não impedir: o endpoint #4 da §1.1 devolve os números entre `NumeroInicial` e
`ProximoNumero - 1` que não têm nota fiscal autorizada (ou cancelada-após-autorizada) vinculada.

**Inativação bloqueia uso.** Série inativa: `AlocarProximoNumero` recusa (`:96-99`); `Ampliar`/
`EncerrarVigencia` também recusam via `GarantirPodeAlterarFaixa` (`:142-148`). Natureza de operação
inativa: `AtualizarCabecalho`/`MapearCfop`/`RemoverMapeamento` recusam via `GarantirAtiva`
(`NaturezaOperacao.cs:188-194`) — **mas `ResolverNaturezaAsync` (usado ao derivar CFOP num item
novo, `CfopDoItemResolver.cs:112-124`) não confere `IsActive`**: uma natureza inativa continua
sendo aceita para derivar CFOP de item novo. Não decido se é lacuna; registro como achado em
Divergências (DIV-3).

**Derivação de CFOP — natureza + âmbito + tipo de item.** `AmbitoCfopResolver.Resolver` (
`AmbitoCfopResolver.cs:24-35`): UFs iguais ⇒ `Interno`; diferentes ⇒ `Interestadual`; qualquer lado
= `"EX"` ou `operacaoComExterior=true` ⇒ `Exterior` (exterior **sempre prevalece** sobre a
comparação de UFs). `NaturezaOperacao.ResolverCfop(ambito, tipoItem)` (`NaturezaOperacao.cs:166-
175`) tenta a combinação exata `(ambito, tipoItem)` e cai no mapeamento "qualquer item"
(`tipoItem = null`) só quando `tipoItem` não é nulo e a combinação exata não existe — `tipoItem`
nulo **é** a própria chave do fallback, não aciona busca adicional. `TipoItemCfop` é derivado do
produto: `ProdutoEmProcesso`/`ProdutoAcabado` (SPED 03/04) ⇒ `ProducaoPropria`; todo o resto
(inclusive ausência de classificação) ⇒ `Revenda`, o comportamento conservador
(`TipoItemCfop.cs:38-42`). `NaturezaOperacaoCfop` recusa no cadastro CFOP de âmbito incompatível
com o âmbito do mapeamento (`NaturezaOperacaoCfop.cs:36-41`) e CFOP inativo (`:43-45`).

**A fronteira "ausência × defeito" na emissão de item.** Documentada em
`AdicionarItemNotaFiscalUseCase` (`NotaFiscalBasicaUseCases.cs:106-138`): nota **sem** natureza de
operação vinculada é "ainda não parametrizado" — item nasce sem CFOP, não é erro. Nota **com**
natureza: falha de derivação (natureza inexistente/de outra empresa, UF não resolvível,
sem mapeamento para o âmbito/tipo) é sempre erro. Havendo derivação, o CFOP informado pelo request
vira **conferência**: vazio adota o derivado; preenchido e divergente é falha incondicional
(`CfopDoItemResolver.ConferirDivergencia`, `:162-184`, `D4`) — nunca "escolhe um dos dois lados".

**Bloco fiscal da pessoa: obrigatoriedade condicional não expressa no tipo.**
`PessoaDadosFiscaisResolver.ResolverAsync` (`PessoaDadosFiscaisResolver.cs:31-41`): se **todos** os
8 campos de `AtualizarDadosFiscaisPessoaRequest` vierem vazios, o bloco é limpo (não é erro — "a
pessoa pode ainda não ter sido classificada"). Se **qualquer** outro campo vier preenchido e
`IndicadorContribuinteIcms` não vier, falha com
`CadastrosFiscaisErrors.IndicadorContribuinteIcmsObrigatorio` (`:38-41`). Município/país são
resolvidos por **código**, nunca por GUID digitado (`ResolverMunicipioIdAsync`/
`ResolverPaisIdAsync`, `:46-59`) — coerente com a proibição de "aceitar GUID digitado para vínculo
de entidade" do padrão do projeto.

**`IndicadorIeDestinatario` é sempre derivado, nunca informado.** `DadosFiscaisPessoa.Criar`
calcula-o a partir de `IndicadorContribuinteIcms` (`DadosFiscaisPessoa.cs:133`,
`IndicadorContribuinteIcms.cs:26-32`): `Contribuinte→1`, `Isento→2`, `NaoContribuinte→9`. Não existe
(nem deveria existir) campo de escrita para ele.

**Documento fiscal depende de série e natureza cadastradas — a mensagem que manda o operador para
uma tela que não existe hoje.** `CriarNotaFiscalUseCase` grava `Serie`/`Numero` como **texto livre**
(`NotaFiscalBasicaUseCases.cs:42-64`) — a nota manual não referencia `SerieFiscal` por FK na
criação. A referência acontece **na validação** (transição Rascunho→Validada):
`ValidarNotaFiscalUseCase.PrepararNumeracaoAsync` (`ValidarNotaFiscalUseCase.cs:254-284`) parseia
`nota.Serie` como inteiro 0-999 e busca `SerieFiscal` por `(EmpresaId, FilialId, ModeloId,
NumeroSerie)`; se não achar, falha com:

```text
Fiscal.SerieFiscalNaoCadastradaParaContexto
"Não há série fiscal {numeroSerie} cadastrada para o modelo {codigoModelo} em {empresa/filial};
 cadastre a série antes de validar o documento fiscal."
(FiscalErrors.cs:166-170)
```

É a mensagem literal — **é exatamente "manda o operador para uma tela que não existe"**: não há
`app/(main)/fiscal/series` nem diálogo de criação de série em nenhum lugar do frontend hoje.
Simetricamente, `AdicionarItemNotaFiscalUseCase` com natureza vinculada mas sem CFOP mapeado falha
com `Fiscal.CfopSemMapeamentoParaAmbito`, mensagem "...cadastre o CFOP antes de gerar o documento
fiscal" (`FiscalErrors.cs:283-286`) — mesma classe, tela de Naturezas de Operação inexistente. E o
`DestinatarioFiscalResolver` (usado tanto na derivação de CFOP quanto no cálculo tributário) falha
com `DestinatarioSemEnderecoFiscal`/`DestinatarioSemMunicipioIbge`/
`DestinatarioSemIndicadorContribuinteIcms` (`FiscalErrors.cs:218-244,304-307`) quando a pessoa não
tem endereço, não tem município IBGE vinculado ao endereço, ou não tem o bloco fiscal preenchido —
telas hoje inexistentes em `features/pessoas` (ver §5).

**Alocação de numeração é transacional e reentrante — a UI não vê 409 aqui na prática.**
`AlocarNumeroSerieUseCase` (`AlocarNumeroSerieUseCase.cs:97-190`) resolve conflito de concorrência
(`xmin`) internamente, com até 5 tentativas (`MaximoTentativas`, `:72`), relendo a série do zero em
cada uma. Só depois de esgotar as tentativas devolve
`SerieFiscalErrors.ConflitoConcorrenciaNaAlocacao` (Kind `Conflict`) — e mesmo esse erro sai como
**400**, não 409 (ver próximo parágrafo).

**O que é 409/422 esperado — e o que o código realmente devolve.** `ApiErrorResponseFilter`
(`ApiErrorResponseFilter.cs:80-93`) só remapeia `NotFound`/`Forbidden` → 404 e `Unauthorized` → 401;
**`Validation` e `Conflict` saem com o `StatusCode` que o controller já tiver setado**. Todos os
controllers desta rodada (`SeriesFiscaisController`, `NaturezasOperacaoController`,
`CadastrosFiscaisController`, `PessoasController`) chamam **sempre** `BadRequest(resultado.Error)`
em toda falha — **inclusive** para os erros que a própria fábrica marca como `Error.Conflict`
(`JaExisteSerieAtivaParaContexto`, `SerieFiscalErrors.cs:20-23`;
`NaturezaOperacaoCodigoDuplicado`, `CadastrosFiscaisErrors.cs:105-106`;
`ConflitoConcorrenciaNaAlocacao`/`ConflitoConcorrenciaAoNumerarDocumento`,
`SerieFiscalErrors.cs:37-46`). **Na prática, todo erro de negócio destas seis áreas chega ao
frontend como HTTP 400**, nunca 409, apesar do `Kind` semântico ser `Conflict` em quatro casos.
`422 (UnprocessableEntity)` só existe em **um** lugar deste recorte inteiro:
`TributacaoSimulacaoController.Simular` (`TributacaoSimulacaoController.cs:52-61`), e só para
`MotorTributarioException` (falha de **cálculo**, não de cadastro) — o comentário de
`AdicionarItemNotaFiscalUseCase.cs:121,130,135` fala em "422"/"422 incondicional" para a derivação de
CFOP, mas essa é a intenção documentada no domínio, não o que o controller `NotasFiscaisController.
AdicionarItem` (`:86-93`) de fato devolve (`BadRequest`, 400). Ver Divergências DIV-1.

---

## 3. Contexto organizacional

| Cadastro | Exige `empresaId`? | Exige `filialId`? | Guard | Onde |
|---|---|---|---|---|
| SeriesFiscais | Sim, sempre (query obrigatória em `GET`, campo obrigatório em `POST`) | Opcional (série pode ser da empresa toda ou de uma filial específica) | `FiscalContextoOperacional.GarantirAcesso(empresaId, filialId)` dentro de cada use case | `SerieFiscalUseCases.cs:41,128,188,251,302,332` |
| NaturezasOperacao | Sim, sempre — **é a única entidade "por empresa" do módulo** | Opcional | idem, `NaturezaOperacaoUseCases.cs:59,151,239` | — |
| CadastrosFiscais (UF/país/município/CST/CSOSN/origem/unidade/CFOP/NCM/CEST/serviço/importar) | **Não** — cadastro global, nenhuma ação recebe `empresaId` | Não | Nenhum — não há guard organizacional nestas 16 rotas | `CadastrosFiscaisController.cs` (comentário de classe `:12-15`) |
| ModelosDocumentoFiscal | Não — global | Não | Nenhum | `ModelosDocumentoFiscalController.cs:9-11` |
| Pessoas — dados-fiscais / endereço-município / backfill | Contexto vem da **pessoa já existente** (`pessoa.EmpresaId`/`FilialId`), não de query própria; `backfill-municipios` exige `EmpresaId` explícito no corpo, cruzado com o contexto do usuário | Idem (`backfill` aceita `FilialId?`) | `PessoaContextoOperacional.Validar` dentro do use case | `AtualizarDadosFiscaisPessoaUseCase.cs:59-63` |
| ClassificacoesPessoa | Sim (`empresaId` na query/corpo) | — | idem | `ClassificacoesPessoaController.cs:24,32,45,58` |

---

## 4. Permissões

**Todas as permissões necessárias a F3 já existem no union, no catálogo e no snapshot** —
diferente da onda F1/F2, esta fatia **não** precisa de `PermissionCode` novo.

| Permissão | Backend (`SystemPermissions.cs`) | Union (`types/erp.ts`) | Catálogo (`permissoesCatalogo.ts`) | Snapshot (`backend-permissions.snapshot.json`) |
|---|---|---|---|---|
| `FISCAL_SERIES_CONSULTAR` | `:133` | `:293` | `:123` | linha 127 |
| `FISCAL_SERIES_GERENCIAR` | `:134` | `:294` | `:124` | linha 128 |
| `FISCAL_CADASTROS_CONSULTAR` | `:126` | `:291` | `:121` | linha 114 |
| `FISCAL_CADASTROS_GERENCIAR` | `:127` | `:292` | `:122` | linha 115 |
| `FISCAL_MODELOS_CONSULTAR` | `:135` | `:295` | `:125` | linha 123 |
| `PESSOAS_BLOQUEAR` | (confirmado, `SystemPermissions.cs:48`) | `:233` | `:48` | linha 153 |
| `PESSOAS_DADOS_FISCAIS_GERENCIAR` | `:49` | `:234` | `:49` | linha 155 |
| `CLASSIFICACOES_PESSOA_GERENCIAR` | `:50` | `:235` | `:50` | linha 60 |

Todas as oito strings batem **exatamente** entre os quatro arquivos (medição: `grep -n` de cada
código nos quatro arquivos, comparação literal). `npm run validate:backend-permissions` já conhece
todas — não é `not_run` por falta de dado, é `não executado nesta rodada` porque o inventariante não
roda gate (ver bloco final).

**O que falta é routing, não permissão.** `grep -n "fiscal/series\|naturezas-operacao\|cadastros-
fiscais\|modelos-documento" lib/security/routePermissions.ts layout/AppMenu.tsx` devolve **zero
ocorrências** nos dois arquivos — nenhuma rota nova tem entrada em `routePermissions.ts`, nenhum
item novo existe em `AppMenu.tsx`. `/pessoas` já tem entrada catch-all
(`routePermissions.ts:14`, `anyOf: ['PESSOAS_CONSULTAR', 'PESSOAS_GERENCIAR']`) que cobre qualquer
diálogo novo dentro da mesma rota — não precisa de linha nova se o bloco fiscal virar diálogo da
mesma tela.

`FISCAL_CADASTROS_CONSULTAR`/`_GERENCIAR` guardam **tanto** as 16 rotas de F3.4 **quanto** as 5 de
F3.2 (`NaturezasOperacaoController.cs:42,76,91,107,129` usa as mesmas duas constantes de
`CadastrosFiscaisController.cs`) — o GAP separa os dois em módulos distintos (`CadastrosFiscais` ×
`NaturezasOperacao`), mas não há permissão própria para naturezas de operação no backend hoje.

---

## 5. Consumidores e dependências cruzadas

```text
NotaFiscal (validação, Rascunho → Validada)
  └─ ValidarNotaFiscalUseCase.PrepararNumeracaoAsync (ValidarNotaFiscalUseCase.cs:254-284)
       exige: SerieFiscal cadastrada para (empresa, filial, modelo, nº da série em nota.Serie)
       falha sem tela: "Fiscal.SerieFiscalNaoCadastradaParaContexto" (FiscalErrors.cs:166-170)

NotaFiscal (item novo, manual ou de pedido)
  └─ AdicionarItemNotaFiscalUseCase (NotaFiscalBasicaUseCases.cs:173-260ss)
       └─ CfopDoItemResolver.ResolverNaturezaAsync/ResolverUfsAsync/ResolverCfopItem
            exige: NaturezaOperacao cadastrada + CFOP mapeado para o âmbito/tipo de item
            falha sem tela: "Fiscal.CfopSemMapeamentoParaAmbito" (FiscalErrors.cs:283-286)
       └─ DestinatarioFiscalResolver (via ResolverUfsAsync)
            exige: Pessoa com endereço ativo, principal, com UF de 2 letras e MunicipioIbgeId
            falha sem tela: "Fiscal.DestinatarioSemEnderecoFiscal" /
              "Fiscal.DestinatarioSemEnderecoPrincipal" / "Fiscal.DestinatarioSemMunicipioIbge"
            (FiscalErrors.cs:218-244) — nenhuma tela em features/pessoas cadastra endereço hoje

NotaFiscal (cálculo tributário, dentro da mesma validação)
  └─ ContextoTributarioDocumentoResolver
       exige: Pessoa.IndicadorContribuinteIcms preenchido (quando DIFAL/ST aplicável)
       falha sem tela: "Fiscal.DestinatarioSemIndicadorContribuinteIcms" (FiscalErrors.cs:304-307)

POST /api/fiscal/tributacao/simular (DocumentoTributavelRequest)
  NÃO referencia SerieFiscal nem NaturezaOperacao por Id — recebe UfOrigem/UfDestino,
  NcmId/NcmCodigo, CfopId/CfopCodigo direto no corpo (ICalculadoraTributacaoDocumento.cs:27-120).
  Não é consumidor cruzado de F3.1/F3.2; é consumidor de F3.4 (NCM/CFOP) só por código/id solto,
  sem passar pelos endpoints de listagem.

features/fiscal/components/FiscalActionDialogs.tsx (CriarNotaFiscalDialog, linha 136;
  GerarNotaFiscalPedidoVendaDialog, linha 187)
  campo "Natureza de operação": <InputText disabled> com hint
  "Ainda sem endpoint operacional no backend; deixe vazio até parametrização fiscal oficial."
  — FALSO hoje: POST/PUT /api/fiscal/naturezas-operacao existem e funcionam (ver DIV-2).
  campo "Série" (linhas 109,133,150,183): <InputText> texto livre, sem combo, sem validação
  contra SerieFiscal — o operador digita "1" e só descobre que a série não existe na validação.

features/tributacao (RegrasFiscaisPage / ExcecoesFiscaisPage / CadastroFiscalSelects.tsx)
  únicos consumidores hoje de CadastrosFiscais (NCM e CFOP, resumo — ver 1.3.1).
```

---

## 6. Volume

Medido diretamente nas migrations de seed (`Erp.Infrastructure/Persistence/Migrations/*.cs`,
contagem de linhas `new Guid(...)` dentro de cada bloco `InsertData`) e no `data/fiscal/README.md`
(que declara explicitamente quais tabelas são amostra).

| Cadastro | Linhas hoje na base (seed de migration) | É "amostra" ou completo? | Paginação da API |
|---|---:|---|---|
| UF | 27 (`20260727171446_CadastrosFiscaisGeografia.cs:106-137`) | **Completo** — os 27 estados+DF | `GET /uf` **não pagina** (`IReadOnlyList` direto) |
| País (BACEN) | seed pequeno + `data/fiscal/pais.csv` (25 linhas incl. cabeçalho) | **Amostra** — "principais parceiros comerciais" (`README.md:73`) | Pagina, default 20 |
| Município IBGE | seed pequeno + `data/fiscal/municipio-ibge.csv` (32 linhas incl. cabeçalho) | **Amostra** — só "as 27 capitais" (`README.md:72`); universo oficial tem ~5.570 municípios | Pagina, default 20 |
| CST-ICMS | 14 (`20260727180100_...:145-159`) | **Completo** — tabela oficial fixa | Pagina, default 20 (paginação não muda o fato de a tabela inteira caber numa página) |
| CSOSN | 10 (`:127-136`) | Completo | idem |
| CST-IPI | 14 (`:168-181`) | Completo | idem |
| CST-PIS/COFINS | 32 (`:190-222`) | Completo | idem |
| Origem da mercadoria | 9 (`:231-239`) | Completo | idem |
| Unidade tributável | 40 (`:248-289`) | Completo (lista de siglas de uso corrente) | idem |
| CFOP | ~60 pré-carregados na migration (`20260728133102_CadastrosFiscaisCfop.cs:40-...`) + `data/fiscal/cfop.csv` com 80 linhas incl. cabeçalho para reimportação | **Amostra** — "operações de uso corrente" (`README.md:71`); a tabela oficial do Convênio s/nº de 1970 tem centenas de códigos | Pagina, default 20, com 9 filtros combináveis |
| NCM (TIPI) | `data/fiscal/ncm.csv`: 17 linhas incl. cabeçalho | **Amostra pequena** — "10 posições representativas" (`README.md:74`); a TIPI oficial tem ~10.000 posições | Pagina, default 20 |
| CEST | `data/fiscal/cest.csv`: 11 linhas incl. cabeçalho | **Amostra** — "6 códigos representativos" (`:75`) | Pagina, default 20 |
| NCM↔CEST | `data/fiscal/ncm-cest.csv`: 13 linhas incl. cabeçalho | **Amostra** — "6 vínculos representativos" (`:76`) | Pagina, default 20 |
| Código de serviço (LC 116) | não medido nesta rodada (sem CSV correspondente em `data/fiscal/`) | não verificado | Pagina, default 20 |
| Modelos de documento fiscal | 4 (`20260807140503_...:122-125`: NF-e 55, CT-e 57, MDF-e 58, NFC-e 65) | Completo para o que o sistema hoje pretende emitir (D12: "semear não é compromisso de emitir") | Pagina, default 20 (irrelevante — sempre cabe numa página) |
| Séries fiscais | 0 — nenhuma seed; nasce só por `POST /api/fiscal/series` | n/a (dado operacional, não tabela oficial) | Pagina, default 20, filtro por empresa/filial/modelo/ativas |
| Naturezas de operação | 0 — nenhuma seed | n/a | Pagina, default 20, 5 filtros combináveis |

**Risco de volume não medido, mas identificado por leitura de código:** `GET /series/{id}/buracos`
(`ConsultarBuracosSerieFiscalUseCase.cs:39-54`) monta `Enumerable.Range(NumeroInicial,
UltimoNumeroAlocado - NumeroInicial + 1)` **em memória, sem paginação**, a cada chamada. Para uma
série com `NumeroFinal` alto e uso de vários anos, essa faixa pode crescer para dezenas de milhares
de números antes de qualquer inutilização formal reduzir o intervalo — não medido em produção
(não há dado real), mas o desenho do endpoint não tem teto.

**A conclusão que muda o desenho de F3.4:** três das tabelas mais visíveis para o usuário final —
**NCM, município e CFOP** — estão hoje com **amostra**, não com o cadastro oficial completo. Uma
tela de combo/busca construída e testada contra os 17/32/80 registros de hoje vai se comportar
diferente contra o volume real de produção (~10 mil NCM, ~5.570 municípios, centenas de CFOP) assim
que alguém rodar `POST /importar/{tabela}` com o arquivo oficial completo. Isto é fato read from
code, não é escopo desta rodada decidir se a paginação/filtro atual (`termo`, `codigo`, paginação
"pagina/tamanhoPagina") é suficiente para esse volume — fica registrado para os arquitetos.

---

## 7. Conta de campos por endpoint

Fecha por área. "Sem tela" é o destino de tudo que não tem consumidor hoje — não é dedução, é
consequência direta de `grep -rn` sem ocorrência nos três diretórios de frontend listados no topo.

```text
SeriesFiscais
  campos de response  = 11 (SerieFiscalResponse) + 5 (BuracosSerieFiscalResponse) = 16
  exibido              = 0
  enviado               = 0
  derivado               = 0
  sem tela (sem consumidor) = 16
  16 = 0 + 0 + 0 + 16  ✓ fecha

NaturezasOperacao
  campos de response  = 15 (NaturezaOperacaoResponse, incl. 4 por item de Cfops) + 8 (CfopResolvidoResponse) = 23
  sem tela             = 23
  23 = 23  ✓ fecha

CadastrosFiscais (16 endpoints)
  campos de response somados  = 6+5+7+5+5+6+7+6+5+12+9+5+6+6+9+7 = 106
  exibido (via resumo NCM/CFOP)  = 4 (NcmResumoResponse) + 5 (CfopResumoResponse) = 9
  sem tela                        = 106 − 9 = 97
  9 + 97 = 106  ✓ fecha
  (a conta do endpoint de importação — 7 campos de ResumoImportacaoTabelaOficial — está incluída
   nos 106; nenhuma tela lê nenhum dos 7)

ModelosDocumentoFiscal
  campos de response = 5
  sem tela = 5
  5 = 5  ✓ fecha

Pessoas — bloco fiscal + pré-requisito (15 endpoints faltantes)
  campos de request  (soma dos 15) = 8+1+2 (fiscais) + 1+0+9+9+0+0+0+4+4+0+0 (pré-requisito) = 38
  campos de response (soma dos 15, sem repetir PessoaResponse) =
     22 (dados-fiscais reaproveita PessoaResponse) + 13 (endereco/municipio) + 3 (backfill)
     + 22 (bloquear) + 22 (desbloquear) + 13×4 (GET/POST/PUT/principal endereco) + 7×4 (contatos)
     = medição não fechada nesta rodada — ver bloco de pendência abaixo
  PessoaResponse (já consumida, 4 endpoints existentes)
     22 campos backend = 11 exibido + 1 sem par (createdAt, divergência) + 11 sem tela
     11 + 11 = 22 (mais 1 divergente) ✓ fecha — ver §1.4.3

ClassificacoesPessoa (vizinhança, não numerada em F3)
  campos de response = 6 (Listar/Criar/Atualizar reaproveitam o mesmo tipo)
  sem tela = 6
  6 = 6  ✓ fecha
```

**Pendência declarada, não suposição:** a soma agregada de "campos de response" dos 15 endpoints de
Pessoas (linha final do bloco acima) soma tipos de resposta distintos
(`EnderecoPessoaResponse`×4 rotas, `ContatoPessoaResponse`×4 rotas, `PessoaResponse`×3 rotas,
`BackfillMunicipiosEnderecosPessoaResponse`×1) que **não são o mesmo universo de campos** — somá-los
sem separar por tipo produziria uma conta sem significado (contaria `Id`/`PessoaId` onze vezes como
se fossem onze campos diferentes). Cada tipo individual **está fechado** nas tabelas da §1.4; o que
não fecha é uma soma única "campos de Pessoas" cruzando tipos heterogêneos — e essa soma não foi
pedida por nenhum endpoint isolado, só apareceria arbitrariamente ao somar a seção toda. Registro
como não fechada em vez de inventar um número.

---

## Divergências

### DIV-1 — "422 incondicional" no comentário do backend, 400 na prática

`AdicionarItemNotaFiscalUseCase.cs:121,130,135` documenta a derivação de CFOP como "sempre 422"/"422 incondicional"
quando há natureza vinculada e a derivação falha. O controller que expõe essa operação
(`NotasFiscaisController.AdicionarItem`, `:86-93`) devolve **sempre** `BadRequest` (400), e
`ApiErrorResponseFilter` não remapeia `ErrorKind.Validation` para 422 — só
`TributacaoSimulacaoController` usa `UnprocessableEntity` explicitamente, e só para exceção de
cálculo do motor, não para erro de cadastro. Qualquer tela que trate esta família de erro esperando
422 (por ter lido o comentário do backend) vai receber 400 na integração real. Detalhado em §2.

### DIV-2 — o frontend afirma "sem endpoint operacional" para uma rota que existe e funciona

`features/fiscal/components/FiscalActionDialogs.tsx:136,187`: campo "Natureza de operação"
desabilitado com o texto "Ainda sem endpoint operacional no backend; deixe vazio até parametrização
fiscal oficial." `POST /api/fiscal/naturezas-operacao` e `PUT /api/fiscal/naturezas-operacao/{id}`
existem, estão implementados e têm teste de contrato (`NaturezasOperacaoEndpointContractTests.cs`).
Mesma classe do defeito P5 já registrado em `PLANO-FRONTEND-v1.23.md` §2 para a aba de Impostos
("legenda falsa" — o texto mente sobre a capacidade real do backend).

### DIV-3 — natureza de operação inativa continua sendo aceita para derivar CFOP de item novo

`CfopDoItemResolver.ResolverNaturezaAsync` (`CfopDoItemResolver.cs:112-124`) confere só
`natureza is null || natureza.EmpresaId != empresaId`; **não confere `IsActive`**. Diferente de
`AtualizarCabecalho`/`MapearCfop`, que recusam natureza inativa via `GarantirAtiva`
(`NaturezaOperacao.cs:188-194`). Não decido se é lacuna proposital (permitir emitir com natureza já
descontinuada, mas não editá-la) ou esquecimento — registro para a rodada decidir.

### DIV-4 — `Error.Conflict` não vira 409 em nenhuma das quatro áreas fiscais/pessoas desta rodada

`JaExisteSerieAtivaParaContexto` (Series), `NaturezaOperacaoCodigoDuplicado` (Naturezas),
`ConflitoConcorrenciaNaAlocacao`/`ConflitoConcorrenciaAoNumerarDocumento` (Series) são
`Error.Conflict` na fábrica mas saem como 400 porque o controller chama `BadRequest` sempre e o
filtro global não remapeia `Conflict`. Se a UI decidir tratar 409 como "recarregue e confirme"
(padrão já descrito em `FLUXOS-E-REGRAS-PARA-A-UI.md` §4.3 para `NotaFiscal`/`PedidoVenda`), **essa
UI nunca vai disparar** para estes quatro erros — eles chegam como 400 comum. Detalhado em §2.

### DIV-5 — três telas fiscais/pessoais inexistentes produzem mensagem de erro que aponta para elas

`Fiscal.SerieFiscalNaoCadastradaParaContexto`, `Fiscal.CfopSemMapeamentoParaAmbito`,
`Fiscal.DestinatarioSemEnderecoFiscal`/`DestinatarioSemEnderecoPrincipal`/
`DestinatarioSemMunicipioIbge`/`DestinatarioSemIndicadorContribuinteIcms` — seis mensagens de erro
do backend, todas com o texto "cadastre X antes de..." apontando para uma tela
(Séries/Naturezas/Pessoas-bloco-fiscal-ou-endereço) que **não existe hoje** em nenhum lugar do
frontend. Detalhado com citação exata em §2 e §5. É o achado central desta rodada, o mesmo padrão
"peça correta, desligada" do resumo do plano (`PLANO-FRONTEND-v1.23.md` linha 39).

### DIV-6 — `PessoaResponse.createdAt` no frontend sem par no backend

`features/pessoas/types/pessoas.types.ts:21` declara `createdAt?: IsoDateTime`;
`PessoaResponse.cs:7-29` (backend) não tem nenhum campo `CreatedAt`/`CriadoEm`. `grep -rn
"createdAt" features/pessoas/` só acha a declaração do tipo — nenhum componente lê o campo. Campo
morto dos dois lados: nem o backend entrega, nem a UI consome.

### DIV-7 — `PessoaResponse` tem 11 campos entregues e nunca lidos, sem nenhuma tela que os destine

`IndicadorContribuinteIcms`, `IndicadorIeDestinatario`, `InscricaoEstadualSt`, `Suframa`,
`RegimeTributarioParceiro`, `MunicipioIbgeId`, `PaisId`, `Bloqueada`, `MotivoBloqueio`,
`ContribuinteIpi`, `TomadorOrgaoPublico` — todos já vêm em toda resposta de `GET/POST/PUT /api/
pessoas` hoje (o backend não esconde nada), e nenhum tem linha no tipo TS nem consumidor. Diferente
do padrão "campo aditivo futuro" (que ainda não existe no backend): aqui o campo **já está sendo
transmitido** pela rede a cada chamada e simplesmente descartado pelo cliente Axios/Zod-less. É o
que sustenta a contagem "4/19 → +8" do plano, mas o "+8" cobre só o request de
`PATCH /dados-fiscais`; a exibição de `Bloqueada`/`MotivoBloqueio` na listagem e no formulário fica
fora dessa conta de 8 — mais um achado para a rodada decidir se entra no mesmo recorte.

### DIV-8 — endpoint de `NCM`/`CFOP` consumido parcialmente sem `.strict()`/Zod na resposta

`NcmResumoResponse`/`CfopResumoResponse` (`features/tributacao/types/tributacao.types.ts:652-665`)
são `type` TS puro; nenhum schema Zod valida a resposta de `listarNcm`/`listarCfop`
(`tributacaoApi.ts:232-243`). Um campo removido ou renomeado no backend (`Codigo`→`codigoOficial`,
por exemplo) não quebraria o build nem o teste — apareceria como `undefined` em produção, mesma
classe de risco já registrada em `FLUXOS-E-REGRAS-PARA-A-UI.md` §7.

### DIV-9 — nenhum endpoint de F3 está na allowlist de contrato, porque nenhum é consumido

`grep` em `scripts/backend-contract-map.allowlist.json` para `fiscal/series`, `naturezas-operacao`,
`fiscal/cadastros`, `modelos-documento`, `pessoas/classificacoes`, endereços/contatos/dados-fiscais
de pessoa devolve zero ocorrências — consistente com "endpoint fora do allowlist é divergência de
contrato" só quando **consumido** sem estar cadastrado; aqui não há consumo, então não há
divergência de contrato hoje. Registro como confirmação, não como achado.

---

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "cadastros-fiscais",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/04-inventario-cadastros-fiscais.md",
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    { "tipo": "backend", "pergunta": "CfopDoItemResolver.ResolverNaturezaAsync (CfopDoItemResolver.cs:112-124) deveria recusar natureza inativa, como AtualizarCabecalho/MapearCfop já fazem via GarantirAtiva? Hoje um item novo deriva CFOP a partir de natureza inativa sem erro (DIV-3).", "decide": "se a UI precisa alertar/bloquear ao ver natureza inativa selecionada, ou se isso é intencional (emitir com natureza descontinuada é permitido, só não editá-la)" },
    { "tipo": "backend", "pergunta": "Os erros Error.Conflict de SeriesFiscais/NaturezasOperacao (JaExisteSerieAtivaParaContexto, NaturezaOperacaoCodigoDuplicado, ConflitoConcorrenciaNaAlocacao/AoNumerarDocumento) deveriam sair como 409 (como NotaFiscal/PedidoVenda já fazem) em vez de 400 (DIV-4)? Hoje o controller força BadRequest e o filtro global não remapeia Conflict.", "decide": "se a UI trata estes quatro erros com o fluxo de 409 (reler + confirmar) ou com o fluxo padrão de 400 (mensagem + permanecer no formulário)" },
    { "tipo": "cliente", "pergunta": "A exibição de Bloqueada/MotivoBloqueio na tela de Pessoas entra no mesmo recorte de F3.3, ou fica fora (é bloqueio operacional, não fiscal)?", "decide": "se DIV-7 (11 campos sem tela) se resolve inteiro nesta fatia ou só a parte fiscal (9 campos)" }
  ],
  "riscos": [
    "DIV-1: comentário do backend (AdicionarItemNotaFiscalUseCase.cs:121,130,135) afirma '422 incondicional' para falha de derivação de CFOP; o controller devolve 400 de fato. Uma UI escrita a partir do comentário trataria o código de status errado.",
    "DIV-2: FiscalActionDialogs.tsx:136,187 afirma que naturezas de operação 'ainda não têm endpoint operacional no backend' -- falso, o CRUD existe e está testado no backend.",
    "DIV-3: natureza de operação inativa não é barrada ao derivar CFOP de item novo (só é barrada para editar a própria natureza) -- comportamento não decidido.",
    "DIV-4: quatro erros Error.Conflict (2 de SeriesFiscais, 1 de NaturezasOperacao, mais o de concorrência na numeração) saem como HTTP 400 em vez de 409, porque os controllers sempre chamam BadRequest e o filtro global só remapeia NotFound/Forbidden/Unauthorized.",
    "DIV-5: seis mensagens de erro do backend (série não cadastrada, CFOP sem mapeamento, pessoa sem endereço/município/indicador de contribuinte) mandam o operador para telas que não existem em nenhum lugar do frontend hoje -- é o achado central da rodada.",
    "DIV-7: 11 dos 22 campos de PessoaResponse (9 fiscais + Bloqueada + MotivoBloqueio) já chegam em toda resposta HTTP e nenhum tem consumidor; a conta '+8' do plano cobre só o request de escrita, não a exibição.",
    "Volume (secao 6): NCM, municipio IBGE e CFOP estao hoje com dado AMOSTRA (17/32/80 linhas), nao o cadastro oficial completo (~10 mil/~5.570/centenas); GET /series/{id}/buracos nao pagina e varre o intervalo inteiro alocado a cada chamada.",
    "Conta de campos de Pessoas (secao 7) nao fecha num numero unico agregado -- os 15 endpoints faltantes usam 4 tipos de resposta heterogeneos; cada tipo fecha isoladamente, a soma cruzada nao foi calculada de proposito (ver nota na propria secao)."
  ]
}
```
