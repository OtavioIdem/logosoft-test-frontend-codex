# Skill — Modelo de relatório de bloqueio

## Quando usar

Usar quando a versão não deve ser commitada.

## Estrutura obrigatória

```text
Resultado: bloqueado para commit
Versão analisada: [versão]
Base usada: [base]
Caminho validado: [diretório]

Resumo:
[explicação curta]

Findings bloqueantes:
1. [título]
   Arquivo: [arquivo]
   Evidência: [linha/comportamento]
   Motivo: [por que bloqueia]
   Correção indicada: [ação objetiva]

Findings não bloqueantes:
1. [título]
   Recomendação: [ação]

Validações executadas:
- [comando] — passou/falhou/skip

Validações não executadas:
- [comando] — motivo

Decisão:
Não apliquei no repositório principal / Não fiz commit.
```

## Regras do relatório

- Não ser genérico.
- Citar arquivos e comportamento observado.
- Diferenciar bloqueio real de pendência futura.
- Não sugerir avançar versão funcional enquanto houver bloqueio.
- Recomendar correção mínima para `.cN` quando aplicável.
