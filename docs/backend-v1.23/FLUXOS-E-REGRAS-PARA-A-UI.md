# Como o backend pensa — fluxos, estados e regras que a UI tem de espelhar

> Escrito em 2026-09-08 para o [plano de atualização do frontend](PLANO-FRONTEND-v1.23.md).
> Companheiro de [`CONTRATO-API-v1.23.md`](CONTRATO-API-v1.23.md) (o *quê*) e
> [`GAP-FRONTEND-BACKEND.md`](GAP-FRONTEND-BACKEND.md) (o *quanto falta*). Este é o **porquê**.
>
> Uma tela que chama o endpoint certo com o payload certo ainda pode estar errada, se
> desenhar um fluxo que o backend não tem. Este documento existe para isso.

## 1. O contrato de erro — vale para todos os 579 endpoints

Antes de qualquer fluxo, porque atravessa todos eles.

| Status | Quando | Corpo | O que a UI deve fazer |
| ---: | --- | --- | --- |
| **401** | Sem token, token expirado | padrão do ASP.NET | Renovar (`POST /api/auth/refresh`) ou mandar ao login |
| **403** | Falta a permissão do `[RequiredPermission]` | padrão do ASP.NET — **não é `ApiErrorResponse`** | O botão **não deveria ter sido clicável**. 403 é falha do guard da UI, não do usuário |
| **404** | Recurso não existe **ou é de outra empresa/filial** | `{"code":"Recurso.NaoEncontrado","message":"Recurso não encontrado."}` | Tratar como "não existe". **Não** dizer "sem permissão" |
| **400** | Regra de domínio ou validação | `ApiErrorResponse` completo | Exibir `userMessage`; usar `errors` para marcar campos |
| **409** | Concorrência otimista (`xmin`) | `code: "Concorrencia.Conflito"` | **Reler o registro e refazer** — nunca repetir o POST cego |
| **500** | Inesperado | `code: "Api.UnexpectedError"` | Genérico + `traceId` para suporte |

### O corpo de erro padrão

```ts
interface ApiErrorResponse {
  code: string;        // "Domain.BusinessRule", "Concorrencia.Conflito", "Recurso.NaoEncontrado"...
  message: string;     // motivo técnico, vindo do domínio
  userMessage: string; // "Não foi possível <operação>. Motivo: <message>" — pronto para a tela
  operation: string;   // o que se tentava fazer
  traceId: string;     // correlaciona com o log do backend
  errors?: Record<string, string[]>; // validação por campo
}
```

### ⚠️ A regra que mais confunde: **403 e 404 não são intercambiáveis, e 404 é ambíguo de propósito**

O `ApiErrorResponseFilter` traduz **`ErrorKind.Forbidden` e `ErrorKind.NotFound` para o
mesmo `404` genérico**. É o invariante 3 do projeto: negar acesso a um recurso de outra
empresa **não pode revelar que ele existe**.

Consequência para a UI, e ela é contraintuitiva:

- **403 nunca deveria chegar à tela.** Se chegou, o `PermissionGuard` está com a permissão
  errada — é bug de frontend. É exatamente o caso do botão **Reprocessar** (**D50**).
- **404 não significa "sumiu".** Pode ser "é de outra filial". Nunca escreva *"registro
  excluído"* a partir de um 404.

> Há uma dívida aberta do lado do backend (`SEC-003`): parte do módulo Fiscal ainda
> responde `400` onde deveria responder `404`. Não construa a UI em cima do status
> observado hoje nesses casos — construa em cima da tabela acima.

## 2. O modelo organizacional — empresa, filial e o que o token carrega

Toda operação é multiempresa. O token traz `empresa_id` e `filial_id`; o
`OrganizationalContextGuard` compara com a empresa/filial **do registro**.

Três estados, e a UI precisa dos três:

| `empresa_id` no token | Significa | Efeito |
| --- | --- | --- |
| Um GUID concreto | Usuário preso a uma empresa | Só enxerga o que é dela |
| `Guid.Empty` | **Contexto global** (logins master) | Enxerga todas; filtros de empresa/filial da query passam a valer |
| Ausente | Sem identidade | **Recusado** desde a v1.23.3/G1 |

Há também um **bypass de master**: claim `is_master=true` ou a permissão `*` satisfaz
qualquer `[RequiredPermission]`. A UI de administração precisa refletir isso, senão
esconde botões de quem pode tudo.

## 3. Fluxo central — do pedido de venda ao dinheiro

É a espinha dorsal do ERP e o que mais mudou de v1.14 a v1.23.

```
PedidoVenda (aprovado)
   │
   ├─► POST /api/faturamento/preparar          FATURAMENTO_PREPARAR
   │      cria o Faturamento em Rascunho
   │
   ├─► POST /api/faturamento/{id}/confirmar    FATURAMENTO_CONFIRMAR
   │      percorre os SEIS LEGS, em ordem:
   │
   │      1 GerarNotaFiscal          ─► NotaFiscal (Rascunho)
   │      2 GerarXmlEnvio            ─► XML de envio
   │      3 AssinarXml               ─► XML assinado  (nota vira Assinada)
   │      4 TransmitirAutorizarSefaz ─► SEFAZ          (nota vira Autorizada)
   │      5 BaixarEstoque            ─► movimento de estoque
   │      6 GerarContaReceber        ─► título a receber
   │
   └─► POST /api/faturamento/{id}/cancelar     FATURAMENTO_CANCELAR
          desfaz os legs INTEGRADOS, em ORDEM INVERSA (6→1)
```

### Os estados do faturamento

`Rascunho(1) → PendenteFiscal(2) → FiscalAutorizado(3) → EstoqueProcessado(4) → Faturado(5)`
mais `Cancelado(6)` e `Erro(7)`.

### Os legs — o conceito que a UI ainda não mostra

Cada leg é uma linha própria com estado: `Integrado(1)`, `Falhou(2)`, `Revertido(3)`.

**Por que isso importa para a tela:** o `StatusFaturamento` é um resumo, e o resumo
mente em falha parcial. Um faturamento em `Erro` pode ter os legs 1–4 `Integrado` (a nota
**está autorizada na SEFAZ**) e o leg 5 `Falhou`. Mostrar só "Erro" faz o operador achar
que nada aconteceu — quando existe uma NF-e válida no mundo.

> **A tela de faturamento precisa listar os legs.** É o item de maior valor não construído
> hoje, e o backend **já entrega tudo pronto** — não falta endpoint nenhum:

```csharp
FaturamentoResponse(
  ..., StatusFaturamento Etapa, ...,
  IReadOnlyCollection<FaturamentoLegResponse>? Legs = null,
  bool PossuiLegComFalha      = false,
  bool PossuiLegRevertido     = false,
  bool EtapaDivergeDosLegs    = false,   // ← o sinal mais importante
  bool PossuiLegEmReversao    = false)

FaturamentoLegResponse(
  Guid Id, LegIntegracaoFaturamento Leg, EstadoLegIntegracaoFaturamento Estado,
  DateTimeOffset OcorreuEm, Guid? ResponsavelId, string? Motivo)
```

Os quatro booleanos derivados são a tradução direta do que a tela precisa dizer:

| Campo | O que significa | O que a tela deve mostrar |
| --- | --- | --- |
| `PossuiLegComFalha` | algum leg tentou integrar e não vingou | badge de atenção + o `Motivo` do leg |
| `PossuiLegRevertido` | algo já foi desfeito | histórico, não estado atual |
| **`EtapaDivergeDosLegs`** | **o `Etapa` e os legs contam histórias diferentes** | **alerta forte**: é o caso em que o resumo mente. Nasceu da D35 exatamente porque `PossuiLegComFalha` sozinho não cobria |
| `PossuiLegEmReversao` | reversão em andamento ou interrompida | oferecer `retomar-reversao` |

`GET /api/faturamento/{id}/ocorrencias` traz o histórico de falhas
(`TipoOcorrenciaFaturamento`, mensagem, data).

### Reversão — três regras que a UI não pode inventar

1. **Ordem inversa, e só os `Integrado`.** Leg que nunca integrou não tem o que desfazer.
2. **`Revertido` só depois do efeito desfeito.** Se a inversa falhar, o leg **permanece
   `Integrado`** e a falha vira ocorrência. A UI **não** deve mostrar "revertido" nesse
   caso — o efeito continua de pé (o estoque continua baixado, o título continua lá).
3. **Leg 4 (SEFAZ) é irreversível por este fluxo.** Nota autorizada não "desconta": o
   cancelamento fiscal é outra operação, com prazo legal e protocolo. Faturamento com o
   leg 4 `Integrado` **é recusado**, e a recusa **enumera os legs integrados** — a UI deve
   exibir essa lista, não uma mensagem genérica.

Permissões próprias, ambas **ausentes do frontend hoje**:
`FATURAMENTO_REVERTER_INTEGRACAO` e `FATURAMENTO_RETOMAR_REVERSAO`
(`POST /api/faturamento/{id}/retomar-reversao`).

## 4. O documento fiscal — estados e a transmissão à SEFAZ

### Máquina de estados da nota

`Rascunho(1) → Validada(2) → Assinada(3) → Transmitida(4) → Autorizada(5)`

Terminais e desvios: `Rejeitada(6)`, `Cancelada(7)`, `Inutilizada(8)`, `Denegada(9)`,
`Contingencia(10)`.

**`Transmitida` é o estado perigoso** — é o "em voo": o documento saiu e não voltou
resposta conclusiva. Nota presa aí exige o caminho de recuperação (item 4.2).

### 4.1 O padrão transacional T1/T2 — e o que a UI precisa mandar

Integração externa **nunca** roda dentro da transação do operador (invariante 4):

```
T1  persiste a INTENÇÃO + reserva de idempotência   ← precisa de correlationId
    │
    ├── chamada à SEFAZ (fora de qualquer transação)
    │
T2  consolida protocolo / status / XML / auditoria
```

**`correlationId` é obrigatório** em `transmitir-sefaz` e `reprocessar-sefaz`. Ele é a
chave de idempotência: **o mesmo `correlationId` na mesma nota e operação é recusado**
(`IntegracaoFiscalJaProcessada`). Uma nova tentativa controlada exige um `correlationId`
**novo**.

> ⚠️ No frontend, hoje, o `correlationId` é opcional no schema Zod e o campo é editável
> sem `required`: apagar o valor manda `null`, passa na validação do cliente e leva **400**
> do backend, com o diálogo aberto e o campo vazio. É o achado **F3**.

### 4.2 Reprocessar ≠ emitir

Desde a v1.23.6/G3, **reprocessar tem permissão própria**: `FISCAL_REPROCESSAR`, distinta
de `FISCAL_EMITIR`. É o caminho de recuperação de uma nota em voo.

> ⚠️ **D50 / F2** — o botão Reprocessar ainda é guardado por `FISCAL_EMITIR`, com o
> tooltip dizendo isso por extenso. E **F1**: `FISCAL_REPROCESSAR` nem existe no union
> `PermissionCode`, e o catálogo de permissões é um `Record` exaustivo — então **não há
> caminho de UI para conceder ou revogar a permissão nova**. Enquanto todo mundo com
> `FISCAL_EMITIR` receber a nova por concessão automática, ninguém percebe; no dia em que
> um administrador quiser negar só o reprocessamento, a tela mente.

### 4.3 Concorrência — o 409 é esperado, não é erro de sistema

`NotaFiscal` e `PedidoVenda` têm token de concorrência (`xmin`). Duas ações simultâneas
sobre o mesmo documento produzem **409 `Concorrencia.Conflito`** para a segunda.

**A UI tem de tratar 409 como fluxo normal:** reler o documento, mostrar o estado atual e
pedir confirmação — nunca repetir a chamada automaticamente, e nunca exibir "erro
inesperado".

### 4.4 Alertas — informação que o backend passou a dar e a tela ignora

`TransmissaoSefazResponse` ganhou `Alertas` na v1.23.2/G6. É onde vem, por exemplo,
*"a nota foi autorizada, mas o pedido não pôde ser faturado"* — um caso em que a operação
**deu certo pela metade** e alguém precisa agir.

> ⚠️ **F4** — o tipo do frontend não tem `alertas`, então esse aviso nunca chega à tela.
> Como o tipo é uma `interface` TS pura, sem `zod.parse().strict()`, nada quebra: o campo
> simplesmente some. É o custo direto de não haver schema de response publicado (item 7).

## 5. O motor de tributação — o imposto deixou de ser digitado

Até a v1.22.0, o imposto do documento era **o que o operador digitava**. Hoje ele é
**calculado** pelo motor a partir do contexto tributário do documento.

- `POST /api/fiscal/tributacao/simular` — simulação isolada, para telas de conferência.
- No documento, o cálculo acontece na validação/geração; `GET /api/fiscal/notas-fiscais/{id}/impostos`
  devolve o resultado **por item e por imposto**.

O que alimenta o cálculo, e **quase nada tem tela** (ver o gap):

| Insumo | Onde se cadastra | Cobertura da UI |
| --- | --- | ---: |
| Regime tributário/CRT da empresa | `Empresas` | 4/6 |
| Bloco fiscal da pessoa (destinatário) | `Pessoas` | **4/19** |
| Identidade fiscal do item (NCM, CEST, origem) | `Produtos` / `CadastrosFiscais` | **2/16** |
| Natureza de operação e CFOP | `NaturezasOperacao` | **0/5** |
| Série e numeração | `SeriesFiscais` | **0/7** |
| Regras e exceções fiscais | `RegrasFiscais` / `ExcecoesFiscais` | 5/5 ✅ |

**É aqui que o frontend está de fato defasado** — não na operação do documento, mas no
cadastro que a torna correta. Nota com serviço ou IPI hoje falha na validação com uma
mensagem que manda o usuário a uma tela **que não existe**.

## 6. Outbox de integração — existe, e não drena

`EventoIntegracaoExterna` tem estados `Pendente(1)`, `Processando(2)`, `Sucesso(3)`,
`Falha(4)`, `ReprocessamentoAgendado(5)`, `Cancelado(6)`, com backoff e teto de tentativas.

**Não existe drenador.** `POST /api/integracoes/eventos/{id}/reprocessar` **apenas
reagenda** (mexe em `ProximoProcessamentoEm`); `/sucesso` e `/falha` são um humano
**declarando** o desfecho à mão. Nenhum caminho executa o evento.

Para a UI isto significa: **a tela de Integrações é um painel de acompanhamento e
intervenção manual, não um "reprocessar agora"**. Chamar o botão de reprocessar não faz
nada acontecer — só marca para depois, e "depois" ainda não existe. O módulo `Integracoes`
tem **0 de 10** operações consumidas; ao construí-lo, o texto da tela precisa ser honesto
sobre isso.

> O drenador é a próxima fatia do backend (`v1.23.3-g2`). A UI pode ser construída antes,
> desde que não prometa execução.

## 7. A limitação estrutural do contrato — e por que ela produz bug silencioso

**Nenhuma das 579 operações declara schema de response.** `[ProducesResponseType]` é usado
**zero** vezes nos 96 controllers.

| Consequência | Efeito prático |
| --- | --- |
| O OpenAPI descreve request com precisão total e response com precisão nenhuma | Não dá para **gerar** tipos de response |
| Todo tipo de response no frontend é escrito à mão | Nada verifica que continuam corretos |
| Campo novo em response não quebra o build do frontend | Vira `undefined` na tela, em silêncio — foi assim com `Alertas` (**F4**) |

**Esta é a alavanca de maior retorno do lado do backend**, e está proposta como **Onda F0**
no plano: anotar `[ProducesResponseType<T>(200)]` nas ações e passar a gerar os tipos do
frontend a partir do spec. Enquanto isso não existir, toda tabela "Response" do
[contrato](CONTRATO-API-v1.23.md) vem do `record` C#, não do contrato publicado — e
envelhece sem avisar.

## 8. Permissões — o catálogo e os três desencontros

O backend tem **179** permissões no formato `MODULO_RECURSO_ACAO`. O frontend conhece
**144**.

| Desencontro | Quantidade | Efeito |
| --- | ---: | --- |
| Existem no backend, ausentes do frontend | **38** | Sem caminho de UI para conceder/revogar. Inclui `FISCAL_REPROCESSAR`, `FATURAMENTO_REVERTER_INTEGRACAO`, `PESSOAS_DADOS_FISCAIS_GERENCIAR`, `FISCAL_SERIES_GERENCIAR` |
| Existem no frontend, **não** no backend | **3** | `ATIVIDADES_GERENCIAR`, `RELATORIOS_CONSULTAR` e — o pior — **`PORTARIA_PRE_AUTORIZAR`**, que é erro de grafia de `PORTARIA_PREAUTORIZAR`: o guard testa uma permissão que **nunca** existirá, e o botão fica **permanentemente escondido** |
| Bypass de master | — | Claim `is_master=true` ou permissão `*` satisfaz qualquer guard. A UI precisa refletir, senão esconde botão de quem pode tudo |

Como o catálogo de permissões do frontend é um `Record<PermissionCode, …>` **exaustivo**,
acrescentar as 38 é pré-requisito para a tela de Grupos de Acesso poder administrá-las.

## 9. Resumo — o que a UI precisa aprender a mostrar

Em ordem de valor, e nenhum destes depende de endpoint novo no backend:

1. **Os legs do faturamento**, com estado por leg — o resumo mente em falha parcial.
2. **Os cadastros fiscais** (série, natureza de operação, bloco fiscal da pessoa,
   identidade fiscal do item) — sem eles, o documento não fica correto.
3. **A separação emitir × reprocessar**, com a permissão certa no guard.
4. **409 como fluxo**, não como erro.
5. **Alertas** de operação parcialmente bem-sucedida.
6. **Integrações** como painel honesto — acompanhamento, não execução.
