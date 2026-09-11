# Skill — Régua de fatiamento e sequência

## A unidade de entrega

O frontend entrega em versão, não em tarefa:

```text
Funcional   v1.11.0a8bNN     Base aprovada e commitada.
Corretiva   v1.11.0a8bNN.cN  A versão NN foi bloqueada no review.
```

Não existe `bNN+1` enquanto `bNN` estiver bloqueada. Uma rodada de projeto que propõe sequência
tem de respeitar isso: sequência é lista de versões, não lista de desejos.

## O que faz uma fatia fechar

Uma fatia só é planejável se, sozinha, produzir:

```text
Algo observável na tela para o usuário.
Teste ou gate que falha se o comportamento quebrar.
Documento de implementação em docs/IMPLEMENTACAO_*.md.
```

Fatia que não entrega nada observável é etapa interna, e precisa se justificar explicitamente —
não se justifica sozinha por ser "preparação".

## Motor sem chamador

Precedente do projeto: o motor de tributação ficou pronto antes de existir documento que o
alimentasse. Custo real de construir a porta antes da casa.

Toda proposta de sequência responde: **quem chama isto na primeira versão em que existir?** Se a
resposta for "ninguém ainda", a fatia está fora de ordem.

## Ordem antes de escopo

Ordem errada custa mais que escopo errado. A dependência que justifica a ordem tem de estar
escrita — "parece natural" não é dependência.

Dependências reais neste frontend:

```text
Contrato confirmado    antes de    tela que o consome.
Permissão registrada   antes de    rota protegida.
Endpoint de busca      antes de    campo de vínculo (select por API).
Enum do backend        antes de    dropdown fixo.
Estado de tela         antes de    ação crítica com bloqueio.
```

## O custo de provar

Cortar prova não economiza: adia. O teste e o gate que não entram na fatia entram depois, com
plano, branch, documento e revisão próprios — a embalagem inteira paga de novo.

Quem propõe cortar prova escreve isso na cara, na seção "o que eu abro mão". Não passa como
detalhe de execução.

## Reversível ou não

O critério que separa corte bom de dívida disfarçada:

```text
Reversível    Campo a mais na tela. Coluna na listagem. Filtro. Texto. Ordem de menu.
Irreversível  Formato de payload que o backend passa a aceitar.
              Chave de cache/queryKey que outras telas já usam.
              Padrão de tela que cinco módulos copiaram.
              Permissão publicada no catálogo.
              Dado que o usuário digitou e não tem de onde ser reconstruído.
```

Corte de coisa reversível é corte. Corte de coisa irreversível sem gatilho de volta é dívida —
e quem propõe tem de dizer o custo de reintroduzir.

## Onda

Os módulos entram por onda, e a onda tem começo e fim declarados. Uma rodada de projeto que
propõe módulo novo diz em qual onda ele entra e o que ela fecha — não abre frente paralela sem
fechar a anterior.
