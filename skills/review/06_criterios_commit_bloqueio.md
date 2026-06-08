# Skill — Critérios de commit e bloqueio

## Pode commitar quando

```text
A versão base está correta.
O diff condiz com o escopo.
Os arquivos rastreados foram preservados.
O markdown condiz com o pacote.
Os gates obrigatórios passaram.
Os testes direcionados passaram.
Os skips opt-in estão justificados.
O contrato operacional read-only foi executado ou skipped por ausência de ambiente controlado.
O E2E integrado mutável foi apenas validado estruturalmente ou executado com opt-in em ambiente descartável.
Não há mock produtivo.
Não há GUID manual indevido.
Não há exposição de dado sensível.
Não há alteração fiscal sem validação.
```

## Deve bloquear quando

```text
Typecheck, lint, build ou teste falha.
validate:source falha.
validate:guid-references falha.
validate:fiscal:production falha.
validate:skills falha.
validate:integrated-e2e falha.
Arquivo rastreado some sem justificativa.
Arquivo fora de escopo é reescrito.
Markdown contradiz o ZIP.
Mocks/store mudam fora de escopo.
Campo de vínculo vira input manual de GUID.
Tela crítica fica sem permissão.
Fluxo fiscal ignora workflow/resumo.
Payload sensível aparece em tela, log ou teste.
E2E integrado mutável roda no CI comum ou sem opt-in próprio.
```

## Commit

Quando aprovado, usar mensagem objetiva:

```text
chore: release frontend vX.Y.Z
feat: release frontend vX.Y.Z
fix: release frontend vX.Y.Z.cN
```

Após commit, informar:

```text
hash do commit
mensagem
validações executadas
arquivos alterados principais
pendências não bloqueantes
estado da branch
```
