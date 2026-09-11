# Plano de atualização do frontend — alcançar o backend v1.23

> Escrito em 2026-09-08 pelo orquestrador do backend, a partir de medição dos **dois**
> repositórios. Backend em `v1.23.2+`; frontend (`../New project`) em `v1.11.0a8b47.c3`,
> HEAD `826cc6a`, parado desde 2026-08-21.
>
> Companheiros: [`FLUXOS-E-REGRAS-PARA-A-UI.md`](FLUXOS-E-REGRAS-PARA-A-UI.md) (o porquê),
> [`CONTRATO-API-v1.23.md`](CONTRATO-API-v1.23.md) (o quê),
> [`GAP-FRONTEND-BACKEND.md`](GAP-FRONTEND-BACKEND.md) (o quanto falta).

---

## 1. Sumário executivo — a defasagem não é a que o número de versão sugere

O frontend está doze versões menores atrás do backend. A conclusão intuitiva seria "o
frontend não acompanhou o eixo fiscal". **A medição diz o contrário.**

| Medida | Valor |
| --- | ---: |
| Operações HTTP no backend | 579 |
| **Consumidas pelo frontend** | **457 (79%)** |
| `NotasFiscais` — o módulo das doze versões | **26 de 28** ✅ |
| `CadastrosFiscais` · `SeriesFiscais` · `NaturezasOperacao` · `Pessoas` | 2/16 · **0/7** · **0/5** · 4/19 ❌ |

**O frontend sabe operar o documento fiscal e não sabe cadastrar o que o torna correto.**
Transmite, reprocessa, cancela, entra em contingência — e não tem tela para série
numerada, natureza de operação, CFOP nem bloco fiscal da pessoa. É a assinatura recorrente
deste projeto — *peça correta, desligada* — agora do lado da UI.

E há algo pior que a cobertura, que nenhuma contagem de endpoint pegaria: **cinco defeitos
de contrato já ativos em produção**, incluindo uma tela de dinheiro que exibe R$ 0,00 para
tudo. Eles vêm antes de qualquer tela nova.

> **Duas correções de rumo, registradas porque a segunda quase passou.**
>
> 1. A primeira medição deu **30%** e estava errada: o `grep` usado tinha backtick dentro de
>    aspas duplas no bash, o que virou substituição de comando e descartou **todas** as
>    rotas em template literal — ou seja, quase toda rota com `{id}`. Refeita com um parser
>    próprio, deu 58%.
> 2. **58% também estava errado.** Aquela contagem casava só a **rota**, e a extração ainda
>    perdia rota montada por concatenação ou por variável. O número correto é **79%**, medido
>    casando **método + rota** com o `scanFrontendRoutes` **do próprio frontend** — um
>    resolvedor sobre a AST do TypeScript, que já existia no repositório e é usado pelo gate
>    `validate-backend-contract-map`.
>
> A lição é a mesma das duas vezes: **quando o repositório já tem uma ferramenta que mede
> aquilo, use a dele.** O plano que teria saído do primeiro número mandaria reconstruir o
> módulo fiscal, que está pronto.
>
> **O que não mudou entre as três medições** — e é o que sustenta este plano — é a *forma*
> do buraco: `NotasFiscais` 26/28 contra `SeriesFiscais` 0/7, `NaturezasOperacao` 0/5,
> `CadastrosFiscais` 2/16 e `Pessoas` 4/19.

---

## 2. Os cinco defeitos já em produção — a fila real

Ordenados por dano: primeiro o que faz o operador errar com dinheiro, depois o que bloqueia
trabalho legítimo, depois o que mente, depois o que se perde.

### 🔴 P1 — Contas a Pagar/Receber exibem **R$ 0,00** em toda listagem

**O frontend lê campos que não existem no wire.**

| Frontend declara | Backend entrega |
| --- | --- |
| `valorTotal`, `saldo` (`financeiro.types.ts:60-76, 99-115`) | `valorOriginal`, `valorPago`, `valorJuros`, `valorMulta`, `valorDesconto`, **`valorSaldo`** |
| `parcela.valor`, `parcela.saldo` (`:39-46, 78-85`) | `valorOriginal` … `valorSaldo` |
| `pagamento.parcelaId` (`:87-97`) | **`parcelaPagarId`** |

Não há mapper. `formatMoney` (`financeiroUiUtils.ts:47`) faz `value ?? 0`, então o
resultado **não é `undefined` na tela — é um zero plausível e errado**:

1. Colunas "Total" e "Saldo" mostram **R$ 0,00 para toda conta**, sempre.
2. O diálogo de baixa (`FinanceiroActionDialogs.tsx:66`) nasce com valor **0** — a cascata
   `parcela?.saldo ?? parcela?.valor ?? conta?.saldo ?? conta?.valorTotal ?? 0` percorre
   quatro campos inexistentes.
3. O dropdown de parcela (`:77`) também mostra R$ 0,00 — o operador não consegue nem **ler**
   o saldo para digitar à mão.

E "Pagar"/"Receber" não exige valor mínimo. **Quem confiar na tela baixa R$ 0,00.**

> Este é o defeito mais grave do repositório e não tem nada a ver com as doze versões de
> atraso: é divergência de forma, silenciosa, numa tela de uso diário.

### 🔴 P2 — Grupos de Acesso guardado pela permissão de **outro módulo**

`GruposAcessoPage.tsx:43-45` fecha a página inteira com `SEGURANCA_PERMISSOES_GERENCIAR`.
O backend (`GruposAcessoController.cs:22,30,43,…`) exige
`SEGURANCA_GRUPOS_ACESSO_CONSULTAR` / `_GERENCIAR`. A permissão usada gate **outro
controller** (`CargosAcesso`).

Mente nos dois sentidos: quem tem a permissão certa vê *"não autorizado"*; quem tem a
errada vê os botões habilitados e leva **403** em todo submit.

**Raiz:** as duas permissões corretas estão entre as **37 ausentes do union
`PermissionCode`** — o time nunca pôde referenciá-las e usou a que existia no tipo.

### 🟠 P3 — Seletor "Origem = Compra" morto em Contas a Pagar

`ContaFinanceiraFormDialog.tsx:57-64,138` ainda oferece `Origem = Compra` com busca de
pedido. Desde a **v1.23.2/G5 (D7)** o backend **recusa** qualquer `Origem != Manual`
(`Financeiro.OrigemNaoDerivavelPeloUsuario`). O comentário do backend cita **literalmente**
este seletor como o alvo pendente.

Caminho de UI 100% morto — o erro aparece (não é silencioso), mas o fluxo nunca funciona.

> **Não generalize:** o guard equivalente **não existe** em Contas a Receber. O seletor
> "Origem = Pedido de Venda" continua válido lá.

### 🟠 P4 — Faturamento: os legs são invisíveis e a reversão travada é inacionável

`faturamento.types.ts:28-42` não declara `legs`, `possuiLegComFalha`, `possuiLegRevertido`,
`possuiLegEmReversao` nem `etapaDivergeDosLegs` — **todos já presentes na response**. O
endpoint `POST /{id}/retomar-reversao` nunca é chamado.

Um leg preso em reversão deixa o operador vendo "Cancelado" sem saber que **há efeito
pendurado** — e sem caminho de UI para resolver. Ver a seção 3 dos
[fluxos](FLUXOS-E-REGRAS-PARA-A-UI.md) para o significado de cada campo.

**Nenhum endpoint novo é necessário.** É só ler o que já vem.

### 🟡 P5 — A aba de Impostos desinforma, e a linha manual vence em silêncio

`NotaFiscalDetalhePage.tsx:294` afirma: *"Impostos são parametrizados/manuais nesta etapa.
O frontend não calcula ICMS, IPI, PIS, COFINS ou ISS automaticamente."*

**É falso desde a v1.22.0/G2** — `ValidarNotaFiscalUseCase` sempre roda o motor.

Pior: para `IPI`, `ICMS ST` e `FCP ST`, **a linha `Manual` vence sobre a do `Motor` no
total** (D7, `NotaFiscal.cs:680-695`), e `ImpostoNotaFiscalResponse.Origem` existe
exatamente para isso ser auditável — mas a tabela da tela **não tem coluna `Origem`**. O
operador pode ver duas linhas "IPI" para o mesmo item sem saber qual compõe o total, e a
legenda o incentiva a adicionar uma manual "para garantir".

Órfãos na mesma família: `valorIpi`, `valorIcmsSt`, `valorFcpSt`, `valorFrete`,
`valorSeguro`, `valorOutrasDespesas` e o endpoint `POST /{id}/valores-acessorios`.

---

## 3. O estado estrutural — o que precisa ser verdade antes de escalar

### 🔴 O CI do frontend não roda desde a edição que quebrou o YAML

`.github/workflows/frontend-ci.yml:31` — `NEXT_PUBLIC_APP_VERSION` indentado com 10 espaços
num bloco `env:` cujas irmãs usam 6. O parser rejeita: `bad indentation of a mapping entry
(31:34)`.

**Os 21 gates estão mortos na prática.** Só `npm run validate` local protege o repositório
— e ele roda um subconjunto. Qualquer plano que assuma "o CI pega" está assumindo errado.

### O que está construído e desligado (o mesmo padrão do backend)

| Mecanismo | Estado |
| --- | --- |
| **Política de contexto organizacional** (`lib/http/organizationalContextPolicy.ts`, 120 linhas, com teste) | Aplicada em **toda** request pelo `httpClient`, mas **só 2 endpoints declaram a metadata**. Nos outros 37 features é inerte; o contexto viaja por propagação manual via `EmpresaFilialFilter` (93 arquivos) |
| **`enabled: Boolean(query.empresaId)`** | Só em `fiscal` e `tributacao` (2 de 44 arquivos de hooks). Os demais disparam listagem antes de haver contexto |
| **`empresaId` na query key** | **Em nenhuma.** A proteção contra vazamento de cache entre empresas é indireta, por `invalidateQueries` na troca de contexto |
| **Factory de query keys** | 4 de 39 features |
| **`.strict()` em Zod** | **Zero ocorrências no repositório** |
| **Zod validando response** | 2 casos em 35 arquivos de `api/` |
| **Camada de CRUD genérico** (`features/shared`) | Órfã — arquitetura anterior abandonada sem remoção |
| **`features/*/tests/`** | 11 diretórios com só `.gitkeep` |

### As três permissões fantasma

Existem no frontend e **não** no backend:

| Código | Consequência |
| --- | --- |
| **`PORTARIA_PRE_AUTORIZAR`** | O backend chama `PORTARIA_PREAUTORIZAR` (sem underscore). O botão "Nova pré-autorização" **nunca habilita** para não-master |
| `ATIVIDADES_GERENCIAR` | O backend tem cinco granulares (`_CRIAR`, `_ATUALIZAR`, `_CANCELAR`, `_COMENTAR`, `_ATRIBUIR`) |
| `RELATORIOS_CONSULTAR` | Entrada morta que aparece no seletor de grupos e permite atribuir permissão que o backend ignora |

> Existe gate rigoroso para **rotas** (`validate-backend-contract-map`, que hoje passa),
> e **não existe** o equivalente para **permissões** — embora o snapshot esteja versionado
> ao lado (`scripts/backend-permissions.snapshot.json`, e já defasado: 2026-08-12).

---

## 4. A arquitetura vigente — como uma tela nasce hoje

Levantado do próprio repositório, para que o plano não invente convenção.

### Anatomia de um feature

```
features/<dominio>/
  api/<dominio>Api.ts            objeto único exportado
  hooks/use<Dominio>Resources.ts query keys + hooks + use<X>Mutations()
  schemas/<dominio>Schemas.ts    só request
  types/<dominio>.types.ts       Request / Response / Query
  components/<X>Page.tsx, <X>FormDialog.tsx, <X>ActionDialogs.tsx, <dominio>UiUtils.ts
```

A página do App Router é um adaptador de 4 a 11 linhas:

```tsx
// app/(main)/fiscal/notas/page.tsx
import { NotaFiscalConsultaPage } from '@/features/fiscal/components/NotaFiscalConsultaPage';
export default function Page() { return <NotaFiscalConsultaPage />; }
```

**Feature-modelo: `features/fiscal`** — é a única que fecha o ciclo: classe de erro tipada
própria com desempacotamento de erro em `Blob`, `enabled` por empresa, invalidação
hierárquica (`invalidateNota()`), validação de coerência de filtro antes da chamada, e
quatro camadas de teste. Copie-a, não a média do repositório.

### Item de menu novo = 3 edições

1. `layout/AppMenu.tsx` — `{ label, icon, to, permission | anyPermissions | allPermissions }`
2. `lib/security/routePermissions.ts` — `{ pattern, anyOf, description }`, **específica antes da genérica**
3. `app/(main)/<rota>/page.tsx` — o adaptador

### Contrato de erro do cliente

`lib/http/httpClient.ts` — refresh proativo e deduplicado, `_retry` contra laço, e no
fracasso `clearSession()` + `/sessao-expirada`. **403 não é tratado no cliente**: a defesa é
preventiva, nos guards. `lib/http/apiError.ts:117` (`mapApiError`) reconhece quatro
formatos e é usado em 118 arquivos.

---

## 5. As ondas

Cada onda fecha verde antes da seguinte. **F0 e F1 não são negociáveis** — sem elas, tudo
que vier depois é construído sobre chão que não sustenta.

### F0 — o chão (≈0,5 fatia) · **bloqueia todo o resto**

| # | Entrega | Por quê |
| --- | --- | --- |
| F0.1 | **Consertar a indentação do `frontend-ci.yml`** | 21 gates estão mortos. É uma linha |
| F0.2 | **Gate de permissões**: comparar o union `PermissionCode` com o snapshot do backend e falhar na divergência | O gate de rotas existe e funciona; o de permissões não existe, e é exatamente por onde entraram P2, F1 e as três fantasmas |
| F0.3 | Regenerar `backend-permissions.snapshot.json` (hoje de 2026-08-12) | O snapshot é a referência do gate acima |

> **Proposta ao backend, fora deste plano mas de altíssimo retorno:** anotar
> `[ProducesResponseType<T>(200)]` nas ações. Hoje **nenhuma** das 579 operações declara
> schema de response, então **nenhum tipo de response do frontend pode ser gerado** e nada
> verifica que continuam corretos. P1 e P5 existem por causa disso. Enquanto não existir,
> a defesa possível no frontend é F1.4.

### F1 — parar o sangramento (≈1 fatia) · os cinco defeitos da seção 2

| # | Entrega | AC |
| --- | --- | --- |
| F1.1 | Renomear os campos monetários de `ContaPagar`/`ContaReceber` para `valorOriginal`/`valorPago`/`valorJuros`/`valorMulta`/`valorDesconto`/`valorSaldo`/`parcelaPagarId` | Listagem exibe o valor real; diálogo de baixa nasce com o saldo da parcela |
| F1.2 | Acrescentar as **37** permissões ao union + catálogo; trocar o guard de Grupos de Acesso para `SEGURANCA_GRUPOS_ACESSO_*` | Nenhum `PermissionCode` sem par no backend; nenhuma permissão do backend sem entrada no catálogo |
| F1.3 | Corrigir as três fantasmas (`PORTARIA_PRE_AUTORIZAR` → `PORTARIA_PREAUTORIZAR`; `ATIVIDADES_GERENCIAR` → as cinco granulares; remover `RELATORIOS_CONSULTAR`) | O botão de pré-autorização habilita para quem tem a permissão |
| F1.4 | **`formatMoney` deixa de mascarar ausência**: `value ?? 0` vira erro visível em modo dev e "—" em produção | Campo ausente **nunca** mais vira R$ 0,00 silencioso. É a defesa genérica contra a classe inteira de P1 |
| F1.5 | Remover `Origem = Compra` do fluxo manual de Conta a Pagar (**manter** em Contas a Receber) | O caminho morto some |
| F1.6 | **Guards com permissão existente porém errada** — a classe que o gate de F0.2 não enxerga, porque não é fantasma nem cobertura pendente. Corrigir os três achados abaixo e criar o gate que cruza a chamada HTTP de cada tela contra a permissão do contrato | Nenhum guard concede acesso a uma ação que o backend recusa, nem recusa uma que ele concede; o gate novo falha se voltar a divergir |

**F1.4 é o item que mais importa a longo prazo** — os outros consertam instâncias, ele fecha
a classe.

**Os três achados de F1.6**, levantados pelo `arquiteto-frontend` ao mapear as 36 permissões de
F1.2. Mesma família do P2 — o guard existe, compila e passa no gate, e ainda assim guarda a porta
errada:

```text
features/tabelas-preco/components/TabelasPrecoPage.tsx:59,112,150
  guarda ativar / inativar / itens com TABELAS_PRECO_GERENCIAR|VENDAS_GERENCIAR;
  o backend exige TABELAS_PRECO_ATIVAR / _INATIVAR / _ITENS_GERENCIAR

features/seguranca/components/SegurancaActionDialogs.tsx:108-121
  um único PermissionGuard SEGURANCA_USUARIOS_GERENCIAR cobre resetar senha,
  vincular/remover grupo e inativar; o backend exige SEGURANCA_USUARIOS_RESETAR_SENHA,
  SEGURANCA_USUARIOS_INATIVAR e SEGURANCA_GRUPOS_ACESSO_GERENCIAR

features/auditoria/components/…:82
  guarda /auditoria com AUDITORIA_CONSULTAR, mas auditoriaApi.ts:49,56 chamam
  /eventos-recentes e /operacional, que o backend gate com AUDITORIA_OPERACIONAL_CONSULTAR
```

As seis permissões corretas já entram no union em F1.2, então F1.6 não depende de contrato novo.
`scanFrontendRoutes` já resolve rota sobre a AST e é o insumo pronto para o gate. **Sequência
decidida: F1.6 entra depois de F1.4**, para não misturar "fechar o registro de permissões" com
"auditar todo guard contra o contrato" no mesmo diff — é o argumento do T7 aplicado a permissões.

### F2 — o que o backend já entrega e a tela não mostra (≈1 fatia) · **zero endpoint novo**

| # | Entrega |
| --- | --- |
| F2.1 | **Legs do faturamento**: tabela de legs com estado, e alerta forte em `etapaDivergeDosLegs`; botão `retomar-reversao` sob `FATURAMENTO_RETOMAR_REVERSAO` |
| F2.2 | **Aba de Impostos**: apagar a legenda falsa, exibir a coluna `Origem` e sinalizar quando uma linha `Manual` suprime a do `Motor` no total |
| F2.3 | Valores acessórios da nota (`valorFrete`, `valorSeguro`, `valorOutrasDespesas`, `valorIpi`, `valorIcmsSt`, `valorFcpSt`) + `POST /{id}/valores-acessorios` |
| F2.4 | `alertas` em `TransmissaoSefazResponse` (**F4**) — a resposta já traz *"nota autorizada, mas o pedido não pôde ser faturado"* |
| F2.5 | Separar emitir × reprocessar: `FISCAL_REPROCESSAR` no guard do botão, no `routePermissions` e no `AppMenu` (**F1/F2/F5/D50**) |
| F2.6 | `correlationId` obrigatório no schema de transmissão (**F3**) |

### F3 — os cadastros que tornam o documento correto (≈1,5 fatia) · **o maior valor funcional**

Sem estes, a NF-e falha na validação e manda o operador a telas que não existem.

| # | Entrega | Endpoints |
| --- | --- | ---: |
| F3.1 | **Séries fiscais** — listar, criar, ampliar, encerrar vigência, inativar, e o relatório de **buracos de numeração** | 0/7 → 7 |
| F3.2 | **Naturezas de operação e CFOP derivado** | 0/5 → 5 |
| F3.3 | **Bloco fiscal da Pessoa** — hoje `features/pessoas` não tem **nenhum** campo fiscal | 4/19 → +8 |
| F3.4 | **Cadastros fiscais** (NCM, CEST, CST, geografia fiscal) | 2/16 → +14 |
| F3.5 | Modelos de documento fiscal | 0/1 → 1 |

### F4 — o que não existe em UI nenhuma (≈1,5 fatia)

| # | Entrega | Nota |
| --- | --- | --- |
| F4.1 | **Integrações** (0/10) | Painel de **acompanhamento e intervenção manual**. ⚠️ Nenhum caminho executa evento hoje — "reprocessar" só reagenda. O texto da tela precisa ser honesto |
| F4.2 | Cargos de acesso (0/6) e matriz de grupos (0/2) | Fecha a administração de segurança iniciada em F1.2 |
| F4.3 | Transportadoras (0/4) e classificações de pessoa (0/4) | Cadastros que o documento fiscal referencia |
| F4.4 | Parâmetros (0/2), infraestrutura de produção (0/3) | Cauda |
| F4.5 | Modelos de documento fiscal (0/1), `Permissoes` e `PermissoesCatalogo` (0/1 cada) | Cauda; os dois últimos alimentam a tela de F1.2 |

### F5 — dívida estrutural (≈1 fatia) · pode correr em paralelo a partir de F2

| # | Entrega |
| --- | --- |
| F5.1 | `empresaId` na query key de todo feature — hoje a proteção é indireta |
| F5.2 | `enabled: Boolean(empresaId)` generalizado (hoje 2 de 44) |
| F5.3 | Rollout da política declarativa de contexto organizacional (hoje 2 endpoints de ~579) |
| F5.4 | Uma gramática única de query key + factory (hoje duas gramáticas, factory em 4 de 39) |
| F5.5 | Consolidar as **cinco** classes de erro paralelas |
| F5.6 | Remover a camada de CRUD genérico órfã e os 11 `tests/` vazios |
| F5.7 | Podar `docs/`: 93 `IMPLEMENTACAO_*` de rastro histórico contra 7 documentos vivos |

---

## 6. Tradeoffs e decisões

| # | Decisão | Alternativa recusada, e por quê |
| --- | --- | --- |
| T1 | **Consertar antes de construir.** F1 vem antes de qualquer tela nova | Construir F3 primeiro entregaria valor visível mais cedo — e deixaria a tela de dinheiro mostrando R$ 0,00 por mais um mês |
| T2 | **O gate de permissões (F0.2) antes de corrigir permissão (F1.2)** | Corrigir sem gate conserta a instância e não a classe: as três fantasmas voltariam na próxima tela |
| T3 | **`formatMoney` falha visivelmente (F1.4)** em vez de só renomear os campos | Renomear conserta P1. Só o F1.4 impede o próximo P1 — e a causa raiz (response sem schema) não some tão cedo |
| T4 | **Não gerar cliente a partir do OpenAPI agora** | Seria o ideal, mas o spec **não tem schema de response** — geraria requests tipados e responses `any`, com falsa sensação de segurança. Reavaliar quando o backend anotar `ProducesResponseType` |
| T5 | **Não introduzir `.strict()` em massa** | Rejeitar campo desconhecido em response quebraria a tela a cada campo aditivo do backend — e campo aditivo é a norma aqui. Usar `.strict()` só em **request** |
| T6 | **F4.1 (Integrações) entrega painel honesto, não "reprocessar agora"** | Prometer execução seria mentir: o drenador é a próxima fatia do backend (`v1.23.3-g2`) |
| T7 | **Manter as duas gramáticas de query key até F5.4** | Unificar junto com F1/F2 misturaria refatoração ampla com correção de defeito, e tornaria a revisão impossível |
| T8 | **Não tocar em `tsconfig target: es5`** | É herança do template e custa bundle, mas mudar é risco sem retorno funcional agora |

---

## 7. Critério de pronto — por onda

1. `npm run validate` verde (`validate:source` → `typecheck` → `lint` → `test`).
2. **`ci:gates` verde de verdade** — a partir de F0.1, o workflow volta a executar.
3. Nenhuma rota nova fora do catálogo (`validate-backend-contract-map` já garante).
4. **Nenhuma permissão fora do snapshot** (gate novo de F0.2).
5. Teste de componente para todo diálogo que grava, e e2e mockado para todo fluxo novo.
6. Documento vivo atualizado — **não** um `IMPLEMENTACAO_*` novo (ver F5.7).

## 8. Riscos

| Risco | Mitigação |
| --- | --- |
| **Response sem schema no backend** — a causa raiz de P1 e P5 continua ativa | F1.4 (falhar visível) + a proposta de `ProducesResponseType` ao backend |
| Os documentos gerados (contrato, gap) viram foto velha | `scripts/gerar-contrato-frontend.mjs` **do repositório do backend**; regenerar a cada fatia do backend que mexa em rota, permissão ou `record` |
| F3 depende de entender regra fiscal, não só de CRUD | Ler a seção 5 dos [fluxos](FLUXOS-E-REGRAS-PARA-A-UI.md) antes; o motor já expõe `POST /api/fiscal/tributacao/simular` para conferência |
| O frontend voltar a divergir em silêncio | Os dois gates (rotas + permissões) são o que impede; sem CI vivo, nenhum dos dois vale |

## 9. Como medir progresso

Regenerar o [gap](GAP-FRONTEND-BACKEND.md) ao fim de cada onda. Trajetória esperada:

| Marco | Cobertura |
| --- | ---: |
| Hoje | **457/579 (79%)** |
| Depois de F2 | ~459 (79%) — F2 é **profundidade**, não amplitude: quase não move o número |
| Depois de F3 | ~493 (85%) |
| Depois de F4 | ~528 (91%) |

**Cobertura não é a meta, e F2 é a prova disso** — a onda que mais conserta a experiência do
operador praticamente não mexe no percentual, porque lê campos que já vinham na response.
Um plano guiado pelo número puxaria F4 para a frente e deixaria a tela de dinheiro mostrando
R$ 0,00.

As metas reais são: **zero defeito da seção 2**, **zero permissão divergente** e **um
documento fiscal emitido sem sair da UI**.
