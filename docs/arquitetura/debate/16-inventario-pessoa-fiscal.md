# Inventário: Pessoa fiscal (rodada de arquitetura 16, recorte `b75`)

Agente: `inventariante-contrato-tela`. Branch `codex/v1.11.0a8b75-pessoa-fiscal`, criada sobre a `b74` (HEAD `da74da2`).
Recorte: o bloco fiscal da Pessoa (`PATCH /api/pessoas/{id}/dados-fiscais`), o vínculo de município no endereço da Pessoa
(`PATCH …/enderecos/{enderecoId}/municipio` e `POST /api/pessoas/enderecos/backfill-municipios`) e os links de correção dos erros
`Fiscal.Destinatario*` / `Fiscal.Contexto*Destinatario*`. É o conteúdo da `b61` da D53, renumerado pela D97 (`b74`) e de novo pela D103 (`b75`).
Profundidade: o que o recorte aciona (os dois resolvers fiscais, a busca de município, o Confirmar Faturamento), só para responder às duas
perguntas do briefing. Não debate desenho nem propõe solução. **Identificadores deste arquivo:** divergências são `PF-n`; perguntas ao backend
são `PQ-B-n`; perguntas ao produto e à rodada são `PQ-P-n`. Não confundir com os `PF-1..PF-6` (pendências funcionais) do `15`, com os
`EP-n` do `15` nem com os `B-n` do `DECISOES.md`.

**Árvore medida:**

- **Frontend:** HEAD `da74da2` (`feat(release): v1.11.0a8b74`), branch `codex/v1.11.0a8b75-pessoa-fiscal`. `git status --short` fora de
  `.codex/`, `.agents/` e `.claude/settings.local.json` mostra **0 linhas**, no início e no fim da sessão. `package.json` diz `1.11.0-a.8.b74`,
  `logosoftVersion` `1.11.0a8b74`. Todas as citações `arquivo:linha` do frontend valem para esse commit.
- **Backend** (`../New project 3/src`, só leitura): branch `fix/v1.23.4-g3-st-e-difal-no-mesmo-item`, HEAD `6bb6fc4`
  (`docs(v1.23.4-g3): o plano do frontend para o codigo novo`), `git status --short | wc -l` = **0** (árvore limpa). O backend andou **14 commits**
  desde o `0387e44` usado no `15` (`git log --oneline 0387e44..6bb6fc4 | wc -l`). `git diff --stat 0387e44..6bb6fc4 -- src` mostra **6 arquivos, todos em
  `Fiscal/Tributacao` (Motor, `TributacaoErrors`, `CalculadoraIcmsSt`, `CoerenciaStDifal`, `ContextoTributavel`, `MotorTributarioExceptions`)**. O mesmo
  comando restrito a `Erp.Application/Pessoas`, `Erp.Domain/Pessoas`, `Erp.Api/Controllers/Pessoas`, `Erp.Application/Fiscal/Documentos`,
  `Erp.Application/Fiscal/FiscalErrors.cs`, `Erp.Application/Fiscal/Cadastros`, `Erp.Application/Faturamento`, `Erp.Infrastructure/Fiscal` e
  `Erp.Infrastructure/Pessoas` devolve **0 linhas**: o recorte de Pessoa e dos resolvers **não mudou** desde o `15`.

**Fontes vivas:**

- **Código do backend:** lido (controller, requests, response, validadores, domínio, use cases, resolvers, repositórios, erros). "Confirmado no backend" quer
  dizer **lido no C#**, e não observado em execução. Não houve chamada HTTP (não há credencial). Onde só a resposta real responderia, a linha diz
  **não verificado**.
- **Banco dev: NÃO VERIFICADO.** `docker ps` devolveu `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ... O sistema não pode
  encontrar o arquivo especificado`: o daemon do Docker Desktop está parado. Não o iniciei (o `CLAUDE.md` manda Docker só sob pedido explícito). Pessoas,
  endereços, municípios e grupos que concedem `PESSOAS_DADOS_FISCAIS_GERENCIAR` **não foram medidos hoje** (§8).
- **Gates e testes:** nenhum executado. Tudo é leitura de código, contratos e documentos.

**Entrada que este inventário respeita, sem redecidir:** D47 item 2, D49 item 2, D50, D52, D53, D97, D98 a D103 (`DECISOES.md:1406-1490,2466-2654`), em
especial a D102 e a emenda dela.

---

## 0. As duas perguntas do briefing

### 0.1 O que ainda impede um faturamento de concluir depois desta fatia (medido no C#)

O Confirmar Faturamento chama, em ordem: leg 1 `GerarNotaFiscalPedidoVenda` (`ConfirmarFaturamentoUseCase.cs:119-153`), legs 2 e 3 `GerarXmlEnvio` +
`AssinarXml` (`:161-180`), leg 4 `TransmitirAutorizarSefaz` (`:188-241`) e, depois, os legs 5 e 6 (estoque, conta a receber; **fora do pedido, não lidos**).
Cada barreira abaixo é leitura de código; **nenhuma foi observada em execução**.

| # | Leg | Barreira (código ou mensagem) | Onde, no C# | Fecha com a `b75`? | Estado no dev |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | Pedido inexistente, cliente de outra empresa ou inativo (`ClienteDestinatarioNaoEncontrado`, `ClienteDestinatarioInativo`); série/número duplicados; nota já existe para o pedido | `GerarNotaFiscalPedidoVendaUseCase.cs:57-100` | n/a | não medido |
| 2 | 1 | **Natureza de operação** informada e existente na empresa (`CfopNaturezaOperacaoNaoEncontrada`, 404 genérico) | `CfopDoItemResolver.cs` `ResolverNaturezaAsync`; `GerarNotaFiscalPedidoVendaUseCase.cs:141-147` | n/a (a tela é da `b72`) | **0 naturezas** na medição de 2026-09-30 (`CHANGELOG.md:135`); não refeita |
| 3 | 1 | **Emitente** resolvido **antes** do destinatário: empresa/filial ativas; CNPJ numérico (CPF e CNPJ alfanumérico falham); endereço fiscal completo; município vinculado, existente, da mesma UF (`EmitenteSemEnderecoFiscal`, `…EnderecoFiscalIncompleto`, `…SemMunicipioIbge`, `…MunicipioUfDivergente` e outros) | `EmitenteFiscalResolver.cs:95-206` (empresa inativa `:114`, endereço ausente `:158`, incompleto `:164`, sem município `:169`, UF divergente `:185`); chamado por `CfopDoItemResolver.ResolverUfsAsync` (`:86-103`) | n/a (tela de endereço fiscal da empresa é da `b64`) | **não medido** (2 empresas, estado do endereço desconhecido) |
| 4 | 1 | **Destinatário**: pessoa na empresa; ao menos 1 endereço **ativo**; 1 deles **principal**; `Uf` com 2 caracteres; **`MunicipioIbgeId` do endereço**; município existente; UF do município = UF do endereço | `DestinatarioFiscalResolver.cs:143-202` | **`SemMunicipioIbge`: sim, é o que a `b75` entrega** (PATCH do município). Os de endereço fecharam na `b73` | endereços: **0** na medição de 2026-09-30; não refeita |
| 5 | 1 | **CFOP mapeado** na natureza para o âmbito (par de UFs) e o tipo de item (`CfopSemMapeamentoParaAmbito`), por item do pedido; produto com venda permitida | `GerarNotaFiscalPedidoVendaUseCase.cs:155-232` | n/a | depende da natureza (linha 2) |
| 6 | 1 | Com `ValidarDadosFiscaisProduto` marcado: dados fiscais mínimos do produto (`FiscalProdutoValidator.ValidarDadosFiscaisMinimos`, **não lido por mim**) | `GerarNotaFiscalPedidoVendaUseCase.cs:183-190` | n/a | não medido |
| 7 | 2 | **Configuração fiscal da empresa** existente e ativa; da filial, se não herda; documento habilitado (`EmitirNFe`/`EmitirNFCe`); **todo item ativo com NCM e CFOP** | `FiscalConfiguracaoEmissaoResolver.cs:23-74` (chamado em `NotaFiscalXmlPipelineUseCases.cs:53`) | n/a | **não medido** |
| 8 | 2 | `NotaFiscalXmlBuilder` só gera XML com `Fiscal:Sefaz:UseMock = true`; senão lança "A emissão em ambiente SEFAZ está bloqueada" (vira `FalhaXmlFiscal`) | `NotaFiscalXmlBuilder.cs:47-52`; `appsettings.json:44` e `appsettings.Development.json:24` = `true`; `appsettings.Production.json:30` = `false` | n/a | `true` em dev (arquivo, não ambiente em execução) |
| 9 | 2 | **Validação de schema XSD** com `ValidarSchema=true` **fixo no Confirmar** (`new GerarXmlEnvioNotaFiscalRequest(true, true, null)`, `ConfirmarFaturamentoUseCase.cs:163`): exige o diretório `Fiscal:Schemas:NFe-4.00:Directory` (`./schemas/nfe/4.00`) com `*.xsd`, senão `FalhaSchema` | `FiscalSchemaValidator.cs:19-35`; `appsettings.json:100-103` | n/a | **`find . -name "*.xsd"` no repositório do backend → 0 arquivos; `src/Erp.Api/schemas` não existe**. Se os XSD são provisionados fora do repositório, **não verifiquei** |
| 10 | 3 | **Certificado**: o Confirmar passa `request.CertificateThumbprint`; a UI do Faturamento **não envia** (D97). Vazio, o provedor usa `CertificateThumbprint`/`CertificatePfxPath` da configuração; ambos `""` em `appsettings.Development.json:28-29`; sem nenhum → "Thumbprint do certificado SEFAZ não configurado" (`FalhaAssinatura`) | `ConfirmarFaturamentoUseCase.cs:172`; `SefazCertificateProvider.cs:17-49`; `XmlFiscalSigner.cs:25-27` | n/a | **não medido** (variável de ambiente e store do servidor desconhecidos) |
| 11 | 4 | `ValidarPrerequisitosEmissaoSefaz` de novo; `UfAutorizadora`; `correlationId`; resolução do pedido de venda para faturar | `FiscalSefazUseCases.cs:51-120` | n/a | não medido |
| 12 | 4 | **Com `UseMock=true`, o `SefazMockClient` devolve `ChaveAcesso = "MOCK<yyyyMMddHHmmssfff>"` (21 caracteres)** (`SefazMockClient.cs:24`, devolvida na resposta de autorização `cStat 100`) e `NotaFiscal.Autorizar` chama `ChaveAcessoNfe.Parse`, que exige **44 dígitos numéricos com DV** (`NotaFiscal.cs:436`; `ChaveAcessoNfe.cs:134-154`). O use case usa `resposta.ChaveAcesso ?? nota.ChaveAcesso` (`FiscalSefazUseCases.cs:213-229`). **Pela leitura, a autorização mockada falha com `DomainException` → `Result.Failure`** ("Falha na transmissão para autorização SEFAZ: Chave de acesso deve ter exatamente 44 dígitos numéricos") | `SefazMockClient.cs`; `NotaFiscal.cs:436`; `FiscalSefazUseCases.cs:206-247` | n/a | **leitura, não executado**; **não achei teste** que prove o contrário (`grep SefazMockClient tests` só devolve binários). Ver PF-18 e PQ-B-5 |

**O que NÃO está no caminho do Confirmar (medido):** `Fiscal.DestinatarioSemIndicadorContribuinteIcms`, `…ContextoDestinatarioContribuinteIpiNaoInformado` e
`…ContextoNaturezaTomadorServicoNaoInformada` só saem de `ContextoTributarioDocumentoResolver.cs:100-104,187-219`. Esse resolver só é chamado por
`CalculoTributarioNotaFiscalService.cs:59`, e este só por `ValidarNotaFiscalUseCase.cs:163` e `CalcularTributosNotaFiscalUseCase.cs:58`
(`grep "_calculo.CalcularAsync"`). `GerarNotaFiscalPedidoVendaUseCase` não referencia `Calculo` nem `Contexto` tributário (só `FiscalContextoOperacional`), e os legs 2 e 3
passam pelo `FiscalConfiguracaoEmissaoResolver` e pelo `INotaFiscalXmlBuilder`; o `NotaFiscalXmlBuilder.cs` em uso tem **0** referências a `Pessoa`, `Destinat`,
`Endere` ou `Municipio` fora de um comentário de CT-e (`grep -n -i "Pessoa\|Destinat\|Endere\|Municipio"` → 1 linha, `:222`). O `15 §0.1` registrou **0** para esse arquivo; não sei qual padrão ele usou, e a conclusão dele não muda.
**Quem exige o indicador é o Validar e o Calcular tributos**, e o frontend **não consome** `calcular-tributos` (`grep -rn "calcular-tributos" features lib app` → 0).
`NfeXmlOficialBuilder.cs` (que lê o endereço do destinatário para o `enderDest`) tem **0** referências fora do próprio arquivo (`grep -rn NfeXmlOficialBuilder --include=*.cs`):
**não está ligado** ao pipeline.

**Resposta curta (fato, não decisão):** depois da `b75`, o leg 1 deixa de falhar por `DestinatarioSemMunicipioIbge`. Na ordem do código, o que ainda pode barrar
o Confirmar é, **não medido no dev**: a natureza (linha 2), o emitente (3), o CFOP por item (5), a configuração fiscal (7), o diretório de XSD (9), o certificado (10)
e, **pela leitura**, a chave do mock (12). Nenhuma delas é do recorte.

### 0.2 O menor recorte que faz o destinatário passar no `DestinatarioFiscalResolver`

Medido em `DestinatarioFiscalResolver.cs:143-224`. Para a pessoa **`P`** da nota, o resolver exige, nesta ordem, e **só isto**:

1. `P` existe e é da mesma empresa da nota (senão `DestinatarioPessoaNaoEncontrada`, 404 genérico);
2. ao menos **1 endereço ativo** (`DestinatarioSemEnderecoFiscal`);
3. 1 deles **`Principal`**, de qualquer `Tipo` (`DestinatarioSemEnderecoPrincipal`; o resolver **não lê `Tipo`**);
4. `Uf` do principal com **2 caracteres** (`DestinatarioEnderecoFiscalIncompleto`);
5. **`MunicipioIbgeId` do endereço principal não nulo** (`DestinatarioSemMunicipioIbge`);
6. esse município **existe** na tabela (`DestinatarioMunicipioIbgeNaoEncontrado`);
7. `municipio.UfSigla == endereco.Uf` (`DestinatarioMunicipioUfDivergente`).

O resolver **não lê** nenhum campo do bloco fiscal da Pessoa para decidir: ele só **propaga** `IndicadorContribuinteIcms`, `TipoPessoa`, `ContribuinteIpi` e
`TomadorOrgaoPublico`, **nulos incluídos** (`:214-224`; comentário de `:206-213`). Também **não confere** `Pessoa.Bloqueada` nem `Pessoa.IsActive`.

**Portanto o menor conjunto que o C# exige é uma única escrita sobre um endereço que já exista (passos 2 a 4 são da `b73`): o vínculo de município do endereço principal.**
Os caminhos de escrita são exatamente dois, ambos com `PESSOAS_DADOS_FISCAIS_GERENCIAR` (`PessoasController.cs:179-180,196-197`):

| Caminho | O que o servidor faz | O que precisa existir fora da Pessoa |
| --- | --- | --- |
| `PATCH …/enderecos/{enderecoId}/municipio` com `municipioIbgeCodigo` (7 dígitos) | resolve o município por **código**, exige **ativo**, confere a UF com a do endereço, grava só o vínculo | o código chega por busca em `GET /api/fiscal/cadastros/municipios` (`FISCAL_CADASTROS_CONSULTAR`) ou digitado; o município tem de estar **carregado** na tabela |
| `POST /api/pessoas/enderecos/backfill-municipios` com `empresaId` (e `filialId?`) | casa **`Cidade` + `Uf`** (texto, sem acento, ambiguidade recusada) de **todos** os endereços ativos sem vínculo da empresa; devolve contagem e divergências | o município tem de estar **carregado**; sem busca, sem escolha manual |

O bloco fiscal (`PATCH /dados-fiscais`) **não é necessário** para o resolver nem para o Confirmar. Ele passa a ser necessário só para o **Validar** e o **Calcular tributos**
da nota: `IndicadorContribuinteIcms` sempre; `ContribuinteIpi` **só quando a empresa emitente tem `ContribuinteIpi = true`**
(`ContextoTributarioDocumentoResolver.cs:185-194`); `TomadorOrgaoPublico` **só quando a pessoa é jurídica e a nota tem item de serviço** (`:204-223`).

---

## 1. Telas e rotas

| Rota / superfície | Arquivo de página | Componente da feature | Permissão exigida | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/pessoas` (lista que abre o diálogo de edição) | `app/(main)/pessoas/page.tsx` (5 linhas) | `PessoasPage` (`features/pessoas/components/PessoasPage.tsx`, 127 linhas) | Regra de rota: `PESSOAS_CONSULTAR` **ou** `PESSOAS_GERENCIAR` (`routePermissions.ts:15`). A **página** nega sem `PESSOAS_CONSULTAR` (`PessoasPage.tsx:53-55`, `UnauthorizedState`): quem só tem `GERENCIAR` entra na rota e vê "sem autorização" | union `types/erp.ts:255-258`; catálogo FE `permissoesCatalogo.ts:46-49`; snapshot `backend-permissions.snapshot.json:153-156`; backend `SystemPermissions.cs:46-49`; catálogo estruturado `PermissoesCatalogoDefinition.cs:37-44` (recurso `/pessoas`); menu `AppMenu.tsx:75` (pai `:73`) |
| `PessoaFormDialog` (hospedeiro das abas) | — | `PessoaFormDialog.tsx` (148 linhas): `TabView` com **4 abas** — "Dados gerais" (`:90`), "Documentos e observações" (`:120`), **"Endereços"** (`:139`, `PESSOA_ENDERECOS_ABA.titulo`, entregue pela `b73`), "LGPD e auditoria visual" (`:142`) | o diálogo só abre pelas ações "Editar" e "Nova pessoa", ambas `PESSOAS_GERENCIAR` (`PessoasPage.tsx:101-103,119`); a aba recebe `hasPermission('PESSOAS_CONSULTAR')` e `…('PESSOAS_GERENCIAR')` (`PessoaFormDialog.tsx:140`) | — |
| **Aba do bloco fiscal da Pessoa** (D49 item 2) | — | **inexistente**. Precedente no código: aba "Dados fiscais" do Produto (`ProdutoFormDialog.tsx:290`, com `PermissionGuard permission="PRODUTOS_DADOS_FISCAIS_GERENCIAR"` e `fallback` com `Message`, `:291`) | `PESSOAS_DADOS_FISCAIS_GERENCIAR` (a rota `PATCH`) | só no union e no catálogo (§6) |
| **Vínculo de município no endereço** (D53) | — | **inexistente**. A aba "Endereços" mostra a coluna "Município fiscal" (`PessoaEnderecosTab.tsx:223-232`, `Tag` "vinculado"/"não vinculado" por `municipioIbgeId`) e o texto "O vínculo do município fiscal não é alterado por este cadastro" (`pessoaEnderecosLabels.ts:236`) | `PESSOAS_DADOS_FISCAIS_GERENCIAR` (rota `PATCH`/`backfill`) e `FISCAL_CADASTROS_CONSULTAR` (busca) | idem |
| Destino de link do erro `Fiscal.Destinatario*` (D50 item 3) | `/pessoas` **não lê** `searchParams` (`grep -rn "useSearchParams\|searchParams" features/pessoas "app/(main)/pessoas"` → 0); **não existe `GET /api/pessoas/{id}`** (o controller só tem `GET` da lista, `PessoasController.cs:22-28`); o diálogo parte do `record` da lista (`PessoasPage.tsx:119,123`) | — | — | o mapa `fiscalErrosCadastroMap` (`fiscalErrosCadastro.ts:29-44`) tem **2 entradas** (série e CFOP); nenhuma `Destinatario*` |
| `/pessoas/classificacoes` | `app/(main)/pessoas/classificacoes/page.tsx` | `ClassificacoesPessoaPage` | `PESSOAS_CONSULTAR` (`routePermissions.ts:14`) | vizinha; fora do recorte |
| `/fiscal/series`, `/fiscal/naturezas-operacao` (destinos dos 2 links já existentes) | `app/(main)/fiscal/...` | `SeriesFiscaisPage`, `NaturezasOperacaoPage` | `FISCAL_SERIES_*`, `FISCAL_CADASTROS_*` (`routePermissions.ts:57`) | vizinhas; citadas porque o mapa D50 aponta para elas |

- **Rota nova, item de menu novo, regra de rota nova:** o desenho da D49 item 2 (aba) **não exige nenhuma das três edições**: `/pessoas` já tem regra, o item de menu já existe e
  as permissões já estão no union. Fato, não decisão. **`PESSOAS_DADOS_FISCAIS_GERENCIAR` não está em `routePermissions.ts` nem no `anyPermissions` do pai
  (`AppMenu.tsx:73`) nem no do filho (`:75`)**, e a página exige `PESSOAS_CONSULTAR`: quem só tem `DADOS_FISCAIS` não chega à tela (PF-11).
- **Quem consome `usePessoas`:** **19 arquivos em 11 pastas de feature** (`grep -rln "usePessoas\b" features app components | awk -F/ '{print $1"/"$2}' | sort | uniq -c`:
  clientes 1, compras 3, faturamento 1, financeiro 2, financeiro-avancado 1, fiscal 2, fornecedores 1, pessoas 2, produtos 1, rh 1, vendas 4; o `15` contou 18). `PessoaResponse` é
  referenciado em **16** arquivos (`grep -rln "PessoaResponse\b" features app components lib types`). Nenhum lê campo fiscal.
- **Como a tela mostra o que já está gravado:** `GET /api/pessoas` devolve **os 22 campos** (`PessoaMapper.cs:11-33`, §3.1), inclusive os fiscais; o frontend **não os tipa**
  (`pessoas.types.ts:9-21`, 12 campos) e **não valida** a resposta (`pessoasApi.ts:44-47`, `httpClient.get<PessoaResponse[]>`, asserção de tipo). Os campos fiscais **chegam em tempo de
  execução** no objeto do `record`, sem tipo. `PATCH /dados-fiscais` devolve o `PessoaResponse` inteiro (22 campos). Não há `GET` por id. O `record` do diálogo é uma **foto**
  da linha da lista no momento do clique (`setSelected(row)`, `PessoasPage.tsx:119`), e o diálogo não relê `listQuery.data` enquanto está aberto (PF-4).

## 2. Endpoints consumidos e existentes

O `scripts/backend-contract-map.allowlist.json` está `audit-only-no-suppressions` (`version 1.11.0a8b74`, `suppressions: []`, `documentedDivergences: []`) e tem **0** ocorrências de
`pessoas` (`grep -c pessoas`). O gate compara a rota consumida com o catálogo de `docs/BACKEND-ESTADO-ATUAL-E-CONTRATO.md`; as rotas do recorte constam dele
(`:1740` dados-fiscais; `:1749-1750` município e backfill; `:1377` `GET /municipios`). Não rodei `npm run validate:backend-contract-map` nem
`validate:guard-permission-map`: **não verificado** por gate.

| Método + rota | Arquivo em `features/<mod>/api/` | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `PATCH /api/pessoas/{id}/dados-fiscais` | **nenhum** (`grep -rn "dados-fiscais" features app lib components` fora de `features/produtos` → 0) | nenhum | `CONTRATO-API-v1.23.md:12720-12775` (8 campos de request, 22 de response; "Frontend ❌ não consome"); `GAP-FRONTEND-BACKEND.md:146`; `BACKEND-ESTADO…:1740` (**request com 6 campos, response com 20: PF-6**) | sim, `PessoasController.cs:56-67`, `PESSOAS_DADOS_FISCAIS_GERENCIAR`. **200** com `PessoaResponse`; falha → **400** (`BadRequest(result.Error)`); `NotFound`/`Forbidden` do use case saem **404** `Recurso.NaoEncontrado` pelo filtro |
| `PATCH /api/pessoas/{id}/enderecos/{enderecoId}/municipio` | **nenhum** (`pessoaEnderecosApi.ts` tem as 5 rotas da `b73`) | nenhum | `CONTRATO-API-v1.23.md:12931-12963`; `GAP:154`; `BACKEND-ESTADO…:1749` | sim, `PessoasController.cs:179-190`, `PESSOAS_DADOS_FISCAIS_GERENCIAR`. **200** com `EnderecoPessoaResponse` (13 campos) |
| `POST /api/pessoas/enderecos/backfill-municipios` | **nenhum** | nenhum | `CONTRATO-API-v1.23.md:13010-13033`; `GAP:155`; `BACKEND-ESTADO…:1750` | sim, `PessoasController.cs:196-207`, `PESSOAS_DADOS_FISCAIS_GERENCIAR`. **200** com `BackfillMunicipiosEnderecosPessoaResponse` |
| `GET /api/fiscal/cadastros/municipios` (busca) | `features/administracao/api/administracaoApi.ts:254-261` (`listarMunicipiosFiscais`); **nenhum em `features/pessoas`** | nenhum (`httpClient.get<PagedResult<MunicipioCadastro>>`, asserção de tipo) | `BACKEND-ESTADO…:1377`; `CONTRATO-API-v1.23.md:1751` | sim, `CadastrosFiscaisController.cs:63-76`, `FISCAL_CADASTROS_CONSULTAR`. Query: `ufSigla`, `termo`, `codigoIbge`, `ativo`, `pagina=1`, `tamanhoPagina=20` (6 parâmetros; **sem filtro por Id**) |
| `GET /api/fiscal/cadastros/paises` | **nenhum** (`grep -rn "cadastros/paises" features lib app` → 0) | nenhum | `CadastrosFiscaisController.cs:49-61` | sim, `FISCAL_CADASTROS_CONSULTAR`; **é a busca que o campo `paisCodigoBacen` do bloco fiscal precisaria** (código BACEN de até 4 caracteres) |
| `GET /api/fiscal/cadastros/uf` | `administracaoApi.ts:248` | nenhum | `CadastrosFiscaisController.cs:38-47` | sim; **a D52/D102 manda UF estática (`lib/constants/ufs.ts`)**, então não entra |
| `GET/POST/PUT/DELETE /api/pessoas/{id}/enderecos…` (5 rotas da `b73`) | `features/pessoas/api/pessoaEnderecosApi.ts:62-96` | `enderecoPessoaResponseSchema`, `enderecosPessoaResponseSchema`, `criarEnderecoPessoaSchema`, `atualizarEnderecoPessoaSchema` (`pessoasSchemas.ts`) | `CONTRATO-API-v1.23.md:12808-12990` | sim (já inventariado no `15`); `status` e `pessoaId` da resposta são "sem uso" |

Contagem de rotas de Pessoa: o controller tem **19** (`grep -n "[Http" PessoasController.cs`; lista 1, `POST` criar, `PUT`, `PATCH dados-fiscais`, `bloquear`, `desbloquear` e `inativar` 6,
endereços 5, município 1, backfill 1, contatos 5 = **19**). O frontend consome **9** (4 de `pessoasApi.ts:43-72` + 5 de `pessoaEnderecosApi.ts`): **10 ausentes** — `dados-fiscais`, `bloquear`, `desbloquear`,
município, backfill e os 5 de contato. O `GAP-FRONTEND-BACKEND.md:144` ainda diz "faltam 15 de 19": está desatualizado em 5 (PF-7). Rotas do recorte da `b75`: **3 de Pessoa ausentes**
(`dados-fiscais`, município, backfill) **mais a busca de município, que só `features/administracao` consome**.

**Cliente HTTP de Pessoa (`features/pessoas/api/pessoasApi.ts:14-20`):** `runPessoaRequest` lança `new Error(apiError.message)` e **descarta `code`, `status`, `traceId` e `validationErrors`**. A `b73` criou
`PessoaEnderecosApiError` (`pessoaEnderecosApi.ts:15-24`), que os preserva, **só nas rotas de endereço**; o `PessoasPage` segue com o `Error` simples para a lista e o `PUT`.

## 3. Campos

**Como medi:** li os records C# e os tipos/schemas TypeScript lado a lado, nome a nome. **Fórmula:** declarados pelo frontend = entregues com destino + divergência (lido e não entregue) + sem uso.
Campo entregue pelo backend e não declarado fica à parte.

### 3.1 `PessoaResponse` (`PessoaResponse.cs:7-29`, **22 campos**) × `pessoas.types.ts:9-21` (**12 campos**)

Serve `GET /api/pessoas`, `POST`, `PUT`, `PATCH /dados-fiscais`, `bloquear` e `desbloquear`. Não existe schema Zod de resposta.

| Campo | Tipo no frontend | Origem (endpoint/campo) | O backend entrega? | Destino declarado |
| --- | --- | --- | --- | --- |
| `id` | `Guid` | `GET /api/pessoas` → `id` | sim (`PessoaMapper.cs:15`) | **enviado**: path de `PUT`, de `inativar` (`usePessoasResources.ts`) e `pessoaId` da aba de endereços (`PessoaFormDialog.tsx:140`) |
| `empresaId` | `Guid` | idem | sim | **sem uso** (nenhuma leitura de `record.empresaId`; `filterLocal` varre `Object.values(record)`, `PessoasPage.tsx:34`) |
| `filialId` | `Guid \| null` | idem | sim | **sem uso** (idem) |
| `tipoPessoa` | `TipoPessoa` | idem | sim | **exibido** (`Tag`, `PessoasPage.tsx:114`) |
| `nomeRazaoSocial` | `string` | idem | sim | **exibido** (`:115`; form `PessoaFormDialog.tsx:29`) |
| `nomeFantasia` | `string \| null` | idem | sim | **exibido** (`:116`) |
| `documento` | `string` | idem | sim | **exibido**, mascarado (`:117`) |
| `inscricaoEstadual` | `string \| null` | idem | sim | **exibido** (form, aba "Documentos") e **enviado** no `PUT` |
| `inscricaoMunicipal` | `string \| null` | idem | sim | **exibido** e **enviado** |
| `observacao` | `string \| null` | idem | sim | **exibido** e **enviado** |
| `status` | `EntityStatus` | idem | sim | **exibido** (`StatusTag`, `:118`); habilita Editar/Inativar (`isActive`, `:119`) e `pessoaAtiva` da aba de endereços (`PessoaFormDialog.tsx:140`) |
| `createdAt` | `IsoDateTime?` | — | **não** (não há `CreatedAt` no record) | **lido pela UI e não entregue** (`OperationalGovernancePanel.tsx:28` lê `asRecord(record).createdAt`); PF-3 |

**Entregues e não declarados (11):** `IndicadorContribuinteIcms`, `IndicadorIeDestinatario`, `InscricaoEstadualSt`, `Suframa`, `RegimeTributarioParceiro`, `MunicipioIbgeId`, `PaisId`, `Bloqueada`, `MotivoBloqueio`,
`ContribuinteIpi`, `TomadorOrgaoPublico`. Destes 11, **9 são o bloco fiscal** da `b75` (os 8 campos que o `PATCH` escreve, com `MunicipioIbgeId` e `PaisId` no lugar dos dois códigos, mais o derivado `IndicadorIeDestinatario`) e **2 são de bloqueio**
(`Bloqueada`, `MotivoBloqueio`), que ficam fora pela D53 ("nenhuma falha fiscal depende deles").
Conta do hospedeiro: **12 declarados = 9 com destino + 2 sem uso + 1 divergência**. Fecha. **22 entregues = 11 com par + 11 não declarados.** Fecha. `pessoas.types.ts` não mudou desde a `b67` e a `b73` não o tocou.

### 3.2 `AtualizarDadosFiscaisPessoaRequest` (`PessoaRequests.cs:37-45`, **8 campos**), validador (`PessoaValidators.cs:44-57`) e domínio (`DadosFiscaisPessoa.cs:100-143`, `Pessoa.cs:106-127`)

`PATCH /api/pessoas/{id}/dados-fiscais`. **Nenhum campo existe no frontend** (8 ausentes).

| Campo | Tipo C# (JSON) | Regra no validador | Regra no domínio / resolver | No frontend |
| --- | --- | --- | --- | --- |
| `IndicadorContribuinteIcms` | `IndicadorContribuinteIcms?` (número 1/2/3) | `IsInEnum` se informado | **obrigatório se qualquer outro campo vier preenchido** (`FISCAL_CADASTROS_INDICADOR_CONTRIBUINTE_ICMS_OBRIGATORIO`, `PessoaDadosFiscaisResolver.cs:36-41`); `Contribuinte` exige `Pessoa.InscricaoEstadual` não vazia (`Pessoa.cs:111-116`, 400 `PESSOAS_VALIDACAO`) | ausente (o enum existe em `features/tributacao/types/tributacao.types.ts:34-38`, com os mesmos valores) |
| `InscricaoEstadualSt` | `string?` | `MaximumLength(20)` | `Trim` + `ToUpperInvariant`, ≤ 20 (`DadosFiscaisPessoa.cs:118-135`) | ausente |
| `Suframa` | `string?` | `MaximumLength(9)` | **só dígitos**, ≥ 1 dígito, ≤ 9 (`:137-153`); texto sem dígito → `FISCAL_CADASTROS_VALIDACAO` | ausente |
| `RegimeTributarioParceiro` | `RegimeTributario?` (**0/1/2 implícitos**: `SimplesNacional`, `LucroPresumido`, `LucroReal`) | `IsInEnum` se informado | — | ausente (o enum existe **duplicado**: `administracao.types.ts:9`, `tributacao.types.ts:22`, valores 0/1/2 iguais ao C#) |
| `MunicipioIbgeCodigo` | `string?` | **só `MaximumLength(7)`** (sem `^[0-9]{7}$`) | `SomenteDigitos`; ≠ 7 dígitos → tratado como não encontrado; resolve o `Guid` por código **filtrando `Ativo`** (`CadastrosFiscaisRepository.cs:115-121`) → `FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO` também para **inativo** (PF-5) | ausente |
| `PaisCodigoBacen` | `string?` | `MaximumLength(4)` | dígitos, ≤ 4, `PadLeft(4,'0')`; resolve o `Guid` (`CadastroFiscalConsultaService.cs:568-572`) → `FISCAL_CADASTROS_PAIS_NAO_ENCONTRADO` | ausente (**0** consumidores de `/cadastros/paises`) |
| `ContribuinteIpi` | `bool?` | — | `null` = não informado (`Informado`); relevante só se a **empresa emitente** é contribuinte do IPI | ausente |
| `TomadorOrgaoPublico` | `bool?` | — | `null` = não informado; relevante só se PJ e item de serviço | ausente |

**Semântica (leitura, `PessoaDadosFiscaisResolver.cs:31-36,84-92`; `Pessoa.cs:118-126`):** o `PATCH` **substitui o bloco inteiro**. Os 8 campos em branco **limpam** os 9 campos fiscais da Pessoa (resposta de sucesso, auditoria
"Bloco fiscal da pessoa limpo."). Um corpo com só um campo apaga os outros sete e o `IndicadorIeDestinatario`. Campo omitido e `null` são o mesmo (PF-1).
**Ordem de validação no use case:** forma (400 `PESSOAS_VALIDACAO`, mensagens juntas por `" | "`) → pessoa existe (404) → guard organizacional (`Forbidden` → 404 `Recurso.NaoEncontrado`) → resolução de município/país (400) → domínio (`GarantirAtiva`:
**Pessoa inativa → 400**; IE ausente com `Contribuinte` → 400). **`Bloqueada` não é conferida.**

Conta: **8 campos no backend, 0 no frontend, 8 ausentes.**

### 3.3 Município no endereço: requests, resposta e backfill

`VincularMunicipioEnderecoPessoaRequest` (`EnderecoContatoRequests.cs:31`, **1 campo**): `MunicipioIbgeCodigo` (`string?`). Nulo/vazio **desvincula**; preenchido: `Length(7)` + `^[0-9]{7}$`
(`EnderecoContatoValidators.cs:35-46`). Existência e atividade vêm de `ObterMunicipioPorCodigoAsync` (`CadastroFiscalConsultaService.cs:90-104`): inexistente → `FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO`,
inativo → `FISCAL_CADASTROS_MUNICIPIO_INATIVO` (ambos `Error.Validation` → **400**). UF do município ≠ UF do endereço → `DomainException` → **400 `PESSOAS_VALIDACAO`**
(`EnderecoPessoa.cs:85-102`), **não** um código fiscal. Endereço inexistente ou inativo → `PessoaErrors.EnderecoNaoEncontrado` = `Error.NotFound("EnderecoPessoa", id)` → **404 `Recurso.NaoEncontrado`**.
Ordem: forma → pessoa (404) → guard (404) → endereço ativo (404) → município (400) → domínio (400). **Não confere `Pessoa.IsActive`** (só `endereco.IsActive`, `EnderecoPessoa.cs:87`; PF-12).
O texto `Cidade`/`Uf` do endereço **não é tocado**; só `MunicipioIbgeId` muda. Resposta: `EnderecoPessoaResponse`, **só o endereço tocado**.

`BackfillMunicipiosEnderecosPessoaRequest` (`:37`, **2 campos**): `EmpresaId` (`Guid`, `NotEmpty`), `FilialId` (`Guid?`). O guard confronta com o contexto do usuário
(`PessoaContextoOperacional.Validar` → `OrganizationalContextGuard.EnsureAllowed`, `:8-39`: `EmpresaId == Guid.Empty` no usuário é contexto global; empresa/filial divergentes → `Forbidden` → 404 genérico).
`ListarEnderecosSemMunicipioAsync` (`PessoasRepository.cs:52-65`): **todo endereço com `Status == Ativo` e `MunicipioIbgeId == null` da empresa** (com `filialId`, os da filial e os sem filial), **sem olhar se a Pessoa está ativa**,
ordenado por UF e cidade. Para cada um chama `ObterMunicipioPorNomeUfAsync(Cidade, Uf)` (`CadastroFiscalConsultaService.cs:107-142`: normaliza nome sem acento, só municípios **ativos** da UF, **ambiguidade recusada** com
`FISCAL_CADASTROS_MUNICIPIO_NOME_AMBIGUO`); casando, vincula. **Falha de um endereço não interrompe o lote**: vira divergência. **Sem dry-run**: grava ao final (`SaveChangesAsync` só se `vinculados > 0`). Idempotente (só olha sem vínculo).
Resposta: `BackfillMunicipiosEnderecosPessoaResponse(Analisados, Vinculados, Divergencias[])`; cada divergência, `DivergenciaMunicipioEnderecoResponse(EnderecoId, PessoaId, Cidade, Uf, Motivo)`. **`Motivo` é a mensagem em texto**
(`municipio.Error.Message` ou `ex.Message`), **não um código**.

Query de `GET /api/fiscal/cadastros/municipios` (`CadastrosFiscaisController.cs:63-76`, **6 parâmetros**): `ufSigla`, `termo`, `codigoIbge`, `ativo`, `pagina` (=1), `tamanhoPagina` (=20).
Filtro (`CadastrosFiscaisRepository.cs:73-100`): `Ativo` por igualdade; `UfSigla` por igualdade; **`CodigoIbge.StartsWith(codigoIbge)`** (prefixo, não igualdade); **`termo` = `Nome.ToUpper().Contains(termo.ToUpperInvariant())`**
(sem normalização de acento, ao contrário do backfill); ordena `UfSigla`, `Nome`. **Não há filtro por Id.** `tamanhoPagina ≤ 0` vira 20 e **o máximo é 200** (`CadastrosFiscaisFiltroFactory.cs:12-13,183-184`; PF-15).

#### Respostas desta seção × frontend

**`EnderecoPessoaResponse`** (13 campos; usada por criar/editar/principal/**município**): `pessoas/types/pessoaEnderecos.types.ts:17-32` declara os **13**. Destino: `id` **enviado** (path `enderecoId`;
`dataKey`); `tipo`, `logradouro`, `numero`, `complemento`, `bairro`, `cidade`, `uf`, `cep`, `principal` **exibidos** (`PessoaEnderecosTab.tsx:214-232`); `municipioIbgeId` **exibido** como "vinculado"/"não vinculado"
(`municipioFiscalLabel`, `:223-232`) e **derivado de** ele o aviso de vínculo do diálogo (`PessoaEnderecoDialog.tsx:92-95`); `pessoaId` e `status` **sem uso** (a lista só devolve ativos). **13 = 11 com destino + 2 sem uso.** Fecha. Zod de resposta
**não estrito** (`pessoasSchemas.ts:162-178`, `.object` sem `.strict()`), de acordo com o `CLAUDE.md`.

**`MunicipioIbgeResponse`** (`CadastrosFiscaisResponses.cs:23-31`, **8 campos**) × `MunicipioCadastro` (`administracao.types.ts:98-107`, **8 campos**, declarado no módulo vizinho; **não há tipo em `features/pessoas`**): `id` (comparado ao
`municipioIbgeId`, `useEnderecoFiscalCatalogos.ts` passos 1 e 2), `codigoIbge` (valor da opção), `nome` (rótulo, via `semSufixoUf`), `ufSigla` (idem) = **4 com destino**; `ufId`, `codigoSiafi`, `ativo`, `motivoInativacao` = **4 sem uso**
(`ativo` é só enviado como filtro, nunca lido; `grep` em `features/administracao`). Sem schema Zod.

**`PagedResult<MunicipioIbgeResponse>`** (envelope, `Erp.Shared/Kernel/PagedResult.cs:3-11`, **7 campos**: `Items`, `Page`, `PageSize`, `TotalItems`, `TotalPages`, `HasPreviousPage`, `HasNextPage`) × `PagedResult<T>`
(`types/erp.ts:403`, **5 campos**, sem `hasPreviousPage`/`hasNextPage`): `items` **exibido** (vira opções), `page`, `pageSize`, `totalItems`, `totalPages` **sem uso** na busca de município (o hook lê só `.items`:
`useEnderecoFiscalCatalogos.ts:62-65,100-109`), `hasPreviousPage`/`hasNextPage` **entregues e não declarados**. **7 = 5 declarados (1 + 4) + 2 não declarados.**

**`BackfillMunicipiosEnderecosPessoaResponse`** (3 campos) e **`DivergenciaMunicipioEnderecoResponse`** (5 campos): todos entregues, **nenhum declarado** (8 não declarados).

**Requests de endereço (já no frontend, citados porque o vínculo depende deles):** `Adicionar` e `Atualizar` (9 campos cada) são **enviados** pelos dois schemas `.strict()` (`pessoasSchemas.ts:130-160`); nenhum dos 9 é município.

### 3.4 Erros e códigos que a tela de município e de bloco fiscal receberiam (todos lidos no C#)

| Rota | HTTP | `Error.Code` | Origem |
| --- | --- | --- | --- |
| `dados-fiscais` / `município` / `backfill` | 400 | `PESSOAS_VALIDACAO` (forma, tamanho, domínio, pessoa inativa, IE ausente, UF divergente do município) | `PessoasValidation.cs:8-13`; `PessoaErrors.cs:22` |
| `dados-fiscais` | 400 | `FISCAL_CADASTROS_INDICADOR_CONTRIBUINTE_ICMS_OBRIGATORIO` | `CadastrosFiscaisErrors.cs:191-194` |
| `dados-fiscais` | 400 | `FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO` (**inclusive município inativo**), `FISCAL_CADASTROS_PAIS_NAO_ENCONTRADO` | `PessoaDadosFiscaisResolver.cs:44-62` |
| `dados-fiscais` | 400 | `FISCAL_CADASTROS_VALIDACAO` (SUFRAMA sem dígito, excesso de tamanho no domínio) | `DadosFiscaisPessoa.cs:118-153` |
| `município` | 400 | `FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO`, `FISCAL_CADASTROS_MUNICIPIO_INATIVO` | `CadastroFiscalConsultaService.cs:90-104` |
| `dados-fiscais`, `município`, `backfill` | 404 | `Recurso.NaoEncontrado` (pessoa ausente, **ou de outra empresa/filial**, ou endereço ausente: **indistinguíveis**) | `ApiErrorResponseFilter.cs` `ClassificarResposta` |

`ApiErrorResponse` tem **6 campos** (`Code`, `Message`, `UserMessage`, `Operation`, `TraceId`, `Errors?`; `ApiErrorResponse.cs:3-9`). O filtro chama `ApiErrorResponse.From(code, message, operation, traceId)` **sem** `errors`
(`ApiErrorResponseFilter.cs`, ramo `Error`): `Errors` é sempre `null` nas respostas de `Error`. O frontend tipa `ApiError` com `code`, `message`, `details`, `validationErrors`, `fieldErrors`, `status`, `traceId` (`types/erp.ts:402`).

## 4. Enums, regras e semântica do backend

- **Serialização numérica.** `grep -rn "JsonStringEnumConverter\|AddJsonOptions" --include=*.cs Erp.Api` → **0**. `IndicadorContribuinteIcms`: `Contribuinte=1`, `Isento=2`, `NaoContribuinte=3` (`IndicadorContribuinteIcms.cs:12-16`). `IndicadorIeDestinatario`: `ContribuinteIcms=1`,
  `ContribuinteIsento=2`, `NaoContribuinte=9` (**derivado**, `ParaIndicadorIeDestinatario`, `:25-30`; nunca informado). `RegimeTributario`: `SimplesNacional`, `LucroPresumido`, `LucroReal`, **sem valores explícitos** → 0/1/2 (`RegimeTributario.cs:3-8`).
  O banco guarda texto (`HasConversion<string>`, `PessoaConfiguration.cs:28-32`); a API fala número. **Não verificado em execução.**
- **Correspondência no frontend:** `IndicadorContribuinteIcms` (1/2/3) e `RegimeTributario` (0/1/2) existem e **batem valor a valor**; `RegimeTributario` está **declarado duas vezes** (`administracao.types.ts:9-13`, `tributacao.types.ts:22-26`);
  `IndicadorIeDestinatario` tem **0** ocorrências em `features types lib app`.
- **Só `Contribuinte` exige IE** (`ExigeInscricaoEstadual`, `IndicadorContribuinteIcms.cs:32-33`). A coerência está na `Pessoa` (`Pessoa.cs:111-116`), não no value object, porque a IE mora em outro campo, escrito por **outro** endpoint (`PUT /api/pessoas/{id}`, `PESSOAS_GERENCIAR`). A IE é só "não vazia": **não valida formato**.
- **Município da Pessoa × município do endereço.** O bloco fiscal grava `Pessoa.MunicipioIbgeId`. O resolver lê **só** `EnderecoPessoa.MunicipioIbgeId` (`DestinatarioFiscalResolver.cs:184-199`). O da Pessoa **não satisfaz o resolver** (continuação do EP-19 do `15`).
  `grep "MunicipioIbgeId" Erp.Application/Fiscal/Documentos` não mostra leitura de `pessoa.MunicipioIbgeId`.
- **UF do endereço × município.** `EnderecoPessoa.Atualizar` zera o vínculo **só na troca de UF**, não na de cidade (`EnderecoPessoa.cs:60-71`; EP-2 do `15` segue valendo, e a `b73` já avisa na tela).
- **Município carregado.** `data/fiscal/municipio-ibge.csv` tem **27 municípios** (`grep -vc '^#'` = 28 linhas não comentadas, uma delas o cabeçalho) e 4 linhas de comentário; **não há carga automática no startup**: a tabela só enche por
  `POST /api/fiscal/cadastros/importar/{tabela}` (`ArquivoTabelaOficialProvider.cs:31`). O que o banco dev tem: **não verificado**.
- **Pessoa inativa:** `dados-fiscais` → 400 (`Pessoa.cs:109`); município → **sem barreira** (só o endereço); `Bloqueada` → **nenhuma** das duas confere.

## 5. Os códigos `Fiscal.Destinatario*` e `Fiscal.Contexto*`: de onde saem e se trazem `pessoaId`

Códigos em `FiscalErrors.cs`. **Kind** é `Validation` (400, com o código preservado) em todos, **exceto** `DestinatarioPessoaNaoEncontrada` (`Error.NotFound("Pessoa", id)` → **404 `Recurso.NaoEncontrado`**, sem o código).

| Código | Linha | `pessoaId` no texto? | Sai de (C#) | Gerar NF | Adicionar item | Confirmar | Validar | Calcular |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `Fiscal.DestinatarioSemPessoaVinculada` | `:209-212` | **não** (traz o `notaFiscalId`) | `DestinatarioFiscalResolver.cs:128-133`; `CfopDoItemResolver.cs:72-77` | não alcançável (a nota nasce com `cliente.PessoaId`) | só nota criada sem pessoa | idem Gerar NF | sim | sim |
| `Fiscal.DestinatarioPessoaNaoEncontrada` | `:205-206` | n/a (**404 genérico, sem código**) | `:152-157` | sim | sim | sim (leg 1) | sim | sim |
| `Fiscal.DestinatarioSemEnderecoFiscal` | `:218-221` | **sim**, no texto | `:163-166` | sim | sim | sim (leg 1) | sim | sim |
| `Fiscal.DestinatarioSemEnderecoPrincipal` | `:229-232` | **sim** | `:168-175` | sim | sim | sim | sim | sim |
| `Fiscal.DestinatarioEnderecoFiscalIncompleto` | `:235-238` | **sim** | `:179-182` | sim | sim | sim | sim | sim |
| `Fiscal.DestinatarioSemMunicipioIbge` | `:241-244` | **sim** | `:184-187` | sim | sim | sim | sim | sim |
| `Fiscal.DestinatarioMunicipioIbgeNaoEncontrado` | `:247-250` | **não** (traz o Id do **município**) | `:189-193` | sim | sim | sim | sim | sim |
| `Fiscal.DestinatarioMunicipioUfDivergente` | `:256-259` | **não** (traz código IBGE e as duas UFs) | `:198-202` | sim | sim | sim | sim | sim |
| `Fiscal.DestinatarioSemIndicadorContribuinteIcms` | `:304-307` | **sim** | `ContextoTributarioDocumentoResolver.cs:100-104` | **não** | **não** | **não** | sim | sim |
| `Fiscal.ContextoDestinatarioContribuinteIpiNaoInformado` | `:363-366` | **sim** | `ContextoTributarioDocumentoResolver.cs:187-191` (só se `empresa.ContribuinteIpi`) | não | não | não | sim | sim |
| `Fiscal.ContextoNaturezaTomadorServicoNaoInformada` | `:373-376` | **sim** | `:215-219` (só PJ com item de serviço) | não | não | não | sim | sim |

Leitura da coluna "Sai de": **Gerar NF** = `GerarNotaFiscalPedidoVendaUseCase.cs:149` (`ResolverUfsAsync`, só se há natureza); **Adicionar item** = `NotaFiscalBasicaUseCases.cs:222` (idem, só se a nota tem natureza);
**Confirmar** = leg 1, que chama o Gerar NF (`ConfirmarFaturamentoUseCase.cs:121`) e devolve `Result.Failure` (**400**, `:132-145`); **Validar** = `ValidarNotaFiscalUseCase.cs:163` → `CalculoTributarioNotaFiscalService.cs:59` → `ContextoTributarioDocumentoResolver`
(que chama emitente → destinatário → indicador → natureza → empresa → itens → IPI → tomador, nesta ordem, `:79-219`); **Calcular** = `CalcularTributosNotaFiscalUseCase.cs:58`, mesmo caminho. **Nota em `Rascunho` é pré-condição do Validar e do Calcular**
(`NotaFiscalEstaEmRascunhoParaCalculo`, `CalculoTributarioNotaFiscalService.cs:53-56`).

**O `pessoaId` em campo estruturado: não.** `ApiErrorResponse` não tem campo para ele; `Errors` é sempre `null` (§3.4). **7 dos 11 códigos** trazem o `pessoaId` **só dentro da mensagem** (`'{pessoaId}'` entre aspas simples); 3 não o trazem em lugar nenhum
(`MunicipioIbgeNaoEncontrado`, `MunicipioUfDivergente`, `SemPessoaVinculada`) e 1 vira 404 genérico sem código (`PessoaNaoEncontrada`). Fontes de `pessoaId` **no frontend** em cada ponto onde o erro aparece:

| Ponto onde o erro aparece | Componente | O que o componente sabe da pessoa | Fonte de `pessoaId` disponível |
| --- | --- | --- | --- |
| Validar | `NotaFiscalDetalhePage.tsx:159-167,220` → `NotaFiscalErroCadastroPanel` | tem `nota` (`NotaFiscalResponse`) | `nota.pessoaId` (`fiscal.types.ts:25`; C# `NotaFiscalResponse.cs`: `Guid? PessoaId`) |
| Adicionar item | `ItemNotaFiscalDialog` (`FiscalActionDialogs.tsx:268-296`), montado em `NotaFiscalDetalhePage.tsx:351` | props: **`empresaId`, `filialId` apenas** | o pai tem `nota.pessoaId`; o diálogo **não o recebe** |
| Gerar NF | `GerarNotaFiscalPedidoVendaDialog` (`:179-266`), montado em `NotaFiscalConsultaPage.tsx:352` (pedido escolhido no diálogo) e `PedidoVendaDetalhePage.tsx:298` | props: `pedidoVendaId`, `escopoPedido` (`empresaId`, `filialId`); **sem cliente nem pessoa** | `pedido.clienteId` → `cliente.pessoaId` (`clientes.types.ts:13`), por consulta adicional |
| Confirmar Faturamento | `ConfirmarFaturamentoDialog` (`FaturamentoDialogs.tsx:172-241`) | props: `faturamentoId`, `empresaId`, `filialId`; **`FaturamentoResponse` não tem cliente nem pessoa** (`FaturamentoContracts.cs:32-44`, lido até `ConfirmadoPor`/`CanceladoPor`; `grep Cliente|Pessoa` nas linhas 32-60 → 0) | `FaturamentoDetalhePage.tsx` já resolve o rótulo do cliente por `pedido.clienteId` (`ClientePedidoRotulo`, `:55-70`), mas o diálogo não o recebe |

**Mapa D50/D101 hoje:** `fiscalErrosCadastroMap` (`fiscalErrosCadastro.ts:29-44`) tem **2 entradas** (`Fiscal.SerieFiscalNaoCadastradaParaContexto`, `Fiscal.CfopSemMapeamentoParaAmbito`). O tipo `FiscalErroCadastroLink` (`:18-27`) tem `href` (**string fixa**),
`anyOf`, `titulo`, `rotuloLink`, `semPermissaoTexto`; `resolveFiscalErroCadastroLink(code)` recebe **só o código** (`:46`); `FiscalErroCadastroAcao` recebe um `ApiError` e renderiza `Link href={link.href}` sem parâmetro
(`FiscalErroCadastroAcao.tsx:14-35`). Usos: `NotaFiscalErroCadastroPanel` (1), `FiscalActionDialogs.tsx` (`ErroCadastroNoDialogo`, para Gerar NF e Adicionar item), `FaturamentoDialogs.tsx:241` (Confirmar). O comentário de `:3-5` diz que as "quatro
`DestinatarioSem*` continuam fora até a `b74`"; o teste `NotaFiscalErroCadastroPanel.test.tsx:44-49` exige `Object.keys(map) == [série, CFOP]` (`:45`) e `resolveFiscalErroCadastroLink('Fiscal.DestinatarioSemEnderecoFiscal')` **`toBeNull()`** (`:48`).
**O código não diz quais são "as quatro"** (a D53 diz "quatro `DestinatarioSem*`"): o backend tem **5 códigos `Fiscal.DestinatarioSem*`** (`SemPessoaVinculada`, `SemEnderecoFiscal`, `SemEnderecoPrincipal`, `SemMunicipioIbge`, `SemIndicadorContribuinteIcms`) e mais 4 `Destinatario*` (um deles, `PessoaNaoEncontrada`, sem string de código) e 2 `Contexto*` (`ContribuinteIpiNaoInformado`, `NaturezaTomadorServicoNaoInformada`) (PF-9).

## 6. Permissões

| Código | Backend (`SystemPermissions.cs`) | Snapshot | Union | Catálogo FE | Catálogo estruturado do backend | Rota | Menu pai / filho | Rotas do recorte que exigem |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PESSOAS_CONSULTAR` | `:46` | `:154` | `types/erp.ts:255` | `permissoesCatalogo.ts:46` | `PermissoesCatalogoDefinition.cs:41` (`/pessoas`, não crítica) | `routePermissions.ts:15` | `AppMenu.tsx:73` / `:75` | `GET /api/pessoas`, `GET …/enderecos` |
| `PESSOAS_GERENCIAR` | `:47` | `:156` | `:256` | `:47` | `:42` (crítica) | `:15` | `:73` / `:75` | `POST`/`PUT /api/pessoas`, escrita de endereço |
| `PESSOAS_DADOS_FISCAIS_GERENCIAR` | `:49` | `:155` | `:258` | `:49` (`Dados fiscais · Gerenciar`) | `:44` (crítica, ação `dadosFiscais`) | **sem regra própria** | **ausente do pai e do filho** | `PATCH /dados-fiscais`, `PATCH …/municipio`, `POST …/backfill-municipios` |
| `FISCAL_CADASTROS_CONSULTAR` | `:126` | `:114` | `:311` | `:117` | `PermissoesCatalogoDefinition.cs:193` | `routePermissions.ts:57` (naturezas) | `AppMenu.tsx:133,137` | `GET /api/fiscal/cadastros/municipios`, `…/paises`, `…/uf` |

- **As 4 fontes (backend, snapshot, union, catálogo FE) concordam** nas 4 permissões. Não rodei `validate:backend-permissions`: **não verificado** por gate.
- **`GERENCIAR` não implica `CONSULTAR`, e `DADOS_FISCAIS_GERENCIAR` não implica nenhuma das duas** (cada rota tem seu `[RequiredPermission]`; o Master tem todas, `MasterLogin.cs:17` `TodasComMaster`). A tela de Pessoas exige `PESSOAS_CONSULTAR`
  (`PessoasPage.tsx:53`) e as ações de edição `PESSOAS_GERENCIAR` (`:101-103,119`). **Um fluxo "cadastrar o endereço → vincular o município com busca" exige 3 permissões distintas:** `PESSOAS_GERENCIAR` (endereço), `PESSOAS_DADOS_FISCAIS_GERENCIAR`
  (vínculo) e `FISCAL_CADASTROS_CONSULTAR` (busca). O precedente de endereço da empresa já exige a última (`useEnderecoFiscalCatalogos.ts:10,33-34`; EP-14 do `15`). **`PESSOAS_DADOS_FISCAIS_GERENCIAR` tem 0 consumidores em `features app lib layout components`**
  (`grep -rn` fora de `docs`: só `permissoesCatalogo.ts:49`, `types/erp.ts:258`, `backend-permissions.snapshot.json:155`).
- **Link de correção:** `FiscalErroCadastroLink.anyOf` (`fiscalErrosCadastro.ts:21`) é a permissão para **ver o link**; o destino `/pessoas` exige `PESSOAS_CONSULTAR` na página. Quem tem a permissão de ver o link e não a de resolver depende da escolha de `anyOf` por entrada (hoje: série
  `FISCAL_SERIES_*`, CFOP `FISCAL_CADASTROS_*`).
- **Banco dev:** quais grupos concedem `PESSOAS_DADOS_FISCAIS_GERENCIAR`: **não verificado** (Docker parado). Só sei, por leitura, que o login Master a tem.
- **`accessRisk` desta fatia (fato, a classificação é da rodada):** nenhuma permissão entra ou sai do union; a capacidade nova é aditiva. Nada que exista hoje perde acesso.

## 7. Estados de tela

Procurei os componentes nas linhas do HEAD. Não deduzi pelo nome. "Não se aplica" = a tela não tem essa situação.

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Aba do bloco fiscal da Pessoa** | não existe | não existe | não existe | não existe | não existe | não existe | não existe |
| **Vínculo de município no endereço** (diálogo/ação) | não existe | não existe | não existe | não existe | não existe | não existe | não existe |
| `PessoaEnderecosTab` (aba "Endereços", `b73`) | presente (`LoadingState`, `:205`) | presente (`EmptyState`, `:207-209`) | presente (`ApiErrorPanel` + botão "tentar novamente" `refetch`, `:197-203`; erro de ação `:189-195`) | **ausente** (não há estado bloqueante; erro da lista é recuperável) | presente (`toast.success`, `:110,122,137`) | presente (`Message warn` sem `PESSOAS_CONSULTAR`, `:71-73`; "somente leitura" sem `GERENCIAR`, `:186`) | presente (`title={motivoIndisponivel}` e `Message`s, `:78,186-187`) |
| `PessoaEnderecoDialog` | presente (botão `loading`, `closable={!loading}`, `:112,120`) | não se aplica | presente (`ApiErrorPanel` com `code`/`traceId` + "lista desatualizada", `:121-122`) | ausente | toast do pai | não verificado (o diálogo não confere permissão; o pai o esconde) | presente (checkbox "principal" travado com a explicação, `:215-219`; avisos de UF/cidade trocada, `:208-212`) |
| `PessoasPage` (hospedeira) | presente (`DataTableServer loading={listQuery.isFetching}`, `:113`) | presente **em dobro** (`emptyMessage` `:113` + `EmptyState` `:121`) | presente (`ApiErrorPanel`, `:112`), **sem botão de tentar de novo** e sem `code`/`traceId` (§2) | ausente | presente (toast, `:82,93`) | presente (`UnauthorizedState`, `:53-55`) | **ausente**: "Nova pessoa" desabilita sem texto (`PermissionGuard mode="disable"`, `:101-103`); Editar/Inativar `disabled: !isActive(row)` sem motivo (`:119`) |
| `PessoaFormDialog` (hospedeiro) | presente (Salvar `loading`) | não se aplica | **ausente no diálogo** (erro de campo só do Zod; erro do servidor por toast da página, `rethrow: true`) | ausente | toast da página; **fecha o diálogo** no sucesso do `PUT` (`PessoasPage.tsx:72` `setFormVisible(false)`) | não verificado | ausente |
| `NotaFiscalErroCadastroPanel` / `FiscalErroCadastroAcao` | n/a | n/a | n/a | presente (`Message severity="error"` + link, `NotaFiscalErroCadastroPanel.tsx:18-24`) | n/a | presente (texto `semPermissaoTexto` sem link, `FiscalErroCadastroAcao.tsx:31-33`) | n/a |
| `EnderecoFiscalFormSection` (precedente: endereço da empresa/filial, **município no mesmo `PUT`**) | presente (`ufLoading`, `municipioLoading`, botão `loading`) | não verificado | presente (toast; erro por campo) | não verificado | presente (toast) | presente (`Message` warn sem `FISCAL_CADASTROS_CONSULTAR`) | presente (mensagens por motivo) |

Em `EnderecoFiscalFormSection.tsx` li as linhas citadas pelo `15` (`:284-297`) e os pontos de uso dos hooks (`:105,120-122,208`); os estados marcados "não verificado" não foram lidos até o fim.

## 8. Banco dev

**Não medido por mim: o daemon do Docker está parado** (erro bruto no topo). Nenhum `select` rodou. Não iniciei o Docker.

| O quê | Valor | Origem |
| --- | --- | --- |
| `erp.pessoas` | 2 | `CHANGELOG.md:135`, medição de 2026-09-30 (rodada 13). **Não refeita** |
| `erp.pessoas_enderecos` | **0 linhas** | `13-design-faturamento.md:51,551`; `CHANGELOG.md:135`. **Não refeita.** Desde então a `b73` entrou: **se alguém cadastrou endereço, não sei** |
| endereços com `MunicipioIbgeId` não nulo | **não verificado** | — |
| Pessoas com `IndicadorContribuinteIcms` preenchido | **não verificado** | — |
| `erp.municipios_ibge` (banco) | **não verificado** (só 27 capitais **se** a carga foi a do CSV) | — |
| `data/fiscal/municipio-ibge.csv` (**arquivo do repositório do backend, não o banco**) | **27 municípios** (as 27 capitais: `1100205;Porto Velho;RO`, …), 28 linhas não comentadas, 4 de comentário | `grep -vc '^#'`, `grep -c '^#'`; `git log` do arquivo: `fbe587e` (v1.13.0) |
| Grupos que concedem `PESSOAS_DADOS_FISCAIS_GERENCIAR` | **não verificado** | — |
| naturezas de operação e endereço fiscal das 2 empresas | **não verificado** | `CHANGELOG.md:135` dizia 0 naturezas em 2026-09-30 |

Se o banco dev tem só a amostra, o `PATCH …/municipio` e o `backfill` com qualquer cidade que não seja capital falham (`FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO` / divergência) e a pessoa não passa do `DestinatarioSemMunicipioIbge` (EP-18 do `15`, mantido).

## 9. Precedentes no código (sem desenhar)

| Precedente | O que o código tem | O que não tem |
| --- | --- | --- |
| Município em dois passos (empresa/filial) | `useMunicipioCatalogo(ufSigla)`: busca com `termo`, debounce 350 ms, `tamanhoPagina: 20`, desabilitada sem `FISCAL_CADASTROS_CONSULTAR` ou sem UF (`useEnderecoFiscalCatalogos.ts:48-70`). `useMunicipioResolvidoPorId(uf, id, cidade)`: passo 1 por `termo=cidade`, 50 itens; passo 2 varredura da UF com **`tamanhoPagina: 1000`** (`:90-125`). Status `nao-aplica`/`pendente`/`resolvido`/`falhou` | mora em **`features/administracao/hooks`**, com `queryKey ['administracao','endereco-fiscal',…]` e `administracaoApi.listarMunicipiosFiscais`; **o backend limita a página a 200** (PF-15) |
| `CadastroFiscalSelects.tsx` (D99) | `features/fiscal/components/CadastroFiscalSelects.tsx` exporta **`NcmSelect` e `CfopSelect`** e `CADASTRO_FISCAL_SEM_PERMISSAO` (`:30-72`) | **não há `MunicipioSelect`** nem busca de município; **não há** busca de país (`grep` de `cadastros/paises` → 0) |
| Imports cruzados de hooks de administração | `features/fiscal`, `contabil`, `rh`, `patrimonio` e `seguranca` importam hooks de `features/administracao` (`grep -rn "from '@/features/administracao" features`) | a D102 (emenda) recusou **`pessoas` → `faturamento`** como "primeiro import cruzado entre features de negócio" |
| Aba "Dados fiscais" de Produto | `ProdutoFormDialog.tsx:290-291` (`PermissionGuard` + `fallback` com `Message`); `ProdutosPage.tsx:88,138-155` (mapa de código de erro → campo; dispara o `PATCH` só se `hasPermission('PRODUTOS_DADOS_FISCAIS_GERENCIAR')` e o bloco não está em branco) | Pessoa: nada equivalente |
| Aba de endereços de Pessoa (`b73`) | `PessoaEnderecosTab`/`PessoaEnderecoDialog` aninhado; `usePessoaEnderecos` com `queryKey ['pessoas','enderecos',id]` (apanhada por `invalidate ['pessoas']`); `pessoaEnderecosApi` com `PessoaEnderecosApiError` | município só como `Tag` |
| UF estática | `lib/constants/ufs.ts` (`UFS_BRASIL`, 27, movido na `b73`); `UF_ENDERECO_OPTIONS` em `pessoaEnderecosLabels.ts` | — |

## 10. Decisões travadas × medido

Não redecido; só aponto onde o medido acrescenta ou tensiona.

| Decisão | Medido |
| --- | --- |
| **D47 item 2** (bloco fiscal e endereços em `features/pessoas`) | `features/pessoas` tem `api/ types/ schemas/ hooks/ components/` e `tests/` vazia; o bloco fiscal não tem arquivo. O `usePessoasResources.ts` invalida `['pessoas']` (prefixo) nas mutações de Pessoa; a chave de lista é `['pessoas', query]`. |
| **D49 item 2** (aba no `TabView`) | O `TabView` do `PessoaFormDialog` já tem 4 abas. Fato: o diálogo serve criar e editar; no criar não há `id` (a `b73` resolveu mostrando texto "salve a pessoa"). O bloco fiscal grava a pessoa existente. |
| **D50** (link por `Error.Code`, com `pessoaId` quando o erro é do destinatário) | O `pessoaId` **não vem em campo** (§5): 7 de 11 códigos o trazem só no texto; 3 não o trazem; 1 vira 404 sem código. Os 4 pontos de exibição têm fontes de `pessoaId` diferentes, e em 2 deles (Gerar NF, Confirmar) a Pessoa **não está na tela**. O `href` do tipo atual é fixo e `/pessoas` não lê query string. |
| **D52** (município só por busca no servidor, com debounce; UF estática) | O servidor limita a página a **200** e o `termo` não normaliza acento (PF-15). O precedente de busca está em `features/administracao`. A D52 vale para busca; o `PATCH` aceita só o **código** (7 dígitos). |
| **D53** (`b61` = bloco fiscal + vínculo de município + "links das quatro `DestinatarioSem*`") | O C# separa as rotas em duas permissões (`PESSOAS_DADOS_FISCAIS_GERENCIAR` para as 3 da `b75`). "As quatro" não está nomeada; o backend tem 5 `DestinatarioSem*` (PF-9). O D53 deixa fora "contatos, bloquear/desbloquear e exibição de `Bloqueada`/`MotivoBloqueio`". |
| **D97** ("nenhum faturamento conclui sem natureza e sem endereço fiscal do destinatário") | O destinatário passa com **endereço principal + município vinculado**; além dele, o C# mostra outras barreiras no mesmo clique (§0.1: emitente, config fiscal, XSD, certificado, chave do mock). |
| **D98–D101** (precedentes da `b72`) | `accessRisk`, lista só com contexto resolvido, mapa D50 indexado por código e helper único `FiscalErroCadastroAcao.tsx` são aplicáveis. Não se transferem: filtro "Ativas/Todas" nem 404 genérico por filial (o `PATCH` de município **tem** o guard, ao contrário das 5 rotas de endereço). |
| **D102 e emenda** | "Os links `DestinatarioSem*` ficam na `b74` (PF-2), junto do link para a Pessoa por id"; honestidade: depois da `b73`, falha em `DestinatarioSemMunicipioIbge`. A emenda: `UFS_BRASIL` em `lib/`; diálogo aninhado; a aba recebe permissões de quem a monta. **O texto da D102 diz `b74`; pela D103 é `b75`** (renumeração; 8 linhas de código/teste/script ainda citam "b74" nesse sentido: PF-10). |
| **D103** | `b74` = ST com DIFAL no catálogo de tributação; esta fatia é a `b75`. Os 3 códigos novos do `TRIBUTACAO_ERROR_CATALOG` não são `Destinatario*`. |

## 11. O que ficou obsoleto no `15` e nos documentos de contrato

| Onde | O que diz | Hoje |
| --- | --- | --- |
| `15 §0.1`, `grep` do `NotaFiscalXmlBuilder` | "tem **0** referências a `Pessoa\|Destinat\|Endere\|Municipio`" | **1** linha (`:222`), em mensagem de CT-e; conclusão igual (§0.1 acima) |
| `15 §1` | "`/pessoas`… `PessoaFormDialog.tsx`, 140 linhas, 3 abas" | 148 linhas e **4 abas** (a `b73` entregou "Endereços") |
| `15 §2` | "Contagem: **7 rotas de endereço, 0 consumidas**" | **5 consumidas** (b73); as 2 da `b75` seguem ausentes |
| `15 §6` | "`PESSOAS_DADOS_FISCAIS_GERENCIAR`… pai não a lista" | **continua**; agora é achado da `b75` (PF-11) |
| `GAP-FRONTEND-BACKEND.md:144-155` | "Pessoas — faltam 15 de 19" | **10 de 19** (PF-7) |
| `CONTRATO-API-v1.23.md:12808-12990` | endereços "Frontend ❌ não consome" | consumidos pela `b73` (PF-7). `dados-fiscais`, município e backfill **seguem** ❌ |
| `BACKEND-ESTADO-ATUAL-E-CONTRATO.md:3050,3061` | `AtualizarDadosFiscaisPessoaRequest` com **6** campos; `PessoaResponse` com **20** | C# e `CONTRATO-API-v1.23.md`: **8** e **22** (`ContribuinteIpi`, `TomadorOrgaoPublico`, v1.22.0/G2). Documento nível 3 atrás do nível 2 (PF-6) |
| `fiscalErrosCadastro.ts:3-5`; `NotaFiscalErroCadastroPanel.test.tsx:44` | "as quatro `DestinatarioSem*` continuam fora até a `b74`" | numeração da D103: `b75` (PF-10) |
| `scripts/backend-request-records.snapshot.json` | `backendCommit: 0387e44` | HEAD `6bb6fc4`; **0 arquivos de Pessoa mudaram**, então os records de Pessoa não ficaram defasados |

## 12. Testes e gates que tocam o recorte (lista para o QA)

Medido por `grep -rli` em `tests/` e leitura. **Nenhum foi executado nesta sessão.**

```text
# afirmam o desenho antigo e ficam vermelhos se a fatia mexer
tests/components/NotaFiscalErroCadastroPanel.test.tsx   :44-49 (mapa D50 == [série, CFOP]; 'Fiscal.DestinatarioSemEnderecoFiscal' == null)   # só se entrar link Destinatario*
tests/e2e/fixtures/logosoft.ts                          :741 (`path.includes('/api/pessoas')` devolve o ARRAY DE PESSOAS para qualquer subcaminho, inclusive PATCH .../dados-fiscais e .../municipio)

# tocam a aba, o diálogo e a lista de Pessoa
tests/components/PessoaEnderecosAC2AC7.test.tsx
tests/e2e/v1.11.0a8b73-endereco-pessoa.spec.ts
tests/e2e/cadastros.spec.ts
tests/unit/pessoaEnderecosPayload.test.ts               :62 (cita "municipioIbgeCodigo é do PATCH da b74" no nome do caso)
tests/unit/pessoasClientesFornecedoresPayload.test.ts
tests/unit/gateContractRequestFields.test.ts

# leem rota/menu/guard (só se a rota, o menu ou as chamadas HTTP mudarem)
tests/unit/guardPermissionMap*.test.ts                  (o gate lê chamada HTTP × permissão do contrato; um PATCH novo entra aqui)

# gates
scripts/gate-contract-request-fields.mjs                SCHEMA_TO_REQUEST_MAP.pessoas (:77-85): classificações (3) + 2 de endereço; **nenhum** de dados-fiscais, município ou backfill; RECORDS_ENVIO_INTEGRAL (:154-163) inclui os 2 de endereço
scripts/backend-request-records.snapshot.json / backend-response-records.snapshot.json   0 ocorrências de DadosFiscaisPessoa, PessoaResponse, EnderecoPessoa
scripts/backend-contract-map.allowlist.json             0 ocorrências de "pessoas"
```

`usePessoas` é consumido em 19 arquivos; os testes que o mockam estão em `tests/components/` (AprovarPedidoVendaDialog, avisoTetoListagens, ClienteClassificacaoAC8AC9, ClientesPageAC2AC4, ColaboradorFormDialogB63, FaturarPedidoVendaDialog,
financeiroLancamentoManual, FiscalActionDialogsNatureza, FornecedoresPageAC7AC10, PedidosVendaPageAC7). Se `PessoaResponse` ganhar campos tipados, **16** arquivos de produção o referenciam (`grep -rln "PessoaResponse\b"`).

---

## Divergências

Seis classes pedidas pelo manual e as que o recorte acrescentou. **PF-n** é o identificador desta rodada.

**PF-1: `PATCH /dados-fiscais` tem semântica de substituição integral; campo omitido apaga.**
`PessoaDadosFiscaisResolver.cs:31-36` trata o corpo em branco como "limpar"; `DadosFiscaisPessoa.Criar` reconstrói o bloco só com o que veio (`:100-143`) e `Pessoa.DefinirDadosFiscais` sobrescreve os 9 campos (`Pessoa.cs:118-126`). Um corpo com só
`indicadorContribuinteIcms` zera `InscricaoEstadualSt`, `Suframa`, `RegimeTributarioParceiro`, `MunicipioIbgeId`, `PaisId`, `ContribuinteIpi` e `TomadorOrgaoPublico`. O verbo é `PATCH`; o Swagger descreve todos os campos como opcionais
(`CONTRATO-API-v1.23.md:12730-12741`). Classe: campo omitido com efeito destrutivo; o gate de request só trata assim os records de `RECORDS_ENVIO_INTEGRAL`, onde este não está.

**PF-2: o indicador "Contribuinte" depende de um campo que outro endpoint grava (a IE), e a aba de documentos e o bloco fiscal têm permissões diferentes.**
`Pessoa.cs:111-116`: `Contribuinte` com `InscricaoEstadual` vazia → 400 `PESSOAS_VALIDACAO`. A IE é escrita por `PUT /api/pessoas/{id}` (`PESSOAS_GERENCIAR`, aba "Documentos e observações"); o bloco por `PATCH` (`PESSOAS_DADOS_FISCAIS_GERENCIAR`). A IE vale "não vazia", sem formato.
Quem tem só uma das duas permissões não consegue completar o par. O `record` do diálogo é uma foto da lista (PF-4). Classe: dependência entre dois requests e dois perfis.

**PF-3: `createdAt` lido pela UI e não entregue (continuação do EP-17 do `15`).** `pessoas.types.ts:21`; `OperationalGovernancePanel.tsx:28`; `PessoaResponse.cs:7-29` sem o campo. Classe: campo lido pela UI que o backend não entrega.

**PF-4: os 11 campos entregues e não declarados chegam à UI sem tipo; o `record` do diálogo é uma foto.**
`GET /api/pessoas` entrega os 22 (`PessoaMapper.cs:11-33`); `pessoas.types.ts` declara 12; não há Zod de resposta (`pessoasApi.ts:44-47`). Consequências medidas: (a) o dado fiscal gravado já está no objeto, mas sem tipo; (b) `filterLocal` varre
`Object.values(record)` (`PessoasPage.tsx:34`), então a busca local **já casa** com os campos fiscais em execução (valores numéricos 1/2/3, Guids, `true`/`false`); (c) o diálogo recebe `record={selected}` (`:123`), copiado do clique (`:119`), e **não relê**
`listQuery.data` enquanto está aberto: um `PATCH` dentro do diálogo não atualiza o que o diálogo mostra, a menos que algo o refaça (o `PUT` fecha o diálogo, `:72`). O `PATCH /dados-fiscais` devolve o `PessoaResponse` de 22 campos.
Classe: campo entregue pelo backend que a UI ignora (11), dado sem tipo.

**PF-5: município inativo tem códigos diferentes em duas rotas do mesmo recorte; a validação de forma também.**
`PATCH …/municipio` → `FISCAL_CADASTROS_MUNICIPIO_INATIVO` (`CadastroFiscalConsultaService.cs:102-104`). `PATCH /dados-fiscais` → `FISCAL_CADASTROS_MUNICIPIO_NAO_ENCONTRADO` para município inativo, porque `ObterMunicipioIdPorCodigoAsync` filtra `Ativo`
(`CadastrosFiscaisRepository.cs:119`). Forma: `municipioIbgeCodigo` do endereço exige `Length(7)` + `^[0-9]{7}$` (`EnderecoContatoValidators.cs:35-46`); o do bloco fiscal só `MaximumLength(7)` (`PessoaValidators.cs:54`), e um código com ≠ 7 dígitos vira "não encontrado".
Classe: regra diferente entre dois endpoints do mesmo recurso.

**PF-6: `BACKEND-ESTADO-ATUAL-E-CONTRATO.md` está atrás do C# no request e no response do bloco fiscal.**
`:3050` traz 6 campos (sem `ContribuinteIpi` e `TomadorOrgaoPublico`); `:3061` traz 20 campos (idem). O C# (`PessoaRequests.cs:37-45`, `PessoaResponse.cs:7-29`) e o `CONTRATO-API-v1.23.md` (`:12730-12775`) têm 8 e 22. O gate `validate:backend-contract-map` compara rotas; **não
detecta** campo. Classe: documento de nível 3 divergente do nível 2.

**PF-7: o `GAP` e o `CONTRATO` marcam como "não consumidas" as 5 rotas de endereço que a `b73` consome.** `GAP-FRONTEND-BACKEND.md:144-155` ("faltam 15 de 19", 5 de endereço entre elas); `CONTRATO-API-v1.23.md:12808-12990` ("Frontend ❌ não consome").
Medido: 9 de 19 consumidas, **10 ausentes** (§2). Não verifiquei se os dois documentos são gerados; o `CLAUDE.md` diz que os artefatos que os gates comparam são gerados e que o hook nega escrita à mão neles. Classe: documento defasado; não é divergência de contrato.

**PF-8: as mensagens do backend mandam o operador para campos que a tela de Pessoa ainda não tem, com rótulos que o frontend não definiu.**
`FiscalErrors.cs:365-366` diz "(Dados Fiscais > Contribuinte do IPI)" e `:375-376` "(Dados Fiscais > Tomador é órgão público)"; `:306-307` diz "indicador de contribuição do ICMS" (o campo no C# é `IndicadorContribuinteIcms`). O `PessoaFormDialog` não tem aba "Dados Fiscais"
(4 abas, §1) nem esses rótulos. O texto do backend é exibido tal qual (`ApiErrorPanel`, `FiscalErroCadastroAcao`). Classe: texto de erro do backend refere tela inexistente.

**PF-9: o `pessoaId` não vem em campo estruturado, e a D53 diz "as quatro `DestinatarioSem*`" sem nomeá-las.**
§5: `ApiErrorResponse` não tem o campo e `Errors` é sempre `null`; 7 de 11 códigos trazem o `pessoaId` só no texto; `MunicipioIbgeNaoEncontrado`, `MunicipioUfDivergente` e `SemPessoaVinculada` não o trazem; `PessoaNaoEncontrada` sai 404 sem código.
O backend tem **5** códigos `Fiscal.DestinatarioSem*`, 4 outros `Destinatario*` (um deles, `PessoaNaoEncontrada`, sem string de código: é `Error.NotFound`) e 2 `Contexto*`. Os dois pontos de exibição **sem pessoa na tela** (Gerar NF e Confirmar) só têm a pessoa pela cadeia pedido → cliente → pessoa. Continuação do EP-12/B-38 do `15`.
Classe: decisão travada sem lista nominal; dado do erro sem estrutura.

**PF-10: a numeração "b74" para este conteúdo ficou em 8 linhas de código, teste e script depois da D103.**
`fiscalErrosCadastro.ts:4`; `pessoaEnderecosLabels.ts:211`; `pessoasSchemas.ts:92`; `pessoaEnderecos.types.ts:31`; `NotaFiscalErroCadastroPanel.test.tsx:44`; `pessoaEnderecosPayload.test.ts:62`;
`gate-contract-request-fields.mjs:82,149` (`grep -rn "b74" … | grep -v "a8b74\|a\.8\.b74"`, descontados os 3 acertos de `SimuladorTributacaoPage.test.tsx` e `tributacaoErrors.test.ts`, que são a `b74` de verdade). Classe: comentário/descrição obsoleta; o teste `:62` leva o número no **nome** do caso.

**PF-11: `PESSOAS_DADOS_FISCAIS_GERENCIAR` não está na regra de rota nem no menu, e a página exige `PESSOAS_CONSULTAR`.**
`routePermissions.ts:15` (`/pessoas` → `CONSULTAR` ou `GERENCIAR`); `AppMenu.tsx:73,75` idem; `PessoasPage.tsx:53`. Quem tem só `DADOS_FISCAIS` não chega à tela. Quem tem `CONSULTAR` + `DADOS_FISCAIS` e não `GERENCIAR` vê a lista, mas não abre o diálogo (Editar exige `GERENCIAR`, `:119`),
que é onde o bloco fiscal e o vínculo viveriam (D49 item 2). Classe: permissão exigida pela rota da API ausente do perfil da tela; a classe é a do `accessRisk` (`risk.yaml`), classificação da rodada.

**PF-12: o `PATCH` de município aceita Pessoa inativa; o `PATCH` de dados fiscais não; o diálogo só abre para ativa.**
`VincularMunicipioEnderecoPessoaUseCase.cs` só confere `endereco.IsActive` (`EnderecoPessoa.cs:87`); `AtualizarDadosFiscaisPessoaUseCase` chama `GarantirAtiva` (`Pessoa.cs:109`); `PessoasPage.tsx:119` desabilita Editar para inativa. Classe: regra diferente entre rotas;
efeito: a capacidade do backend que a tela não alcança.

**PF-13: as três rotas da `b75` têm guard organizacional; as cinco de endereço não (EP-1 do `15`).**
`AtualizarDadosFiscaisPessoaUseCase`, `VincularMunicipioEnderecoPessoaUseCase` e `BackfillMunicipiosEnderecosPessoaUseCase` chamam `PessoaContextoOperacional.Validar`; o resultado de contexto divergente é **404 `Recurso.NaoEncontrado`**, indistinguível de pessoa ausente.
O `backfill` recebe `EmpresaId` no corpo, e o guard o confronta com o usuário (`EmpresaId == Guid.Empty` = contexto global). Classe: comportamento de erro que a UI precisa distinguir; **não medido em execução**.

**PF-14: o backfill casa por texto, em lote, sem dry-run, e devolve o motivo como texto.**
§3.3: todos os endereços ativos sem município da empresa (de Pessoas ativas **ou não**); ambiguidade recusada; grava ao final; `Motivo` é `Error.Message`/`ex.Message`, não código. Não há parâmetro de simulação. Classe: operação destrutiva-aditiva sem prévia; `Motivo` sem chave estável para a UI.

**PF-15: o servidor limita `tamanhoPagina` a 200; o precedente de município do frontend pede 1000.**
`CadastrosFiscaisFiltroFactory.cs:12-13,183-184`: `Math.Min(tamanhoPagina, 200)`. `useEnderecoFiscalCatalogos.ts:110` passa `tamanhoPagina: 1000` (comentário: "no máximo ~853 municípios, Minas Gerais"). Com a tabela completa, o passo 2 do precedente enxerga **no máximo 200 itens da UF**, ordenados por nome;
o município fora dessa janela não é achado. Além disso: `termo` casa `Nome.ToUpper().Contains` (sem normalizar acento) e `codigoIbge` casa por **prefixo** (`StartsWith`); não há filtro por Id (EP do `15`). Com o CSV de 27 capitais (≤ 1 por UF) o limite **não aparece**; medido por leitura, não executado.
Classe: limite do backend diferente do assumido pelo frontend.

**PF-16: o `termo` da busca de município e o casamento do backfill usam regras diferentes de acento.**
Busca (`CadastrosFiscaisRepository.cs:95-99`): `ToUpper().Contains`, **acento-sensível**. Backfill (`CadastroFiscalConsultaService.cs:107-142`): `NomeMunicipioNormalizador.Normalizar`, **acento-insensível**. "Sao Paulo" acha na segunda e não na primeira. Classe: regra diferente entre dois caminhos do mesmo cadastro.

**PF-17: a tela de endereço da `b73` afirma que o vínculo "não é alterado por este cadastro"; a `b75` muda isso.**
`pessoaEnderecosLabels.ts:236` (`municipioFiscalHint`) e `:211` (comentário). Pela D102, "sem prometer versão"; o texto é verdadeiro hoje. Registro para o QA da `b75`: o texto e o `title` do `Tag` ("vinculado"/"não vinculado", `PESSOA_ENDERECO_MUNICIPIO_FISCAL`) são afirmações que a `b75` toca.
Classe: texto de tela sujeito à fatia.

**PF-18 (fora do recorte, achado do §0.1): o mock da SEFAZ devolve uma chave que `NotaFiscal.Autorizar` recusa.**
`SefazMockClient.cs:24`: `chave = "MOCK" + yyyyMMddHHmmssfff`; `NotaFiscal.cs:436` → `ChaveAcessoNfe.Parse` exige 44 dígitos numéricos e DV (`ChaveAcessoNfe.cs:134-154`); `FiscalSefazUseCases.cs:213-229` usa `resposta.ChaveAcesso ?? nota.ChaveAcesso`. Pela leitura, a
autorização com `UseMock=true` falha no leg 4. **Leitura, não executado; não achei teste que a cubra** (`grep SefazMockClient tests` → só binários). Classe: contrato interno entre o mock e o domínio; **não classifiquei** (pode haver tratamento que não li).

**PF-19 (fora do recorte, achado do §0.1): o Confirmar fixa a validação de XSD e o repositório não traz XSD.**
`ConfirmarFaturamentoUseCase.cs:163` (`GerarXmlEnvioNotaFiscalRequest(true, true, null)`); `FiscalSchemaValidator.cs:19-35` exige o diretório e os `*.xsd`; `find . -name "*.xsd"` → 0. **Se os XSD são provisionados fora do repositório, não verifiquei.** Classe: pré-condição de ambiente.

**Sem divergência encontrada (afirmação com evidência):**

- **Tipo diferente entre o schema Zod e a resposta real:** **não aplicável** para o bloco fiscal e para `PessoaResponse` (não há Zod de resposta, `pessoasApi.ts:44-47`). Para `EnderecoPessoaResponse` (13 campos), o Zod (`pessoasSchemas.ts:162-178`) bate com o C# em
  nome e tipo (`tipo`/`status` números, `municipioIbgeId` `string | null`); **não executado** contra a resposta real.
- **Enum fixo no frontend sem enum correspondente no backend:** **0**. `IndicadorContribuinteIcms` (1/2/3) e `RegimeTributario` (0/1/2) do frontend batem valor a valor com o C#; `TipoEndereco` (6 valores, `pessoaEnderecos.types.ts:7-13`) bate com `TipoEndereco.cs:3-10`. O inverso (enum do backend sem equivalente no
  frontend): `IndicadorIeDestinatario` (1/2/9), derivado, só na resposta.
- **Endpoint consumido fora da allowlist:** **0** (as rotas consumidas por Pessoas constam do catálogo `BACKEND-ESTADO…`; a allowlist está vazia e `audit-only`). **Gate não rodado.**
- **Permissão exigida na rota e ausente do catálogo, ou o contrário:** **0** nas 4 permissões (backend, snapshot, union, catálogo FE concordam). A assimetria é a de PF-11 (rota/menu), não de catálogo.

---

## Conta de campos, fechando

**Respostas (o que o backend entrega × o que o frontend declara):**

| Record | Backend entrega | Frontend declara | Com destino | Divergência (lido e não entregue) | Sem uso | Entregue e não declarado |
| --- | --- | --- | --- | --- | --- | --- |
| `PessoaResponse` | 22 | 12 (11 com par + `createdAt`) | 9 | 1 (`createdAt`) | 2 (`empresaId`, `filialId`) | 11 |
| `EnderecoPessoaResponse` | 13 | 13 | 11 | 0 | 2 (`pessoaId`, `status`) | 0 |
| `BackfillMunicipiosEnderecosPessoaResponse` | 3 | 0 | 0 | 0 | 0 | 3 |
| `DivergenciaMunicipioEnderecoResponse` | 5 | 0 | 0 | 0 | 0 | 5 |
| `MunicipioIbgeResponse` (declarado em `administracao`) | 8 | 8 | 4 | 0 | 4 | 0 |
| `PagedResult<MunicipioIbgeResponse>` (envelope) | 7 | 5 | 1 (`items`) | 0 | 4 | 2 |
| **Total** | **58** | **38** | **25** | **1** | **12** | **21** |

Fórmula dos declarados: **38 = 25 + 1 + 12**. Fecha. Fórmula do total entregue: **58 = 37 declarados com par (38 − 1 de `createdAt`) + 21 não declarados** (11 + 0 + 3 + 5 + 0 + 2). Fecha.

**Requests e queries (o que o backend aceita × o que o frontend envia):**

| Request ou query | No backend | Enviados por `features/pessoas` | Ausentes |
| --- | --- | --- | --- |
| `AtualizarDadosFiscaisPessoaRequest` | 8 | 0 | 8 |
| `VincularMunicipioEnderecoPessoaRequest` | 1 | 0 | 1 |
| `BackfillMunicipiosEnderecosPessoaRequest` | 2 | 0 | 2 |
| Query de `GET /api/fiscal/cadastros/municipios` (`ufSigla`, `termo`, `codigoIbge`, `ativo`, `pagina`, `tamanhoPagina`) | 6 | 0 (o precedente de `administracao` envia os 6) | 6 |
| `AdicionarEnderecoPessoaRequest` (b73) | 9 | 9 | 0 |
| `AtualizarEnderecoPessoaRequest` (b73) | 9 | 9 | 0 |
| **Total** | **35** | **18** | **17** |

Fórmula: **35 = 18 + 17**. Fecha. Como medi: leitura pareada de `PessoaRequests.cs`, `EnderecoContatoRequests.cs` e `CadastrosFiscaisController.cs:63-76` contra `grep` no frontend (0 ocorrências de `municipioIbgeCodigo`
fora de um comentário em `pessoasSchemas.ts:92`; 0 de `dados-fiscais` fora de `features/produtos`; 0 de `backfill`).

**Rotas:** Pessoa: 19 no backend = **9 consumidas** + **10 ausentes** (dados-fiscais, bloquear, desbloquear, município, backfill, 5 de contato). Das 10, **3 são do recorte**. A busca de município (1) é consumida por `administracao`, 0 por `pessoas`.

**Permissões:** 4 citadas = 4 nas quatro fontes; `PESSOAS_DADOS_FISCAIS_GERENCIAR` com 0 consumidores.

**Códigos de erro:** 11 `Fiscal.Destinatario*`/`Fiscal.Contexto*Destinatario*` no C# (inclui `PessoaNaoEncontrada`); **7** trazem `pessoaId` no texto, **3** não o trazem, **1** vira 404 sem código; mapa D50 no frontend: **2 entradas, 0 destas 11**.

## Destino por item (resumo para a rodada)

| Item | Destino hoje |
| --- | --- |
| Os 8 campos de `AtualizarDadosFiscaisPessoaRequest` | ausentes |
| Os 11 campos de `PessoaResponse` ausentes do tipo | entregues em tempo de execução por `GET /api/pessoas`, sem tipo, sem uso |
| `PessoaResponse.id` | enviado (path do `PUT`, `inativar`, rotas de endereço) |
| `.tipoPessoa`, `.nomeRazaoSocial`, `.nomeFantasia`, `.documento`, `.status` | exibidos |
| `.inscricaoEstadual`, `.inscricaoMunicipal`, `.observacao` | exibidos e reenviados no `PUT` |
| `.empresaId`, `.filialId` | sem uso |
| `.createdAt` | lido pela UI e não entregue pelo backend |
| `EnderecoPessoaResponse.municipioIbgeId` | exibido como "vinculado/não vinculado"; lido pelo resolver (`:184`); escrito só por `PATCH …/municipio` e `backfill` (ausentes) |
| `VincularMunicipioEnderecoPessoaRequest.municipioIbgeCodigo`, `BackfillMunicipios…Request.empresaId/filialId` | ausentes |
| `MunicipioIbgeResponse` | `id`, `codigoIbge`, `nome`, `ufSigla` usados no precedente de `administracao`; `ufId`, `codigoSiafi`, `ativo`, `motivoInativacao` sem uso |
| Rotas `dados-fiscais`, município, backfill | 0 de 3 consumidas |
| `PESSOAS_CONSULTAR`, `PESSOAS_GERENCIAR` | existem nas 4 fontes; a lista e as abas as usam |
| `PESSOAS_DADOS_FISCAIS_GERENCIAR` | existe nas 4 fontes; 0 consumidores; fora de rota e de menu |
| `FISCAL_CADASTROS_CONSULTAR` | existe nas 4 fontes; consumida pelo precedente de município (`administracao`) |
| Códigos `Fiscal.Destinatario*` / `Contexto*` | 0 de 11 no mapa D50 |
| `FiscalErroCadastroLink.href` | string fixa (sem parâmetro de `pessoaId`) |

---

## Perguntas

**Resolvem-se lendo o código (respondidas acima):**

- Verbos, rotas, permissão, request, response e validadores das 3 rotas (§2, §3). Semântica de substituição do bloco (§3.2). O que o resolver exige (§0.2). De onde saem os códigos e se trazem `pessoaId` (§5). Se a lista de Pessoas devolve o bloco fiscal: **sim, 22 campos** (§1, §3.1).
- Filtros da busca de município e a ausência de filtro por Id (§3.3). O que o backfill faz e devolve (§3.3).

**Perguntas ao backend (`PQ-B-n`):**

- **PQ-B-1 (PF-9, B-38):** `ApiErrorResponse` poderia levar o `pessoaId` do destinatário como campo estruturado, e os 3 códigos sem `pessoaId` (`MunicipioIbgeNaoEncontrado`, `MunicipioUfDivergente`, `SemPessoaVinculada`) poderiam trazê-lo? `DestinatarioPessoaNaoEncontrada` precisa sair como 404 sem código? Decide se o link D50 depende de extrair id de texto.
- **PQ-B-2 (PF-1):** `PATCH /dados-fiscais` é substituição integral por decisão? O contrato Swagger o descreve como parcial (tudo opcional). Decide se a UI tem de reenviar os 8 campos a cada edição.
- **PQ-B-3 (PF-5):** município inativo em `dados-fiscais` deveria sair `FISCAL_CADASTROS_MUNICIPIO_INATIVO` como no endereço? E o validador deveria exigir 7 dígitos?
- **PQ-B-4 (PF-15, PF-16):** o `tamanhoPagina` máximo é 200 de propósito? O `termo` de `/cadastros/municipios` deveria normalizar acento como o backfill? Existirá filtro por Id? Decide como a tela resolve o `municipioIbgeId` do endereço em nome.
- **PQ-B-5 (PF-18):** o `SefazMockClient` devolve `MOCK<timestamp>` como chave; `NotaFiscal.Autorizar` exige 44 dígitos com DV. Existe teste ou tratamento que torne o Confirmar concluível com `UseMock=true`? Decide se há faturamento que conclua em dev.
- **PQ-B-6 (PF-19):** onde ficam os XSD de `./schemas/nfe/4.00` em dev? O Confirmar fixa `ValidarSchema=true`.
- **PQ-B-7 (PF-12):** o `PATCH` de município deveria recusar Pessoa inativa, como o `dados-fiscais`? E `Bloqueada`?
- **PQ-B-8 (PF-14):** o backfill terá modo de simulação? E `Motivo` terá código estável?
- **PQ-B-9:** `GET /api/pessoas/{id}` existirá? Hoje o diálogo parte da foto da lista, e o link por id (D50) abre uma Pessoa que a tela só acha pela lista.
- **PQ-B-10:** o texto de `ContextoDestinatarioContribuinteIpiNaoInformado` e `ContextoNaturezaTomadorServicoNaoInformada` ("Dados Fiscais > …") pode ser regenerado com os rótulos que o frontend adotar? (PF-8)

**Perguntas ao produto e à rodada (`PQ-P-n`):**

- **PQ-P-1:** quem **vincula o município** é o mesmo perfil que **cadastra o endereço**? Hoje são duas permissões (`PESSOAS_GERENCIAR` e `PESSOAS_DADOS_FISCAIS_GERENCIAR`), mais `FISCAL_CADASTROS_CONSULTAR` para a busca. Sem resposta, o faturamento depende de 3 concessões. (continuação de PF-4 do `15`)
- **PQ-P-2:** o backfill entra na `b75`? A D53 fala em "vínculo de município no endereço"; o backfill é a outra rota com a mesma permissão.
- **PQ-P-3:** o que o link de `DestinatarioSemEnderecoFiscal` e `…SemEnderecoPrincipal` (cujo destino, a aba "Endereços", já existe desde a `b73`) faz na `b75`? A D102 os adiou para esta fatia. Quais são "as quatro" da D53?
- **PQ-P-4:** `Bloqueada`/`MotivoBloqueio`, que o `PATCH /dados-fiscais` devolve, seguem fora (D53)?
- **PQ-P-5:** o banco dev tem município além das 27 capitais? Quantas pessoas, endereços, endereços com município, e quais grupos concedem `PESSOAS_DADOS_FISCAIS_GERENCIAR`? (não medido; Docker parado)
- **PQ-P-6:** o CHANGELOG da `b75` declara que o faturamento **ainda não conclui** por causa de emitente, natureza, configuração fiscal, XSD, certificado e chave do mock (§0.1), mesmo com o destinatário passando?

---

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "pessoa-fiscal",
  "slice": "v1.11.0a8b75",
  "status": "completed_with_warnings",
  "arquivo": "docs/arquitetura/debate/16-inventario-pessoa-fiscal.md",
  "arvoreMedida": "frontend HEAD da74da2 (v1.11.0a8b74), branch codex/v1.11.0a8b75-pessoa-fiscal, git status limpo fora de .codex/, .agents/ e .claude/settings.local.json; backend branch fix/v1.23.4-g3-st-e-difal-no-mesmo-item HEAD 6bb6fc4, arvore limpa (git status --short = 0 linhas), 14 commits a frente do 0387e44 usado no 15, todos fora de Pessoas/resolvers (git diff --stat 0387e44..6bb6fc4 -- src = 6 arquivos em Fiscal/Tributacao; 0 linhas nos caminhos de Pessoas, Documentos, FiscalErrors, Cadastros, Faturamento, Infrastructure/Fiscal e Pessoas); banco dev NAO verificado (daemon do Docker parado, nao iniciado por regra do CLAUDE.md)",
  "motivoWarnings": "Docker indisponivel: pessoas, enderecos, municipios e grupos do banco dev nao foram medidos hoje. Nenhuma chamada HTTP, gate ou teste executado: 'backend entrega' e leitura de C#. Leg 4 (SEFAZ) e legs 5-6 lidos so em parte; FiscalProdutoValidator, SefazSoapClient e ResolverPedidoParaFaturamentoFiscalAsync nao lidos. PF-18 (chave do mock) e PF-19 (XSD) sao leitura de codigo, nao execucao.",
  "contagemDeCampos": {
    "respostas": "58 entregues = 37 declarados com par + 21 nao declarados; 38 declarados = 25 com destino + 1 divergencia (createdAt) + 12 sem uso. PessoaResponse 22/12 (9+1+2, 11 nao declarados); EnderecoPessoaResponse 13/13 (11+0+2); Backfill 3/0; Divergencia 5/0; MunicipioIbgeResponse 8/8 (4+0+4); PagedResult envelope 7/5 (1+0+4, 2 nao declarados).",
    "requests": "35 no backend = 18 enviados (endereco 9+9, b73) + 17 ausentes (dados-fiscais 8, vincular municipio 1, backfill 2, query de municipios 6).",
    "rotas": "Pessoa: 19 no backend = 9 consumidas + 10 ausentes; 3 do recorte (dados-fiscais, municipio, backfill) mais a busca de municipio que so features/administracao consome.",
    "permissoes": "4 (PESSOAS_CONSULTAR, PESSOAS_GERENCIAR, PESSOAS_DADOS_FISCAIS_GERENCIAR, FISCAL_CADASTROS_CONSULTAR) nas 4 fontes; DADOS_FISCAIS com 0 consumidores e fora de rota e menu.",
    "codigosDeErro": "11 Fiscal.Destinatario*/Contexto*Destinatario* no C#; 7 trazem pessoaId so no texto, 3 nao o trazem, 1 vira 404 sem codigo; mapa D50 com 2 entradas, 0 destas 11."
  },
  "respostasAoBriefing": {
    "Q1_o_que_impede_o_faturamento_depois_da_b75": "Medido no C# (leitura, nao executado). O leg 1 deixa de falhar por DestinatarioSemMunicipioIbge. Ainda pode barrar o Confirmar, nesta ordem: natureza com CFOP mapeado (GerarNotaFiscalPedidoVendaUseCase.cs:141-232; 0 naturezas na medicao de 2026-09-30), emitente resolvido antes do destinatario (EmitenteFiscalResolver.cs:99-181; nao medido), configuracao fiscal e NCM/CFOP por item (FiscalConfiguracaoEmissaoResolver.cs:42-74), UseMock=true (NotaFiscalXmlBuilder.cs:47-52), validacao XSD fixa no Confirmar (ConfirmarFaturamentoUseCase.cs:163) com 0 arquivos .xsd no repositorio do backend, certificado (UI nao envia thumbprint, config dev vazia; SefazCertificateProvider.cs:17-49) e, pela leitura, a chave MOCK<timestamp> do SefazMockClient que NotaFiscal.Autorizar recusa (ChaveAcessoNfe.Parse exige 44 digitos com DV; NotaFiscal.cs:436). DestinatarioSemIndicadorContribuinteIcms e os dois Contexto* NAO estao no caminho do Confirmar: so Validar e Calcular tributos (ContextoTributarioDocumentoResolver.cs:100-219), e o frontend nao consome calcular-tributos.",
    "Q2_menor_recorte_para_o_DestinatarioFiscalResolver": "Uma escrita sobre um endereco principal ativo que ja exista (b73): o vinculo de municipio do endereco (EnderecoPessoa.MunicipioIbgeId), com UF do municipio igual a UF do endereco, municipio existente e ativo na tabela. Dois caminhos, ambos PESSOAS_DADOS_FISCAIS_GERENCIAR: PATCH .../enderecos/{id}/municipio (municipioIbgeCodigo de 7 digitos; PessoasController.cs:179-190) ou POST .../backfill-municipios (casa Cidade+UF em lote; :196-207). O resolver nao le nenhum campo do bloco fiscal da Pessoa e nao confere Bloqueada nem IsActive (DestinatarioFiscalResolver.cs:140-224). O bloco fiscal (PATCH dados-fiscais) so e exigido pelo Validar e Calcular: indicador sempre; ContribuinteIpi so se a empresa emitente e contribuinte do IPI; TomadorOrgaoPublico so se PJ com item de servico."
  },
  "medicoes": [
    { "o_que": "rotas de Pessoa no controller / consumidas pelo frontend", "valor": "19 / 9 (10 ausentes)", "como": "grep -n Http PessoasController.cs; leitura de pessoasApi.ts (4) e pessoaEnderecosApi.ts (5)" },
    { "o_que": "arquivos que consomem usePessoas", "valor": "19 em 11 pastas de feature", "como": "grep -rln \"usePessoas\\b\" features app components | awk -F/ '{print $1\"/\"$2}' | sort | uniq -c" },
    { "o_que": "arquivos que referenciam PessoaResponse", "valor": "16", "como": "grep -rln \"PessoaResponse\\b\" features app components lib types" },
    { "o_que": "ocorrencias de dados-fiscais fora de features/produtos no frontend", "valor": "0", "como": "grep -rn \"dados-fiscais\" features app lib components | grep -v ^features/produtos" },
    { "o_que": "ocorrencias de calcular-tributos no frontend", "valor": "0", "como": "grep -rn \"calcular-tributos\" features lib app scripts" },
    { "o_que": "consumidores de /cadastros/paises", "valor": "0", "como": "grep -rn \"cadastros/paises\" features lib app" },
    { "o_que": "arquivos .xsd no repositorio do backend", "valor": "0", "como": "find . -name \"*.xsd\" -not -path \"*/node_modules/*\"; src/Erp.Api/schemas nao existe" },
    { "o_que": "ocorrencias de AddJsonOptions/JsonStringEnumConverter em Erp.Api", "valor": "0 (enums numericos no JSON)", "como": "grep -rn \"JsonStringEnumConverter\\|AddJsonOptions\" --include=*.cs Erp.Api" },
    { "o_que": "municipios no CSV de seed do repositorio do backend (NAO e o banco)", "valor": "27 (28 linhas nao comentadas = 1 cabecalho + 27; 4 de comentario)", "como": "grep -vc '^#' e grep -c '^#' em data/fiscal/municipio-ibge.csv" },
    { "o_que": "tamanho maximo de pagina em /cadastros/municipios", "valor": "200 (frontend pede 1000)", "como": "CadastrosFiscaisFiltroFactory.cs:12-13,183-184; useEnderecoFiscalCatalogos.ts:110" },
    { "o_que": "entradas do mapa D50 no frontend", "valor": "2 (serie, CFOP); 0 dos 11 codigos Destinatario*/Contexto*", "como": "leitura de fiscalErrosCadastro.ts:29-44" },
    { "o_que": "linhas de codigo/teste/script que citam b74 para este conteudo", "valor": "8", "como": "grep -rn \"b74\" features lib types tests scripts app components | grep -v \"a8b74\\|a\\.8\\.b74\" (descontados os 3 de SimuladorTributacaoPage.test.tsx e tributacaoErrors.test.ts)" },
    { "o_que": "diferenca do backend desde o HEAD usado no 15", "valor": "6 arquivos, todos em Fiscal/Tributacao; 0 em Pessoas e resolvers", "como": "git diff --stat 0387e44..6bb6fc4 -- src (e restrito aos caminhos de Pessoas, Documentos, FiscalErrors, Cadastros, Faturamento, Infrastructure/Fiscal, Infrastructure/Pessoas)" },
    { "o_que": "pessoas, enderecos e municipios no banco dev", "valor": "NAO medido hoje", "como": "docker ps falhou: daemon do Docker Desktop parado; citadas so as medicoes de 2026-09-30 (CHANGELOG.md:135, 13-design-faturamento.md:51)" }
  ],
  "decisoesPropostas": [],
  "discordancias": [],
  "pendencias": [
    { "tipo": "backend", "pergunta": "PQ-B-1 (PF-9, B-38): ApiErrorResponse pode levar o pessoaId do destinatario em campo estruturado, e os 3 codigos sem pessoaId podem traze-lo?", "decide": "se o link D50 do destinatario depende de extrair id de texto" },
    { "tipo": "backend", "pergunta": "PQ-B-2 (PF-1): PATCH dados-fiscais e substituicao integral por decisao? O Swagger o descreve como parcial.", "decide": "se a UI tem de reenviar os 8 campos a cada edicao" },
    { "tipo": "backend", "pergunta": "PQ-B-3 (PF-5): municipio inativo em dados-fiscais deveria sair FISCAL_CADASTROS_MUNICIPIO_INATIVO e o validador exigir 7 digitos?", "decide": "mapa de mensagens por codigo da tela de bloco fiscal" },
    { "tipo": "backend", "pergunta": "PQ-B-4 (PF-15, PF-16): tamanhoPagina maximo 200 e intencional? termo de /cadastros/municipios normaliza acento? havera filtro por Id?", "decide": "como a tela resolve municipioIbgeId em nome e como busca" },
    { "tipo": "backend", "pergunta": "PQ-B-5 (PF-18): o SefazMockClient devolve MOCK<timestamp> como chave e NotaFiscal.Autorizar exige 44 digitos com DV; existe teste ou tratamento que torne o Confirmar concluivel com UseMock=true?", "decide": "se algum faturamento conclui em dev" },
    { "tipo": "backend", "pergunta": "PQ-B-6 (PF-19): onde ficam os XSD de ./schemas/nfe/4.00 em dev? O Confirmar fixa ValidarSchema=true.", "decide": "se o leg 2 passa em dev" },
    { "tipo": "backend", "pergunta": "PQ-B-7 (PF-12): o PATCH de municipio deveria recusar Pessoa inativa e bloqueada, como o dados-fiscais recusa a inativa?", "decide": "regra de habilitacao da acao de vinculo" },
    { "tipo": "backend", "pergunta": "PQ-B-8 (PF-14): o backfill tera simulacao e Motivo com codigo estavel?", "decide": "se a tela confirma antes de gravar e como rotula divergencias" },
    { "tipo": "backend", "pergunta": "PQ-B-9: GET /api/pessoas/{id} existira?", "decide": "link por id (D50) e record do dialogo sem foto da lista" },
    { "tipo": "backend", "pergunta": "PQ-B-10 (PF-8): os textos de ContextoDestinatarioContribuinteIpiNaoInformado e ContextoNaturezaTomadorServicoNaoInformada citam 'Dados Fiscais > ...'; podem ser alinhados ao rotulo que o frontend adotar?", "decide": "coerencia entre o texto do erro e a tela" },
    { "tipo": "funcional", "pergunta": "PQ-P-1: quem vincula o municipio e o mesmo perfil que cadastra o endereco? Sao 3 permissoes (PESSOAS_GERENCIAR, PESSOAS_DADOS_FISCAIS_GERENCIAR, FISCAL_CADASTROS_CONSULTAR).", "decide": "ordem de concessao no CHANGELOG da b75 e habilitacao das acoes" },
    { "tipo": "funcional", "pergunta": "PQ-P-2: o backfill entra na b75?", "decide": "escopo da fatia" },
    { "tipo": "funcional", "pergunta": "PQ-P-3: o que fazem na b75 os links de DestinatarioSemEnderecoFiscal e SemEnderecoPrincipal (destino ja existe desde a b73)? Quais sao as 'quatro DestinatarioSem*' da D53?", "decide": "fiscalErrosCadastro.ts e NotaFiscalErroCadastroPanel.test.tsx:44-49" },
    { "tipo": "funcional", "pergunta": "PQ-P-4: Bloqueada/MotivoBloqueio, devolvidos pelo PATCH, seguem fora (D53)?", "decide": "tipo de PessoaResponse na b75" },
    { "tipo": "ambiente", "pergunta": "PQ-P-5: o banco dev tem municipio alem das 27 capitais? Quantas pessoas, enderecos, enderecos com municipio, e quais grupos concedem PESSOAS_DADOS_FISCAIS_GERENCIAR? (Docker parado, nao medido)", "decide": "se o vinculo funciona fora das capitais e quem consegue executa-lo" },
    { "tipo": "funcional", "pergunta": "PQ-P-6: o CHANGELOG da b75 declara que o faturamento ainda nao conclui por emitente, natureza, configuracao fiscal, XSD, certificado e chave do mock?", "decide": "honestidade da entrega (D53)" }
  ],
  "riscos": [
    "PF-1: PATCH /dados-fiscais substitui o bloco inteiro; corpo parcial apaga os outros campos (PessoaDadosFiscaisResolver.cs:31-36; Pessoa.cs:118-126). O Swagger o descreve como parcial.",
    "PF-2: 'Contribuinte' exige IE ja gravada por outro endpoint (PUT, PESSOAS_GERENCIAR); o bloco fiscal exige outra permissao. O record do dialogo e foto da lista.",
    "PF-4: 11 campos fiscais chegam sem tipo em tempo de execucao e a busca local ja os varre; o dialogo nao relê enquanto aberto.",
    "PF-5: municipio inativo vira NAO_ENCONTRADO em dados-fiscais e INATIVO no endereco; validacao de forma diferente.",
    "PF-9: pessoaId so no texto de 7 de 11 codigos; 3 sem pessoaId; 1 vira 404 sem codigo; 'as quatro DestinatarioSem*' da D53 nao esta nomeada (o backend tem 5). Gerar NF e Confirmar nao tem a Pessoa na tela.",
    "PF-11: PESSOAS_DADOS_FISCAIS_GERENCIAR fora de rota e de menu; a pagina exige PESSOAS_CONSULTAR e a edicao PESSOAS_GERENCIAR. Fluxo com busca de municipio exige 3 permissoes.",
    "PF-12/PF-13: PATCH de municipio aceita Pessoa inativa; as 3 rotas da b75 tem guard organizacional (404 generico) e as 5 de endereco nao (EP-1 do 15, nao medido em execucao).",
    "PF-14: backfill em lote sem simulacao, casa por texto, inclui Pessoas inativas, devolve Motivo em texto.",
    "PF-15: o servidor limita tamanhoPagina a 200 e o precedente de municipio do frontend pede 1000; com a tabela completa o passo 2 do precedente nao acha municipios alem dos 200 primeiros da UF. Nao aparece com 27 capitais. Leitura, nao executado.",
    "PF-16: busca de municipio acento-sensivel, backfill acento-insensivel.",
    "PF-18: pela leitura, o mock da SEFAZ devolve chave que NotaFiscal.Autorizar recusa; o Confirmar nao conclui com UseMock=true. Nao executado; pode haver tratamento nao lido. Nao classificado.",
    "PF-19: o Confirmar fixa validacao de XSD e o repositorio do backend tem 0 arquivos .xsd; se nao houver provisionamento externo, o leg 2 falha. Nao verificado.",
    "Docker parado: pessoas, enderecos, municipios e grupos do banco dev nao medidos hoje; EP-18 (seed de 27 capitais) segue sem medicao no banco.",
    "Nenhum gate nem teste foi executado (validate:backend-contract-map, validate:guard-permission-map, validate:backend-permissions, vitest). Tudo e leitura de codigo, contratos e documentos.",
    "Leg 4 lido ate a interpretacao da resposta; legs 5-6, FiscalProdutoValidator, SefazSoapClient e ResolverPedidoParaFaturamentoFiscalAsync nao lidos; nao afirmo que passam."
  ]
}
```
