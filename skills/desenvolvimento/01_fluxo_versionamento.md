# Skill — Fluxo de versionamento

## Estados possíveis

```text
Em análise
Bloqueada
Aprovada
Parcial
Descartada
```

## Regra principal

```text
Análise negativa ou bloqueada = corrigir a versão mencionada.
Análise positiva, aprovada e commitada = seguir para a próxima etapa planejada.
```

## Versão funcional

Usar quando a versão anterior foi aprovada e commitada.

Exemplo:

```text
v1.11.0a8b27
v1.11.0a8b28
v1.11.0a8b29
```

## Versão corretiva

Usar quando a revisão bloqueou uma versão.

Exemplo:

```text
v1.11.0a8b26.c1
v1.11.0a8b26.c2
v1.11.0a8b26.c3
```

## Proibições

- Não criar `b27` enquanto `b26` estiver bloqueada.
- Não declarar aprovação sem validação do usuário/review.
- Não transformar correção `.cN` em refatoração lateral.
- Não contradizer o ZIP no markdown da versão.

## Entrega de versão corretiva

Toda correção deve conter:

```text
1. Nova versão .cN.
2. ZIP completo corrigido.
3. Markdown da correção.
4. Lista objetiva do que foi corrigido.
5. Lista do que não foi alterado.
6. Validações executadas.
7. Comandos para o repositório principal.
```

## Entrega de versão funcional

Toda versão funcional deve conter:

```text
1. ZIP completo limpo.
2. Markdown de implementação.
3. Arquivos alterados.
4. Escopo implementado.
5. Escopo preservado.
6. Gates executados.
7. Gates pendentes por ambiente.
8. Riscos e próxima etapa.
```
