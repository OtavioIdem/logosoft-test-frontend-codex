# Inventário K3 — enums e coerência de CRT (AJ-06)

Data: 2026-10-14. Inventariante: `inventariante-contrato-tela`. Sem proposta de solução; quem decide é a rodada.

## Recorte e método

Pergunta: para cada enum que o AJ-06 cobre, o frontend tem exatamente os valores do backend, com rótulo,
presença nos selects e fallback "não mapeado"? A mensagem de coerência de CRT está mapeada para o campo de regime,
sem cálculo local?

Fontes, na ordem da hierarquia:

1. Código do backend (somente leitura), `C:\Users\Otavio Idem\Documents\New project 3\src` (abreviado `BE:`).
2. Contrato K3: `New project 3/docs/fatias/v1.24.1-k3-enums-e-codigos-de-fio.md` (§3 D1/D4, §8 revisão, §9 K3b) e plano
   `New project 3/docs/frontend/PLANO-FRONTEND-v1.24-p1-validacoes-fiscais.md` (AJ-06 linha 60; FE-0 linha 164).
3. Frontend, árvore de trabalho atual com as mudanças não commitadas (abreviado `FE:`).

Como foi medido:

- Valores de enum: leitura direta dos `.cs` e dos `.ts`, campo a campo (não amostrado).
- Backend entrega em número: `grep -rn JsonStringEnumConverter src` devolveu zero ocorrências. Resposta real de endpoint
  em execução: **não verificado** (não subi backend).
- Testes do recorte rodados: `npx vitest run tests/unit/administracaoPayload.test.ts tests/unit/naturezasOperacaoPayload.test.ts tests/unit/tributacaoPayload.test.ts`
  = 3 arquivos, 68 testes, todos verdes. Isso prova que os arquivos testados têm os valores/rótulos novos; não prova
  nada sobre telas sem teste.
- Não rodei `dotnet test`, nem os gates `validate:*`, nem E2E.

Enums que o K3 altera (K3 §3 D1) e que o AJ-06 cobre: `Crt` (+4), `FinalidadeNaturezaOperacao` (+5, +6),
`ModalidadeBaseCalculoIcmsSt` (+7), `RegimeTributario` (`LucroReal`, ver K3-6), `TipoEmissaoNfe.Scan` (sai da escolha).
Incluídos por vizinhança (o K3 não os altera, mas compartilham tela/DTO): `ModalidadeBaseCalculoIcms`, `TipoAmbienteFiscal`.

## 1. Telas e rotas que consomem os enums

| Rota | Arquivo de página | Componente da feature | Permissão exigida | Onde a permissão é registrada |
| --- | --- | --- | --- | --- |
| `/administracao/empresas` | `app/(main)/administracao/empresas/page.tsx` | `AdministracaoPage.tsx` + `AdministracaoFormDialog.tsx` (campos em `administracaoPageConfig.ts:80-81`) | `ADMINISTRACAO_CONSULTAR` ou `ADMINISTRACAO_GERENCIAR` (gravar: `ADMINISTRACAO_GERENCIAR`, `AdministracaoPage.tsx:268`) | `lib/security/routePermissions.ts:13` |
| `/fiscal/regras` | `app/(main)/fiscal/regras/page.tsx` | `RegrasFiscaisPage.tsx` + `RegraFiscalFormDialog.tsx` | `FISCAL_REGRAS_CONSULTAR` ou `FISCAL_REGRAS_GERENCIAR` | `routePermissions.ts:53` |
| `/fiscal/simulador` | `app/(main)/fiscal/simulador/page.tsx` | `SimuladorTributacaoPage.tsx` + `ResultadoTributacaoPanel.tsx` | `FISCAL_REGRAS_CONSULTAR` | `routePermissions.ts:52` |
| `/fiscal/naturezas-operacao` | `app/(main)/fiscal/naturezas-operacao/page.tsx` | `NaturezasOperacaoPage.tsx` + `NaturezaOperacaoDialogs.tsx` | `FISCAL_CADASTROS_CONSULTAR` ou `FISCAL_CADASTROS_GERENCIAR` | `routePermissions.ts:57` |
| `/fiscal/observabilidade` | `app/(main)/fiscal/observabilidade/page.tsx` | `ObservabilidadeFiscalPage.tsx` | `FISCAL_CONSULTAR` | `routePermissions.ts:50` |
| `/fiscal/notas/[id]` (painel de status do serviço) | `app/(main)/fiscal/notas/[id]/page.tsx` | `NotaFiscalDetalhePage.tsx` -> `FiscalOperationalPanels.tsx:62` | uma das permissões Fiscal | `routePermissions.ts:49` |
| `/pessoas` (aba fiscal no diálogo) | `app/(main)/pessoas/page.tsx` | `PessoaFormDialog.tsx:20` -> `PessoaFiscalTab.tsx` | `PESSOAS_CONSULTAR` ou `PESSOAS_GERENCIAR` | `routePermissions.ts:15` |

Existência das permissões no union/catálogo: **não verificado** (fora do recorte K3; AJ-06 não cria permissão).

## 2. Endpoints consumidos (só os que carregam os enums)

| Método + rota | Arquivo em `features/<mod>/api/` | Schema Zod | Documentado em | Confirmado no backend? |
| --- | --- | --- | --- | --- |
| `GET /api/administracao/empresas` | `administracaoApi.ts:100` | tipo `EmpresaResponse` (`administracao.types.ts:53-56`), sem Zod de resposta | plano AJ-06 | sim, `BE:Erp.Api/Controllers/Administration/EmpresasController.cs:11` (rota); campos em `BE:EmpresaResponse.cs:17-18` |
| `POST /api/administracao/empresas` | `administracaoApi.ts:107` | `criarEmpresaSchema` (`administracaoSchemas.ts:26`) | idem | sim, `EmpresasController.cs:30` |
| `PUT /api/administracao/empresas/{id}` | `administracaoApi.ts:114` | `atualizarEmpresaSchema` (`administracaoSchemas.ts:31`) | idem | sim, `EmpresasController.cs:43` |
| `POST /api/fiscal/tributacao/simular` | `tributacaoApi.ts:121` | `simularTributacaoSchema` (`tributacaoSchemas.ts:116-131`) | idem | sim, `BE:TributacaoSimulacaoController.cs:27,38` |
| `GET/POST /api/fiscal/regras` (+ `PUT`, não listado aqui) | `tributacaoApi.ts:127,140` | `tributacaoSchemas.ts:169,173,248` | idem | sim, DTOs em `BE:RegraFiscalOperacaoContracts.cs:12,16,83,110,131,135,197` |
| `GET/POST/PUT /api/fiscal/naturezas-operacao` | `naturezasOperacaoApi.ts:18` | `naturezasOperacaoSchemas.ts:40,105,121,150,180` | idem | sim, `BE:NaturezaOperacaoContracts.cs:24,40,61`; filtro `NaturezasOperacaoController.cs:49` |
| consulta de status do serviço SEFAZ / contingência | `fiscalApi.ts` (não relido neste recorte) | tipos `fiscal.types.ts:468-473` e `:498-503` | idem | sim para o campo: `BE:NotaFiscalResponse.cs:284,300` |
| `PUT /api/administracao/pessoas/...` aba fiscal | `features/pessoas` (não relido) | `pessoasSchemas.ts:222` | idem | sim para o campo: `BE:PessoaRequests.cs:41`, `PessoaResponse.cs:21` |

Fora da allowlist: `scripts/backend-contract-map.allowlist.json` tem `"suppressions": []` e `status: audit-only-no-suppressions`.
O AJ-06 não adiciona nem remove endpoint. Gate `validate:backend-contract-map` **não rodado**.

## 3. Valores: enum x valor backend x valor frontend x rótulo x select x fallback

Convenção: `BE:` = linha do `.cs` em `New project 3/src/Erp.Domain/...`. FE enum = declaração TypeScript. "Rótulo" = onde o valor
ganha texto. "Select" = onde aparece como opção. "Fallback" = o que a UI mostra para valor fora da lista.

### 3.1 `Crt` (K3 D1: +4)

Backend `Administration/Crt.cs:5-10`. Frontend tem **duas** declarações (`administracao.types.ts:21-26`, `tributacao.types.ts:28-33`).

| Valor backend (nome = número) | FE enum administração | FE enum tributação | Rótulo administração (`administracaoLabels.ts`) | Select administração | Rótulo/select tributação (`tributacaoUiUtils.ts`) |
| --- | --- | --- | --- | --- | --- |
| `SimplesNacional` = 1 (`Crt.cs:5`) | `:22` = 1 | `:29` = 1 | `:23` "Simples Nacional" | `:33` | `:41` "1 — Simples Nacional" |
| `SimplesNacionalExcessoSublimite` = 2 (`:6`) | `:23` = 2 | `:30` = 2 | `:24` "Simples Nacional — excesso de sublimite" | `:34` | `:42` |
| `RegimeNormal` = 3 (`:7`) | `:24` = 3 | `:31` = 3 | `:25` "Regime normal" | `:35` | `:43` |
| `MicroempreendedorIndividual` = 4 (`:10`) | `:25` = 4 | `:32` = 4 | `:26` "Microempreendedor Individual (MEI)" | `:36` | `:44` "4 — Microempreendedor Individual (MEI)" |

Conta: backend 4; FE administração 4 enum + 4 rótulos + 4 opções (+1 sentinela `''` "Não informado", `administracaoLabels.ts:32`, que é
ausência de valor e não valor do enum); FE tributação 4 enum + 4 opções, 0 função de rótulo. Faltando: 0. Sobrando: 0.

Fallback para valor desconhecido:

| Consumidor | Fallback "não mapeado" |
| --- | --- |
| `crtLabel` (`administracaoLabels.ts:28`) | presente: `Não mapeado (N)`; **sem consumidor de produção** (só `tests/unit/administracaoPayload.test.ts:74-75`) |
| select de CRT da Empresa (`AdministracaoFormDialog.tsx:153` via `selectOptionsWithCurrentValue` `:43-49`) | presente: acrescenta opção `Não mapeado (N)` |
| select "CRT do emitente" do simulador (`SimuladorTributacaoPage.tsx:235-243`) | **ausente** (K3-2) |
| `crtEmitente` no resultado do simulador (`tributacao.types.ts:211`) | n/a: o campo não é exibido (`ResultadoTributacaoPanel.tsx:109` lê só `campoXmlCodigoSituacao` e `codigoSituacao`) |

### 3.2 `FinalidadeNaturezaOperacao` (K3 D1: +5, +6)

Backend `Fiscal/Cadastros/EnumsCadastrosFiscais.cs:36-48`. Frontend tem **três** fontes: enum `tributacao.types.ts:57-64`,
`FINALIDADE_NATUREZA_OPTIONS` (números literais, `naturezasOperacaoLabels.ts:38-45`), `finalidadeOptions` (`tributacaoUiUtils.ts:53-60`).

| Valor backend | FE enum tributação | `FINALIDADE_NATUREZA_OPTIONS` (rótulo + select de Natureza) | `finalidadeOptions` (select do simulador) |
| --- | --- | --- | --- |
| `Normal` = 1 (`:38`) | `:58` = 1 | `:39` "Normal" = 1 | `:54` |
| `Complementar` = 2 (`:39`) | `:59` = 2 | `:40` = 2 | `:55` |
| `Ajuste` = 3 (`:40`) | `:60` = 3 | `:41` = 3 | `:56` |
| `Devolucao` = 4 (`:41`) | `:61` = 4 | `:42` = 4 | `:57` |
| `NotaDeCredito` = 5 (`:44`) | `:62` = 5 | `:43` "Nota de crédito" = 5 | `:58` "Nota de crédito" |
| `NotaDeDebito` = 6 (`:47`) | `:63` = 6 | `:44` "Nota de débito" = 6 | `:59` "Nota de débito" |

Conta: backend 6; FE enum 6; `FINALIDADE_NATUREZA_OPTIONS` 6; `finalidadeOptions` 6. Faltando: 0. Sobrando: 0.

Fallback: `finalidadeNaturezaLabel` (`naturezasOperacaoLabels.ts:84`, fallback `:79` `Não mapeado (N)`), consumida na coluna
`NaturezasOperacaoPage.tsx:208` -> presente. Select de Natureza (`NaturezaOperacaoDialogs.tsx:187-193`, usado em `:306`) -> presente.
Select do simulador (`SimuladorTributacaoPage.tsx:265`) -> **ausente** (K3-2).
Schema de request da Natureza (`naturezasOperacaoSchemas.ts:40`) aceita só os valores da lista (1..6): registro com valor
desconhecido mostra "Não mapeado (N)" no select, mas exige reselecionar para gravar (mensagem `Selecione a finalidade.`).

### 3.3 `ModalidadeBaseCalculoIcmsSt` (K3 D1: +7)

Backend `Fiscal/Tributacao/EnumsRegraFiscal.cs:22-36`. Frontend: enum `tributacao.types.ts:80-88`, opções `tributacaoUiUtils.ts:186-194`.

| Valor backend | FE enum | Rótulo e select (`tributacaoUiUtils.ts`) |
| --- | --- | --- |
| `MargemValorAgregado` = 1 (`:24`) | `:81` = 1 | `:187` "Margem de valor agregado" |
| `Pauta` = 2 (`:25`) | `:82` = 2 | `:188` |
| `PrecoTabelado` = 3 (`:26`) | `:83` = 3 | `:189` |
| `ListaNegativa` = 4 (`:27`) | `:84` = 4 | `:190` |
| `ListaPositiva` = 5 (`:28`) | `:85` = 5 | `:191` |
| `ListaNeutra` = 6 (`:29`) | `:86` = 6 | `:192` |
| `ValorOperacao` = **7** (`:36`; número de domínio, não o do fio) | `:87` = 7 | `:193` "Valor da operação" |

Conta: backend 7; FE enum 7; opções 7. Faltando: 0. Sobrando: 0. O frontend usa 7 e o backend usa 7 (ver K3-5 sobre o plano que diz 6 em FE-0).
Não existe função de rótulo para este enum (só o select). Select em `RegraFiscalFormDialog.tsx:419`, valor padrão `:82`. Fallback: **ausente** (K3-2).

### 3.4 `ModalidadeBaseCalculoIcms` (K3 não altera; conferido por vizinhança)

Backend `EnumsRegraFiscal.cs:9-15` (valores `:11-14`): 1, 2, 3, 4. FE enum `tributacao.types.ts:73-78` (`:74-77`): 1, 2, 3, 4.
Opções `tributacaoUiUtils.ts:179-184` (`:180-183`). Conta 4 = 4 = 4. Select em `RegraFiscalFormDialog.tsx:377`. Fallback **ausente** (K3-2).

### 3.5 `RegimeTributario` (K3: sem número explícito; `LucroReal` já existe, ver K3-6)

Backend `Administration/RegimeTributario.cs:5-7`: `SimplesNacional`, `LucroPresumido`, `LucroReal`, sem números, logo 0, 1, 2 no JSON.
Frontend tem **três** cópias: enum `administracao.types.ts:9-13`, enum `tributacao.types.ts:22-26`, literais em `pessoaFiscalLabels.ts:71-75`.

| Valor backend | FE enum administração | FE enum tributação | Rótulo/select administração | Rótulo/select tributação | Opções pessoa (`pessoaFiscalLabels.ts`) |
| --- | --- | --- | --- | --- | --- |
| `SimplesNacional` = 0 | `:10` = 0 | `:23` = 0 | `administracaoLabels.ts:5` / `:13` | `tributacaoUiUtils.ts:35` | `:72` = 0 |
| `LucroPresumido` = 1 | `:11` = 1 | `:24` = 1 | `:6` / `:14` | `:36` | `:73` = 1 |
| `LucroReal` = 2 | `:12` = 2 | `:25` = 2 | `:7` / `:15` | `:37` | `:74` = 2 |

Conta: backend 3; três cópias de 3. Faltando: 0. Sobrando: 0.

Fallback: `regimeTributarioLabel` administração (`administracaoLabels.ts:9`) presente, **sem consumidor de produção**;
`regimeTributarioLabel` tributação (`tributacaoUiUtils.ts:231`, fallback `:227`) presente, **zero consumidores** (nem testes);
`regimeTributarioParceiroLabel` (`pessoaFiscalLabels.ts:77-80`) fallback é `Valor N`, não "não mapeado", e **zero consumidores** (K3-3).
Select da Empresa (`AdministracaoFormDialog.tsx:153`) presente. Selects de regime em `RegraFiscalFormDialog.tsx:321-326`,
`SimuladorTributacaoPage.tsx:233` e `PessoaFiscalTab.tsx:213-221`: **ausente** (K3-2).

### 3.6 `TipoEmissaoNfe` (K3: `Scan` sai da escolha)

Backend `Fiscal/EnumsFiscal.cs:113-123`: 1 Normal, 2 ContingenciaFsIa, 3 Scan, 4 Epec, 5 ContingenciaFsDa, 6 SvcAn, 7 SvcRs, 9 OfflineNfce (8 valores).
Superfície de API: nenhum record em `Erp.Application` ou `Erp.Api` expõe `TipoEmissaoNfe` (`grep -rnw TipoEmissaoNfe Erp.Application Erp.Api`: só
`ValidarNotaFiscalUseCase.cs:227`, leitura interna). Frontend: `grep -rniE "tipoEmissao|tpEmis"` em `features app lib types components tests scripts` = zero.
Conta: backend 8 (7 mapeáveis + `Scan`); frontend 0 enum, 0 rótulo, 0 select, 0 DTO. Não há escolha da qual `Scan` sair: a exigência do AJ-06 é
satisfeita por ausência de superfície, não por filtro.

### 3.7 `TipoAmbienteFiscal` (K3 não altera valores; AJ-06 e FE-0 exigem exibir por rótulo)

Backend `EnumsFiscal.cs:130-134`: `Homologacao` = 1 (`:132`), `Producao` = 2 (`:133`), invertido em relação ao `tpAmb` do fio, e a API serializa o número de domínio.
Frontend: `ambienteFiscalLabel` (`fiscalLabels.ts:37-45`): 1 = Homologação, 2 = Produção, fallback `Não mapeado (N)` (`:44`), `null` = "Não informado".
Conta 2 = 2, sem enum TS e sem select. Consumidores: `FiscalOperationalPanels.tsx:72` (status do serviço), `ObservabilidadeFiscalPage.tsx:91`.
`ContingenciaFiscalResponse.ambiente` (`fiscal.types.ts:502`, backend `NotaFiscalResponse.cs:300`) é lido pelo tipo e não exibido: destino `sem uso` (K3-10).

### 3.8 Resumo da conta

| Enum | Backend | FE enum(s) | FE rótulos | FE opções de select | Faltando | Sobrando |
| --- | --- | --- | --- | --- | --- | --- |
| `Crt` | 4 | 4 + 4 | 4 (admin) | 4 (admin, +sentinela) + 4 (trib) | 0 | 0 |
| `FinalidadeNaturezaOperacao` | 6 | 6 | 6 (via opções) | 6 + 6 | 0 | 0 |
| `ModalidadeBaseCalculoIcmsSt` | 7 | 7 | 0 | 7 | 0 | 0 |
| `ModalidadeBaseCalculoIcms` | 4 | 4 | 0 | 4 | 0 | 0 |
| `RegimeTributario` | 3 | 3 + 3 (+3 literais em pessoas) | 3 (admin) | 3 + 3 + 3 | 0 | 0 |
| `TipoAmbienteFiscal` | 2 | 0 | 2 | 0 | 0 | 0 |
| `TipoEmissaoNfe` | 8 | 0 | 0 | 0 | n/a (sem superfície) | 0 |

Total de valores de backend nos sete enums: 34. Valores faltando no frontend: 0. Valores sobrando no frontend: 0. A paridade de **valores** fecha.
O que não fecha é o fallback (K3-2, K3-3) e o mapeamento da mensagem de coerência (K3-1).

## 4. Consumidores (tela / DTO / select) de cada enum

Campo = campo do DTO. Destino = `exibido`, `enviado`, `derivado de <campo>` ou `sem uso`.

| Enum | Campo (lado) | Tipo no frontend | Origem backend | O backend entrega? | Destino |
| --- | --- | --- | --- | --- | --- |
| `Crt` | `EmpresaResponse.crt` | `Crt \| null` opcional (`administracao.types.ts:55`) | `BE:EmpresaResponse.cs:18` (`Crt?`) | sim (código lido; resposta real não verificada) | exibido (valor inicial do select, `AdministracaoFormDialog.tsx:153`); a lista de Empresas não tem coluna de CRT (`administracaoPageConfig.ts:67-72`) |
| `Crt` | `CriarEmpresaRequest.crt` | `Crt \| null` (`administracao.types.ts:64`) | `BE:EmpresaRequests.cs:12` | sim | enviado |
| `Crt` | `AtualizarEmpresaRequest.crt` | idem (`:65`) | `BE:EmpresaRequests.cs:33` | sim | enviado (`''` vira `null`, que no backend significa "mantém") |
| `Crt` | `AtualizarEmpresaRequest.limparCrt` | **não existe no tipo** | `BE:EmpresaRequests.cs:49` (`bool LimparCrt = false`) | sim | sem uso no frontend (K3-7) |
| `Crt` | `DocumentoTributavelRequest.crtEmitente` | `Crt \| number \| null` (`tributacao.types.ts:182`) | `BE:ICalculadoraTributacaoDocumento.cs:39` | sim | enviado (`SimuladorTributacaoPage.tsx:144`) |
| `Crt` | `ResultadoIcms.situacao.crtEmitente` | `Crt \| number \| null` (`tributacao.types.ts:211`) | `BE:SituacaoTributariaIcms.cs:57` (domínio serializado, `ResultadoIcms.cs:21`) | sim | sem uso (K3-4) |
| `RegimeTributario` | `EmpresaResponse.regimeTributario` | `RegimeTributario` (`administracao.types.ts:54`) | `BE:EmpresaResponse.cs:17` | sim | exibido (select) |
| `RegimeTributario` | `Criar/AtualizarEmpresaRequest.regimeTributario` | `administracao.types.ts:64-65` | `EmpresaRequests.cs:11,20` | sim | enviado |
| `RegimeTributario` | `DocumentoTributavelRequest.regimeEmpresa` | `tributacao.types.ts:181` | `ICalculadoraTributacaoDocumento.cs:37` | sim | enviado (padrão `LucroReal`, `SimuladorTributacaoPage.tsx:57`) |
| `RegimeTributario` | `ResultadoIcms.situacao.regime` | `tributacao.types.ts:210` | `SituacaoTributariaIcms.cs:54` | sim | sem uso (K3-4) |
| `RegimeTributario` | `Criar/AtualizarRegraFiscal.regimeEmpresa` e `RegraFiscalOperacaoResponse.regimeEmpresa` | `tributacao.types.ts:473,511` | `RegraFiscalOperacaoContracts.cs:83,110,197` | sim | enviado (`RegraFiscalFormDialog.tsx:234`) e exibido no select (`:139`, `:322`) |
| `RegimeTributario` | `regimeTributarioParceiro` (pessoa) | `number \| null` (`pessoas.types.ts:34,79,93`) | `BE:PessoaRequests.cs:41`, `PessoaResponse.cs:21` | sim | exibido e enviado (`PessoaFiscalTab.tsx:213-221`, `pessoaFiscalForm.ts:28,49`) |
| `FinalidadeNaturezaOperacao` | `Criar/AtualizarNaturezaOperacao.finalidade` | `number` (`naturezasOperacao.types.ts:58,76`) | `BE:NaturezaOperacaoContracts.cs:24,40` | sim | enviado |
| `FinalidadeNaturezaOperacao` | `NaturezaOperacaoResponse.finalidade` | `number` (`naturezasOperacao.types.ts:30`) | `BE:NaturezaOperacaoContracts.cs:61` | sim | exibido (coluna `NaturezasOperacaoPage.tsx:208`; select do diálogo) |
| `FinalidadeNaturezaOperacao` | `NaturezaOperacaoListQuery.finalidade` | `number \| null` (`naturezasOperacao.types.ts:101`) | `BE:NaturezasOperacaoController.cs:49` | sim | sem uso (não há controle de filtro de finalidade na página; só o campo no schema `naturezasOperacaoSchemas.ts:150`) |
| `FinalidadeNaturezaOperacao` | `DocumentoTributavelRequest.finalidade` | `tributacao.types.ts:196` | `ICalculadoraTributacaoDocumento.cs:67` | sim | enviado (padrão `Normal`, `SimuladorTributacaoPage.tsx:68`) |
| `ModalidadeBaseCalculoIcmsSt` | `RegraIcmsRequest.modalidadeBaseCalculoSt` | `tributacao.types.ts:408` | `RegraFiscalOperacaoContracts.cs:16` | sim | enviado (padrão `MargemValorAgregado`, `RegraFiscalFormDialog.tsx:82`) |
| `ModalidadeBaseCalculoIcmsSt` | resposta da regra (`regra.icms`) | mesmo tipo, hidratado em `fromResponse` (`RegraFiscalFormDialog.tsx:148`) | `RegraFiscalOperacaoContracts.cs:135` | sim | exibido (select do diálogo de edição) |
| `ModalidadeBaseCalculoIcms` | `RegraIcmsRequest.modalidadeBaseCalculo` e resposta | `tributacao.types.ts:404` | `RegraFiscalOperacaoContracts.cs:12,131` | sim | enviado e exibido no diálogo (padrão `ValorOperacao`, `:78`) |
| `TipoAmbienteFiscal` | `StatusServicoSefazResponse.ambiente` | `number` (`fiscal.types.ts:472`) | `BE:NotaFiscalResponse.cs:284` | sim | exibido (`FiscalOperationalPanels.tsx:72`, `ObservabilidadeFiscalPage.tsx:91`) |
| `TipoAmbienteFiscal` | `ContingenciaFiscalResponse.ambiente` | `number` (`fiscal.types.ts:502`) | `NotaFiscalResponse.cs:300` | sim | sem uso (K3-10) |
| `TipoEmissaoNfe` | (nenhum) | (nenhum) | não exposto em DTO | n/a | n/a |

Contagem de campos: 22 linhas de consumo. Destino: exibido 5, enviado 8, combinado exibido+enviado 3 (`regimeEmpresa` da regra, `regimeTributarioParceiro`, modalidade ICMS), sem uso 5 (`limparCrt`, `crtEmitente` e `regime` do resultado do simulador, `finalidade` da query de Natureza, `ambiente` da contingência), n/a 1 (`TipoEmissaoNfe`). 5+8+3+5+1 = 22. Nenhum campo ficou sem destino declarado.

Pontos de leitura de enum vindo do backend (selects e rótulos) e fallback, 13 pontos:

| Ponto de leitura | Arquivo:linha | Fallback "não mapeado" |
| --- | --- | --- |
| select Regime da Empresa | `AdministracaoFormDialog.tsx:153` | presente |
| select CRT da Empresa | `AdministracaoFormDialog.tsx:153` | presente |
| select Finalidade da Natureza | `NaturezaOperacaoDialogs.tsx:306` (opções `:187-193`) | presente |
| coluna Finalidade da Natureza | `NaturezasOperacaoPage.tsx:208` | presente |
| Ambiente (status do serviço) | `FiscalOperationalPanels.tsx:72` | presente |
| Ambiente (observabilidade) | `ObservabilidadeFiscalPage.tsx:91` | presente |
| select Regime da Regra | `RegraFiscalFormDialog.tsx:321-326` | ausente |
| select Modalidade ICMS da Regra | `RegraFiscalFormDialog.tsx:377` | ausente |
| select Modalidade ICMS-ST da Regra | `RegraFiscalFormDialog.tsx:419` | ausente |
| select Regime / CRT / Finalidade do Simulador | `SimuladorTributacaoPage.tsx:233, 238, 265` | ausente (3 selects) |
| select Regime do parceiro (Pessoa) | `PessoaFiscalTab.tsx:213-221` | ausente |

Presente: 6 (select Regime, select CRT, select Finalidade, coluna Finalidade, 2 Ambientes). Ausente: 7 selects (regra x3, simulador x3, pessoa x1). Total 13.

## 5. Coerência de CRT (INV-NFE-010): mensagem do backend e mapeamento na tela

### 5.1 O que o backend faz (código)

| Item | Evidência |
| --- | --- |
| Regra | `Empresa.ValidarCoerencia(RegimeTributario, Crt?)`, `BE:Erp.Domain/Administration/Empresa.cs:153-170`. CRT nulo não valida. CRT 1, 2 ou 4 exigem `SimplesNacional`; CRT 3 exige `LucroPresumido` ou `LucroReal` |
| Chamada na criação | construtor `Empresa.cs:15`, via `CriarEmpresaAdministracaoUseCase.cs:49` |
| Chamada na edição | `AtualizarEmpresaAdministracaoUseCase.cs:67`, **antes** de qualquer mutação, com `crtResultante` (CRT omitido mantém o gravado, `:60`); depois `Empresa.cs:76` (`AtualizarDadosFiscais`) |
| Falha | `DomainException` capturada (`AtualizarEmpresaAdministracaoUseCase.cs:72`; na criação `CriarEmpresaAdministracaoUseCase.cs:53`) e convertida em `AdministrationErrors.Validacao(ex.Message)` (`AdministrationErrors.cs:17`) |
| Código de erro | **`ADMINISTRACAO_VALIDACAO`**, o mesmo código genérico de toda validação do módulo administrativo (por exemplo `CriarEmpresaAdministracaoUseCase.cs:43` com a mensagem do FluentValidation). Não existe código próprio de coerência |
| Mensagem | `Empresa.cs:167`: `Regime tributário '{regime}' é incoerente com o CRT '{crt}': CRT Simples Nacional (1, 2 e 4) exige o regime SimplesNacional; CRT Regime Normal (3) exige LucroPresumido ou LucroReal.` Os valores entram **por nome** do enum em inglês de código (por exemplo `LucroPresumido`, `SimplesNacional`) |
| Campo | **o backend não informa campo.** O corpo é `ApiErrorResponse(Code, Message, UserMessage, Operation, TraceId, Errors = null)` (`BE:Erp.Api/Responses/ApiErrorResponse.cs:3-9`); `Errors` vem nulo neste caminho, pois o filtro (`ApiErrorResponseFilter.cs:54`) chama `From` sem `errors` |
| HTTP | 400 (`BadRequest(result.Error)`, `EmpresasController.cs:37,50`), `ErrorKind.Validation` não é reclassificado (`ApiErrorResponseFilter.cs:80-91` (`ClassificarResposta`)) |
| Empresa já gravada incoerente | recebe o 400 em qualquer edição, mesmo mexendo só na razão social (comentário `AtualizarEmpresaAdministracaoUseCase.cs:63-66`), como o AJ-06 descreve |

Há também `IsInEnum` para `RegimeTributario` e `Crt` nos validators (`EmpresaValidators.cs:19-20,32-33`), que passam a aceitar o 4.
Esses erros também saem com `ADMINISTRACAO_VALIDACAO`, sem campo (primeira mensagem do FluentValidation, `CriarEmpresaAdministracaoUseCase.cs:43`).

### 5.2 O que o frontend faz

| Pergunta | Resposta | Evidência |
| --- | --- | --- |
| Existe cálculo local de coerência regime x CRT? | **não** | `administracaoSchemas.ts`: `regimeTributarioSchema` (`:17`) e `crtSchema` (`:22-24`) são independentes; `grep -n "refine\|superRefine"` só acha `:13,14` (GUID). Nenhum `refine` cruzando os dois campos. Nenhuma ocorrência de `incoerente`/`coerên` em `features lib components types` |
| O código `ADMINISTRACAO_VALIDACAO` é mapeado? | **não** | `grep -rn ADMINISTRACAO_VALIDACAO features lib` = zero |
| A mensagem aparece junto do campo de regime? | **não** | `AdministracaoPage.tsx:168-193`: `runWithToast(..., { error: { summary: 'Erro ao salvar', ... }, rethrow: true })`; `useMutationWithToast.ts` exibe `error.message` em toast e relança. `AdministracaoFormDialog` não tem prop de erro de servidor (`:21-37`); `FieldError` só recebe erro de Zod (`:182`, `fieldErrorMap :75`) |
| O erro some em erro genérico? | não: o texto do backend chega ao toast (`AdministracaoApiError` herda `apiError.message`, `administracaoApi.ts:44-60`; `apiError.ts:100-107` lê `message`) | o diálogo permanece aberto (`rethrow: true`). Mas é toast, não campo |
| Como a UI evita recusa antecipada? | não evita; o helper do campo CRT diz "editar outro campo não altera o CRT já gravado" (`administracaoPageConfig.ts:81`), o que é verdadeiro para o CRT e não evita o 400 | n/a |

Conclusão do ponto: a metade "sem cálculo local" está cumprida; a metade "mapeada para o campo de regime" **não** (K3-1).
Para mapear hoje só há duas vias no código atual: casar o código genérico `ADMINISTRACAO_VALIDACAO` (que também sai de outras validações do módulo) ou casar o texto da mensagem. Isto é um fato do contrato, não uma recomendação.

## 6. Estados de tela (somente o que este recorte tocou)

| Tela | loading | vazio | erro recuperável | erro bloqueante | sucesso | permissão negada | ação indisponível com motivo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Empresas, gravar com incoerência regime x CRT | não verificado | não verificado | presente em forma de toast com a mensagem do backend (`AdministracaoPage.tsx:193`); **ausente** junto ao campo | não verificado | presente (toast `:193`) | presente (`UnauthorizedState`, `AdministracaoPage.tsx:123-125`; botão `PermissionGuard mode="disable"` `:220`) | não verificado |
| Regras, Simulador, Naturezas, Observabilidade, Pessoa (aba fiscal) | não verificado | não verificado | não verificado | não verificado | não verificado | não verificado | não verificado |

Os estados completos dessas telas ficam fora do recorte K3; não os deduzi pelo nome dos componentes.

## 7. Divergências

Severidade é minha classificação de impacto no AJ-06; não é decisão. IDs K3-n.

| ID | Tipo | Achado | Evidência | Impacto no AJ-06 |
| --- | --- | --- | --- | --- |
| **K3-1** | Mensagem de contrato sem mapeamento / Campo que o backend não entrega | A mensagem de coerência CRT x regime do backend sai com código genérico `ADMINISTRACAO_VALIDACAO`, sem campo (`Errors = null`). O frontend não mapeia esse código nem a mensagem; o texto aparece só em toast. O AJ-06 manda mostrar a mensagem "junto do campo de regime" | `BE:Empresa.cs:167`, `AdministrationErrors.cs:17`, `ApiErrorResponse.cs:3-9`, `ApiErrorResponseFilter.cs:54`; `FE:AdministracaoPage.tsx:193`, `useMutationWithToast.ts`, `AdministracaoFormDialog.tsx:21-37,182`; grep `ADMINISTRACAO_VALIDACAO` em `features lib` = zero | **alto**: critério do AJ-06 não cumprido; além disso o backend não entrega a chave (código/campo) que permitiria mapear sem ler texto. Pendência de contrato: o backend vai emitir código próprio e/ou campo? |
| **K3-2** | Enum fixo no frontend sem tratamento de valor desconhecido | 7 selects de enum não têm opção "não mapeado": `RegraFiscalFormDialog.tsx:321-326` (regime), `:377` (modalidade ICMS), `:419` (modalidade ICMS-ST); `SimuladorTributacaoPage.tsx:233` (regime), `:238` (CRT), `:265` (finalidade); `PessoaFiscalTab.tsx:213-221` (regime do parceiro). Só `AdministracaoFormDialog.tsx:43-49,153` e `NaturezaOperacaoDialogs.tsx:187-193` têm. Valor fora da lista fica sem opção correspondente (comportamento visual do PrimeReact para valor sem opção: não medido em execução) | arquivos citados; schemas de request rejeitam valor fora do enum (`tributacaoSchemas.ts:79-81,169,173`; `pessoasSchemas.ts:197-200,222`) | médio: AJ-06 diz "valor desconhecido como não mapeado, nunca como vazio". Hoje vale para 3 dos 10 selects de enum (Regime e CRT da Empresa, Finalidade da Natureza) |
| **K3-3** | Fallback fora do padrão | `regimeTributarioParceiroLabel` devolve `Valor N` (`pessoaFiscalLabels.ts:80`), não "Não mapeado". Também `indicadorContribuinteIcmsLabel` (`:33`) e `indicadorIeDestinatarioLabel` (`:63`) usam `Valor N` (enums fora do K3, só registro). A função de regime do parceiro tem zero consumidores | `grep -rn regimeTributarioParceiroLabel` = só a definição | baixo |
| **K3-4** | Campo lido pelo tipo e ignorado pela UI | `ResultadoIcms.situacao.crtEmitente`, `.regime`, `.tipo`, `.usaCsosn`, `.origem` existem no tipo; a UI exibe só `campoXmlCodigoSituacao` e `codigoSituacao` | `FE:tributacao.types.ts:206-215`; `ResultadoTributacaoPanel.tsx:109` | baixo: um CRT 4 desconhecido nunca chega a ser rotulado ali |
| **K3-5** | Plano diverge do código | AJ-06 diz `ModalidadeBaseCalculoIcmsSt` **7**; FE-0 (`PLANO...p1:164`) diz que `modBCST` ganha **6**. O código do backend usa 7 (`EnumsRegraFiscal.cs:36`, 6 já é `ListaNeutra`, `:29`) e o frontend usa 7 (`tributacao.types.ts:87`). O 6 é o código do fio, não o de domínio (K3 D1) | citados | médio como risco de regressão: quem seguir FE-0 literal colide com `ListaNeutra`. O frontend atual está correto |
| **K3-6** | Plano diverge do código | AJ-06 trata `RegimeTributario.LucroReal` como valor novo. Ele já existia (`BE:RegimeTributario.cs:7`; K3 §8 item 1 reconhece o erro do plano), e o frontend já o tem (`administracao.types.ts:12`, `tributacao.types.ts:25`, `pessoaFiscalLabels.ts:74`). Nada a acrescentar no frontend | citados | informativo |
| **K3-7** | Campo entregue pelo backend e ignorado pela UI | `AtualizarEmpresaRequest.LimparCrt` não existe no tipo do frontend (`administracao.types.ts:65`); `grep limparCrt` em `features lib tests` = zero. A opção "Não informado" do select vira `crt: null`, que o backend lê como "mantém" (`AtualizarEmpresaAdministracaoUseCase.cs:60`). Logo a UI não consegue remover o CRT, e uma empresa incoerente só se resolve trocando o regime ou o CRT por valor coerente | `BE:EmpresaRequests.cs:49` (campo `LimparCrt`); `FE:administracaoSchemas.ts:22-24` | médio, no cenário "empresa incoerente já gravada": o único caminho de correção pela tela é um par coerente |
| **K3-8** | Mensagem local para valor desconhecido (não medido) | CRT desconhecido em edição de Empresa: `crtSchema` é `union` de `nativeEnum`, `''` e `null` sem `errorMap` (`administracaoSchemas.ts:22`), enquanto o regime tem mensagem própria (`:17`). O texto que a UI mostraria é o padrão do Zod; **não executei**. Natureza: finalidade desconhecida bloqueia a gravação até reselecionar (`naturezasOperacaoSchemas.ts:40`), comportamento coerente com o fallback do select | citados | baixo, hipotético (exige o backend adicionar valor novo) |
| **K3-9** | Fonte duplicada sem amarração ao backend | Três cópias de `Crt` e `RegimeTributario` (duas enums + literais de pessoa), três de `FinalidadeNaturezaOperacao`. Nenhum arquivo em `scripts/` menciona `Crt`, `MicroempreendedorIndividual` ou `NotaDeCredito` (`grep -rln` em `scripts` = vazio), ou seja, nenhum gate compara esses enums com o backend. A paridade de hoje vem de testes unitários por arquivo (68 verdes, ver método) | citados | informativo: a paridade da seção 3 vale na data de hoje |
| **K3-10** | Campo lido pelo tipo e ignorado pela UI | `ContingenciaFiscalResponse.ambiente` (`fiscal.types.ts:502`) não é exibido; `ContingenciaResultPanel` (`FiscalOperationalPanels.tsx:80-97`) não o usa | citados | informativo (fora do K3; vizinhança) |

Itens verificados sem divergência (registro positivo):

- Paridade de valores dos 7 enums: 0 faltando, 0 sobrando (seção 3.8).
- `TipoEmissaoNfe.Scan`: sem superfície de escolha no frontend nem DTO no backend.
- Backend serializa enums como número (zero `JsonStringEnumConverter` em `src`); o frontend envia número (`SelectOption<number>`, `nativeEnum`).
- Sem cálculo local de coerência CRT x regime.
- Respostas sem `.strict()` nos schemas de resposta lidos (`naturezasOperacaoSchemas.ts`, comentário `:164`); não revisei os demais.

Itens **não verificados**:

- Resposta real do backend (nenhum endpoint chamado; só leitura do código `.cs`).
- Existência das permissões acima no union `PermissionCode` e no catálogo.
- Gates `validate:backend-permissions`, `validate:guard-permission-map`, `validate:backend-contract-map`; suíte `dotnet`; E2E.
- Estados de tela fora do que a seção 6 marca.
- `fiscalApi.ts` e `features/pessoas/api` (rotas desses dois endpoints não relidas).
- Comportamento visual do PrimeReact `Dropdown` com valor sem opção (K3-2).
- Decisão K3b-1 (consumidores de `Crt` no backend recebendo o CRT 4): fora do frontend; o que li foi `SituacaoTributariaIcms.cs:70-92` (CRT 4 devolve CSOSN) e `CodigosDeFioNfe.cs:80-86`, sem rodar testes do backend.

## 8. Status

`blocked`: K3-1 (critério do AJ-06 não cumprido, com dependência de contrato do backend). A paridade de valores fecha sem divergência.

```json
{
  "agent": "inventariante-contrato-tela",
  "node": "projeto",
  "assunto": "aj-06-enums-e-coerencia-de-crt",
  "status": "blocked",
  "bloqueio": "CONTRACT_MISMATCH",
  "arquivo": "docs/arquitetura/debate/20-inventario-enums-crt.md",
  "decisoesPropostas": [],
  "discordancias": [
    { "de": "plano AJ-06 (mensagem junto do campo de regime)", "ponto": "K3-1: backend emite ADMINISTRACAO_VALIDACAO sem campo; frontend so mostra toast", "impacto": "alto" },
    { "de": "plano FE-0 linha 164", "ponto": "K3-5: modBCST valor da operacao = 6 no FE-0, 7 no AJ-06 e no codigo", "impacto": "medio" },
    { "de": "AJ-06", "ponto": "K3-2: 7 selects de enum sem opcao 'nao mapeado' (regra x3, simulador x3, pessoa x1)", "impacto": "medio" }
  ],
  "pendencias": [
    { "tipo": "backend", "pergunta": "A coerencia CRT x regime vai ganhar codigo proprio e/ou campo no corpo do erro (hoje ADMINISTRACAO_VALIDACAO, Errors nulo)?", "decide": "se o mapeamento ao campo de regime e por codigo ou por texto da mensagem (K3-1)" },
    { "tipo": "funcional", "pergunta": "O AJ-06 exige 'nao mapeado' em todos os selects de enum ou so nos de Empresa e Natureza?", "decide": "escopo de K3-2 e K3-3" },
    { "tipo": "funcional", "pergunta": "A tela deve oferecer limparCrt para resolver empresa incoerente?", "decide": "se K3-7 entra no AJ-06" }
  ],
  "riscos": [
    "K3-5: seguir FE-0 literal (valor 6) colidiria com ListaNeutra=6; o frontend atual (7) esta correto",
    "K3-6: LucroReal nao e novo; nada a fazer no frontend",
    "K3-7: UI nao remove CRT; empresa incoerente so se corrige com par coerente",
    "K3-8: mensagem do Zod para CRT desconhecido nao medida",
    "K3-9: nenhum gate de script amarra os enums ao backend; paridade hoje depende de testes unitarios por arquivo",
    "Resposta real do backend e gates validate:* nao verificados"
  ]
}
```
