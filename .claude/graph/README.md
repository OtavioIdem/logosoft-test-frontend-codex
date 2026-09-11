# Graph & harness engineering — como a fatia é executada

Antes, o fluxo existia só no prompt do orquestrador: "arquiteto, depois dev,
depois testes, depois QA". Isso é uma **intenção**. A partir daqui o fluxo é um
**artefato** — um grafo com condições, gates e limite de tentativas, que se lê e
se confere.

```
Prompt orienta.
Grafo decide a ordem.
Política restringe autoridade.
Contrato conecta os nós.
Gate impede avanço incorreto.
```

Portado do modelo do backend, adaptado ao que este repositório tem: nossos
agentes, nossos gates, e as armadilhas que esta esteira já pagou para descobrir.

## Os cinco arquivos

| Arquivo | Responde |
| --- | --- |
| [`regimes.yaml`](regimes.yaml) | **qual mecanismo** o trabalho aciona, e em **que nível de modelo** — é a primeira decisão, antes de tudo |
| [`policies.yaml`](policies.yaml) | **quem** trabalha e o que cada um pode escrever |
| [`execution-graph.yaml`](execution-graph.yaml) | **quando** cada nó entra, sob que condição, com que gate |
| [`risk.yaml`](risk.yaml) | **quanto** esforço a fatia merece — e quais nós extras o risco liga |
| [`contratos.md`](contratos.md) | **o que** cada agente devolve, em formato que o orquestrador consome sem reler transcript |

### São dois grafos, não um

`execution-graph.yaml` carrega os dois trabalhos que este projeto executa:

| Grafo | Regimes | Produz |
| --- | --- | --- |
| `nodes:` — **grafo da fatia** | `implementacao`, `correcao`, `teste`, `qualidade`, `infraestrutura` | comportamento novo, com gates e revisão |
| `graph_arquitetura:` — **grafo da rodada** | `arquitetura` | a forma do que ainda não existe: inventário, quarteto em paralelo, síntese. Vem **antes** do plano de fatia |

## Quem é o harness aqui

O orquestrador (sessão principal). Não existe runtime externo executando o YAML —
o grafo é lido e executado por quem monta a fatia. Isso muda o que se pode
prometer, e vale ser honesto sobre a fronteira:

**É imposto por máquina (violar é impossível):**

- `tools:` no frontmatter do agente — arquitetos, inventariante e QA não têm
  `Edit`/`Write`. São read-only de fato, não de promessa. É o que sustenta "quem
  revisa não corrige".
- Hook `PreToolUse` em `.claude/settings.json` — **nega** escrita nos artefatos
  gerados (snapshot de permissões, mapa de contrato). Eles são a medição contra a
  qual os gates comparam; editá-los para o gate fechar é fraudar a medição, e é o
  risco central de toda fatia de permissão.
- Hook `PreToolUse` — pede aprovação a cada execução que envolva Docker, e a cada
  comando que troque a revisão da árvore de trabalho.

**É imposto pelo orquestrador (fronteira declarada, conferida no fechamento):**

- o escopo de escrita por agente em `policies.yaml`. O harness não sabe qual
  agente está chamando `Write`. Quem garante é o bloco: **não monte um bloco cujos
  caminhos saiam da lista `write` do agente** — e o `qa_review` confere o
  `git diff` contra a lista de arquivos declarada no plano.

## O ciclo de uma fatia

1. **Escrever o plano** em `docs/fatias/vX.Y.Z-<nome>.md`, a partir de
   [`TEMPLATE.md`](../../docs/fatias/TEMPLATE.md). A seção 0 é o contrato legível
   por máquina: `regime`, `risk`, `requirements`, `testPlan`.
2. **Resolver o grafo**: com os flags da seção 0, ler `execution-graph.yaml` e
   escrever a lista de nós desta fatia na seção 9 do plano. Fatia que não muda
   contrato não tem nó `inventario`; fatia que toca permissão tem `e2e`
   obrigatoriamente.
3. **Executar nó a nó**, um agente por nó, cada um recebendo **só o seu bloco**.
4. **Validar o contrato de saída** de cada nó antes de abrir o próximo. Status
   `blocked`/`needs_decision`/`failed` **para o grafo** — a decisão volta para o
   orquestrador ou para o usuário, não para o agente seguinte.
5. **Atualizar o estado** na seção 9 do plano: nó corrente, nós concluídos,
   achados abertos, tentativas. O estado vive no arquivo, não na memória da
   conversa.
6. **Release gate** (`execution-graph.yaml`) e só então commit.

### Por que o passo 5 não é burocracia

Na onda F1, os planos das fatias viveram num diretório temporário de sessão e o
estado viveu na conversa. Resultado medido: um agente recebeu um plano que não
listava as sete divergências esperadas nominalmente — só o total — e por isso não
tinha como conferir uma a uma; outro perdeu duas rodadas porque o número que o
plano prometia tinha sido medido por um protótipo que ninguém tinha em mãos. O
plano em arquivo, com a seção 0 e a seção 9, é o que permite retomar a fatia num
contexto novo sem replicar transcript.

## O que o grafo compra

- **Nó condicional em vez de ritual.** O `inventario` não roda em tudo; roda
  quando a fatia muda contrato ou abre tela nova. O `e2e` só quando a navegação
  ou a permissão mudam.
- **Rastreabilidade ponta a ponta.** `AC-1` sai do plano, aparece no contrato do
  builder, vira coberto no contrato de testes e é conferido pelo QA. Um critério
  que ninguém cobriu fica visível como buraco, não some.
- **Decisão travada não é reinterpretada.** `D1..Dn` em
  [`docs/arquitetura/DECISOES.md`](../../docs/arquitetura/DECISOES.md); quem
  discorda devolve `needs_decision`, não uma segunda arquitetura.
- **Falha volta para o dono certo.** Teste que encontra regra errada devolve
  `BUSINESS_RULE_MISMATCH` com dono no builder, em vez de editar `features/` e
  mascarar o defeito — que é como um teste verde passa a provar nada.
- **Limite de tentativas.** Três por nó. Na b53 o nó de gate consumiu sete
  rodadas; o limite teria devolvido ao orquestrador na terceira, que foi
  exatamente quando a causa raiz já estava visível no relato.

## O que este repositório aprendeu, e que o modelo de origem não tinha

Três regras nasceram de defeito real desta esteira e não existem no backend:

- **Gate prova que sabe ficar vermelho.** Nenhum gate é aceito por ficar verde.
  Roda contra árvore antiga com defeito conhecido, com asserção por item nominal.
  Dois gates vácuos foram entregues antes desta regra existir.
- **Resultado de teste inexplicado bloqueia.** `ENVIRONMENT_UNVERIFIED` é estado
  de bloqueio. Verde falso e vermelho falso já custaram uma rodada inteira de QA,
  e a causa era cache de build corrompido por dois servidores concorrentes.
- **Perda de acesso tem escala própria.** `accessRisk` em `risk.yaml` separa
  "perde a ilusão de clicar" de "perde capacidade" de "pode se auto-bloquear". Os
  três exigem coisas diferentes do CHANGELOG, e o terceiro exige confirmação do
  usuário antes do release.

## O que deliberadamente não foi feito

- **Não foram criados agentes novos.** O modelo de origem tem dezoito; aqui são
  onze, e o gargalo medido não foi falta de especialista — foi briefing sem número
  nominal e ausência de prova de que o gate mede.
- **Não existe executor de correção separado.** No backend, `erp-correcao-executor`
  tem ferramentas que o impedem de decidir desenho. Aqui o mesmo agente constrói e
  aplica, então a fronteira do nível L2 é declarada, não imposta. Fica registrado
  como lacuna em `regimes.yaml`.
- **Não existe revisor de segurança separado.** O `qa-revisor` acumula o papel. A
  divisão espera volume que hoje não existe.
