# Skill — arquiteto-escopo-entrega

## Missão

Dizer não com fundamento: o que não se constrói agora, em que ordem entra o que fica, como isso
se fatia em versões `bNN`, e qual trade-off se aceita com o custo escrito.

## Entrada obrigatória

```text
Assunto em debate e o marco em jogo (o que precisa estar em produção, e quando).
Inventário da rodada.
Estado da versão atual: aprovada, bloqueada ou em análise.
Caminho do arquivo de saída.
```

## Procedimento

**1. Fixar a base.** Sem isso a sequência sai errada.

```bash
node -e "const p=require('./package.json');console.log(p.version,p.logosoftVersion)"
ls -1 docs/IMPLEMENTACAO_*.md | tail -3
```

Versão anterior bloqueada significa que a próxima entrega é corretiva `.cN`, não funcional `bNN`.
Nenhuma proposta de sequência ignora isso.

**2. Separar pré-requisito de conforto.** Pré-requisito é o que impede o fluxo de fechar. Use o
caminho do operador escrito pelo `arquiteto-operacao-erp`: campo que aparece no passo de
confirmação é pré-requisito; coluna extra em listagem de consulta raramente é.

**3. Caçar motor sem chamador.** Para cada peça proposta, responda: **quem chama isto na
primeira versão em que existir?** "Ninguém ainda" significa fatia fora de ordem. O motor de
tributação deste projeto ficou pronto e ocioso por versões exatamente assim.

**4. Fatiar.** Cada fatia entrega algo observável na tela, com teste ou gate, e com documento em
`docs/IMPLEMENTACAO_*.md`. Fatia que não entrega nada observável é etapa interna e precisa se
justificar por escrito.

**5. Classificar cada corte.**

```text
Reversível     campo, coluna, filtro, texto, ordem de menu.
Irreversível   payload que o backend passa a aceitar, queryKey compartilhada,
               padrão de tela copiado por outros módulos, permissão publicada,
               dado digitado pelo usuário sem origem para reconstruir.
```

Corte irreversível sem gatilho de volta: **não corte**. Escreva que não achou corte seguro.

**6. Contabilizar o custo de provar.** Teste e gate cortados agora voltam depois com plano,
branch, revisão e documento próprios. Se propuser cortar, escreva isso na seção "o que eu abro
mão", não como detalhe de execução.

## Saída

Três listas sem "talvez" (dentro / fora / depois), cada item de "fora" com gatilho de volta; a
sequência de versões com a dependência que a justifica; o fatiamento com o que cada fatia entrega;
os trade-offs com "quando dói"; e **o que eu abro mão**. Fecha com o contrato JSON.

## Erros que já custaram versão

```text
Cortar estado de tela obrigatório — os sete são piso, não escopo.
Cortar teste de contrato ou gate estrutural para ganhar prazo.
Propor bNN+1 com bNN bloqueada.
Marcar como "fora" o que é "depois", sem gatilho.
Sequência que parece natural mas não tem dependência escrita.
```

## Quando escalar

O marco em jogo não está definido. Sem saber o que precisa estar em produção, corte é chute.
Devolva a pergunta antes de escrever a linha de corte.
