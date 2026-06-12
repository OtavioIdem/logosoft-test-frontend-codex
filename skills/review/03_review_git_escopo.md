# Skill — Review por git e escopo

## Objetivo

Garantir que a versão entregue altere somente o necessário.

## Comandos base

```bash
git status --short
git diff --stat
git diff --name-status
git diff --check
git diff --cached --check
```

## Verificações obrigatórias

1. Arquivos adicionados condizem com o markdown.
2. Arquivos alterados condizem com o markdown.
3. Arquivos removidos foram explicitamente autorizados.
4. Mocks/store não foram reescritos fora de escopo.
5. Contrato de API não mudou sem teste/documentação.
6. Versionamento foi atualizado em todos os lugares necessários.
7. Documentação não promete algo diferente do diff.
8. ZIP pode ser aplicado como snapshot completo sem apagar rastreados por omissão.

## Classificação de alteração fora de escopo

### Permitida

- Ajuste mínimo exigido pelo gate.
- Documentação coerente com a versão.
- Teste de regressão do bug corrigido.
- Versionamento da versão.

### Bloqueante

- Reescrever mock/store sem escopo.
- Alterar payload crítico sem teste.
- Remover arquivo rastreado sem justificativa.
- Trocar endpoint real por mock.
- Alterar permissões sem documentação.
- Mudar regra fiscal sem validação oficial.
