# Skill — Procedimento de review

## Etapa 1 — Preparar cópia limpa

1. Criar diretório temporário de review.
2. Extrair o ZIP recebido.
3. Garantir que artefatos locais não vieram no pacote.
4. Aplicar sobre uma cópia limpa do repositório principal, quando o objetivo for validar substituição completa.

## Etapa 2 — Validar versionamento

Conferir:

```text
package.json version
package.json logosoftVersion
config/app.ts version
docs/IMPLEMENTACAO_*.md
```

## Etapa 3 — Validar escopo

1. Rodar `git status`.
2. Rodar `git diff --stat`.
3. Ler arquivos alterados.
4. Comparar com markdown da versão.
5. Identificar arquivos fora de escopo.
6. Identificar arquivos rastreados removidos.

## Etapa 4 — Validar gates

Rodar os comandos obrigatórios e especializados conforme escopo.

## Etapa 5 — Validar comportamento

Quando houver tela/fluxo:

1. Rodar teste unitário relacionado.
2. Rodar teste de componente relacionado.
3. Rodar E2E relacionado.
4. Conferir loading, erro, vazio e sucesso.
5. Verificar permissões e bloqueios.

## Etapa 6 — Decisão

- Sem erro bloqueante: commit local com mensagem clara.
- Com erro bloqueante: não commitar e devolver relatório técnico.
